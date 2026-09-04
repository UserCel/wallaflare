--[[
    Wallaflare Settings & State Storage Manager for KOReader
--]]

local DataStorage = require("datastorage")
local LuaSettings = require("luasettings")
local logger = require("logger")
local lfs = require("libs/libkoreader-lfs")

local Store = {
    settings_file = DataStorage:getSettingsDir() .. "/wallaflare.lua",
    settings_obj = nil,
    settings = {
        server_url = "",
        auth_token = "",
        download_dir = nil,
        sync_filter = "unread", -- "unread", "all", "starred"
        auto_delete = true,    -- auto-delete files removed on server
        db_reset_action = "ask", -- "ask", "wipe", "keep"
        sync_on_startup = false,
        instance_id = nil,
        sync_rev = 0,
        outbox = {},
    }
}

local DEFAULT_SETTINGS = {
    server_url = "",
    auth_token = "",
    download_dir = nil,
    sync_filter = "unread", -- "unread", "all", "starred"
    auto_delete = true,    -- auto-delete files removed on server
    db_reset_action = "ask", -- "ask", "wipe", "keep"
    sync_on_startup = false,
    archive_finished = true,   -- Mark finished articles as read
    archive_read = false,      -- Mark 100% read articles as read (default: false)
    archive_abandoned = false, -- Mark articles on hold as read
    delete_instead_of_archive = false, -- Permanently delete on server instead of archiving
    instance_id = nil,
    sync_rev = 0,
    outbox = {},
    article_revs = {},
}

function Store:loadSettings()
    self.settings = {}
    for k, v in pairs(DEFAULT_SETTINGS) do
        self.settings[k] = v
    end

    local legacy_file = DataStorage:getSettingsDir() .. "/wallaflare_settings.lua"
    if lfs.attributes(legacy_file, "mode") == "file" and not lfs.attributes(self.settings_file, "mode") then
        local legacy_obj = LuaSettings:open(legacy_file)
        if legacy_obj and legacy_obj.data then
            for k, v in pairs(legacy_obj.data) do
                self.settings[k] = v
            end
        end
        pcall(os.remove, legacy_file)
        self:saveSettings()
    else
        self.settings_obj = LuaSettings:open(self.settings_file)
        if self.settings_obj and self.settings_obj.data then
            for k, v in pairs(self.settings_obj.data) do
                self.settings[k] = v
            end
        end
    end

    -- download_dir is left nil until chosen by user
    if type(self.settings.outbox) ~= "table" then
        self.settings.outbox = {}
    end
    if type(self.settings.article_revs) ~= "table" then
        self.settings.article_revs = {}
    end
    if type(self.settings.article_content_revs) ~= "table" then
        self.settings.article_content_revs = {}
    end
    return self.settings
end

function Store:saveSettings()
    if not self.settings_obj then
        self.settings_obj = LuaSettings:open(self.settings_file)
    end
    self.settings_obj.data = {}
    for k, v in pairs(self.settings) do
        if type(v) == "table" then
            local tbl_copy = {}
            for sub_k, sub_v in pairs(v) do
                tbl_copy[sub_k] = sub_v
            end
            self.settings_obj.data[k] = tbl_copy
        else
            self.settings_obj.data[k] = v
        end
    end
    self.settings_obj:flush()
    return true
end

function Store:getDownloadDir()
    local dir = self.settings.download_dir
    if not dir or dir == "" then
        return nil
    end
    if lfs.attributes(dir, "mode") ~= "directory" then
        local ffiUtil_ok, ffiUtil = pcall(require, "ffi/util")
        if ffiUtil_ok and ffiUtil and ffiUtil.makePath then
            pcall(ffiUtil.makePath, dir)
        else
            pcall(lfs.mkdir, dir)
        end
    end
    return dir
end

function Store:queueAction(action, article_id)
    if not article_id then return end
    table.insert(self.settings.outbox, {
        action = action,
        id = tonumber(article_id),
        timestamp = os.time(),
    })
    self:saveSettings()
end

function Store:getOutbox()
    return self.settings.outbox or {}
end

function Store:clearOutbox()
    self.settings.outbox = {}
    self:saveSettings()
end

function Store:resetSyncState()
    self.settings.instance_id = nil
    self.settings.sync_rev = 0
    self.settings.article_revs = {}
    self.settings.article_content_revs = {}
    self.settings.outbox = {}
    self:saveSettings()
end

return Store
