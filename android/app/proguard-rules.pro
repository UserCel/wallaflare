# Wallaflare ProGuard / R8 Rules for Release Builds

# Keep annotations
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions
-keepattributes SourceFile,LineNumberTable

# Preserve JavascriptInterface methods for WebView
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Preserve Capacitor Plugin registrations & methods
-keep class com.getcapacitor.** { *; }
-keep class com.idodos.wallaflare.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod public *;
}

# Preserve Android View callbacks
-keepclassmembers class * {
    public void *(android.view.View);
}
