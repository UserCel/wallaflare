--[[
    Wallaflare HTTP/HTTPS API Client for KOReader
--]]

local http = require("socket.http")
local https = require("ssl.https")
local ltn12 = require("ltn12")
local logger = require("logger")
local socket = require("socket")

-- Fallback JSON decoder / encoder
local JSON = nil
local ok_json, mod_json = pcall(require, "json")
if ok_json then
    JSON = mod_json
else
    local ok_rapid, mod_rapid = pcall(require, "rapidjson")
    if ok_rapid then
        JSON = mod_rapid
    end
end

local Api = {}

function Api.normalizeUrl(url)
    if not url or url == "" then return "" end
    url = url:gsub("^%s+", ""):gsub("%s+$", "")
    url = url:gsub("/+$", "")
    if not url:match("^https?://") then
        url = "https://" .. url
    end
    return url
end

function Api.jsonEncode(tbl)
    if JSON and JSON.encode then
        local ok, res = pcall(JSON.encode, tbl)
        if ok and res then return res end
    end
    -- Minimal fallback JSON serializer for simple tables
    if type(tbl) ~= "table" then
        if type(tbl) == "string" then
            return string.format("%q", tbl):gsub("\\\n", "\\n")
        else
            return tostring(tbl)
        end
    end
    local parts = {}
    local is_array = (#tbl > 0)
    if is_array then
        for _, v in ipairs(tbl) do
            table.insert(parts, Api.jsonEncode(v))
        end
        return "[" .. table.concat(parts, ",") .. "]"
    else
        for k, v in pairs(tbl) do
            table.insert(parts, string.format("%q", tostring(k)) .. ":" .. Api.jsonEncode(v))
        end
        return "{" .. table.concat(parts, ",") .. "}"
    end
end

function Api.request(opts)
    local url = opts.url
    local method = opts.method or "GET"
    local token = opts.token or ""
    local body = opts.body
    local timeout = opts.timeout or 20

    if not url or url == "" then
        return nil, "Missing URL"
    end

    local is_https = url:match("^https://") ~= nil
    local requester = is_https and https or http

    local response_chunks = {}
    local req_headers = {
        ["User-Agent"] = "KOReader-Wallaflare/1.0",
        ["Accept"] = "application/json",
    }

    if token and token ~= "" then
        req_headers["Authorization"] = "Bearer " .. token
    end

    local source = nil
    if body then
        req_headers["Content-Type"] = "application/json"
        req_headers["Content-Length"] = string.len(body)
        source = ltn12.source.string(body)
    end

    local request_params = {
        url = url,
        method = method,
        headers = req_headers,
        sink = ltn12.sink.table(response_chunks),
        source = source,
        timeout = timeout,
    }

    local ok, one_or_err, code, headers, status_line = pcall(requester.request, request_params)
    if not ok then
        logger.err("Wallaflare: Request exception: " .. tostring(one_or_err))
        return nil, "Network request failed: " .. tostring(one_or_err)
    end

    if not one_or_err or not code then
        return nil, "No response from server: " .. tostring(one_or_err or "connection failed")
    end

    local response_str = table.concat(response_chunks)
    local num_code = tonumber(code) or 0

    if num_code == 401 or num_code == 403 then
        return nil, "Authentication failed (HTTP " .. num_code .. ")"
    elseif num_code == 429 then
        return nil, "Rate limited by server (HTTP 429). Please wait."
    elseif num_code < 200 or num_code >= 300 then
        return nil, "Server returned HTTP " .. num_code .. ": " .. response_str:sub(1, 200)
    end

    if JSON and response_str and response_str ~= "" then
        local decode_ok, decoded = pcall(JSON.decode, response_str)
        if decode_ok and type(decoded) == "table" then
            return decoded, nil, num_code
        end
    end

    return response_str, nil, num_code
end

function Api.testConnection(server_url, auth_token)
    server_url = Api.normalizeUrl(server_url)
    if server_url == "" then
        return false, "Server URL is required"
    end
    local url = server_url .. "/api/sync.json?since_rev=0&perPage=1"
    local res, err = Api.request{
        url = url,
        token = auth_token,
        timeout = 10,
    }
    if not res then
        return false, err
    end
    return true, "Connection successful"
end

function Api.fetchSync(server_url, auth_token, since_rev, filter_type, page, per_page)
    server_url = Api.normalizeUrl(server_url)
    since_rev = tonumber(since_rev) or 0
    page = tonumber(page) or 1
    per_page = tonumber(per_page) or 50

    local url = server_url .. "/api/sync.json?page=" .. page .. "&perPage=" .. per_page
    if since_rev > 0 then
        url = url .. "&since_rev=" .. since_rev
    end
    if filter_type == "unread" then
        url = url .. "&archive=0"
    elseif filter_type == "starred" then
        url = url .. "&starred=1"
    end

    return Api.request{
        url = url,
        token = auth_token,
        timeout = 25,
    }
end

function Api.checkPluginUpdate(server_url, auth_token, current_version)
    server_url = Api.normalizeUrl(server_url)
    if server_url == "" then
        return false, nil, "Server URL is required"
    end
    local url = server_url .. "/api/app/koplugin/version.json"
    local res, err = Api.request{
        url = url,
        token = auth_token,
        timeout = 10,
    }
    if not res or type(res) ~= "table" or not res.version then
        return false, nil, err or "Invalid version response"
    end

    local is_newer = res.version ~= current_version
    return is_newer, res.version, res
end

function Api.fetchPluginFiles(server_url, auth_token)
    server_url = Api.normalizeUrl(server_url)
    local url = server_url .. "/api/app/koplugin/files.json"
    local res, err = Api.request{
        url = url,
        token = auth_token,
        timeout = 20,
    }
    if not res or type(res) ~= "table" or not res.files then
        return nil, err or "Failed to retrieve plugin files payload"
    end
    return res.files, res.version
end

function Api.downloadEpub(server_url, auth_token, entry_id, target_filepath)
    server_url = Api.normalizeUrl(server_url)
    local url = server_url .. "/api/entries/" .. entry_id .. "/export.epub"
    if auth_token and auth_token ~= "" then
        url = url .. "?token=" .. auth_token
    end
    local tmp_path = target_filepath .. ".tmp"

    local file, open_err = io.open(tmp_path, "w+b")
    if not file then
        return false, "Failed to create local file: " .. tostring(open_err)
    end

    local is_https = url:match("^https://") ~= nil
    local requester = is_https and https or http

    local req_headers = {
        ["User-Agent"] = "KOReader-Wallaflare/1.0",
    }
    if auth_token and auth_token ~= "" then
        req_headers["Authorization"] = "Bearer " .. auth_token
    end

    local ok, one_or_err, code, headers, status_line = pcall(requester.request, {
        url = url,
        method = "GET",
        headers = req_headers,
        sink = ltn12.sink.file(file),
        timeout = 30,
    })

    if io.type(file) == "file" then
        pcall(function() file:close() end)
    end

    local num_code = tonumber(code) or 0
    if not ok or num_code ~= 200 then
        os.remove(tmp_path)
        return false, "EPUB download failed (HTTP " .. tostring(code or one_or_err) .. ")"
    end

    -- Verify non-zero file size
    local check_file = io.open(tmp_path, "rb")
    if check_file then
        local size = check_file:seek("end")
        check_file:close()
        if size and size > 0 then
            os.remove(target_filepath) -- remove old version if present
            os.rename(tmp_path, target_filepath)
            return true, nil
        end
    end

    os.remove(tmp_path)
    return false, "Downloaded EPUB was 0 bytes"
end

function Api.sendPatch(server_url, auth_token, entry_id, patch_table)
    server_url = Api.normalizeUrl(server_url)
    local url = server_url .. "/api/entries/" .. entry_id .. ".json"
    local body_str = Api.jsonEncode(patch_table)

    return Api.request{
        url = url,
        method = "PATCH",
        token = auth_token,
        body = body_str,
        timeout = 15,
    }
end

-- Create Annotation on server (POST /api/annotations/:entryId)
function Api.createAnnotation(server_url, auth_token, entry_id, ann_data)
    server_url = Api.normalizeUrl(server_url)
    local url = server_url .. "/api/annotations/" .. entry_id
    local body_payload = {
        quote = ann_data.quote or "",
        text = ann_data.text or "",
        color = ann_data.color or "yellow",
        ranges = {},
    }
    if ann_data.pos0 or ann_data.pos1 or ann_data.page then
        body_payload.target = {
            koreader = {
                pos0 = ann_data.pos0,
                pos1 = ann_data.pos1,
                page = ann_data.page,
                chapter = ann_data.chapter,
            }
        }
    end
    local body_str = Api.jsonEncode(body_payload)

    return Api.request{
        url = url,
        method = "POST",
        token = auth_token,
        body = body_str,
        timeout = 15,
    }
end

-- Update Annotation note / color / target (PATCH /api/annotations/:id.json)
function Api.updateAnnotation(server_url, auth_token, annotation_id, update_data)
    server_url = Api.normalizeUrl(server_url)
    local url = server_url .. "/api/annotations/" .. annotation_id .. ".json"
    local body_str = Api.jsonEncode(update_data)

    return Api.request{
        url = url,
        method = "PATCH",
        token = auth_token,
        body = body_str,
        timeout = 15,
    }
end

-- Delete Annotation from server (DELETE /api/annotations/:id.json)

-- Delete Entry from server (DELETE /api/entries/:id.json)
function Api.deleteEntry(server_url, auth_token, entry_id)
    server_url = Api.normalizeUrl(server_url)
    local url = server_url .. "/api/entries/" .. tostring(entry_id) .. ".json"

    return Api.request{
        url = url,
        method = "DELETE",
        token = auth_token,
        timeout = 15,
    }
end

function Api.deleteAnnotation(server_url, auth_token, annotation_id)
    server_url = Api.normalizeUrl(server_url)
    local url = server_url .. "/api/annotations/" .. annotation_id .. ".json"

    return Api.request{
        url = url,
        method = "DELETE",
        token = auth_token,
        timeout = 15,
    }
end

return Api
