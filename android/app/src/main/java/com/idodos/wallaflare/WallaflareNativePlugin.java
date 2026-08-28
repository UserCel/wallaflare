package com.idodos.wallaflare;

import android.content.Context;
import android.content.Intent;
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
