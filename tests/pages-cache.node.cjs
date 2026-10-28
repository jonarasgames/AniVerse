const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
async function registration(href,controlled) {
  const html=fs.readFileSync('index.html','utf8');
  const script=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match=>match[1]).find(code=>code.includes('navigator.serviceWorker.register'));
  const callbacks={},workerEvents={};let registered,reloads=0;
  const registration={update:()=>Promise.resolve(),addEventListener(){}};
  const context=vm.createContext({URL,console,setInterval(){},localStorage:{setItem(){}},document:{addEventListener(){},visibilityState:'visible'},
    window:{addEventListener:(name,fn)=>callbacks[name]=fn,location:{href,reload:()=>reloads++}},
    navigator:{serviceWorker:{controller:controlled?{}:null,register:async(url,options)=>{registered={url,options};return registration;},addEventListener:(name,fn)=>workerEvents[name]=fn}}});
  vm.runInContext(script,context);await callbacks.load();
  workerEvents.controllerchange();workerEvents.controllerchange();
  return {registered,reloads};
}
test('GitHub Pages registers its worker inside the repository path',async()=>{
  const result=await registration('https://jonarasgames.github.io/AniVerse/?anime=36',true);
  assert.equal(new URL(result.registered.url).pathname,'/AniVerse/sw.js');assert.equal(result.registered.options.scope,'/AniVerse/');assert.equal(result.reloads,1);
});
test('local root and first installation do not produce reload loops',async()=>{
  const result=await registration('http://localhost:8000/',false);
  assert.equal(new URL(result.registered.url).pathname,'/sw.js');assert.equal(result.registered.options.scope,'/');assert.equal(result.reloads,0);
});
test('project homepage navigation checks the network before old cache',()=>{
  const context=vm.createContext({URL,self:{location:{origin:'https://jonarasgames.github.io'},addEventListener(){}}});
  vm.runInContext(fs.readFileSync('sw.js','utf8'),context);
  context.request={url:'https://jonarasgames.github.io/AniVerse/',mode:'navigate'};
  assert.equal(vm.runInContext('shouldNetworkFirst(request)',context),true);
});
