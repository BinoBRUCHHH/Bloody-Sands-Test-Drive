#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="${SCRIPT_DIR}/.venv"

# Prefer stdlib venv, but fall back to virtualenv if python3-venv is missing.
if python3 -m venv "${VENV_DIR}" 2>/dev/null; then
  echo "Created virtual environment with python3 -m venv"
else
  echo "python3 -m venv unavailable; bootstrapping with virtualenv"
  python3 -m pip install --user virtualenv
  python3 -m virtualenv "${VENV_DIR}"
fi

source "${VENV_DIR}/bin/activate"

python -m pip install --upgrade pip

# CPU wheels are the safest default on cloud environments without NVIDIA drivers.
python -m pip install --index-url https://download.pytorch.org/whl/cpu torch torchvision
python -m pip install -r "${SCRIPT_DIR}/requirements.txt"

echo ""
echo "Image generation environment is ready."
echo "Activate with: source \"${VENV_DIR}/bin/activate\""
