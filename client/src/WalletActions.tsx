import { useState, type FormEvent } from 'react';
import { Coins, CreditCard, Check, Clock, Send, UserRound, Wallet, Image as ImageIcon } from 'lucide-react';
import { dictionary, type Lang, type TranslationKey } from './i18n';

export type Payout = { id: string; amount: number; status: 'pending'|'processing'|'rejected'|'paid'; last4: string; network: string; hasReceipt: boolean };
type Review = { id: string; name: string; username?: string; telegramId?: string; payout: Payout };
type Request = <T>(path: string, method?: string, body?: unknown) => Promise<T>;
export const payoutWords = {
 uz: { exchange:'FC → RC ayirboshlash', rc:'Olinadigan RC', convert:'Almashtirish', withdraw:'Kartaga yechish', cash:'1 RC = 100 so‘m. Minimum 5 000 so‘m. Faqat Uzcard va Humo.', card:'Karta raqami (16 ta raqam)', amount:'Summa (so‘m)', submit:'Ariza yuborish', disabled:'Kartaga yechish hali faollashtirilmagan.', history:'Yechish arizalari', pending:'Ariza qabul qilindi', processing:'Admin tasdiqladi. To‘lov jarayonda.', rejected:'Admin yechib olishni rad etdi. RC hamyonga qaytarildi. Iltimos, admin bilan bog‘laning.', paid:'To‘lov yuborildi', receipt:'Chekni ko‘rish', review:'Arizalarni boshqarish', showCard:'Kartani ko‘rish', approve:'Tasdiqlash', reject:'Rad etish', upload:'Chekni yuborish', prompt:'To‘lov chekini yuboring', saved:'Amal bajarildi', cost:'Sarflanadi', empty:'Ko‘rib chiqiladigan arizalar yo‘q.' },
 ru: { exchange:'Обмен FC → RC', rc:'Получите RC', convert:'Обменять', withdraw:'Вывод на карту', cash:'1 RC = 100 сумов. Минимум 5 000 сумов. Только Uzcard и Humo.', card:'Номер карты (16 цифр)', amount:'Сумма (сум)', submit:'Отправить заявку', disabled:'Вывод на карту ещё не активирован.', history:'Заявки на вывод', pending:'Заявка принята', processing:'Администратор одобрил заявку. Платёж в обработке.', rejected:'Администратор отклонил вывод. RC возвращены. Свяжитесь с администратором.', paid:'Платёж отправлен', receipt:'Посмотреть чек', review:'Управление заявками', showCard:'Показать карту', approve:'Подтвердить', reject:'Отклонить', upload:'Отправить чек', prompt:'Загрузите изображение чека', saved:'Готово', cost:'Спишется', empty:'Нет заявок на рассмотрение.' },
 en: { exchange:'Exchange FC → RC', rc:'RC to receive', convert:'Exchange', withdraw:'Withdraw to card', cash:'1 RC = 100 UZS. Minimum 5,000 UZS. Uzcard and Humo only.', card:'Card number (16 digits)', amount:'Amount (UZS)', submit:'Submit request', disabled:'Card withdrawals are not active yet.', history:'Withdrawal requests', pending:'Request received', processing:'Approved by admin. Payment is processing.', rejected:'The admin declined the withdrawal. RC was returned. Please contact the admin.', paid:'Payment sent', receipt:'View receipt', review:'Manage withdrawals', showCard:'Show card', approve:'Approve', reject:'Reject', upload:'Send receipt', prompt:'Upload the payment receipt image', saved:'Done', cost:'Cost', empty:'No requests to review.' },
};

const holderLabel = {uz:'Karta egasining ism-familiyasi',ru:'Имя и фамилия владельца карты',en:'Cardholder full name'};
const steps = {uz:['Yuborildi','Jarayonda','Bajarildi'],ru:['Отправлена','В обработке','Выполнена'],en:['Submitted','Processing','Completed']};
const noPayouts = {uz:'Yuborilgan arizalar yo‘q.',ru:'Отправленных заявок нет.',en:'No submitted requests.'};

async function receiptImage(file: File) {
 if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 12_000_000) throw new Error('payout_invalid');
 const image = await createImageBitmap(file);
 try {
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 1100 / Math.max(image.width,image.height));
  canvas.width = Math.max(1, Math.round(image.width*scale));
  canvas.height = Math.max(1, Math.round(image.height*scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('payout_invalid');
  context.fillStyle = '#fff';
  context.fillRect(0,0,canvas.width,canvas.height);
  context.drawImage(image,0,0,canvas.width,canvas.height);
  for (const quality of [.85,.7,.55,.4]) {
   const result = canvas.toDataURL('image/jpeg',quality);
   if (result.length < 125000) return result;
  }
  throw new Error('payout_invalid');
 } finally { image.close(); }
}

export function WalletActions({mode,lang,fc,rc,enabled,admin,payouts,request,reload}: {
 mode:'exchange'|'withdraw'|'admin'; lang:Lang; fc:number; rc:number; enabled:boolean; admin:boolean; payouts:Payout[]; request:Request; reload:()=>Promise<void>;
}) {
 const words=payoutWords[lang];
 const [units,setUnits]=useState('1');
 const [amount,setAmount]=useState('');
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [failure,setFailure]=useState(false);
 const [reviews,setReviews]=useState<Review[]|null>(null);
 const [cards,setCards]=useState<Record<string,{card:string;holder?:string}>>({});
 const [receipts,setReceipts]=useState<Record<string,string>>({});
 const [upload,setUpload]=useState('');
 const [exchangeId,setExchangeId]=useState(()=>crypto.randomUUID());
 const [withdrawId,setWithdrawId]=useState(()=>crypto.randomUUID());
 const format=new Intl.NumberFormat(lang);
 const price=Number(units)*100_000;
 async function run(operation:()=>Promise<unknown>,refresh=false) {
  if(busy)return;
  setBusy(true); setMessage(''); setFailure(false);
  try {
   await operation();
   if(refresh)await reload();
   setMessage(words.saved);
  } catch(error) {
   setFailure(true);
   setMessage(dictionary[lang][('error_'+(error as Error).message) as TranslationKey] || dictionary[lang].error_server_error);
  } finally {setBusy(false);}
 }
 const loadReviews=async()=>setReviews(await request<Review[]>('/admin/payouts'));
 function withdraw(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  const form=event.currentTarget;
  const card=String(new FormData(form).get('card')).replace(/\s/g,'');
  void run(async()=>{
   const holder=String(new FormData(form).get('holder')).trim();
   await request('/wallet/withdraw','POST',{id:withdrawId,card,holder,amount:Number(amount)});
   setWithdrawId(crypto.randomUUID());setAmount('');form.reset();
  },true);
 }
 return <div className="wallet-actions">
  {mode==='admin' ? null : mode==='exchange' ? <section className="glass wallet-operation">
   <h2><Coins size={22} aria-hidden="true"/> {words.exchange}</h2>
   <p>{format.format(100_000)} FC = 1 RC</p>
   <form onSubmit={event=>{event.preventDefault();void run(async()=>{await request('/wallet/exchange','POST',{id:exchangeId,rc:Number(units)});setExchangeId(crypto.randomUUID());},true)}}>
    <label>{words.rc}<input type="number" min="1" step="1" required value={units} onChange={e=>setUnits(e.target.value)}/></label>
    <p>{words.cost} {format.format(price)} FC</p>
    <button className="primary-btn" disabled={busy||price>fc||price<100_000}>{words.convert}</button>
   </form>
  </section> : <section className="glass wallet-operation withdrawal-card">
   <div className="withdrawal-header">
    <span className="withdrawal-medal"><CreditCard size={25} aria-hidden="true"/></span>
    <div><h2>Uzcard / Humo</h2><p>{words.cash}</p></div>
   </div>
   <form onSubmit={withdraw}>
    <label><span className="withdrawal-field"><CreditCard size={16} aria-hidden="true"/>{words.card}</span><input name="card" inputMode="numeric" pattern="[0-9]{16}" maxLength={16} required autoComplete="off" disabled={!enabled}/></label>
    <label><span className="withdrawal-field"><UserRound size={16} aria-hidden="true"/>{holderLabel[lang]}</span><input name="holder" autoComplete="cc-name" minLength={3} maxLength={100} required disabled={!enabled}/></label>
    <label><span className="withdrawal-field"><Coins size={16} aria-hidden="true"/>{words.amount}</span><input type="number" min="5000" step="100" required value={amount} onChange={e=>setAmount(e.target.value)} disabled={!enabled}/></label>
    {Number(amount)>0 && <p>{words.cost} {format.format(Number(amount)/100)} RC</p>}
    <button className="primary-btn withdrawal-submit" disabled={!enabled||busy||Number(amount)<5000||Number(amount)>rc*100}><Send size={17} aria-hidden="true"/>{words.submit}</button>
   </form>
   {!enabled && <p className="withdrawal-notice"><Clock size={16} aria-hidden="true"/>{words.disabled}</p>}
  </section>}
  {message&&<p className={failure?'error-banner':'info-note'} role="status">{message}</p>}
  {mode==='withdraw'&&<section className="glass wallet-operation withdrawal-history"><h2><Wallet size={20} aria-hidden="true"/>{words.history}</h2>
   {payouts.length===0&&<p>{noPayouts[lang]}</p>}
   {payouts.map(item=><article className="wallet-payout" key={item.id}>
    <strong>{format.format(item.amount)} UZS · {item.network} •••• {item.last4}</strong>
    <ol className="payout-steps" aria-label={words.history}>
     {(['pending','processing','paid'] as const).map((step,index)=><li key={step}
      aria-current={item.status===step?'step':undefined}
      className={index<=['pending','processing','paid'].indexOf(item.status)?'reached':undefined}>
      <span className="payout-step-icon">{index===0?<Send size={14} aria-hidden="true"/>:index===1?<Clock size={14} aria-hidden="true"/>:<Check size={15} aria-hidden="true"/>}</span>
      {steps[lang][index]}
     </li>)}
    </ol>
    <p>{words[item.status]}</p>
    {item.hasReceipt && (receipts[item.id]
     ? <img className="wallet-receipt" src={receipts[item.id]} alt={words.receipt}/>
     : <button className="secondary-btn" disabled={busy} onClick={()=>run(async()=>{
      const {receipt}=await request<{receipt:string}>('/wallet/receipt/'+item.id);
      setReceipts(values=>({...values,[item.id]:receipt}));
     })}>{words.receipt}</button>)}
   </article>)}
  </section>}
  {mode==='admin'&&admin&&enabled&&<section className="glass wallet-operation">
   <h2>{words.review}</h2><button className="secondary-btn" disabled={busy} onClick={()=>run(loadReviews)}>{words.review}</button>
   {reviews?.length===0&&<p>{words.empty}</p>}
   {reviews?.map(({id,name,username,telegramId,payout})=>{
    const path='/admin/payouts/'+id+'/'+payout.id;
    const update=(operation:string,body?:unknown)=>run(async()=>{
     await request(path+'/'+operation,'POST',body);
     setCards(values=>{const next={...values};delete next[payout.id];return next;});setUpload('');
     await loadReviews();
    },true);
    return <article className="wallet-payout" key={payout.id}>
     <strong>{name} {username&&'@'+username} · {format.format(payout.amount)} UZS</strong>
     <p>ID: {id} · Telegram ID: {telegramId||'—'}</p>
     <p>{payout.network} {cards[payout.id]?.card||'•••• '+payout.last4}</p>
     {cards[payout.id]?.holder && <p>{holderLabel[lang]} · {cards[payout.id].holder}</p>}
     <div className="wallet-review-buttons">
      <button className="secondary-btn" disabled={busy} onClick={()=>run(async()=>{
       const details=await request<{card:string;holder?:string}>(path+'/card');
       setCards(values=>({...values,[payout.id]:details}));
      })}>{words.showCard}</button>
      {payout.status==='pending'&&<button className="secondary-btn" disabled={busy} onClick={()=>update('approve')}>{words.approve}</button>}
      <button className="secondary-btn" disabled={busy} onClick={()=>update('reject')}>{words.reject}</button>
      {payout.status==='processing'&&<button className="primary-btn" disabled={busy} onClick={()=>setUpload(payout.id)}><ImageIcon size={18}/>{words.upload}</button>}
     </div>
     {upload===payout.id&&<label>{words.prompt}
      <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>{
       const file=e.target.files?.[0];
       e.target.value='';
       if(file)void run(async()=>{
        const receipt=await receiptImage(file);
        await request(path+'/receipt','POST',{receipt});
        setCards(values=>{const next={...values};delete next[payout.id];return next;});setUpload('');
        await loadReviews();
       },true);
      }}/>
     </label>}
    </article>;
   })}
  </section>}
 </div>;
}
