import { Server } from 'socket.io';
import http from 'http';
import express from 'express';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173'],
    credentials: true,
  },
});

// Store active users for video calls { socketId: { username, socketId } }
const activeUsers = {};

// Store user-to-socket mapping for messaging and calls { userId: socketId }
const userSocketMap = {};

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

io.on('connection', (socket) => {
  console.log('A user connected', socket.id);

  // Handle user ID for messaging
  const userId = socket.handshake.query.userId;
  if (userId) {
    userSocketMap[userId] = socket.id;
    io.emit('getOnlineUsers', Object.keys(userSocketMap));
  }

  // Handle user registration for video calls
  socket.on('register', (username) => {
    console.log(`User registered: ${username}`);
    activeUsers[socket.id] = { username, socketId: socket.id };
    io.emit('activeUsers', Object.values(activeUsers));
  });

  // Handle call requests
  socket.on('callUser', ({ to, from, signal }) => {
    console.log(`Call request from ${from} to ${to}`);
    const receiverSocketId = userSocketMap[to] || to;
    io.to(receiverSocketId).emit('incomingCall', {
      from,
      signal,
      callerName: activeUsers[from]?.username,
    });
  });

  // Handle call acceptance
  socket.on('answerCall', ({ to, signal }) => {
    console.log(`Call accepted from ${to}`);
    io.to(to).emit('callAccepted', {
      signal,
      answererName: activeUsers[socket.id]?.username,
    });
  });

  // Handle end call
  socket.on('endCall', ({ to }) => {
    console.log(`End call request to ${to}`);
    const receiverSocketId = userSocketMap[to] || to;
    io.to(receiverSocketId).emit('endCall');
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('A user disconnected', socket.id);
    if (userId) {
      delete userSocketMap[userId];
      io.emit('getOnlineUsers', Object.keys(userSocketMap));
    }
    delete activeUsers[socket.id];
    io.emit('activeUsers', Object.values(activeUsers));
  });
});

export { io, app, server };