import nodemailer from "nodemailer";

function createTransporter() {
  if (!process.env.SMTP_USER) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  resetUrl: string
) {
  const transporter = createTransporter();

  if (!transporter) {
    // Dev mode — print to console instead of sending email
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("[GEI CRM] Password Reset (dev mode — no SMTP configured)");
    console.log(`  To: ${email}`);
    console.log(`  Link: ${resetUrl}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || "GEI CRM <noreply@geicrm.com>",
    to: email,
    subject: "Reset your GEI CRM password",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">GEI CRM</h2>
        <p>Hi ${firstName},</p>
        <p>We received a request to reset your password. Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
        <a href="${resetUrl}" style="display:inline-block;margin:20px 0;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
          Reset Password
        </a>
        <p style="color:#888;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
        <p style="color:#888;font-size:13px;">Or copy this link: ${resetUrl}</p>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(
  email: string,
  firstName: string,
  tempPass: string
) {
  const transporter = createTransporter();

  if (!transporter) {
    // Dev mode — print to console instead of sending email
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("[GEI CRM] Welcome / Temp Password (dev mode — no SMTP configured)");
    console.log(`  To: ${email}`);
    console.log(`  Temp Password: ${tempPass}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || "GEI CRM <noreply@geicrm.com>",
    to: email,
    subject: "Welcome to GEI CRM - Your temporary login details",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">Welcome to GEI CRM</h2>
        <p>Hi ${firstName},</p>
        <p>An account has been created for you on GEI CRM. Here are your login details:</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Temporary Password:</strong> ${tempPass}</p>
        <p>Upon your first sign in, you will be prompted to change this temporary password to one of your choice.</p>
        <p style="color:#888;font-size:13px;">Please change your password immediately upon logging in.</p>
      </div>
    `,
  });
}

