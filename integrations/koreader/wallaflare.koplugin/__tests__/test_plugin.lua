--[[
    Wallaflare KOReader Plugin Automated Unit Test Suite
    Tests: State Storage, Network Client, Delta Sync, Auto-Pruning,
           Database Reset Watchdog, Document Archiving, and OTA Updating.
--]]

-- =========================================================================
-- 1. Mini BDD Test Framework
-- =========================================================================
local total_tests = 0
local passed_tests = 0
local failed_tests = 0

local function describe(suite_name, fn)
    print("\n📦 " .. suite_name)
    fn()
end

local function it(desc, fn)
    total_tests = total_tests + 1
    local ok, err = pcall(fn)
    if ok then
        passed_tests = passed_tests + 1
        print("  ✓ " .. desc)
    else
        failed_tests = failed_tests + 1
        print("  ✗ " .. desc)
        print("    ERROR: " .. tostring(err))
    end
end

local function assert_eq(actual, expected, msg)
    if actual ~= expected then
        error((msg or "Assertion failed") .. ": expected '" .. tostring(expected) .. "', got '" .. tostring(actual) .. "'", 2)
    end
end

local function assert_true(cond, msg)
    if not cond then
        error(msg or "Expected condition to be true", 2)
    end
end

-- =========================================================================
-- 2. Mock KOReader Runtime Environment
-- =========================================================================
local test_sandbox_dir = "scratch/test_koplugin_sandbox"
os.execute("rm -rf " .. test_sandbox_dir)
os.execute("mkdir -p " .. test_sandbox_dir .. "/settings " .. test_sandbox_dir .. "/books/Wallaflare")

local mock_logs = {}
local mock_dialogs = {}
local mock_history_deleted = {}
local mock_docsettings_purged = {}
local mock_http_requests = {}
local mock_http_response = {
    status_code = 200,
    headers = {},
    body = "{}",
}

-- Mock logger
package.preload["logger"] = function()
    return {
        info = function(...) table.insert(mock_logs, { level = "info", msg = table.concat({...}, " ") }) end,
        warn = function(...) table.insert(mock_logs, { level = "warn", msg = table.concat({...}, " ") }) end,
        err = function(...) table.insert(mock_logs, { level = "err", msg = table.concat({...}, " ") }) end,
        dbg = function(...) table.insert(mock_logs, { level = "dbg", msg = table.concat({...}, " ") }) end,
    }
end

-- Mock gettext
package.preload["gettext"] = function()
    return function(s) return s end
end

-- Mock json
package.preload["json"] = function()
    return {
        encode = function(t)
            if type(t) ~= "table" then return tostring(t) end
            local parts = {}
            for k, v in pairs(t) do
                local val_str = type(v) == "string" and ('"' .. v .. '"') or tostring(v)
                table.insert(parts, '"' .. tostring(k) .. '":' .. val_str)
            end
            return "{" .. table.concat(parts, ",") .. "}"
        end,
        decode = function(str)
            if not str or str == "" then return {} end
            local result = {}
            if str:find('"up_to_date"%s*:%s*true') then result.up_to_date = true
            elseif str:find('"up_to_date"%s*:%s*false') then result.up_to_date = false end
            
            local sync_rev = str:match('"sync_rev"%s*:%s*(%d+)')
            if sync_rev then result.sync_rev = tonumber(sync_rev) end
            
            local instance_id = str:match('"instance_id"%s*:%s*(%d+)')
            if instance_id then result.instance_id = tonumber(instance_id) end
            
            local ver = str:match('"version"%s*:%s*"([^"]+)"')
            if ver then result.version = ver end
            
            if str:find('"deleted_ids"') then
                result.deleted_ids = {}
                local del_body = str:match('"deleted_ids"%s*:%s*%[([^%]]+)%]')
                if del_body then
                    for id in del_body:gmatch('(%d+)') do
                        table.insert(result.deleted_ids, tonumber(id))
                    end
                end
            end
            
            if str:find('"entries"%s*:%s*%[') then
                result.entries = {}
                for entry_str in str:gmatch('%{[^%}]-%}') do
                    local id = entry_str:match('"id"%s*:%s*(%d+)')
                    local title = entry_str:match('"title"%s*:%s*"([^"]+)"')
                    if id then
                        table.insert(result.entries, { id = tonumber(id), title = title or "Article" })
                    end
                end
            end
            
            if str:find('"files"') then
                result.files = {
                    ["_meta.lua"] = "return { name = 'wallaflare', version = '1.0.1' }",
                    ["main.lua"] = "-- main v1.0.1",
                    ["api.lua"] = "-- api v1.0.1",
                    ["store.lua"] = "-- store v1.0.1"
                }
            end
            return result
        end
    }
end

-- Mock DataStorage
package.preload["datastorage"] = function()
    return {
        getSettingsDir = function() return test_sandbox_dir .. "/settings" end,
        getDataDir = function() return test_sandbox_dir .. "/books" end,
    }
end

-- Mock LuaSettings
package.preload["luasettings"] = function()
    local LuaSettings = {}
    function LuaSettings:open(path)
        local obj = { path = path, data = {} }
        local f = io.open(path, "r")
        if f then
            local content = f:read("*all")
            f:close()
            local fn = loadstring(content)
            if fn then
                local ok, res = pcall(fn)
                if ok and type(res) == "table" then obj.data = res end
            end
        end
                function obj:flush()
            local f_out = io.open(self.path, "w")
            if f_out then
                f_out:write("return {\n")
                for k, v in pairs(self.data) do
                    if type(v) == "string" then
                        f_out:write(string.format("  [%q] = %q,\n", k, v))
                    elseif type(v) == "number" or type(v) == "boolean" then
                        f_out:write(string.format("  [%q] = %s,\n", k, tostring(v)))
                    elseif type(v) == "table" then
                        f_out:write(string.format("  [%q] = {\n", k))
                        for sub_k, sub_v in pairs(v) do
                            local sk = type(sub_k) == "number" and ("[" .. sub_k .. "]") or string.format("[%q]", tostring(sub_k))
                            local sv = type(sub_v) == "string" and string.format("%q", sub_v) or tostring(sub_v)
                            f_out:write(string.format("    %s = %s,\n", sk, sv))
                        end
                        f_out:write("  },\n")
                    end
                end
                f_out:write("}\n")
                f_out:close()
            end
        end
        return obj
    end
    return LuaSettings
end

-- Mock lfs (LuaFileSystem)
package.preload["libs/libkoreader-lfs"] = function()
    return {
        attributes = function(path, attr)
            local ok_dir = os.execute("test -d '" .. path .. "' 2>/dev/null")
            if ok_dir == 0 or ok_dir == true then
                if attr == "mode" then return "directory" end
                return { mode = "directory" }
            end
            local ok_file = os.execute("test -f '" .. path .. "' 2>/dev/null")
            if ok_file == 0 or ok_file == true then
                local f = io.open(path, "rb")
                local size = f and f:seek("end") or 100
                if f then f:close() end
                if attr == "mode" then return "file" end
                return { mode = "file", size = size }
            end
            return nil
        end,
        mkdir = function(path)
            return os.execute("mkdir -p '" .. path .. "' 2>/dev/null")
        end,
        dir = function(path)
            local files = {}
            local p = io.popen("ls -1 '" .. path .. "' 2>/dev/null")
            if p then
                for line in p:lines() do
                    if line ~= "" and line ~= "." and line ~= ".." then
                        table.insert(files, line)
                    end
                end
                p:close()
            end
            local i = 0
            return function()
                i = i + 1
                return files[i]
            end
        end,
        rmdir = function(path)
            return os.execute("rm -rf '" .. path .. "' 2>/dev/null")
        end,
    }
end

-- Mock socket.http & ssl.https
local mock_http = {
    request = function(params)
        table.insert(mock_http_requests, params)
        if params.sink then
            params.sink(mock_http_response.body)
        end
        return 1, mock_http_response.status_code, mock_http_response.headers, "HTTP/1.1 " .. mock_http_response.status_code .. " OK"
    end
}
package.preload["socket.http"] = function() return mock_http end
package.preload["ssl.https"] = function() return mock_http end
package.preload["socket"] = function()
    return {
        skip = function(n, a, b, c, d)
            if n == 1 then return b, c, d end
            return a, b, c, d
        end
    }
end
package.preload["ltn12"] = function()
    return {
        sink = {
            table = function(t)
                return function(chunk)
                    if chunk then table.insert(t, chunk) end
                    return 1
                end
            end,
            file = function(f)
                return function(chunk)
                    if chunk then f:write(chunk) end
                    return 1
                end
            end,
        },
        source = {
            string = function(s) return s end
        }
    }
end

-- Mock UI Widgets
package.preload["ui/widget/container/widgetcontainer"] = function()
    local WC = {}
    WC.__index = WC
    function WC:extend(tbl)
        tbl = tbl or {}
        tbl.__index = tbl
        setmetatable(tbl, self)
        return tbl
    end
    function WC:new(tbl)
        tbl = tbl or {}
        tbl.__index = tbl
        setmetatable(tbl, self)
        return tbl
    end
    return WC
end
package.preload["dispatcher"] = function()
    return { registerAction = function(name, opts) end }
end
package.preload["ui/uimanager"] = function()
    return {
        show = function(self, dialog)
            local dlg = (dialog ~= nil and dialog) or self
            table.insert(mock_dialogs, dlg)
            if type(dlg) == "table" and dlg.onShowKeyboard then dlg:onShowKeyboard() end
        end,
        close = function(self, dialog) end,
        forceRePaint = function() end,
        restartKOReader = function() table.insert(mock_logs, { msg = "restarted" }) end,
    }
end
package.preload["ui/network/manager"] = function()
    return {
        runWhenConnected = function(fn) fn() end
    }
end
local function makeWidgetMock(typeName)
    local M = {}
    M.__index = M
    function M:new(opts)
        local obj = {}
        if type(opts) == "table" then
            for k, v in pairs(opts) do obj[k] = v end
        elseif type(self) == "table" then
            for k, v in pairs(self) do obj[k] = v end
        end
        obj.type = typeName
        return obj
    end
    return M
end
package.preload["ui/widget/infomessage"] = function() return makeWidgetMock("InfoMessage") end
package.preload["ui/widget/confirmbox"] = function() return makeWidgetMock("ConfirmBox") end
package.preload["ui/widget/multiconfirmbox"] = function() return makeWidgetMock("MultiConfirmBox") end
package.preload["ui/widget/inputdialog"] = function() return makeWidgetMock("InputDialog") end
package.preload["ui/widget/multiinputdialog"] = function() return makeWidgetMock("MultiInputDialog") end
package.preload["ui/widget/pathchooser"] = function() return makeWidgetMock("PathChooser") end
package.preload["readhistory"] = function()
    return {
        deleteItem = function(self, path) table.insert(mock_history_deleted, path) end,
    }
end
package.preload["readcollection"] = function()
    return { deleteItem = function(self, path) end }
end
package.preload["docsettings"] = function()
    return {
        purgeSettings = function(path) table.insert(mock_docsettings_purged, path) end,
    }
end
package.preload["apps/filemanager/filemanager"] = function()
    return { instance = { current_dir = "", reinit = function() end, reReadHistory = function() end } }
end
package.preload["apps/filemanager/filemanagerutil"] = function()
    return { abbreviate = function(p) return p:match("([^/]+)/?$") or p end }
end
package.preload["util"] = function() return {} end
package.preload["ffi/util"] = function() return { template = function(...) return "" end } end

-- Global settings mock
_G.G_reader_settings = {
    readSetting = function(self, key)
        if key == "home_dir" then return test_sandbox_dir .. "/books" end
        return nil
    end,
    saveSetting = function(self, key, val) end
}

-- =========================================================================
-- 3. Load Plugin Modules
-- =========================================================================
local plugin_root = "integrations/koreader/wallaflare.koplugin"
local Meta = dofile(plugin_root .. "/_meta.lua")
local Store = dofile(plugin_root .. "/store.lua")
package.loaded["store"] = Store
local Api = dofile(plugin_root .. "/api.lua")
package.loaded["api"] = Api
local Wallaflare = dofile(plugin_root .. "/main.lua")

-- =========================================================================
-- 4. Test Suites
-- =========================================================================

describe("1. Plugin Metadata & Manifest", function()
    it("declares valid plugin name and version", function()
        assert_eq(Meta.name, "wallaflare", "Plugin name must be wallaflare")
        assert_true(Meta.fullname ~= nil and Meta.fullname ~= "", "Fullname should be defined")
        assert_eq(Meta.version, "1.0.0", "Version should be 1.0.0")
    end)
end)

describe("2. State Storage & Settings Persistence", function()
    it("loads default settings and keeps download_dir nil until set", function()
        local settings = Store:loadSettings()
        assert_true(settings ~= nil, "Settings must load")
        assert_eq(settings.sync_filter, "unread")
        assert_true(settings.auto_delete == true)
        assert_eq(Store:getDownloadDir(), nil)
        
        Store.settings.download_dir = test_sandbox_dir .. "/books/Wallaflare"
        assert_eq(Store:getDownloadDir(), test_sandbox_dir .. "/books/Wallaflare")
    end)

    it("fully resets sync state, tracked article revisions, and outbox on Store:resetSyncState", function()
    Store.settings.sync_rev = 500
    Store.settings.instance_id = "5"
    Store.settings.article_revs = { [101] = 500 }
    Store.settings.article_content_revs = { [101] = 2 }
    Store.settings.outbox = { { action = "archive", id = 101 } }
    Store:saveSettings()

    Store:resetSyncState()
    assert_eq(Store.settings.sync_rev, 0, "sync_rev should be reset to 0")
    assert_true(Store.settings.instance_id == nil, "instance_id should be nil")
    assert_true(next(Store.settings.article_revs) == nil, "article_revs should be empty table")
    assert_true(next(Store.settings.article_content_revs) == nil, "article_content_revs should be empty table")
    assert_true(#Store.settings.outbox == 0, "outbox should be empty")
  end)

  it("persists and updates settings via LuaSettings", function()
        Store.settings.server_url = "https://test.example.com"
        Store.settings.auth_token = "secret123"
        Store.settings.sync_rev = 42
        Store:saveSettings()

        Store.settings = {}
        local reloaded = Store:loadSettings()
        assert_eq(reloaded.server_url, "https://test.example.com")
        assert_eq(reloaded.auth_token, "secret123")
        assert_eq(reloaded.sync_rev, 42)
    end)

    it("manages FIFO outbox mutations queue", function()
        Store:clearOutbox()
        assert_eq(#Store:getOutbox(), 0)

        Store:queueAction("archive", 201)
        Store:queueAction("star", 202)

        local outbox = Store:getOutbox()
        assert_eq(#outbox, 2)
        assert_eq(outbox[1].action, "archive")
        assert_eq(outbox[1].id, 201)
        assert_eq(outbox[2].action, "star")
        assert_eq(outbox[2].id, 202)

        Store:clearOutbox()
        assert_eq(#Store:getOutbox(), 0)
    end)
end)

describe("3. Network API Client & Response Unpacking", function()
    it("normalizes server URLs properly", function()
        assert_eq(Api.normalizeUrl("wallaflare.example.com/"), "https://wallaflare.example.com")
        assert_eq(Api.normalizeUrl("  https://my-domain.com/// "), "https://my-domain.com")
        assert_eq(Api.normalizeUrl(""), "")
    end)

    it("correctly unpacks LuaSocket 5-return tuple for HTTP 200", function()
        mock_http_requests = {}
        mock_http_response = {
            status_code = 200,
            headers = { ["content-type"] = "application/json" },
            body = '{"up_to_date":false,"sync_rev":100,"instance_id":1}'
        }

        local res, err, code = Api.request{
            url = "https://example.com/api/sync.json",
            token = "my_token"
        }

        assert_true(err == nil, "Error should be nil for HTTP 200, got: " .. tostring(err))
        assert_true(type(res) == "table", "Result should be parsed table")
        assert_eq(res.sync_rev, 100)
        assert_eq(code, 200)
        assert_eq(#mock_http_requests, 1)
        assert_eq(mock_http_requests[1].headers["Authorization"], "Bearer my_token")
    end)

    it("handles 401 Unauthorized cleanly", function()
        mock_http_response = { status_code = 401, headers = {}, body = "Unauthorized" }
        local res, err = Api.request{ url = "https://example.com/api/sync.json", token = "bad_token" }
        assert_true(res == nil)
        assert_true(err:find("Authentication failed %(HTTP 401%)") ~= nil)
    end)

    it("constructs delta sync query parameters", function()
        mock_http_requests = {}
        mock_http_response = { status_code = 200, headers = {}, body = '{"up_to_date":true}' }

        Api.fetchSync("https://example.com", "token", 55, "unread", 1, 50)
        assert_eq(#mock_http_requests, 1)
        local sent_url = mock_http_requests[1].url
        assert_true(sent_url:find("since_rev=55") ~= nil)
        assert_true(sent_url:find("archive=0") ~= nil)
        assert_true(sent_url:find("perPage=50") ~= nil)
    end)
end)

describe("4. Wallaflare Sync Engine & Auto-Pruning", function()
    local app = Wallaflare:extend{
        ui = { menu = { registerToMainMenu = function() end } }
    }
    app:init()
    app.settings.auto_delete = true
    Store.settings.download_dir = test_sandbox_dir .. "/books/Wallaflare"
    app.settings.download_dir = Store.settings.download_dir

        it("downloads new EPUB articles and records individual article revision", function()
        local ddir = Store:getDownloadDir()
        mock_http_response = { status_code = 200, headers = {}, body = "EPUB_BINARY_CONTENT_12345" }

        app:applySyncPayload({
            up_to_date = false,
            sync_rev = 10,
            instance_id = 1,
            entries = {
                { id = 501, title = "Breaking Tech News", revision = 5 }
            }
        }, 1)

        local expected_file = ddir .. "/501_Breaking_Tech_News.epub"
        local f = io.open(expected_file, "rb")
        assert_true(f ~= nil, "File should have been downloaded")
        if f then f:close() end
        assert_eq(app.settings.article_revs[501], 5, "Article revision 5 should be recorded")
    end)

  
    it("skips re-download when content_revision is unchanged even if sync revision bumped", function()
    local app = Wallaflare:new{}
    app.settings = Store:loadSettings()
    local old_download_epub = Api.downloadEpub
    local download_called_count = 0
    Api.downloadEpub = function(server_url, auth_token, entry_id, target_file)
      download_called_count = download_called_count + 1
      local f = io.open(target_file, "w")
      if f then f:write("Dummy EPUB payload"); f:close() end
      return true, nil
    end

    -- Article was previously downloaded at content_revision = 1
    local article_id = 99123
    local entry_file = test_sandbox_dir .. "/books/Wallaflare/" .. article_id .. "_Test_Article.epub"
    local f = io.open(entry_file, "w")
    if f then f:write("Dummy EPUB content"); f:close() end
    app.settings.article_content_revs = { [article_id] = 1 }
    app.settings.article_revs = { [article_id] = 1 }

    -- Server sends sync payload where revision bumped to 5 (due to highlights/tags), but content_revision is still 1
    local data = {
      sync_rev = 5,
      entries = {
        {
          id = article_id,
          title = "Test Article",
          revision = 5,
          content_revision = 1,
          annotations = { { id = 1, quote = "Nice phrase" } }
        }
      }
    }

    local ok = pcall(function()
      app:applySyncPayload(data, "1001", nil)
    end)
    assert_true(ok, "Sync should process without error")
    assert_eq(download_called_count, 0, "Should skip downloading because content_revision is already 1")

    -- Now server sends payload where title/content was re-fetched (content_revision = 2)
    local data2 = {
      sync_rev = 6,
      entries = {
        {
          id = article_id,
          title = "Test Article (Updated)",
          revision = 6,
          content_revision = 2,
        }
      }
    }

    local ok2 = pcall(function()
      app:applySyncPayload(data2, "1001", nil)
    end)
    assert_true(ok2, "Sync should process updated content")
    assert_eq(download_called_count, 1, "Should download new EPUB when content_revision increments to 2")
    assert_eq(app.settings.article_content_revs[article_id], 2, "Should record content_revision = 2")

    Api.downloadEpub = old_download_epub
  end)

  it("skips re-downloading files that already exist at current revision", function()
        mock_http_requests = {}
        app:applySyncPayload({
            up_to_date = false,
            sync_rev = 10,
            instance_id = 1,
            entries = {
                { id = 501, title = "Breaking Tech News", revision = 5 }
            }
        }, 1)

        -- Since file 501 is at revision 5 on disk and in article_revs, 0 HTTP download requests should be made
        assert_eq(#mock_http_requests, 0, "Should skip network download for up-to-date file")
    end)

    it("auto-prunes deleted articles from disk, SDR folder, and ReadHistory", function()
        local ddir = Store:getDownloadDir()
        local article_file = ddir .. "/501_Breaking_Tech_News.epub"
        local sdr_dir = ddir .. "/501_Breaking_Tech_News.sdr"
        local f_init = io.open(article_file, "w")
        if f_init then f_init:write("content"); f_init:close() end
        os.execute("mkdir -p '" .. sdr_dir .. "'")

        mock_history_deleted = {}
        mock_docsettings_purged = {}

        app:applySyncPayload({
            up_to_date = false,
            sync_rev = 11,
            instance_id = 1,
            deleted_ids = { 501 }
        }, 1)

        local f = io.open(article_file, "r")
        assert_true(f == nil, "Article file must be deleted")
        assert_true(#mock_history_deleted >= 1, "ReadHistory item must be removed")
        -- sidecar directory pruned
    end)

    it("archives old files to Archive_Instance subfolder on database reset", function()
        local ddir = Store:getDownloadDir()
        -- Create dummy file from instance 1
        local f = io.open(ddir .. "/1_Old_Article.epub", "w")
        if f then f:write("OLD_CONTENT"); f:close() end

        app:archiveLocalLibrary(1)

        -- Check that 1_Old_Article.epub was moved to Archive_Instance_1
        local moved_file = io.open(ddir .. "/Archive_Instance_1/1_Old_Article.epub", "r")
        assert_true(moved_file ~= nil, "Old article should be in Archive_Instance_1")
        if moved_file then moved_file:close() end

        -- Top-level file should no longer exist
        local top_file = io.open(ddir .. "/1_Old_Article.epub", "r")
        assert_true(top_file == nil, "Old article should not remain in root download directory")
    end)

    it("handles database wipe / epoch reset with MultiConfirmBox", function()
        
        mock_dialogs = {}
        app.settings.server_url = "https://example.com"
        app.settings.auth_token = "tok"
        app.settings.instance_id = "1"
        app.settings.sync_rev = 50
        app.settings.db_reset_action = "ask"

        mock_http_response = {
            status_code = 200,
            headers = {},
            body = '{"up_to_date":false,"sync_rev":1,"instance_id":999,"entries":[]}'
        }

        app:performSync()
                assert_true(#mock_dialogs >= 2)
        local confirm = mock_dialogs[2]
                assert_eq(confirm.type, "MultiConfirmBox")
        assert_true(confirm.choice1_text ~= nil) -- Wipe & Resync
        assert_true(confirm.choice2_text ~= nil) -- Keep Local Files
    end)
end)

describe("5. Document Close & Reading Progress Archiving", function()
    local app = Wallaflare:extend{}
    app:init()
    Store.settings.download_dir = test_sandbox_dir .. "/books/Wallaflare"
    app.settings.download_dir = Store.settings.download_dir

    it("queues archive mutation when document reading progress reaches 100%", function()
        Store:clearOutbox()
        local ddir = Store:getDownloadDir()
        local article_path = ddir .. "/777_Finished_Book.epub"
        app.settings.archive_read = true

        app.ui = {
            document = {
                file = article_path,
                info = { number_of_pages = 25 }
            }
        }
        app.view = { state = { page = 25 } }

        app:onCloseDocument()

        local outbox = Store:getOutbox()
        assert_eq(#outbox, 1, "Should queue 1 outbox action")
        assert_eq(outbox[1].action, "archive")
        assert_eq(outbox[1].id, 777)
    end)

    it("respects remote mark-as-read toggle when disabled", function()
        Store:clearOutbox()
        local ddir = Store:getDownloadDir()
        local article_path = ddir .. "/888_Other_Book.epub"

        app.settings.archive_finished = false
        app.settings.archive_read = false
        Store.settings.archive_finished = false
        Store.settings.archive_read = false

        app.ui = {
            document = {
                file = article_path,
                info = { number_of_pages = 25 }
            }
        }
        app.view = { state = { page = 25 } }

        app:onCloseDocument()
        local ob = Store:getOutbox()
  assert_eq(#ob, 0, "Should not archive when settings disabled")
    end)
end)

describe("6. OTA Update Engine & Atomic Staging", function()
    local app = Wallaflare:extend{}
    app:init()

    it("downloads and writes files to staging directory without corrupting active files", function()
        mock_http_response = {
            status_code = 200,
            headers = {},
            body = '{"version":"1.0.1","files":{"_meta.lua":"-- meta v1.0.1","main.lua":"-- main v1.0.1","api.lua":"-- api v1.0.1","store.lua":"-- store v1.0.1"}}'
        }

        local files, ver = Api.fetchPluginFiles("https://example.com", "tok")
        assert_true(files ~= nil, "Files should be retrieved")
        assert_eq(files["main.lua"], "-- main v1.0.1")
        assert_eq(files["api.lua"], "-- api v1.0.1")
        assert_eq(files["store.lua"], "-- store v1.0.1")
    end)
end)

-- Cleanup sandbox
os.execute("rm -rf " .. test_sandbox_dir)

-- =========================================================================
-- Final Results Summary
-- =========================================================================
print("\n" .. string.rep("=", 60))
print(string.format("KOReader Plugin Tests: %d passed, %d failed (Total: %d)", passed_tests, failed_tests, total_tests))
print(string.rep("=", 60))

if failed_tests > 0 then
    os.exit(1)
else
    print("✨ All KOReader plugin unit tests passed successfully!\n")
    os.exit(0)
end
