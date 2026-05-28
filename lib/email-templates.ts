// ─── Email Templates ──────────────────────────────────────────────────────────
//
// Templates for transactional emails. Sending is NOT wired up yet — these
// are pure builders. When ready to release, hook a provider (Resend,
// SendGrid, etc.) into lib/email.ts and import these.

export interface InviteEmailData {
  recipientName: string;
  recipientEmail: string;
  inviteUrl: string; // e.g. https://paradiseacademy.vercel.app/invite/abc123
  companyName?: string;
}

export function buildInviteEmail(data: InviteEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const company = data.companyName ?? "Paradise Washing";
  const subject = `You're invited to join ${company} Training`;

  const text = `Hi ${data.recipientName},

Welcome to the ${company} crew training portal! Your account has been created.

To get started, click the link below to set your password:
${data.inviteUrl}

This invite link will expire in 14 days.

If you didn't expect this email, you can safely ignore it.

— ${company}`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding:40px 40px 20px 40px;text-align:center;background-color:#0E0E0E;color:#ffffff;border-bottom:4px solid #F08A3E;">
              <h1 style="margin:0;font-size:24px;font-weight:700;letter-spacing:-0.02em;">${company}</h1>
              <p style="margin:8px 0 0 0;font-size:14px;color:#F08A3E;">Academy</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 24px 40px;">
              <h2 style="margin:0 0 16px 0;font-size:20px;font-weight:600;color:#111827;">Welcome aboard, ${data.recipientName}!</h2>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#374151;">
                Your training account has been created. Click the button below to set your password and get started.
              </p>
              <p style="margin:24px 0;text-align:center;">
                <a href="${data.inviteUrl}" style="display:inline-block;background-color:#F08A3E;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">
                  Set Up Your Account
                </a>
              </p>
              <p style="margin:0 0 8px 0;font-size:13px;color:#6b7280;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 24px 0;font-size:13px;color:#D9701F;word-break:break-all;">
                ${data.inviteUrl}
              </p>
              <p style="margin:24px 0 0 0;padding-top:20px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;line-height:1.5;">
                This invite link will expire in 14 days. If you didn't expect this email, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0 0;font-size:12px;color:#9ca3af;">
          © ${new Date().getFullYear()} ${company}. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

// ─── New Hire Notification (sent to Operational Managers) ──────────────────

export interface NewHireNotificationData {
  recipientName: string;
  recipientEmail: string;
  newHireName: string;
  newHireEmail: string;
  appUrl?: string;
  companyName?: string;
}

export function buildNewHireNotificationEmail(data: NewHireNotificationData): {
  subject: string;
  html: string;
  text: string;
} {
  const company = data.companyName ?? "Paradise Washing";
  const appUrl = data.appUrl ?? "https://paradiseacademy.vercel.app";
  const signOffsUrl = `${appUrl}/trainee/sign-offs`;
  const subject = `New hire onboarding — ${data.newHireName}`;

  const text = `Hi ${data.recipientName},

A new hire has been assigned the New Hire / Onboarding role:

  Name:  ${data.newHireName}
  Email: ${data.newHireEmail}

They will move through the Company Overview & Onboarding module over the next 4 weeks. Default trainer rotation: Brandon -> Lance -> Brandon -> Brandon.

Open the sign-offs board to see and certify their progress:
${signOffsUrl}

— ${company}`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><title>${subject}</title></head>
<body style="margin:0;padding:0;background-color:#f7f6f3;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:32px 32px 0 32px;">
          <p style="margin:0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#6b7280;font-weight:600;">New Hire</p>
          <h1 style="margin:6px 0 16px 0;font-size:22px;color:#111827;">${data.newHireName} just started onboarding</h1>
          <p style="margin:0 0 16px 0;font-size:14px;color:#4b5563;line-height:1.55;">
            ${data.newHireName} (${data.newHireEmail}) has been assigned the
            <strong>New Hire / Onboarding</strong> role.
          </p>
          <p style="margin:0 0 16px 0;font-size:14px;color:#4b5563;line-height:1.55;">
            They will move through the <strong>Company Overview &amp; Onboarding</strong> module over the next 4 weeks.
            Default trainer rotation: <strong>Brandon &rarr; Lance &rarr; Brandon &rarr; Brandon</strong>.
          </p>
          <p style="margin:24px 0;text-align:center;">
            <a href="${signOffsUrl}" style="display:inline-block;background-color:#F08A3E;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">
              View Sign-Offs
            </a>
          </p>
          <p style="margin:24px 0 0 0;padding-top:20px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;line-height:1.5;">
            You're receiving this because you are an Operational Manager at ${company}.
          </p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0 0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} ${company}. All rights reserved.</p>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}
