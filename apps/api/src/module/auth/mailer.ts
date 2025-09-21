import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,                // mail.privateemail.com
  port: Number(process.env.EMAIL_PORT) || 465, // 465 for SSL
  secure: true,                                // ✅ use SSL for port 465
  auth: {
    user: process.env.EMAIL_USER,              // service@curnce.com
    pass: process.env.EMAIL_PASS,              // your password
  },
});

export async function sendMail(to: string, subject: string, html: string) {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM, // "Curnce <no-reply@curnce.com>"
      to,
      subject,
      html,
    });

    console.log("📩 Email sent:", info.messageId);
    return info;
  } catch (err) {
    console.error("❌ Email send failed:", err);
    throw err;
  }
}
