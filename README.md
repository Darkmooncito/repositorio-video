# WebRTC Video Signaling Server

WebRTC signaling server for real-time video and audio streaming.

## Features

- WebRTC signaling (offer/answer/ICE candidates)
- Multi-room support
- Multi-peer management
- Screen sharing notifications
- Connection/disconnection events
- CORS configuration
- Health check endpoint

## Requirements

- Node.js 18+
- npm or yarn

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configure variables:

```env
PORT=3001
ORIGIN=http://localhost:5173,http://localhost:3000
```

## Development

```bash
npm run dev
```

## Production

```bash
npm run build
npm start
```

## API Documentation

### Socket.IO Events

#### Client → Server

- `join-room` - Join a video room
- `offer` - Send WebRTC offer
- `answer` - Send WebRTC answer
- `ice-candidate` - Send ICE candidate
- `start-screen-share` - Notify screen share start
- `stop-screen-share` - Notify screen share stop
- `leave-room` - Leave the room

#### Server → Client

- `user-connected` - New user joined
- `offer` - WebRTC offer received
- `answer` - WebRTC answer received
- `ice-candidate` - ICE candidate received
- `screen-share-started` - User started screen sharing
- `screen-share-stopped` - User stopped screen sharing
- `user-disconnected` - User disconnected

### Health Check

```bash
GET /health
```

Response:
```json
{
  "status": "ok",
  "rooms": 2,
  "totalPeers": 5
}
```

## License

MIT
