@echo off
setlocal
echo ===================================================
echo   REMOTE4REAL — iOS Application Package Builder
echo ===================================================
echo.
echo iOS packages (.ipa / Simulator builds) are compiled in the cloud via EAS:
echo [1] Build iOS Simulator Package (.tar.gz - for iOS Simulator on Mac)
echo [2] Build iOS Device Package (.ipa - for Sideloading / AltStore / TestFlight)
echo.

set /p choice="Enter choice (1 or 2): "

if "%choice%"=="1" (
    echo.
    echo Building iOS Simulator package via EAS...
    cd /d "%~dp0..\..\REMOTE4REALMobile"
    npx -y eas-cli build --platform ios --profile preview
    goto end
)

if "%choice%"=="2" (
    echo.
    echo Building iOS Device IPA package via EAS...
    cd /d "%~dp0..\..\REMOTE4REALMobile"
    npx -y eas-cli build --platform ios --profile preview-device
    goto end
)

echo Invalid choice.

:end
echo.
pause
