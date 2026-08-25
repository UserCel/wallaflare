package com.idodos.wallaflare;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class ShareActivity extends Activity {
    private ProgressBar spinner;
    private ImageView statusIcon;
    private TextView titleView;
    private TextView subtitleView;
    private LinearLayout actionButtons;
    private Button btnOpenApp;
    private Button btnOpenArticle;
    private Runnable autoDismissRunnable;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_share);

        spinner = findViewById(R.id.shareSpinner);
        statusIcon = findViewById(R.id.shareStatusIcon);
        titleView = findViewById(R.id.shareTitle);
        subtitleView = findViewById(R.id.shareSubtitle);
        actionButtons = findViewById(R.id.shareActionButtons);
        btnOpenApp = findViewById(R.id.btnOpenApp);
        btnOpenArticle = findViewById(R.id.btnOpenArticle);

        View closeBtn = findViewById(R.id.shareCloseBtn);
        if (closeBtn != null) {
            closeBtn.setOnClickListener(v -> dismissDialog());
        }

        btnOpenApp.setOnClickListener(v -> {
            cancelAutoDismiss();
            Intent openApp = new Intent(ShareActivity.this, MainActivity.class);
            openApp.putExtra("refresh_library", true);
            openApp.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            startActivity(openApp);
            finish();
        });

        handleIncomingShare(getIntent());
    }

    private void dismissDialog() {
        cancelAutoDismiss();
        finish();
    }

    private void cancelAutoDismiss() {
        if (autoDismissRunnable != null) {
            mainHandler.removeCallbacks(autoDismissRunnable);
            autoDismissRunnable = null;
        }
    }

    private void scheduleAutoDismiss(long delayMillis) {
        cancelAutoDismiss();
        autoDismissRunnable = this::finish;
        mainHandler.postDelayed(autoDismissRunnable, delayMillis);
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
            subtitleView.setText("Tap to open Wallaflare and configure your server");
            actionButtons.setVisibility(View.VISIBLE);
            btnOpenArticle.setVisibility(View.GONE);
            btnOpenApp.setText("Configure Server");
            return;
        }

        final String finalServerUrl = serverUrl.endsWith("/") ? serverUrl.substring(0, serverUrl.length() - 1) : serverUrl;
        final String finalTargetUrl = targetUrl;
        final String finalToken = authToken;

        SaveArticleService.setCallback((articleId, parsedTitle, alreadyExists, addedDateStr, errorMsg) -> {
            mainHandler.post(() -> {
                if (isFinishing() || isDestroyed()) return;
                spinner.setVisibility(View.GONE);
                statusIcon.setVisibility(View.VISIBLE);

                if (errorMsg != null) {
                    titleView.setText("Save failed");
                    subtitleView.setText(errorMsg);
                    actionButtons.setVisibility(View.VISIBLE);
                    btnOpenArticle.setVisibility(View.GONE);
                    scheduleAutoDismiss(4000);
                    return;
                }

                if (alreadyExists) {
                    titleView.setText("Article Already in Library");
                    if (!addedDateStr.isEmpty()) {
                        subtitleView.setText("Saved on " + addedDateStr + ": " + parsedTitle);
                    } else {
                        subtitleView.setText(parsedTitle);
                    }
                } else {
                    titleView.setText("✓ Article Saved");
                    subtitleView.setText(parsedTitle);
                }

                // Show action buttons: Read Article & Open Wallaflare
                actionButtons.setVisibility(View.VISIBLE);
                if (articleId > 0) {
                    btnOpenArticle.setVisibility(View.VISIBLE);
                    btnOpenArticle.setOnClickListener(v -> {
                        cancelAutoDismiss();
                        Intent openArticle = new Intent(ShareActivity.this, MainActivity.class);
                        openArticle.putExtra("open_reader_id", articleId);
                        openArticle.putExtra("refresh_library", true);
                        openArticle.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                        startActivity(openArticle);
                        finish();
                    });
                } else {
                    btnOpenArticle.setVisibility(View.GONE);
                }

                scheduleAutoDismiss(alreadyExists ? 6000 : 4500);
            });
        });

        Intent serviceIntent = new Intent(this, SaveArticleService.class);
        serviceIntent.putExtra("server_url", finalServerUrl);
        serviceIntent.putExtra("token", finalToken);
        serviceIntent.putExtra("target_url", finalTargetUrl);
        startService(serviceIntent);
    }

    private String extractUrl(String text) {
        Pattern pattern = Pattern.compile("https?://[^\\s]+");
        Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            return matcher.group();
        }
        return null;
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        cancelAutoDismiss();
        SaveArticleService.setCallback(null);
    }
}
