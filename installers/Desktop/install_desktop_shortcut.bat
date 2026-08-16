@echo off
setlocal
echo ===================================================
echo   REMOTE4REAL Desktop Setup - Creating Shortcuts
echo ===================================================
set "APP_DIR=%~dp0REMOTE4REAL-Windows"
set "EXE_PATH=%APP_DIR%\REMOTE4REAL.exe"
set "ICON_PATH=%APP_DIR%\app_icon.ico"

if not exist "%EXE_PATH%" (
    echo Error: REMOTE4REAL.exe not found in %APP_DIR%
    pause
    exit /b 1
)

:: Create Desktop Shortcut via VBScript
set "VBS_SCRIPT=%TEMP%\CreateR4Shortcut.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%VBS_SCRIPT%"
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\REMOTE4REAL.lnk" >> "%VBS_SCRIPT%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%VBS_SCRIPT%"
echo oLink.TargetPath = "%EXE_PATH%" >> "%VBS_SCRIPT%"
echo oLink.WorkingDirectory = "%APP_DIR%" >> "%VBS_SCRIPT%"
echo oLink.Description = "REMOTE4REAL - Wireless Controller Server" >> "%VBS_SCRIPT%"
echo oLink.IconLocation = "%ICON_PATH%" >> "%VBS_SCRIPT%"
echo oLink.Save >> "%VBS_SCRIPT%"

:: Create Start Menu Shortcut
echo sStartLink = oWS.SpecialFolders("Programs") ^& "\REMOTE4REAL.lnk" >> "%VBS_SCRIPT%"
echo Set oStartLink = oWS.CreateShortcut(sStartLink) >> "%VBS_SCRIPT%"
echo oStartLink.TargetPath = "%EXE_PATH%" >> "%VBS_SCRIPT%"
echo oStartLink.WorkingDirectory = "%APP_DIR%" >> "%VBS_SCRIPT%"
echo oStartLink.Description = "REMOTE4REAL - Wireless Controller Server" >> "%VBS_SCRIPT%"
echo oStartLink.IconLocation = "%ICON_PATH%" >> "%VBS_SCRIPT%"
echo oStartLink.Save >> "%VBS_SCRIPT%"

cscript //nologo "%VBS_SCRIPT%"
del "%VBS_SCRIPT%"

echo.
echo [SUCCESS] REMOTE4REAL shortcuts created on Desktop and Start Menu!
echo You can now launch REMOTE4REAL from your Desktop.
echo.
pause
