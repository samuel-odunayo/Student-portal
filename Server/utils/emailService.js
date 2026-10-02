const nodemailer = require('nodemailer');

let cachedTransporter = null;


const getTransporter = () => {
  if (cachedTransporter) return cachedTransporter;

  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  const emailService = process.env.EMAIL_SERVICE;
  const emailHost = process.env.EMAIL_HOST;

  if (emailUser && emailPass) {
    if (emailService === 'gmail' || emailHost === 'smtp.gmail.com') {
      cachedTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: emailPass
        }
      });
      return cachedTransporter;
    }

    if (emailHost) {
      cachedTransporter = nodemailer.createTransport({
        host: emailHost,
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: emailUser,
          pass: emailPass
        }
      });
      return cachedTransporter;
    }
  }

  return null;
};

// Check email configuration status on startup
const verifyEmailConfig = async () => {
  const transporter = getTransporter();
  if (transporter) {
    try {
      await transporter.verify();
      console.log('[EMAIL] SMTP connected successfully! Real emails are ACTIVE.');
    } catch (err) {
      console.warn('[EMAIL] SMTP connection warning:', err.message);
      console.warn('[EMAIL] Emails will fallback to server console until credentials are authenticated.');
    }
  } else {
    console.log('[EMAIL] No SMTP credentials in .env. Notifications will be displayed in console.');
    console.log('[EMAIL] To enable real delivery, set EMAIL_SERVICE=gmail, EMAIL_USER, and EMAIL_PASS in Server/.env');
  }
};

const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = getTransporter();

  if (transporter) {
    try {
      const fromAddress = process.env.EMAIL_FROM || `"Student Admission Portal" <${process.env.EMAIL_USER}>`;
      const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        text,
        html
      });
      console.log(`[Email Sent] Successfully delivered to ${to} (Message ID: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`[Email Error] Failed delivering to ${to}:`, error.message);
      // Fall through to console log fallback so registration/action still proceeds seamlessly
    }
  }

  // Development fallback: Log email clearly to console
  console.log('\n======================== [PORTAL EMAIL NOTIFICATION] ========================');
  console.log(`To:      ${to}`);
  console.log(`Subject: ${subject}`);
  console.log('----------------------------------------------------------------------------');
  console.log(text || html.replace(/<[^>]+>/g, ' '));
  console.log('============================================================================\n');
  return { success: true, loggedToConsole: true };
};

// 1. Registration Confirmation with Generated Temporary Password
const sendRegistrationEmail = async ({ to, studentName, email, temporaryPassword, loginUrl }) => {
  const subject = 'Welcome to Student Portal - Your Application & Login Credentials';
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0d6efd; color: #ffffff; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">Student Admission Portal</h2>
      </div>
      <div style="padding: 24px;">
        <p>Dear <strong>${studentName}</strong>,</p>
        <p>Congratulations! Your admission registration has been successfully received.</p>
        <div style="background-color: #f8fafc; border-left: 4px solid #0d6efd; padding: 16px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #0d6efd;">Your Portal Login Credentials</h4>
          <p style="margin: 4px 0;"><strong>Login Email:</strong> ${email}</p>
          <p style="margin: 4px 0;"><strong>Temporary Password:</strong> <code style="font-size: 16px; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; color: #0f172a;">${temporaryPassword}</code></p>
        </div>
        <p style="color: #0369a1; background: #f0f9ff; border: 1px solid #bae6fd; padding: 12px; border-radius: 6px;">
          <strong>Security Notice:</strong> You can update this temporary password from your student dashboard.
        </p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" style="background-color: #0d6efd; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Login to Your Portal</a>
        </p>
        <p style="font-size: 13px; color: #64748b;">If the button does not work, copy and paste this link into your browser:<br>${loginUrl}</p>
      </div>
      <div style="background-color: #f1f5f9; padding: 12px; text-align: center; font-size: 12px; color: #64748b;">
        &copy; ${new Date().getFullYear()} Student Admission Portal. All rights reserved.
      </div>
    </div>
  `;

  const text = `
Welcome to Student Portal, ${studentName}!

Your registration was received successfully.
Your Portal Login Credentials:
- Login Email: ${email}
- Temporary Password: ${temporaryPassword}

Login to your dashboard here: ${loginUrl}
  `;

  return sendEmail({ to, subject, html, text });
};

// 2. Login Security Alert
const sendLoginAlertEmail = async ({ to, studentName, loginTime }) => {
  const subject = 'Security Alert: New Login to Your Student Portal';
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
      <div style="background-color: #1e293b; color: #ffffff; padding: 16px 20px;">
        <h3 style="margin: 0;">Portal Security Notification</h3>
      </div>
      <div style="padding: 24px;">
        <p>Hello <strong>${studentName}</strong>,</p>
        <p>A new login was recorded on your Student Portal account at:</p>
        <p style="background: #f1f5f9; padding: 10px 14px; border-radius: 6px; font-weight: bold; color: #0f172a;">
           ${loginTime}
        </p>
        <p>If this was you, no action is required.</p>
        <p style="color: #dc2626; font-size: 13px;">
          If you did not initiate this login, please contact the portal administration immediately to secure your account.
        </p>
      </div>
    </div>
  `;

  const text = `Hello ${studentName},\n\nA new login was recorded on your Student Portal account on ${loginTime}.\nIf this wasn't you, please contact administration immediately.`;
  return sendEmail({ to, subject, html, text });
};

// 3. Admission Status Change Notification
const sendAdmissionStatusEmail = async ({ to, studentName, status, loginUrl }) => {
  const subject = `Admission Status Update: Your Application is ${status}`;
  
  let statusBannerColor = '#0d6efd'; // Pending / default (Portal brand blue, no yellow)
  let statusMessage = 'Your application is currently under review by the admissions committee.';
  
  if (status === 'Approved') {
    statusBannerColor = '#16a34a';
    statusMessage = 'Congratulations! We are delighted to inform you that your application has been APPROVED for admission.';
  } else if (status === 'Rejected') {
    statusBannerColor = '#dc2626';
    statusMessage = 'Thank you for your application. We regret to inform you that we are unable to offer you admission at this time.';
  }

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: ${statusBannerColor}; color: #ffffff; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">Admission Status Update</h2>
      </div>
      <div style="padding: 24px;">
        <p>Dear <strong>${studentName}</strong>,</p>
        <p>${statusMessage}</p>
        <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
          <span style="font-size: 14px; text-transform: uppercase; color: #64748b; font-weight: bold;">Current Decision</span>
          <h2 style="margin: 8px 0; color: ${statusBannerColor};">${status}</h2>
        </div>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" style="background-color: #0d6efd; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Official Details in Portal</a>
        </p>
      </div>
    </div>
  `;

  const text = `Dear ${studentName},\n\nYour application status has been updated to: ${status}.\n\nLog in to your portal to view full details:\n${loginUrl}`;
  return sendEmail({ to, subject, html, text });
};

// 4. Password Reset Notification
const sendPasswordResetEmail = async ({ to, recipientName, temporaryPassword, loginUrl }) => {
  const subject = 'Password Reset - Your Temporary Portal Credentials';
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0d6efd; color: #ffffff; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">Password Reset Request</h2>
      </div>
      <div style="padding: 24px;">
        <p>Hello <strong>${recipientName}</strong>,</p>
        <p>We received a request to reset your password for your Student Admission Portal account.</p>
        <div style="background-color: #f8fafc; border-left: 4px solid #0d6efd; padding: 16px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #0d6efd;">Your Temporary Password</h4>
          <p style="margin: 4px 0;"><strong>Account Email:</strong> ${to}</p>
          <p style="margin: 4px 0;"><strong>Temporary Password:</strong> <code style="font-size: 16px; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; color: #0f172a;">${temporaryPassword}</code></p>
        </div>
        <p style="color: #0369a1; background: #f0f9ff; border: 1px solid #bae6fd; padding: 12px; border-radius: 6px;">
          <strong>Security Notice:</strong> Please sign in using this temporary password and update it to your permanent password from your dashboard.
        </p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" style="background-color: #0d6efd; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Login to Your Portal</a>
        </p>
        <p style="font-size: 12px; color: #64748b;">If you did not request this password reset, please contact portal administration immediately.</p>
      </div>
      <div style="background-color: #f1f5f9; padding: 12px; text-align: center; font-size: 12px; color: #64748b;">
        &copy; ${new Date().getFullYear()} Student Admission Portal. All rights reserved.
      </div>
    </div>
  `;

  const text = `Hello ${recipientName},\n\nWe received a request to reset your password.\nYour temporary password is: ${temporaryPassword}\n\nPlease sign in here: ${loginUrl}\nUpdate your password immediately upon login.`;
  return sendEmail({ to, subject, html, text });
};

module.exports = {
  sendRegistrationEmail,
  sendLoginAlertEmail,
  sendAdmissionStatusEmail,
  sendPasswordResetEmail,
  verifyEmailConfig
};
