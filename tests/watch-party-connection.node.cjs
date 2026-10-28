const {test} = require('node:test');
const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const {waitForPartyConnection,warmPartyServer} = require('../js/watch-party-connection');
class Socket extends EventEmitter {
  connected=false; connects=0; disconnects=0;
  connect() {this.connects++;return this;}
  disconnect() {this.disconnects++;this.connected=false;return this;}
}
test('retries wait through connection errors until a delayed server connects',async()=>{
  const socket=new Socket(), progress=[];
  const waiting=waitForPartyConnection(socket,{timeoutMs:1000,onProgress:value=>progress.push(value)});
  socket.emit('connect_error',new Error('iniciando'));
  socket.emit('connect_error',new Error('iniciando'));
  socket.connected=true;socket.emit('connect');await waiting;
  assert.equal(progress.at(-1).attempts,2);assert.equal(socket.connects,1);assert.equal(socket.disconnects,0);
  assert.equal(socket.listenerCount('connect'),0);assert.equal(socket.listenerCount('connect_error'),0);
});
test('unavailable servers time out and stop retries',async()=>{
  const socket=new Socket();
  await assert.rejects(waitForPartyConnection(socket,{timeoutMs:10}),{code:'CONNECTION_TIMEOUT'});
  assert.equal(socket.disconnects,1);assert.equal(socket.listenerCount('connect'),0);
});
test('cancelling clears listeners and never succeeds on a later connection',async()=>{
  const socket=new Socket(), controller=new AbortController();
  const waiting=waitForPartyConnection(socket,{signal:controller.signal});controller.abort();
  await assert.rejects(waiting,{code:'CONNECTION_CANCELLED'});socket.emit('connect');
  assert.equal(socket.disconnects,1);assert.equal(socket.listenerCount('connect'),0);
});
test('silent cancellation is distinguished when leaving the player',async()=>{
  const socket=new Socket(),controller=new AbortController();controller.abort('silent');
  await assert.rejects(waitForPartyConnection(socket,{signal:controller.signal}),error=>error.silent===true);
  assert.equal(socket.connects,0);
});
test('background warmup sends a single credential-free request to health',async()=>{
  const requests=[];
  assert.equal(await warmPartyServer('https://example.test',{fetchFn:async(...args)=>{requests.push(args);return {type:'opaque'};}}),true);
  assert.equal(requests.length,1);assert.equal(requests[0][0],'https://example.test/health');
  assert.equal(requests[0][1].credentials,'omit');assert.equal(requests[0][1].mode,'no-cors');assert.equal(requests[0][1].cache,'no-store');
});
test('warmup errors are silent and invalid URLs do not send requests',async()=>{
  let calls=0;
  const fetchFn=async()=>{calls++;throw new Error('offline');};
  assert.equal(await warmPartyServer('',{fetchFn}),false);assert.equal(calls,0);
  assert.equal(await warmPartyServer('https://example.test',{fetchFn}),false);assert.equal(calls,1);
});
test('background warmup is bounded and can be cancelled on leaving the page',async()=>{
  const fetchFn=(_,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('cancelled')),{once:true}));
  assert.equal(await warmPartyServer('https://example.test',{fetchFn,timeoutMs:10}),false);
  const controller=new AbortController(), request=warmPartyServer('https://example.test',{fetchFn,signal:controller.signal});
  controller.abort();assert.equal(await request,false);
});
