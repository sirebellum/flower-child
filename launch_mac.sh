#!/usr/bin/env bash
# ==============================================================================
# Sacred Geometry Studio Launcher (macOS)
# ==============================================================================

# Set terminal window / tab title
printf "\033]0;Sacred Geometry Studio Launcher\007" 2>/dev/null || true

# Change directory to the folder containing this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

PORT="${1:-8080}"

# Clear screen if running in an interactive terminal
clear 2>/dev/null || true

echo "=============================================================================="
echo "        SACRED GEOMETRY STUDIO -- LOCAL SERVER & BOOTSTRAPPER (macOS)"
echo "=============================================================================="
echo ""
echo "This bootstrapper will prepare and launch the Sacred Geometry application:"
echo ""
echo "  [1] Check for Python on your system (or in local './python-embed/' folder)."
echo "  [2] If Python is not found, download a portable standalone Python 3.12"
echo "      package directly into './python-embed/' (no admin privileges required)."
echo "  [3] Start a lightweight local HTTP server on port ${PORT}"
echo "      (essential for modern ES6 JavaScript modules to load without CORS errors)."
echo "  [4] Automatically open http://localhost:${PORT} in your default browser."
echo ""
echo "=============================================================================="
echo ""

# Interactive prompt
while true; do
    read -r -p "Do you want to proceed? [Y/N]: " PROCEED
    case "$PROCEED" in
        [yY]|[yY][eE][sS])
            break
            ;;
        [nN]|[nN][oO])
            echo ""
            echo "Launch cancelled by user. No changes were made."
            echo "Have a wonderful day."
            exit 0
            ;;
        *)
            echo "Invalid input. Please enter Y or N."
            ;;
    esac
done

echo ""
echo "[*] Checking Python environment..."

PY_CMD=""

# 1. Check local portable python
if [ -x "$SCRIPT_DIR/python-embed/bin/python3" ]; then
    echo "[OK] Found portable Python in $SCRIPT_DIR/python-embed/bin/python3"
    PY_CMD="$SCRIPT_DIR/python-embed/bin/python3"
elif [ -x "$SCRIPT_DIR/python-embed/bin/python" ]; then
    echo "[OK] Found portable Python in $SCRIPT_DIR/python-embed/bin/python"
    PY_CMD="$SCRIPT_DIR/python-embed/bin/python"
elif [ -x "$SCRIPT_DIR/python-embed/python3" ]; then
    echo "[OK] Found portable Python in $SCRIPT_DIR/python-embed/python3"
    PY_CMD="$SCRIPT_DIR/python-embed/python3"
elif [ -x "$SCRIPT_DIR/python-embed/python" ]; then
    echo "[OK] Found portable Python in $SCRIPT_DIR/python-embed/python"
    PY_CMD="$SCRIPT_DIR/python-embed/python"
fi

# 2. Check system python3
if [ -z "$PY_CMD" ] && command -v python3 >/dev/null 2>&1; then
    if python3 --version >/dev/null 2>&1; then
        PY_VER=$(python3 --version 2>&1)
        echo "[OK] Found system Python 3 ($PY_VER)"
        PY_CMD="python3"
    fi
fi

# 3. Check system python
if [ -z "$PY_CMD" ] && command -v python >/dev/null 2>&1; then
    if python --version >/dev/null 2>&1; then
        PY_VER=$(python --version 2>&1)
        echo "[OK] Found system Python ($PY_VER)"
        PY_CMD="python"
    fi
fi

# 4. If python not found, attempt portable standalone download
if [ -z "$PY_CMD" ]; then
    echo ""
    echo "[!] Python was not detected on your system."
    echo "[*] Downloading portable standalone Python 3.12 package..."

    ARCH=$(uname -m)
    DOWNLOAD_URL=""
    if [ "$ARCH" = "arm64" ] || [ "$ARCH" = "aarch64" ]; then
        DOWNLOAD_URL="https://github.com/astral-sh/python-build-standalone/releases/download/20241016/cpython-3.12.7+20241016-aarch64-apple-darwin-install_only.tar.gz"
    elif [ "$ARCH" = "x86_64" ]; then
        DOWNLOAD_URL="https://github.com/astral-sh/python-build-standalone/releases/download/20241016/cpython-3.12.7+20241016-x86_64-apple-darwin-install_only.tar.gz"
    fi

    DOWNLOAD_SUCCESS=0
    if [ -n "$DOWNLOAD_URL" ]; then
        DEST_DIR="$SCRIPT_DIR/python-embed"
        ARCHIVE_FILE="$SCRIPT_DIR/python-embed.tar.gz"
        mkdir -p "$DEST_DIR"

        echo "    Destination: $DEST_DIR"
        echo "    Architecture: $ARCH"

        if command -v curl >/dev/null 2>&1; then
            curl -fSL "$DOWNLOAD_URL" -o "$ARCHIVE_FILE" 2>/dev/null && DOWNLOAD_SUCCESS=1
        elif command -v wget >/dev/null 2>&1; then
            wget -q -O "$ARCHIVE_FILE" "$DOWNLOAD_URL" && DOWNLOAD_SUCCESS=1
        fi

        if [ $DOWNLOAD_SUCCESS -eq 1 ] && [ -f "$ARCHIVE_FILE" ]; then
            echo "    Extracting to local folder python-embed..."
            if tar -xzf "$ARCHIVE_FILE" -C "$DEST_DIR" --strip-components=1 2>/dev/null; then
                rm -f "$ARCHIVE_FILE"
                if [ -x "$DEST_DIR/bin/python3" ]; then
                    echo "[OK] Portable Python successfully extracted and verified!"
                    PY_CMD="$DEST_DIR/bin/python3"
                fi
            else
                rm -f "$ARCHIVE_FILE"
            fi
        fi
    fi

    if [ -z "$PY_CMD" ]; then
        echo ""
        echo "=============================================================================="
        echo "[ERROR] Python was not detected and portable package could not be downloaded."
        echo ""
        echo "Please install Python on macOS using one of the following methods:"
        echo "  - Homebrew:           brew install python3"
        echo "  - Xcode CLI Tools:    xcode-select --install"
        echo "  - Official Installer: https://www.python.org/downloads/macos/"
        echo "=============================================================================="
        echo ""
        read -r -p "Press [Enter] to exit..." _ 2>/dev/null || true
        exit 1
    fi
fi

# Launch phase
echo ""
echo "=============================================================================="
echo "[*] Launching Sacred Geometry Studio..."
echo "    Server URL: http://localhost:${PORT}"
echo "    Directory:  $SCRIPT_DIR"
echo ""
echo "  Press Ctrl+C in this console to stop the HTTP server at any time."
echo "=============================================================================="
echo ""

# Open default browser after a 1.2-second delay in background
(sleep 1.2 && open "http://localhost:${PORT}") >/dev/null 2>&1 &

# Launch Python HTTP server
if "$PY_CMD" -c "import http.server" >/dev/null 2>&1; then
    "$PY_CMD" -m http.server "${PORT}"
else
    "$PY_CMD" -m SimpleHTTPServer "${PORT}"
fi

SERVER_EXIT=$?
if [ $SERVER_EXIT -ne 0 ] && [ $SERVER_EXIT -ne 130 ] && [ $SERVER_EXIT -ne 137 ]; then
    echo ""
    echo "[NOTE] If port ${PORT} is already in use, stop other running servers or run on an alternate port."
    read -r -p "Press [Enter] to exit..." _ 2>/dev/null || true
fi
