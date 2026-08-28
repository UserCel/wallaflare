package com.idodos.wallaflare;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.widget.Toast;
import androidx.core.content.FileProvider;
import com.getcapacitor.BridgeActivity;
import java.io.File;
import java.io.FileOutputStream;

public class MainActivity extends BridgeActivity {
    private long lastBackPressTime = 0;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private BroadcastReceiver articleSavedReceiver;

    class NativeInterface {
        @JavascriptInterface
        public void triggerHaptic(final String type) {
            mainHandler.post(new Runnable() {
                @Override
                public void run() {
                    try {
                        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                            android.os.Vibrator v = (android.os.Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                            if (v != null && v.hasVibrator()) {
                                if ("heavy".equalsIgnoreCase(type)) {
                                    v.vibrate(android.os.VibrationEffect.createOneShot(35, android.os.VibrationEffect.DEFAULT_AMPLITUDE));
                                } else if ("medium".equalsIgnoreCase(type)) {
                                    v.vibrate(android.os.VibrationEffect.createOneShot(20, android.os.VibrationEffect.DEFAULT_AMPLITUDE));
                                } else {
                                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                                        v.vibrate(android.os.VibrationEffect.createPredefined(android.os.VibrationEffect.EFFECT_CLICK));
                                    } else {
                                        v.vibrate(android.os.VibrationEffect.createOneShot(12, 180));
                                    }
                                }
                            }
                        } else {
                            android.os.Vibrator v = (android.os.Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                            if (v != null) v.vibrate(15);
                        }
                    } catch (Exception ignored) {}
                }
            });
        }
        @JavascriptInterface
        public String getAppVersion() {
            try {
                android.content.pm.PackageInfo pInfo = getPackageManager().getPackageInfo(getPackageName(), 0);
                return pInfo.versionName;
            } catch (Exception e) {
                return "1.0";
            }
        }

        @JavascriptInterface
        public int getAppVersionCode() {
            try {
                android.content.pm.PackageInfo pInfo = getPackageManager().getPackageInfo(getPackageName(), 0);
                return pInfo.versionCode;
            } catch (Exception e) {
                return 1;
            }
        }

        @JavascriptInterface
        public void saveServerConfig(String url, String token) {
            getSharedPreferences("wallaflare_config", MODE_PRIVATE)
                .edit()
                .putString("server_url", url != null ? url.trim() : "")
                .putString("auth_token", token != null ? token.trim() : "")
                .apply();
        }

        private void purgeCookiesForDomain(String domain) {
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

        @JavascriptInterface
        public void syncAllDomainCookies(String jsonString) {
            try {
                SharedPreferences cookiePrefs = getSharedPreferences("wallaflare_site_cookies", MODE_PRIVATE);
                SharedPreferences.Editor editor = cookiePrefs.edit();
                editor.clear();

                android.webkit.CookieManager cm = android.webkit.CookieManager.getInstance();
                cm.removeAllCookies(null); // clean slate

                if (jsonString != null && !jsonString.trim().isEmpty()) {
                    org.json.JSONArray sitesArray = new org.json.JSONArray(jsonString);
                    for (int i = 0; i < sitesArray.length(); i++) {
                        org.json.JSONObject site = sitesArray.optJSONObject(i);
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
                    }
                }

                editor.commit(); // Synchronous write
                cm.flush();
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public void clearAllSiteCookies() {
            try {
                SharedPreferences cookiePrefs = getSharedPreferences("wallaflare_site_cookies", MODE_PRIVATE);
                cookiePrefs.edit().clear().apply();
                android.webkit.CookieManager cm = android.webkit.CookieManager.getInstance();
                cm.removeAllCookies(null);
                cm.flush();
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public void setDomainEnabled(String domain, boolean enabled) {
            if (domain != null && !domain.isEmpty()) {
                String cleanDomain = domain.toLowerCase().replaceFirst("^https?://", "").replaceFirst("/.*$", "").replaceFirst("^www\\.", "");
                SharedPreferences cookiePrefs = getSharedPreferences("wallaflare_site_cookies", MODE_PRIVATE);
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
        }

        @JavascriptInterface
        public String getServerConfig() {
            android.content.SharedPreferences prefs = getSharedPreferences("wallaflare_config", MODE_PRIVATE);
            String url = prefs.getString("server_url", "");
            String token = prefs.getString("auth_token", "");
            return "{\"server_url\":\"" + url.replace("\"", "\\\"") + "\",\"auth_token\":\"" + token.replace("\"", "\\\"") + "\"}";
        }

        @JavascriptInterface
        public String pollPendingSavedArticles() {
            synchronized (MainActivity.class) {
                android.content.SharedPreferences prefs = getSharedPreferences("wallaflare_config", MODE_PRIVATE);
                String json = prefs.getString("pending_saved_articles_json", null);
                if (json != null && !json.trim().isEmpty() && !json.equals("[]")) {
                    prefs.edit().remove("pending_saved_articles_json").apply();
                    return json;
                }
                return "";
            }
        }

        @JavascriptInterface
        public int getStatusBarHeight() {
            // Returns status bar height in CSS pixels (dp) — synchronous, available immediately
            try {
                int resourceId = getResources().getIdentifier("status_bar_height", "dimen", "android");
                if (resourceId > 0) {
                    int px = getResources().getDimensionPixelSize(resourceId);
                    float density = getResources().getDisplayMetrics().density;
                    return Math.round(px / density);
                }
            } catch (Exception ignored) {}
            return 48; // safe fallback
        }

        @JavascriptInterface
        public void shareBase64File(final String filename, final String base64Data, final String mimeType) {
            mainHandler.post(new Runnable() {
                @Override
                public void run() {
                    try {
                        byte[] fileBytes = android.util.Base64.decode(base64Data, android.util.Base64.DEFAULT);
                        File cachePath = new File(getCacheDir(), "epubs");
                        cachePath.mkdirs();
                        File newFile = new File(cachePath, filename);
                        try (FileOutputStream fos = new FileOutputStream(newFile)) {
                            fos.write(fileBytes);
                        }

                        Uri contentUri = FileProvider.getUriForFile(
                            MainActivity.this,
                            getPackageName() + ".fileprovider",
                            newFile
                        );

                        Intent shareIntent = new Intent(Intent.ACTION_SEND);
                        shareIntent.setType(mimeType != null && !mimeType.isEmpty() ? mimeType : "application/epub+zip");
                        shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                        shareIntent.putExtra(Intent.EXTRA_TITLE, filename);
                        shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                        Intent chooser = Intent.createChooser(shareIntent, "Save or open EPUB");
                        startActivity(chooser);
                    } catch (Exception e) {
                        Toast.makeText(MainActivity.this, "EPUB share failed: " + e.getMessage(), Toast.LENGTH_LONG).show();
                        e.printStackTrace();
                    }
                }
            });
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 1. Enforce shortEdges cutout mode on the Window
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
            android.view.WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode = android.view.WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }

        // 2. Lock Window to edge-to-edge mode before super.onCreate
        try {
            androidx.core.view.WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
            android.view.View decorView = getWindow().getDecorView();
            decorView.setSystemUiVisibility(
                android.view.View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
                android.view.View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            );
            getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            getWindow().setStatusBarColor(android.graphics.Color.TRANSPARENT);
            getWindow().setNavigationBarColor(android.graphics.Color.parseColor("#0f172a"));
            androidx.core.view.WindowInsetsControllerCompat insetsController = 
                androidx.core.view.WindowCompat.getInsetsController(getWindow(), decorView);
            if (insetsController != null) {
                insetsController.setAppearanceLightStatusBars(false);
                insetsController.setAppearanceLightNavigationBars(false);
            }
        } catch (Exception ignored) {}

        registerPlugin(WallaflareNativePlugin.class);
        android.webkit.WebView.setWebContentsDebuggingEnabled(true);
        super.onCreate(savedInstanceState);

        // 3. Zero system insets for the content view so the native container does not double-offset
        try {
            final android.view.View content = findViewById(android.R.id.content);
            if (content != null) {
                content.setFitsSystemWindows(false);
                androidx.core.view.ViewCompat.setOnApplyWindowInsetsListener(content, (v, insets) -> {
                    return new androidx.core.view.WindowInsetsCompat.Builder(insets)
                            .setInsets(
                                androidx.core.view.WindowInsetsCompat.Type.systemBars() |
                                androidx.core.view.WindowInsetsCompat.Type.displayCutout(),
                                androidx.core.graphics.Insets.NONE
                            ).build();
                });
            }
        } catch (Exception ignored) {}

        // 4. Attach JavascriptInterface, disable fitsSystemWindows, and lock font scale
        if (getBridge() != null && getBridge().getWebView() != null) {
            try {
                getBridge().getWebView().setFitsSystemWindows(false);
                getBridge().getWebView().setOverScrollMode(android.view.View.OVER_SCROLL_IF_CONTENT_SCROLLS);
                getBridge().getWebView().getSettings().setTextZoom(100);
                getBridge().getWebView().setBackgroundColor(android.graphics.Color.parseColor("#0f172a"));
                getBridge().getWebView().setHapticFeedbackEnabled(false);
            } catch (Exception ignored) {}
            getBridge().getWebView().addJavascriptInterface(new NativeInterface(), "AndroidNative");
        }

        handleIncomingIntents(getIntent());
    }

    @Override
    public void onResume() {
        super.onResume();
        checkPendingSavedArticles();
        refreshLibrarySilently();

        // Register receiver so late-arriving saves still instant-prepend
        if (articleSavedReceiver == null) {
            articleSavedReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    checkPendingSavedArticles();
                }
            };
        }
        try {
            IntentFilter filter = new IntentFilter("com.idodos.wallaflare.ARTICLE_SAVED");
            registerReceiver(articleSavedReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } catch (Exception e) {
            // fallback for older APIs
            try {
                registerReceiver(articleSavedReceiver, new IntentFilter("com.idodos.wallaflare.ARTICLE_SAVED"));
            } catch (Exception ignored) {}
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        if (articleSavedReceiver != null) {
            try { unregisterReceiver(articleSavedReceiver); } catch (Exception ignored) {}
        }
    }

    private void checkPendingSavedArticles() {
        // Signal the JS side to poll via JavascriptInterface - avoids unsafe JSON embedding
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().post(new Runnable() {
                @Override
                public void run() {
                    getBridge().getWebView().evaluateJavascript(
                        "if(window.checkNativePendingSavedArticles)window.checkNativePendingSavedArticles();",
                        null
                    );
                }
            });
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIncomingIntents(intent);
    }

    private void refreshLibrarySilently() {
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().post(new Runnable() {
                @Override
                public void run() {
                    getBridge().getWebView().evaluateJavascript(
                        "if (window.refreshArticlesSilently) { window.refreshArticlesSilently(); }",
                        null
                    );
                }
            });
        }
    }

    private void handleIncomingIntents(Intent intent) {
        if (intent == null) return;

        if (intent.hasExtra("open_reader_id")) {
            final long articleId = intent.getLongExtra("open_reader_id", -1);
            if (articleId > 0) {
                openArticleInReader(articleId);
                return;
            }
        }

        handleSendIntent(intent);
    }

    private void openArticleInReader(final long articleId) {
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().postDelayed(new Runnable() {
                @Override
                public void run() {
                    getBridge().getWebView().evaluateJavascript(
                        "(function() { if (window.openReader) { window.openReader(" + articleId + "); } else { window.location.href = '/read/" + articleId + "'; } })()",
                        null
                    );
                }
            }, 350);
        }
    }

    @Override
    public void onBackPressed() {
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().evaluateJavascript(
                "(function() { if (window.handleAndroidBackButton) { return window.handleAndroidBackButton(); } return false; })()",
                new ValueCallback<String>() {
                    @Override
                    public void onReceiveValue(String value) {
                        if ("true".equals(value)) return;
                        long currentTime = System.currentTimeMillis();
                        if (currentTime - lastBackPressTime < 2000) {
                            finish();
                        } else {
                            lastBackPressTime = currentTime;
                            Toast.makeText(MainActivity.this, "Press back again to exit", Toast.LENGTH_SHORT).show();
                        }
                    }
                }
            );
        } else {
            super.onBackPressed();
        }
    }

    private void handleSendIntent(Intent intent) {
        if (intent != null
                && Intent.ACTION_SEND.equals(intent.getAction())
                && "text/plain".equals(intent.getType())) {
            String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (sharedText != null && !sharedText.trim().isEmpty()) {
                final String safeText = sharedText
                    .replace("\\", "\\\\")
                    .replace("'", "\\'")
                    .replace("\n", "\\n")
                    .replace("\r", "");
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().post(new Runnable() {
                        @Override
                        public void run() {
                            getBridge().getWebView().evaluateJavascript(
                                "window.handleAndroidSharedText && window.handleAndroidSharedText('" + safeText + "');",
                                null
                            );
                        }
                    });
                }
            }
        }
    }
}
