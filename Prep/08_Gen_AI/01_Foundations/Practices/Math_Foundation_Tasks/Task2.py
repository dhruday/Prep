import numpy as np
import matplotlib.pyplot as plt

n = 10000
flips = np.random.binomial(1, 0.5, n)
running_prob = np.cumsum(flips) / np.arange(1, n + 1)
print(flips, flips.size)
plt.plot(running_prob)
plt.ylim(0,1)
plt.show()
