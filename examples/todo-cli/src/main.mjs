import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { parseArgs, stripVTControlCharacters } from 'node:util';
import { AppError, errorMessage, openSession, settings } from './app.mjs';

import { inputFor } from './input.mjs';

const printable = text => stripVTControlCharacters(String(text)).replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '');

export async function run({ args = process.argv.slice(2), env = process.env,
  input = process.stdin, output = process.stdout, open = openSession } = {}) {
  const say = text => output.write(`${printable(text)}\n`);
  let values;
  try { ({ values } = parseArgs({ args, options: {
    prompt: { type: 'string' }, help: { type: 'boolean' },
  } })); } catch { throw new AppError('Use --prompt "message", or --help.'); }
  if (values.help) {
    say('Usage: npm start [-- --prompt "message"]\nCommands: /list, /photo path/to/list.jpg, /quit.');
    return;
  }
  const oneShot = values.prompt !== undefined;
  if (oneShot && !values.prompt.trim()) {
    throw new AppError('Use a nonempty --prompt message.');
  }
  if (!oneShot && !input.isTTY) throw new AppError('Use --prompt for shell/noninteractive input.');
  const options = settings(env);
  const session = await open({ ...options, dataDir: join('.data', options.user) });
  let rl;
  try {
    if (oneShot) {
      say(`Dori: ${await session.send(inputFor(values.prompt, session.store))}`);
      return;
    }
    rl = createInterface({ input, output });
    let closed = false;
    rl.on('close', () => { closed = true; });
    say('Dori — your to-do assistant. /list shares current tasks; /photo PATH adds a shopping list; /quit exits.');
    while (!closed) {
      let text;
      try { text = (await rl.question('\n> ')).trim(); }
      catch (error) { if (closed) break; throw error; }
      if (!text) continue;
      if (text === '/quit' || text === '/exit') break;
      try { say(`Dori: ${await session.send(inputFor(text, session.store))}`); }
      catch (error) { say(errorMessage(error)); }
    }
  } finally {
    rl?.close();
    await session.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch(error => { console.error(errorMessage(error)); process.exitCode = 1; });
}
