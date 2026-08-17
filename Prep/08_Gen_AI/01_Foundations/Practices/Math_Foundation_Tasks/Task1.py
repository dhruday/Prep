import numpy as np
import matplotlib.pyplot as plt

# Function to minimize: f(x) = x^2 - 4x + 7
def f(x):
    return x**2 - 4*x + 7

# Derivative: f'(x) = 2x - 4
def f_prime(x):
    return 2*x - 4

# Gradient descent
x = 0  # Starting point
learning_rate = 0.1
history = [x]
fofx = [f(x)]

for i in range(20):
    gradient = f_prime(x)
    x = x - learning_rate * gradient
    history.append(x)
    fofx.append(f(x))
    print(f"Step {i}: x={x:.4f}, f(x)={f(x):.4f}, gradient={gradient:.4f}")
plt.plot(history, fofx, color='red', marker='o')
plt.show()
# Visualization (pseudo-code - you'll need matplotlib)
# Plot f(x) as a curve
# Plot the path of gradient descent
# Show how x moves toward the minimum