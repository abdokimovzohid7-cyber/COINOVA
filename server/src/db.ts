import dotenv from 'dotenv';
import path from 'node:path';
dotenv.config({path:path.resolve(process.cwd(),'../.env')});
dotenv.config({path:path.resolve(process.cwd(),'.env'),override:true});
import { Pool, PoolClient } from 'pg';
if (!process.env.DATABASE_URL) console.warn('DATABASE_URL missing: database endpoints unavailable');
export const pool = new Pool({ connectionString:process.env.DATABASE_URL || 'postgresql://localhost/coinova',ssl:process.env.DATABASE_URL?.includes('localhost') ? false : process.env.DATABASE_URL?.includes('sslmode=disable') ? false : {rejectUnauthorized:false} });
export async function transaction<T>(fn:(client:PoolClient)=>Promise<T>):Promise<T> { const c=await pool.connect();try{await c.query('BEGIN');const v=await fn(c);await c.query('COMMIT');return v;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();} }
export async function reward(c:PoolClient,uid:string,currency:'FC'|'RC'|'XP',delta:number,reason:string,reference:string){
 const field={FC:'fc',RC:'rc',XP:'xp'}[currency];
 const r=await c.query(`UPDATE users SET ${field}=${field}+$1 WHERE id=$2 AND ${field}+$1 >=0 RETURNING id`,[delta,uid]);
 if(!r.rowCount) throw Object.assign(new Error('Insufficient balance'),{status:409});
 await c.query('INSERT INTO transactions(user_id,currency,delta,reason,reference) VALUES($1,$2,$3,$4,$5)',[uid,currency,delta,reason,reference]);
 if(currency==='XP')await c.query('UPDATE users SET level=1+floor(sqrt(xp::numeric / 100))::integer WHERE id=$1',[uid]);
}
