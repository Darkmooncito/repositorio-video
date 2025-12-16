# Servidor de Video WebRTC

Servidor de señalización WebRTC para transmisión de video y audio en tiempo real.

## 🚀 Características

- Señalización WebRTC (offer/answer/ICE candidates)
- Soporte para múltiples salas
- Gestión de múltiples peers
- Soporte para compartir pantalla
- Notificaciones de conexión/desconexión
- CORS configurable
- Health check endpoint

## 📋 Requisitos

- Node.js 18+
- npm o yarn

## 🛠️ Instalación

```bash
npm install
```

## ⚙️ Configuración

Copia el archivo `.env.example` a `.env`:

```bash
cp .env.example .env
```

Configura las variables:

```env
PORT=3001
ORIGIN=http://localhost:5173,http://localhost:3000
```

## 🏃 Ejecutar

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm run build
npm start
```

## 📡 API de Socket.IO

### Eventos del Cliente → Servidor

#### `join-room`
Unirse a una sala de video.
```typescript
socket.emit('join-room', { 
  roomId: string, 
  username: string 
});
```

#### `offer`
Enviar oferta WebRTC a un peer.
```typescript
socket.emit('offer', { 
  offer: RTCSessionDescriptionInit, 
  to: string 
});
```

#### `answer`
Enviar respuesta WebRTC a un peer.
```typescript
socket.emit('answer', { 
  answer: RTCSessionDescriptionInit, 
  to: string 
});
```

#### `ice-candidate`
Enviar candidato ICE a un peer.
```typescript
socket.emit('ice-candidate', { 
  candidate: RTCIceCandidateInit, 
  to: string 
});
```

#### `start-screen-share`
Notificar inicio de compartir pantalla.
```typescript
socket.emit('start-screen-share', { 
  roomId: string 
});
```

#### `stop-screen-share`
Notificar fin de compartir pantalla.
```typescript
socket.emit('stop-screen-share', { 
  roomId: string 
});
```

#### `leave-room`
Salir de la sala.
```typescript
socket.emit('leave-room');
```

### Eventos del Servidor → Cliente

#### `user-connected`
Nuevo usuario conectado a la sala.
```typescript
socket.on('user-connected', ({ userId, username }) => {
  // Crear conexión peer con este usuario
});
```

#### `offer`
Oferta WebRTC recibida.
```typescript
socket.on('offer', ({ offer, from, username }) => {
  // Procesar oferta y crear respuesta
});
```

#### `answer`
Respuesta WebRTC recibida.
```typescript
socket.on('answer', ({ answer, from, username }) => {
  // Procesar respuesta
});
```

#### `ice-candidate`
Candidato ICE recibido.
```typescript
socket.on('ice-candidate', ({ candidate, from }) => {
  // Agregar candidato ICE
});
```

#### `screen-share-started`
Un usuario comenzó a compartir pantalla.
```typescript
socket.on('screen-share-started', ({ userId, username }) => {
  // Actualizar UI
});
```

#### `screen-share-stopped`
Un usuario dejó de compartir pantalla.
```typescript
socket.on('screen-share-stopped', ({ userId }) => {
  // Actualizar UI
});
```

#### `user-disconnected`
Usuario desconectado.
```typescript
socket.on('user-disconnected', ({ userId }) => {
  // Cerrar conexión peer
});
```

## 🏥 Health Check

Endpoint para verificar el estado del servidor:

```bash
GET http://localhost:3001/health
```

Respuesta:
```json
{
  "status": "ok",
  "rooms": 2,
  "totalPeers": 5
}
```

## 🔧 Arquitectura

```
Cliente A                Servidor                Cliente B
   |                        |                        |
   |---- join-room -------->|                        |
   |                        |<----- join-room -------|
   |<--- user-connected ----|                        |
   |                        |---- user-connected --->|
   |                        |                        |
   |------ offer ---------->|                        |
   |                        |------- offer --------->|
   |                        |<------ answer ---------|
   |<----- answer ----------|                        |
   |                        |                        |
   |--- ice-candidate ----->|                        |
   |                        |---- ice-candidate ---->|
   |                        |                        |
   [Conexión P2P establecida]                        |
```

## 📝 Licencia

MIT
