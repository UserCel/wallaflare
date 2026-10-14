#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
KOREADER_DIR="$REPO_ROOT/scratch/koreader"
APP_DIR="$KOREADER_DIR/app"
DATA_DIR="$KOREADER_DIR/data"
PLUGIN_SRC="$REPO_ROOT/integrations/koreader/wallaflare.koplugin"
PLUGIN_DEST="$DATA_DIR/plugins/wallaflare.koplugin"

setup() {
    echo "📦 Configuring isolated KOReader test environment in scratch/koreader/..."
    mkdir -p "$KOREADER_DIR"
    mkdir -p "$DATA_DIR/plugins"

    # Symlink plugin directly into isolated KO_HOME
    echo "🔗 Symlinking wallaflare.koplugin into KO_HOME/plugins/..."
    rm -rf "$PLUGIN_DEST"
    ln -s "$PLUGIN_SRC" "$PLUGIN_DEST"

    # Download and extract AppImage if not present
    if [ ! -f "$APP_DIR/AppRun" ]; then
        echo "⬇️  Fetching latest KOReader Linux release..."
        DOWNLOAD_URL=$(curl -s -H "User-Agent: curl/8" https://api.github.com/repos/koreader/koreader/releases/latest \
            | grep -E "browser_download_url.*x86_64.*\.AppImage" \
            | head -n 1 \
            | cut -d '"' -f 4)

        if [ -z "$DOWNLOAD_URL" ]; then
            DOWNLOAD_URL="https://github.com/koreader/koreader/releases/download/v2026.07.1/koreader-v2026.07.1-x86_64.AppImage"
        fi

        echo "⬇️  Downloading: $DOWNLOAD_URL"
        APPIMAGE_TMP="$KOREADER_DIR/koreader.AppImage"
        curl -L -o "$APPIMAGE_TMP" "$DOWNLOAD_URL"
        chmod +x "$APPIMAGE_TMP"

        echo "📂 Extracting AppImage (eliminates FUSE dependency)..."
        cd "$KOREADER_DIR"
        "$APPIMAGE_TMP" --appimage-extract > /dev/null
        rm -rf "$APP_DIR"
        mv "$KOREADER_DIR/squashfs-root" "$APP_DIR"
        rm -f "$APPIMAGE_TMP"
        cd "$REPO_ROOT"
    fi

    echo "✅ KOReader test environment ready at $KOREADER_DIR"
    echo "💡 Run './scripts/koreader.sh run' or 'npm run koreader' to launch."
}

run() {
    if [ ! -f "$APP_DIR/AppRun" ] || [ ! -e "$PLUGIN_DEST" ]; then
        setup
    fi

    echo "🚀 Launching KOReader with isolated KO_HOME ($DATA_DIR)..."
    echo "   Plugin linked from: $PLUGIN_SRC"
    export KO_HOME="$DATA_DIR"
    exec "$APP_DIR/AppRun" "$@"
}

reset_data() {
    echo "🧹 Resetting isolated KOReader test data ($DATA_DIR)..."
    rm -rf "$DATA_DIR"
    mkdir -p "$DATA_DIR/plugins"
    ln -s "$PLUGIN_SRC" "$PLUGIN_DEST"
    echo "✅ Test environment reset to clean state."
}

case "$1" in
    setup)
        setup
        ;;
    run)
        shift
        run "$@"
        ;;
    reset)
        reset_data
        ;;
    *)
        if [ $# -eq 0 ]; then
            run
        else
            run "$@"
        fi
        ;;
esac
