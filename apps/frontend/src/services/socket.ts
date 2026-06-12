import { io, Socket } from 'socket.io-client';
import type { ComponentRequest } from '../types';

let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (socket) return socket;
  socket = io('/', {
    transports: ['websocket', 'polling'],
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
  });
  socket.on('connect',    () => console.log('[Socket] connected'));
  socket.on('disconnect', (r) => console.warn('[Socket] disconnected:', r));
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

function onConnected(cb: () => void): () => void {
  if (!socket) return () => {};
  if (socket.connected) cb();
  socket.on('connect', cb);
  return () => { socket?.off('connect', cb); };
}

export function joinManagement() {
  onConnected(() => socket?.emit('join-management'));
}

export function onRequestNew(handler: (req: ComponentRequest) => void) {
  socket?.on('request:new', handler);
  return () => { socket?.off('request:new', handler); };
}

export function onRequestUpdated(handler: (req: ComponentRequest) => void) {
  socket?.on('request:updated', handler);
  return () => { socket?.off('request:updated', handler); };
}
