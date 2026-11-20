import { createHmac,createHash,randomBytes,timingSafeEqual } from 'node:crypto';
import type { Request,Response,NextFunction } from 'express';
import {pool} from './db.js';
export type Authed=Request & {uid?:string;role?:string};
const secret=process.env.JWT_SECRET;
export function verifyTelegram(initData:string){
 const params=new URLSearchParams(initData);const hash=params.get('hash');const authDate=Number(params.get('auth_date'));
 if(!hash|| !/^[a-f0-9]{64}$/.test(hash)||!Number.isFinite(authDate)||Math.abs(Date.now()/1000-authDate)>86400)return null;
 const botToken=process.env.TELEGRAM_BOT_TOKEN;if(!botToken)return null;
 const check=Array.from(params.entries()).filter(([k])=>k!=='hash' && k!=='signature').sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('\n');
 const key=createHmac('sha256','WebAppData').update(botToken).digest();
 const expected=createHmac('sha256',key).update(check).digest('hex');
 if(!timingSafeEqual(Buffer.from(hash,'hex'),Buffer.from(expected,'hex')))return null;
 try { const user=JSON.parse(params.get('user')||'null');return user&&Number.isSafeInteger(user.id)&&user.id>0 ? {id:String(user.id),first_name:String(user.first_name||'Explorer').slice(0,80),username:String(user.username||'').slice(0,80),start_param:String(params.get('start_param')||'').slice(0,80)} : null;}catch{return null;}
}
export function tokenHash(token:string){return createHash('sha256').update(token).digest('hex');}
export function makeToken(){return randomBytes(32).toString('base64url');}
export async function auth(req:Request,res:Response,next:NextFunction){try{
 const token=req.headers.authorization?.match(/^Bearer ([\w-]{20,})$/)?.[1];if(!token)return res.status(401).json({error:'Authentication required'});
 const q=await pool.query('SELECT s.user_id,u.role FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()',[tokenHash(token)]);
 if(!q.rowCount)return res.status(401).json({error:'Session expired'});
 (req as Authed).uid=q.rows[0].user_id;(req as Authed).role=q.rows[0].role;next();
 }catch(nextErr){next(nextErr);}}
export function admin(req:Request,res:Response,next:NextFunction){if((req as Authed).role!=='admin')return res.status(403).json({error:'Forbidden'});next();}
