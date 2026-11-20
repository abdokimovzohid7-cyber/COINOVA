import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from '../dist/server/index.js';

const sqlite = new DatabaseSync(':memory:');
sqlite.exec(readFileSync('drizzle/0000_accounts.sql', 'utf8'));
const DB = {
  prepare(sql) {
    const statement = sqlite.prepare(sql);
    const bind = (...args) => ({
      first: async () => statement.get(...args),
      all: async () => ({ results: statement.all(...args) }),
      run: async () => ({ meta: { changes: statement.run(...args).changes } }),
    });
    return { ...bind(), bind };
  },
  batch: queries => Promise.all(queries.map(query => query.all())),
};

createServer(async (req, res) => {
  try {
    const origin = 'http://' + (req.headers['x-forwarded-host'] ?? req.headers.host);
    const headers = new Headers(req.headers);
    headers.delete('oai-authenticated-user-id');
    if (req.headers['x-preview-account'] !== 'anonymous') {
      headers.set('oai-authenticated-user-id', req.headers['x-preview-account'] === 'friend' ? 'local-friend' : 'local-preview');
      headers.set('oai-authenticated-user-full-name', req.headers['x-preview-account'] === 'friend' ? 'Explorer' : 'Zoxid');
    }
    if (headers.has('origin') && new URL(headers.get('origin')).host === new URL(origin).host) {
      headers.set('origin', origin);
    }
    const response = await worker.fetch(new Request(origin + req.url, { method: req.method, headers }), { DB });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error);
    res.writeHead(500).end();
  }
}).listen(Number(process.env.PORT) || 4173, '0.0.0.0');
