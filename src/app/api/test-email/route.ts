import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { to } = await req.json();
    
    if (!to) {
      return NextResponse.json({ error: "Missing 'to' email" }, { status: 400 });
    }

    const result = await sendEmail({
      to,
      subject: "Test Email - AIESEC Dashboard",
      html: `
        <h1>Test Email</h1>
        <p>This is a test email from AIESEC Dashboard.</p>
        <p>If you receive this, SMTP is configured correctly!</p>
      `
    });

    return NextResponse.json({ 
      success: true, 
      result,
      message: result.success ? "Email sent successfully" : "Email failed to send"
    });

  } catch (error) {
    console.error("Test email error:", error);
    return NextResponse.json({ 
      error: "Failed to send test email",
      details: (error as any)?.message 
    }, { status: 500 });
  }
}
