// Global test setup
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.AWS_REGION = 'us-east-1';
  process.env.DYNAMODB_TABLE = 'test-table';
});

afterAll(() => {
  // Cleanup
});
