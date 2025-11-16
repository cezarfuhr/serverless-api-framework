import apiClient from './client';
import { User, CreateUserInput, UpdateUserInput, ApiResponse } from '../types';

export const usersApi = {
  list: async (): Promise<User[]> => {
    const response = await apiClient.get<ApiResponse<{ users: User[] }>>('/users');
    return response.data.data?.users || [];
  },

  get: async (id: string): Promise<User> => {
    const response = await apiClient.get<ApiResponse<User>>(`/users/${id}`);
    return response.data.data!;
  },

  create: async (input: CreateUserInput): Promise<User> => {
    const response = await apiClient.post<ApiResponse<User>>('/users', input);
    return response.data.data!;
  },

  update: async (id: string, input: UpdateUserInput): Promise<User> => {
    const response = await apiClient.put<ApiResponse<User>>(`/users/${id}`, input);
    return response.data.data!;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },
};
