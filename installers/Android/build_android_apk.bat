@echo off
setlocal
echo ===================================================
echo   REMOTE4REAL — Android APK Installer Builder
echo ===================================================
echo.
echo Choose Build Method:
echo [1] Cloud Build via EAS (Recommended - Generates standalone .apk without local Android SDK)
echo [2] Local Build via Gradle (Requires Java JDK 17+ and Android SDK)
echo.

set /p choice="Enter choice (1 or 2): "

if "%choice%"=="1" (
    echo.
    echo Building standalone APK via EAS Cloud Build...
    echo (You will be prompted to log in to your free Expo account if not already logged in)
    cd /d "%~dp0..\..\REMOTE4REALMobile"
    npx -y eas-cli build --platform android --profile preview
    goto end
)

if "%choice%"=="2" (
    echo.
    echo Building APK locally via Gradle...
    cd /d "%~dp0..\..\REMOTE4REALMobile\android"
    call gradlew.bat assembleRelease
    echo.
    echo If successful, your APK is located at:
    echo REMOTE4REALMobile\android\app\build\outputs\apk\release\app-release.apk
    goto end
)

echo Invalid choice.

:end
echo.
pause
