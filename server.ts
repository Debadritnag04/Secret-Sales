import express from 'express';
import { createServer as createHttpServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';

async function startServer() {
  const app = express();
  const server = createHttpServer(app);
  const io = new Server(server, { cors: { origin: '*' } });
  
  io.on('connection', (socket) => {
    socket.on('join-room', (roomCode) => {
      socket.join(roomCode);
    });
    
    // Host broadcasts the authoritative state to all clients in the room
    socket.on('sync-state', ({ roomCode, state }) => {
      socket.to(roomCode).emit('state-synced', state);
    });

    // Clients send actions to the host
    socket.on('client-action', ({ roomCode, action, payload }) => {
      socket.to(roomCode).emit('client-action', { action, payload });
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  server.listen(3000, '0.0.0.0', () => {
    console.log('Server running on port 3000');
  });
}

startServer();
