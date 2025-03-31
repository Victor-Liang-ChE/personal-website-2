from flask import Flask, jsonify, request, Response
from flask_cors import CORS
import os
import json
import sys
import subprocess

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/', methods=['GET'])
def index():
    return jsonify({"message": "Flask API server is running"})

@app.route('/api/mccabe-thiele', methods=['POST'])
def mccabe_thiele():
    try:
        data = request.get_json()
        comp1 = data.get('comp1')
        comp2 = data.get('comp2')
        temperature = data.get('temperature')
        pressure = data.get('pressure')
        
        # Validate inputs
        if not comp1 or not comp2:
            return jsonify({"error": "Component names are required"}), 400
        
        # Path to the Python script (relative to this file)
        script_dir = os.path.dirname(os.path.abspath(__file__))
        script_path = os.path.join(script_dir, 'mccabe_thiele_calculator.py')
        
        # Execute the Python script
        cmd = [
            sys.executable,  # Use the same Python interpreter
            script_path,
            comp1,
            comp2,
            str(temperature) if temperature is not None else 'null',
            str(pressure) if pressure is not None else 'null'
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        # Process the output to find JSON content
        output = result.stdout.strip()
        
        # Find JSON in output
        json_start = output.find('{')
        if json_start >= 0:
            json_text = output[json_start:]
            
            # Find matching closing brace
            brace_count = 0
            json_end = -1
            
            for i, char in enumerate(json_text):
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                
                if brace_count == 0 and i > 0:
                    json_end = i + 1
                    break
            
            if json_end > 0:
                final_json = json_text[:json_end]
                result_data = json.loads(final_json)
                return jsonify(result_data)
            else:
                return jsonify({"error": "Could not find complete JSON object"}), 500
        else:
            return jsonify({"error": "No JSON data found in Python output"}), 500
            
    except json.JSONDecodeError as e:
        return jsonify({"error": f"Failed to parse JSON: {str(e)}"}), 500
    except subprocess.CalledProcessError as e:
        return jsonify({"error": f"Python script error: {e.stderr}"}), 500
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
