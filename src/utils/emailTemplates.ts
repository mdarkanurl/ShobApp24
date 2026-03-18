// emailTemplates.ts
// Github24 — email template system
// Powered by Drakilo Team · https://drakilo.com

/* ─────────────────────────────────────────────────────────────
   BASE LAYOUT
   All emails share this wrapper for consistent branding.
───────────────────────────────────────────────────────────── */
const baseEmailTemplate = ({
  title,
  previewText = "",
  content,
}: {
  title: string;
  previewText?: string;
  content: string;
}) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Github24 — ${title}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    /* Reset */
    *, *::before, *::after { box-sizing: border-box; }
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; display: block; }
    body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif; }

    /* Wrapper */
    .wrapper   { width: 100%; background-color: #f1f5f9; padding: 40px 16px; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 32px rgba(15,23,42,0.10); }

    /* Header */
    .header {
      background: #0f172a;
      padding: 28px 32px 24px;
      text-align: center;
    }
    .header-logo-box {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
    }
    .header-icon {
      width: 36px; height: 36px;
      background: linear-gradient(135deg, #7f6aff, #8b5cf6, #3b82f6);
      border-radius: 10px;
      display: inline-flex; align-items: center; justify-content: center;
    }
    .header-name {
      font-size: 20px; font-weight: 800;
      color: #ffffff; letter-spacing: -0.5px;
    }
    .header-name span { color: #a78bfa; }

    /* Gradient divider */
    .gradient-bar {
      height: 3px;
      background: linear-gradient(90deg, #7f6aff, #8b5cf6, #3b82f6);
    }

    /* Body content */
    .content { padding: 36px 32px 28px; }
    .content h2 {
      margin: 0 0 12px;
      font-size: 22px; font-weight: 800;
      color: #0f172a; letter-spacing: -0.4px; line-height: 1.3;
    }
    .content p {
      margin: 0 0 16px;
      font-size: 15px; color: #475569; line-height: 1.7;
    }
    .content p strong { color: #0f172a; }

    /* Primary button */
    .btn-primary {
      display: inline-block;
      background: #0f172a;
      color: #ffffff !important;
      font-size: 14px; font-weight: 700;
      padding: 14px 28px;
      border-radius: 10px;
      text-decoration: none;
      letter-spacing: 0.2px;
      margin-top: 8px;
    }
    .btn-primary:hover { background: #1e293b; }

    /* OTP box */
    .otp-box {
      font-size: 36px; font-weight: 900;
      letter-spacing: 14px;
      color: #0f172a;
      background: #f8fafc;
      border: 2px dashed #e2e8f0;
      border-radius: 12px;
      padding: 20px 24px;
      text-align: center;
      margin: 20px 0;
      font-family: 'Courier New', Courier, monospace;
    }

    /* Info table */
    .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .info-table td { padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #475569; vertical-align: top; }
    .info-table td:first-child { font-weight: 700; color: #0f172a; width: 40%; padding-right: 12px; }
    .info-table tr:last-child td { border-bottom: none; }

    /* Alert box */
    .alert-box {
      background: #fef9c3;
      border: 1px solid #fde68a;
      border-radius: 10px;
      padding: 16px 20px;
      margin: 20px 0;
      font-size: 14px;
      color: #92400e;
    }

    /* Password box */
    .password-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px 20px;
      margin: 12px 0 20px;
      font-size: 20px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: 2px;
      font-family: 'Courier New', Courier, monospace;
      word-break: break-all;
    }

    /* Link fallback */
    .link-fallback {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 12px;
      color: #7c3aed;
      word-break: break-all;
      margin-top: 8px;
    }

    /* Badge pill */
    .badge {
      display: inline-block;
      background: #f5f3ff;
      border: 1px solid #ede9fe;
      color: #7c3aed;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 99px;
      letter-spacing: 0.3px;
      margin-bottom: 16px;
    }

    /* Divider */
    .divider { height: 1px; background: #f1f5f9; margin: 24px 0; }

    /* Footer */
    .footer {
      background: #f8fafc;
      border-top: 1px solid #e5e7eb;
      padding: 20px 32px;
      text-align: center;
    }
    .footer p { margin: 0 0 6px; font-size: 12px; color: #94a3b8; line-height: 1.6; }
    .footer a { color: #7c3aed; text-decoration: none; font-weight: 600; }
    .footer a:hover { text-decoration: underline; }
    .footer-brand { font-weight: 700; color: #475569; font-size: 12px; }

    /* Responsive */
    @media only screen and (max-width: 600px) {
      .content { padding: 24px 20px 20px !important; }
      .header  { padding: 20px !important; }
      .footer  { padding: 16px 20px !important; }
      .otp-box { font-size: 28px !important; letter-spacing: 10px !important; }
      .content h2 { font-size: 19px !important; }
    }
  </style>
</head>
<body>
  ${previewText ? `<!-- Preview text --><div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${previewText}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ""}
  <div class="wrapper">
    <div class="container">

      <!-- HEADER -->
      <div class="header">
        <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}" class="header-logo-box" style="text-decoration:none;">
          <!-- Git-branch SVG icon -->
          <div class="header-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="6" y1="3" x2="6" y2="15"></line>
              <circle cx="18" cy="6" r="3"></circle>
              <circle cx="6" cy="18" r="3"></circle>
              <path d="M18 9a9 9 0 0 1-9 9"></path>
            </svg>
          </div>
          <span class="header-name">Github<span>24</span></span>
        </a>
      </div>

      <!-- GRADIENT BAR -->
      <div class="gradient-bar"></div>

      <!-- BODY -->
      <div class="content">
        ${content}
      </div>

      <!-- FOOTER -->
      <div class="footer">
        <p>You received this email because an action was taken on your <strong>Github24</strong> account.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <div class="divider" style="margin:12px 0;"></div>
        <p class="footer-brand">
          © ${new Date().getFullYear()} Github24 · Powered by
          <a href="https://drakilo.com" target="_blank" rel="noopener noreferrer">Drakilo Team</a>
        </p>
      </div>

    </div>
  </div>
</body>
</html>`;

/* ─────────────────────────────────────────────────────────────
   1. OTP VERIFICATION EMAIL
   Triggered: email verification via OTP code
───────────────────────────────────────────────────────────── */
export const getOtpHtml = ({
  email,
  otp,
  expiresInMinutes = 5,
}: {
  email: string;
  otp: string;
  expiresInMinutes?: number;
}) => {
  const content = `
    <div class="badge">🔐 Email Verification</div>
    <h2>Your verification code</h2>
    <p>Hi there! Enter the code below to verify your Github24 account.</p>
    <p>Account: <strong>${email}</strong></p>

    <div class="otp-box">${otp}</div>

    <p style="font-size:13px;color:#94a3b8;">
      This code expires in <strong style="color:#0f172a;">${expiresInMinutes} minutes</strong>.
      Do not share it with anyone.
    </p>

    <div class="divider"></div>
    <p style="font-size:13px;color:#94a3b8;margin:0;">
      Didn't request this? No action is needed — your account is safe.
    </p>
  `;

  return baseEmailTemplate({
    title: "OTP Verification",
    previewText: `Your Github24 verification code is ${otp}`,
    content,
  });
};

/* ─────────────────────────────────────────────────────────────
   2. VERIFY EMAIL (LINK-BASED)
   Triggered: after sign-up, resend verify email
───────────────────────────────────────────────────────────── */
export const getVerifyEmailHtml = ({
  email,
  fixedUrl,
}: {
  email: string;
  fixedUrl: string;
}) => {
  const baseUrl   = process.env.FRONTEND_URL || "http://localhost:3000";
  const verifyUrl = `${baseUrl}${fixedUrl}`;

  const content = `
    <div class="badge">✉️ Confirm your email</div>
    <h2>Welcome to Github24!</h2>
    <p>
      Hi <strong>${email}</strong> 👋<br/>
      Thanks for signing up. Tap the button below to verify your email address
      and activate your account.
    </p>

    <p style="text-align:center;margin:28px 0;">
      <a href="${verifyUrl}" class="btn-primary">Verify My Email →</a>
    </p>

    <div class="divider"></div>

    <p style="font-size:13px;color:#94a3b8;">
      Button not working? Copy and paste this link into your browser:
    </p>
    <div class="link-fallback">${verifyUrl}</div>

    <div class="divider"></div>
    <p style="font-size:13px;color:#94a3b8;margin:0;">
      This link expires in <strong style="color:#0f172a;">24 hours</strong>.
      If you didn't create a Github24 account, you can safely ignore this email.
    </p>
  `;

  return baseEmailTemplate({
    title: "Verify Your Email",
    previewText: "Verify your Github24 account to get started.",
    content,
  });
};

/* ─────────────────────────────────────────────────────────────
   3. PASSWORD RESET EMAIL
   Triggered: POST /request-password-reset
───────────────────────────────────────────────────────────── */
export const getPasswordResetHtml = ({
  email,
  resetToken,
  expiresInMinutes = 30,
}: {
  email: string;
  resetToken: string;
  expiresInMinutes?: number;
}) => {
  const baseUrl  = process.env.FRONTEND_URL || "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password/${resetToken}`;

  const content = `
    <div class="badge">🔑 Password Reset</div>
    <h2>Reset your password</h2>
    <p>
      Hi <strong>${email}</strong>,<br/>
      We received a request to reset the password for your Github24 account.
      Click the button below to choose a new one.
    </p>

    <p style="text-align:center;margin:28px 0;">
      <a href="${resetUrl}" class="btn-primary">Reset My Password →</a>
    </p>

    <div class="divider"></div>

    <p style="font-size:13px;color:#94a3b8;">
      Button not working? Copy and paste this link:
    </p>
    <div class="link-fallback">${resetUrl}</div>

    <div class="divider"></div>
    <p style="font-size:13px;color:#94a3b8;margin:0;">
      This link expires in <strong style="color:#0f172a;">${expiresInMinutes} minutes</strong>.
      If you didn't request a password reset, please ignore this email —
      your password will remain unchanged.
    </p>
  `;

  return baseEmailTemplate({
    title: "Reset Your Password",
    previewText: "Reset your Github24 account password.",
    content,
  });
};

/* ─────────────────────────────────────────────────────────────
   4. WELCOME EMAIL (post email-verification)
   Triggered: after successful email verification
───────────────────────────────────────────────────────────── */
export const getWelcomeHtml = ({
  name,
  email,
}: {
  name: string;
  email: string;
}) => {
  const dashboardUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard`;

  const content = `
    <div class="badge">🚀 You're in!</div>
    <h2>Welcome to Github24, ${name}!</h2>
    <p>
      Your account (<strong>${email}</strong>) is verified and ready to go.
      Here's what you can do right now:
    </p>

    <table class="info-table">
      <tr>
        <td>⭐ Monitor Stars</td>
        <td>Track every new star on your repos in real time.</td>
      </tr>
      <tr>
        <td>🍴 Track Forks</td>
        <td>See who forks your projects and when.</td>
      </tr>
      <tr>
        <td>🔔 Telegram Alerts</td>
        <td>Get instant push notifications via Telegram.</td>
      </tr>
      <tr>
        <td>📊 Analytics</td>
        <td>Charts, trends and contributor insights — all free.</td>
      </tr>
    </table>

    <p style="text-align:center;margin:28px 0;">
      <a href="${dashboardUrl}" class="btn-primary">Go to Dashboard →</a>
    </p>

    <div class="divider"></div>
    <p style="font-size:13px;color:#94a3b8;margin:0;">
      Need help? Reply to this email or visit
      <a href="https://drakilo.com" style="color:#7c3aed;font-weight:600;">drakilo.com</a>.
    </p>
  `;

  return baseEmailTemplate({
    title: "Welcome to Github24",
    previewText: `Welcome ${name}! Your Github24 account is ready.`,
    content,
  });
};

/* ─────────────────────────────────────────────────────────────
   5. GITHUB APP CONNECTED EMAIL
   Triggered: after user installs the GitHub App
───────────────────────────────────────────────────────────── */
export const getGithubConnectedHtml = ({
  name,
  githubUsername,
  repoCount,
}: {
  name: string;
  githubUsername: string;
  repoCount: number;
}) => {
  const dashboardUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard/repositories`;

  const content = `
    <div class="badge">✅ GitHub Connected</div>
    <h2>GitHub App installed!</h2>
    <p>Hi <strong>${name}</strong>, your GitHub account is now connected to Github24.</p>

    <table class="info-table">
      <tr>
        <td>GitHub Account</td>
        <td><strong>@${githubUsername}</strong></td>
      </tr>
      <tr>
        <td>Repos Available</td>
        <td><strong>${repoCount} repositories</strong></td>
      </tr>
      <tr>
        <td>Status</td>
        <td><strong style="color:#16a34a;">✓ Active monitoring</strong></td>
      </tr>
    </table>

    <p>
      Head to your dashboard to select which repos to monitor and connect
      your Telegram for real-time alerts.
    </p>

    <p style="text-align:center;margin:28px 0;">
      <a href="${dashboardUrl}" class="btn-primary">Manage Repositories →</a>
    </p>

    <div class="divider"></div>
    <p style="font-size:13px;color:#94a3b8;margin:0;">
      You can revoke Github24's access at any time from your
      GitHub account settings under <em>Installed GitHub Apps</em>.
    </p>
  `;

  return baseEmailTemplate({
    title: "GitHub Connected",
    previewText: `GitHub connected! ${repoCount} repos are now available to monitor.`,
    content,
  });
};

/* ─────────────────────────────────────────────────────────────
   6. TELEGRAM CONNECTED EMAIL
   Triggered: after user links their Telegram account
───────────────────────────────────────────────────────────── */
export const getTelegramConnectedHtml = ({
  name,
  telegramUsername,
}: {
  name: string;
  telegramUsername: string;
}) => {
  const dashboardUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard/notifications`;

  const content = `
    <div class="badge">✈️ Telegram Linked</div>
    <h2>Telegram is connected!</h2>
    <p>
      Hi <strong>${name}</strong>! Your Telegram account
      <strong>@${telegramUsername}</strong> is now linked to Github24.
    </p>
    <p>
      You'll start receiving real-time alerts for all monitored events —
      stars, forks, issues, PRs, releases and more — delivered in under 3 seconds.
    </p>

    <div class="alert-box">
      💡 <strong>Pro tip:</strong> You can mute specific repos or event types
      directly from the Telegram bot at any time.
    </div>

    <p style="text-align:center;margin:28px 0;">
      <a href="${dashboardUrl}" class="btn-primary">Manage Notifications →</a>
    </p>

    <div class="divider"></div>
    <p style="font-size:13px;color:#94a3b8;margin:0;">
      Didn't link Telegram yourself? Disconnect it immediately from your
      <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard/settings" style="color:#7c3aed;font-weight:600;">account settings</a>.
    </p>
  `;

  return baseEmailTemplate({
    title: "Telegram Connected",
    previewText: "Telegram linked! You'll now get instant Github24 alerts.",
    content,
  });
};

/* ─────────────────────────────────────────────────────────────
   7. SUBSCRIPTION / PLAN UPGRADE EMAIL
   Triggered: when a user upgrades to Pro or Team
───────────────────────────────────────────────────────────── */
export const getSubscriptionHtml = ({
  name,
  email,
  planName,
  paymentMethod,
  activatedAt,
  expiryDate,
}: {
  name: string;
  email: string;
  planName: string;
  paymentMethod: string;
  activatedAt: string | Date;
  expiryDate: string | Date;
}) => {
  const dashboardUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard`;

  const content = `
    <div class="badge">🎉 Plan Activated</div>
    <h2>Your ${planName} plan is active!</h2>
    <p>Hi <strong>${name}</strong>, thanks for upgrading your Github24 account.</p>

    <table class="info-table">
      <tr><td>Account</td>      <td>${email}</td></tr>
      <tr><td>Plan</td>         <td><strong>${planName}</strong></td></tr>
      <tr><td>Payment</td>      <td>${paymentMethod}</td></tr>
      <tr><td>Activated On</td> <td>${new Date(activatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</td></tr>
      <tr><td>Renews / Expires</td><td>${new Date(expiryDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</td></tr>
    </table>

    <p style="text-align:center;margin:28px 0;">
      <a href="${dashboardUrl}" class="btn-primary">Go to Dashboard →</a>
    </p>

    <div class="divider"></div>
    <p style="font-size:13px;color:#94a3b8;margin:0;">
      Questions about billing? Contact us at
      <a href="https://drakilo.com" style="color:#7c3aed;font-weight:600;">drakilo.com</a>.
    </p>
  `;

  return baseEmailTemplate({
    title: `${planName} Plan Activated`,
    previewText: `Your Github24 ${planName} plan is now active!`,
    content,
  });
};

/* ─────────────────────────────────────────────────────────────
   EXPORTS
───────────────────────────────────────────────────────────── */
export default {
  getOtpHtml,
  getVerifyEmailHtml,
  getPasswordResetHtml,
  getWelcomeHtml,
  getGithubConnectedHtml,
  getTelegramConnectedHtml,
  getSubscriptionHtml,
};