import apiClient from './client';
import { EmailInput, ApiResponse } from '../types';

export const emailApi = {
  send: async (input: EmailInput): Promise<void> => {
    await apiClient.post<ApiResponse>('/email/send', input);
  },
};
