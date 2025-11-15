import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3001';

describe('API Integration Tests', () => {
  let createdUserId: string;

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await axios.get(`${API_URL}/health`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.status).toBe('healthy');
    });
  });

  describe('User Management', () => {
    it('should create a new user', async () => {
      const userData = {
        email: `test${Date.now()}@example.com`,
        name: 'Test User',
        password: 'TestPassword123!',
      };

      const response = await axios.post(`${API_URL}/users`, userData);

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data.email).toBe(userData.email);
      expect(response.data.data.name).toBe(userData.name);
      expect(response.data.data.id).toBeDefined();

      createdUserId = response.data.data.id;
    });

    it('should list all users', async () => {
      const response = await axios.get(`${API_URL}/users`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data.users)).toBe(true);
    });

    it('should get a specific user', async () => {
      if (!createdUserId) {
        return; // Skip if no user was created
      }

      const response = await axios.get(`${API_URL}/users/${createdUserId}`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.id).toBe(createdUserId);
    });

    it('should update a user', async () => {
      if (!createdUserId) {
        return;
      }

      const updateData = {
        name: 'Updated Name',
      };

      const response = await axios.put(
        `${API_URL}/users/${createdUserId}`,
        updateData
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.name).toBe(updateData.name);
    });

    it('should delete a user', async () => {
      if (!createdUserId) {
        return;
      }

      const response = await axios.delete(`${API_URL}/users/${createdUserId}`);

      expect(response.status).toBe(204);
    });

    it('should return 404 for non-existent user', async () => {
      try {
        await axios.get(`${API_URL}/users/non-existent-id`);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
      }
    });

    it('should validate email format', async () => {
      const userData = {
        email: 'invalid-email',
        name: 'Test User',
        password: 'TestPassword123!',
      };

      try {
        await axios.post(`${API_URL}/users`, userData);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }
    });

    it('should validate password length', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'short',
      };

      try {
        await axios.post(`${API_URL}/users`, userData);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }
    });
  });
});
