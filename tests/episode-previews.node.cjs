const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { generate } = require('../tools/generate-episode-previews.cjs');

test('creates one small PNG, reuses it and rejects sources without range support', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(),'aniverse-previews-test-'));
  const bytes = await fs.readFile('assets/webm/12/GC 12 - superior esquerdo.webm');
  let requests=0, ranges=true;
  const server = http.createServer((request,response)=>{
    requests++;
    const match=/bytes=(\d+)-(\d*)/.exec(request.headers.range || '');
    if(!ranges || !match) {response.writeHead(200,{'Content-Type':'video/webm','Content-Length':bytes.length});response.end(bytes);return;}
    const start=Number(match[1]),end=match[2]?Math.min(Number(match[2]),bytes.length-1):bytes.length-1;
    response.writeHead(206,{'Content-Type':'video/webm','Content-Length':end-start+1,'Content-Range':`bytes ${start}-${end}/${bytes.length}`,'Accept-Ranges':'bytes'});response.end(bytes.subarray(start,end+1));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const source=`http://127.0.0.1:${server.address().port}/episode.webm`;
    const options={root,manifest:path.join(root,'episode-previews.json'),workers:1,catalog:{animes:[{id:1,title:'Teste',seasons:[{number:1,episodes:[{duration:4,videoUrl:source}]}]}]}};
    assert.equal((await generate(options)).saved,1);
    const manifest=JSON.parse(await fs.readFile(options.manifest,'utf8'));
    const png=await fs.readFile(path.join(root,manifest.entries['1/1/0'].image));
    assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
    assert.equal(png.readUInt32BE(16),240);assert.equal(png.readUInt32BE(20),135);
    assert.equal(manifest.generating,false);
    const count=requests;
    assert.equal((await generate(options)).saved,0);assert.equal(requests,count);
    ranges=false;
    assert.equal((await generate({...options,force:true})).failed,1);
    assert.equal((await fs.readFile(path.join(root,manifest.entries['1/1/0'].image))).subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  } finally {
    server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
    assert.ok(path.basename(root).startsWith('aniverse-previews-test-'));await fs.rm(root,{recursive:true,force:true});
  }
});
