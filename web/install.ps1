# ==============================================================================
# REMOTE4REAL — One-Command Remote Installer & Bootstrapper
# Engineered by alchemist4real
#
# Usage:
#   irm https://remote4real.vercel.app/install.ps1 | iex
#
# Custom path options:
#   $env:REMOTE4REAL_DIR = "D:\CustomFolder\REMOTE4REAL"; irm https://remote4real.vercel.app/install.ps1 | iex
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Continue"

function Write-R4Header {
    Write-Host ""
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host "                  REMOTE4REAL PC COMPANION                       " -ForegroundColor Cyan
    Write-Host "          ALL-IN-ONE ONE-COMMAND INSTALLER & LAUNCHER            " -ForegroundColor Cyan
    Write-Host "                  ENGINEERED BY ALCHEMIST4REAL                   " -ForegroundColor DarkGray
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Refresh-EnvPath {
    $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$machinePath;$userPath"
}

Write-R4Header

# ------------------------------------------------------------------------------
# INTERACTIVE / CUSTOM INSTALLATION PATH SELECTION
# ------------------------------------------------------------------------------
$DEFAULT_DIR = Join-Path $HOME "REMOTE4REAL"
$INSTALL_DIR = ""

if ($env:REMOTE4REAL_DIR) {
    $INSTALL_DIR = $env:REMOTE4REAL_DIR
} elseif ($env:INSTALL_DIR) {
    $INSTALL_DIR = $env:INSTALL_DIR
}

if (-not $INSTALL_DIR) {
    if ([Environment]::UserInteractive -and -not $env:NONINTERACTIVE) {
        Write-Host "  [?] Specify installation directory:" -ForegroundColor Yellow
        Write-Host "      Default: $DEFAULT_DIR" -ForegroundColor DarkGray
        $inputPath = Read-Host "      Press ENTER for default or type custom path"
        
        if ($inputPath -and $inputPath.Trim() -ne "") {
            $cleaned = $inputPath.Trim().Replace('"', '').Replace("'", "")
            $INSTALL_DIR = [System.IO.Path]::GetFullPath($cleaned)
        } else {
            $INSTALL_DIR = $DEFAULT_DIR
        }
    } else {
        $INSTALL_DIR = $DEFAULT_DIR
    }
}

$REPO_URL = "https://github.com/alchemist4real/REMOTE4REAL.git"
$ZIP_URL = "https://github.com/alchemist4real/REMOTE4REAL/archive/refs/heads/main.zip"

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  PHASE 1: Repository & Code Acquisition" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  [*] Target Destination: $INSTALL_DIR" -ForegroundColor White

$hasGit = [bool](Get-Command "git" -ErrorAction SilentlyContinue)

if (-not $hasGit) {
    if (Get-Command "winget" -ErrorAction SilentlyContinue) {
        Write-Host "  [*] Git not found. Installing Git via winget..." -ForegroundColor White
        winget install Git.Git --silent --accept-package-agreements --accept-source-agreements
        Refresh-EnvPath
        $hasGit = [bool](Get-Command "git" -ErrorAction SilentlyContinue)
    }
}

if ($hasGit) {
    if (Test-Path (Join-Path $INSTALL_DIR ".git")) {
        Write-Host "  [*] Existing installation detected at target path. Pulling latest updates..." -ForegroundColor Yellow
        git -C "$INSTALL_DIR" pull --rebase --autostash
        Write-Host "  [OK] Repository updated to latest release." -ForegroundColor Green
    } else {
        Write-Host "  [*] Cloning REMOTE4REAL repository to $INSTALL_DIR..." -ForegroundColor White
        if (-not (Test-Path $INSTALL_DIR)) {
            New-Item -ItemType Directory -Path $INSTALL_DIR -Force | Out-Null
        }
        git clone "$REPO_URL" "$INSTALL_DIR"
        Write-Host "  [OK] Repository cloned successfully." -ForegroundColor Green
    }
} else {
    # Fallback: Download ZIP directly from GitHub
    Write-Host "  [*] Downloading source archive directly from GitHub..." -ForegroundColor White
    $tempZip = "$env:TEMP\REMOTE4REAL-main.zip"
    $tempExtract = "$env:TEMP\REMOTE4REAL-extract"
    
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $ZIP_URL -OutFile $tempZip -UseBasicParsing
    
    Write-Host "  [*] Extracting source package..." -ForegroundColor White
    if (Test-Path $tempExtract) { Remove-Item $tempExtract -Recurse -Force }
    Expand-Archive -Path $tempZip -DestinationPath $tempExtract -Force
    
    if (-not (Test-Path $INSTALL_DIR)) {
        New-Item -ItemType Directory -Path $INSTALL_DIR -Force | Out-Null
    }
    
    $extractedRoot = Join-Path $tempExtract "REMOTE4REAL-main"
    if (Test-Path $extractedRoot) {
        Copy-Item -Path "$extractedRoot\*" -Destination $INSTALL_DIR -Recurse -Force
    }
    
    Remove-Item $tempZip -Force -ErrorAction SilentlyContinue
    Remove-Item $tempExtract -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  [OK] Source package installed." -ForegroundColor Green
}

# Delegate to local setup bootstrapper
$BOOTSTRAP_SCRIPT = Join-Path $INSTALL_DIR "setup_environment.ps1"
if (Test-Path $BOOTSTRAP_SCRIPT) {
    Write-Host ""
    Write-Host "  [*] Handing off to REMOTE4REAL Zero-Friction Bootstrapper..." -ForegroundColor White
    & powershell -ExecutionPolicy Bypass -File "$BOOTSTRAP_SCRIPT"
} else {
    Write-Host "  [FAIL] Bootstrapper not found at $BOOTSTRAP_SCRIPT" -ForegroundColor Red
}
