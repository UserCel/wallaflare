package com.idodos.wallaflare;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

public class SiteLoginActivity extends Activity {

    public interface SiteLoginCallback {
        void onLoginComplete(String domain, String siteName, String cookies);
    }

    private static volatile SiteLoginCallback activeCallback;

    public static void setCallback(SiteLoginCallback callback) {
        activeCallback = callback;
    }

    private WebView webView;
    private ProgressBar progressBar;
    private TextView titleView;
    private TextView subtitleView;
    private String initialUrl;
    private String targetDomain;
    private String siteName;

    private int dp(float value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private int getStatusBarHeight() {
        int result = 0;
        int resourceId = getResources().getIdentifier("status_bar_height", "dimen", "android");
        if (resourceId > 0) {
            result = getResources().getDimensionPixelSize(resourceId);
        }
        if (result <= 0) {
            result = dp(24);
        }
        return result;
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        initialUrl = getIntent().getStringExtra("url");
        targetDomain = getIntent().getStringExtra("domain");
        siteName = getIntent().getStringExtra("name");

        if (initialUrl == null || initialUrl.trim().isEmpty()) {
            if (targetDomain != null && !targetDomain.trim().isEmpty()) {
                initialUrl = "https://" + targetDomain.trim();
            } else {
                initialUrl = "https://medium.com";
            }
        }
        if (targetDomain == null || targetDomain.trim().isEmpty()) {
            try {
                Uri uri = Uri.parse(initialUrl);
                targetDomain = uri.getHost();
            } catch (Exception ignored) {
                targetDomain = "site.com";
            }
        }
        if (siteName == null || siteName.trim().isEmpty()) {
            siteName = targetDomain;
        }

        // Set Status Bar Background
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            getWindow().setStatusBarColor(Color.parseColor("#1e293b"));
        }

        // Root Container
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.parseColor("#0f172a"));
        root.setLayoutParams(new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        // 1. Status Bar Clearance Spacer
        View statusBarSpacer = new View(this);
        statusBarSpacer.setBackgroundColor(Color.parseColor("#1e293b"));
        statusBarSpacer.setLayoutParams(new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, getStatusBarHeight()));
        root.addView(statusBarSpacer);

        // 2. Action Toolbar (Fixed 56dp height, perfectly centered vertically)
        LinearLayout toolbar = new LinearLayout(this);
        toolbar.setOrientation(LinearLayout.HORIZONTAL);
        toolbar.setBackgroundColor(Color.parseColor("#1e293b"));
        toolbar.setGravity(Gravity.CENTER_VERTICAL);
        toolbar.setPadding(dp(16), dp(6), dp(16), dp(6));
        toolbar.setLayoutParams(new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(56)));

        // Left Titles
        LinearLayout textWrap = new LinearLayout(this);
        textWrap.setOrientation(LinearLayout.VERTICAL);
        textWrap.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout.LayoutParams textWrapParams = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
        textWrap.setLayoutParams(textWrapParams);

        titleView = new TextView(this);
        titleView.setText("Log In: " + siteName);
        titleView.setTextColor(Color.WHITE);
        titleView.setTextSize(15);
        titleView.setSingleLine(true);
        titleView.setEllipsize(android.text.TextUtils.TruncateAt.END);
        titleView.setTypeface(null, android.graphics.Typeface.BOLD);

        subtitleView = new TextView(this);
        subtitleView.setText(targetDomain);
        subtitleView.setTextColor(Color.parseColor("#94a3b8"));
        subtitleView.setTextSize(12);
        subtitleView.setSingleLine(true);
        subtitleView.setEllipsize(android.text.TextUtils.TruncateAt.END);

        textWrap.addView(titleView);
        textWrap.addView(subtitleView);
        toolbar.addView(textWrap);

        // Right Actions (Cancel & Save Login)
        LinearLayout btnWrap = new LinearLayout(this);
        btnWrap.setOrientation(LinearLayout.HORIZONTAL);
        btnWrap.setGravity(Gravity.CENTER_VERTICAL);
        btnWrap.setLayoutParams(new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        Button cancelBtn = new Button(this);
        cancelBtn.setText("Cancel");
        cancelBtn.setTextColor(Color.parseColor("#94a3b8"));
        cancelBtn.setTextSize(13);
        cancelBtn.setBackgroundColor(Color.TRANSPARENT);
        cancelBtn.setPadding(dp(12), dp(6), dp(12), dp(6));
        cancelBtn.setMinWidth(0);
        cancelBtn.setMinHeight(0);
        cancelBtn.setMinimumWidth(0);
        cancelBtn.setMinimumHeight(0);
        cancelBtn.setOnClickListener(v -> finish());
        btnWrap.addView(cancelBtn);

        Button saveBtn = new Button(this);
        saveBtn.setText("Save Login");
        saveBtn.setTextColor(Color.WHITE);
        saveBtn.setTextSize(13);
        saveBtn.setTypeface(null, android.graphics.Typeface.BOLD);
        saveBtn.setPadding(dp(14), dp(8), dp(14), dp(8));
        saveBtn.setMinWidth(0);
        saveBtn.setMinHeight(0);
        saveBtn.setMinimumWidth(0);
        saveBtn.setMinimumHeight(0);

        GradientDrawable saveBg = new GradientDrawable();
        saveBg.setColor(Color.parseColor("#3b82f6"));
        saveBg.setCornerRadius(dp(8));
        saveBtn.setBackground(saveBg);
        saveBtn.setOnClickListener(v -> saveAndFinish());
        btnWrap.addView(saveBtn);

        toolbar.addView(btnWrap);
        root.addView(toolbar);

        // 3. Loading Progress Bar
        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);
        progressBar.setLayoutParams(new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(3)));
        progressBar.getProgressDrawable().setColorFilter(Color.parseColor("#3b82f6"), android.graphics.PorterDuff.Mode.SRC_IN);
        root.addView(progressBar);

        // 4. WebView
        webView = new WebView(this);
        webView.setLayoutParams(new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1.0f));
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        settings.setUserAgentString("Mozilla/5.0 (Linux; Android 14; Mobile; rv:124.0) Gecko/124.0 Firefox/124.0 Wallaflare/1.0");

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (newProgress < 100) {
                    progressBar.setVisibility(View.VISIBLE);
                    progressBar.setProgress(newProgress);
                } else {
                    progressBar.setVisibility(View.GONE);
                }
            }

            @Override
            public void onReceivedTitle(WebView view, String title) {
                if (title != null && !title.isEmpty()) {
                    titleView.setText(title);
                }
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                view.loadUrl(url);
                return true;
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                try {
                    Uri uri = Uri.parse(url);
                    subtitleView.setText(uri.getHost());
                } catch (Exception ignored) {}
            }
        });

        root.addView(webView);
        setContentView(root);

        webView.loadUrl(initialUrl);
    }

    private void saveAndFinish() {
        String currentUrl = webView.getUrl();
        if (currentUrl == null || currentUrl.isEmpty()) currentUrl = initialUrl;

        String cookies = CookieManager.getInstance().getCookie(currentUrl);
        if (cookies == null || cookies.trim().isEmpty()) {
            Toast.makeText(this, "No cookies detected. Make sure you logged in first.", Toast.LENGTH_LONG).show();
            return;
        }

        try {
            Uri uri = Uri.parse(currentUrl);
            String domain = uri.getHost();
            if (domain == null || domain.isEmpty()) domain = targetDomain;

            String cleanDomain = domain.toLowerCase().replaceFirst("^www\\.", "");
            SharedPreferences prefs = getSharedPreferences("wallaflare_site_cookies", Context.MODE_PRIVATE);
            prefs.edit()
                .putString(cleanDomain, cookies)
                .putString(domain.toLowerCase(), cookies)
                .putBoolean(cleanDomain + "_enabled", true)
                .putBoolean(domain.toLowerCase() + "_enabled", true)
                .apply();

            SiteLoginCallback cb = activeCallback;
            if (cb != null) {
                cb.onLoginComplete(domain, siteName, cookies);
            }

            Toast.makeText(this, "✓ Logged-in session saved for " + domain, Toast.LENGTH_SHORT).show();
            finish();
        } catch (Exception e) {
            Toast.makeText(this, "Failed to save session: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (webView != null) {
            webView.destroy();
        }
    }
}
