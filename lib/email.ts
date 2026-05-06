// ─── Email Sender ─────────────────────────────────────────────────────────────
//
// Provider-agnostic stub. Currently a NO-OP — emails are NOT actually sent.
// When ready to release, wire up a provider (Resend recommended) below.
//
// Resend example (uncomment + add RESEND_API_KEY to env):
//
//   import { Resend } from "resend";
//   const resend = new Resend(process.env.RESEND_API_KEY);
//   await resend.emails.send({
//     from: "Paradise Washing <noreply@paradisewashing.com>",
//     to: input.to,
//     subject: input.subject,
//     html: input.html,
//     text: input.text,
//   });

import { buildInviteEmail, type InviteEmailData } from "./email-templates";

const EMAIL_ENABLED = process.env.EMAIL_ENABLED === "true";

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

  // TODO: wire up provider here (Resend, SendGrid, Postmark, etc.)
  console.log(`[email:not-implemented] Email enabled but no provider configured: ${input.to}`);
  return { sent: false, reason: "No email provider configured" };
}

export async function sendInviteEmail(data: InviteEmailData) {
  const { subject, html, text } = buildInviteEmail(data);
  return sendEmail({ to: data.recipientEmail, subject, html, text });
}
