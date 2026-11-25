// A web chat on your own backend: one Croche agent, replies streamed to the page.
// Demo only: every visitor shares the one user 'demo-user' (see README.md).
// Run: npm install, put the keys in .env (see README.md), npm start (node --env-file=.env).
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { Croche, LocalStateStore } from '@h1r-ai/croche';

const { CROCHE_PROJECT_KEY, CROCHE_DEVELOPMENT_KEY, PORT = '3000' } = process.env;
const production = process.env.NODE_ENV === 'production';
if (!CROCHE_PROJECT_KEY || (production && !process.env.CROCHE_SERVER_KEY)) {
  console.error('Set CROCHE_PROJECT_KEY in .env (npm start loads it); production also requires CROCHE_SERVER_KEY.');
  process.exit(2);
}

const croche = await Croche.open({
  projectKey: CROCHE_PROJECT_KEY,
  // Development only: never pass a development key in a release, or alongside a server key.
  developmentKey: production || process.env.CROCHE_SERVER_KEY ? undefined : CROCHE_DEVELOPMENT_KEY,
  serverKey: process.env.CROCHE_SERVER_KEY,               // production backend; never sent to the browser
  user: 'demo-user',                                      // your app's id for the signed-in person
  adapters: [new LocalStateStore(join(import.meta.dirname, '.croche'))],
  bundledConfig: {
    schema: 7,
    project: {
      defaults: { model: 'deepseek/deepseek-v4.1-flash' },        // your app chooses the model; there is no SDK default
      languages: { default: 'en', supported: ['en'] },
    },
    agents: { chat: { instructions: 'You are a friendly assistant. Answer in a few short sentences.' } },
  },
});
const agent = await croche.agent('chat');

// Every open page gets every stream event (snapshot, message.delta, message.end, state, ...).
const pages = new Set();
agent.subscribe({ onEvent: event => { for (const page of pages) page.write(`data: ${JSON.stringify(event)}\n\n`); } });

const server = createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(await readFile(join(import.meta.dirname, 'public/index.html')));
  } else if (req.method === 'GET' && req.url === '/events') {
    res.writeHead(200, {
      'content-type': 'text/event-stream', 'cache-control': 'no-cache',
      connection: 'keep-alive', 'x-accel-buffering': 'no',              // no proxy buffering
    });
    res.flushHeaders();                                                 // send headers now, not with the first event
    pages.add(res);
    req.on('close', () => pages.delete(res));
  } else if (req.method === 'POST' && req.url === '/send') {
    let body = '';
    for await (const chunk of req) body += chunk;
    const text = String(JSON.parse(body || '{}').text ?? '').trim().slice(0, 4000);
    if (!text) { res.writeHead(400).end(); return; }
    const receipt = await agent.send({ id: randomUUID(), input: [{ type: 'text', text }] });   // returns once accepted; the reply streams
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(receipt));
  } else {
    res.writeHead(404).end();
  }
});
server.listen(Number(PORT), () => console.log(`http://localhost:${PORT}`));

const stop = async () => { server.close(); await croche.close(); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
