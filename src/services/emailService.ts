import User from '@/models/User';
import dbConnect from '@/lib/mongodb';
import { IAlert } from '@/models/Alert';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
  const provider = process.env.EMAIL_PROVIDER || 'mock';
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'DealSense AI <onboarding@resend.dev>';

  // Validate configuration to prevent silent email failure in production
  if (provider === 'resend' && !apiKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('RESEND_API_KEY environment variable is missing for email provider "resend". Please configure RESEND_API_KEY in your production configuration.');
    } else {
      console.warn('Warning: EMAIL_PROVIDER is set to "resend" but RESEND_API_KEY is missing. Falling back to mock mode.');
    }
  }

  const isMockMode = provider === 'mock' || !apiKey;

  if (isMockMode) {
    console.log(`[MOCK EMAIL SENT]
=========================================
TO:      ${to}
FROM:    ${fromEmail}
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
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail,
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
    if (!alert.userEmail) {
      console.log(`[EMAIL BYPASSED] Alert ${alert._id} has no userEmail defined.`);
      return false;
    }
    await dbConnect();
    
    // 1. Fetch user to check preference
    const user = await User.findOne({ email: alert.userEmail });
    if (user && user.emailAlertsEnabled === false) {
      console.log(`[EMAIL BYPASSED] User ${alert.userEmail} has email alerts disabled.`);
      return false;
    }

    // 2. Acquire database lock to prevent duplicate sends (concurrency safe)
    const mongoose = (await import('mongoose')).default;
    const AlertModel = mongoose.models.Alert || mongoose.model('Alert');
    
    const lockedAlert = await AlertModel.findOneAndUpdate(
      { _id: alert._id, emailSentAt: { $exists: false } },
      { $set: { emailSentAt: new Date() } },
      { new: true }
    );

    if (!lockedAlert) {
      console.log(`[EMAIL BYPASSED] Alert ${alert._id} has already been sent or is currently locked.`);
      return false;
    }

    const subject = `DealSense Alert: ${alert.productName || 'Product'} target price reached`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const productLink = `${appUrl}/product/${alert.productId}`;

    // Calculate dynamic price metrics for the email HTML body
    const oldPrice = alert.oldPrice || alert.currentPriceAtSet || alert.targetPrice || currentPrice;
    const newPrice = currentPrice;
    const savings = oldPrice > newPrice ? oldPrice - newPrice : (alert.savings || 0);

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #10b981; margin-bottom: 20px;">Price Target Reached! 🎉</h2>
        <p>Great news! An item on your alert list has reached your target price.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #475569;">Product:</td>
            <td style="padding: 8px 0; color: #0f172a;">${alert.productName || 'Unknown Product'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #475569;">Platform:</td>
            <td style="padding: 8px 0; color: #0f172a;">${alert.storeName || alert.platform || 'Retailer'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #475569;">Original Price:</td>
            <td style="padding: 8px 0; color: #0f172a;">₹${oldPrice.toLocaleString('en-IN')}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #475569;">Current Price:</td>
            <td style="padding: 8px 0; color: #10b981; font-weight: bold; font-size: 16px;">₹${newPrice.toLocaleString('en-IN')}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #475569;">Savings:</td>
            <td style="padding: 8px 0; color: #10b981; font-weight: bold;">₹${savings.toLocaleString('en-IN')}</td>
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
    
    // Store email delivery status in MongoDB
    try {
      const EmailLog = (await import('@/models/EmailLog')).default;
      await EmailLog.create({
        to: alert.userEmail,
        subject,
        alertId: alert._id,
        productId: alert.productId,
        status: success ? 'success' : 'failed',
        sentAt: new Date()
      });
    } catch (logErr) {
      console.error('[Email Service] Failed to create EmailLog record:', logErr);
    }

    if (!success) {
      // Revert database lock so it can be retried on next scheduler run
      await AlertModel.updateOne({ _id: alert._id }, { $unset: { emailSentAt: "" } });
      return false;
    }

    // Sync object in-memory with locked document
    alert.emailSentAt = lockedAlert.emailSentAt;
    return true;

  } catch (error) {
    console.error('Error sending price target email:', error);
    return false;
  }
}
