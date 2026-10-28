const { test } = require('node:test');
const assert = require('node:assert/strict');
const { io } = require('socket.io-client');
const { createWatchServer } = require('./server');

test('salas sincronizam, restringem controle e transferem anfitrião', async t => {
  const { server, io: hub } = createWatchServer();
  const clients = [];
  t.after(async () => { clients.forEach(client => client.disconnect()); await new Promise(resolve => hub.close(resolve)); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const health = await fetch(`${url}/health`).then(r => r.json());
  assert.equal(health.ok, true);
  async function connect() {
    const client = io(url, { transports: ['websocket'], extraHeaders: { Origin: 'http://localhost:8000' }, reconnection: false });
    clients.push(client);
    await new Promise((resolve, reject) => { client.once('connect', resolve); client.once('connect_error', reject); });
    return client;
  }
  const send = (client, name, data = {}) => client.timeout(2000).emitWithAck(name, data);
  const host = await connect(), guest = await connect();
  const created = await send(host, 'room:create', { anime: '36', season: 1, episode: 1, position: 30, playing: true, participantName: 'Host' });
  assert.equal(created.ok, true);
  const id = created.room.id;
  assert.ok(created.room.state.position >= 30 && created.room.state.position < 32);
  assert.equal((await send(guest, 'room:join', { id, participantName: 'Amigo' })).room.members.length, 2);
  const afterJoin = (await send(host, 'room:get')).room.state;
  assert.ok(afterJoin.position >= 30 && afterJoin.position < 32);
  assert.equal(afterJoin.playing, true);
  assert.equal((await send(guest, 'playback:update', { position: 50, playing: true })).ok, false);
  assert.equal((await send(guest, 'room:suggest', { anime: '10', season: 2, episode: 1 })).ok, true);
  const suggestion = (await send(host, 'room:get')).room.suggestions[0];
  assert.equal(suggestion.anime, '10');
  assert.equal((await send(guest, 'room:suggestion:accept', { id: suggestion.id })).ok, false);
  assert.equal((await send(host, 'room:suggestion:accept', { id: suggestion.id })).room.state.anime, '10');
  assert.equal((await send(host, 'playback:update', { position: 50, playing: true })).ok, true);
  const state = (await send(guest, 'room:get')).room.state;
  assert.ok(state.position >= 50 && state.position < 52);
  assert.equal(state.playing, true);
  assert.equal((await send(host, 'playback:update', { position: -1, playing: true })).ok, false);
  await send(guest, 'chat:send', { message: 'Olá!' });
  assert.equal((await send(host, 'room:get')).room.messages[0].message, 'Olá!');
  await send(host, 'room:leave');
  assert.equal((await send(guest, 'room:get')).room.host, guest.id);
  assert.equal((await send(guest, 'playback:episode', { anime: '36', season: 1, episode: 2 })).ok, true);
  await send(guest, 'room:leave');
  assert.equal((await send(host, 'room:join', { id })).ok, false);
});
