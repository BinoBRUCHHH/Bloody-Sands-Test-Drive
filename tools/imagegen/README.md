# Local Image Generation Pipeline (PBBG Weapons)

This folder contains a local pipeline for generating dark-fantasy weapon item art
using text prompts plus optional style references.

## What this gives you

- Repeatable generation script for inventory-style weapon art
- Optional style transfer guidance from your existing reference images
- Prompt presets for your "Knotted Bullwhip"
- Output metadata JSON for reproducible re-runs

## 1) Setup

From repo root:

```bash
bash tools/imagegen/setup_imagegen.sh
```

Then activate:

```bash
source tools/imagegen/.venv/bin/activate
```

## 2) Add your reference images

Copy your two reference images into:

- `tools/imagegen/references/ref1.png`
- `tools/imagegen/references/ref2.png`

(Any filenames are fine; update command arguments accordingly.)

## 3) Generate the Knotted Bullwhip

From repo root (with venv active):

```bash
python tools/imagegen/generate_weapon.py \
  --prompt-file tools/imagegen/prompts/knotted_bullwhip.txt \
  --negative-prompt-file tools/imagegen/prompts/knotted_bullwhip_negative.txt \
  --references tools/imagegen/references/ref1.png tools/imagegen/references/ref2.png \
  --num-images 4 \
  --steps 32 \
  --guidance 8.0 \
  --width 768 \
  --height 512 \
  --ip-adapter-scale 0.72
```

Outputs are written to:

- `tools/imagegen/outputs/*.png`
- `tools/imagegen/outputs/*_metadata.json`

## Notes

- This environment is configured for CPU-only by default.
- First run will download model weights and can take a while.
- If style influence is too weak/strong, tune `--ip-adapter-scale`:
  - Lower: `0.45 - 0.60`
  - Stronger: `0.75 - 0.95`
- To run without reference conditioning:

```bash
python tools/imagegen/generate_weapon.py --disable-ip-adapter
```

## Quick parameter guide

- `--seed`: same seed = similar composition consistency
- `--steps`: more steps usually better detail but slower
- `--guidance`: prompt adherence; too high can overconstrain
- `--width/--height`: keep near 3:2 or 4:3 for inventory cards
