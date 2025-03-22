import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { comp1, comp2, temperature, pressure } = body;

    // Call Python API endpoint
    const pythonApiUrl = process.env.PYTHON_API_URL || 'http://localhost:5000';
    const response = await fetch(`${pythonApiUrl}/api/mccabe-thiele`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ comp1, comp2, temperature, pressure }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to calculate VLE data');
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}
