import { NextResponse } from 'next/server';

export async function GET() {
  // console.log('[Test API] GET request received');
  return NextResponse.json({ 
    success: true, 
    message: 'Test API working',
    timestamp: new Date().toISOString()
  });
}
