#!/usr/bin/env python3
import argparse
import os
import subprocess
import sys
from pathlib import Path


def main() -> int:
    p = argparse.ArgumentParser(description="Export Ultralytics YOLO26n to TensorFlow.js graph model.")
    p.add_argument("--weights", default="yolo26n.pt", help="Ultralytics weights path or hub id (e.g. yolo26n.pt).")
    p.add_argument(
        "--out-dir",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "public" / "models" / "yolo26n",
        help="Output directory for model.json and weight shards.",
    )
    p.add_argument("--imgsz", type=int, default=640)
    args = p.parse_args()

    try:
        from ultralytics import YOLO
    except ImportError:
        print("Install: pip install ultralytics tensorflow tensorflowjs protobuf>=6.31", file=sys.stderr)
        return 1

    cwd = Path.cwd()
    model = YOLO(args.weights)
    saved_rel = model.export(format="saved_model", imgsz=args.imgsz, keras=False)
    sm = (cwd / str(saved_rel)).resolve()
    if not sm.is_dir():
        print(f"SavedModel not found at {sm}", file=sys.stderr)
        return 1

    args.out_dir.mkdir(parents=True, exist_ok=True)
    for f in args.out_dir.iterdir():
        if f.is_file():
            f.unlink()

    env = os.environ.copy()
    env["PATH"] = str(Path.home() / ".local" / "bin") + os.pathsep + env.get("PATH", "")

    cmd = [
        "tensorflowjs_converter",
        "--input_format=tf_saved_model",
        "--output_format=tfjs_graph_model",
        "--signature_name=serving_default",
        str(sm),
        str(args.out_dir.resolve()),
    ]
    r = subprocess.run(cmd, env=env)
    return r.returncode


if __name__ == "__main__":
    raise SystemExit(main())
