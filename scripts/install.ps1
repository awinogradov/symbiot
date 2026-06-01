<#
.SYNOPSIS
  symbiot agent installer (Windows).

.DESCRIPTION
  Downloads the compiled symbiot binary for one agent integration, verifies its
  SHA256 against the release's SHA256SUMS, installs it to %LOCALAPPDATA%\symbiot,
  adds that directory to the user PATH, and wires the host's hook config via the
  binary's own `install-hook` subcommand.

  OpenCode is distributed as an npm package, not a binary — see the README.

.PARAMETER Agent
  Which integration to install: codex, copilot, or gemini (required).

.PARAMETER Version
  Release tag to install (default: latest).

.PARAMETER NoHook
  Install the binary only; skip hook wiring.

.EXAMPLE
  irm https://raw.githubusercontent.com/awinogradov/symbiot/main/scripts/install.ps1 | iex
  # then: symbiot-install -Agent codex
#>
param(
  [Parameter(Mandatory = $true)][ValidateSet("codex", "copilot", "gemini")][string]$Agent,
  [string]$Version = "latest",
  [switch]$NoHook
)

$ErrorActionPreference = "Stop"
$repo = "awinogradov/symbiot"
$installDir = if ($env:SYMBIOT_INSTALL_DIR) { $env:SYMBIOT_INSTALL_DIR } else { "$env:LOCALAPPDATA\symbiot" }

if (-not [Environment]::Is64BitOperatingSystem) {
  throw "symbiot: 32-bit Windows is not supported"
}

$binary = "symbiot-$Agent-windows-x64.exe"

if ($Version -eq "latest") {
  $Version = (Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/latest").tag_name
  if (-not $Version) { throw "symbiot: could not resolve latest release tag" }
}
elseif ($Version -notlike "v*") {
  $Version = "v$Version"
}

$base = "https://github.com/$repo/releases/download/$Version"
Write-Host "symbiot: installing $binary ($Version) -> $installDir\symbiot-$Agent.exe"

$tmp = Join-Path ([System.IO.Path]::GetTempPath()) ([System.IO.Path]::GetRandomFileName())
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
try {
  $binPath = Join-Path $tmp $binary
  Invoke-WebRequest -Uri "$base/$binary" -OutFile $binPath -UseBasicParsing
  $sums = (Invoke-WebRequest -Uri "$base/SHA256SUMS" -UseBasicParsing).Content
  if ($sums -is [byte[]]) { $sums = [System.Text.Encoding]::UTF8.GetString($sums) }

  $expected = $null
  foreach ($line in $sums -split "`n") {
    if ($line -match "\s$([regex]::Escape($binary))\s*$") { $expected = ($line -split "\s+")[0].ToLower(); break }
  }
  if (-not $expected) { throw "symbiot: $binary not found in SHA256SUMS" }

  $actual = (Get-FileHash -Path $binPath -Algorithm SHA256).Hash.ToLower()
  if ($actual -ne $expected) { throw "symbiot: SHA256 mismatch (expected $expected, got $actual)" }

  New-Item -ItemType Directory -Force -Path $installDir | Out-Null
  $dest = Join-Path $installDir "symbiot-$Agent.exe"
  Move-Item -Force $binPath $dest
  Write-Host "symbiot: installed $dest"

  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  if ($userPath -notlike "*$installDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$userPath;$installDir", "User")
    Write-Host "symbiot: added $installDir to your user PATH (restart the shell to pick it up)"
  }

  if (-not $NoHook) { & $dest install-hook }
}
finally {
  Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}
