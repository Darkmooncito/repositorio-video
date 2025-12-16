import { Server, Socket } from 'socket.io';
import express from 'express';
import http from 'http';
import cors from 'cors';
import 'dotenv/config';

const app = express();
const server = http.createServer(app);

const origins = (process.env.ORIGIN ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: origins.length > 0 ? origins : '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors({
  origin: origins.length > 0 ? origins : '*',
  credentials: true
}));

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    rooms: rooms.size,
    totalPeers: Array.from(rooms.values()).reduce((acc, room) => acc + room.size, 0)
  });
});

interface PeerInfo {
  socketId: string;
  username: string;
  roomId: string;
}

// Estructura: roomId -> Set<socketId>
const rooms = new Map<string, Set<string>>();
// Estructura: socketId -> PeerInfo
const peers = new Map<string, PeerInfo>();

const port = Number(process.env.PORT) || 3001;

io.on('connection', (socket: Socket) => {
  console.log(`✅ New connection: ${socket.id}`);

  // Unirse a una sala
  socket.on('join-room', ({ roomId, username }: { roomId: string; username: string }) => {
    console.log(`👤 ${username} (${socket.id}) joining room: ${roomId}`);

    // Guardar información del peer
    peers.set(socket.id, {
      socketId: socket.id,
      username,
      roomId
    });

    // Crear sala si no existe
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }

    const room = rooms.get(roomId)!;

    // Notificar a los usuarios existentes sobre el nuevo usuario
    room.forEach(existingPeerId => {
      const existingPeer = peers.get(existingPeerId);
      if (existingPeer) {
        // Notificar al nuevo usuario sobre usuarios existentes
        socket.emit('user-connected', {
          userId: existingPeerId,
          username: existingPeer.username
        });
        
        // Notificar a usuarios existentes sobre el nuevo usuario
        io.to(existingPeerId).emit('user-connected', {
          userId: socket.id,
          username: username
        });
      }
    });

    // Agregar usuario a la sala
    room.add(socket.id);
    socket.join(roomId);

    console.log(`📊 Room ${roomId} now has ${room.size} peer(s)`);
  });

  // Manejar oferta WebRTC
  socket.on('offer', ({ offer, to }: { offer: RTCSessionDescriptionInit; to: string }) => {
    const fromPeer = peers.get(socket.id);
    if (fromPeer) {
      console.log(`📤 Offer from ${fromPeer.username} to ${to}`);
      io.to(to).emit('offer', {
        offer,
        from: socket.id,
        username: fromPeer.username
      });
    }
  });

  // Manejar respuesta WebRTC
  socket.on('answer', ({ answer, to }: { answer: RTCSessionDescriptionInit; to: string }) => {
    const fromPeer = peers.get(socket.id);
    if (fromPeer) {
      console.log(`📥 Answer from ${fromPeer.username} to ${to}`);
      io.to(to).emit('answer', {
        answer,
        from: socket.id,
        username: fromPeer.username
      });
    }
  });

  // Manejar candidatos ICE
  socket.on('ice-candidate', ({ candidate, to }: { candidate: RTCIceCandidateInit; to: string }) => {
    io.to(to).emit('ice-candidate', {
      candidate,
      from: socket.id
    });
  });

  // Compartir pantalla
  socket.on('start-screen-share', ({ roomId }: { roomId: string }) => {
    const peer = peers.get(socket.id);
    if (peer) {
      console.log(`🖥️  ${peer.username} started screen sharing`);
      socket.to(roomId).emit('screen-share-started', {
        userId: socket.id,
        username: peer.username
      });
    }
  });

  socket.on('stop-screen-share', ({ roomId }: { roomId: string }) => {
    const peer = peers.get(socket.id);
    if (peer) {
      console.log(`🛑 ${peer.username} stopped screen sharing`);
      socket.to(roomId).emit('screen-share-stopped', {
        userId: socket.id
      });
    }
  });

  // Salir de la sala
  socket.on('leave-room', () => {
    handleDisconnect(socket.id);
  });

  // Desconexión
  socket.on('disconnect', () => {
    console.log(`❌ Disconnection: ${socket.id}`);
    handleDisconnect(socket.id);
  });

  function handleDisconnect(socketId: string) {
    const peer = peers.get(socketId);
    if (peer) {
      const { roomId, username } = peer;
      const room = rooms.get(roomId);

      if (room) {
        room.delete(socketId);
        
        // Notificar a otros usuarios en la sala
        socket.to(roomId).emit('user-disconnected', {
          userId: socketId
        });

        console.log(`👋 ${username} left room ${roomId}. ${room.size} peer(s) remaining`);

        // Eliminar sala si está vacía
        if (room.size === 0) {
          rooms.delete(roomId);
          console.log(`🗑️  Room ${roomId} deleted (empty)`);
        }
      }

      peers.delete(socketId);
    }
  }
});

server.listen(port, () => {
  console.log(`🚀 Video Server running on port ${port}`);
  console.log(`📡 CORS enabled for: ${origins.length > 0 ? origins.join(', ') : 'all origins'}`);
});