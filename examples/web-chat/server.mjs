// A web chat on your own backend: one Croche agent, replies streamed to the page.
// Demo only: every visitor shares the one user 'demo-user' (see README.md).
// Run: put h1r-ai-croche-0.4.0.tgz here (from Releases), npm install, set the env below, npm start.
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { Croche } from '@h1r-ai/croche';
import { FileStorage } from '@h1r-ai/croche/node';

const { CROCHE_CLOUD_URL, CROCHE_PROJECT_KEY, CROCHE_DEBUG_TOKEN, PORT = '3000' } = process.env;
if (!CROCHE_CLOUD_URL || !CROCHE_PROJECT_KEY) {
  console.error('Set CROCHE_CLOUD_URL and CROCHE_PROJECT_KEY (and CROCHE_DEBUG_TOKEN in development).');
  process.exit(2);
}

const croche = await Croche.open({
  cloudUrl: CROCHE_CLOUD_URL,
  projectKey: CROCHE_PROJECT_KEY,
  debugToken: CROCHE_DEBUG_TOKEN,                         // development only, never in a release
  user: 'demo-user',                                      // your app's id for the signed-in person
  storage: new FileStorage(join(import.meta.dirname, '.croche')),
  config: { instructions: 'You are a friendly assistant. Answer in a few short sentences.' },
});
const agent = await croche.agent();

// Every open page gets every stream event (snapshot, message.delta, message.end, state, ...).
const pages = new Set();
agent.subscribe({ onEvent: event => { for (const page of pages) page.write(`data: ${JSON.stringify(event)}\n\n`); } });

const server = createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(await readFile(join(import.meta.dirname, 'public/index.html')));
  } else if (req.method === 'GET' && req.url === '/events') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });
    pages.add(res);
    req.on('close', () => pages.delete(res));
  } else if (req.method === 'POST' && req.url === '/send') {
    let body = '';
    for await (const chunk of req) body += chunk;
    const text = String(JSON.parse(body || '{}').text ?? '').trim().slice(0, 4000);
    if (!text) { res.writeHead(400).end(); return; }
    const receipt = await agent.send({ id: randomUUID(), text });   // returns at once; the reply streams
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(receipt));
  } else {
    res.writeHead(404).end();
  }
});
server.listen(Number(PORT), () => console.log(`http://localhost:${PORT}`));

const stop = async () => { server.close(); await croche.close(); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
