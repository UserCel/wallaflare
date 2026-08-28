package com.idodos.wallaflare;

import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.IBinder;
import androidx.annotation.Nullable;
import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.zip.GZIPInputStream;
import java.util.zip.InflaterInputStream;

public class SaveArticleService extends Service {
    private static final ExecutorService executor = Executors.newCachedThreadPool();
    private final AtomicInteger activeTasks = new AtomicInteger(0);

    public interface SaveCallback {
        void onSaveResult(long articleId, String title, boolean alreadyExists, String addedDateStr, String errorMsg);
    }

    private static volatile SaveCallback activeCallback;

    public static void setCallback(SaveCallback callback) {
        activeCallback = callback;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            final String serverUrl = intent.getStringExtra("server_url");
            final String token = intent.getStringExtra("token");
            final String targetUrl = intent.getStringExtra("target_url");

            if (serverUrl != null && targetUrl != null) {
                activeTasks.incrementAndGet();
                executor.execute(() -> {
                    try {
                        performSave(getApplicationContext(), serverUrl, token, targetUrl);
                    } finally {
                        if (activeTasks.decrementAndGet() == 0) {
                            stopSelf();
                        }
                    }
                });
            }
        }
        return START_NOT_STICKY;
    }

    private String fetchHtmlOnDevice(String urlString) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(urlString);
            conn = (HttpURLConnection) url.openConnection();
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
            while ((status == HttpURLConnection.HTTP_MOVED_TEMP || 
                    status == HttpURLConnection.HTTP_MOVED_PERM || 
                    status == 307 || status == 308) && redirects < 5) {
                String newUrl = conn.getHeaderField("Location");
                if (newUrl != null && !newUrl.isEmpty()) {
                    conn.disconnect();
                    url = new URL(url, newUrl);
                    conn = (HttpURLConnection) url.openConnection();
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

            InputStream in = (status >= 200 && status < 400) ? conn.getInputStream() : conn.getErrorStream();
            if (in == null) return null;

            String encoding = conn.getContentEncoding();
            if ("gzip".equalsIgnoreCase(encoding)) {
                in = new GZIPInputStream(in);
            } else if ("deflate".equalsIgnoreCase(encoding)) {
                in = new InflaterInputStream(in);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            int bytesRead;
            while ((bytesRead = in.read(buffer)) != -1) {
                out.write(buffer, 0, bytesRead);
            }
            in.close();

            return new String(out.toByteArray(), StandardCharsets.UTF_8);
        } catch (Exception e) {
            return null;
        } finally {
            if (conn != null) {
                try { conn.disconnect(); } catch (Exception ignored) {}
            }
        }
    }

    private void performSave(Context appContext, String serverUrl, String token, String targetUrl) {
        long articleId = -1;
        String parsedTitle = "Article";
        boolean alreadyExists = false;
        String addedDateStr = "";
        String errorMsg = null;

        try {
            SharedPreferences sharedPrefs = appContext.getSharedPreferences("wallaflare_config", Context.MODE_PRIVATE);
            String parserMode = sharedPrefs.getString("parser_mode", "auto");

            String preFetchedHtml = null;
            if (!"server".equalsIgnoreCase(parserMode)) {
                // Fetch on device for "device" or "auto" modes
                preFetchedHtml = fetchHtmlOnDevice(targetUrl);
                if (preFetchedHtml == null && "device".equalsIgnoreCase(parserMode)) {
                    throw new Exception("Could not fetch webpage on device");
                }
            }

            URL url = new URL(serverUrl + "/api/entries.json");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
            conn.setRequestProperty("Accept", "application/json");
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(20000);
            conn.setDoOutput(true);

            if (token != null && !token.trim().isEmpty()) {
                conn.setRequestProperty("Authorization", "Bearer " + token.trim());
            }

            JSONObject jsonPayload = new JSONObject();
            jsonPayload.put("url", targetUrl);
            if (preFetchedHtml != null && !preFetchedHtml.trim().isEmpty()) {
                jsonPayload.put("html", preFetchedHtml);
            }

            byte[] input = jsonPayload.toString().getBytes(StandardCharsets.UTF_8);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(input, 0, input.length);
            }

            int code = conn.getResponseCode();
            if (code >= 200 && code < 300) {
                StringBuilder response = new StringBuilder();
                try (BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = br.readLine()) != null) {
                        response.append(line.trim());
                    }
                }

                JSONObject respObj = new JSONObject(response.toString());
                articleId = respObj.optLong("id", -1);
                parsedTitle = respObj.optString("title", "Article");
                alreadyExists = respObj.optBoolean("already_exists", false);
                addedDateStr = respObj.optString("added_date_str", "");

                // Buffer newly saved article in synchronized SharedPreferences queue for 0ms instant display in main app
                if (articleId > 0) {
                    synchronized (SaveArticleService.class) {
                        String existingQueueStr = sharedPrefs.getString("pending_saved_articles_json", "[]");
                        try {
                            JSONArray queue = new JSONArray(existingQueueStr);
                            JSONArray updatedQueue = new JSONArray();
                            for (int i = 0; i < queue.length(); i++) {
                                JSONObject item = queue.optJSONObject(i);
                                if (item != null && item.optLong("id") != articleId) {
                                    updatedQueue.put(item);
                                }
                            }
                            updatedQueue.put(respObj);
                            sharedPrefs.edit()
                                .putString("pending_saved_articles_json", updatedQueue.toString())
                                .apply();
                        } catch (Exception ignored) {
                            JSONArray fallback = new JSONArray();
                            fallback.put(respObj);
                            sharedPrefs.edit()
                                .putString("pending_saved_articles_json", fallback.toString())
                                .apply();
                        }
                        // Notify MainActivity that queue was updated
                        Intent notifyIntent = new Intent("com.idodos.wallaflare.ARTICLE_SAVED");
                        notifyIntent.setPackage(appContext.getPackageName());
                        appContext.sendBroadcast(notifyIntent);
                    }
                }
            } else {
                errorMsg = "HTTP " + code;
            }
        } catch (Exception e) {
            errorMsg = e.getMessage() != null ? e.getMessage() : "Network error";
        }

        SaveCallback cb = activeCallback;
        if (cb != null) {
            cb.onSaveResult(articleId, parsedTitle, alreadyExists, addedDateStr, errorMsg);
        }
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
