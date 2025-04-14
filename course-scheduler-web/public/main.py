import js # Pyodide's JavaScript bridge

print("Python main.py loaded successfully via Pyodide!")

def greet(name):
    """A simple function to test calling Python from JS."""
    return f"Hello, {name}, from Python!"

def get_initial_courses():
    """Placeholder to simulate getting courses."""
    # In the future, this might load from data passed by JS
    print("Python: get_initial_courses called")
    return [
        {"id": 1, "subject": "TEST101", "subject_title": "Introduction to Testing", "credited_units": 3.0},
        {"id": 2, "subject": "PYD200", "subject_title": "Pyodide Basics", "credited_units": 1.0},
    ]

# Make functions available to JS (Pyodide does this for top-level functions by default)
# Or explicitly: js.pyodide.globals.set('greet_from_py', greet)