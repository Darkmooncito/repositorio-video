/**
 * WebRTC Video Signaling Server
 * Handles peer-to-peer connection signaling for video/audio streaming
 * 
 * @module VideoServer
 */

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

/**
 * Health check endpoint
 * Returns server status and current statistics
 * 
 * @route GET /health
 * @returns {Object} status - Server health information
 * @returns {string} status.status - Server status (ok/error)
 * @returns {number} status.rooms - Number of active rooms
 * @returns {number} status.totalPeers - Total number of connected peers
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    rooms: rooms.size,
    totalPeers: Array.from(rooms.values()).reduce((acc, room) => acc + room.size, 0)
  });
});

/**
 * Peer information interface
 * @interface PeerInfo
 * @property {string} socketId - Unique socket identifier
 * @property {string} username - Display name of the peer
 * @property {string} roomId - Room the peer is connected to
 */
interface PeerInfo {
  socketId: string;
  username: string;
  roomId: string;
}

/** Map of rooms to sets of socket IDs */
const rooms = new Map<string, Set<string>>();
/** Map of socket IDs to peer information */
const peers = new Map<string, PeerInfo>();

const port = Number(process.env.PORT) || 3001;

/**
 * Socket.IO connection handler
 * Manages WebRTC signaling for all connected clients
 */
io.on('connection', (socket: Socket) => {
  console.log(`✅ New connection: ${socket.id}`);

  /**
   * Join room event handler
   * Adds a peer to a video room and notifies other peers
   * 
   * @event join-room
   * @param {Object} data - Join room data
   * @param {string} data.roomId - Room identifier
   * @param {string} data.username - User's display name
   */
  socket.on('join-room', ({ roomId, username }: { roomId: string; username: string }) => {
    console.log(`👤 ${username} (${socket.id}) joining room: ${roomId}`);

    peers.set(socket.id, {
      socketId: socket.id,
      username,
      roomId
    });

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }

    const room = rooms.get(roomId)!;

    room.forEach(existingPeerId => {
      const existingPeer = peers.get(existingPeerId);
      if (existingPeer) {
        socket.emit('user-connected', {
          userId: existingPeerId,
          username: existingPeer.username
        });
        
        io.to(existingPeerId).emit('user-connected', {
          userId: socket.id,
          username: username
        });
      }
    });

    room.add(socket.id);
    socket.join(roomId);

    console.log(`📊 Room ${roomId} now has ${room.size} peer(s)`);
  });

  /**
   * WebRTC offer event handler
   * Forwards connection offer to target peer
   * 
   * @event offer
   * @param {Object} data - Offer data
   * @param {RTCSessionDescriptionInit} data.offer - WebRTC offer
   * @param {string} data.to - Target peer socket ID
   */
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

  /**
   * WebRTC answer event handler
   * Forwards connection answer to target peer
   * 
   * @event answer
   * @param {Object} data - Answer data
   * @param {RTCSessionDescriptionInit} data.answer - WebRTC answer
   * @param {string} data.to - Target peer socket ID
   */
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

  /**
   * ICE candidate event handler
   * Forwards ICE candidate to target peer for NAT traversal
   * 
   * @event ice-candidate
   * @param {Object} data - ICE candidate data
   * @param {RTCIceCandidateInit} data.candidate - ICE candidate
   * @param {string} data.to - Target peer socket ID
   */
  socket.on('ice-candidate', ({ candidate, to }: { candidate: RTCIceCandidateInit; to: string }) => {
    io.to(to).emit('ice-candidate', {
      candidate,
      from: socket.id
    });
  });

  /**
   * Start screen share event handler
   * Notifies room members that a peer started screen sharing
   * 
   * @event start-screen-share
   * @param {Object} data - Screen share data
   * @param {string} data.roomId - Room identifier
   */
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

  /**
   * Stop screen share event handler
   * Notifies room members that a peer stopped screen sharing
   * 
   * @event stop-screen-share
   * @param {Object} data - Screen share data
   * @param {string} data.roomId - Room identifier
   */
  socket.on('stop-screen-share', ({ roomId }: { roomId: string }) => {
    const peer = peers.get(socket.id);
    if (peer) {
      console.log(`🛑 ${peer.username} stopped screen sharing`);
      socket.to(roomId).emit('screen-share-stopped', {
        userId: socket.id
      });
    }
  });

  /**
   * Leave room event handler
   * Removes peer from room and notifies others
   * 
   * @event leave-room
   */
  socket.on('leave-room', () => {
    handleDisconnect(socket.id);
  });

  /**
   * Disconnect event handler
   * Cleans up peer connections when socket disconnects
   * 
   * @event disconnect
   */
  socket.on('disconnect', () => {
    console.log(`❌ Disconnection: ${socket.id}`);
    handleDisconnect(socket.id);
  });

  /**
   * Handles peer disconnection cleanup
   * Removes peer from room and notifies remaining peers
   * 
   * @param {string} socketId - Socket ID of disconnecting peer
   */
  function handleDisconnect(socketId: string) {
    const peer = peers.get(socketId);
    if (peer) {
      const { roomId, username } = peer;
      const room = rooms.get(roomId);

      if (room) {
        room.delete(socketId);
        
        socket.to(roomId).emit('user-disconnected', {
          userId: socketId
        });

        console.log(`👋 ${username} left room ${roomId}. ${room.size} peer(s) remaining`);

        if (room.size === 0) {
          rooms.delete(roomId);
          console.log(`🗑️  Room ${roomId} deleted (empty)`);
        }
      }

      peers.delete(socketId);
    }
  }
});

/**
 * Start the server
 */
server.listen(port, () => {
  console.log(`🚀 Video Server running on port ${port}`);
  console.log(`📡 CORS enabled for: ${origins.length > 0 ? origins.join(', ') : 'all origins'}`);
});