'use strict';
const http = require('node:http');
const { randomBytes, randomUUID } = require('node:crypto');
const { Server } = require('socket.io');

function createWatchServer(options = {}) {
  const origins = options.origins || (process.env.ALLOWED_ORIGINS || 'http://localhost:8000,http://127.0.0.1:8000').split(',').map(s => s.trim());
  const rooms = new Map();
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    if (req.url === '/' || req.url === '/health') {
      res.end(JSON.stringify({ ok: true, service: 'AniVerse — servidor de salas', rooms: rooms.size }));
    } else { res.statusCode = 404; res.end(JSON.stringify({ error: 'Não encontrado' })); }
  });
  const io = new Server(server, {
    cors: { origin: origins },
    allowRequest: (req, done) => done(null, origins.includes(req.headers.origin)),
    maxHttpBufferSize: 16384
  });
  const text = (v, max) => typeof v === 'string' ? v.trim().slice(0, max) : '';
  function episode(value) {
    if (!value || typeof value !== 'object') throw new Error('Informe o episódio.');
    const anime = text(String(value.anime || ''), 160);
    if (!anime || !Number.isSafeInteger(value.season) || value.season < 1 || !Number.isSafeInteger(value.episode) || value.episode < 1) throw new Error('Episódio inválido.');
    return { anime, season: value.season, episode: value.episode };
  }
  function snapshot(room) {
    const now = Date.now();
    return { id: room.id, name: room.name, host: room.host, members: [...room.members.values()],
      state: { ...room.state, position: room.state.position + (room.state.playing ? (now - room.state.updatedAt) / 1000 : 0), updatedAt: now }, messages: room.messages, suggestions: room.suggestions };
  }
  function broadcast(room) { io.to(room.id).emit('room:state', snapshot(room)); }
  function leave(socket) {
    const room = rooms.get(socket.data.room);
    if (!room) return;
    room.members.delete(socket.id); socket.leave(room.id); socket.data.room = null;
    if (!room.members.size) { rooms.delete(room.id); return; }
    if (room.host === socket.id) room.host = room.members.keys().next().value;
    broadcast(room);
  }
  io.on('connection', socket => {
    let budget = 60, lastRefill = Date.now();
    const handle = (name, action) => socket.on(name, (payload, ack) => {
      if (typeof ack !== 'function') return;
      const now = Date.now(); budget = Math.min(60, budget + (now - lastRefill) / 1000 * 6); lastRefill = now;
      if (budget < 1) { ack({ ok: false, error: 'Muitos comandos. Aguarde um momento.' }); return; }
      budget--;
      try { ack({ ok: true, ...action(payload || {}) }); }
      catch (error) { ack({ ok: false, error: error.message }); }
    });
    const currentRoom = () => { const room = rooms.get(socket.data.room); if (!room) throw new Error('Entre em uma sala.'); return room; };
    const hostRoom = () => { const room = currentRoom(); if (room.host !== socket.id) throw new Error('Somente o anfitrião pode controlar a reprodução.'); return room; };
    const enter = (room, name, ready = false) => {
      leave(socket);
      socket.data.room = room.id;
      room.members.set(socket.id, { id: socket.id, name: text(name, 40) || 'Visitante', ready });
      socket.join(room.id); broadcast(room); return { room: snapshot(room), participant: socket.id };
    };
    handle('room:create', data => {
      if (rooms.size >= 100) throw new Error('Limite de salas atingido.');
      const position = Number.isFinite(data.position) && data.position >= 0 && data.position <= 86400 ? data.position : 0;
      const state = { ...episode(data), position, playing: data.playing === true, updatedAt: Date.now(), revision: 0 };
      const id = randomBytes(12).toString('hex');
      const room = { id, name: text(data.name, 60) || 'Sala de anime', host: socket.id, members: new Map(), state, messages: [], suggestions: [] };
      rooms.set(id, room); return enter(room, data.participantName, true);
    });
    handle('room:join', data => {
      const room = rooms.get(text(data.id, 24));
      if (!room) throw new Error('Sala não encontrada ou encerrada.');
      if (socket.data.room === room.id) return { room: snapshot(room), participant: socket.id };
      if (room.members.size >= 8) throw new Error('Esta sala já tem oito participantes.');
      return enter(room, data.participantName);
    });
    handle('room:get', () => ({ room: snapshot(currentRoom()) }));
    handle('room:leave', () => { leave(socket); return {}; });
    handle('room:ready', data => { const room = currentRoom(); room.members.get(socket.id).ready = data.ready === true; broadcast(room); return {}; });
    handle('room:suggest', data => {
      const room = currentRoom(), choice = episode(data);
      if (room.suggestions.some(item => item.participant === socket.id && item.anime === choice.anime && item.season === choice.season && item.episode === choice.episode)) return {};
      if (room.suggestions.length >= 10) throw new Error('A sala já tem dez sugestões. Aguarde o anfitrião avaliar.');
      room.suggestions.push({ ...choice, id: randomUUID(), participant: socket.id, name: room.members.get(socket.id).name });
      broadcast(room); return {};
    });
    handle('room:suggestion:remove', data => {
      const room = hostRoom(); room.suggestions = room.suggestions.filter(item => item.id !== data.id); broadcast(room); return {};
    });
    handle('room:suggestion:accept', data => {
      const room = hostRoom(), suggestion = room.suggestions.find(item => item.id === data.id);
      if (!suggestion) throw new Error('Sugestão não encontrada.');
      room.state = { ...episode(suggestion), position: 0, playing: false, updatedAt: Date.now(), revision: room.state.revision + 1 };
      room.suggestions = room.suggestions.filter(item => item.id !== data.id);
      room.members.forEach(member => { member.ready = false; }); broadcast(room); return { room: snapshot(room) };
    });
    handle('playback:update', data => {
      const room = hostRoom();
      if (!Number.isFinite(data.position) || data.position < 0 || data.position > 86400 || typeof data.playing !== 'boolean') throw new Error('Estado de reprodução inválido.');
      room.state = { ...room.state, position: data.position, playing: data.playing, updatedAt: Date.now(), revision: room.state.revision + 1 };
      broadcast(room); return { room: snapshot(room) };
    });
    handle('playback:episode', data => {
      const room = hostRoom();
      room.state = { ...episode(data), position: 0, playing: false, updatedAt: Date.now(), revision: room.state.revision + 1 };
      room.members.forEach(member => { member.ready = false; }); broadcast(room); return { room: snapshot(room) };
    });
    handle('chat:send', data => {
      const room = currentRoom(), message = text(data.message, 500);
      if (!message) throw new Error('Escreva uma mensagem.');
      const entry = { id: randomUUID(), participant: socket.id, name: room.members.get(socket.id).name, message, createdAt: Date.now() };
      room.messages.push(entry); if (room.messages.length > 50) room.messages.shift();
      io.to(room.id).emit('chat:message', entry); return {};
    });
    handle('room:transfer', data => {
      const room = hostRoom(); if (!room.members.has(data.participant)) throw new Error('Participante não encontrado.');
      room.host = data.participant; broadcast(room); return {};
    });
    socket.on('disconnect', () => leave(socket));
  });
  return { server, io };
}
if (require.main === module) {
  const { server } = createWatchServer();
  const port = Number(process.env.PORT) || 3001;
  server.listen(port, () => console.log(`Servidor de salas pronto: http://localhost:${port}/health\nMantenha este terminal aberto durante os testes.`));
}
module.exports = { createWatchServer };
