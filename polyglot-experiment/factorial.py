# Python Experiment - Factorial Calculator
# Python is great for AI/ML and quick calculations!

def factorial(n):
    if n == 0 or n == 1:
        return 1
    return n * factorial(n - 1)


number = 5
result = factorial(number)

print(f"Language: Python")
print(f"Task: Factorial Calculator")
print(f"Factorial of {number} = {result}")
