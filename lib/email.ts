// ─── Email Sender ─────────────────────────────────────────────────────────────
//
// Gmail SMTP via nodemailer. Requires a Google App Password (16-char) tied to
// a 2FA-enabled Workspace/Gmail account. Set EMAIL_ENABLED=true to send.

import nodemailer, { type Transporter } from "nodemailer";
import { buildInviteEmail, type InviteEmailData } from "./email-templates";

const EMAIL_ENABLED = process.env.EMAIL_ENABLED === "true";
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
const EMAIL_FROM = process.env.EMAIL_FROM || GMAIL_USER || "";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!EMAIL_ENABLED) return null;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.warn("[email] EMAIL_ENABLED=true but GMAIL_USER / GMAIL_APP_PASSWORD not set");
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    });
  }
  return transporter;
}

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function sendEmail(input: SendEmailInput): Promise<{ sent: boolean; reason?: string }> {
  if (!EMAIL_ENABLED) {
    console.log(`[email:disabled] Would send to ${input.to}: ${input.subject}`);
    return { sent: false, reason: "EMAIL_ENABLED is false" };
  }

  const tx = getTransporter();
  if (!tx) {
    return { sent: false, reason: "SMTP not configured" };
  }

  try {
    const info = await tx.sendMail({
      from: `Paradise Academy <${EMAIL_FROM}>`,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    console.log(`[email:sent] ${input.to} (messageId=${info.messageId})`);
    return { sent: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[email:error] ${input.to}: ${msg}`);
    return { sent: false, reason: msg };
  }
}

export async function sendInviteEmail(data: InviteEmailData) {
  const { subject, html, text } = buildInviteEmail(data);
  return sendEmail({ to: data.recipientEmail, subject, html, text });
}
