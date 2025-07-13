// Integration tests for backend (Express)
const request = require('supertest');
const app = require('../index');

describe('Backend Integration Tests', () => {
    it('should return 200 for GET /', async () => {
        const res = await request(app).get('/');
        expect(res.statusCode).toBe(200);
    });
    // Add more integration tests for your endpoints here
});
