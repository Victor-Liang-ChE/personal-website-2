import os
from flask import Flask, request, jsonify
from mccabe_thiele_calculator import calculate_vle
import json

# Import chemistry tools functions
from chemtools import (
    parse_reaction_equation, 
    handle_parse_reaction,
    handle_molecule_visualization,
    get_molar_mass
)

app = Flask(__name__)

@app.route('/calculate', methods=['POST'])
def calculate():
    data = request.json
    comp1 = data.get('comp1')
    comp2 = data.get('comp2')
    temperature = data.get('temperature')
    pressure = data.get('pressure')
    
    # Call your existing calculation function
    result = calculate_vle(comp1, comp2, temperature, pressure)
    return jsonify(result)

# Add chemistry endpoints
@app.route('/chemistry/parse-reaction', methods=['POST'])
def parse_reaction():
    data = request.json
    equation = data.get('equation')
    
    if not equation:
        return jsonify({"success": False, "message": "No equation provided"}), 400
    
    result = handle_parse_reaction(equation)
    return jsonify(result)

@app.route('/chemistry/visualize-molecule', methods=['POST'])
def visualize_molecule():
    data = request.json
    chemical_name = data.get('name')
    
    if not chemical_name:
        return jsonify({"success": False, "message": "No chemical name provided"}), 400
    
    result = handle_molecule_visualization(chemical_name)
    return jsonify(result)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "OK"}), 200

if __name__ == "__main__":
    app.run(debug=False, host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))