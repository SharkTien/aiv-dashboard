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
    
    // Debug logging
    console.log('Short.io API Key exists:', !!shortApiKey);
    console.log('Short.io Domain:', shortDomain);
    
    if (!shortApiKey) {
      return NextResponse.json(
        { error: 'Short.io API key not configured' },
        { status: 500 }
      );
    }

    // Use Short.io API to shorten the URL
    const requestBody = {
      originalURL: url,
      domain: shortDomain,
      // Bỏ path để Short.io tự tạo
      allowDuplicates: false
    };
    
    console.log('Making request to Short.io:', {
      url: 'https://api.short.io/links',
      domain: shortDomain,
      originalURL: url,
      hasApiKey: !!shortApiKey
    });
    
    const shortResponse = await fetch('https://api.short.io/links', {
      method: 'POST',
      headers: {
        'Authorization': shortApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!shortResponse.ok) {
      const errorText = await shortResponse.text();
      console.error('Short.io API error response:', {
        status: shortResponse.status,
        statusText: shortResponse.statusText,
        body: errorText
      });
      throw new Error(`Short.io API error: ${shortResponse.status} - ${errorText}`);
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
