import sys
import json
import numpy as np
from scipy.optimize import fsolve
import os

# Append the path to include the TxyPxyxy.py file
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'iCloudDrive', 'Coding', 'Personal-Website-Plotly'))

try:
    from TxyPxyxy import xy
except ImportError:
    print("Error importing TxyPxyxy module. Using fallback implementation.", file=sys.stderr)
    
    def xy(comp1, comp2, T=None, P=None, values=False, show=False):
        """Fallback implementation if TxyPxyxy module is not available"""
        # Mock data for testing
        x = np.linspace(0, 1, 100)
        y = 1.5 * x / (0.5 + x)  # Simple VLE model
        return x, y

def calculate_vle(comp1, comp2, temperature=None, pressure=None):
    """Calculate VLE data for the given components and conditions"""
    try:
        # Convert inputs to appropriate types
        if temperature is not None and temperature != 'null':
            T = float(temperature)
            P = None
        elif pressure is not None and pressure != 'null':
            P = float(pressure) / 1e5  # Convert Pa to bar for thermo library
            T = None
        else:
            T = 300  # Default temperature in K
            P = None
        
        # Get VLE data
        x_values, y_values = xy(comp1, comp2, T=T, P=P, values=True, show=False)
        
        # Convert to list for JSON serialization
        x_values_list = x_values.tolist() if hasattr(x_values, 'tolist') else list(x_values)
        y_values_list = y_values.tolist() if hasattr(y_values, 'tolist') else list(y_values)
        
        # Calculate polynomial fit coefficients
        z = np.polyfit(x_values, y_values, 20)
        z_list = z.tolist()
        
        # Calculate volatility information
        volatility_info = get_component_volatility(comp1, comp2)
        
        return {
            'x_values': x_values_list,
            'y_values': y_values_list,
            'poly_coeffs': z_list,
            'volatility': volatility_info,
            'temperature': T,
            'pressure': P,
            'comp1': comp1,
            'comp2': comp2
        }
    
    except Exception as e:
        print(f"Error in calculate_vle: {str(e)}", file=sys.stderr)
        return {
            'error': str(e),
            'x_values': [],
            'y_values': [],
            'poly_coeffs': []
        }

def get_component_volatility(comp1, comp2):
    """Get boiling points and determine which component is more volatile"""
    boiling_points = {
        # Common solvents and chemicals with boiling points in Kelvin
        "methanol": 337.8,
        "ethanol": 351.4,
        "water": 373.15,
        "acetone": 329.2,
        "benzene": 353.2,
        "toluene": 383.8,
        "chloroform": 334.0,
        "hexane": 342.0,
        "heptane": 371.6,
        "octane": 398.8,
        "propanol": 370.4,
        "butanol": 390.9,
        "acetic acid": 391.2,
        "acetonitrile": 354.8,
        "carbon tetrachloride": 349.9,
        "diethyl ether": 307.6,
        "dmf": 426.0,
        "dmso": 462.0,
        "ethyl acetate": 350.3,
        "isopropanol": 355.4,
        "methyl ethyl ketone": 352.8,
        "pentane": 309.2,
    }
    
    comp1_lower = comp1.lower()
    comp2_lower = comp2.lower()
    
    bp1 = boiling_points.get(comp1_lower, None)
    bp2 = boiling_points.get(comp2_lower, None)
    
    if bp1 is None or bp2 is None:
        return {
            'message': f"Could not find boiling point data for {comp1} or {comp2}",
            'more_volatile': None,
            'bp1': bp1,
            'bp2': bp2
        }
    
    more_volatile = comp1 if bp1 < bp2 else comp2
    less_volatile = comp2 if bp1 < bp2 else comp1
    
    return {
        'message': f"{more_volatile} is more volatile (lower boiling point)",
        'more_volatile': more_volatile,
        'less_volatile': less_volatile,
        'bp1': bp1,
        'bp2': bp2
    }

def calculate_average_volatility(x_values, y_values):
    """Calculate average relative volatility from equilibrium data"""
    volatilities = []
    for x, y in zip(x_values, y_values):
        if 0 < x < 1 and 0 < y < 1:  # Avoid division by zero
            volatility = y*(1-x)/(x*(1-y))
            volatilities.append(volatility)
    
    if not volatilities:
        return None
    
    return sum(volatilities) / len(volatilities)

if __name__ == "__main__":
    # Get arguments from command line
    if len(sys.argv) < 5:
        result = {'error': 'Invalid number of arguments'}
    else:
        comp1 = sys.argv[1]
        comp2 = sys.argv[2]
        temperature = None if sys.argv[3] == 'null' else float(sys.argv[3])
        pressure = None if sys.argv[4] == 'null' else float(sys.argv[4])
        
        result = calculate_vle(comp1, comp2, temperature, pressure)
    
    # Print result as JSON for the Node.js process to capture
    print(json.dumps(result))
