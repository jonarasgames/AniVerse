const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../js/anime-db.js'),'utf8').split('const animeDB = new AnimeDatabase();')[0];
function fixture(profileManager) {
  const saved=new Map();
  const Database=vm.runInNewContext(source+';AnimeDatabase',{window:{profileManager},localStorage:{setItem:(key,value)=>saved.set(key,value)}});
  const db=Object.create(Database.prototype);
  db.animes=[{id:1,title:'Anime',seasons:[{number:7,episodes:[{duration:100}]}]}];
  db.continueWatching={};
  return {db,saved};
}
test('legacy progress saving preserves the exact timestamp in the active profile',()=>{
  let entry;
  const {db}=fixture({getActiveProfile:()=>({id:'profile'}),updateContinueWatching:(_,data)=>entry=data});
  db.saveContinueWatching(1,7,1,42.75);
  assert.equal(entry.currentTime,42.75);
  assert.equal(entry.progress,42.75);
  assert.equal(entry.season,7);
});
test('progress saving without profiles persists the timestamp for resuming',()=>{
  const {db,saved}=fixture();
  db.saveContinueWatching(1,7,1,42.75);
  const entry=JSON.parse(saved.get('continueWatching'))['1'];
  assert.equal(entry.currentTime,42.75);
  assert.equal(entry.progress,42.75);
});
