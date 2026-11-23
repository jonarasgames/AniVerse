const { execFile } = require('node:child_process');
const { readFile, rename, writeFile } = require('node:fs/promises');
const { join } = require('node:path');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const ffmpeg = process.env.FFMPEG_PATH || require('ffmpeg-static');

const root = join(__dirname, '..');
const output = join(root, 'music-motion.json');
const sampleRate = 1000;
const samplesPerWindow = 50;

function measureBass(pcm) {
    const levels = [];
    for (let offset = 0; offset + samplesPerWindow * 2 <= pcm.length; offset += samplesPerWindow * 2) {
        let power = 0;
        for (let i = 0; i < samplesPerWindow * 2; i += 2) {
            const sample = pcm.readInt16LE(offset + i) / 32768;
            power += sample * sample;
        }
        levels.push(Math.sqrt(power / samplesPerWindow));
    }
    const sorted = [...levels].sort((a, b) => a - b);
    const reference = Math.max(.015, sorted[Math.floor(sorted.length * .95)] || 0);
    return Buffer.from(levels.map((level, index) => {
        const previous = levels[Math.max(0, index - 2)];
        const attack = Math.max(0, level - previous);
        return Math.round(255 * Math.min(1, (level * .48 + attack * 1.1) / reference));
    })).toString('base64');
}

async function fetchAudio(url, bytes, signal) {
    const response = await fetch(url, { signal, headers: { Range: bytes } });
    const range = response.headers.get('content-range')?.match(/^bytes (\d+)-(\d+)\/(\d+)$/)?.slice(1).map(Number);
    if (!response.ok || (response.status === 206 && !range) || response.headers.get('content-type')?.startsWith('text/html')) {
        await response.body?.cancel();
        throw new Error(`HTTP ${response.status}, sem áudio direto`);
    }
    return { response, range };
}

async function* streamAudio(url, splitRanges, signal) {
    const block = 512 * 1024;
    const { response, range } = await fetchAudio(url, splitRanges ? `bytes=0-${block - 1}` : 'bytes=0-', signal);
    if (!range) {
        yield* response.body;
        return;
    }
    const [start, end, total] = range;
    if (start !== 0 || (!splitRanges && end + 1 !== total)) {
        await response.body.cancel();
        throw new Error('O servidor enviou apenas parte do áudio');
    }
    yield* response.body;

    // For slow hosts, fetch independent ranges in parallel and feed FFmpeg in file order.
    const width = 6;
    for (let offset = end + 1; offset < total; offset += width * block) {
        const parts = Array.from({ length: Math.min(width, Math.ceil((total - offset) / block)) }, async (_, index) => {
            const first = offset + index * block;
            const last = Math.min(first + block, total) - 1;
            const chunk = await fetchAudio(url, `bytes=${first}-${last}`, signal);
            if (!chunk.range || chunk.range[0] !== first || chunk.range[1] !== last || chunk.range[2] !== total) {
                await chunk.response.body.cancel();
                throw new Error('Intervalo recebido fora da posição solicitada');
            }
            return new Uint8Array(await chunk.response.arrayBuffer());
        });
        yield* await Promise.all(parts);
    }
}

async function readTrack(url, splitRanges) {
    const signal = AbortSignal.timeout(240000);
    let child;
    const decoded = new Promise((resolve, reject) => {
        child = execFile(ffmpeg, [
            '-hide_banner', '-loglevel', 'error', '-threads', '1', '-i', 'pipe:0', '-vn',
            '-ac', '1', '-af', 'lowpass=f=180', '-ar', String(sampleRate), '-f', 's16le', 'pipe:1'
        ], { encoding: 'buffer', signal, maxBuffer: 4 * 1024 * 1024, windowsHide: true }, (error, pcm) => {
            if (error) reject(error);
            else resolve(pcm);
        });
    });
    const [, pcm] = await Promise.all([pipeline(Readable.from(streamAudio(url, splitRanges, signal)), child.stdin), decoded]);
    if (pcm.length < sampleRate * 2) throw new Error('áudio insuficiente');
    return measureBass(pcm);
}

async function main() {
    const catalog = JSON.parse(await readFile(join(root, 'anime-data.json'), 'utf8'));
    const urls = new Set();
    for (const anime of catalog.animes) {
        const albums = Object.values(anime.osts || {}).flatMap(album => album.tracks || []);
        for (const track of [...(anime.openings || []), ...(anime.endings || []), ...albums]) {
            try {
                const url = new URL(String(track.audio).trim());
                if (url.protocol === 'https:' && url.hostname !== 'example.com') urls.add(url.href);
            } catch {}
        }
    }
    const previous = await readFile(output, 'utf8').then(JSON.parse, error => {
        if (error.code !== 'ENOENT') throw error;
        return {};
    });
    const tracks = Object.fromEntries(Object.entries(previous.tracks || {}).filter(([url]) => urls.has(url)));
    const args = process.argv.slice(2);
    const splitRanges = args.includes('--ranges');
    const requested = new Set(args.filter(argument => argument !== '--ranges').map(url => new URL(url).href));
    const pending = [...urls].reverse().filter(url => !tracks[url] && (!requested.size || requested.has(url)));
    const temporary = `${output}.${process.pid}.tmp`;
    let checkpoint = Promise.resolve();
    await Promise.all(Array.from({ length: Math.min(splitRanges ? 3 : 20, pending.length) }, async () => {
        while (pending.length) {
            const url = pending.shift();
            try {
                tracks[url] = await readTrack(url, splitRanges);
                console.log(`OK ${url}`);
                checkpoint = checkpoint.then(async () => {
                    const sorted = Object.fromEntries(Object.entries(tracks).sort(([left], [right]) => left.localeCompare(right)));
                    await writeFile(temporary, JSON.stringify({ samplesPerSecond: sampleRate / samplesPerWindow, tracks: sorted }) + '\n');
                    await rename(temporary, output);
                });
            } catch (error) {
                console.warn(`Sem análise de ${url}: ${String(error.message).split('\n')[0]}`);
            }
        }
    }));
    await checkpoint;
    console.log(`${Object.keys(tracks).length} de ${urls.size} fontes analisadas`);
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
