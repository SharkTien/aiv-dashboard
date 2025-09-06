import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    // Get Short.io API key from environment variables
    const shortApiKey = process.env.SHORT_IO_API_KEY;
    const shortDomain = process.env.SHORT_IO_DOMAIN || 'short.io';
    
    if (!shortApiKey) {
      return NextResponse.json(
        { error: 'Short.io API key not configured' },
        { status: 500 }
      );
    }

    // Use Short.io API to shorten the URL
    const shortResponse = await fetch('https://api.short.io/links', {
      method: 'POST',
      headers: {
        'Authorization': shortApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        originalURL: url,
        domain: shortDomain,
        // Bỏ path để Short.io tự tạo
        allowDuplicates: false
      }),
    });

    if (!shortResponse.ok) {
      const errorData = await shortResponse.json();
      throw new Error(`Short.io API error: ${errorData.message || 'Unknown error'}`);
    }

    const shortData = await shortResponse.json();
    
    if (!shortData.shortURL) {
      throw new Error('Invalid response from Short.io API');
    }

          return NextResponse.json({
            success: true,
            originalUrl: url,
            shortenedUrl: shortData.shortURL,
            id: shortData.idString,
            shortIoId: shortData.idString
          });

  } catch (error) {
    console.error('Error shortening URL:', error);
    return NextResponse.json(
      { error: `Failed to shorten URL: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
