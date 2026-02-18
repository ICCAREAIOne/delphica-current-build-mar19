import nodemailer from 'nodemailer';

// Email configuration from environment variables
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587');
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = process.env.EMAIL_PASS || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@physician-portal.com';

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter && EMAIL_USER && EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_PORT === 465,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });
  }
  return transporter;
}

// Email templates
export const emailTemplates = {
  intakeInvitation: {
    subject: 'Complete Your Pre-Visit Health Assessment',
    html: (data: { patientName: string; intakeLink: string; physicianName: string }) => `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Pre-Visit Health Assessment</h1>
          </div>
          <div class="content">
            <p>Dear ${data.patientName},</p>
            
            <p>Thank you for scheduling your appointment with Dr. ${data.physicianName}. To help us provide you with the best possible care, please complete a brief health assessment before your visit.</p>
            
            <p>This assessment will take approximately 5-10 minutes and will help us understand your current health concerns, symptoms, and medical history.</p>
            
            <p style="text-align: center;">
              <a href="${data.intakeLink}" class="button">Start Health Assessment</a>
            </p>
            
            <p>Or copy and paste this link into your browser:<br>
            <a href="${data.intakeLink}">${data.intakeLink}</a></p>
            
            <p><strong>What to expect:</strong></p>
            <ul>
              <li>Answer questions about your current symptoms</li>
              <li>Provide your medical history and current medications</li>
              <li>Share any allergies or health concerns</li>
              <li>Use voice input or typing - whichever you prefer</li>
            </ul>
            
            <p>Your responses will be securely stored and reviewed by Dr. ${data.physicianName} before your appointment.</p>
            
            <p>If you have any questions, please don't hesitate to contact our office.</p>
            
            <p>Best regards,<br>
            ${data.physicianName}'s Office</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },
  
  intakeReminder: {
    subject: 'Reminder: Complete Your Health Assessment',
    html: (data: { patientName: string; intakeLink: string; physicianName: string; appointmentDate?: string }) => `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background-color: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Health Assessment Reminder</h1>
          </div>
          <div class="content">
            <p>Dear ${data.patientName},</p>
            
            <p>This is a friendly reminder to complete your pre-visit health assessment before your upcoming appointment${data.appointmentDate ? ` on ${data.appointmentDate}` : ''} with Dr. ${data.physicianName}.</p>
            
            <p>Completing this assessment helps us:</p>
            <ul>
              <li>Prepare for your visit more effectively</li>
              <li>Reduce wait time at the office</li>
              <li>Provide more personalized care</li>
            </ul>
            
            <p style="text-align: center;">
              <a href="${data.intakeLink}" class="button">Complete Assessment Now</a>
            </p>
            
            <p>Or copy and paste this link into your browser:<br>
            <a href="${data.intakeLink}">${data.intakeLink}</a></p>
            
            <p>The assessment takes only 5-10 minutes to complete.</p>
            
            <p>Thank you for your cooperation!</p>
            
            <p>Best regards,<br>
            ${data.physicianName}'s Office</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },
};

export type EmailTemplate = keyof typeof emailTemplates;

export interface SendIntakeEmailParams {
  to: string;
  patientName: string;
  intakeLink: string;
  physicianName: string;
  template: EmailTemplate;
  appointmentDate?: string;
}

export async function sendIntakeEmail(params: SendIntakeEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const transport = getTransporter();
    
    if (!transport) {
      return {
        success: false,
        error: 'Email service not configured. Please set EMAIL_USER and EMAIL_PASS environment variables.',
      };
    }

    const templateData = emailTemplates[params.template];
    const htmlContent = templateData.html({
      patientName: params.patientName,
      intakeLink: params.intakeLink,
      physicianName: params.physicianName,
      appointmentDate: params.appointmentDate,
    });

    const info = await transport.sendMail({
      from: EMAIL_FROM,
      to: params.to,
      subject: templateData.subject,
      html: htmlContent,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error('[Email Service] Failed to send email:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email',
    };
  }
}
