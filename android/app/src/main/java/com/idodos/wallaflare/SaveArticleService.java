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
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

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

    private void performSave(Context appContext, String serverUrl, String token, String targetUrl) {
        long articleId = -1;
        String parsedTitle = "Article";
        boolean alreadyExists = false;
        String addedDateStr = "";
        String errorMsg = null;

        try {
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

            byte[] input = jsonPayload.toString().getBytes("utf-8");
            try (OutputStream os = conn.getOutputStream()) {
                os.write(input, 0, input.length);
            }

            int code = conn.getResponseCode();
            if (code >= 200 && code < 300) {
                StringBuilder response = new StringBuilder();
                try (BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream(), "utf-8"))) {
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
                        SharedPreferences sharedPrefs = appContext.getSharedPreferences("wallaflare_config", Context.MODE_PRIVATE);
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
