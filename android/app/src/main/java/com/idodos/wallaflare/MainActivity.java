package com.idodos.wallaflare;

import android.content.BroadcastReceiver;
import android.content.Context;
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
        public void saveServerConfig(String url, String token) {
            getSharedPreferences("wallaflare_config", MODE_PRIVATE)
                .edit()
                .putString("server_url", url)
                .putString("auth_token", token)
                .apply();
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
        // Register native plugin BEFORE super.onCreate so Capacitor picks it up
        registerPlugin(WallaflareNativePlugin.class);
        super.onCreate(savedInstanceState);

        // Attach JavascriptInterface AFTER bridge is ready (super.onCreate initialises bridge)
        if (getBridge() != null && getBridge().getWebView() != null) {
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
