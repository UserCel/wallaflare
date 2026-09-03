--[[
    Wallaflare Annotation & Highlight Synchronization Engine for KOReader
    Directly interfaces with .sdr/metadata.epub.lua (annotations table)
--]]

local LuaSettings = require("luasettings")
local lfs = require("libs/libkoreader-lfs")
local logger = require("logger")

local Annotations = {}

-- Utility: Clean / normalize text for robust fallback matching
local function normalizeText(s)
    if not s or s == "" then return "" end
    s = s:gsub("%s+", " "):gsub("^%s+", ""):gsub("%s+$", "")
    return s:lower()
end

-- Resolve sidecar directory and metadata file path for an EPUB
function Annotations:getSidecarPaths(doc_path)
    if not doc_path or doc_path == "" then return nil, nil end
    local base_path = doc_path:match("(.*)%.") or doc_path
    local sidecar_dir = base_path .. ".sdr"
    local sidecar_file = sidecar_dir .. "/metadata.epub.lua"
    return sidecar_dir, sidecar_file
end

-- Ensure sidecar directory exists
function Annotations:ensureSidecarDir(sidecar_dir)
    if not sidecar_dir then return false end
    if lfs.attributes(sidecar_dir, "mode") == "directory" then return true end

    local ffiUtil_ok, ffiUtil = pcall(require, "ffi/util")
    if ffiUtil_ok and ffiUtil and ffiUtil.makePath then
        pcall(ffiUtil.makePath, sidecar_dir)
    else
        pcall(lfs.mkdir, sidecar_dir)
    end
    if lfs.attributes(sidecar_dir, "mode") ~= "directory" then
        pcall(os.execute, "mkdir -p " .. string.format("%q", sidecar_dir))
    end
    return lfs.attributes(sidecar_dir, "mode") == "directory"
end

-- Inbound Sync: Reconcile server annotations into local .sdr/metadata.epub.lua
function Annotations:syncInbound(doc_path, remote_annotations)
    if not doc_path or type(remote_annotations) ~= "table" then return false end

    local sidecar_dir, sidecar_file = self:getSidecarPaths(doc_path)
    if not self:ensureSidecarDir(sidecar_dir) then
        logger.warn("Wallaflare: Failed to create sidecar dir: " .. tostring(sidecar_dir))
        return false
    end

    local doc_settings = LuaSettings:open(sidecar_file)
    if not doc_settings then return false end

    local local_annotations = doc_settings:readSetting("annotations") or {}
    if type(local_annotations) ~= "table" then local_annotations = {} end

    -- Index existing local annotations by wallaflare_id and normalized quote
    local local_by_id = {}
    local local_by_quote = {}
    for i, ann in ipairs(local_annotations) do
        if ann.wallaflare_id then
            local_by_id[tonumber(ann.wallaflare_id)] = ann
        elseif ann.text and ann.text ~= "" then
            local_by_quote[normalizeText(ann.text)] = ann
        end
    end

    local updated_list = {}
    local has_changes = false

    for _, remote in ipairs(remote_annotations) do
        local remote_id = tonumber(remote.id)
        local remote_quote = remote.quote or ""
        local remote_text = (remote.text and remote.text ~= "") and remote.text or nil
        local remote_color = remote.color or "yellow"
        local remote_datetime = remote.created_at or os.date("%Y-%m-%d %H:%M:%S")

        -- Extract any pre-calculated KOReader xPointers and W3C context selectors
        local remote_target = (remote.target and type(remote.target) == "table") and remote.target or {}
        local remote_selector = (remote_target.selector and type(remote_target.selector) == "table") and remote_target.selector or {}
        local remote_koreader = remote_target.koreader or nil
        local remote_pos0 = remote_koreader and remote_koreader.pos0 or nil
        local remote_pos1 = remote_koreader and remote_koreader.pos1 or nil
        local remote_page = remote_koreader and remote_koreader.page or nil
        local remote_chapter = remote_koreader and remote_koreader.chapter or nil
        local remote_prefix = remote_selector.prefix or remote_target.prefix or nil
        local remote_suffix = remote_selector.suffix or remote_target.suffix or nil
        local has_koreader_on_server = (remote_pos0 ~= nil and remote_pos0 ~= "")

        -- Match existing item: 1st by ID, 2nd by normalized quote
        local existing = (remote_id and local_by_id[remote_id]) or local_by_quote[normalizeText(remote_quote)]

        if existing then
            -- Update existing annotation in-place
            if existing.wallaflare_id ~= remote_id then
                existing.wallaflare_id = remote_id
                has_changes = true
            end
            if (existing.note or "") ~= (remote_text or "") then
                existing.note = remote_text
                has_changes = true
            end
            if (existing.color or "yellow") ~= (remote_color or "yellow") then
                existing.color = remote_color
                has_changes = true
            end
            existing.last_synced_note = remote_text
            existing.last_synced_color = remote_color
            existing.last_synced_datetime = remote.updated_at or remote.created_at
            existing.local_modified = nil
            if has_koreader_on_server then
                existing.has_server_pos = true
            end
            -- If local item lacked xPointers but remote has them, fill them in
            if not existing.pos0 and remote_pos0 then
                existing.pos0 = remote_pos0
                existing.pos1 = remote_pos1
                existing.page = remote_page or remote_pos0
                existing.chapter = remote_chapter
                has_changes = true
            end
            table.insert(updated_list, existing)
        else
            -- Brand new annotation from server
            has_changes = true
            local fallback_xp = "/1/4/2/1:0"
            local new_ann = {
                wallaflare_id = remote_id,
                text = remote_quote,
                note = remote_text,
                color = remote_color,
                drawer = "lighten",
                datetime = remote_datetime,
                pos0 = remote_pos0 or fallback_xp,
                pos1 = remote_pos1 or fallback_xp,
                page = remote_page or remote_pos0 or fallback_xp,
                chapter = remote_chapter,
                prefix = remote_prefix,
                suffix = remote_suffix,
                last_synced_note = remote_text,
                last_synced_color = remote_color,
                has_server_pos = has_koreader_on_server,
            }
            table.insert(updated_list, new_ann)
        end
    end

    -- Retain any strictly local, un-synced highlights (wallaflare_id == nil) that were not in this batch
    for _, local_ann in ipairs(local_annotations) do
        if not local_ann.wallaflare_id and local_ann.text and local_ann.text ~= "" then
            local norm = normalizeText(local_ann.text)
            local already_included = false
            for _, u in ipairs(updated_list) do
                if normalizeText(u.text) == norm then
                    already_included = true
                    break
                end
            end
            if not already_included then
                table.insert(updated_list, local_ann)
            end
        end
    end

    local was_modified = has_changes or #updated_list ~= #local_annotations or not lfs.attributes(sidecar_file, "mode")
    if was_modified then
        doc_settings:saveSetting("annotations", updated_list)
        doc_settings:makeTrue("annotations_externally_modified")
        if not doc_settings:has("doc_props") then
            doc_settings:saveSetting("doc_props", {
                title = doc_path:match("/([^/]+)%.epub$") or "Article"
            })
        end
        doc_settings:flush()
        logger.info("Wallaflare: Updated .sdr annotations for " .. tostring(doc_path) .. " (" .. #updated_list .. " items)")
    end

    return true, was_modified, #updated_list
end

-- Outbound Sync: Extract local annotations needing upload (wallaflare_id == nil)
function Annotations:getLocalUnsynced(doc_path)
    if not doc_path then return {}, {} end
    local _, sidecar_file = self:getSidecarPaths(doc_path)
    if lfs.attributes(sidecar_file, "mode") ~= "file" then return {}, {} end

    local doc_settings = LuaSettings:open(sidecar_file)
    if not doc_settings then return {}, {} end

    local annotations = doc_settings:readSetting("annotations") or {}
    local unsynced = {}
    local resolved_updates = {}

    for i, ann in ipairs(annotations) do
        if not ann.wallaflare_id and ann.text and ann.text ~= "" then
            table.insert(unsynced, {
                index = i,
                quote = ann.text,
                text = ann.note or "",
                color = ann.color or "yellow",
                pos0 = ann.pos0,
                pos1 = ann.pos1,
                page = ann.page,
                chapter = ann.chapter,
            })
        elseif ann.wallaflare_id then
            local note_changed = false
            if ann.last_synced_note ~= nil then
                note_changed = ((ann.note or "") ~= ann.last_synced_note)
            else
                note_changed = (ann.note ~= nil and ann.note ~= "")
            end

            local color_changed = false
            if ann.last_synced_color ~= nil then
                color_changed = ((ann.color or "yellow") ~= ann.last_synced_color)
            end

            local needs_pos = (not ann.has_server_pos) and (ann.pos0 and ann.pos0 ~= "/1/4/2/1:0")

            if note_changed or color_changed or needs_pos or ann.local_modified then
                local client_time = ann.datetime_updated or ann.datetime
                if client_time and not client_time:match("Z$") and not client_time:match("[%+%-]%d%d:?%d%d$") then
                    client_time = client_time:gsub(" ", "T") .. "Z"
                end
                client_time = client_time or os.date("!%Y-%m-%dT%H:%M:%SZ")
                table.insert(resolved_updates, {
                    index = i,
                    id = tonumber(ann.wallaflare_id),
                    text = ann.note or "",
                    color = ann.color or "yellow",
                    updated_at = client_time,
                    koreader = (ann.pos0 and ann.pos0 ~= "/1/4/2/1:0") and {
                        pos0 = ann.pos0,
                        pos1 = ann.pos1,
                        page = ann.page,
                        chapter = ann.chapter,
                    } or nil
                })
            end
        end
    end

    return unsynced, resolved_updates
end

function Annotations:stampSyncedEdit(doc_path, item_index, note, color)
    if not doc_path or not item_index then return false end
    local _, sidecar_file = self:getSidecarPaths(doc_path)
    if lfs.attributes(sidecar_file, "mode") ~= "file" then return false end

    local doc_settings = LuaSettings:open(sidecar_file)
    if not doc_settings then return false end

    local annotations = doc_settings:readSetting("annotations") or {}
    if annotations[item_index] then
        annotations[item_index].last_synced_note = note
        annotations[item_index].last_synced_color = color
        annotations[item_index].has_server_pos = true
        annotations[item_index].needs_pos_push = nil
        doc_settings:saveSetting("annotations", annotations)
        doc_settings:flush()
        return true
    end
    return false
end

function Annotations:clearNeedsPush(doc_path, item_index)
    if not doc_path or not item_index then return false end
    local _, sidecar_file = self:getSidecarPaths(doc_path)
    if lfs.attributes(sidecar_file, "mode") ~= "file" then return false end

    local doc_settings = LuaSettings:open(sidecar_file)
    if not doc_settings then return false end

    local annotations = doc_settings:readSetting("annotations") or {}
    if annotations[item_index] then
        annotations[item_index].needs_pos_push = nil
        doc_settings:saveSetting("annotations", annotations)
        doc_settings:flush()
        return true
    end
    return false
end

-- Stamp remote ID onto local item after successful server upload
function Annotations:stampRemoteId(doc_path, item_index, remote_id)
    if not doc_path or not item_index or not remote_id then return false end
    local _, sidecar_file = self:getSidecarPaths(doc_path)
    if lfs.attributes(sidecar_file, "mode") ~= "file" then return false end

    local doc_settings = LuaSettings:open(sidecar_file)
    if not doc_settings then return false end

    local annotations = doc_settings:readSetting("annotations") or {}
    if annotations[item_index] then
        annotations[item_index].wallaflare_id = tonumber(remote_id)
        doc_settings:saveSetting("annotations", annotations)
        doc_settings:flush()
        return true
    end
    return false
end

-- On Book Open: Resolve xPointers for any highlight missing pos0 via crengine findText
function Annotations:resolveXPointers(ui_document, annotations_list)
    if not ui_document or type(annotations_list) ~= "table" then return false end
    local resolved_any = false

    for _, ann in ipairs(annotations_list) do
        local is_placeholder = (not ann.pos0 or ann.pos0 == "/1/4/2/1:0" or ann.pos0 == "")
        if is_placeholder and ann.text and ann.text ~= "" and ui_document.findAllText then
            local matched_hit = nil

            -- Fetch all occurrences of the quote with 5 context words
            local ok, hits = pcall(ui_document.findAllText, ui_document, ann.text, true, 5, 100, false, 0x00FF)
            if ok and type(hits) == "table" and #hits > 0 then
                if #hits == 1 then
                    -- Exactly one match in the book
                    matched_hit = hits[1]
                else
                    -- Multiple matches: score candidates against ann.prefix / ann.suffix
                    local norm_prefix = normalizeText(ann.prefix or "")
                    local norm_suffix = normalizeText(ann.suffix or "")
                    local best_score = -1
                    local best_hit = hits[1]

                    for _, hit in ipairs(hits) do
                        local score = 0
                        local hit_prev = normalizeText(hit.prev_text or "")
                        local hit_next = normalizeText(hit.next_text or "")

                        if norm_prefix ~= "" and hit_prev ~= "" then
                            -- Check if trailing words of prefix match preceding words of hit
                            local p_snip = norm_prefix:sub(-15)
                            if hit_prev:find(p_snip, 1, true) or norm_prefix:find(hit_prev, 1, true) then
                                score = score + 50
                            end
                        end

                        if norm_suffix ~= "" and hit_next ~= "" then
                            -- Check if leading words of suffix match following words of hit
                            local s_snip = norm_suffix:sub(1, 15)
                            if hit_next:find(s_snip, 1, true) or norm_suffix:find(hit_next, 1, true) then
                                score = score + 50
                            end
                        end

                        if score > best_score then
                            best_score = score
                            best_hit = hit
                        end
                    end
                    matched_hit = best_hit
                end
            end

            if matched_hit and matched_hit.start then
                ann.pos0 = matched_hit.start
                ann.pos1 = matched_hit["end"] or matched_hit.start
                ann.page = ann.pos0
                if ann.wallaflare_id then
                    ann.needs_pos_push = true
                end
                resolved_any = true
                logger.info("Wallaflare: Auto-resolved exact xPointer for highlight: " .. ann.text:sub(1, 30) .. " -> " .. tostring(ann.pos0) .. " to " .. tostring(ann.pos1))
            end
        end
    end

    return resolved_any
end

return Annotations
