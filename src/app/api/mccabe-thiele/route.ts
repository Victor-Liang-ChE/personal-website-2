import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: Request) {
  console.log("DEBUG: McCabe-Thiele API route called");
  try {
    const body = await request.json();
    console.log("DEBUG: Request body received:", body);
    const { comp1, comp2, temperature, pressure } = body;
    console.log(`DEBUG: Extracted parameters - comp1: ${comp1}, comp2: ${comp2}, temperature: ${temperature}, pressure: ${pressure}`);
    
    // Validate inputs
    if (!comp1 || !comp2) {
      console.error("DEBUG ERROR: Missing component names");
      return NextResponse.json(
        { error: 'Component names are required' },
        { status: 400 }
      );
    }

    // Execute Python script directly
    console.log("DEBUG: Executing Python script directly");
    
    // Determine path to Python script (relative to project root)
    const pythonScriptPath = path.join(process.cwd(), 'python', 'mccabe_thiele_calculator.py');
    console.log(`DEBUG: Python script path: ${pythonScriptPath}`);
    
    // Execute the Python script with the parameters
    const pythonProcess = spawn('python', [
      pythonScriptPath,
      comp1,
      comp2,
      temperature !== null ? temperature.toString() : 'null',
      pressure !== null ? pressure.toString() : 'null'
    ]);

    console.log(`DEBUG: Python process spawned with args: ${comp1}, ${comp2}, ${temperature}, ${pressure}`);
    
    let dataString = '';
    let errorString = '';

    // Collect data from script
    pythonProcess.stdout.on('data', (data) => {
      const newData = data.toString();
      dataString += newData;
      console.log(`DEBUG: Python stdout: ${newData.slice(0, 200)}${newData.length > 200 ? '...' : ''}`);
    });

    // Collect error messages
    pythonProcess.stderr.on('data', (data) => {
      errorString += data.toString();
      console.error(`DEBUG ERROR: Python stderr: ${data.toString()}`);
    });

    // Handle process completion
    const processResult = await new Promise((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        console.log(`DEBUG: Python process exited with code ${code}`);
        if (code === 0) {
          try {
            console.log(`DEBUG: Processing output data of length ${dataString.length}`);
            
            // Attempt to find and parse the JSON in the output
            // Look for the first '{' character that appears to be the start of a JSON object
            let jsonStart = -1;
            
            // Try to extract the JSON part regardless of any surrounding text
            const trimmedData = dataString.trim();
            
            // If the data starts with '{', it might be a clean JSON
            if (trimmedData.startsWith('{')) {
              jsonStart = 0;
            } else {
              // Otherwise, search for the first occurrence of '{' - likely start of JSON
              jsonStart = trimmedData.indexOf('{');
            }
            
            if (jsonStart >= 0) {
              // Extract what we think is the JSON part
              const jsonText = trimmedData.substring(jsonStart);
              console.log(`DEBUG: Found potential JSON starting at position ${jsonStart}`);
              
              // Try to find matching closing brace for complete JSON
              let braceCount = 0;
              let jsonEnd = -1;
              
              for (let i = 0; i < jsonText.length; i++) {
                if (jsonText[i] === '{') braceCount++;
                if (jsonText[i] === '}') braceCount--;
                
                // When we've matched all braces, we have complete JSON
                if (braceCount === 0 && i > 0) {
                  jsonEnd = i + 1; // +1 to include the closing brace
                  break;
                }
              }
              
              if (jsonEnd > 0) {
                const finalJson = jsonText.substring(0, jsonEnd);
                console.log(`DEBUG: Extracted JSON of length ${finalJson.length}`);
                
                try {
                  const resultData = JSON.parse(finalJson);
                  console.log(`DEBUG: Successfully parsed JSON with keys: ${Object.keys(resultData).join(', ')}`);
                  resolve(resultData);
                } catch (parseError: unknown) {
                  console.error(`DEBUG ERROR: Failed to parse extracted JSON: ${parseError}`);
                  const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown JSON parsing error';
                  reject(new Error(`Failed to parse JSON: ${errorMessage}`));
                }
              } else {
                console.error("DEBUG ERROR: Could not find complete JSON object");
                reject(new Error('Could not find complete JSON object in Python output'));
              }
            } else {
              console.error("DEBUG ERROR: No JSON data found in Python output");
              reject(new Error('No JSON data found in Python output'));
            }
          } catch (error) {
            console.error(`DEBUG ERROR: Failed to process Python output: ${error}`);
            console.error(`DEBUG ERROR: Raw output (first 500 chars): ${dataString.slice(0, 500)}`);
            reject(error);
          }
        } else {
          console.error(`DEBUG ERROR: Python script exited with code ${code}`);
          reject(new Error(`Python script exited with code ${code}: ${errorString}`));
        }
      });

      pythonProcess.on('error', (error) => {
        console.error(`DEBUG ERROR: Failed to start Python process: ${error.message}`);
        reject(error);
      });
    });
    
    console.log("DEBUG: Successfully processed McCabe-Thiele data");
    return NextResponse.json(processResult);
  } catch (error: any) {
    console.error('DEBUG ERROR: API route error:', error);
    console.error('API route error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}
