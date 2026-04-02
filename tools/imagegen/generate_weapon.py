#!/usr/bin/env python3
"""
Generate dark-fantasy item illustrations with optional style references.

This script uses Stable Diffusion v1.5 and optional IP-Adapter conditioning
from one or more reference images to keep a cohesive art style.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
from pathlib import Path
from typing import Optional

import torch
from diffusers import DPMSolverMultistepScheduler, StableDiffusionPipeline
from PIL import Image


DEFAULT_PROMPT = (
    'Single item illustration for a dark fantasy PBBG inventory icon: "Knotted '
    "Bullwhip.\" A long, heavy bullwhip made of braided cowhide, visibly old, "
    "cracked, dry, and weathered. Several frayed sections are crudely reinforced "
    "with tight knots and wrapped leather twine. Fibers sticking out, uneven "
    "thickness, hand-repaired survival look. The whip is coiled in a loose "
    "S-curve/arc so the full shape is readable. Hand-drawn ink linework with "
    "muted watercolor shading, gritty texture, worn materials, subtle stains and "
    "age marks. Stylized like concept art item sheets, similar to rough medieval "
    "weapon sketches. Isolated object, no character, no hands, no scene, clean "
    "light parchment/gray background, centered composition, high detail."
)

DEFAULT_NEGATIVE = (
    "photorealism, 3D render, glossy plastic, bright saturated colors, modern "
    "materials, text, logo, extra objects, character, hands, environment "
    "background, dramatic lighting, heavy shadows"
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate a weapon image.")
    parser.add_argument("--prompt", type=str, default=DEFAULT_PROMPT)
    parser.add_argument("--negative-prompt", type=str, default=DEFAULT_NEGATIVE)
    parser.add_argument("--prompt-file", type=Path, help="Text file with prompt.")
    parser.add_argument(
        "--negative-prompt-file", type=Path, help="Text file with negative prompt."
    )
    parser.add_argument(
        "--references",
        type=Path,
        nargs="*",
        default=[],
        help="One or more reference image paths.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("tools/imagegen/outputs"),
        help="Directory to write generated images.",
    )
    parser.add_argument("--seed", type=int, default=1337)
    parser.add_argument("--num-images", type=int, default=4)
    parser.add_argument("--steps", type=int, default=30)
    parser.add_argument("--guidance", type=float, default=8.0)
    parser.add_argument("--width", type=int, default=768)
    parser.add_argument("--height", type=int, default=512)
    parser.add_argument(
        "--base-model",
        type=str,
        default="runwayml/stable-diffusion-v1-5",
        help="Hugging Face model id for the base pipeline.",
    )
    parser.add_argument(
        "--disable-ip-adapter",
        action="store_true",
        help="Disable reference-image conditioning.",
    )
    parser.add_argument(
        "--ip-adapter-repo",
        type=str,
        default="h94/IP-Adapter",
        help="Hugging Face repo containing IP-Adapter weights.",
    )
    parser.add_argument(
        "--ip-adapter-subfolder",
        type=str,
        default="models",
        help="Subfolder for the adapter weight file.",
    )
    parser.add_argument(
        "--ip-adapter-weight",
        type=str,
        default="ip-adapter_sd15.safetensors",
        help="Adapter weight filename.",
    )
    parser.add_argument(
        "--ip-adapter-scale",
        type=float,
        default=0.72,
        help="How strongly reference images influence style (0-1+).",
    )
    return parser.parse_args()


def load_text(path: Optional[Path], fallback: str) -> str:
    if not path:
        return fallback
    return path.read_text(encoding="utf-8").strip()


def build_reference_montage(reference_paths: list[Path]) -> Image.Image:
    images = [Image.open(path).convert("RGB") for path in reference_paths]
    target_h = min(img.height for img in images)
    resized = []
    for img in images:
        ratio = target_h / img.height
        resized.append(img.resize((int(img.width * ratio), target_h)))
    total_w = sum(img.width for img in resized)
    canvas = Image.new("RGB", (total_w, target_h), (245, 245, 245))
    x = 0
    for img in resized:
        canvas.paste(img, (x, 0))
        x += img.width
    return canvas


def main() -> None:
    args = parse_args()
    prompt = load_text(args.prompt_file, args.prompt)
    negative_prompt = load_text(args.negative_prompt_file, args.negative_prompt)

    for ref in args.references:
        if not ref.exists():
            raise FileNotFoundError(f"Reference image not found: {ref}")

    device = "cuda" if torch.cuda.is_available() else "cpu"
    dtype = torch.float16 if device == "cuda" else torch.float32

    pipe = StableDiffusionPipeline.from_pretrained(
        args.base_model,
        torch_dtype=dtype,
        safety_checker=None,
        requires_safety_checker=False,
    )
    pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config)
    pipe = pipe.to(device)
    pipe.set_progress_bar_config(disable=False)

    ip_adapter_image = None
    if args.references and not args.disable_ip_adapter:
        pipe.load_ip_adapter(
            args.ip_adapter_repo,
            subfolder=args.ip_adapter_subfolder,
            weight_name=args.ip_adapter_weight,
        )
        pipe.set_ip_adapter_scale(args.ip_adapter_scale)
        ip_adapter_image = build_reference_montage(args.references)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    stamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")

    metadata = {
        "prompt": prompt,
        "negative_prompt": negative_prompt,
        "references": [str(p) for p in args.references],
        "seed": args.seed,
        "num_images": args.num_images,
        "steps": args.steps,
        "guidance": args.guidance,
        "width": args.width,
        "height": args.height,
        "base_model": args.base_model,
        "ip_adapter": {
            "enabled": bool(args.references and not args.disable_ip_adapter),
            "repo": args.ip_adapter_repo,
            "subfolder": args.ip_adapter_subfolder,
            "weight": args.ip_adapter_weight,
            "scale": args.ip_adapter_scale,
        },
    }
    (args.output_dir / f"{stamp}_metadata.json").write_text(
        json.dumps(metadata, indent=2), encoding="utf-8"
    )

    for idx in range(args.num_images):
        generator = torch.Generator(device=device).manual_seed(args.seed + idx)
        result = pipe(
            prompt=prompt,
            negative_prompt=negative_prompt,
            num_inference_steps=args.steps,
            guidance_scale=args.guidance,
            width=args.width,
            height=args.height,
            ip_adapter_image=ip_adapter_image,
            generator=generator,
        )
        out_path = args.output_dir / f"{stamp}_knotted_bullwhip_{idx + 1}.png"
        result.images[0].save(out_path)
        print(f"Saved {out_path}")


if __name__ == "__main__":
    main()
