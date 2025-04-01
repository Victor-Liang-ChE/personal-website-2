import { NextResponse } from 'next/server';

// Get the Cloud Run URL from environment variables or use default
const CLOUD_RUN_URL = process.env.CLOUD_RUN_URL || "https://nextjsbackend-23789472506.us-west1.run.app";
// Be sure to include the correct path if needed (e.g. "/chemistry/visualize-molecule")

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const chemicalName = body.name;

    if (!chemicalName) {
      return NextResponse.json({ success: false, message: 'No chemical name provided' }, { status: 400 });
    }

    const response = await fetch(`${CLOUD_RUN_URL}/chemistry/visualize-molecule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: chemicalName })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error from Cloud Run: ${errorText}`);
      return NextResponse.json({
        success: false,
        message: `Error from backend service: ${response.status}`
      }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({
      success: false,
      message: `Server error: ${error instanceof Error ? error.message : String(error)}`
    }, { status: 500 });
  }
}