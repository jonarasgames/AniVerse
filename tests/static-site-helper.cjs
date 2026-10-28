const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
async function ensureStaticSite() {
  try { const response=await fetch('http://localhost:8000/index.html',{signal:AbortSignal.timeout(1000)}); if(response.ok) return null; } catch (_) {}
  const root=path.resolve(__dirname,'..');
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webm':'video/webm','.ttf':'font/ttf','.woff2':'font/woff2'};
  const server=http.createServer(async(request,response)=>{
    try {
      const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
      const file=path.resolve(root, '.'+(pathname==='/'?'/index.html':pathname));
      if(!file.startsWith(root+path.sep)) {response.writeHead(403);response.end();return;}
      const bytes=await fs.readFile(file);
      response.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':bytes.length});response.end(bytes);
    } catch (_) {response.writeHead(404);response.end();}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(8000,'127.0.0.1',resolve);});
  return server;
}
module.exports={ensureStaticSite};
