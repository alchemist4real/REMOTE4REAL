@echo off
title REMOTE4REAL - PC Companion Server
cd /d "%~dp0"
echo ========================================================
echo   Starting REMOTE4REAL PC Companion Server...
echo ========================================================
echo.
python gui_app.py
pause
