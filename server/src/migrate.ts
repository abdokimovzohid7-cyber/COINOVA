import { readFile } from 'node:fs/promises';import {fileURLToPath} from 'node:url';import {pool} from './db.js';
const sql=await readFile(fileURLToPath(new URL('../sql/001_init.sql',import.meta.url)),'utf8');
await pool.query(sql);console.log('Database schema ready');await pool.end();
