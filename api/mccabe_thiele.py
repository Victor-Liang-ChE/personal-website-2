import sys
import os
import json
import subprocess
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # Get content length
        content_length = int(self.headers['Content-Length'])
        # Read the request body
        body = self.rfile.read(content_length).decode('utf-8')
        # Parse JSON body
        data = json.loads(body)

        # Extract parameters
        comp1 = data.get('comp1')
        comp2 = data.get('comp2')
        temperature = data.get('temperature')
        pressure = data.get('pressure')
        
        # Validate inputs
        if not comp1 or not comp2:
            self._send_error("Component names are required")
            return
        
        try:
            # Path to the Python script
            script_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'python')
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
            
            # Run the process
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
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
                    self._send_json(result_data)
                else:
                    self._send_error("Could not find complete JSON object")
            else:
                self._send_error("No JSON data found in Python output")
                
        except json.JSONDecodeError as e:
            self._send_error(f"Failed to parse JSON: {str(e)}")
        except subprocess.CalledProcessError as e:
            self._send_error(f"Python script error: {e.stderr}")
        except Exception as e:
            self._send_error(f"Server error: {str(e)}")
    
    def _send_json(self, data):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def _send_error(self, message, status=400):
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()