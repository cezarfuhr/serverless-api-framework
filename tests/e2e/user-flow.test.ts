import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3001';

describe('E2E: Complete User Flow', () => {
  let userId: string;
  const userEmail = `e2e-test-${Date.now()}@example.com`;

  it('should complete full user lifecycle', async () => {
    // Step 1: Create user
    console.log('Creating user...');
    const createResponse = await axios.post(`${API_URL}/users`, {
      email: userEmail,
      name: 'E2E Test User',
      password: 'E2ETestPass123!',
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.data.data.email).toBe(userEmail);
    userId = createResponse.data.data.id;
    console.log(`User created with ID: ${userId}`);

    // Step 2: Verify user appears in list
    console.log('Verifying user in list...');
    const listResponse = await axios.get(`${API_URL}/users`);
    expect(listResponse.status).toBe(200);

    const userInList = listResponse.data.data.users.find(
      (u: any) => u.id === userId
    );
    expect(userInList).toBeDefined();
    expect(userInList.email).toBe(userEmail);

    // Step 3: Get user details
    console.log('Getting user details...');
    const getResponse = await axios.get(`${API_URL}/users/${userId}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.data.data.id).toBe(userId);
    expect(getResponse.data.data.email).toBe(userEmail);

    // Step 4: Update user
    console.log('Updating user...');
    const updateResponse = await axios.put(`${API_URL}/users/${userId}`, {
      name: 'Updated E2E User',
    });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.data.data.name).toBe('Updated E2E User');

    // Step 5: Verify update
    console.log('Verifying update...');
    const verifyResponse = await axios.get(`${API_URL}/users/${userId}`);
    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.data.data.name).toBe('Updated E2E User');

    // Step 6: Delete user
    console.log('Deleting user...');
    const deleteResponse = await axios.delete(`${API_URL}/users/${userId}`);
    expect(deleteResponse.status).toBe(204);

    // Step 7: Verify deletion
    console.log('Verifying deletion...');
    try {
      await axios.get(`${API_URL}/users/${userId}`);
      fail('User should not exist');
    } catch (error: any) {
      expect(error.response.status).toBe(404);
    }

    console.log('E2E test completed successfully!');
  });

  it('should handle concurrent user operations', async () => {
    const users = await Promise.all([
      axios.post(`${API_URL}/users`, {
        email: `concurrent1-${Date.now()}@example.com`,
        name: 'Concurrent User 1',
        password: 'Password123!',
      }),
      axios.post(`${API_URL}/users`, {
        email: `concurrent2-${Date.now()}@example.com`,
        name: 'Concurrent User 2',
        password: 'Password123!',
      }),
      axios.post(`${API_URL}/users`, {
        email: `concurrent3-${Date.now()}@example.com`,
        name: 'Concurrent User 3',
        password: 'Password123!',
      }),
    ]);

    expect(users).toHaveLength(3);
    users.forEach((response) => {
      expect(response.status).toBe(201);
      expect(response.data.data.id).toBeDefined();
    });

    // Cleanup
    await Promise.all(
      users.map((response) =>
        axios.delete(`${API_URL}/users/${response.data.data.id}`)
      )
    );
  });
});
