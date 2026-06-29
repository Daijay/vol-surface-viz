import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap
from mpl_toolkits.mplot3d import Axes3D
import imageio.v2 as imageio

# ---- output spec ----
W, H = 1920, 1080
FPS = 20
SECONDS = 8
N_FRAMES = FPS * SECONDS          # 160 frames
DPI = 100                          # 19.2 x 10.8 in @ 100 dpi = 1920x1080

# ---- custom deep-blue -> cyan -> green colormap ----
cmap = LinearSegmentedColormap.from_list(
    "blue_cyan_green",
    ["#021034", "#063a8c", "#0a78c8", "#00c2d8", "#11e0a6", "#46d66a"],
    N=256,
)

# ---- grid: X = moneyness (strike), Y = time to maturity ----
x = np.linspace(-2.0, 2.0, 140)   # moneyness
y = np.linspace(0.05, 2.0, 140)   # maturity
X, Y = np.meshgrid(x, y)

# Black-Scholes-style implied vol: flat ATM, curling up at the wings (smile),
# mild equity skew, and a term structure that decays toward long maturities.
# Smooth everywhere, no radial volcano/cone.
smile = 0.045 * X**2 + 0.010 * X**4        # smile: flat middle, wings curl up
skew  = -0.020 * X                          # gentle left-side skew/tilt
term  = 0.075 * np.exp(-1.1 * Y)            # higher short-dated vol, flattens out
Z = 0.17 + smile + skew + term

zmin, zmax = Z.min(), Z.max()
norm = plt.Normalize(zmin, zmax)
facecolors = cmap(norm(Z))

fig = plt.figure(figsize=(W / DPI, H / DPI), dpi=DPI, facecolor="black")
ax = fig.add_subplot(111, projection="3d", facecolor="black")

def render_frame(i):
    ax.cla()
    ax.set_facecolor("black")
    ax.plot_surface(
        X, Y, Z,
        facecolors=facecolors,
        rstride=1, cstride=1,
        linewidth=0, antialiased=True, shade=False,
    )
    ax.set_zlim(zmin, zmax + 0.02)

    # clockwise rotation, full loop over the 8 seconds, fixed elevation
    azim = -45 - (360.0 * i / N_FRAMES)
    ax.view_init(elev=30, azim=azim)

    # strip everything: no axes, grid, ticks, labels, panes
    ax.grid(False)
    ax.set_xticks([]); ax.set_yticks([]); ax.set_zticks([])
    for axis in (ax.xaxis, ax.yaxis, ax.zaxis):
        axis.pane.fill = False
        axis.pane.set_edgecolor("none")
        axis.line.set_color("none")
    ax.set_axis_off()

    fig.subplots_adjust(left=0, right=1, bottom=0, top=1)
    fig.canvas.draw()
    buf = np.asarray(fig.canvas.buffer_rgba())
    return buf[..., :3].copy()

print(f"Rendering {N_FRAMES} frames at {W}x{H}...")
frames = [render_frame(i) for i in range(N_FRAMES)]

print("Writing GIF...")
imageio.mimsave("vol_smile_surface.gif", frames, fps=FPS, loop=0)

print("Writing MP4...")
imageio.mimsave(
    "vol_smile_surface.mp4", frames, fps=FPS,
    codec="libx264", quality=8, macro_block_size=8,
    output_params=["-pix_fmt", "yuv420p"],
)

print("Done.")
