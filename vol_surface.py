import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.animation as animation
from mpl_toolkits.mplot3d import Axes3D

fig = plt.figure(figsize=(12, 8), facecolor='black')
ax = fig.add_subplot(111, projection='3d', facecolor='black')

x = np.linspace(-4, 4, 80)
y = np.linspace(-4, 4, 80)
X, Y = np.meshgrid(x, y)

def vol_surface(t):
    Z = 0.3 + 0.1 * (X**2 + Y**2) + 0.05 * np.sin(X * 2 + t) * np.cos(Y * 2 + t)
    return Z

def update(frame):
    ax.cla()
    ax.set_facecolor('black')
    Z = vol_surface(frame * 0.1)
    ax.plot_surface(X, Y, Z, cmap='winter', alpha=0.9, linewidth=0)
    ax.set_zlim(0, 1)
    ax.grid(False)
    ax.set_xticks([])
    ax.set_yticks([])
    ax.set_zticks([])
    ax.xaxis.pane.fill = False
    ax.yaxis.pane.fill = False
    ax.zaxis.pane.fill = False
    ax.xaxis.pane.set_edgecolor('none')
    ax.yaxis.pane.set_edgecolor('none')
    ax.zaxis.pane.set_edgecolor('none')

ani = animation.FuncAnimation(fig, update, frames=100, interval=50)
ani.save('vol_surface.gif', writer='pillow', fps=20, dpi=150)
