@echo off
setlocal enabledelayedexpansion
title REMOTE4REAL - Zero-Friction Launcher
cd /d "%~dp0"

echo ========================================================
echo   REMOTE4REAL -- PC Companion Server
echo   Engineered by alchemist4real
echo ========================================================
echo.

:: 1. FAST PATH: Check if Virtual Environment Python exists and has packages
if exist "%~dp0.venv\Scripts\python.exe" (
    "%~dp0.venv\Scripts\python.exe" -c "import customtkinter, websockets, qrcode, PIL" >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        echo [*] Launching via isolated virtual environment...
        "%~dp0.venv\Scripts\python.exe" "%~dp0gui_app.py"
        if !ERRORLEVEL! EQU 0 exit /b 0
    ) else (
        echo [!] Virtual environment missing packages. Falling back to system Python...
    )
)

:: 2. SECONDARY PATH: Check if System Python exists and has packages
where python >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [*] Checking system Python runtime...
    python -c "import customtkinter, websockets, qrcode, PIL" >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        echo [*] Starting REMOTE4REAL Desktop...
        python "%~dp0gui_app.py"
        if !ERRORLEVEL! EQU 0 exit /b 0
    )
)

:: 3. SETUP BOOTSTRAP PATH: Run full setup if environment is missing
echo [*] Initializing environment & installing dependencies...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup_environment.ps1"

if %ERRORLEVEL% neq 0 (
    echo.
    echo ========================================================
    echo [ERROR] Launcher encountered an issue (Exit Code: %ERRORLEVEL%).
    echo ========================================================
    echo.
    pause
)
