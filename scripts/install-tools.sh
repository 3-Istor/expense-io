#!/usr/bin/env bash
# Installe les outils de la moulinette qui ne sont pas des paquets npm, aux versions épinglées, empreinte vérifiée.
# Utilisé par la CI ET en local (l'agent lance la même moulinette avant chaque commit : mêmes outils, mêmes versions).
# Un binaire dont l'empreinte SHA-256 ne correspond pas n'est jamais installé (cas Trivy, mars 2026 : versions piégées
# republiées sous un nom légitime). Mettre à jour une version = changer la version ET l'empreinte (niveau de risque 3).
# Usage : scripts/install-tools.sh [répertoire cible, défaut /usr/local/bin]
set -euo pipefail

BIN_DIR="${1:-/usr/local/bin}"
mkdir -p "$BIN_DIR"
export PATH="$BIN_DIR:$PATH"
GITLEAKS_VERSION=8.28.0
GITLEAKS_SHA256=a65b5253807a68ac0cafa4414031fd740aeb55f54fb7e55f386acb52e6a840eb
OSV_SCANNER_VERSION=2.2.3
OSV_SCANNER_SHA256=8cdb138b36cdb9c99c455cafb32a1c83e1823448dc00e1c8ab9afe474a5e93f0
OASDIFF_VERSION=1.34.1
OASDIFF_SHA256=75775f65b0adebd26a8e013af51a799342dfdc6262d89efa9e3b7bdf89657d90
# Outils Python : versions exactes (PyPI).
PY_TOOLS=("semgrep==1.181.0" "hadolint-py==2.15.1.2" "zizmor==1.31.1" "schemathesis==4.32.0")

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

fetch() { # url fichier empreinte
  curl -sSfL -o "$2" "$1"
  echo "$3  $2" | sha256sum --check --status || { echo "Empreinte invalide pour $1 : installation refusée." >&2; exit 1; }
}

if [[ "$(gitleaks version 2>/dev/null || true)" != *"$GITLEAKS_VERSION"* ]]; then
  fetch "https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz" \
    "$tmp/gitleaks.tgz" "$GITLEAKS_SHA256"
  tar -xzf "$tmp/gitleaks.tgz" -C "$tmp" gitleaks && install -m 0755 "$tmp/gitleaks" "$BIN_DIR/gitleaks"
fi

if [[ "$(osv-scanner --version 2>/dev/null || true)" != *"$OSV_SCANNER_VERSION"* ]]; then
  fetch "https://github.com/google/osv-scanner/releases/download/v${OSV_SCANNER_VERSION}/osv-scanner_linux_amd64" \
    "$tmp/osv-scanner" "$OSV_SCANNER_SHA256"
  install -m 0755 "$tmp/osv-scanner" "$BIN_DIR/osv-scanner"
fi

if [[ "$(oasdiff --version 2>/dev/null || true)" != *"$OASDIFF_VERSION"* ]]; then
  fetch "https://github.com/oasdiff/oasdiff/releases/download/v${OASDIFF_VERSION}/oasdiff_${OASDIFF_VERSION}_linux_amd64.tar.gz" \
    "$tmp/oasdiff.tgz" "$OASDIFF_SHA256"
  tar -xzf "$tmp/oasdiff.tgz" -C "$tmp" oasdiff && install -m 0755 "$tmp/oasdiff" "$BIN_DIR/oasdiff"
fi

# Python système en lecture seule (NixOS : le pip du PATH vient du store Nix) : repli sur un venv propre au projet,
# mêmes versions épinglées, outils liés dans $BIN_DIR. Ne s'active que si les deux pip install échouent.
install_py_tools_in_venv() {
  local venv="${XDG_DATA_HOME:-$HOME/.local/share}/expense-io-tools"
  echo "pip système non inscriptible : installation des outils Python dans $venv" >&2
  python3 -m venv "$venv"
  "$venv/bin/pip" install --quiet --disable-pip-version-check "${PY_TOOLS[@]}"
  for tool in semgrep hadolint zizmor schemathesis; do ln -sf "$venv/bin/$tool" "$BIN_DIR/$tool"; done
}

pip install --quiet --disable-pip-version-check "${PY_TOOLS[@]}" 2>/dev/null \
  || pip install --quiet --disable-pip-version-check --break-system-packages "${PY_TOOLS[@]}" 2>/dev/null \
  || install_py_tools_in_venv

osv_version="$(osv-scanner --version)"
echo "gitleaks $(gitleaks version) · $(oasdiff --version) · ${osv_version%%$'\n'*} · semgrep $(semgrep --version) · $(hadolint --version) · $(zizmor --version) · $(schemathesis --version)"
