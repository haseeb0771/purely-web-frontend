import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

interface ContactPayload {
  name: string;
  email: string;
  phone?: string;
  message: string;
}

const brandCss = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; background: #F8FAFC; }
  .card { background: #ffffff; border: 1px solid #E2E8F0; border-radius: 16px; max-width: 520px; margin: 24px auto; overflow: hidden; }
  .header { background: #00324A; padding: 24px 28px; }
  .header h1 { color: #ffffff; font-size: 20px; }
  .header .brand { color: #2FB9BF; font-size: 13px; letter-spacing: 3px; text-transform: uppercase; margin-top: 6px; }
  .body { padding: 24px 28px; }
  .field { margin-bottom: 16px; }
  .label { color: #00324A; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
  .value { color: #1E293B; font-size: 15px; line-height: 1.5; padding: 10px 14px; border: 1px solid #E2E8F0; border-radius: 8px; background: #F8FAFC; }
  .divider { height: 1px; background: #E2E8F0; margin: 20px 0; }
  .footer { background: #E6F7F7; padding: 16px 28px; color: #00324A; font-size: 12px; line-height: 1.6; }
  .footer strong { color: #2FB9BF; }
`;

const sanitize = (value: string) =>
  value.replace(/[<>]/g, "").trim().slice(0, 500);

function buildHtml({ name, email, phone, message }: ContactPayload): string {
  const safeName = sanitize(name);
  const safeEmail = sanitize(email);
  const safePhone = (phone || "").replace(/[<>]/g, "").trim();
  const safeMessage = sanitize(message);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>New Inquiry from ${safeName}</title>
  <style>${brandCss}</style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>New Inquiry</h1>
      <div class="brand">Purely Custom Labels</div>
    </div>
    <div class="body">
      <div class="field">
        <div class="label">Name</div>
        <div class="value">${safeName}</div>
      </div>
      <div class="field">
        <div class="label">Email</div>
        <div class="value">${safeEmail}</div>
      </div>
      <div class="field">
        <div class="label">Phone</div>
        <div class="value">${safePhone || "Not provided"}</div>
      </div>
      <div class="divider"></div>
      <div class="field">
        <div class="label">Message</div>
        <div class="value">${safeMessage || "—"}</div>
      </div>
    </div>
    <div class="footer">
      Received via the <strong>Purely</strong> contact form. Reply directly to ${safeEmail} to continue the conversation.
    </div>
  </div>
</body>
</html>`;
}

const API_BASE_URL = (
  process.env.API_URL ??
  process.env.API_URL ??
  "http://localhost:5000"
).replace(/\/+$/, "");

async function persistInquiry(payload: ContactPayload): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${API_BASE_URL}/api/inquiries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const body = (await res.json().catch(() => null)) as {
      success?: boolean;
    } | null;
    return body?.success === true;
  } catch (error) {
    console.error("[contact] failed to persist inquiry:", error);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: ContactPayload = await req.json();
    const name = (body.name || "").trim();
    const email = (body.email || "").trim();
    const phone = (body.phone || "").trim();
    const message = (body.message || "").trim();

    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, message: "Name, email and message are required." },
        { status: 400 }
      );
    }

    const persistedPromise = persistInquiry({ name, email, phone, message });

    const emailPromise = (async () => {
      const user = process.env.EMAIL_USER;
      const pass = process.env.EMAIL_PASS;

      if (!user || !pass) {
        console.error(
          "[contact] Missing EMAIL_USER or EMAIL_PASS environment variables."
        );
        return false;
      }

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user, pass },
      });

      const mailOptions: nodemailer.SendMailOptions = {
        from: user,
        to: user,
        replyTo: email,
        subject: `New Inquiry from ${name} - Purely`,
        text: `New inquiry from ${name}\nEmail: ${email}\nPhone: ${phone || "Not provided"}\n\n${message}`,
        html: buildHtml({ name, email, phone, message }),
      };

      await transporter.sendMail(mailOptions);
      return true;
    })();

    const [persisted, emailed] = await Promise.all([
      persistedPromise,
      emailPromise.catch(() => false),
    ]);

    if (!persisted && !emailed) {
      console.error("[contact] both email and persistence failed.");
      return NextResponse.json(
        { success: false, message: "Failed to send your message. Please try again." },
        { status: 500 }
      );
    }

    if (!persisted) {
      console.warn("[contact] inquiry persisted? no — email was still sent.");
    }
    if (!emailed) {
      console.warn("[contact] email failed — inquiry saved to admin panel.");
    }

    return NextResponse.json(
      {
        success: true,
        message: persisted
          ? "Inquiry received! We will get back to you soon."
          : "Email sent successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[contact] Failed to handle inquiry:", error);
    return NextResponse.json(
      { success: false, message: "Failed to send your message. Please try again." },
      { status: 500 }
    );
  }
}