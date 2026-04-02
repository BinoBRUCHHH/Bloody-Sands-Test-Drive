#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="${SCRIPT_DIR}/.venv"

python3 -m venv "${VENV_DIR}"
source "${VENV_DIR}/bin/activate"

python -m pip install --upgrade pip

# CPU wheels are the safest default on cloud environments without NVIDIA drivers.
python -m pip install --index-url https://download.pytorch.org/whl/cpu torch torchvision
python -m pip install -r "${SCRIPT_DIR}/requirements.txt"

echo ""
echo "Image generation environment is ready."
echo "Activate with: source \"${VENV_DIR}/bin/activate\""
