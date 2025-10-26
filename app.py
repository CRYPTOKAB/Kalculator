# app.py

from flask import Flask, request, jsonify, render_template
import math
import sys

# Define a safe environment for the eval() function
# Only allows specified functions and constants, preventing system commands.
SAFE_GLOBALS = {
    '__builtins__': None,  # Disable built-in functions
    'sin': math.sin,
    'cos': math.cos,
    'tan': math.tan,
    'sqrt': math.sqrt,
    'log': math.log,
    'pi': math.pi,
    'e': math.e,
    'abs': abs,
    'int': int,
    'float': float,
    'pow': pow,
    'round': round,
}

# --- FIX IS HERE: template_folder='.' ---
app = Flask(__name__, static_folder='static', template_folder='.') 

@app.route('/')
def serve_index():
    """Serves the main HTML page. Flask now looks for index.html in the same directory as app.py."""
    return render_template('index.html')

@app.route('/api/calc', methods=['POST'])
def calculate_api():
    """Handles POST requests to /api/calc for evaluation."""
    try:
        data = request.get_json()
        if not data or 'expr' not in data:
            return jsonify({"ok": False, "error": "No expression provided"}), 400

        expr = str(data['expr']).strip()
        if not expr:
            return jsonify({"ok": True, "result": "0"})

        # Basic security check: prevent dangerous keywords
        if any(keyword in expr for keyword in ['import', 'os.', 'sys.', 'exec', 'open', '__']):
            return jsonify({"ok": False, "error": "Forbidden keyword detected"}), 403

        # Compile the expression safely
        code = compile(expr, '<string>', 'eval')
        
        # Check for function names used in the code object that are not in our SAFE_GLOBALS
        for name in code.co_names:
            if name not in SAFE_GLOBALS:
                return jsonify({"ok": False, "error": f"Function or constant '{name}' not allowed"}), 403

        # Evaluate the expression in the restricted environment
        result = eval(code, {"__builtins__": None}, SAFE_GLOBALS)
        
        # Format the result (removes trailing zeros, handles large numbers gracefully)
        formatted_result = f'{result:g}' 

        return jsonify({"ok": True, "result": formatted_result})

    except ZeroDivisionError:
        return jsonify({"ok": False, "error": "Division by zero"}), 400
    except (SyntaxError, NameError, TypeError) as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    except Exception as e:
        print(f"Server Error: {e}", file=sys.stderr)
        return jsonify({"ok": False, "error": "Internal server error"}), 500

if __name__ == '__main__':
    print("Starting Flask server on http://127.0.0.1:5000/")
    app.run(debug=True)