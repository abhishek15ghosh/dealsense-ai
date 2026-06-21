import User from '@/models/User';
import dbConnect from '@/lib/mongodb';
import { IAlert } from '@/models/Alert';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'mock';
const EMAIL_FROM = process.env.EMAIL_FROM || 'DealSense AI <onboarding@resend.dev>';

// In production, validate configuration to prevent silent email failure
if (EMAIL_PROVIDER === 'resend' && !RESEND_API_KEY) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('RESEND_API_KEY environment variable is missing for email provider "resend". Please configure RESEND_API_KEY in your production configuration.');
  } else {
    console.warn('Warning: EMAIL_PROVIDER is set to "resend" but RESEND_API_KEY is missing. Falling back to mock mode for development.');
  }
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
  const isMockMode = EMAIL_PROVIDER === 'mock' || !RESEND_API_KEY;

  if (isMockMode) {
    console.log(`[MOCK EMAIL SENT]
=========================================
TO:      ${to}
FROM:    ${EMAIL_FROM}
SUBJECT: ${subject}
BODY:
${html}
=========================================`);
    return true;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [to],
        subject,
        html
      })
    });

    const resData = await response.json();
    if (response.ok) {
      console.log(`[RESEND EMAIL SENT] ID: ${resData.id} to ${to}`);
      return true;
    } else {
      console.error('[RESEND EMAIL ERROR]:', resData);
      return false;
    }
  } catch (error) {
    console.error('[RESEND EMAIL FETCH EXCEPTION]:', error);
    return false;
  }
}

export async function sendWelcomeEmail(email: string, name: string): Promise<boolean> {
  const subject = "Welcome to DealSense AI";
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #2563eb; margin-bottom: 20px;">Welcome to DealSense AI!</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Thank you for signing up for DealSense AI. You are now equipped with real-time price tracking, historical pricing trends, and AI-driven deal analysis.</p>
      <p>Start tracking your favorite gadgets and set target price alerts to never miss a drop.</p>
      <p style="margin-top: 30px;">
        <a href="http://localhost:3000/dashboard" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Go to Dashboard</a>
      </p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-top: 40px; margin-bottom: 20px;" />
      <p style="font-size: 12px; color: #64748b;">DealSense AI &bull; Intelligent Retail Price Comparison & Alerts</p>
    </div>
  `;
  return await sendEmail({ to: email, subject, html });
}

export async function sendPriceTargetReachedEmail(alert: IAlert, currentPrice: number): Promise<boolean> {
  try {
    await dbConnect();
    // 1. Fetch user to check preference
    const user = await User.findOne({ email: alert.userEmail });
    if (user && user.emailAlertsEnabled === false) {
      console.log(`[EMAIL BYPASSED] User ${alert.userEmail} has email alerts disabled.`);
      return false;
    }

    const subject = "DealSense Alert: Your target price was reached";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const productLink = `${appUrl}/product/${alert.productId}`;

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #10b981; margin-bottom: 20px;">Price Target Reached! 🎉</h2>
        <p>Great news! An item on your alert list has reached your target price.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #475569;">Product:</td>
            <td style="padding: 8px 0; color: #0f172a;">${alert.productName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #475569;">Platform:</td>
            <td style="padding: 8px 0; color: #0f172a;">${alert.storeName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #475569;">Target Price:</td>
            <td style="padding: 8px 0; color: #0f172a; font-weight: bold;">₹${alert.targetPrice.toLocaleString('en-IN')}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #475569;">Current Price:</td>
            <td style="padding: 8px 0; color: #10b981; font-weight: bold; font-size: 16px;">₹${currentPrice.toLocaleString('en-IN')}</td>
          </tr>
        </table>

        <p style="margin-top: 30px;">
          <a href="${productLink}" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">View Deal</a>
        </p>
        
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-top: 40px; margin-bottom: 20px;" />
        <p style="font-size: 11px; color: #64748b;">
          You received this email because you set a price alert on DealSense AI. 
          To stop receiving these alerts, you can update your email preferences in settings.
        </p>
      </div>
    `;

    const success = await sendEmail({ to: alert.userEmail, subject, html });
    if (success) {
      alert.emailSentAt = new Date();
      await alert.save();
    }
    return success;
  } catch (error) {
    console.error('Error sending price target email:', error);
    return false;
  }
}
