#!/usr/bin/env bash
#
# symbiot agent installer (macOS / Linux).
#
# Downloads the compiled symbiot binary for one agent integration, verifies its
# SHA256 against the release's SHA256SUMS, installs it to ~/.local/bin, and wires
# the host's hook config to it (the binary's own `install-hook` subcommand).
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/awinogradov/symbiot/main/scripts/install.sh | bash -s -- --agent codex
#   ./install.sh --agent gemini --version v0.4.0
#
# Flags:
#   --agent <codex|copilot|gemini>   which integration to install (required)
#   --version <tag>                  release tag (default: latest)
#   --no-hook                        install the binary only; skip hook wiring
#   -h, --help                       show this help
#
# OpenCode is distributed as an npm package, not a binary — see the README.
set -eu

repo="awinogradov/symbiot"
install_dir="${SYMBIOT_INSTALL_DIR:-$HOME/.local/bin}"
agent=""
version="latest"
wire_hook=1

usage() {
  sed -n '3,20p' "$0" | sed 's/^# \{0,1\}//'
}

while [ $# -gt 0 ]; do
  case "$1" in
    --agent) agent="${2:-}"; shift 2 ;;
    --agent=*) agent="${1#--agent=}"; shift ;;
    --version) version="${2:-}"; shift 2 ;;
    --version=*) version="${1#--version=}"; shift ;;
    --no-hook) wire_hook=0; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "symbiot: unknown argument: $1" >&2; usage >&2; exit 1 ;;
  esac
done

case "$agent" in
  codex|copilot|gemini) ;;
  "") echo "symbiot: --agent is required (codex|copilot|gemini)" >&2; exit 1 ;;
  opencode|opencode-plugin)
    echo "symbiot: opencode ships as an npm package, not a binary." >&2
    echo "  See https://github.com/${repo}/tree/main/apps/opencode-plugin#installation" >&2
    exit 1 ;;
  *) echo "symbiot: unsupported agent '$agent' (codex|copilot|gemini)" >&2; exit 1 ;;
esac

case "$(uname -s)" in
  Darwin) os="darwin" ;;
  Linux) os="linux" ;;
  *) echo "symbiot: unsupported OS $(uname -s). On Windows use scripts/install.ps1." >&2; exit 1 ;;
esac

case "$(uname -m)" in
  x86_64|amd64) arch="x64" ;;
  arm64|aarch64) arch="arm64" ;;
  *) echo "symbiot: unsupported architecture $(uname -m)" >&2; exit 1 ;;
esac

triple="${os}-${arch}"

# Only these triples are compiled and published (matches claude-code's set).
case "$triple" in
  darwin-arm64 | darwin-x64 | linux-x64) ;;
  *)
    echo "symbiot: no published binary for $triple" >&2
    echo "  supported: darwin-arm64, darwin-x64, linux-x64 (Windows: install.ps1)" >&2
    exit 1
    ;;
esac

binary="symbiot-${agent}-${triple}"

if [ "$version" = "latest" ]; then
  version="$(curl -fsSL "https://api.github.com/repos/${repo}/releases/latest" \
    | grep '"tag_name"' | head -1 | cut -d'"' -f4)"
  [ -n "$version" ] || { echo "symbiot: could not resolve latest release tag" >&2; exit 1; }
else
  case "$version" in v*) ;; *) version="v$version" ;; esac
fi

base="https://github.com/${repo}/releases/download/${version}"
echo "symbiot: installing ${binary} (${version}) → ${install_dir}/symbiot-${agent}"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

curl -fsSL "${base}/${binary}" -o "${tmp}/${binary}"
curl -fsSL "${base}/SHA256SUMS" -o "${tmp}/SHA256SUMS"

expected="$(grep " ${binary}\$" "${tmp}/SHA256SUMS" | head -1 | cut -d' ' -f1)"
[ -n "$expected" ] || { echo "symbiot: ${binary} not found in SHA256SUMS" >&2; exit 1; }

if command -v sha256sum >/dev/null 2>&1; then
  actual="$(sha256sum "${tmp}/${binary}" | cut -d' ' -f1)"
else
  actual="$(shasum -a 256 "${tmp}/${binary}" | cut -d' ' -f1)"
fi

if [ "$expected" != "$actual" ]; then
  echo "symbiot: SHA256 mismatch (expected $expected, got $actual)" >&2
  exit 1
fi

mkdir -p "$install_dir"
dest="${install_dir}/symbiot-${agent}"
chmod +x "${tmp}/${binary}"
mv "${tmp}/${binary}" "$dest"
echo "symbiot: installed $dest"

case ":${PATH}:" in
  *":${install_dir}:"*) ;;
  *) echo "symbiot: add ${install_dir} to your PATH so the host can find symbiot-${agent}" >&2 ;;
esac

if [ "$wire_hook" -eq 1 ]; then
  "$dest" install-hook
fi
