// services/mailer.js
import nodemailer from "nodemailer";

const port = Number(process.env.MAIL_PORT || 587);
const is465 = port === 465;
const isProd = process.env.NODE_ENV === "production";

export const mailer = nodemailer.createTransport({
    host: process.env.MAIL_HOST,            // e.g. smtp.office365.com
    port,
    secure: is465,                          // 465 = TLS, 587 = STARTTLS
    auth: {
        user: process.env.MAIL_USERNAME,      // full mailbox/UPN, not just "afghan"
        pass: process.env.MAIL_PASSWORD,
    },
    requireTLS: !is465,                     // force STARTTLS on 587
    tls: { rejectUnauthorized: false },      // DEV-ONLY: accept self-signed
    // Optional troubleshooting:
    // logger: !isProd,
    // debug: !isProd,
});
export async function sendOtpEmail({ to, code, purpose = "login" }) {
    const from = undefined;
    const subj =
        purpose === "reset_password"
            ? "Your Tohfa password reset code"
            : purpose === "verify_contact"
                ? "Verify your email for Tohfa"
                : "Your Tohfa sign-in code";

    const html = `
  <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#0f172a;color:#e5e7eb;border-radius:16px">
    <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#fff">${subj}</h1>
    <p style="margin:0 0 16px;color:#cbd5e1">Use this 6-digit code. It expires in 10 minutes.</p>
    <div style="display:inline-block;background:#fff;color:#0f172a;border-radius:12px;padding:12px 16px;font-size:24px;font-weight:800;letter-spacing:4px">${code}</div>
    <p style="margin:16px 0 0;color:#94a3b8;font-size:12px">If you didn’t request this, you can ignore this email.</p>
  </div>`;

    const text = `${subj}\n\nCode: ${code}\n\nIt expires in 10 minutes.`;

    await mailer.sendMail({ from, to, subject: subj, text, html });
}
