# vol-surface-viz

A small collection of Python / matplotlib 3D surface visualizations, built up
from a simple ripple plot to an animated Black-Scholes-style volatility surface
and a live, continuously rotating surface inside a wireframe cage.

## Scripts

| Script | What it does |
| --- | --- |
| `liquidity_wave.py` | Static 3D plasma ripple surface on black, saved to `liquidity_wave.png`. |
| `vol_surface.py` | Animated winter-colormap volatility bowl, saved to `vol_surface.gif`. |
| `vol_smile_surface.py` | Animated Black-Scholes implied-vol smile/skew surface (flat ATM, wings curl up), custom deep-blue to cyan to green colormap, slow clockwise rotation at `elev=30`. Renders **1920x1080, 20fps, 8s** to both GIF and MP4. |
| `live_ripple_surface.py` | Live `FuncAnimation` (no file output): a magma surface rippling slowly inside a see-through black cage with white grid lines. Slow clockwise rotation (`0.3` deg/frame), ripple phase `0.03`/frame, `elev=20`, 1920x1080 window. |

## Requirements

```
pip install numpy matplotlib imageio imageio-ffmpeg
```

`imageio-ffmpeg` is only needed for MP4 output (`vol_smile_surface.py`); it
bundles its own ffmpeg binary.

## Usage

```
python liquidity_wave.py        # writes a PNG
python vol_surface.py           # writes a GIF
python vol_smile_surface.py     # writes a GIF + MP4 (1920x1080, 20fps, 8s)
python live_ripple_surface.py   # opens a live animated window
```

Rendered media (`*.png`, `*.gif`, `*.mp4`) are gitignored; run the scripts to
regenerate them.
