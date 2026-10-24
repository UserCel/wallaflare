--[[
    Wallaflare KOReader End-to-End Sync Audit Helper
    Invoked by scripts/audit-sync.ts
--]]

local args = {...}
local server_url = args[1]
local auth_token = args[2]
local entry_id = tonumber(args[3])

local repo_root = os.getenv("REPO_ROOT") or "."
package.path = repo_root .. "/integrations/koreader/wallaflare.koplugin/?.lua;" .. package.path

local Api = require("api")
local Annotations = require("annotations")
local LuaSettings = require("luasettings")

-- 1. Fetch sync delta
local res, err, status = Api.fetchSync(server_url, auth_token, 0)
if not res or not res.entries then
    io.stderr:write("fetchSync failed: " .. tostring(err) .. "\n")
    os.exit(1)
end

-- 2. Locate target test entry
local target_entry = nil
for _, entry in ipairs(res.entries) do
    if entry.id == entry_id then
        target_entry = entry
        break
    end
end

if not target_entry then
    io.stderr:write("Target entry " .. tostring(entry_id) .. " not found in sync response\n")
    os.exit(1)
end

-- 3. Download EPUB to scratch/audit/
local audit_dir = repo_root .. "/scratch/audit"
os.execute("mkdir -p " .. audit_dir .. "/books")
local epub_path = audit_dir .. "/books/" .. entry_id .. "_sync_test.epub"

local dl_ok, dl_err = Api.downloadEpub(server_url, auth_token, entry_id, epub_path)
if not dl_ok then
    io.stderr:write("downloadEpub failed: " .. tostring(dl_err) .. "\n")
    os.exit(1)
end

-- 4. Merge inbound annotations into .sdr
Annotations:syncInbound(epub_path, target_entry.annotations or {})

-- 5. Open EPUB with CreDoc and resolve xPointers
G_defaults = require("luadefaults"):open()
G_reader_settings = LuaSettings:open(repo_root .. "/scratch/koreader/data/settings.reader.lua")
Device = require("device")
local CanvasContext = require("document/canvascontext")
CanvasContext:init(Device)
local CreDoc = require("document/credocument")

local doc = CreDoc:new{ file = epub_path }
doc:render()



local _, sidecar_file = Annotations:getSidecarPaths(epub_path)
local sdr_settings = LuaSettings:open(sidecar_file)
local sdr_anns = Annotations:readRawAnnotations(sdr_settings)


local resolved = Annotations:resolveXPointers(doc, sdr_anns)
sdr_settings:saveSetting("annotations", sdr_anns)
sdr_settings:flush()

-- 6. Collect audit details
local audit_results = {
    total = #sdr_anns,
    items = {},
    outbound_pushed = 0
}

for _, ann in ipairs(sdr_anns) do
    table.insert(audit_results.items, {
        id = ann.wallaflare_id,
        text = ann.text and ann.text:sub(1, 50) or "",
        pos0 = ann.pos0,
        pos1 = ann.pos1,
        page = ann.page,
        pageno = ann.pageno,
        is_placeholder = (ann.pos0 == "/1/4/2/1:0" or not ann.pos0 or ann.pos0 == ""),
        color = ann.color,
        note = ann.note
    })
end

-- 7. Ingest outbound local highlight and push to server
local local_highlight = {
    text = "banners flapped in the sudden gust",
    color = "magenta",
    drawer = "lighten",
    datetime = os.date("!%Y-%m-%dT%H:%M:%SZ"),
    pos0 = "/body/p[3]/text().65",
    pos1 = "/body/p[3]/text().100",
    page = "/body/p[3]/text().65",
    pageno = 1
}
table.insert(sdr_anns, local_highlight)
sdr_settings:saveSetting("annotations", sdr_anns)
sdr_settings:flush()

local unsynced = Annotations:getLocalUnsynced(epub_path)
for _, un in ipairs(unsynced) do
    local create_res, create_err = Api.createAnnotation(server_url, auth_token, entry_id, un)
    if create_res and create_res.id then
        audit_results.outbound_pushed = audit_results.outbound_pushed + 1
        Annotations:stampRemoteId(epub_path, un.index, create_res.id)
        -- Simulate KOReader performSync in-memory state saved back to disk
        sdr_anns[un.index].wallaflare_id = tonumber(create_res.id)
        sdr_anns[un.index].has_server_pos = true
        sdr_settings:saveSetting("annotations", sdr_anns)
        sdr_settings:flush()
    end
end

-- 8. Simulate modifying an existing annotation's selected text alone in KOReader (no note, no color change)
local magenta_idx = nil
for idx, ann in ipairs(sdr_anns) do
    if ann.color == "magenta" and ann.wallaflare_id then
        magenta_idx = idx
        break
    end
end

if magenta_idx then
    sdr_anns[magenta_idx].text = "banners flapped in the sudden gust of morning wind"
    sdr_anns[magenta_idx].pos1 = "/body/p[3]/text().116"
    sdr_settings:saveSetting("annotations", sdr_anns)
    sdr_settings:flush()

    local _, resolved_updates = Annotations:getLocalUnsynced(epub_path)
    for _, up in ipairs(resolved_updates) do
        if up.id == sdr_anns[magenta_idx].wallaflare_id then
            local patch_data = {
                quote = up.quote,
                text = up.text,
                color = up.color,
                updated_at = up.updated_at
            }
            local ok_patch = Api.updateAnnotation(server_url, auth_token, up.id, patch_data)
            if ok_patch and type(ok_patch) == "table" then
                audit_results.quote_edit_pushed = true
                Annotations:stampSyncedEdit(epub_path, up.index, ok_patch.text or up.text, ok_patch.color or up.color, ok_patch.quote or up.quote)
            end
        end
    end
end

-- Write result JSON
local f = io.open(audit_dir .. "/audit_output.json", "w")
if f then
    f:write(Api.jsonEncode(audit_results))
    f:close()
end

print("LUA_AUDIT_SUCCESS")
