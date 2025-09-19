import nodemailer from "nodemailer";

type SendEmailOptions = {
  to: string;
  subject: string;
  html?: string;
};

// Use loose typing to avoid build-time type issues with nodemailer typings
let transporter: any = null;

function getTransporter(): any {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";

  if (!host || !port || !user || !pass) {
    console.warn("[Email] SMTP is not fully configured. Skipping email sending.");
    console.warn("[Email] Missing:", { host: !!host, port: !!port, user: !!user, pass: !!pass });
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    // Reasonable timeouts to avoid blocking submissions if SMTP is slow
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 7000),
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 7000),
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 10000),
  });
  return transporter;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  try {
    // Skip email sending in development to save bandwidth
    if (process.env.NODE_ENV === 'development' && process.env.SKIP_EMAIL === 'true') {
      // console.log('[Email] Skipped in development mode');
      return { success: true, skipped: true, messageId: 'dev-skip' } as const;
    }
    
    const tx = getTransporter();
    if (!tx) return { success: false, skipped: true } as const;

    const from = process.env.SMTP_FROM || process.env.SMTP_USER!;
    const signatureHtml = process.env.SMTP_SIGNATURE_HTML || "";

    const finalHtml = `${html || ""}${signatureHtml ? `\n\n${signatureHtml}` : ""}`;

    const info = await tx.sendMail({
      from,
      to,
      subject,
      html: finalHtml || undefined,
      text: undefined,
    });

    return { success: true, messageId: info.messageId } as const;
  } catch (err) {
    console.error("[Email] sendEmail failed:", (err as any)?.message || err);
    return { success: false, error: (err as any)?.message || String(err) } as const;
  }
}


