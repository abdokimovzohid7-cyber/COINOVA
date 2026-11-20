import 'dotenv/config';
import express,{type Request,type Response,type NextFunction} from 'express';
import cors from 'cors';import helmet from 'helmet';import rateLimit from 'express-rate-limit';
import {pool,transaction,reward} from './db.js';import {auth,admin,verifyTelegram,makeToken,tokenHash,type Authed} from './auth.js';
import {z} from 'zod';import path from 'node:path';import {fileURLToPath} from 'node:url';
const app=express();app.disable('x-powered-by');app.set('trust proxy',1);app.use(helmet({contentSecurityPolicy:false}));
app.use(cors({origin:process.env.PUBLIC_ORIGIN?.split(',').map(x=>x.trim())||false}));app.use(express.json({limit:'30kb'}));
app.use('/api',rateLimit({windowMs:60_000,limit:100,standardHeaders:'draft-7',legacyHeaders:false}));
const fail=(msg:string,status=400)=>{throw Object.assign(new Error(msg),{status})};
const uid=(r:Request)=>(r as Authed).uid!;const day=()=>new Date().toISOString().slice(0,10);
const TASKS=[{id:'profile',fc:75,xp:40,type:'once'},{id:'daily_explore',fc:50,xp:20,type:'daily'},{id:'daily_mining',fc:85,xp:35,type:'daily'}] as const;
const SHOP=[{id:'nebula_avatar',price:20},{id:'gold_orbit',price:45},{id:'cosmic_trail',price:80}];
app.get('/api/health',(_r,res)=>res.json({ok:true}));
app.post('/api/auth/telegram',rateLimit({windowMs:60_000,limit:12}),async(req,res,next)=>{try{
 const parsed=z.object({initData:z.string().max(8192)}).parse(req.body);const tg=verifyTelegram(parsed.initData);if(!tg)fail('Invalid Telegram authentication',401);
 const ref=tg!.start_param.match(/^ref_([0-9a-f-]{36})$/i)?.[1];
 const result=await transaction(async c=>{
 let existing=await c.query('SELECT id FROM users WHERE telegram_id=$1',[tg!.id]);let newUser=false;
 if(!existing.rowCount){newUser=true; const inserted=await c.query('INSERT INTO users(telegram_id,username,first_name) VALUES($1,$2,$3) ON CONFLICT(telegram_id) DO UPDATE SET username=EXCLUDED.username,first_name=EXCLUDED.first_name RETURNING id',[tg!.id,tg!.username,tg!.first_name]);existing=inserted;}
 else await c.query('UPDATE users SET username=$1,first_name=$2 WHERE id=$3',[tg!.username,tg!.first_name,existing.rows[0].id]);
 const userId=existing.rows[0].id as string;
 if(newUser && ref && ref!==userId){const referred=await c.query('UPDATE users SET referred_by=$1 WHERE id=$2 AND referred_by IS NULL AND id<>$1 AND EXISTS(SELECT 1 FROM users WHERE id=$1) RETURNING id',[ref,userId]);if(referred.rowCount){await c.query('UPDATE users SET referral_count=referral_count+1 WHERE id=$1',[ref]);await reward(c,ref,'FC',50,'referral',`referral:${userId}`);}}
 const token=makeToken();await c.query("INSERT INTO auth_sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '30 days')",[userId,tokenHash(token)]);return {token};
 });res.json(result);
 }catch(e){next(e);}});
// Local development-only session; disabled on Render/production.
app.post('/api/auth/dev',async(_req,res,next)=>{try{
 if(process.env.NODE_ENV==='production'||process.env.ALLOW_DEV_AUTH!=='true')fail('Development authentication disabled',403);
 const token=makeToken();await transaction(async c=>{const r=await c.query("INSERT INTO users(first_name,username) VALUES('Cosmic Explorer','dev_explorer') RETURNING id");await c.query("INSERT INTO auth_sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '7 days')",[r.rows[0].id,tokenHash(token)]);});
 res.json({token});}catch(e){next(e);}});
app.post('/api/auth/logout',auth,async(req,res,next)=>{try{const token=req.headers.authorization!.slice(7);await pool.query('DELETE FROM auth_sessions WHERE token_hash=$1',[tokenHash(token)]);res.json({ok:true});}catch(e){next(e);}});
app.get('/api/bootstrap',auth,async(req,res,next)=>{try{const id=uid(req);const [user,tx,session,claims,bonus,purchases,leaders,miningHistory]=await Promise.all([
 pool.query('SELECT id,telegram_id,username,first_name,role,fc,rc,xp,level,referral_count,streak,last_bonus_day,created_at FROM users WHERE id=$1',[id]),
 pool.query('SELECT id,currency,delta,reason,created_at FROM transactions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',[id]),
 pool.query('SELECT id,started_at,last_claimed_at,earned_fc FROM mining_sessions WHERE user_id=$1 AND ended_at IS NULL',[id]),
 pool.query('SELECT task_id,claim_day FROM task_claims WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',[id]),
 pool.query('SELECT claim_day FROM bonus_claims WHERE user_id=$1 ORDER BY claim_day DESC LIMIT 7',[id]),
 pool.query('SELECT item_id,created_at FROM purchases WHERE user_id=$1',[id]),
 pool.query('SELECT first_name,level,xp,fc FROM users ORDER BY xp DESC,id LIMIT 10'),
 pool.query('SELECT started_at,ended_at,earned_fc FROM mining_sessions WHERE user_id=$1 ORDER BY started_at DESC LIMIT 12',[id])
 ]);res.json({user:user.rows[0],transactions:tx.rows,mining:session.rows[0]||null,claims:claims.rows,bonuses:bonus.rows,purchases:purchases.rows,leaders:leaders.rows,miningHistory:miningHistory.rows,serverTime:new Date().toISOString(),tasks:TASKS,shop:SHOP});}catch(e){next(e);}});
const RATE=12; // 12 FC/minute, server time only. Hourly maximum is bounded by session time.
async function settleMining(c:import('pg').PoolClient,id:string,stop:boolean){
 const q=await c.query('SELECT * FROM mining_sessions WHERE user_id=$1 AND ended_at IS NULL FOR UPDATE',[id]);if(!q.rowCount)return null;
 const session=q.rows[0];const seconds=Math.max(0,Math.min(3600,Math.floor((Date.now()-new Date(session.last_claimed_at).getTime())/1000)));
 const totalSeconds=seconds+Number(session.earned_fc||0)%1; // integer rewards, seconds converted below
 const coins=Math.floor(totalSeconds*RATE/60);
 if(coins>0){await reward(c,id,'FC',coins,'mining',`mine:${session.id}:${new Date(session.last_claimed_at).getTime()}`);await reward(c,id,'XP',Math.max(1,Math.floor(coins/3)),'mining_xp',`mine_xp:${session.id}:${new Date(session.last_claimed_at).getTime()}`);}
 // Advance only whole rewarded minutes to avoid forfeiting fractional accrued seconds.
 const advance=coins>0?Math.floor(coins*60/RATE):0;
 if(stop){await c.query('UPDATE mining_sessions SET ended_at=now(),last_claimed_at=now(),earned_fc=earned_fc+$2 WHERE id=$1',[session.id,coins]);}
 else if(advance>0){await c.query("UPDATE mining_sessions SET last_claimed_at=last_claimed_at+($2::int*interval '1 second'),earned_fc=earned_fc+$3 WHERE id=$1",[session.id,advance,coins]);}
 return {coins};
}
app.post('/api/mining/start',auth,async(req,res,next)=>{try{await transaction(async c=>{await c.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[uid(req)]);const old=await c.query('SELECT id FROM mining_sessions WHERE user_id=$1 AND ended_at IS NULL',[uid(req)]);if(old.rowCount)fail('Mining already active',409);await c.query('INSERT INTO mining_sessions(user_id) VALUES($1)',[uid(req)]);});res.json({ok:true});}catch(e){next(e);}});
app.post('/api/mining/claim',auth,async(req,res,next)=>{try{const data=await transaction(async c=>{await c.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[uid(req)]);const v=await settleMining(c,uid(req),false);if(!v)fail('Mining is not active',409);return v;});res.json(data);}catch(e){next(e);}});
app.post('/api/mining/stop',auth,async(req,res,next)=>{try{const data=await transaction(async c=>{await c.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[uid(req)]);const v=await settleMining(c,uid(req),true);if(!v)fail('Mining is not active',409);return v;});res.json(data);}catch(e){next(e);}});
app.post('/api/bonus/claim',auth,async(req,res,next)=>{try{const result=await transaction(async c=>{
 const r=await c.query('SELECT streak,last_bonus_day FROM users WHERE id=$1 FOR UPDATE',[uid(req)]);const last=r.rows[0].last_bonus_day ? new Date(r.rows[0].last_bonus_day).toISOString().slice(0,10):'';
 if(last===day())fail('Daily bonus already claimed',409);
 const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);const streak=last===yesterday?Number(r.rows[0].streak)+1:1;const amount=30+Math.min((streak-1)%7,6)*15;
 await c.query('INSERT INTO bonus_claims(user_id,claim_day,amount_fc) VALUES($1,$2,$3)',[uid(req),day(),amount]);await c.query('UPDATE users SET streak=$2,last_bonus_day=$3 WHERE id=$1',[uid(req),streak,day()]);
 await reward(c,uid(req),'FC',amount,'daily_bonus',`bonus:${day()}`);await reward(c,uid(req),'XP',15,'daily_bonus_xp',`bonus_xp:${day()}`);return {amount,streak};
 });res.json(result);}catch(e){next(e);}});
app.post('/api/tasks/:id/claim',auth,async(req,res,next)=>{try{const task=TASKS.find(x=>x.id===req.params.id);if(!task)fail('Unknown task',404);
 const result=await transaction(async c=>{await c.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[uid(req)]);
 if(task!.id==='daily_mining'){const q=await c.query('SELECT 1 FROM mining_sessions WHERE user_id=$1 AND started_at::date=(now() at time zone \'utc\')::date',[uid(req)]);if(!q.rowCount)fail('Mining task not completed',409);}
 // Daily explore means opening today's app; server auth already proves activity.
 const claimDay=task!.type==='daily'?day():null;
 const dupe=await c.query('SELECT 1 FROM task_claims WHERE user_id=$1 AND task_id=$2 AND claim_day IS NOT DISTINCT FROM $3::date',[uid(req),task!.id,claimDay]);if(dupe.rowCount)fail('Task already claimed',409);
 await c.query('INSERT INTO task_claims(user_id,task_id,claim_day) VALUES($1,$2,$3)',[uid(req),task!.id,claimDay]);
 await reward(c,uid(req),'FC',task!.fc,'task',`task:${task!.id}:${claimDay||'once'}`);await reward(c,uid(req),'XP',task!.xp,'task_xp',`task_xp:${task!.id}:${claimDay||'once'}`);return {fc:task!.fc,xp:task!.xp};
 });res.json(result);}catch(e){next(e);}});
app.post('/api/shop/:id/buy',auth,async(req,res,next)=>{try{const item=SHOP.find(i=>i.id===req.params.id);if(!item)fail('Unknown product',404);
 await transaction(async c=>{await c.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[uid(req)]);const exist=await c.query('SELECT 1 FROM purchases WHERE user_id=$1 AND item_id=$2',[uid(req),item!.id]);if(exist.rowCount)fail('Already owned',409);
 await reward(c,uid(req),'RC',-item!.price,'shop',`shop:${item!.id}`);await c.query('INSERT INTO purchases(user_id,item_id,price_rc) VALUES($1,$2,$3)',[uid(req),item!.id,item!.price]);});res.json({ok:true});}catch(e){next(e);}});
// RC is not automatically exchangeable; all grants and configurable exchange policies require reviewed admin workflows.
app.post('/api/admin/grant',auth,admin,async(req,res,next)=>{try{const input=z.object({userId:z.string().uuid(),currency:z.enum(['FC','RC','XP']),amount:z.number().int().min(1).max(10000),reference:z.string().min(8).max(120)}).parse(req.body);
 await transaction(c=>reward(c,input.userId,input.currency,input.amount,'admin_grant',`admin:${input.reference}`));res.json({ok:true});}catch(e){next(e);}});
const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../client/dist');
app.use(express.static(dir));app.get('*',(req,res)=>{if(req.path.startsWith('/api/'))return res.status(404).json({error:'Not found'});res.sendFile(path.join(dir,'index.html'));});
app.use((e:Error&{status?:number},_req:Request,res:Response,_next:NextFunction)=>{const status=e.status||((e as {name?:string}).name==='ZodError'?400:500);if(status>=500)console.error(e);res.status(status).json({error:status>=500?'Internal server error':e.message});});
const port=Number(process.env.PORT)||4000;app.listen(port,'0.0.0.0',()=>console.log(`COINOVA server listening on ${port}`));
