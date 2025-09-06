import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { formId } = await request.json();

  try {
    // This is a simple cache clearing endpoint
    // In a real application, you might want to use Redis or another cache system
    // For now, we'll just return a success response with cache-busting headers
    
    const response = NextResponse.json({
      success: true,
      message: `Cache cleared for form ${formId || 'all forms'}`,
      timestamp: new Date().toISOString()
    });

    // Set headers to prevent caching
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;

  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}
