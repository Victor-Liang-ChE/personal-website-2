import os
from flask import Flask, request, jsonify
from mccabe_thiele_calculator import calculate_vle

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

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "OK"}), 200

if __name__ == "__main__":
    app.run(debug=False, host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))