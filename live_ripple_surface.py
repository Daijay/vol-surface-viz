import numpy as np
import matplotlib
import matplotlib.pyplot as plt
import matplotlib.animation as animation
from mpl_toolkits.mplot3d import Axes3D

# ---- window 1920x1080 ----
DPI = 100
fig = plt.figure(figsize=(1920 / DPI, 1080 / DPI), dpi=DPI, facecolor="black")
ax = fig.add_subplot(111, projection="3d", facecolor="black")

try:
    fig.canvas.manager.set_window_title("Live Ripple Surface")
except Exception:
    pass

# ---- flat wavy plane grid ----
x = np.linspace(-6, 6, 90)
y = np.linspace(-6, 6, 90)
X, Y = np.meshgrid(x, y)
R = np.sqrt(X**2 + Y**2)

# ---- animation parameters ----
AZIM_STEP = 0.3      # degrees per frame, clockwise
PHASE_STEP = 0.03    # ripple phase shift per frame (very slow)
ELEV = 20

# ---- static cage styling (set once, not per frame, to stay smooth) ----
ax.set_xlim(-6, 6)
ax.set_ylim(-6, 6)
ax.set_zlim(-3, 3)
ax.grid(True)

# ticks present (so grid lines draw) but no tick marks or labels
ax.set_xticks(np.linspace(-6, 6, 7))
ax.set_yticks(np.linspace(-6, 6, 7))
ax.set_zticks(np.linspace(-3, 3, 5))
ax.set_xticklabels([]); ax.set_yticklabels([]); ax.set_zticklabels([])
ax.tick_params(length=0)

for axis in (ax.xaxis, ax.yaxis, ax.zaxis):
    # see-through-looking black panes
    axis.set_pane_color((0.0, 0.0, 0.0, 1.0))
    axis.pane.set_edgecolor((1.0, 1.0, 1.0, 0.6))   # white cage edges
    # white grid lines
    axis._axinfo["grid"]["color"] = (1.0, 1.0, 1.0, 0.35)
    axis._axinfo["grid"]["linewidth"] = 0.5

fig.subplots_adjust(left=0, right=1, bottom=0, top=1)

def update(frame):
    ax.collections.clear()

    phase = frame * PHASE_STEP
    # gentle slow ripple: small amplitude, flat wavy plane centered in the cage
    Z = 0.8 * np.sin(R - phase) * np.exp(-0.04 * R)

    # magma surface floating inside the cage
    ax.plot_surface(
        X, Y, Z,
        cmap="magma",
        rstride=2, cstride=2,
        linewidth=0, antialiased=True, alpha=0.95,
    )

    ax.set_zlim(-3, 3)

    # slow clockwise rotation
    ax.view_init(elev=ELEV, azim=-frame * AZIM_STEP)

# continuously running, never saved
ani = animation.FuncAnimation(fig, update, interval=16, cache_frame_data=False)
plt.show()
