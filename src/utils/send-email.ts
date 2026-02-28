import { Resend } from 'resend';
import 'dotenv/config';

export const sendEmail = async (
  user: {
    email: string;
    subject: string;
    html: string;
  },
) => {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error('RESEND_API_KEY not defined');
  }

  const resend = new Resend(apiKey);

  const { data, error } = await resend.emails.send({
    from: 'Find Decisions <onboarding@resend.dev>',
    to: [user.email],
    subject: user.subject,
    html: user.html,
  });

  if (error) {
    console.error(`Error from Resend: ${JSON.stringify(error)}`);
    return;
  }

  console.log(`Email sent: ${JSON.stringify(data)}`);
};