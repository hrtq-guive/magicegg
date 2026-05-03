import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendMagicLink(email: string, eggId: string, token: string) {
  // Use a reliable base URL. Fallback to localhost for local testing.
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://magiceggs.netlify.app';
  const magicLink = `${baseUrl}/api/verify?token=${token}&id=${eggId}`;

  try {
    const { data, error } = await resend.emails.send({
      from: 'magiceggs <onboarding@resend.dev>', // You should verify your domain in Resend for custom from address
      to: [email],
      subject: 'Unlock your Chaosbox Egg',
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h1 style="font-size: 24px; color: #111;">Your magic link is ready</h1>
          <p style="color: #666; line-height: 1.6;">Someone is trying to open a Chaosbox egg and needs your verification.</p>
          <a href="${magicLink}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px;">Verify Participation</a>
          <p style="margin-top: 30px; font-size: 12px; color: #999;">If you didn't expect this, you can ignore this email.</p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Email sending failed:', err);
    return { success: false, error: err };
  }
}
