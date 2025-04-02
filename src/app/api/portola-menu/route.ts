import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function GET(request: Request) {
  console.log("DEBUG: Portola menu API route called");
  
  try {
    const { searchParams } = new URL(request.url);
    const meal = searchParams.get('meal') || 'dinner';
    console.log(`DEBUG: Requested meal type: ${meal}`);
    
    // Find path to Python script
    const scriptPath = path.join(process.cwd(), 'python', 'menu.py');
    console.log(`DEBUG: Python script path: ${scriptPath}`);
    
    // Build process
    const pythonProcess = spawn('python', [scriptPath, meal]);
    
    let dataString = '';
    let errorString = '';
    
    // Collect data from script
    pythonProcess.stdout.on('data', (data) => {
      dataString += data.toString();
    });
    
    // Collect errors from script
    pythonProcess.stderr.on('data', (data) => {
      errorString += data.toString();
      console.error(`DEBUG: Python stderr: ${data}`);
    });
    
    // Process completed
    const exitCode = await new Promise((resolve) => {
      pythonProcess.on('close', resolve);
    });
    
    // Handle success
    if (exitCode === 0) {
      try {
        // Extract the JSON part from the response
        // (ignoring any debug/print statements)
        let jsonString = dataString.trim();
        const startIndex = jsonString.indexOf('{');
        if (startIndex !== -1) {
          jsonString = jsonString.substring(startIndex);
          
          // Find matching closing brace by counting opening and closing braces
          let braceCount = 0;
          let endIndex = -1;
          
          for (let i = 0; i < jsonString.length; i++) {
            if (jsonString[i] === '{') braceCount++;
            else if (jsonString[i] === '}') {
              braceCount--;
              if (braceCount === 0) {
                endIndex = i + 1;
                break;
              }
            }
          }
          
          if (endIndex !== -1) {
            jsonString = jsonString.substring(0, endIndex);
          }
          
          const parsedData = JSON.parse(jsonString);
          console.log("DEBUG: Successfully parsed Portola menu data");
          return NextResponse.json(parsedData);
        } else {
          throw new Error("No JSON object found in Python output");
        }
      } catch (parseError) {
        console.error("DEBUG ERROR: Failed to parse Python output:", parseError);
        console.error("DEBUG: Raw output was:", dataString);
        return NextResponse.json(
          { error: "Failed to parse menu data" },
          { status: 500 }
        );
      }
    } else {
      // Handle script errors
      console.error(`DEBUG ERROR: Python script exited with code ${exitCode}`);
      console.error(`DEBUG ERROR: ${errorString}`);
      return NextResponse.json(
        { error: "Error fetching menu data" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('DEBUG ERROR: API route error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}