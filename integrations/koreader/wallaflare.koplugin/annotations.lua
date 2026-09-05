local Store = require("store")
--[[
    Wallaflare Annotation & Highlight Synchronization Engine for KOReader
    Directly interfaces with .sdr/metadata.epub.lua (annotations table)
--]]

local LuaSettings = require("luasettings")
local lfs = require("libs/libkoreader-lfs")
local logger = require("logger")

local Annotations = {}

function Annotations:readRawAnnotations(doc_settings)
    if not doc_settings then return {} end
    local anns = doc_settings:readSetting("annotations")
    if type(anns) == "table" and #anns > 0 then
        for _, a in ipairs(anns) do
            if type(a.page) == "number" and a.pos0 and type(a.pos0) == "string" and a.pos0 ~= "" then
                a.pageno = a.page
                a.page = a.pos0
            end
        end
        return anns
    end
    local paging = doc_settings:readSetting("annotations_paging")
    if type(paging) == "table" and #paging > 0 then
        for _, a in ipairs(paging) do
            if a.pos0 and type(a.pos0) == "string" and a.pos0 ~= "" then
                a.pageno = (type(a.page) == "number" and a.page) or a.pageno or 1
                a.page = a.pos0
            end
        end
        return paging
    end
    local rolling = doc_settings:readSetting("annotations_rolling")
    if type(rolling) == "table" and #rolling > 0 then
        return rolling
    end
    return (type(anns) == "table" and anns) or {}
end

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
function Annotations:syncInbound(doc_path, remote_annotations, content_rev_changed)
    if not doc_path or type(remote_annotations) ~= "table" then return false end

    local sidecar_dir, sidecar_file = self:getSidecarPaths(doc_path)
    if not self:ensureSidecarDir(sidecar_dir) then
        logger.warn("Wallaflare: Failed to create sidecar dir: " .. tostring(sidecar_dir))
        return false
    end

    local doc_settings = LuaSettings:open(sidecar_file)
    if not doc_settings then return false end

    local local_annotations = self:readRawAnnotations(doc_settings)
    if type(local_annotations) ~= "table" then local_annotations = {} end

    -- Index existing local annotations by wallaflare_id and unassigned local annotations
    local local_by_id = {}
    local unassigned_by_pos = {}
    local unassigned_by_quote = {}
    local claimed_locals = {}
    for i, ann in ipairs(local_annotations) do
        if ann.wallaflare_id then
            local_by_id[tonumber(ann.wallaflare_id)] = ann
        else
            if ann.pos0 and ann.pos0 ~= "/1/4/2/1:0" and ann.pos0 ~= "" then
                unassigned_by_pos[ann.pos0] = ann
            end
            if ann.text and ann.text ~= "" then
                local q = normalizeText(ann.text)
                if not unassigned_by_quote[q] then
                    unassigned_by_quote[q] = ann
                end
            end
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
        if remote_prefix and type(remote_prefix) == "string" then
            remote_prefix = remote_prefix:gsub("%s+", " "):gsub("^%s+", ""):gsub("%s+$", "")
        end
        local remote_suffix = remote_selector.suffix or remote_target.suffix or nil
        if remote_suffix and type(remote_suffix) == "string" then
            remote_suffix = remote_suffix:gsub("%s+", " "):gsub("^%s+", ""):gsub("%s+$", "")
        end
        local has_koreader_on_server = (remote_pos0 ~= nil and remote_pos0 ~= "")

        -- Match existing item:
        -- 1. Exact ID match (already bound to this remote annotation)
        -- 2. Unassigned local item matching exact pos0
        -- 3. Unassigned local item matching normalized quote (only if remote has no pos0)
        local existing = (remote_id and local_by_id[remote_id])
        if not existing then
            if remote_pos0 and unassigned_by_pos[remote_pos0] and not claimed_locals[unassigned_by_pos[remote_pos0]] then
                existing = unassigned_by_pos[remote_pos0]
            elseif not remote_pos0 and unassigned_by_quote[normalizeText(remote_quote)] and not claimed_locals[unassigned_by_quote[normalizeText(remote_quote)]] then
                existing = unassigned_by_quote[normalizeText(remote_quote)]
            end
        end

        if existing and not claimed_locals[existing] then
            claimed_locals[existing] = true
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
            local fallback_xp = "/1/4/2/1:0"
            if content_rev_changed then
                -- Article HTML changed: reset coordinates for re-anchoring in new DOM
                existing.pos0 = fallback_xp
                existing.pos1 = fallback_xp
                existing.page = fallback_xp
                existing.pageno = (type(remote_page) == "number" and remote_page) or tonumber(remote_page) or 1
                existing.prefix = remote_prefix
                existing.suffix = remote_suffix
                existing.has_server_pos = false
                existing.needs_pos_push = true
                has_changes = true
            elseif has_koreader_on_server then
                existing.pos0 = remote_pos0
                existing.pos1 = remote_pos1
                existing.page = (type(remote_page) == "string" and remote_page ~= "") and remote_page or remote_pos0
                existing.pageno = (type(remote_page) == "number" and remote_page) or tonumber(remote_page) or existing.pageno or 1
                existing.chapter = remote_chapter
                existing.has_server_pos = true
            elseif not existing.pos0 or existing.pos0 == "" or existing.pos0 == fallback_xp then
                existing.pos0 = fallback_xp
                existing.pos1 = fallback_xp
                existing.page = fallback_xp
                existing.pageno = 1
                existing.prefix = remote_prefix
                existing.suffix = remote_suffix
                existing.has_server_pos = false
            end
            table.insert(updated_list, existing)
        else
            -- Brand new annotation from server
            has_changes = true
            local fallback_xp = "/1/4/2/1:0"
            local use_server_pos = (has_koreader_on_server and not content_rev_changed)
            local parsed_pos0 = use_server_pos and remote_pos0 or fallback_xp
            local parsed_page = (use_server_pos and type(remote_page) == "string" and remote_page ~= "") and remote_page or parsed_pos0
            local parsed_pageno = (type(remote_page) == "number" and remote_page) or tonumber(remote_page) or 1
            local new_ann = {
                wallaflare_id = remote_id,
                text = remote_quote,
                note = remote_text,
                color = remote_color,
                drawer = "lighten",
                datetime = remote_datetime,
                pos0 = parsed_pos0,
                pos1 = use_server_pos and remote_pos1 or fallback_xp,
                page = parsed_page,
                pageno = parsed_pageno,
                chapter = remote_chapter,
                prefix = (not use_server_pos) and remote_prefix or nil,
                suffix = (not use_server_pos) and remote_suffix or nil,
                last_synced_note = remote_text,
                last_synced_color = remote_color,
                has_server_pos = use_server_pos,
                needs_pos_push = (not use_server_pos),
            }
            table.insert(updated_list, new_ann)
        end
    end

    -- Retain any strictly local, un-synced highlights (wallaflare_id == nil) that were not claimed in this batch
    for _, local_ann in ipairs(local_annotations) do
        if not local_ann.wallaflare_id and not claimed_locals[local_ann] and local_ann.text and local_ann.text ~= "" then
            table.insert(updated_list, local_ann)
        end
    end

    -- Count server-deleted annotations that were removed locally
    local deleted_count = 0
    for _, local_ann in ipairs(local_annotations) do
        if local_ann.wallaflare_id then
            local found = false
            for _, u in ipairs(updated_list) do
                if u.wallaflare_id == local_ann.wallaflare_id then
                    found = true
                    break
                end
            end
            if not found then
                deleted_count = deleted_count + 1
            end
        end
    end

    local was_modified = has_changes or #updated_list ~= #local_annotations or not lfs.attributes(sidecar_file, "mode")
    if was_modified then
        doc_settings:saveSetting("annotations", updated_list)
        doc_settings:delSetting("annotations_paging")
        doc_settings:delSetting("annotations_rolling")
        doc_settings:makeTrue("annotations_externally_modified")
        if not doc_settings:has("doc_props") then
            doc_settings:saveSetting("doc_props", {
                title = doc_path:match("/([^/]+)%.epub$") or "Article"
            })
        end
        local synced_ids = {}
        for _, u in ipairs(updated_list) do
            if u.wallaflare_id then
                synced_ids[tostring(u.wallaflare_id)] = true
            end
        end
        doc_settings:saveSetting("wallaflare_synced_ids", synced_ids)
        doc_settings:flush()
        local art_id = doc_path:match("/(%d+)[%._][^/]*%.epub$") or doc_path:match("^(%d+)[%._]")
        if art_id and Store and Store.setArticleAnnotationIds then
            Store:setArticleAnnotationIds(art_id, synced_ids)
        end
        logger.info("Wallaflare: Updated .sdr annotations for " .. tostring(doc_path) .. " (" .. #updated_list .. " items, " .. deleted_count .. " deleted)")
    else
        local synced_ids = {}
        for _, u in ipairs(updated_list) do
            if u.wallaflare_id then
                synced_ids[tostring(u.wallaflare_id)] = true
            end
        end
        doc_settings:saveSetting("wallaflare_synced_ids", synced_ids)
        doc_settings:flush()
        local art_id = doc_path:match("/(%d+)[%._][^/]*%.epub$") or doc_path:match("^(%d+)[%._]")
        if art_id and Store and Store.setArticleAnnotationIds then
            Store:setArticleAnnotationIds(art_id, synced_ids)
        end
    end

    return true, was_modified, #updated_list, deleted_count
end


-- Populate missing prefix and suffix context for annotations using crengine findAllText
function Annotations:populateMissingContext(ui_document, annotations_list)
    if not ui_document or not ui_document.findAllText or type(annotations_list) ~= "table" then return false end
    local updated_any = false

    for _, ann in ipairs(annotations_list) do
        local needs_context = (not ann.prefix or ann.prefix == "" or not ann.suffix or ann.suffix == "")
        if needs_context and ann.text and ann.text ~= "" and ann.pos0 and ann.pos0 ~= "/1/4/2/1:0" then
            local ok, hits = pcall(ui_document.findAllText, ui_document, ann.text, true, 5, 100, false, 0x00FF)
            if ok and type(hits) == "table" and #hits > 0 then
                for _, hit in ipairs(hits) do
                    if hit.start == ann.pos0 or hit["end"] == ann.pos1 then
                        if hit.prev_text and hit.prev_text ~= "" then
                            ann.prefix = hit.prev_text:gsub("%s+", " "):gsub("^%s+", ""):gsub("%s+$", "")
                            updated_any = true
                        end
                        if hit.next_text and hit.next_text ~= "" then
                            ann.suffix = hit.next_text:gsub("%s+", " "):gsub("^%s+", ""):gsub("%s+$", "")
                            updated_any = true
                        end
                        break
                    end
                end
            end
        end
    end
    return updated_any
end

-- Outbound Sync: Extract local annotations needing upload (wallaflare_id == nil), updates, and local deletions
function Annotations:getLocalUnsynced(doc_path, ui_document)
    if not doc_path then return {}, {}, {} end
    local _, sidecar_file = self:getSidecarPaths(doc_path)
    if lfs.attributes(sidecar_file, "mode") ~= "file" then return {}, {}, {} end

    local doc_settings = LuaSettings:open(sidecar_file)
    if not doc_settings then return {}, {}, {} end

    local annotations = self:readRawAnnotations(doc_settings)
    if ui_document and ui_document.findAllText then
        if self:populateMissingContext(ui_document, annotations) then
            doc_settings:saveSetting("annotations", annotations)
            doc_settings:flush()
        end
    end
    local unsynced = {}
    local resolved_updates = {}
    local present_ids = {}

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
                prefix = ann.prefix,
                suffix = ann.suffix,
            })
        elseif ann.wallaflare_id then
            local str_id = tostring(ann.wallaflare_id)
            present_ids[str_id] = true

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
                local client_time = (note_changed or color_changed) and (ann.datetime_updated or ann.datetime) or os.date("!%Y-%m-%dT%H:%M:%SZ")
                if client_time and not client_time:match("Z$") and not client_time:match("[%+%-]%d%d:?%d%d$") then
                    client_time = client_time:gsub(" ", "T") .. "Z"
                end
                client_time = client_time or os.date("!%Y-%m-%dT%H:%M:%SZ")
                table.insert(resolved_updates, {
                    index = i,
                    id = tonumber(ann.wallaflare_id),
                    quote = ann.text,
                    text = ann.note or "",
                    color = ann.color or "yellow",
                    updated_at = client_time,
                    user_modified = (note_changed or color_changed or ann.local_modified == true),
                    prefix = ann.prefix,
                    suffix = ann.suffix,
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

    local art_id = doc_path:match("/(%d+)[%._][^/]*%.epub$") or doc_path:match("^(%d+)[%._]")
    local store_synced = (art_id and Store and Store.getArticleAnnotationIds) and Store:getArticleAnnotationIds(art_id) or {}
    local doc_synced = doc_settings:readSetting("wallaflare_synced_ids") or {}

    local combined_synced = {}
    for k, _ in pairs(store_synced) do combined_synced[tostring(k)] = true end
    for k, _ in pairs(doc_synced) do combined_synced[tostring(k)] = true end

    local locally_deleted_ids = {}
    for id_str, _ in pairs(combined_synced) do
        if not present_ids[id_str] then
            table.insert(locally_deleted_ids, tonumber(id_str))
        end
    end

    if not doc_settings:has("wallaflare_synced_ids") and #locally_deleted_ids == 0 then
        doc_settings:saveSetting("wallaflare_synced_ids", present_ids)
        doc_settings:flush()
    end

    return unsynced, resolved_updates, locally_deleted_ids
end

function Annotations:stampSyncedEdit(doc_path, item_index, note, color)
    if not doc_path or not item_index then return false end
    local _, sidecar_file = self:getSidecarPaths(doc_path)
    if lfs.attributes(sidecar_file, "mode") ~= "file" then return false end

    local doc_settings = LuaSettings:open(sidecar_file)
    if not doc_settings then return false end

    local local_annotations = self:readRawAnnotations(doc_settings)
    if local_annotations[item_index] then
        local_annotations[item_index].last_synced_note = note
        local_annotations[item_index].last_synced_color = color
        local_annotations[item_index].has_server_pos = true
        local_annotations[item_index].needs_pos_push = nil
        doc_settings:saveSetting("annotations", local_annotations)
        doc_settings:delSetting("annotations_paging")
        doc_settings:delSetting("annotations_rolling")
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

    local local_annotations = self:readRawAnnotations(doc_settings)
    if local_annotations[item_index] then
        local_annotations[item_index].needs_pos_push = nil
        doc_settings:saveSetting("annotations", local_annotations)
        doc_settings:delSetting("annotations_paging")
        doc_settings:delSetting("annotations_rolling")
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

    local local_annotations = self:readRawAnnotations(doc_settings)
    if local_annotations[item_index] then
        local_annotations[item_index].wallaflare_id = tonumber(remote_id)
        doc_settings:saveSetting("annotations", local_annotations)
        doc_settings:delSetting("annotations_paging")
        doc_settings:delSetting("annotations_rolling")

        local synced_ids = doc_settings:readSetting("wallaflare_synced_ids") or {}
        synced_ids[tostring(remote_id)] = true
        doc_settings:saveSetting("wallaflare_synced_ids", synced_ids)
        doc_settings:flush()

        local art_id = doc_path:match("/(%d+)[%._][^/]*%.epub$") or doc_path:match("^(%d+)[%._]")
        if art_id and Store and Store.addArticleAnnotationId then
            Store:addArticleAnnotationId(art_id, remote_id)
        end
        return true
    end
    return false
end

function Annotations:removeLocalAnnotation(doc_path, remote_id, ui)
    if not doc_path or not remote_id then return false end
    local num_id = tonumber(remote_id)
    local str_id = tostring(remote_id)
    local _, sidecar_file = self:getSidecarPaths(doc_path)
    if lfs.attributes(sidecar_file, "mode") == "file" then
        local doc_settings = LuaSettings:open(sidecar_file)
        if doc_settings then
            local anns = self:readRawAnnotations(doc_settings)
            local filtered = {}
            for _, a in ipairs(anns) do
                if a.wallaflare_id ~= num_id and tostring(a.wallaflare_id) ~= str_id then
                    table.insert(filtered, a)
                end
            end
            doc_settings:saveSetting("annotations", filtered)
            doc_settings:delSetting("annotations_paging")
            doc_settings:delSetting("annotations_rolling")
            doc_settings:makeTrue("annotations_externally_modified")
            local synced_ids = doc_settings:readSetting("wallaflare_synced_ids") or {}
            synced_ids[str_id] = nil
            synced_ids[num_id] = nil
            doc_settings:saveSetting("wallaflare_synced_ids", synced_ids)
            doc_settings:flush()
        end
    end
    self:removeSyncedId(doc_path, remote_id, ui)
    return true
end

function Annotations:removeSyncedId(doc_path, remote_id, ui)
    if not doc_path or not remote_id then return false end
    local _, sidecar_file = self:getSidecarPaths(doc_path)
    if lfs.attributes(sidecar_file, "mode") == "file" then
        local doc_settings = LuaSettings:open(sidecar_file)
        if doc_settings then
            local synced_ids = doc_settings:readSetting("wallaflare_synced_ids") or {}
            synced_ids[tostring(remote_id)] = nil
            synced_ids[tonumber(remote_id)] = nil
            doc_settings:saveSetting("wallaflare_synced_ids", synced_ids)
            doc_settings:flush()
        end
    end

    if ui and ui.doc_settings and ui.doc_settings.readSetting then
        local synced_ids = ui.doc_settings:readSetting("wallaflare_synced_ids") or {}
        synced_ids[tostring(remote_id)] = nil
        synced_ids[tonumber(remote_id)] = nil
        ui.doc_settings:saveSetting("wallaflare_synced_ids", synced_ids)
        if ui.doc_settings.flush then
            ui.doc_settings:flush()
        end
    end

    local art_id = doc_path:match("/(%d+)[%._][^/]*%.epub$") or doc_path:match("^(%d+)[%._]")
    if art_id and Store and Store.removeArticleAnnotationId then
        Store:removeArticleAnnotationId(art_id, remote_id)
    end
    return true
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
                ann.prefix = nil
                ann.suffix = nil
                ann.page = ann.pos0
                if ui_document.getPageFromXPointer then
                    local pno = ui_document:getPageFromXPointer(ann.pos0)
                    if pno and type(pno) == "number" then
                        ann.pageno = pno
                    else
                        ann.pageno = 1
                    end
                else
                    ann.pageno = 1
                end
                if ann.wallaflare_id then
                    ann.needs_pos_push = true
                end
                resolved_any = true
                logger.info("Wallaflare: Auto-resolved exact xPointer for highlight: " .. ann.text:sub(1, 30) .. " -> " .. tostring(ann.pos0) .. " to " .. tostring(ann.pos1) .. " (page " .. tostring(ann.page) .. ")")
            end
        end
    end

    return resolved_any
end

return Annotations
