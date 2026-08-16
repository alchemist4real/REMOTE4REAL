@echo off
setlocal
echo ===================================================
echo   REMOTE4REAL — Android ADB Fast Installer
echo ===================================================
echo.
echo Make sure your Android device is connected via USB with USB Debugging enabled.
echo.

where adb >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] ADB is not in your system PATH.
    echo Please install Android Platform Tools or copy the APK file directly to your phone.
    echo.
    pause
    exit /b 1
)

set "APK_PATH=%~1"
if "%APK_PATH%"=="" (
    set "APK_PATH=%~dp0..\..\REMOTE4REALMobile\android\app\build\outputs\apk\release\app-release.apk"
)

if not exist "%APK_PATH%" (
    echo [INFO] Looking for built APK...
    echo APK not found at default location: %APK_PATH%
    echo Please build the APK first or drag and drop your .apk file onto this .bat script.
    echo.
    pause
    exit /b 1
)

echo Installing %APK_PATH% onto connected Android device...
adb install -r "%APK_PATH%"
if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] REMOTE4REAL installed successfully on your Android device!
) else (
    echo.
    echo [ERROR] Installation failed. Please check your phone for any confirmation prompts.
)

echo.
pause
