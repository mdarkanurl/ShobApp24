// emailTemplates.ts

// Base layout for all emails
const baseEmailTemplate = ({
  appName = "Drakilo",
  title,
  content,
}: {
  appName?: string;
  title: string;
  content: string;
}) => {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${appName} - ${title}</title>
<style>
  body {
    margin: 0;
    padding: 0;
    font-family: 'Segoe UI', Roboto, Arial, sans-serif;
    background-color: #f4f6f9;
  }
  .container {
    max-width: 600px;
    margin: 40px auto;
    background: #fff;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  }
  .header {
    background: #111827;
    padding: 20px;
    text-align: center;
    color: white;
    font-weight: bold;
  }
  .content { padding: 30px 24px; }
  .footer {
    padding: 16px;
    text-align: center;
    font-size: 12px;
    color: #999;
  }
  .btn {
    display: inline-block;
    background: #111827;
    color: white !important;
    padding: 12px 20px;
    border-radius: 6px;
    text-decoration: none;
    margin-top: 20px;
  }
</style>
</head>
<body>
  <div class="container">
    <div class="header">${appName}</div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} ${appName}
    </div>
  </div>
</body>
</html>`;
};

// OTP Email
export const getOtpHtml = ({ email, otp }: { email: string; otp: string }) => {
  const content = `
    <h2>Verify your email - ${email}</h2>
    <p>Use the OTP below:</p>
    <div style="
      font-size: 30px;
      font-weight: bold;
      letter-spacing: 8px;
      background: #f3f4f6;
      padding: 16px;
      border-radius: 8px;
      display: inline-block;
      margin: 20px 0;
    ">${otp}</div>
    <p>This code expires in 5 minutes.</p>
  `;
  return baseEmailTemplate({ title: "OTP Verification", content });
};

// Verify Email
export const getVerifyEmailHtml = ({ email, fixedUrl }: { email: string; fixedUrl: string }) => {
  const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const verifyUrl = `${baseUrl}${fixedUrl}`;
  const content = `
    <h2>Verify your account</h2>
    <p>Hello ${email}, click below:</p>
    <a href="${verifyUrl}" class="btn">Verify Email</a>
    <p style="margin-top:20px;">If button not working, copy this link:</p>
    <p>${verifyUrl}</p>
  `;
  return baseEmailTemplate({ title: "Verify Email", content });
};





// Booking Email
export const getBookingEmailHtml = (ticket: {
  name: string;
  serialNumber: string;
  date: string;
  time: string;
  meetLink?: string;
}) => {
  const content = `
    <h2>Appointment Confirmed</h2>
    <p>Hi ${ticket.name},</p>
    <table>
      <tr><td><b>Booking:</b></td><td>${ticket.serialNumber}</td></tr>
      <tr><td><b>Date:</b></td><td>${ticket.date}</td></tr>
      <tr><td><b>Time:</b></td><td>${ticket.time}</td></tr>
    </table>
    ${
      ticket.meetLink
        ? `<a href="${ticket.meetLink}" class="btn">Join Meeting</a>`
        : ""
    }
  `;
  return baseEmailTemplate({ title: "Booking Confirmation", content });
};

// Subscription Email
export const getSubscriptionHtml = ({
  email,
  password,
  subdomain,
  planName,
  paymentMethod,
  expiryDate,
  activatedAt,
  appName = "Drakilo Salon",
}: {
  email: string;
  password: string;
  subdomain: string;
  planName: string;
  paymentMethod: string;
  expiryDate: string | Date;
  activatedAt: string | Date;
  appName?: string;
}) => {
  const content = `
    <h2>Subscription Activated 🎉</h2>
    <p>Email: ${email}</p>
    <p>Plan: ${planName}</p>
    <p>Payment Method: ${paymentMethod}</p>
    <p>Activated On: ${new Date(activatedAt).toLocaleDateString()}</p>
    <p>Expiry Date: ${new Date(expiryDate).toLocaleDateString()}</p>

    <div style="
      background:#fff3cd;
      padding:20px;
      margin:20px 0;
      border-radius:8px;
    ">
      <b>Password:</b>
      <div style="font-size:20px;font-weight:bold;">${password}</div>
      <p>Please save this password securely.</p>
    </div>

    <a href="https://${subdomain}/login" class="btn">Login to ${appName}</a>
  `;
  return baseEmailTemplate({ title: "Subscription Activated", content });
};

// Export all together
export default {
  getOtpHtml,
  getVerifyEmailHtml,
  getBookingEmailHtml,
  getSubscriptionHtml,
};