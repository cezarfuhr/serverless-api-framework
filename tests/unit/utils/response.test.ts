import {
  success,
  error,
  created,
  noContent,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  internalServerError,
} from '../../../backend/src/utils/response';

describe('Response Utils', () => {
  describe('success', () => {
    it('should return 200 status code', () => {
      const response = success({ message: 'Success' });
      expect(response.statusCode).toBe(200);
    });

    it('should include data in body', () => {
      const data = { message: 'Success' };
      const response = success(data);
      const body = JSON.parse(response.body);

      expect(body.success).toBe(true);
      expect(body.data).toEqual(data);
    });

    it('should include CORS headers', () => {
      const response = success({});

      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(response.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('error', () => {
    it('should return 500 status code by default', () => {
      const response = error('Error message');
      expect(response.statusCode).toBe(500);
    });

    it('should include error message in body', () => {
      const message = 'Error occurred';
      const response = error(message);
      const body = JSON.parse(response.body);

      expect(body.success).toBe(false);
      expect(body.error).toBe(message);
    });
  });

  describe('created', () => {
    it('should return 201 status code', () => {
      const response = created({ id: '123' });
      expect(response.statusCode).toBe(201);
    });
  });

  describe('noContent', () => {
    it('should return 204 status code', () => {
      const response = noContent();
      expect(response.statusCode).toBe(204);
    });

    it('should have empty body', () => {
      const response = noContent();
      expect(response.body).toBe('');
    });
  });

  describe('badRequest', () => {
    it('should return 400 status code', () => {
      const response = badRequest('Bad request');
      expect(response.statusCode).toBe(400);
    });
  });

  describe('unauthorized', () => {
    it('should return 401 status code', () => {
      const response = unauthorized();
      expect(response.statusCode).toBe(401);
    });
  });

  describe('forbidden', () => {
    it('should return 403 status code', () => {
      const response = forbidden();
      expect(response.statusCode).toBe(403);
    });
  });

  describe('notFound', () => {
    it('should return 404 status code', () => {
      const response = notFound();
      expect(response.statusCode).toBe(404);
    });
  });

  describe('internalServerError', () => {
    it('should return 500 status code', () => {
      const response = internalServerError();
      expect(response.statusCode).toBe(500);
    });
  });
});
