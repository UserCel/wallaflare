package com.idodos.wallaflare;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.TextView;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class ShareActivity extends Activity {
    private ProgressBar spinner;
    private ImageView statusIcon;
    private TextView titleView;
    private TextView subtitleView;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_share);

        spinner = findViewById(R.id.shareSpinner);
        statusIcon = findViewById(R.id.shareStatusIcon);
        titleView = findViewById(R.id.shareTitle);
        subtitleView = findViewById(R.id.shareSubtitle);

        findViewById(R.id.shareCard).setOnClickListener(v -> finish());

        handleIncomingShare(getIntent());
    }

    private void handleIncomingShare(Intent intent) {
        if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction()) || !"text/plain".equals(intent.getType())) {
            finish();
            return;
        }

        String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
        if (sharedText == null || sharedText.trim().isEmpty()) {
            finish();
            return;
        }

        String targetUrl = extractUrl(sharedText);
        if (targetUrl == null) {
            targetUrl = sharedText.trim();
        }

        subtitleView.setText(targetUrl);

        SharedPreferences prefs = getSharedPreferences("wallaflare_config", MODE_PRIVATE);
        String serverUrl = prefs.getString("server_url", "");
        String authToken = prefs.getString("auth_token", "");

        if (serverUrl == null || serverUrl.trim().isEmpty()) {
            spinner.setVisibility(View.GONE);
            statusIcon.setVisibility(View.VISIBLE);
            titleView.setText("Server Not Configured");
            subtitleView.setText("Tap to open Wallaflare and set up your server");
            findViewById(R.id.shareCard).setOnClickListener(v -> {
                Intent openApp = new Intent(ShareActivity.this, MainActivity.class);
                startActivity(openApp);
                finish();
            });
            return;
        }

        final String finalServerUrl = serverUrl.endsWith("/") ? serverUrl.substring(0, serverUrl.length() - 1) : serverUrl;
        final String finalTargetUrl = targetUrl;
        final String finalToken = authToken;

        executor.execute(() -> saveArticle(finalServerUrl, finalToken, finalTargetUrl));
    }

    private String extractUrl(String text) {
        Pattern pattern = Pattern.compile("https?://[^\\s]+");
        Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            return matcher.group();
        }
        return null;
    }

    private void saveArticle(String serverUrl, String token, String targetUrl) {
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
                String parsedTitle = respObj.optString("title", "Article Saved");

                mainHandler.post(() -> {
                    spinner.setVisibility(View.GONE);
                    statusIcon.setVisibility(View.VISIBLE);
                    titleView.setText("✓ " + parsedTitle);
                    subtitleView.setText("Saved to Wallaflare");

                    mainHandler.postDelayed(this::finish, 2200);
                });
            } else {
                mainHandler.post(() -> {
                    spinner.setVisibility(View.GONE);
                    statusIcon.setVisibility(View.VISIBLE);
                    titleView.setText("Failed to save (HTTP " + code + ")");
                    mainHandler.postDelayed(this::finish, 2800);
                });
            }
        } catch (Exception e) {
            mainHandler.post(() -> {
                spinner.setVisibility(View.GONE);
                statusIcon.setVisibility(View.VISIBLE);
                titleView.setText("Save failed");
                subtitleView.setText(e.getMessage());
                mainHandler.postDelayed(this::finish, 2800);
            });
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        executor.shutdown();
    }
}
