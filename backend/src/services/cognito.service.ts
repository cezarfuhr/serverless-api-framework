import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
  AdminUpdateUserAttributesCommand,
  SignUpCommand,
  InitiateAuthCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const userPoolId = process.env.USER_POOL_ID!;
const clientId = process.env.USER_POOL_CLIENT_ID!;

export class CognitoService {
  async signUp(email: string, password: string, name: string) {
    const command = new SignUpCommand({
      ClientId: clientId,
      Username: email,
      Password: password,
      UserAttributes: [
        {
          Name: 'email',
          Value: email,
        },
        {
          Name: 'name',
          Value: name,
        },
      ],
    });

    return await client.send(command);
  }

  async confirmSignUp(email: string, code: string) {
    const command = new ConfirmSignUpCommand({
      ClientId: clientId,
      Username: email,
      ConfirmationCode: code,
    });

    return await client.send(command);
  }

  async signIn(email: string, password: string) {
    const command = new InitiateAuthCommand({
      ClientId: clientId,
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    });

    return await client.send(command);
  }

  async forgotPassword(email: string) {
    const command = new ForgotPasswordCommand({
      ClientId: clientId,
      Username: email,
    });

    return await client.send(command);
  }

  async confirmForgotPassword(email: string, code: string, newPassword: string) {
    const command = new ConfirmForgotPasswordCommand({
      ClientId: clientId,
      Username: email,
      ConfirmationCode: code,
      Password: newPassword,
    });

    return await client.send(command);
  }

  async getUser(email: string) {
    const command = new AdminGetUserCommand({
      UserPoolId: userPoolId,
      Username: email,
    });

    return await client.send(command);
  }

  async updateUserAttributes(email: string, attributes: Record<string, string>) {
    const command = new AdminUpdateUserAttributesCommand({
      UserPoolId: userPoolId,
      Username: email,
      UserAttributes: Object.entries(attributes).map(([Name, Value]) => ({
        Name,
        Value,
      })),
    });

    return await client.send(command);
  }
}

export const cognitoService = new CognitoService();
