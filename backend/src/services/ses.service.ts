import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { EmailInput } from '../types';

const client = new SESClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const fromEmail = process.env.SES_FROM_EMAIL || 'noreply@example.com';

export class SESService {
  async sendEmail(input: EmailInput): Promise<void> {
    const command = new SendEmailCommand({
      Source: fromEmail,
      Destination: {
        ToAddresses: input.to,
      },
      Message: {
        Subject: {
          Data: input.subject,
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: input.body,
            Charset: 'UTF-8',
          },
          ...(input.html && {
            Html: {
              Data: input.html,
              Charset: 'UTF-8',
            },
          }),
        },
      },
    });

    await client.send(command);
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    await this.sendEmail({
      to: [email],
      subject: 'Welcome to Our Platform!',
      body: `Hello ${name},\n\nWelcome to our platform! We're excited to have you on board.\n\nBest regards,\nThe Team`,
      html: `
        <html>
          <body>
            <h1>Hello ${name},</h1>
            <p>Welcome to our platform! We're excited to have you on board.</p>
            <p>Best regards,<br/>The Team</p>
          </body>
        </html>
      `,
    });
  }

  async sendPasswordResetEmail(email: string, resetCode: string): Promise<void> {
    await this.sendEmail({
      to: [email],
      subject: 'Password Reset Request',
      body: `You requested a password reset. Your reset code is: ${resetCode}\n\nIf you didn't request this, please ignore this email.`,
      html: `
        <html>
          <body>
            <h1>Password Reset Request</h1>
            <p>You requested a password reset. Your reset code is:</p>
            <h2>${resetCode}</h2>
            <p>If you didn't request this, please ignore this email.</p>
          </body>
        </html>
      `,
    });
  }
}

export const sesService = new SESService();
