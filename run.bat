@echo off
title REMOTE4REAL - Zero-Friction Launcher
cd /d "%~dp0"

echo ========================================================
echo   REMOTE4REAL — Zero-Friction Launcher
echo   by alchemist4real
echo ========================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup_environment.ps1"

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Launcher encountered an issue (Exit code: %ERRORLEVEL%).
    pause
)
