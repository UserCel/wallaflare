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
}
