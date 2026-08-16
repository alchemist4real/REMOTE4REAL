"""
REMOTE4REAL — Desktop Package Builder
Builds standalone Windows executable and distribution installer package.
"""

import os
import sys
import shutil
import subprocess

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(BASE_DIR, "dist")
INSTALLER_DIR = os.path.join(BASE_DIR, "installers", "Desktop")

def build_desktop_app():
    print("=" * 60)
    print("Building REMOTE4REAL Desktop Windows Application...")
    print("=" * 60)

    # 1. Ensure icon exists
    icon_path = os.path.join(BASE_DIR, "app_icon.ico")
    if not os.path.exists(icon_path):
        from PIL import Image
        src_png = os.path.join(BASE_DIR, "static", "icon-512.png")
        if os.path.exists(src_png):
            img = Image.open(src_png)
            img.save(icon_path, format="ICO", sizes=[(16,16), (32,32), (48,48), (64,64), (128,128), (256,256)])
            print("Generated app_icon.ico")

    # 2. Run PyInstaller
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconfirm",
        "--onedir",
        "--windowed",
        "--name", "REMOTE4REAL",
        "--icon", icon_path,
        "--add-data", f"static{os.pathsep}static",
        "--add-data", f"app_icon.ico{os.pathsep}.",
        "--clean",
        os.path.join(BASE_DIR, "gui_app.py")
    ]

    print(f"Executing: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=BASE_DIR)
    if result.returncode != 0:
        print("PyInstaller build failed!")
        sys.exit(result.returncode)

    print("Desktop build completed successfully!")

    # 3. Create Desktop Installer Directory
    os.makedirs(INSTALLER_DIR, exist_ok=True)
    target_app_dir = os.path.join(INSTALLER_DIR, "REMOTE4REAL-Windows")
    if os.path.exists(target_app_dir):
        shutil.rmtree(target_app_dir)

    built_dir = os.path.join(DIST_DIR, "REMOTE4REAL")
    shutil.copytree(built_dir, target_app_dir)
    print(f"Copied built application to: {target_app_dir}")

    # 4. Generate Windows Desktop Shortcut Installer (.bat)
    installer_bat = os.path.join(INSTALLER_DIR, "install_desktop_shortcut.bat")
    with open(installer_bat, "w", encoding="utf-8") as f:
        f.write('''@echo off
setlocal
echo ===================================================
echo   REMOTE4REAL Desktop Setup - Creating Shortcuts
echo ===================================================
set "APP_DIR=%~dp0REMOTE4REAL-Windows"
set "EXE_PATH=%APP_DIR%\\REMOTE4REAL.exe"
set "ICON_PATH=%APP_DIR%\\app_icon.ico"

if not exist "%EXE_PATH%" (
    echo Error: REMOTE4REAL.exe not found in %APP_DIR%
    pause
    exit /b 1
)

:: Create Desktop Shortcut via VBScript
set "VBS_SCRIPT=%TEMP%\\CreateR4Shortcut.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%VBS_SCRIPT%"
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\\REMOTE4REAL.lnk" >> "%VBS_SCRIPT%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%VBS_SCRIPT%"
echo oLink.TargetPath = "%EXE_PATH%" >> "%VBS_SCRIPT%"
echo oLink.WorkingDirectory = "%APP_DIR%" >> "%VBS_SCRIPT%"
echo oLink.Description = "REMOTE4REAL - Wireless Controller Server" >> "%VBS_SCRIPT%"
echo oLink.IconLocation = "%ICON_PATH%" >> "%VBS_SCRIPT%"
echo oLink.Save >> "%VBS_SCRIPT%"

:: Create Start Menu Shortcut
echo sStartLink = oWS.SpecialFolders("Programs") ^& "\\REMOTE4REAL.lnk" >> "%VBS_SCRIPT%"
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
''')
    print(f"Generated shortcut installer: {installer_bat}")

    # 5. Generate Inno Setup Script for full Setup Wizard Installer
    inno_script = os.path.join(INSTALLER_DIR, "REMOTE4REAL_Setup.iss")
    with open(inno_script, "w", encoding="utf-8") as f:
        f.write('''.\n; Inno Setup Script for REMOTE4REAL
#define MyAppName "REMOTE4REAL"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "REMOTE4REAL Team"
#define MyAppURL "https://github.com/remote4real"
#define MyAppExeName "REMOTE4REAL.exe"

[Setup]
AppId={{9C5E558E-5A1D-4C91-9F1B-94E5B1A832A1}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\\{#MyAppName}
DisableProgramGroupPage=yes
OutputDir=.
OutputBaseFilename=REMOTE4REAL_Windows_Setup_v1.0.0
SetupIconFile=..\\..\\app_icon.ico
Compression=lzma
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "REMOTE4REAL-Windows\\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\\{#MyAppName}"; Filename: "{app}\\{#MyAppExeName}"
Name: "{autodesktop}\\{#MyAppName}"; Filename: "{app}\\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
''')
    print(f"Generated Inno Setup Script: {inno_script}")

    # 6. Create README for Desktop Package
    readme_path = os.path.join(INSTALLER_DIR, "README.md")
    with open(readme_path, "w", encoding="utf-8") as f:
        f.write('''# REMOTE4REAL — Desktop Windows Package

This directory contains the standalone Windows package and installers for **REMOTE4REAL Desktop Companion Server**.

---

## 📦 Contents:
1. `REMOTE4REAL-Windows/`: Standalone application directory with `REMOTE4REAL.exe` and all embedded assets.
2. `install_desktop_shortcut.bat`: One-click setup script that automatically creates Desktop and Start Menu shortcuts.
3. `REMOTE4REAL_Setup.iss`: Inno Setup compiler script to build a single-file Windows setup wizard installer (`.exe`).

---

## 🚀 Quick Start:
- Double-click `install_desktop_shortcut.bat` to create shortcuts and install on your PC.
- Or directly run `REMOTE4REAL-Windows\\REMOTE4REAL.exe`.
''')

if __name__ == "__main__":
    build_desktop_app()
