# ==============================================================================
# REMOTE4REAL -- Zero-Friction Environment Bootstrapper & Launcher
# Engineered by alchemist4real
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Continue"

$PROJECT_ROOT = $PSScriptRoot
if (-not $PROJECT_ROOT) {
    $PROJECT_ROOT = (Get-Location).Path
}

function Write-Step {
    param([string]$Title)
    Write-Host ""
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host "  $Title" -ForegroundColor Cyan
    Write-Host "=================================================================" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Msg)
    Write-Host "  [OK] $Msg" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Msg)
    Write-Host "  [WARN] $Msg" -ForegroundColor Yellow
}

function Write-Info {
    param([string]$Msg)
    Write-Host "  [*] $Msg" -ForegroundColor White
}

function Write-Err {
    param([string]$Msg)
    Write-Host "  [FAIL] $Msg" -ForegroundColor Red
}

function Refresh-EnvPath {
    $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$machinePath;$userPath"
}

# ------------------------------------------------------------------------------
# BANNER
# ------------------------------------------------------------------------------
Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "                  REMOTE4REAL PC COMPANION SERVER                " -ForegroundColor Cyan
Write-Host "        ZERO-FRICTION ENVIRONMENT BOOTSTRAPPER & LAUNCHER        " -ForegroundColor Cyan
Write-Host "                  ENGINEERED BY ALCHEMIST4REAL                   " -ForegroundColor DarkGray
Write-Host "=================================================================" -ForegroundColor Cyan

# ------------------------------------------------------------------------------
# STEP 0: REPOSITORY UPDATE SYNCHRONIZATION
# ------------------------------------------------------------------------------
if (Test-Path (Join-Path $PROJECT_ROOT ".git")) {
    if (Get-Command "git" -ErrorAction SilentlyContinue) {
        Write-Step "STEP 0: Repository Update Synchronization"
        Write-Info "Checking for updates from remote repository..."
        try {
            $updateOutput = git -C "$PROJECT_ROOT" pull --rebase --autostash 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Repository is synchronized with latest remote release."
            } else {
                Write-Warn "Git pull notice: $updateOutput"
            }
        } catch {
            Write-Warn "Unable to check git updates offline."
        }
    }
}

# ------------------------------------------------------------------------------
# STEP 1: DETECT OR INSTALL PYTHON
# ------------------------------------------------------------------------------
Write-Step "STEP 1: Python Runtime Detection"

$PYTHON_CMD = $null

if (Get-Command "python" -ErrorAction SilentlyContinue) {
    $PYTHON_CMD = "python"
} elseif (Get-Command "py" -ErrorAction SilentlyContinue) {
    $PYTHON_CMD = "py"
} else {
    $candidates = @(
        "$env:LOCALAPPDATA\Programs\Python\Python314\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python310\python.exe",
        "C:\Python312\python.exe",
        "C:\Python311\python.exe",
        "C:\Program Files\Python312\python.exe",
        "C:\Program Files\Python311\python.exe"
    )
    foreach ($cand in $candidates) {
        if (Test-Path $cand) {
            $PYTHON_CMD = $cand
            break
        }
    }
}

if (-not $PYTHON_CMD) {
    Write-Warn "Python was not detected on this machine. Commencing automated installation..."
    
    if (Get-Command "winget" -ErrorAction SilentlyContinue) {
        Write-Info "Installing Python 3.11 via Windows Package Manager (winget)..."
        winget install Python.Python.3.11 --silent --accept-package-agreements --accept-source-agreements
        Refresh-EnvPath
        Start-Sleep -Seconds 3
    }
    
    if (Get-Command "python" -ErrorAction SilentlyContinue) {
        $PYTHON_CMD = "python"
    } else {
        Write-Info "Downloading official Python installer from python.org..."
        $installerUrl = "https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe"
        $tempInstaller = "$env:TEMP\python-3.11.9-installer.exe"
        
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $installerUrl -OutFile $tempInstaller -UseBasicParsing
        
        Write-Info "Running silent Python installation..."
        Start-Process -FilePath $tempInstaller -ArgumentList "/quiet InstallAllUsers=0 PrependPath=1 Include_pip=1 Include_tcltk=1" -Wait
        Remove-Item $tempInstaller -Force -ErrorAction SilentlyContinue
        Refresh-EnvPath
        Start-Sleep -Seconds 3
        
        if (Get-Command "python" -ErrorAction SilentlyContinue) {
            $PYTHON_CMD = "python"
        }
    }
}

if (-not $PYTHON_CMD) {
    Write-Err "Could not automatically provision Python runtime. Please install Python 3.10+ from python.org with Add to PATH enabled."
    Read-Host "Press Enter to exit"
    exit 1
}

$pyVer = (& $PYTHON_CMD --version 2>&1)
Write-Success "Python runtime ready: $pyVer ($PYTHON_CMD)"

# ------------------------------------------------------------------------------
# STEP 2: VIRTUAL ENVIRONMENT PROVISIONING
# ------------------------------------------------------------------------------
Write-Step "STEP 2: Isolated Virtual Environment (.venv)"

$VENV_DIR = Join-Path $PROJECT_ROOT ".venv"
$VENV_PY = Join-Path $VENV_DIR "Scripts\python.exe"
$VENV_PIP = Join-Path $VENV_DIR "Scripts\pip.exe"

if (-not (Test-Path $VENV_PY)) {
    Write-Info "Creating isolated virtual environment at .venv..."
    & $PYTHON_CMD -m venv $VENV_DIR
    if (-not (Test-Path $VENV_PY)) {
        Write-Warn "Using direct Python runtime."
        $VENV_PY = $PYTHON_CMD
        $VENV_PIP = "pip"
    } else {
        Write-Success "Virtual environment created successfully."
    }
} else {
    Write-Success "Virtual environment already initialized."
}

# ------------------------------------------------------------------------------
# STEP 3: DEPENDENCY AUDIT & INSTALLATION
# ------------------------------------------------------------------------------
Write-Step "STEP 3: Dependency Installation & Verification"

$REQ_FILE = Join-Path $PROJECT_ROOT "requirements.txt"
if (Test-Path $REQ_FILE) {
    Write-Info "Verifying core dependencies..."
    & $VENV_PY -m pip install -r $REQ_FILE --quiet
    Write-Success "Core packages verified (websockets, qrcode, pillow, psutil, pywin32, customtkinter)."
}

# Optional vgamepad
try {
    & $VENV_PY -c "import vgamepad" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "vgamepad driver is active."
    } else {
        Write-Info "Attempting to install optional vgamepad package..."
        & $VENV_PY -m pip install vgamepad --quiet 2>$null
        & $VENV_PY -c "import vgamepad" 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "vgamepad installed successfully."
        } else {
            Write-Info "Controller will use high-speed DirectX Keyboard/Mouse mode."
        }
    }
} catch {
    Write-Info "Gamepad using DirectX Keyboard/Mouse fallback."
}

# ------------------------------------------------------------------------------
# STEP 4: WINDOWS FIREWALL CONFIGURATION
# ------------------------------------------------------------------------------
Write-Step "STEP 4: Network & Firewall Permissions"

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if ($isAdmin) {
    Write-Info "Configuring Windows Defender Firewall inbound rules for ports 8080 & 8765..."
    try {
        $ruleHttp = Get-NetFirewallRule -DisplayName "REMOTE4REAL HTTP Server" -ErrorAction SilentlyContinue
        if (-not $ruleHttp) {
            New-NetFirewallRule -DisplayName "REMOTE4REAL HTTP Server" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow -Profile Any | Out-Null
            Write-Success "Firewall rule created for HTTP Port 8080."
        } else {
            Write-Success "Firewall rule for Port 8080 active."
        }

        $ruleWs = Get-NetFirewallRule -DisplayName "REMOTE4REAL WebSocket Server" -ErrorAction SilentlyContinue
        if (-not $ruleWs) {
            New-NetFirewallRule -DisplayName "REMOTE4REAL WebSocket Server" -Direction Inbound -LocalPort 8765 -Protocol TCP -Action Allow -Profile Any | Out-Null
            Write-Success "Firewall rule created for WebSocket Port 8765."
        } else {
            Write-Success "Firewall rule for Port 8765 active."
        }
    } catch {
        Write-Warn "Firewall rule configuration notice: $($_.Exception.Message)"
    }
} else {
    Write-Info "Non-admin mode: Windows will prompt for standard network access on first connection."
}

# ------------------------------------------------------------------------------
# STEP 5: RUN SYSTEM HEALTH DIAGNOSTIC
# ------------------------------------------------------------------------------
Write-Step "STEP 5: System Health Diagnostics"

$HEALTH_SCRIPT = Join-Path $PROJECT_ROOT "health_check.py"
if (Test-Path $HEALTH_SCRIPT) {
    & $VENV_PY $HEALTH_SCRIPT
}

# ------------------------------------------------------------------------------
# STEP 6: DESKTOP SHORTCUT CREATION
# ------------------------------------------------------------------------------
$DESKTOP_SHORTCUT = [System.IO.Path]::Combine([Environment]::GetFolderPath("Desktop"), "REMOTE4REAL.lnk")
if (-not (Test-Path $DESKTOP_SHORTCUT)) {
    try {
        $WshShell = New-Object -ComObject WScript.Shell
        $Shortcut = $WshShell.CreateShortcut($DESKTOP_SHORTCUT)
        $Shortcut.TargetPath = (Join-Path $PROJECT_ROOT "run.bat")
        $Shortcut.WorkingDirectory = $PROJECT_ROOT
        $Shortcut.Description = "REMOTE4REAL -- PC Companion Server"
        $iconPath = Join-Path $PROJECT_ROOT "app_icon.ico"
        if (Test-Path $iconPath) {
            $Shortcut.IconLocation = $iconPath
        }
        $Shortcut.Save()
        Write-Success "Desktop shortcut created: REMOTE4REAL"
    } catch {
        # Non-fatal
    }
}

# ------------------------------------------------------------------------------
# STEP 7: LAUNCH APPLICATION
# ------------------------------------------------------------------------------
Write-Step "STEP 6: Launching REMOTE4REAL Desktop"
Write-Info "Starting GUI and servers on port 8080 (HTTP) & 8765 (WebSocket)..."
Write-Host ""

$GUI_APP = Join-Path $PROJECT_ROOT "gui_app.py"
& $VENV_PY $GUI_APP
