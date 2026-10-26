@echo off
setlocal enabledelayedexpansion
title Sacred Geometry Studio Launcher
cd /d "%~dp0"

cls
echo ==============================================================================
echo         SACRED GEOMETRY STUDIO -- LOCAL SERVER ^& BOOTSTRAPPER
echo ==============================================================================
echo.
echo This bootstrapper will prepare and launch the Sacred Geometry application:
echo.
echo   [1] Check for Python on your system or in local '.\python-embed\' folder.
echo   [2] If Python is not found, download the official Windows Embeddable
echo       Python 3.12 package directly into '.\python-embed\' using PowerShell
echo       (completely portable; will NOT modify system PATH or Windows registry).
echo   [3] Start a lightweight local HTTP server on port 8080
echo       (essential for modern ES6 JavaScript modules to load without CORS errors).
echo   [4] Automatically open http://localhost:8080 in your default browser.
echo.
echo ==============================================================================
echo.

:PROMPT
set "PROCEED="
set /p PROCEED="Do you want to proceed? [Y/N]: "
if /I "%PROCEED%"=="N" goto :CANCELLED
if /I not "%PROCEED%"=="Y" (
    echo Invalid input. Please enter Y or N.
    goto :PROMPT
)

echo.
echo [*] Checking Python environment...

set "PY_CMD="

if exist "%~dp0python-embed\python.exe" (
    echo [OK] Found portable Python in %~dp0python-embed\python.exe
    set "PY_CMD=%~dp0python-embed\python.exe"
    goto :PYTHON_READY
)

python --version >nul 2>&1
if !errorlevel! equ 0 (
    echo [OK] Found system Python
    set "PY_CMD=python"
    goto :PYTHON_READY
)

py --version >nul 2>&1
if !errorlevel! equ 0 (
    echo [OK] Found system Python Launcher (py)
    set "PY_CMD=py"
    goto :PYTHON_READY
)

echo.
echo [!] Python was not detected on your system.
echo [*] Downloading official portable Windows Embeddable Python 3.12...
echo     Destination: "%~dp0python-embed"
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ErrorActionPreference = 'Stop'; " ^
    "$ProgressPreference = 'SilentlyContinue'; " ^
    "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; " ^
    "$url = 'https://www.python.org/ftp/python/3.12.8/python-3.12.8-embed-amd64.zip'; " ^
    "$baseDir = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath('%~dp0'); " ^
    "$zipPath = Join-Path $baseDir 'python-embed.zip'; " ^
    "$destPath = Join-Path $baseDir 'python-embed'; " ^
    "try { " ^
    "    Write-Host 'Downloading Python 3.12.8 embeddable package...' -ForegroundColor Cyan; " ^
    "    Invoke-WebRequest -Uri $url -OutFile $zipPath; " ^
    "    Write-Host 'Extracting to local folder python-embed...' -ForegroundColor Cyan; " ^
    "    Expand-Archive -Path $zipPath -DestinationPath $destPath -Force; " ^
    "    Remove-Item -Path $zipPath -Force; " ^
    "    Write-Host 'Portable Python successfully extracted!' -ForegroundColor Green; " ^
    "} catch { " ^
    "    Write-Host ('[ERROR] ' + $_.Exception.Message) -ForegroundColor Red; " ^
    "    if (Test-Path $zipPath) { Remove-Item -Path $zipPath -Force; } " ^
    "    exit 1; " ^
    "}"

if exist "%~dp0python-embed\python.exe" (
    echo [OK] Portable Python verified successfully at "%~dp0python-embed\python.exe"
    set "PY_CMD=%~dp0python-embed\python.exe"
    goto :PYTHON_READY
) else (
    echo.
    echo ==============================================================================
    echo [ERROR] Failed to download or extract portable Python.
    echo Please install Python manually or check your internet connection.
    echo ==============================================================================
    echo.
    pause
    exit /b 1
)

:PYTHON_READY
echo.
echo ==============================================================================
echo [*] Launching Sacred Geometry Studio...
echo     Server URL: http://localhost:8080
echo     Directory:  "%~dp0"
echo.
echo   Press Ctrl+C in this console to stop the HTTP server at any time.
echo ==============================================================================
echo.

:: Open default browser after a 1.2-second delay in background
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Milliseconds 1200; Start-Process 'http://localhost:8080'"

:: Launch Python HTTP server with proper path quoting
"!PY_CMD!" -m http.server 8080

if !errorlevel! neq 0 (
    echo.
    echo [NOTE] If port 8080 is already in use, stop other running servers or run on an alternate port.
    pause
)

goto :EOF

:CANCELLED
echo.
echo Launch cancelled by user. No changes were made.
echo Have a wonderful day.
pause
exit /b 0