package com.idodos.wallaflare;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.util.Base64;
import androidx.core.content.FileProvider;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;

@CapacitorPlugin(name = "WallaflareNative")
public class WallaflareNativePlugin extends Plugin {

    @PluginMethod
    public void openSiteLogin(PluginCall call) {
        String url = call.getString("url", "");
        String domain = call.getString("domain", "");
        String name = call.getString("name", "");

        SiteLoginActivity.setCallback((retDomain, retName, cookies) -> {
            com.getcapacitor.JSObject ret = new com.getcapacitor.JSObject();
            ret.put("domain", retDomain);
            ret.put("name", retName);
            ret.put("cookies", cookies);
            call.resolve(ret);
        });

        Intent intent = new Intent(getActivity(), SiteLoginActivity.class);
        intent.putExtra("url", url);
        intent.putExtra("domain", domain);
        intent.putExtra("name", name);
        getActivity().startActivity(intent);
    }

    public static String getCookiesForUrl(Context context, String urlString) {
        if (urlString == null || urlString.trim().isEmpty() || context == null) return null;
        try {
            Uri uri = Uri.parse(urlString);
            String host = uri.getHost();
            if (host == null || host.trim().isEmpty()) return null;

            String cleanHost = host.toLowerCase().replaceFirst("^www\\.", "");
            SharedPreferences cookiePrefs = context.getSharedPreferences("wallaflare_site_cookies", Context.MODE_PRIVATE);

            // Check against all configured domains in the vault
            for (String key : cookiePrefs.getAll().keySet()) {
                if (key.endsWith("_enabled")) continue;
                String domain = key.toLowerCase().replaceFirst("^www\\.", "");
                if (cleanHost.equals(domain) || cleanHost.endsWith("." + domain)) {
                    boolean isEnabled = cookiePrefs.getBoolean(domain + "_enabled", true)
                        && cookiePrefs.getBoolean(key + "_enabled", true);
                    if (!isEnabled) {
                        // Explicitly disabled by user -> Anonymous scrape!
                        android.util.Log.d("WallaflareNative", "Site " + domain + " is DISABLED. Skipping cookies for: " + cleanHost);
                        return null;
                    }
                    String cookieVal = cookiePrefs.getString(key, "");
                    if (cookieVal != null && !cookieVal.trim().isEmpty()) {
                        android.util.Log.d("WallaflareNative", "Attached cookies for domain: " + domain);
                        return cookieVal.trim();
                    }
                }
            }
            return null;
        } catch (Exception ignored) {
            return null;
        }
    }

    @PluginMethod
    public void getDomainCookies(PluginCall call) {
        String urlString = call.getString("url", "");
        String cookies = getCookiesForUrl(getContext(), urlString);

        com.getcapacitor.JSObject ret = new com.getcapacitor.JSObject();
        ret.put("cookies", cookies != null ? cookies : "");
        call.resolve(ret);
    }

    public static void purgeCookiesForDomain(String domain) {
        if (domain == null || domain.trim().isEmpty()) return;
        try {
            android.webkit.CookieManager cm = android.webkit.CookieManager.getInstance();
            String clean = domain.toLowerCase()
                .replaceFirst("^https?://", "")
                .replaceFirst("/.*$", "")
                .replaceFirst("^www\\.", "");
            String[] candidates = {
                clean,
                "." + clean,
                "www." + clean,
                "https://" + clean,
                "https://www." + clean,
                "http://" + clean
            };
            for (String host : candidates) {
                String existing = cm.getCookie(host);
                if (existing == null || existing.isEmpty()) continue;
                for (String pair : existing.split(";")) {
                    String name = pair.split("=", 2)[0].trim();
                    if (name.isEmpty()) continue;
                    cm.setCookie(host, name + "=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/");
                    cm.setCookie(host, name + "=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; Domain=" + clean);
                    cm.setCookie(host, name + "=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; Domain=." + clean);
                }
            }
            cm.flush();
        } catch (Exception ignored) {}
    }

    @PluginMethod
    public void syncAllDomainCookies(PluginCall call) {
        try {
            com.getcapacitor.JSArray sitesArray = call.getArray("sites");
            SharedPreferences cookiePrefs = getContext().getSharedPreferences("wallaflare_site_cookies", Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = cookiePrefs.edit();
            editor.clear();

            android.webkit.CookieManager cm = android.webkit.CookieManager.getInstance();
            cm.removeAllCookies(null); // clean slate

            if (sitesArray != null) {
                for (int i = 0; i < sitesArray.length(); i++) {
                    try {
                        org.json.JSONObject site = sitesArray.getJSONObject(i);
                        if (site == null) continue;

                        String rawDomain = site.optString("domain", "");
                        if (rawDomain.isEmpty()) continue;

                        String cleanDomain = rawDomain.toLowerCase()
                                .replaceFirst("^https?://", "")
                                .replaceFirst("/.*$", "")
                                .replaceFirst("^www\\.", "");

                        String cookies = site.optString("cookie_value", "");
                        boolean enabled = site.optInt("is_enabled", 1) != 0;

                        // Vault storage
                        if (cookies != null && !cookies.isEmpty()) {
                            editor.putString(cleanDomain, cookies);
                            editor.putString(rawDomain.toLowerCase(), cookies);
                        }
                        editor.putBoolean(cleanDomain + "_enabled", enabled);
                        editor.putBoolean(rawDomain.toLowerCase() + "_enabled", enabled);

                        // Re-inject into WebView jar only when enabled
                        if (enabled && cookies != null && !cookies.trim().isEmpty()) {
                            String[] hosts = {
                                "https://" + cleanDomain,
                                "https://www." + cleanDomain,
                                "http://" + cleanDomain,
                                cleanDomain,
                                "." + cleanDomain
                            };
                            for (String host : hosts) {
                                for (String pair : cookies.split(";")) {
                                    String trimmed = pair.trim();
                                    if (trimmed.isEmpty()) continue;
                                    String lower = trimmed.toLowerCase();
                                    if (!lower.contains("path=")) trimmed += "; Path=/";
                                    if (!lower.contains("domain=")) trimmed += "; Domain=." + cleanDomain;
                                    cm.setCookie(host, trimmed);
                                }
                            }
                        }
                    } catch (Exception ignored) {}
                }
            }

            editor.commit(); // Synchronous write
            cm.flush();
        } catch (Exception ignored) {}
        call.resolve();
    }

    @PluginMethod
    public void saveDomainCookie(PluginCall call) {
        String domain = call.getString("domain", "");
        String cookies = call.getString("cookies", "");
        Boolean enabledObj = call.getBoolean("enabled");
        boolean enabled = enabledObj != null ? enabledObj : true;
        if (domain != null && !domain.isEmpty()) {
            String cleanDomain = domain.toLowerCase().replaceFirst("^https?://", "").replaceFirst("/.*$", "").replaceFirst("^www\\.", "");
            SharedPreferences cookiePrefs = getContext().getSharedPreferences("wallaflare_site_cookies", Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = cookiePrefs.edit();
            if (cookies != null && !cookies.isEmpty()) {
                editor.putString(cleanDomain, cookies);
                editor.putString(domain.toLowerCase(), cookies);
            }
            editor.putBoolean(cleanDomain + "_enabled", enabled);
            editor.putBoolean(domain.toLowerCase() + "_enabled", enabled);
            editor.apply();
        }
        call.resolve();
    }

    @PluginMethod
    public void setDomainEnabled(PluginCall call) {
        String domain = call.getString("domain", "");
        Boolean enabledObj = call.getBoolean("enabled");
        boolean enabled = enabledObj != null ? enabledObj : true;
        if (domain != null && !domain.isEmpty()) {
            String cleanDomain = domain.toLowerCase().replaceFirst("^https?://", "").replaceFirst("/.*$", "").replaceFirst("^www\\.", "");
            SharedPreferences cookiePrefs = getContext().getSharedPreferences("wallaflare_site_cookies", Context.MODE_PRIVATE);
            cookiePrefs.edit()
                .putBoolean(cleanDomain + "_enabled", enabled)
                .putBoolean(domain.toLowerCase() + "_enabled", enabled)
                .commit();

            if (!enabled) {
                purgeCookiesForDomain(cleanDomain);
            } else {
                String cookieVal = cookiePrefs.getString(cleanDomain, "");
                if (cookieVal != null && !cookieVal.trim().isEmpty()) {
                    try {
                        android.webkit.CookieManager cm = android.webkit.CookieManager.getInstance();
                        String url = "https://" + cleanDomain;
                        for (String pair : cookieVal.split(";")) {
                            String trimmed = pair.trim();
                            if (!trimmed.isEmpty()) {
                                cm.setCookie(url, trimmed + "; Path=/; Domain=." + cleanDomain);
                            }
                        }
                        cm.flush();
                    } catch (Exception ignored) {}
                }
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void clearAllSiteCookies(PluginCall call) {
        try {
            SharedPreferences cookiePrefs = getContext().getSharedPreferences("wallaflare_site_cookies", Context.MODE_PRIVATE);
            cookiePrefs.edit().clear().apply();
            android.webkit.CookieManager cm = android.webkit.CookieManager.getInstance();
            cm.removeAllCookies(null);
            cm.flush();
        } catch (Exception ignored) {}
        call.resolve();
    }

    @PluginMethod
    public void clearDomainCookies(PluginCall call) {
        String domain = call.getString("domain", "");
        if (domain != null && !domain.isEmpty()) {
            String cleanDomain = domain.toLowerCase().replaceFirst("^https?://", "").replaceFirst("/.*$", "").replaceFirst("^www\\.", "");
            SharedPreferences cookiePrefs = getContext().getSharedPreferences("wallaflare_site_cookies", Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = cookiePrefs.edit();
            
            for (String key : cookiePrefs.getAll().keySet()) {
                String k = key.toLowerCase().replaceFirst("^www\\.", "");
                if (k.equals(cleanDomain) || k.equals(cleanDomain + "_enabled") || k.endsWith("." + cleanDomain) || k.endsWith("." + cleanDomain + "_enabled")) {
                    editor.remove(key);
                }
            }
            editor.commit();

            purgeCookiesForDomain(domain);
        }
        call.resolve();
    }

    @PluginMethod
    public void setParserMode(PluginCall call) {
        String mode = call.getString("mode", "auto");
        getContext().getSharedPreferences("wallaflare_config", Context.MODE_PRIVATE)
            .edit()
            .putString("parser_mode", mode)
            .apply();
        call.resolve();
    }

    @PluginMethod
    public void saveServerConfig(PluginCall call) {
        String url = call.getString("url", "");
        String token = call.getString("token", "");
        getContext().getSharedPreferences("wallaflare_config", Context.MODE_PRIVATE)
            .edit()
            .putString("server_url", url)
            .putString("auth_token", token)
            .apply();
        call.resolve();
    }

    @PluginMethod
    public void shareEpub(PluginCall call) {
        String filename = call.getString("filename", "article.epub");
        String base64Data = call.getString("base64Data", "");
        try {
            byte[] fileBytes = Base64.decode(base64Data, Base64.DEFAULT);
            File cachePath = new File(getContext().getCacheDir(), "epubs");
            cachePath.mkdirs();
            File newFile = new File(cachePath, filename);
            try (FileOutputStream fos = new FileOutputStream(newFile)) {
                fos.write(fileBytes);
            }

            Uri contentUri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                newFile
            );

            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            shareIntent.setType("application/epub+zip");
            shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
            shareIntent.putExtra(Intent.EXTRA_TITLE, filename);
            shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            
            Intent chooser = Intent.createChooser(shareIntent, "Save or Open EPUB");
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(chooser);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to share EPUB: " + e.getMessage());
        }
    }

    @PluginMethod
    public void shareFile(PluginCall call) {
        String filename = call.getString("filename", "export.bin");
        String mimeType = call.getString("mimeType", "application/octet-stream");
        String base64Data = call.getString("base64Data", "");
        try {
            byte[] fileBytes = Base64.decode(base64Data, Base64.DEFAULT);
            File cachePath = new File(getContext().getCacheDir(), "exports");
            cachePath.mkdirs();
            File newFile = new File(cachePath, filename);
            try (FileOutputStream fos = new FileOutputStream(newFile)) {
                fos.write(fileBytes);
            }

            Uri contentUri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                newFile
            );

            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            shareIntent.setType(mimeType);
            shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
            shareIntent.putExtra(Intent.EXTRA_TITLE, filename);
            shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            
            Intent chooser = Intent.createChooser(shareIntent, "Share or Save " + filename);
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(chooser);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to share file: " + e.getMessage());
        }
    }

    @PluginMethod
    public void fetchUrl(PluginCall call) {
        String urlString = call.getString("url", "");
        if (urlString == null || urlString.trim().isEmpty()) {
            call.reject("URL cannot be empty");
            return;
        }

        new Thread(() -> {
            java.net.HttpURLConnection conn = null;
            try {
                java.net.URL url = new java.net.URL(urlString);
                conn = (java.net.HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(12000);
                conn.setReadTimeout(18000);
                conn.setInstanceFollowRedirects(true);
                conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 14; Mobile; rv:124.0) Gecko/124.0 Firefox/124.0 Wallaflare/1.0");
                conn.setRequestProperty("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
                conn.setRequestProperty("Accept-Language", "en-US,en;q=0.9");
                conn.setRequestProperty("Sec-Fetch-Dest", "document");
                conn.setRequestProperty("Sec-Fetch-Mode", "navigate");
                conn.setRequestProperty("Sec-Fetch-Site", "cross-site");

                try {
                    String cookies = getCookiesForUrl(getContext(), urlString);
                    if (cookies != null && !cookies.isEmpty()) {
                        conn.setRequestProperty("Cookie", cookies);
                    }
                } catch (Exception ignored) {}

                int status = conn.getResponseCode();
                int redirects = 0;
                while ((status == java.net.HttpURLConnection.HTTP_MOVED_TEMP || 
                        status == java.net.HttpURLConnection.HTTP_MOVED_PERM || 
                        status == 307 || status == 308) && redirects < 5) {
                    String newUrl = conn.getHeaderField("Location");
                    if (newUrl != null && !newUrl.isEmpty()) {
                        conn.disconnect();
                        url = new java.net.URL(url, newUrl);
                        conn = (java.net.HttpURLConnection) url.openConnection();
                        conn.setRequestMethod("GET");
                        conn.setConnectTimeout(12000);
                        conn.setReadTimeout(18000);
                        conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 14; Mobile; rv:124.0) Gecko/124.0 Firefox/124.0 Wallaflare/1.0");
                        conn.setRequestProperty("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
                        conn.setRequestProperty("Accept-Language", "en-US,en;q=0.9");
                        status = conn.getResponseCode();
                        redirects++;
                    } else {
                        break;
                    }
                }

                java.io.InputStream in = (status >= 200 && status < 400) ? conn.getInputStream() : conn.getErrorStream();
                if (in == null) {
                    call.reject("HTTP Error " + status + ": Empty response");
                    return;
                }

                String encoding = conn.getContentEncoding();
                if ("gzip".equalsIgnoreCase(encoding)) {
                    in = new java.util.zip.GZIPInputStream(in);
                } else if ("deflate".equalsIgnoreCase(encoding)) {
                    in = new java.util.zip.InflaterInputStream(in);
                }

                java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
                byte[] buffer = new byte[8192];
                int bytesRead;
                while ((bytesRead = in.read(buffer)) != -1) {
                    out.write(buffer, 0, bytesRead);
                }
                in.close();

                String html = new String(out.toByteArray(), java.nio.charset.StandardCharsets.UTF_8);

                com.getcapacitor.JSObject ret = new com.getcapacitor.JSObject();
                ret.put("status", status);
                ret.put("html", html);
                ret.put("finalUrl", conn.getURL().toString());
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Failed to fetch URL: " + e.getMessage(), e);
            } finally {
                if (conn != null) {
                    try { conn.disconnect(); } catch (Exception ignored) {}
                }
            }
        }).start();
    }

}
