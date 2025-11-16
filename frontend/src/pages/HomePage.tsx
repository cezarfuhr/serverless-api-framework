import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import './HomePage.css';

export const HomePage = () => {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await apiClient.get('/health');
        setHealth(response.data.data);
      } catch (error) {
        console.error('Failed to check health:', error);
      } finally {
        setLoading(false);
      }
    };

    checkHealth();
  }, []);

  return (
    <div className="container">
      <h1>Welcome to Serverless API Framework</h1>
      <p className="description">
        A complete framework for building serverless APIs with AWS Lambda and API Gateway.
      </p>

      <div className="features">
        <h2>Features</h2>
        <ul>
          <li>AWS Lambda Functions</li>
          <li>API Gateway Integration</li>
          <li>DynamoDB Database</li>
          <li>Cognito Authentication</li>
          <li>SES Email Service</li>
          <li>Cost Optimized</li>
          <li>Full TypeScript Support</li>
          <li>Comprehensive Testing</li>
        </ul>
      </div>

      <div className="health-check">
        <h2>API Health Check</h2>
        {loading ? (
          <p className="loading">Checking API health...</p>
        ) : health ? (
          <div className="health-status healthy">
            <p>Status: {health.status}</p>
            <p>Service: {health.service}</p>
            <p>Timestamp: {new Date(health.timestamp).toLocaleString()}</p>
          </div>
        ) : (
          <div className="health-status unhealthy">
            <p>API is not responding</p>
          </div>
        )}
      </div>
    </div>
  );
};
