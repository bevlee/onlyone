import { Router } from 'express';

const router = Router();

router.get('/active', (req, res) => {
  res.json({ rooms: [] });
});

router.post('/', (req, res) => {
  res.json({ message: 'Room created' });
});

router.post('/:roomName/join', (req, res) => {
  const { roomName } = req.params;
  res.json({ message: `Joined room: ${roomName}` });
});

router.post('/leave', (req, res) => {
  res.json({ message: 'Left room' });
});

router.get('/:roomName/details', (req, res) => {
  const { roomName } = req.params;
  res.json({ roomName, players: [], status: 'waiting' });
});

router.delete('/:roomName', (req, res) => {
  const { roomName } = req.params;
  res.json({ message: `Room ${roomName} deleted` });
});

export default router;