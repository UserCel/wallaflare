--[[
    Wallaflare KOReader Plugin
    High-Performance Delta Sync, Auto-Pruning, OTA Updates, and Offline Read-it-Later
--]]

local WidgetContainer = require("ui/widget/container/widgetcontainer")
local Dispatcher = require("dispatcher")
local UIManager = require("ui/uimanager")
local NetworkMgr = require("ui/network/manager")
local InfoMessage = require("ui/widget/infomessage")
local MultiConfirmBox = require("ui/widget/multiconfirmbox")
local ConfirmBox = require("ui/widget/confirmbox")
local InputDialog = require("ui/widget/inputdialog")
local MultiInputDialog = require("ui/widget/multiinputdialog")
local PathChooser = require("ui/widget/pathchooser")
local ReadHistory = require("readhistory")
local ReadCollection = require("readcollection")
local DocSettings = require("docsettings")
local LuaSettings = require("luasettings")
local FileManager = require("apps/filemanager/filemanager")
local filemanagerutil = require("apps/filemanager/filemanagerutil")
local DataStorage = require("datastorage")
local lfs = require("libs/libkoreader-lfs")
local util = require("util")
local ffiUtil = require("ffi/util")
local _ = require("gettext")
local logger = require("logger")

local plugin_dir = debug.getinfo(1, "S").source:match("^@?(.*)/[^/]+$") or "."
local Store = package.loaded["store"] or dofile(plugin_dir .. "/store.lua")
local Api = package.loaded["api"] or dofile(plugin_dir .. "/api.lua")
local Annotations = package.loaded["annotations"] or dofile(plugin_dir .. "/annotations.lua")

local Wallaflare = WidgetContainer:extend{
    name = "wallaflare",
    is_doc_only = false,
    version = "1.0.4",
}

local function getPluginDir()
    local src = debug.getinfo(1, "S").source
    if src:match("^@") then
        src = src:sub(2)
    end
    return src:match("^(.*)/[^/]+$") or "."
end

local function sanitizeFilename(name)
    if not name or name == "" then return "article" end
    local clean = name:gsub("[%s%p]+", "_"):gsub("^_+", ""):gsub("_+$", "")
    if clean == "" then clean = "article" end
    if clean:len() > 60 then
        clean = clean:sub(1, 60)
    end
    return clean
end

local function removeDirRecursive(path)
    if lfs.attributes(path, "mode") ~= "directory" then
        os.remove(path)
        return
    end
    for file in lfs.dir(path) do
        if file ~= "." and file ~= ".." then
            local f = path .. "/" .. file
            if lfs.attributes(f, "mode") == "directory" then
                removeDirRecursive(f)
            else
                os.remove(f)
            end
        end
    end
    lfs.rmdir(path)
end

function Wallaflare:onDispatcherRegisterActions()
    Dispatcher:registerAction("wallaflare_sync", {
        category = "none",
        event = "WallaflareSync",
        title = _("Wallaflare sync"),
        general = true,
    })
end

function Wallaflare:onWallaflareSync()
    self:startSync()
end

function Wallaflare:init()
    -- Guard against uninitialized document access in core ReaderToc when menu is traversed by quick settings
    pcall(function()
        local ok, ReaderToc = pcall(require, "apps/reader/modules/readertoc")
        if ok and ReaderToc and ReaderToc.getTitle and not ReaderToc._orig_getTitle then
            ReaderToc._orig_getTitle = ReaderToc.getTitle
            ReaderToc.getTitle = function(self, ...)
                if not self.ui or not self.ui.document then
                    return _("Table of contents")
                end
                return ReaderToc._orig_getTitle(self, ...)
            end
        end
    end)

    self.settings = Store:loadSettings()
    local ddir = Store:getDownloadDir()
    if ddir and lfs.attributes(ddir, "mode") ~= "directory" then
        pcall(lfs.mkdir, ddir)
    end
    self:onDispatcherRegisterActions()
    if self.ui and self.ui.menu then
        self.ui.menu:registerToMainMenu(self)
    end

    if self.settings.sync_on_startup and self.settings.server_url ~= "" then
        NetworkMgr:runWhenConnected(function()
            self:performSync()
        end)
    end
end

function Wallaflare:addToMainMenu(menu_items)
    menu_items.wallaflare = {
        sorting_hint = "tools",
        text = _("Wallaflare"),
        sub_item_table = {
            {
                text = _("Sync now"),
                keep_menu_open = false,
                callback = function()
                    self:startSync()
                end,
            },
            {
                text = _("Open download folder"),
                keep_menu_open = false,
                callback = function()
                    self:openDownloadFolder()
                end,
            },
            {
                text = _("Settings"),
                sub_item_table = {
                    {
                        text = _("Server settings"),
                        help_text = _("Configure Server URL and API Token"),
                        keep_menu_open = true,
                        callback = function()
                            self:editServerSettings()
                        end,
                    },
                    {
                        text_func = function()
                            local path = Store:getDownloadDir()
                            if not path or path == "" then
                                return _("Download folder: not set")
                            end
                            local folder_name = path:match("([^/]+)/?$") or path
                            return string.format(_("Download folder: %s"), folder_name)
                        end,
                        help_text = _("Choose where downloaded articles are saved"),
                        keep_menu_open = true,
                        callback = function(touchmenu_instance)
                            self:chooseDownloadDir(touchmenu_instance)
                        end,
                    },
                    {
                        text = _("Sync Filter"),
                        help_text = _("Filter articles to sync. Changing this triggers a full library reconciliation on next sync."),
                        sub_item_table = {
                            {
                                text = _("Unread only"),
                                checked_func = function() return self.settings.sync_filter == "unread" end,
                                callback = function(touchmenu_instance)
                                    self:promptChangeSyncFilter("unread", _("Unread only"), touchmenu_instance)
                                end,
                            },
                            {
                                text = _("All articles"),
                                checked_func = function() return self.settings.sync_filter == "all" end,
                                callback = function(touchmenu_instance)
                                    self:promptChangeSyncFilter("all", _("All articles"), touchmenu_instance)
                                end,
                            },
                            {
                                text = _("Starred only"),
                                checked_func = function() return self.settings.sync_filter == "starred" end,
                                callback = function(touchmenu_instance)
                                    self:promptChangeSyncFilter("starred", _("Starred only"), touchmenu_instance)
                                end,
                            },
                        },
                    },
                    {
                        text = _("When finishing an article"),
                        sub_item_table = {
                            {
                                text = _("Mark finished articles as archived"),
                                checked_func = function() return self.settings.archive_finished end,
                                callback = function()
                                    self.settings.archive_finished = not self.settings.archive_finished
                                    Store:saveSettings()
                                end,
                            },
                            {
                                text = _("Mark 100% articles as archived"),
                                checked_func = function() return self.settings.archive_read end,
                                callback = function()
                                    self.settings.archive_read = not self.settings.archive_read
                                    Store:saveSettings()
                                end,
                            },
                            {
                                text = _("Mark articles on hold as archived"),
                                checked_func = function() return self.settings.archive_abandoned end,
                                callback = function()
                                    self.settings.archive_abandoned = not self.settings.archive_abandoned
                                    Store:saveSettings()
                                end,
                            },
                            {
                                text = _("Delete instead of archive"),
                                help_text = _("Permanently delete finished articles from server instead of archiving"),
                                checked_func = function() return self.settings.delete_instead_of_archive end,
                                callback = function()
                                    self.settings.delete_instead_of_archive = not self.settings.delete_instead_of_archive
                                    Store:saveSettings()
                                end,
                            },
                        },
                    },
                    {
                        text = _("When deleting a file on device"),
                        sub_item_table = {
                            {
                                text = _("Archive on Wallaflare (Default)"),
                                checked_func = function() return self.settings.on_file_delete == "archive" end,
                                callback = function()
                                    self.settings.on_file_delete = "archive"
                                    Store:saveSettings()
                                end,
                            },
                            {
                                text = _("Delete from Wallaflare permanently"),
                                checked_func = function() return self.settings.on_file_delete == "delete" end,
                                callback = function()
                                    self.settings.on_file_delete = "delete"
                                    Store:saveSettings()
                                end,
                            },
                            {
                                text = _("Do nothing on server"),
                                help_text = _("Keep article on server and only remove local file"),
                                checked_func = function() return self.settings.on_file_delete == "ignore" end,
                                callback = function()
                                    self.settings.on_file_delete = "ignore"
                                    Store:saveSettings()
                                end,
                            },
                        },
                    },
                    {
                        text = _("Auto-delete removed articles"),
                        checked_func = function() return self.settings.auto_delete end,
                        callback = function()
                            self.settings.auto_delete = not self.settings.auto_delete
                            Store:saveSettings()
                        end,
                    },
                    {
                        text = _("Sync on KOReader start"),
                        checked_func = function() return self.settings.sync_on_startup end,
                        callback = function()
                            self.settings.sync_on_startup = not self.settings.sync_on_startup
                            Store:saveSettings()
                        end,
                    },
                    {
                        text = _("Database reset action"),
                        sub_item_table = {
                            {
                                text = _("Always ask (Recommended)"),
                                checked_func = function() return self.settings.db_reset_action == "ask" end,
                                callback = function()
                                    self.settings.db_reset_action = "ask"
                                    Store:saveSettings()
                                end,
                            },
                            {
                                text = _("Auto-wipe & resync"),
                                checked_func = function() return self.settings.db_reset_action == "wipe" end,
                                callback = function()
                                    self.settings.db_reset_action = "wipe"
                                    Store:saveSettings()
                                end,
                            },
                            {
                                text = _("Archive & Keep Old Files"),
                                checked_func = function() return self.settings.db_reset_action == "keep" end,
                                callback = function()
                                    self.settings.db_reset_action = "keep"
                                    Store:saveSettings()
                                end,
                            },
                        },
                    },
                    {
                        text = _("Check for plugin updates"),
                        keep_menu_open = true,
                        callback = function()
                            self:checkForPluginUpdate(true)
                        end,
                    },
                    {
                        text = _("Reset local sync state"),
                        keep_menu_open = true,
                        callback = function()
                            self:promptResetSyncCache()
                        end,
                    },
                },
            },
            {
                text = _("Status & Info"),
                keep_menu_open = true,
                callback = function()
                    self:showStatusDialog()
                end,
            },
        },
    }
end

function Wallaflare:openDownloadFolder()
    local download_dir = Store:getDownloadDir()
    if not download_dir or download_dir == "" then
        UIManager:show(InfoMessage:new{
            text = _("Please set a download folder in Wallaflare Settings first."),
            timeout = 4,
        })
        return
    end

    if FileManager.instance then
        if FileManager.instance.reinit then
            FileManager.instance:reinit(download_dir)
        elseif FileManager.instance.showFiles then
            FileManager.instance:showFiles(download_dir)
        end
    else
        FileManager:showFiles(download_dir)
    end
end

function Wallaflare:chooseDownloadDir(touchmenu_instance, on_confirm_callback)
    local DownloadMgr = require("ui/downloadmgr")
    DownloadMgr:new{
        onConfirm = function(path)
            if path and path ~= "" then
                self.settings.download_dir = path
                Store:saveSettings()
                if touchmenu_instance and touchmenu_instance.updateItems then
                    touchmenu_instance:updateItems()
                end
                UIManager:show(InfoMessage:new{
                    text = string.format(_("Download folder set to:\n%s"), path),
                    timeout = 3,
                })
                if on_confirm_callback then
                    on_confirm_callback(path)
                end
            end
        end,
    }:chooseDir()
end

function Wallaflare:editServerSettings()
    local dialog
    dialog = MultiInputDialog:new{
        title = _("Wallaflare Server Settings"),
        fields = {
            {
                text = self.settings.server_url or "",
                description = _("Server URL:"),
                hint = "https://<your-subdomain>.workers.dev",
            },
            {
                text = self.settings.auth_token or "",
                description = _("API Token (AUTH_TOKEN):"),
                hint = "AUTH_TOKEN",
                text_type = "password",
            },
        },
        buttons = {
            {
                {
                    text = _("Cancel"),
                    id = "close",
                    callback = function()
                        UIManager:close(dialog)
                    end,
                },
                {
                    text = _("Save"),
                    is_enter_default = true,
                    callback = function()
                        local fields = dialog:getFields()
                        local raw_url = fields[1] or ""
                        local raw_token = fields[2] or ""

                        local clean_url = Api.normalizeUrl(raw_url)
                        local clean_token = raw_token:gsub("^%s+", ""):gsub("%s+$", "")

                        self.settings.server_url = clean_url
                        self.settings.auth_token = clean_token
                        Store:saveSettings()

                        UIManager:close(dialog)
                        UIManager:show(InfoMessage:new{ text = _("Wallaflare settings saved."), timeout = 2 })
                    end,
                },
            },
        },
    }
    UIManager:show(dialog)
    dialog:onShowKeyboard()
end

function Wallaflare:showStatusDialog()
    local download_dir = Store:getDownloadDir()
    local file_count = 0
    if download_dir and lfs.attributes(download_dir, "mode") == "directory" then
        for f in lfs.dir(download_dir) do
            if f:match("%.epub$") then
                file_count = file_count + 1
            end
        end
    end

    local outbox_count = #(Store:getOutbox())
    local status_text = string.format(
        _("Plugin Version: %s\nServer URL: %s\nFolder: %s\nSync Revision: %d\nInstance ID: %s\nLocal Articles: %d\nPending Outbox: %d\nAuto-Delete: %s"),
        self.version,
        self.settings.server_url ~= "" and self.settings.server_url or _("(Not set)"),
        download_dir,
        self.settings.sync_rev or 0,
        self.settings.instance_id and self.settings.instance_id:sub(1, 12) .. "..." or _("None"),
        file_count,
        outbox_count,
        self.settings.auto_delete and _("Enabled") or _("Disabled")
    )

    UIManager:show(InfoMessage:new{
        text = status_text,
        timeout = 6,
    })
end

function Wallaflare:checkForPluginUpdate(is_manual)
    if not self.settings.server_url or self.settings.server_url == "" then
        if is_manual then self:editServerSettings() end
        return
    end

    NetworkMgr:runWhenConnected(function()
        if is_manual then
            UIManager:show(InfoMessage:new{ text = _("Wallaflare: Checking for updates..."), timeout = 2 })
        end

        local has_update, latest_ver, err = Api.checkPluginUpdate(
            self.settings.server_url,
            self.settings.auth_token,
            self.version
        )

        if not has_update then
            if is_manual then
                UIManager:show(InfoMessage:new{
                    text = string.format(_("Wallaflare plugin is up to date (v%s)."), self.version),
                    timeout = 3,
                })
            end
            return
        end

        local confirm = ConfirmBox:new{
            text = string.format(
                _("Wallaflare Plugin Update Available\n\nA new version (%s) is available on your server.\nYour current version is %s.\n\nWould you like to install the update now?"),
                tostring(latest_ver),
                self.version
            ),
            ok_text = _("Update Now"),
            cancel_text = _("Later"),
            ok_callback = function()
                self:installPluginUpdate(latest_ver)
            end,
        }
        UIManager:show(confirm)
    end)
end

function Wallaflare:installPluginUpdate(target_version)
    UIManager:show(InfoMessage:new{ text = _("Wallaflare: Downloading plugin update..."), timeout = 3 })

    local files, ver_or_err = Api.fetchPluginFiles(self.settings.server_url, self.settings.auth_token)
    if not files or type(files) ~= "table" then
        UIManager:show(InfoMessage:new{
            text = _("Update Failed: ") .. tostring(ver_or_err or "Invalid files payload"),
            timeout = 5,
        })
        return
    end

    local pdir = getPluginDir()
    local staging_dir = pdir .. ".update"

    if lfs.attributes(staging_dir, "mode") == "directory" then
        removeDirRecursive(staging_dir)
    end
    pcall(lfs.mkdir, staging_dir)

    -- Write files to staging
    local success = true
    for filename, content in pairs(files) do
        local staging_file = staging_dir .. "/" .. filename
        local f = io.open(staging_file, "wb")
        if f then
            f:write(content)
            f:close()
        else
            success = false
            break
        end
    end

    if not success or lfs.attributes(staging_dir .. "/main.lua", "mode") ~= "file" then
        removeDirRecursive(staging_dir)
        UIManager:show(InfoMessage:new{ text = _("Update Failed: Could not write staging files"), timeout = 5 })
        return
    end

    -- Atomically overwrite target files
    for filename, _ in pairs(files) do
        local src_f = staging_dir .. "/" .. filename
        local dst_f = pdir .. "/" .. filename
        local src_handle = io.open(src_f, "rb")
        if src_handle then
            local data = src_handle:read("*all")
            src_handle:close()
            local dst_handle = io.open(dst_f, "wb")
            if dst_handle then
                dst_handle:write(data)
                dst_handle:close()
            end
        end
    end

    removeDirRecursive(staging_dir)

    local confirm = ConfirmBox:new{
        text = string.format(
            _("Wallaflare Plugin successfully updated to v%s!\n\nPlease restart KOReader now to apply the update."),
            tostring(target_version or "latest")
        ),
        ok_text = _("Restart Now"),
        cancel_text = _("Later"),
        ok_callback = function()
            if UIManager.restartKOReader then
                UIManager:restartKOReader()
            elseif UIManager.exitKOReader then
                UIManager:exitKOReader()
            end
        end,
    }
    UIManager:show(confirm)
end


function Wallaflare:promptChangeSyncFilter(target_filter, filter_label, touchmenu_instance)
    if self.settings.sync_filter == target_filter then
        return
    end

    local confirm = ConfirmBox:new{
        text = string.format(
            _("Change sync filter to %s?\n\nThis will trigger a full library reconciliation on the next sync to align your local files with the selected filter."),
            filter_label
        ),
        ok_text = _("Change Filter"),
        cancel_text = _("Cancel"),
        ok_callback = function()
            self.settings.sync_filter = target_filter
            self.settings.sync_rev = 0
            Store:saveSettings()
            if touchmenu_instance and touchmenu_instance.updateItems then
                touchmenu_instance:updateItems()
            end
            UIManager:show(InfoMessage:new{
                text = string.format(_("Sync filter changed to %s.\nNext sync will reconcile your library."), filter_label),
                timeout = 3,
            })
        end,
    }
    UIManager:show(confirm)
end

function Wallaflare:promptResetSyncCache()
    local confirm = ConfirmBox:new{
        text = _("Reset local sync state?\n\nThis resets your last sync revision so the next sync will check the entire library again. Existing files will NOT be deleted."),
        ok_text = _("Reset"),
        cancel_text = _("Cancel"),
        ok_callback = function()
            Store:resetSyncState()
            self.settings = Store.settings
            UIManager:show(InfoMessage:new{ text = _("Sync cache reset."), timeout = 2 })
        end,
    }
    UIManager:show(confirm)
end

function Wallaflare:archiveLocalLibrary(old_instance_id)
    local download_dir = Store:getDownloadDir()
    if not download_dir or lfs.attributes(download_dir, "mode") ~= "directory" then
        return
    end

    local archive_folder_name = "Archive_Instance_" .. tostring(old_instance_id or "previous")
    local archive_dir = download_dir .. "/" .. archive_folder_name

    local ffiUtil_ok, ffiUtil = pcall(require, "ffi/util")
    if ffiUtil_ok and ffiUtil and ffiUtil.makePath then
        pcall(ffiUtil.makePath, archive_dir)
    else
        pcall(lfs.mkdir, archive_dir)
    end

    local moved_count = 0
    for file in lfs.dir(download_dir) do
        if file ~= "." and file ~= ".." and not file:match("^Archive_Instance_") then
            local full_path = download_dir .. "/" .. file
            local target_path = archive_dir .. "/" .. file
            local ok_rename = os.rename(full_path, target_path)
            if ok_rename then
                moved_count = moved_count + 1
            end
        end
    end
    logger.info("Wallaflare: Archived " .. moved_count .. " items to " .. archive_dir)
end

function Wallaflare:wipeLocalLibrary()
    local download_dir = Store:getDownloadDir()
    if lfs.attributes(download_dir, "mode") == "directory" then
        for file in lfs.dir(download_dir) do
            if file ~= "." and file ~= ".." then
                local full = download_dir .. "/" .. file
                local mode = lfs.attributes(full, "mode")
                if mode == "file" then
                    DocSettings.purgeSettings(full)
                    ReadHistory:deleteItem(full)
                    ReadCollection:deleteItem(full)
                    os.remove(full)
                elseif mode == "directory" then
                    removeDirRecursive(full)
                end
            end
        end
    end
    self.settings.article_revs = {}
    self.settings.article_content_revs = {}
    self.settings.outbox = {}
    Store:saveSettings()
end

function Wallaflare:startSync()
    if not self.settings.server_url or self.settings.server_url == "" then
        self:editServerSettings(function()
            self:startSync()
        end)
        return
    end

    local download_dir = Store:getDownloadDir()
    if not download_dir or download_dir == "" then
        UIManager:show(InfoMessage:new{
            text = _("Please set a download folder in Wallaflare Settings before syncing."),
            timeout = 4,
        })
        return
    end

    NetworkMgr:runWhenConnected(function()
        self:performSync()
    end)
end


function Wallaflare:queueLocalReadingStatuses()
    local download_dir = Store:getDownloadDir()
    if not download_dir or lfs.attributes(download_dir, "mode") ~= "directory" then
        return
    end

    -- Check for missing/deleted files and queue remote action
    self:pruneOrphanArticleRevs(download_dir)

    local existing_outbox = Store:getOutbox()
    local queued_ids = {}
    for _, item in ipairs(existing_outbox) do
        if item.id then queued_ids[item.id] = true end
    end

    for file in lfs.dir(download_dir) do
        if file:match("%.epub$") then
            local art_id = file:match("^(%d+)[%._]")
            local num_id = tonumber(art_id)
            if num_id and not queued_ids[num_id] then
                local full_path = download_dir .. "/" .. file
                local sidecar = full_path:gsub("%.epub$", ".sdr")
                local status = nil
                local is_100_percent = false

                if lfs.attributes(sidecar, "mode") == "directory" then
                    local pcall_ok, doc_settings = pcall(DocSettings.open, DocSettings, full_path)
                    if pcall_ok and doc_settings and doc_settings.readSetting then
                        local summary = doc_settings:readSetting("summary")
                        status = summary and summary.status
                        local percent = doc_settings:readSetting("percent_finished")
                        if percent and tonumber(percent) and tonumber(percent) >= 1 then
                            is_100_percent = true
                        end
                    end
                end

                local should_archive = false
                if status == "complete" and self.settings.archive_finished then
                    should_archive = true
                elseif status == "abandoned" and self.settings.archive_abandoned then
                    should_archive = true
                elseif is_100_percent and self.settings.archive_read then
                    should_archive = true
                end

                if should_archive then
                    local action_name = self.settings.delete_instead_of_archive and "delete" or "archive"
                    Store:queueAction(action_name, num_id)
                    queued_ids[num_id] = true
                end
            end
        end
    end
end

function Wallaflare:flushActiveDocument()
    if not self.ui or not self.ui.document or not self.ui.document.file then return end
    pcall(function()
        if self.ui.annotation and self.ui.annotation.annotations then
            Annotations:populateMissingContext(self.ui.document, self.ui.annotation.annotations)
        end
        if self.ui.annotation and self.ui.annotation.annotations and self.ui.doc_settings and self.ui.doc_settings.saveSetting then
            self.ui.doc_settings:saveSetting("annotations", self.ui.annotation.annotations)
            self.ui.doc_settings:delSetting("annotations_paging")
            self.ui.doc_settings:delSetting("annotations_rolling")
        end
        if self.ui.saveSettings then
            self.ui:saveSettings()
        elseif self.ui.onFlushSettings then
            self.ui:onFlushSettings(false)
        elseif self.ui.doc_settings and self.ui.doc_settings.flush then
            self.ui.doc_settings:flush()
        end
        logger.info("Wallaflare: Flushed active document settings to disk before sync")
    end)
end

function Wallaflare:performSync()
    local progress_info = InfoMessage:new{ text = _("Wallaflare: Checking for updates…") }
    UIManager:show(progress_info)
    if UIManager.forceRePaint then UIManager:forceRePaint() end

    -- 0. Flush active document in-memory annotations & settings to disk
    self:flushActiveDocument()

    -- 0b. Scan local files for reading status (finished, abandoned, 100%)
    self:queueLocalReadingStatuses()

    -- 1. Flush Outbox actions (e.g. offline archives, stars, deletions)
    local outbox = Store:getOutbox()
    local remote_archived_count = 0
    local remote_deleted_count = 0
    local remote_deleted_ann_count = 0
    if #outbox > 0 then
        for _, item in ipairs(outbox) do
            if item.action == "archive" then
                local res = Api.sendPatch(self.settings.server_url, self.settings.auth_token, item.id, { archive = 1 })
                if res and type(res) == "table" then
                    remote_archived_count = remote_archived_count + 1
                end
            elseif item.action == "delete" then
                local res = Api.deleteEntry(self.settings.server_url, self.settings.auth_token, item.id)
                if res and type(res) == "table" then
                    remote_deleted_count = remote_deleted_count + 1
                end
            elseif item.action == "star" then
                Api.sendPatch(self.settings.server_url, self.settings.auth_token, item.id, { starred = 1 })
            elseif item.action == "unstar" then
                Api.sendPatch(self.settings.server_url, self.settings.auth_token, item.id, { starred = 0 })
            elseif item.action == "delete_annotation" then
                local res = Api.deleteAnnotation(self.settings.server_url, self.settings.auth_token, item.id)
                if res and type(res) == "table" then
                    remote_deleted_ann_count = remote_deleted_ann_count + 1
                end
            end
        end
        Store:clearOutbox()
    end

    -- 1b. Upload local unsynced annotations across all downloaded EPUBs
    local uploaded_ann_count = 0
    local download_dir = Store:getDownloadDir()
    if download_dir and lfs.attributes(download_dir, "mode") == "directory" then
        for file in lfs.dir(download_dir) do
            if file:match("%.epub$") then
                local art_id = file:match("^(%d+)[%._]")
                if art_id then
                    local full_path = download_dir .. "/" .. file
                    local doc_for_context = (self.ui and self.ui.document and (self.ui.document.file == full_path or self.ui.document.file:match("/(%d+)[%._]") == art_id)) and self.ui.document or nil
                    local unsynced, resolved_updates, locally_deleted_ids = Annotations:getLocalUnsynced(full_path, doc_for_context)

                    -- 0. Process locally deleted annotations
                    if type(locally_deleted_ids) == "table" and #locally_deleted_ids > 0 then
                        for _, del_id in ipairs(locally_deleted_ids) do
                            local res, err_del, code_del = Api.deleteAnnotation(self.settings.server_url, self.settings.auth_token, del_id)
                            if (res and type(res) == "table") or (code_del == 404 or (err_del and err_del:find("404"))) then
                                remote_deleted_ann_count = remote_deleted_ann_count + 1
                                Annotations:removeSyncedId(full_path, del_id, self.ui)
                                logger.info("Wallaflare: Deleted annotation #" .. tostring(del_id) .. " on server")
                            else
                                Store:queueAction("delete_annotation", del_id)
                                Annotations:removeSyncedId(full_path, del_id, self.ui)
                                logger.info("Wallaflare: Queued deletion for annotation #" .. tostring(del_id))
                            end
                        end
                    end

                    -- 1. Create brand new local annotations
                    for _, u in ipairs(unsynced) do
                        local res, u_err = Api.createAnnotation(self.settings.server_url, self.settings.auth_token, tonumber(art_id), u)
                        if res and type(res) == "table" and res.id then
                            Annotations:stampRemoteId(full_path, u.index, res.id)
                            uploaded_ann_count = uploaded_ann_count + 1
                            if self.ui and self.ui.document and self.ui.document.file then
                                local cur_f = self.ui.document.file
                                if cur_f == full_path or cur_f:match("/(%d+)[%._]") == art_id then
                                    if self.ui.annotation and self.ui.annotation.annotations and self.ui.annotation.annotations[u.index] then
                                        self.ui.annotation.annotations[u.index].wallaflare_id = tonumber(res.id)
                                        self.ui.annotation.annotations[u.index].has_server_pos = true
                                    end
                                    if self.ui.doc_settings and self.ui.doc_settings.saveSetting then
                                        self.ui.doc_settings:saveSetting("annotations", self.ui.annotation and self.ui.annotation.annotations)
                                        self.ui.doc_settings:flush()
                                    end
                                end
                            end
                        end
                    end
                    -- 2. Push local note edits, color changes, and resolved xPointers to server
                    if type(resolved_updates) == "table" then
                        for _, r in ipairs(resolved_updates) do
                            local patch_data = {
                                text = r.text,
                                color = r.color,
                                updated_at = r.updated_at,
                            }
                            local target = {}
                            if r.prefix or r.suffix then
                                target.selector = {
                                    type = "TextQuoteSelector",
                                    exact = r.quote or r.text,
                                    prefix = r.prefix,
                                    suffix = r.suffix,
                                }
                            end
                            if r.koreader then
                                target.koreader = r.koreader
                            end
                            if next(target) ~= nil then
                                patch_data.target = target
                            end
                            local ok_up, up_err, up_code = Api.updateAnnotation(self.settings.server_url, self.settings.auth_token, r.id, patch_data)
                            if not ok_up and (up_code == 404 or (up_err and tostring(up_err):find("404"))) then
                                Annotations:removeLocalAnnotation(full_path, r.id, self.ui)
                                remote_deleted_ann_count = remote_deleted_ann_count + 1
                                self:refreshActiveDocumentAnnotations(full_path)
                                logger.info("Wallaflare: Pruned deleted annotation #" .. tostring(r.id) .. " locally (server returned 404)")
                            elseif ok_up and type(ok_up) == "table" then
                                local winning_text = (ok_up.text ~= nil) and ok_up.text or r.text
                                local winning_color = (ok_up.color ~= nil) and ok_up.color or r.color
                                Annotations:stampSyncedEdit(full_path, r.index, winning_text, winning_color)
                                if self.ui and self.ui.document and self.ui.document.file then
                                    local cur_f = self.ui.document.file
                                    if cur_f == full_path or cur_f:match("/(%d+)[%._]") == art_id then
                                        if self.ui.annotation and self.ui.annotation.annotations and self.ui.annotation.annotations[r.index] then
                                            self.ui.annotation.annotations[r.index].last_synced_note = winning_text
                                            self.ui.annotation.annotations[r.index].last_synced_color = winning_color
                                            self.ui.annotation.annotations[r.index].has_server_pos = true
                                            self.ui.annotation.annotations[r.index].needs_pos_push = nil
                                            self.ui.annotation.annotations[r.index].local_modified = nil
                                        end
                                        if self.ui.doc_settings and self.ui.doc_settings.saveSetting then
                                            self.ui.doc_settings:saveSetting("annotations", self.ui.annotation and self.ui.annotation.annotations)
                                            self.ui.doc_settings:delSetting("annotations_paging")
                                            self.ui.doc_settings:delSetting("annotations_rolling")
                                            self.ui.doc_settings:flush()
                                        end
                                    end
                                end
                                if r.user_modified and winning_text == r.text then
                                    uploaded_ann_count = uploaded_ann_count + 1
                                end
                            end
                        end
                    end
                end
            end
        end
    end

    -- 2. Fetch delta sync from server
    local since_rev = self.settings.sync_rev or 0
    local data, err = Api.fetchSync(
        self.settings.server_url,
        self.settings.auth_token,
        since_rev,
        self.settings.sync_filter,
        1,
        100
    )

    if not data or type(data) ~= "table" then
        UIManager:show(InfoMessage:new{
            text = _("Wallaflare Sync Failed: ") .. (err or _("Unknown error")),
            timeout = 5,
        })
        return
    end

    -- 3. Database Epoch / Reset Watchdog
    local server_instance = data.instance_id and tostring(data.instance_id) or nil
    local local_instance = self.settings.instance_id and tostring(self.settings.instance_id) or nil
    local is_epoch_reset = false

    if server_instance ~= nil and local_instance ~= nil and server_instance ~= local_instance then
        is_epoch_reset = true
    end
    if self.settings.sync_rev > 1 and data.sync_rev and data.sync_rev < self.settings.sync_rev then
        is_epoch_reset = true
    end

    if is_epoch_reset then
        if self.settings.db_reset_action == "wipe" then
            self:wipeLocalLibrary()
            self:applySyncPayload(data, server_instance, progress_info, uploaded_ann_count, remote_archived_count, remote_deleted_count, remote_deleted_ann_count)
        elseif self.settings.db_reset_action == "keep" then
            self:archiveLocalLibrary(local_instance or "previous")
            self.settings.instance_id = server_instance
            self.settings.sync_rev = 0
            self.settings.article_revs = {}
            self.settings.article_content_revs = {}
            self.settings.outbox = {}
            Store:saveSettings()
            self:applySyncPayload(data, server_instance, progress_info, uploaded_ann_count, remote_archived_count, remote_deleted_count, remote_deleted_ann_count)
        else
            -- Default: Interactive prompt
            local confirm = MultiConfirmBox:new{
                text = _("Server Database Reset Detected\n\nThe remote database was wiped or recreated.\nHow would you like to handle your local files?"),
                choice1_text = _("Wipe & Resync"),
                choice1_callback = function()
                    self:wipeLocalLibrary()
                    self:applySyncPayload(data, server_instance, progress_info, uploaded_ann_count, remote_archived_count, remote_deleted_count, remote_deleted_ann_count)
                end,
                choice2_text = _("Archive & Keep Old Files"),
                choice2_callback = function()
                    self:archiveLocalLibrary(local_instance or "previous")
                    self.settings.instance_id = server_instance
                    self.settings.sync_rev = 0
                    self.settings.article_revs = {}
                    self.settings.article_content_revs = {}
                    self.settings.outbox = {}
                    Store:saveSettings()
                    self:applySyncPayload(data, server_instance, progress_info, uploaded_ann_count, remote_archived_count, remote_deleted_count, remote_deleted_ann_count)
                end,
                cancel_text = _("Cancel"),
                cancel_callback = function()
                    if progress_info then UIManager:close(progress_info) end
                    UIManager:show(InfoMessage:new{ text = _("Sync cancelled. No changes made."), timeout = 3 })
                end,
            }
            UIManager:show(confirm)
            return
        end
    else
        self:applySyncPayload(data, server_instance, progress_info, uploaded_ann_count, remote_archived_count, remote_deleted_count, remote_deleted_ann_count)
    end
end


function Wallaflare:cleanOldArticleFiles(download_dir, num_id, current_filename)
    if not num_id or not download_dir or lfs.attributes(download_dir, "mode") ~= "directory" then
        return
    end

    local new_full_path = current_filename and (download_dir .. "/" .. current_filename) or nil
    local new_sdr_dir = new_full_path and new_full_path:gsub("%.epub$", ".sdr") or nil
    local current_sdr = current_filename and current_filename:gsub("%.epub$", ".sdr") or nil

    for file in lfs.dir(download_dir) do
        if file:match("%.epub$") and file ~= current_filename then
            local id_str = file:match("^(%d+)[%._]")
            if id_str and tonumber(id_str) == num_id then
                local old_full_path = download_dir .. "/" .. file
                local old_sdr_dir = old_full_path:gsub("%.epub$", ".sdr")

                -- Migrate old .sdr folder to new .sdr folder if new one doesn't exist yet
                if new_sdr_dir and lfs.attributes(old_sdr_dir, "mode") == "directory" then
                    if lfs.attributes(new_sdr_dir, "mode") ~= "directory" then
                        pcall(os.rename, old_sdr_dir, new_sdr_dir)
                    else
                        removeDirRecursive(old_sdr_dir)
                    end
                end

                if ReadHistory and ReadHistory.deleteItem then
                    pcall(ReadHistory.deleteItem, ReadHistory, old_full_path)
                end
                if ReadCollection and ReadCollection.deleteItem then
                    pcall(ReadCollection.deleteItem, ReadCollection, old_full_path)
                end

                pcall(os.remove, old_full_path)
                logger.info("Wallaflare: Removed outdated file variant " .. file .. " for article #" .. tostring(num_id))
            end
        elseif file:match("%.sdr$") and current_sdr and file ~= current_sdr then
            local id_str = file:match("^(%d+)[%._]")
            if id_str and tonumber(id_str) == num_id then
                local old_sdr_dir = download_dir .. "/" .. file
                if new_sdr_dir and lfs.attributes(new_sdr_dir, "mode") ~= "directory" then
                    pcall(os.rename, old_sdr_dir, new_sdr_dir)
                else
                    removeDirRecursive(old_sdr_dir)
                end
                logger.info("Wallaflare: Removed outdated SDR folder " .. file .. " for article #" .. tostring(num_id))
            end
        end
    end
end

function Wallaflare:deleteLocalArticle(download_dir, article_id)
    local num_id = tonumber(article_id)
    if not num_id or not download_dir or lfs.attributes(download_dir, "mode") ~= "directory" then
        return false
    end

    if type(self.settings.article_revs) == "table" then
        self.settings.article_revs[num_id] = nil
        self.settings.article_revs[tostring(num_id)] = nil
    end
    if type(self.settings.article_content_revs) == "table" then
        self.settings.article_content_revs[num_id] = nil
        self.settings.article_content_revs[tostring(num_id)] = nil
    end

    local deleted = false
    for file in lfs.dir(download_dir) do
        if file:match("%.epub$") then
            local id_str = file:match("^(%d+)[%._]")
            if id_str and tonumber(id_str) == num_id then
                local full_path = download_dir .. "/" .. file
                local sdr_dir = full_path:gsub("%.epub$", ".sdr")
                if ReadHistory and ReadHistory.deleteItem then
                    pcall(ReadHistory.deleteItem, ReadHistory, full_path)
                end
                if ReadCollection and ReadCollection.deleteItem then
                    pcall(ReadCollection.deleteItem, ReadCollection, full_path)
                end
                os.remove(full_path)
                if lfs.attributes(sdr_dir, "mode") == "directory" then
                    removeDirRecursive(sdr_dir)
                end
                deleted = true
            end
        end
    end
    return deleted
end

function Wallaflare:pruneOrphanArticleRevs(download_dir)
    if type(self.settings.article_revs) ~= "table" then
        self.settings.article_revs = {}
    end
    if type(self.settings.article_content_revs) ~= "table" then
        self.settings.article_content_revs = {}
    end
    if not download_dir or lfs.attributes(download_dir, "mode") ~= "directory" then
        return
    end

    local active_ids = {}
    for f in lfs.dir(download_dir) do
        if f:match("%.epub$") then
            local id_num = tonumber(f:match("^(%d+)[%._]"))
            if id_num then
                active_ids[id_num] = true
                active_ids[tostring(id_num)] = true
            end
        end
    end

    local on_delete = self.settings.on_file_delete or "archive"

    for saved_id, _ in pairs(self.settings.article_revs) do
        local nid = tonumber(saved_id)
        if nid and not active_ids[nid] then
            if on_delete == "archive" or on_delete == "delete" then
                logger.info("Wallaflare: Detected locally removed article #" .. tostring(nid) .. ", queuing " .. on_delete)
                Store:queueAction(on_delete, nid)
            end
            logger.info("Wallaflare: Pruning deleted/missing article #" .. tostring(saved_id) .. " from article_revs")
            self.settings.article_revs[saved_id] = nil
            self.settings.article_revs[nid] = nil
            self.settings.article_revs[tostring(nid)] = nil
        end
    end
    for saved_id, _ in pairs(self.settings.article_content_revs) do
        local nid = tonumber(saved_id)
        if nid and not active_ids[nid] then
            logger.info("Wallaflare: Pruning deleted/missing article #" .. tostring(saved_id) .. " from article_content_revs")
            self.settings.article_content_revs[saved_id] = nil
            self.settings.article_content_revs[nid] = nil
            self.settings.article_content_revs[tostring(nid)] = nil
        end
    end
end

function Wallaflare:applySyncPayload(data, server_instance, progress_info, uploaded_ann_count, remote_archived_count, remote_deleted_count, remote_deleted_ann_count)
    remote_archived_count = remote_archived_count or 0
    remote_deleted_count = remote_deleted_count or 0
    uploaded_ann_count = uploaded_ann_count or 0
    local deleted_ann_count = remote_deleted_ann_count or 0
    local synced_ann_count = 0
    local reopen_active_file = nil
    local download_dir = Store:getDownloadDir()
    if not download_dir or download_dir == "" then
        if progress_info then UIManager:close(progress_info) end
        UIManager:show(InfoMessage:new{ text = _("Wallaflare: No download folder set."), timeout = 4 })
        return
    end
    local deleted_count = 0
    local downloaded_count = 0

    -- Handle up-to-date response
    if data.up_to_date == true then
        if progress_info then UIManager:close(progress_info) end
        if server_instance then self.settings.instance_id = server_instance end
        if data.sync_rev then self.settings.sync_rev = data.sync_rev end
        self:pruneOrphanArticleRevs(download_dir)
        Store:saveSettings()
        self:refreshFileManager()

        local parts = {}
        if remote_archived_count > 0 then
            table.insert(parts, string.format(_("%d archived on Wallaflare"), remote_archived_count))
        end
        if remote_deleted_count > 0 then
            table.insert(parts, string.format(_("%d deleted from Wallaflare"), remote_deleted_count))
        end
        if uploaded_ann_count > 0 then
            table.insert(parts, string.format(_("%d highlight(s) uploaded"), uploaded_ann_count))
        end
        local msg = ""
        if #parts > 0 then
            msg = string.format(_("Wallaflare: Sync complete.\n%s"), table.concat(parts, "\n"))
        else
            msg = _("Wallaflare: Library is up to date.")
        end
        UIManager:show(InfoMessage:new{ text = msg, timeout = 3 })
        if UIManager.forceRePaint then UIManager:forceRePaint() end
        return
    end

    -- 1. Handle deleted articles (tombstones)
    if type(data.deleted_ids) == "table" and #data.deleted_ids > 0 then
        for _, id in ipairs(data.deleted_ids) do
            local num_id = tonumber(id)
            if num_id then
                if self.settings.auto_delete then
                    if self:deleteLocalArticle(download_dir, num_id) then
                        deleted_count = deleted_count + 1
                    end
                else
                    if type(self.settings.article_revs) == "table" then
                        self.settings.article_revs[num_id] = nil
                        self.settings.article_revs[tostring(num_id)] = nil
                    end
                    if type(self.settings.article_content_revs) == "table" then
                        self.settings.article_content_revs[num_id] = nil
                        self.settings.article_content_revs[tostring(num_id)] = nil
                    end
                end
            end
        end
    end

    -- 1b. Full sync pruning: If starting from revision 0 (or full sync) with a filter (unread or starred),
    -- prune any local files on device that are no longer part of the server filtered set.
    local is_full_sync = (self.settings.sync_rev == nil or self.settings.sync_rev == 0)
    local active_server_ids = {}
    if type(data.entries) == "table" then
        for _, entry in ipairs(data.entries) do
            local num_id = tonumber(entry.id)
            if num_id then
                active_server_ids[num_id] = true
            end
        end
    end

    if is_full_sync and self.settings.auto_delete and self.settings.sync_filter ~= "all" and lfs.attributes(download_dir, "mode") == "directory" then
        for file in lfs.dir(download_dir) do
            if file:match("%.epub$") then
                local id_str = file:match("^(%d+)[%._]")
                local num_id = id_str and tonumber(id_str)
                if num_id and not active_server_ids[num_id] then
                    if self:deleteLocalArticle(download_dir, num_id) then
                        deleted_count = deleted_count + 1
                    end
                end
            end
        end
    end

    self:pruneOrphanArticleRevs(download_dir)

    -- 2. Handle new or modified entries with live progress display
    local skipped_count = 0
    local download_errors = {}
    if type(data.entries) == "table" and #data.entries > 0 then
        local total_entries = #data.entries
        logger.info("Wallaflare: Processing " .. total_entries .. " entries from server...")
        for idx, entry in ipairs(data.entries) do
            local num_id = tonumber(entry.id) or entry.id
            local str_id = tostring(entry.id)

            local is_archived = (entry.is_archived == 1 or entry.is_archived == true or entry.archive == 1)
            local is_starred = (entry.is_starred == 1 or entry.is_starred == true or entry.starred == 1)
            local should_prune = false

            if self.settings.sync_filter == "unread" and is_archived then
                should_prune = true
            elseif self.settings.sync_filter == "starred" and not is_starred then
                should_prune = true
            end

            if should_prune then
                if self.settings.auto_delete then
                    if self:deleteLocalArticle(download_dir, num_id) then
                        deleted_count = deleted_count + 1
                    end
                end
            else
                local clean_title = sanitizeFilename(entry.title)
                local filename = str_id .. "_" .. clean_title .. ".epub"
                local full_path = download_dir .. "/" .. filename

                local target_content_rev = type(entry.content_revision) == "number" and entry.content_revision or (tonumber(entry.content_revision) or 1)
                local target_sync_rev = type(entry.revision) == "number" and entry.revision or (tonumber(entry.revision) or 1)

                if type(self.settings.article_content_revs) ~= "table" then
                    self.settings.article_content_revs = {}
                end
                if type(self.settings.article_revs) ~= "table" then
                    self.settings.article_revs = {}
                end

                local recorded_content_raw = self.settings.article_content_revs[num_id] or self.settings.article_content_revs[str_id]
                local recorded_content_rev = type(recorded_content_raw) == "number" and recorded_content_raw or tonumber(recorded_content_raw)

                local attr_size = lfs.attributes(full_path, "size")
                local size = type(attr_size) == "table" and attr_size.size or (tonumber(attr_size) or 0)
                local file_exists = size > 0
                local ok_dl = false

                -- Skip EPUB file download if already on disk and content_revision has not incremented
                if file_exists and (recorded_content_rev == nil or recorded_content_rev >= target_content_rev) then
                    logger.dbg("Wallaflare: Skipping EPUB download for #" .. str_id .. " (content_rev " .. tostring(recorded_content_rev or 1) .. ")")
                    skipped_count = skipped_count + 1
                    self.settings.article_content_revs[num_id] = target_content_rev
                    self.settings.article_revs[num_id] = target_sync_rev
                    self:cleanOldArticleFiles(download_dir, num_id, filename)
                else
                    if progress_info then UIManager:close(progress_info) end
                    local short_title = entry.title and (entry.title:sub(1, 35) .. (entry.title:len() > 35 and "…" or "")) or "Article"
                    progress_info = InfoMessage:new{
                        text = string.format(_("Wallaflare: Downloading %d of %d…\n%s"), idx, total_entries, short_title),
                    }
                    UIManager:show(progress_info)
                    if UIManager.forceRePaint then UIManager:forceRePaint() end

                    logger.info("Wallaflare: Downloading #" .. str_id .. " (content_rev " .. tostring(target_content_rev) .. ") -> " .. filename)
                    local dl_err
                    ok_dl, dl_err = Api.downloadEpub(self.settings.server_url, self.settings.auth_token, entry.id, full_path)
                    if ok_dl then
                        downloaded_count = downloaded_count + 1
                        self.settings.article_content_revs[num_id] = target_content_rev
                        self.settings.article_revs[num_id] = target_sync_rev
                        self:cleanOldArticleFiles(download_dir, num_id, filename)

                        -- Evict stale Crengine .cr3 render cache
                        local _, sidecar_file = Annotations:getSidecarPaths(full_path)
                        if sidecar_file and lfs.attributes(sidecar_file, "mode") == "file" then
                            local doc_settings = LuaSettings:open(sidecar_file)
                            if doc_settings then
                                local cache_path = doc_settings:readSetting("cache_file_path")
                                if cache_path and lfs.attributes(cache_path, "mode") == "file" then
                                    pcall(os.remove, cache_path)
                                    logger.info("Wallaflare: Evicted stale Crengine cache " .. tostring(cache_path))
                                end
                                doc_settings:delSetting("cache_file_path")
                                doc_settings:flush()
                            end
                        end

                        -- If this updated article is currently open in the active reader, mark for seamless reload
                        if self.ui and self.ui.document and self.ui.document.file then
                            local cur_f = self.ui.document.file
                            local cur_id = cur_f:match("/(%d+)[%._][^/]*%.epub$") or cur_f:match("^(%d+)[%._]")
                            if cur_id and tonumber(cur_id) == num_id then
                                reopen_active_file = full_path
                            end
                        end
                    else
                        logger.err("Wallaflare: Download failed for #" .. str_id .. ": " .. tostring(dl_err))
                        table.insert(download_errors, "#" .. str_id .. ": " .. tostring(dl_err))
                    end
                end

                -- Sync inbound annotations into .sdr/metadata.epub.lua
                if type(entry.annotations) == "table" and (file_exists or ok_dl) then
                    local ok_ann, ann_res, ann_changed, ann_count, ann_del_count = pcall(function()
                        return Annotations:syncInbound(full_path, entry.annotations, (ok_dl == true))
                    end)
                    if not ok_ann then
                        logger.err("Wallaflare: Failed to sync inbound annotations for #" .. str_id .. ": " .. tostring(ann_res))
                    else
                        if (ann_del_count or 0) > 0 then
                            deleted_ann_count = deleted_ann_count + ann_del_count
                        end
                        if ann_changed and (ann_count or 0) > 0 and (ann_del_count or 0) == 0 then
                            synced_ann_count = synced_ann_count + (ann_count or 0)
                        end
                        if ann_changed or (ann_del_count or 0) > 0 then
                            self:refreshActiveDocumentAnnotations(full_path)
                        end
                        logger.info("Wallaflare: Synced " .. tostring(#entry.annotations) .. " annotations into .sdr for #" .. str_id)
                    end
                end
            end
        end
    else
        logger.info("Wallaflare: Server returned 0 entries for current filter.")
    end

    if progress_info then
        UIManager:close(progress_info)
    end

    -- 3. Update sync state only if all downloads succeeded
    if server_instance then self.settings.instance_id = server_instance end
    if #download_errors == 0 and data.sync_rev then
        self.settings.sync_rev = data.sync_rev
    end
    Store:saveSettings()

    -- Refresh file manager if currently open or in download dir
    self:refreshFileManager()

    local parts = {}
    if downloaded_count > 0 then
        table.insert(parts, string.format(_("%d downloaded"), downloaded_count))
    end
    if remote_archived_count > 0 then
        table.insert(parts, string.format(_("%d archived on Wallaflare"), remote_archived_count))
    end
    if remote_deleted_count > 0 then
        table.insert(parts, string.format(_("%d deleted from Wallaflare"), remote_deleted_count))
    end
    if deleted_count > 0 then
        table.insert(parts, string.format(_("%d deleted locally"), deleted_count))
    end
    if uploaded_ann_count > 0 then
        table.insert(parts, string.format(_("%d highlight(s) uploaded"), uploaded_ann_count))
    end
    if synced_ann_count > 0 then
        table.insert(parts, string.format(_("%d highlight(s) synced"), synced_ann_count))
    end
    if deleted_ann_count > 0 then
        table.insert(parts, string.format(_("%d annotation(s) deleted"), deleted_ann_count))
    end

    local msg = ""
    if #parts > 0 then
        msg = "Wallaflare: Sync complete.\n" .. table.concat(parts, ", ") .. "."
    else
        msg = _("Wallaflare: Library is up to date.")
    end
    if #download_errors > 0 then
        msg = msg .. "\n\n" .. _("Download errors:") .. "\n" .. table.concat(download_errors, "\n"):sub(1, 150)
    end
    UIManager:show(InfoMessage:new{ text = msg, timeout = (#download_errors > 0 and 6 or 4) })
    if UIManager.forceRePaint then UIManager:forceRePaint() end

    if reopen_active_file then
        UIManager:nextTick(function()
            pcall(function()
                local reader_ui_ok, ReaderUI = pcall(require, "apps/reader/readerui")
                if reader_ui_ok and ReaderUI and ReaderUI.showReader then
                    logger.info("Wallaflare: Reloading updated article into active reader: " .. tostring(reopen_active_file))
                    ReaderUI:showReader(reopen_active_file)
                end
            end)
        end)
    end
end

function Wallaflare:refreshFileManager()
    pcall(function()
        if self.ui and self.ui.file_chooser and self.ui.file_chooser.refreshPath then
            self.ui.file_chooser:refreshPath()
        end
        if FileManager and FileManager.instance and FileManager.instance.file_chooser and FileManager.instance.file_chooser.refreshPath then
            FileManager.instance.file_chooser:refreshPath()
        end
        if UIManager and UIManager.nextTick then
            UIManager:nextTick(function()
                if self.ui and self.ui.file_chooser and self.ui.file_chooser.refreshPath then
                    pcall(function() self.ui.file_chooser:refreshPath() end)
                end
                if UIManager.forceRePaint then
                    UIManager:forceRePaint()
                end
            end)
        end
    end)
end

function Wallaflare:refreshActiveDocumentAnnotations(doc_path)
    if not self.ui or not self.ui.document or not self.ui.document.file then return end
    local current_file = self.ui.document.file
    local is_match = (current_file == doc_path)
    if not is_match then
        local cur_id = current_file:match("/(%d+)[%._][^/]*%.epub$") or current_file:match("^(%d+)[%._]")
        local doc_id = doc_path:match("/(%d+)[%._][^/]*%.epub$") or doc_path:match("^(%d+)[%._]")
        if cur_id and doc_id and cur_id == doc_id then
            is_match = true
        end
    end
    if not is_match then return end

    local ok_ref, ref_err = pcall(function()
        local _, sidecar_file = Annotations:getSidecarPaths(doc_path)
        if not sidecar_file or lfs.attributes(sidecar_file, "mode") ~= "file" then return end

        local fresh_settings = LuaSettings:open(sidecar_file)
        if not fresh_settings then return end
        local fresh_annotations = Annotations:readRawAnnotations(fresh_settings)

        if self.ui.annotation then
            self.ui.annotation.annotations = fresh_annotations
            Annotations:resolveXPointers(self.ui.document, self.ui.annotation.annotations)
            if self.ui.document and self.ui.document.getPageFromXPointer then
                for _, ann in ipairs(self.ui.annotation.annotations) do
                    if ann.pos0 and type(ann.pos0) == "string" then
                        ann.page = ann.pos0
                        local pno = self.ui.document:getPageFromXPointer(ann.pos0)
                        if pno and type(pno) == "number" then
                            ann.pageno = pno
                        end
                    end
                end
            end
            if self.ui.annotation.updateAnnotations then
                self.ui.annotation:updateAnnotations(true, true)
            end
        end

        if self.ui.doc_settings then
            self.ui.doc_settings:saveSetting("annotations", (self.ui.annotation and self.ui.annotation.annotations) or fresh_annotations)
            self.ui.doc_settings:delSetting("annotations_paging")
            self.ui.doc_settings:delSetting("annotations_rolling")
            self.ui.doc_settings:flush()
        end

        if self.ui.highlight and self.ui.highlight.onReaderReady then
            self.ui.highlight:onReaderReady()
        end

        if self.ui.view and self.ui.view.highlight then
            self.ui.view.highlight.page_boxes = {}
        end

        local Event_ok, Event = pcall(require, "ui/event")
        if Event_ok and Event and self.ui.handleEvent then
            self.ui:handleEvent(Event:new("AnnotationsModified", { index_modified = 1 }))
            self.ui:handleEvent(Event:new("RedrawCurrentPage"))
            self.ui:handleEvent(Event:new("RedrawCurrentView"))
        end

        if self.ui.dialog then
            UIManager:setDirty(self.ui.dialog, "full")
        end
        if UIManager and UIManager.forceRePaint then
            UIManager:forceRePaint()
        end
        logger.info("Wallaflare: Live-reloaded annotations in active reader for " .. tostring(doc_path))
    end)

    if not ok_ref then
        logger.err("Wallaflare: Error refreshing active document annotations: " .. tostring(ref_err))
    end
end

function Wallaflare:onReaderReady()
    if not self.ui or not self.ui.document then return end
    local file_path = self.ui.document.file
    if not file_path or not file_path:match("%.epub$") then return end

    if self.ui.annotation and self.ui.annotation.annotations then
        local resolved = Annotations:resolveXPointers(self.ui.document, self.ui.annotation.annotations)
        if resolved then
            pcall(function()
                if self.ui.annotation.updateAnnotations then
                    self.ui.annotation:updateAnnotations(true, true)
                end
                if self.ui.doc_settings and self.ui.doc_settings.saveSetting then
                    self.ui.doc_settings:saveSetting("annotations", self.ui.annotation.annotations)
                    self.ui.doc_settings:flush()
                end
                if self.ui.highlight and self.ui.highlight.onReaderReady then
                    self.ui.highlight:onReaderReady()
                end
            end)
            logger.info("Wallaflare: Successfully auto-anchored highlights on document open")
        end
    end
end

function Wallaflare:onAnnotationsModified(items)
    local now_str = os.date("!%Y-%m-%dT%H:%M:%SZ")
    if type(items) == "table" then
        if items[1] then
            items[1].datetime_updated = now_str
        elseif items.item then
            items.item.datetime_updated = now_str
        end
    end
end

function Wallaflare:onCloseDocument()
    if self.ui and self.ui.annotation and self.ui.annotation.annotations then
        local now_str = os.date("!%Y-%m-%dT%H:%M:%SZ")
        for _, ann in ipairs(self.ui.annotation.annotations) do
            if (ann.note or "") ~= (ann.last_synced_note or "") then
                ann.datetime_updated = now_str
            end
        end
        if self.ui.doc_settings and self.ui.doc_settings.saveSetting then
            self.ui.doc_settings:saveSetting("annotations", self.ui.annotation.annotations)
            self.ui.doc_settings:flush()
        end
    end

    if not self.ui or not self.ui.document then return end
    local file_path = self.ui.document.file
    if not file_path or not file_path:match("%.epub$") then return end

    local article_id = file_path:match("/(%d+)[%._][^/]*%.epub$") or file_path:match("^(%d+)[%._]")
    if not article_id then return end

    local page = self.view and self.view.state and self.view.state.page
    local total_pages = self.ui.document.info and self.ui.document.info.number_of_pages
    local is_100_percent = (page and total_pages and page >= total_pages)

    local status = nil
    if self.ui and self.ui.doc_settings and self.ui.doc_settings.readSetting then
        local summary = self.ui.doc_settings:readSetting("summary")
        status = summary and summary.status
    end
    if not status and DocSettings and DocSettings.open then
        local pcall_ok, doc_settings = pcall(DocSettings.open, DocSettings, file_path)
        if pcall_ok and doc_settings and doc_settings.readSetting then
            local summary = doc_settings:readSetting("summary")
            status = summary and summary.status
        end
    end

    local should_archive = false
    if status == "complete" and self.settings.archive_finished then
        should_archive = true
    elseif status == "abandoned" and self.settings.archive_abandoned then
        should_archive = true
    elseif is_100_percent and self.settings.archive_read then
        should_archive = true
    end

    if should_archive then
        local action_name = self.settings.delete_instead_of_archive and "delete" or "archive"
        Store:queueAction(action_name, tonumber(article_id))
    end
end

function Wallaflare:onFileDeleted(file_path)
    if not file_path or not file_path:match("%.epub$") then return end
    local article_id = file_path:match("/(%d+)[%._][^/]*%.epub$") or file_path:match("^(%d+)[%._]")
    if not article_id then return end
    local num_id = tonumber(article_id)
    if not num_id then return end

    local on_delete = self.settings.on_file_delete or "archive"
    if on_delete == "archive" or on_delete == "delete" then
        Store:queueAction(on_delete, num_id)
        logger.info("Wallaflare: Queued " .. on_delete .. " for deleted article #" .. tostring(num_id))
    end

    if type(self.settings.article_revs) == "table" then
        self.settings.article_revs[num_id] = nil
        self.settings.article_revs[tostring(num_id)] = nil
    end
    if type(self.settings.article_content_revs) == "table" then
        self.settings.article_content_revs[num_id] = nil
        self.settings.article_content_revs[tostring(num_id)] = nil
    end
    Store:saveSettings()
end

return Wallaflare