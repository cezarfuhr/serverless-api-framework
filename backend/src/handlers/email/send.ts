import { APIGatewayProxyHandler } from 'aws-lambda';
import { EmailInput } from '../../types';
import { sesService } from '../../services/ses.service';
import { success, badRequest, internalServerError } from '../../utils/response';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    if (!event.body) {
      return badRequest('Request body is required');
    }

    const input: EmailInput = JSON.parse(event.body);

    // Validate input
    if (!input.to || !Array.isArray(input.to) || input.to.length === 0) {
      return badRequest('At least one recipient email is required');
    }

    if (!input.subject) {
      return badRequest('Email subject is required');
    }

    if (!input.body) {
      return badRequest('Email body is required');
    }

    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = input.to.filter((email) => !emailRegex.test(email));

    if (invalidEmails.length > 0) {
      return badRequest(`Invalid email addresses: ${invalidEmails.join(', ')}`);
    }

    await sesService.sendEmail(input);

    return success({
      message: 'Email sent successfully',
      recipients: input.to.length,
    });
  } catch (error: any) {
    console.error('Error sending email:', error);

    if (error.name === 'MessageRejected') {
      return badRequest('Email rejected by SES. Please verify sender email.');
    }

    return internalServerError('Failed to send email');
  }
};
