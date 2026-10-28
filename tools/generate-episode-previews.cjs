/* Generate static previews once; range-only relay caps traffic per frame. */
'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { createHash, randomBytes } = require('node:crypto');
const { spawn } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const MANIFEST = path.join(ROOT, 'episode-previews.json');
const MAX_BYTES = 8 * 1024 * 1024;

async function generate(options = {}) {
  const ffmpeg = options.ffmpeg || process.env.FFMPEG_PATH || require('ffmpeg-static');
  const catalog = options.catalog || JSON.parse(await fs.readFile(path.join(ROOT, 'anime-data.json'), 'utf8'));
  const root = options.root || ROOT, manifestPath = options.manifest || MANIFEST;
  let manifest;
  try { manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8')); } catch (_) { manifest = { version: 1, entries: {} }; }
  const jobs = [];
  for (const anime of catalog.animes || catalog) {
    if (options.anime && String(anime.id) !== String(options.anime)) continue;
    for (const season of anime.seasons || []) {
      if (!Number.isSafeInteger(season.number) || season.number < 1) continue;
      if (options.season && Number(season.number) !== Number(options.season)) continue;
      for (const [index, episode] of (season.episodes || []).entries()) {
        const source = episode.videoUrl || episode.sources?.[0]?.url;
        if (!/^https?:\/\//i.test(source || '')) continue;
        const key = `${anime.id}/${season.number}/${index}`, hash = createHash('sha256').update(source).digest('hex').slice(0, 12);
        const name = String(anime.id).replace(/[^a-zA-Z0-9_-]/g, '-');
        const image = `images/episode-previews/${name}/${season.number}/${index + 1}-${hash}.png`;
        if (!options.force && manifest.entries[key]?.source === source && await fs.stat(path.join(root, image)).then(() => true, () => false)) continue;
        const duration = Number(episode.duration), fraction = .15 + parseInt(hash.slice(0, 2), 16) % 40 / 100;
        const second = Number.isFinite(duration) && duration > 1 ? Math.max(.2, duration * fraction) : 60;
        jobs.push({ key, source, image, second, title: anime.title });
      }
    }
  }
  if (options.limit) jobs.splice(Number(options.limit));
  const saveManifest = async () => { manifest.generatedAt = new Date().toISOString(); await fs.writeFile(manifestPath + '.tmp',JSON.stringify(manifest,null,2)); await fs.rename(manifestPath + '.tmp',manifestPath); };
  manifest.generating = jobs.length > 0; await saveManifest();
  const active = new Map(), controllers = new Set();
  const relay = http.createServer(async (request, response) => {
    const job = active.get(request.url);
    if (!job) { response.writeHead(404); response.end(); return; }
    const controller = new AbortController(); controllers.add(controller);
    response.once('close', () => controller.abort());
    try {
      const range = /^bytes=\d+-\d*$/.test(request.headers.range || '') ? request.headers.range : 'bytes=0-';
      const upstream = await fetch(job.source, { headers: { Range: range }, signal: controller.signal });
      if (upstream.status !== 206 || !upstream.headers.get('content-range')) {
        job.reason = `HTTP ${upstream.status}: a fonte não forneceu acesso parcial ao vídeo`;
        await upstream.body?.cancel(); response.writeHead(502); response.end(); return;
      }
      const headers = { 'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream', 'Content-Range': upstream.headers.get('content-range'), 'Accept-Ranges': 'bytes' };
      if (upstream.headers.get('content-length')) headers['Content-Length'] = upstream.headers.get('content-length');
      response.writeHead(206, headers);
      for await (const chunk of upstream.body) {
        job.bytes += chunk.length;
        if (job.bytes > MAX_BYTES) { job.reason = 'Limite de 8 MiB por prévia atingido'; controller.abort(); response.destroy(); return; }
        if (!response.write(chunk)) await new Promise(resolve => {
          const done = () => { response.off('drain',done); response.off('close',done); resolve(); };
          response.once('drain',done); response.once('close',done);
        });
        if (response.destroyed) break;
      }
      response.end();
    } catch (error) { if (!response.destroyed) response.destroy(); if (!job.reason && error.name !== 'AbortError') job.reason = error.message; }
    finally { controller.abort(); controllers.delete(controller); }
  });
  await new Promise(resolve => relay.listen(0, '127.0.0.1', resolve));
  let saved = 0, failed = 0, write = Promise.resolve();
  async function worker() {
    while (jobs.length) {
      const job = jobs.shift(), token = '/' + randomBytes(16).toString('hex');
      job.bytes = 0; active.set(token, job);
      const output = path.join(root, job.image), temporary = output + '.tmp.png';
      await fs.mkdir(path.dirname(output), { recursive: true });
      const result = await new Promise(resolve => {
        const proc = spawn(ffmpeg, ['-hide_banner','-loglevel','error','-nostdin','-y','-rw_timeout','6000000','-ss', String(job.second), '-probesize','1048576','-analyzeduration','1000000','-threads','1','-i',`http://127.0.0.1:${relay.address().port}${token}`,'-frames:v','1','-an','-sn','-dn','-vf','scale=240:135:force_original_aspect_ratio=increase,crop=240:135','-threads','1','-compression_level','9',temporary], { windowsHide: true, stdio: ['ignore','ignore','pipe'] });
        let error = ''; proc.stderr.on('data', chunk => { error = (error + chunk).slice(-600); });
        const timeout = setTimeout(() => { job.reason = 'Prazo de 18 segundos atingido'; proc.kill(); }, 18000);
        proc.on('error', error => { clearTimeout(timeout); resolve({ ok:false, error:error.message }); });
        proc.on('close', code => { clearTimeout(timeout); resolve({ ok:code === 0, error }); });
      });
      active.delete(token);
      if (result.ok) {
        const signature = await fs.readFile(temporary).then(bytes => bytes.subarray(0,8).toString('hex'), () => '');
        if (signature === '89504e470d0a1a0a') {
          await fs.rename(temporary, output);
          manifest.entries[job.key] = { image:job.image, source:job.source, second:job.second, width:240, height:135 };
          write = write.then(saveManifest);
          await write; saved++;
          console.log(`PNG ${job.key} · ${Math.round(job.bytes / 1024)} KiB lidos`); continue;
        }
      }
      failed++; await fs.unlink(temporary).catch(() => {});
      console.log(`SEM PRÉVIA ${job.key}: ${job.reason || result.error.trim().slice(-180)}`);
    }
  }
  try { await Promise.all(Array.from({length:Math.max(1,Math.min(3,options.workers || 2))}, worker)); }
  finally { controllers.forEach(controller => controller.abort()); relay.closeAllConnections(); await new Promise(resolve => relay.close(resolve)); }
  await write; manifest.generating = false; await saveManifest();
  console.log(`Concluído: ${saved} PNGs gerados, ${failed} fontes indisponíveis. Nenhum vídeo foi gravado.`);
  return { saved, failed };
}
if (require.main === module) {
  const args = process.argv.slice(2), options = {};
  for (let i=0;i<args.length;i++) { const key=args[i].replace(/^--/,''); if(key==='force') options.force=true; else options[key]=args[++i]; }
  generate(options).catch(error => { console.error(error); process.exitCode=1; });
}
module.exports = { generate };
