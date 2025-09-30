import { expect } from 'chai';
import request from 'supertest';
// import { app } from '../../src/server'; // Enable when you export app from server.ts

describe('API Integration Tests', () => {
  // These test the actual HTTP endpoints with the real server
  // Use sparingly - focus on critical user journeys

  it('should be implemented when server exports app', () => {
    // Placeholder - enable real integration tests when you:
    // 1. Export { app } from src/server.ts
    // 2. Uncomment the import above
    expect(true).to.be.true;
  });

  // Example of what these tests would look like:
  /*
  describe('Health Check', () => {
    it('should return 200 for health endpoint', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).to.equal('ok');
      expect(response.body.timestamp).to.be.a('string');
    });
  });

  describe('Lobby API', () => {
    it('should get list of rooms', async () => {
      const response = await request(app)
        .get('/lobby/rooms')
        .expect(200);

      expect(response.body).to.have.property('rooms');
      expect(response.body.rooms).to.be.an('array');
    });

    it('should create room with valid data', async () => {
      const roomData = {
        name: 'Integration Test Room',
        maxPlayers: 4
      };

      const response = await request(app)
        .post('/lobby/rooms')
        .send(roomData)
        .expect(201);

      expect(response.body.message).to.equal('Room created successfully');
      expect(response.body.room.name).to.equal(roomData.name);
    });
  });
  */
});