import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = process.env.EMAIL_FROM || 'Quotr <noreply@quotr.app>';
const BRAND_NAME = process.env.EMAIL_BRAND_NAME || 'Quotr';
const BRAND_COLOR = process.env.EMAIL_BRAND_COLOR || '#0A7EA4';

const baseStyles = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
  color: #1f2937;
`;

const buttonStyles = `
  display: inline-block;
  background-color: ${BRAND_COLOR};
  color: white;
  padding: 14px 28px;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 16px;
`;

const footerStyles = `
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
  color: #6b7280;
  font-size: 14px;
`;

function getEmailTemplate(content: string, preheader: string = ''): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quotr</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6;">
  <!-- Preheader text (hidden but shows in email previews) -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${preheader}
  </div>
  
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
          <tr>
            <td style="background: linear-gradient(135deg, ${BRAND_COLOR} 0%, ${BRAND_COLOR}DD 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700; ${baseStyles}">
                ${BRAND_NAME}
              </h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                Business Management Made Simple
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px; ${baseStyles}">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; ${footerStyles}">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">
                This email was sent by ${BRAND_NAME}, your business management platform.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                If you didn't request this email, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Legal footer -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin-top: 24px;">
          <tr>
            <td align="center" style="color: #9ca3af; font-size: 12px; ${baseStyles}">
              <p style="margin: 0;">
                ${BRAND_NAME} - Invoicing & Business Intelligence for Irish Tradespeople
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

export async function sendVerificationEmail(email: string, token: string, companyName?: string): Promise<boolean> {
  if (!resend) {
    console.log('[Email] Resend not configured. Verification token:', token);
    return false;
  }

  const verificationUrl = `${process.env.EXPO_PUBLIC_DOMAIN || 'https://quotr.app'}/verify?token=${token}`;

  const content = `
    <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px; font-weight: 600;">
      Verify Your Email
    </h2>
    
    <p style="margin: 0 0 24px; color: #4b5563;">
      Welcome to Quotr${companyName ? ` for ${companyName}` : ''}! Please verify your email address to get started with your business management platform.
    </p>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="${verificationUrl}" style="${buttonStyles}">
        Verify Email Address
      </a>
    </div>
    
    <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px;">
      Or copy and paste this link into your browser:
    </p>
    <p style="margin: 8px 0 0; word-break: break-all; color: #0A7EA4; font-size: 14px;">
      ${verificationUrl}
    </p>
    
    <p style="margin: 24px 0 0; color: #9ca3af; font-size: 13px;">
      This link expires in 24 hours.
    </p>
  `;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Verify your Quotr account',
      html: getEmailTemplate(content, 'Verify your email to start using Quotr'),
    });

    if (error) {
      console.error('[Email] Failed to send verification email:', error);
      return false;
    }

    console.log('[Email] Verification email sent to:', email);
    return true;
  } catch (error) {
    console.error('[Email] Error sending verification email:', error);
    return false;
  }
}

export async function sendWelcomeEmail(email: string, companyName?: string): Promise<boolean> {
  if (!resend) {
    console.log('[Email] Resend not configured. Welcome email skipped for:', email);
    return false;
  }

  const loginUrl = `${process.env.EXPO_PUBLIC_DOMAIN || 'https://quotr.app'}`;

  const content = `
    <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px; font-weight: 600;">
      Welcome to Quotr!
    </h2>
    
    <p style="margin: 0 0 24px; color: #4b5563;">
      Your email has been verified and your account${companyName ? ` for ${companyName}` : ''} is now active. You're all set to start managing your business more efficiently.
    </p>
    
    <div style="background-color: #f0fdfa; border-radius: 8px; padding: 24px; margin: 24px 0;">
      <h3 style="margin: 0 0 16px; color: #0A7EA4; font-size: 16px; font-weight: 600;">
        Get Started with Quotr:
      </h3>
      <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
        <li style="margin-bottom: 8px;">Create and send professional invoices</li>
        <li style="margin-bottom: 8px;">Track expenses and scan receipts</li>
        <li style="margin-bottom: 8px;">Manage clients and quotes</li>
        <li style="margin-bottom: 8px;">Generate VAT and financial reports</li>
        <li style="margin-bottom: 0;">Track time with GPS verification</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="${loginUrl}" style="${buttonStyles}">
        Open Quotr
      </a>
    </div>
    
    <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px;">
      Need help getting started? Check out our quick start guide or contact our support team.
    </p>
  `;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Welcome to Quotr - Your account is ready!',
      html: getEmailTemplate(content, 'Your Quotr account is now active'),
    });

    if (error) {
      console.error('[Email] Failed to send welcome email:', error);
      return false;
    }

    console.log('[Email] Welcome email sent to:', email);
    return true;
  } catch (error) {
    console.error('[Email] Error sending welcome email:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
  if (!resend) {
    console.log('[Email] Resend not configured. Password reset token:', token);
    return false;
  }

  const resetUrl = `${process.env.EXPO_PUBLIC_DOMAIN || 'https://quotr.app'}/reset-password?token=${token}`;

  const content = `
    <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px; font-weight: 600;">
      Reset Your Password
    </h2>
    
    <p style="margin: 0 0 24px; color: #4b5563;">
      We received a request to reset your password. Click the button below to create a new password.
    </p>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="${resetUrl}" style="${buttonStyles}">
        Reset Password
      </a>
    </div>
    
    <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px;">
      Or copy and paste this link into your browser:
    </p>
    <p style="margin: 8px 0 0; word-break: break-all; color: #0A7EA4; font-size: 14px;">
      ${resetUrl}
    </p>
    
    <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        <strong>Security Notice:</strong> This link expires in 1 hour. If you didn't request a password reset, please ignore this email or contact support if you're concerned about your account security.
      </p>
    </div>
  `;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Reset your Quotr password',
      html: getEmailTemplate(content, 'Reset your Quotr password'),
    });

    if (error) {
      console.error('[Email] Failed to send password reset email:', error);
      return false;
    }

    console.log('[Email] Password reset email sent to:', email);
    return true;
  } catch (error) {
    console.error('[Email] Error sending password reset email:', error);
    return false;
  }
}

export async function sendTeamInviteEmail(
  email: string,
  inviterName: string,
  organizationName: string,
  inviteCode: string,
  role: string
): Promise<boolean> {
  if (!resend) {
    console.log('[Email] Resend not configured. Invite code:', inviteCode);
    return false;
  }

  const inviteUrl = `${process.env.EXPO_PUBLIC_DOMAIN || 'https://quotr.app'}/join?code=${inviteCode}`;

  const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1);

  const content = `
    <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px; font-weight: 600;">
      You're Invited to Join ${organizationName}
    </h2>
    
    <p style="margin: 0 0 24px; color: #4b5563;">
      ${inviterName} has invited you to join <strong>${organizationName}</strong> on Quotr as a <strong>${roleDisplay}</strong>.
    </p>
    
    <div style="background-color: #f0fdfa; border-radius: 8px; padding: 24px; margin: 24px 0;">
      <p style="margin: 0; color: #4b5563; font-size: 14px;">
        <strong>Organization:</strong> ${organizationName}<br/>
        <strong>Your Role:</strong> ${roleDisplay}<br/>
        <strong>Invited by:</strong> ${inviterName}
      </p>
    </div>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="${inviteUrl}" style="${buttonStyles}">
        Accept Invitation
      </a>
    </div>
    
    <p style="margin: 24px 0 0; color: #9ca3af; font-size: 13px;">
      This invitation expires in 7 days.
    </p>
  `;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `You're invited to join ${organizationName} on Quotr`,
      html: getEmailTemplate(content, `${inviterName} invited you to join ${organizationName}`),
    });

    if (error) {
      console.error('[Email] Failed to send invite email:', error);
      return false;
    }

    console.log('[Email] Team invite email sent to:', email);
    return true;
  } catch (error) {
    console.error('[Email] Error sending invite email:', error);
    return false;
  }
}

export function isEmailConfigured(): boolean {
  return !!resend;
}

export async function sendPasswordChangeEmail(email: string): Promise<boolean> {
  if (!resend) {
    console.log('[Email] Resend not configured. Password change notification skipped for:', email);
    return false;
  }

  const contactUrl = `${process.env.EXPO_PUBLIC_DOMAIN || 'https://quotr.app'}/contact`;

  const content = `
    <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px; font-weight: 600;">
      Password Changed Successfully
    </h2>
    
    <p style="margin: 0 0 24px; color: #4b5563;">
      The password for your Quotr account has been successfully changed.
    </p>
    
    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0; color: #4b5563; font-size: 14px;">
        If you did not make this change, please contact support immediately to secure your account.
      </p>
    </div>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="${contactUrl}" style="${buttonStyles}">
        Contact Support
      </a>
    </div>
  `;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Your Quotr password has been changed',
      html: getEmailTemplate(content, 'Security notification: Password changed'),
    });

    if (error) {
      console.error('[Email] Failed to send password change email:', error);
      return false;
    }

    console.log('[Email] Password change email sent to:', email);
    return true;
  } catch (error) {
    console.error('[Email] Error sending password change email:', error);
    return false;
  }
}

export async function sendMigrationRequestEmail(email: string, details: string): Promise<boolean> {
  if (!resend) {
    console.log('[Email] Resend not configured. Migration request skipped for:', email);
    return false;
  }

  const content = `
    <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 24px; font-weight: 600;">
      Data Migration Request Received
    </h2>
    
    <p style="margin: 0 0 24px; color: #4b5563;">
      We have received your request for data migration. Our support team will review your request and get back to you shortly.
    </p>
    
    <div style="background-color: #f0fdfa; border-radius: 8px; padding: 24px; margin: 24px 0;">
      <h3 style="margin: 0 0 16px; color: #0A7EA4; font-size: 16px; font-weight: 600;">
        Request Details:
      </h3>
      <p style="margin: 0; color: #4b5563; font-size: 14px; white-space: pre-wrap;">
        ${details}
      </p>
    </div>
    
    <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px;">
      Ticket Reference: #MIG-${Date.now().toString().slice(-6)}
    </p>
  `;

  try {
    // Send confirmation to user
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Data Migration Request Received',
      html: getEmailTemplate(content, 'We received your migration request'),
    });

    // In a real app, you might also send a notification to admins here

    console.log('[Email] Migration request email sent to:', email);
    return true;
  } catch (error) {
    console.error('[Email] Error sending migration request email:', error);
    return false;
  }
}
