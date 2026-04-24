const { Resend } = require('resend');

const resendApiKey = process.env.RESEND_API_KEY;
const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

const getResendClient = () => {
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  return new Resend(resendApiKey);
};

const sendRegistrationOtpEmail = async ({ email, username, otp }) => {
  const resend = getResendClient();

  await resend.emails.send({
    from: resendFromEmail,
    to: email,
    subject: 'Verify your File Sharing account',
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <p>Hello ${username},</p>
        <p>Your verification code for File Sharing Platform is:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 0.24em; margin: 20px 0;">${otp}</p>
        <p>This code expires in 10 minutes.</p>
      </div>
    `,
  });
};

module.exports = {
  sendRegistrationOtpEmail,
};
