import { WalletActions, payoutWords, type Payout } from './WalletActions';
import React,{useEffect,useRef,useState} from 'react';import{createRoot}from'react-dom/client';
import{Home,Pickaxe,ListChecks,Gift,Wallet,UserRound,ShoppingBag,Coins,Users,Trophy,Bell,ArrowRight,ArrowUpRight,ArrowDownLeft,Copy,Check,Play,HandCoins,CircleStop,Send,Bot,LogOut,Sparkles,Zap,Clock,ShieldCheck,Globe,Rocket,ChevronRight,Orbit,Star,Moon,Gem,Flame,Crown,Camera}from'lucide-react';
import{dictionary,type Lang,type TranslationKey}from'./i18n';import './styles.css';
import { PressAnimation } from './PressAnimation';
import { PressUpgrades } from './PressUpgrades';
type Page='home'|'mining'|'tasks'|'bonus'|'wallet'|'exchange'|'withdraw'|'profile'|'shop'|'coin'|'referrals'|'leaderboard'|'admin';
type User={id:string;profile_id:number;avatar?:string;telegram_id:string|null;username:string;first_name:string;role:string;fc:string;rc:string;xp:string;level:number;referral_count:number;streak:number;last_bonus_day:string|null;created_at:string};
type Mission={id:string;fc:number;xp:number;type:string;kind?:'channel'|'bot';handle?:string;secret?:string};
type Equipment = { id: string; name: string; kind: 'miner'|'boost'|'storage'; currency: 'FC'|'RC'; price: number; value: number; art: number };
type MiningConfig = {rate: number; capacity: number};
const equipmentLabels = {
 uz: {miner:'Mining qurilmalari', boost:'Mining tezlatkichlari', storage:'FC omborlari'},
 ru: {miner:'Устройства', boost:'Ускорители', storage:'Хранилища FC'},
 en: {miner:'Mining devices', boost:'Mining boosters', storage:'FC storage'},
};
function EquipmentArt({item}: {item: Equipment}) {
 return <div className="equipment-art" aria-hidden="true" style={{
  backgroundPosition: `${(item.art % 5) * 25}% ${Math.floor(item.art / 5) * 12.5}%`,
 }}/>;
}
type Transaction={id:string;currency:string;delta:string;reason:string;created_at:string};type State={user:User;equipment?:Equipment[];miningConfig?:Record<string,MiningConfig>;deviceLevels?:Record<string,number>;deviceUpgradePrices?:number[];deviceMining?:Record<string,({last_claimed_at:string;earned_fc:number}&Partial<MiningConfig>)|null>;payoutEnabled?:boolean;payouts?:Payout[];miningLevel?:number;mainStorageLevel?:number;mainStorageLevels?:{capacity:number;price:number}[];miningLevels?:{price:number;rate:number}[];transactions:Transaction[];mining:{id:string;started_at:string;last_claimed_at:string;earned_fc:string;rate?:number;capacity?:number}|null;claims:{task_id:string;claim_day:string|null}[];bonuses:{claim_day:string}[];purchases:{item_id:string}[];leaders:{avatar?:string|null;first_name:string;level:number;xp:string;fc:string}[];miningHistory:{started_at:string;ended_at:string|null;earned_fc:string}[];serverTime:string;tasks:Mission[];isAdmin?:boolean;managedTasks?:Mission[];telegramLinked?:boolean;telegramBot?:string;shop:{id:string;price:number}[];shopBundle?:{id:string;itemIds:string[];price:number;endsAt:number}|null};
const isRender = window.location.hostname === 'coinova-web.onrender.com';
const telegramWebApp = () => (window as Window & {Telegram?: {WebApp?: {initData?: string; ready?: () => void}}}).Telegram?.WebApp;
function loadTelegramSdk() {
 if (telegramWebApp()) return Promise.resolve();
 return new Promise<void>((resolve, reject) => {
  const script = document.createElement('script');
  const timeout = window.setTimeout(() => {
   script.remove();
   reject(new Error('telegram_unavailable'));
  }, 5000);
  script.src = 'https://telegram.org/js/telegram-web-app.js';
  script.onload = () => { clearTimeout(timeout); resolve(); };
  script.onerror = () => { clearTimeout(timeout); script.remove(); reject(new Error('telegram_unavailable')); };
  document.head.append(script);
 });
}
const telegramLoginCopy = {
 uz: ['Telegram orqali davom etish', 'Ilovani COINOVA botidagi menyudan oching.'],
 ru: ['Продолжить через Telegram', 'Откройте приложение из меню бота COINOVA.'],
 en: ['Continue with Telegram', 'Open the app from the COINOVA bot menu.'],
} as const;
const returnPath = () => window.location.pathname + window.location.search;
const authPath = (action: 'signin' | 'signout') =>
  `/${action}-with-chatgpt?return_to=${encodeURIComponent(returnPath())}`;
async function request<T>(url:string,method='GET',body?:unknown):Promise<T>{
 const headers:Record<string,string> = method==='POST'?{'X-Coinova-Action':'1'}:{};
 if(isRender && telegramWebApp()?.initData) headers['X-Coinova-Telegram'] = telegramWebApp()!.initData!;
 if(body!==undefined)headers['Content-Type']='application/json';
 const r=await fetch('/api'+url,{method,headers,body:JSON.stringify(body)});
 if(r.status===401)throw new Error('sign_in_required');
 const j=await r.json();
 if(!r.ok)throw new Error(j.error||'server_error');
 return j as T;
}
const tashkentDay=(time:number)=>new Date(time+5*3600000).toISOString().slice(0,10);
const number=(v:number|string)=>Number(v||0).toLocaleString();const date=(v:string)=>new Date(v).toLocaleDateString();
function TelegramLogin({bot,onAuth}:{bot:string;onAuth:(value:unknown)=>void}) {
 const container=useRef<HTMLDivElement>(null);
 const callback=useRef(onAuth);
 callback.current=onAuth;
 useEffect(()=>{
  const host=container.current;
  if(!host)return;
  const globals=window as Window & {coinovaTelegramAuth?:(value:unknown)=>void};
  globals.coinovaTelegramAuth=value=>callback.current(value);
  const script=document.createElement('script');
  script.src='https://telegram.org/js/telegram-widget.js?22';
  script.async=true;
  script.dataset.telegramLogin=bot;
  script.dataset.size='medium';
  script.dataset.onauth='coinovaTelegramAuth(user)';
  host.appendChild(script);
  return ()=>{host.replaceChildren();delete globals.coinovaTelegramAuth};
 },[bot]);
 return <div ref={container}/>;
}
function PlanetLogo({size=40}:{size?:number}){return <svg width={size} height={size} viewBox="0 0 72 72" aria-hidden="true"><defs><linearGradient id="planet" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#C59AFF"/><stop offset="1" stopColor="#5521AE"/></linearGradient></defs><circle cx="36" cy="36" r="22" fill="url(#planet)"/><circle cx="28" cy="27" r="9" fill="#FFFFFF" opacity=".15"/><ellipse cx="36" cy="36" rx="32" ry="12" transform="rotate(-28 36 36)" fill="none" stroke="#FFC857" strokeWidth="3.8"/><path d="M36 23l3.5 9.5L49 36l-9.5 3.5L36 49l-3.5-9.5L23 36l9.5-3.5z" fill="#FFE69D"/></svg>}
function Astronaut() {
 return <svg className="astronaut astronaut-render" viewBox="0 0 320 480" width="320" height="480"
  preserveAspectRatio="xMidYMax meet" role="img" aria-label="COINOVA cosmic astronaut">
  <defs>
   <linearGradient id="astronaut-sole" x2="0" y2="1">
    <stop stopColor="#f2e7f6"/>
    <stop offset="1" stopColor="#bea5d0"/>
   </linearGradient>
   <clipPath id="astronaut-cutout">
    <path clipRule="evenodd" d="M0 0H320V480H0Z
     M165 312 C160 324 156 334 152 345 C153 353 148 362 146 370
     C144 381 140 389 139 397 C138 403 135 408 134 416
     C135 429 133 438 138 445 L141 454 H160
     C161 448 165 440 166 432 L168 412
     C167 401 169 397 171 393 C167 386 170 378 168 372
     C166 366 171 358 171 352 C167 347 167 340 168 333 L166 325 Z
     M75 142 Q84 142 91 144 Q92 148 87 154 Q81 160 79 164
     Q85 168 89 179 Q100 171 113 167 Q103 158 95 150 Q89 142 88 137
     Q82 143 75 142 Z
     M119 170 Q127 173 138 175 Q145 192 142 207 L139 225
     Q132 229 130 241 Q124 247 114 247 L111 241 Q117 239 126 234
     L121 226 Q132 214 129 198 Q129 181 119 170 Z
     M216 166 Q223 155 228 145 Q225 168 234 178 Q240 187 245 192
     Q237 195 235 202 Q231 192 225 187 Q222 176 216 166 Z"/>
   </clipPath>
  </defs>
  <path fill="url(#astronaut-sole)" d="M60.5 457.5 Q68 459 86 460 L91 468.7 H79
   Q71.5 468.7 67.5 465.5 L61 460.5 Q59 459.1 60.5 457.5 Z
   M218 463 Q237 462 256.5 452.5 L257.5 460
   Q256 463 248 464.4 Q229 468.6 218 466.4 Z"/>
  <image href="/astronaut.webp" width="320" height="480" clipPath="url(#astronaut-cutout)"/>
 </svg>;
}

const coinRimAngles = Array.from({ length: 16 }, (_, index) => index * 22.5);

const heroQuestion = {
 uz: 'Bugun yangi yutuqqa erishishga tayyormisiz?',
 ru: 'Готовы к новым достижениям сегодня?',
 en: 'Ready for new achievements today?',
};

function HeroTypewriter({ text }: { text: string }) {
 const [visible, setVisible] = useState(text);
 const paragraph = useRef<HTMLParagraphElement>(null);

 useEffect(() => {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const letters = Array.from(text);
  let timer: number;
  let length = letters.length;
  let deleting = true;
  let inView = false;

  function tick() {
   length += deleting ? -1 : 1;
   setVisible(letters.slice(0, length).join(''));
   if (length === 0 || length === letters.length) {
    deleting = length > 0;
    timer = window.setTimeout(tick, deleting ? 2400 : 430);
   } else {
    timer = window.setTimeout(tick, deleting ? 70 : 88);
   }
  }

  function reset() {
   window.clearTimeout(timer);
   setVisible(text);
   length = letters.length;
   deleting = true;
   if (inView && !document.hidden && !preference.matches) timer = window.setTimeout(tick, 2400);
  }

  const observer = 'IntersectionObserver' in window && paragraph.current
   ? new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      reset();
     })
   : null;
  if (observer && paragraph.current) observer.observe(paragraph.current);
  else inView = true;
  reset();
  document.addEventListener('visibilitychange', reset);
  preference.addEventListener('change', reset);
  return () => {
   window.clearTimeout(timer);
   observer?.disconnect();
   document.removeEventListener('visibilitychange', reset);
   preference.removeEventListener('change', reset);
  };
 }, [text]);

 return <p className="hero-typewriter" ref={paragraph}>
  <span className="hero-typewriter-space">{text}</span>
  <span className="hero-typewriter-line" aria-hidden="true">{visible}<span className="hero-typewriter-cursor"/></span>
 </p>;
}

function HomeMotion({ children }: { children: React.ReactNode }) {
 const root = useRef<HTMLDivElement>(null);

 useEffect(() => {
  if (!root.current || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
   for (const entry of entries) {
    if (entry.isIntersecting && entry.target instanceof HTMLElement) {
     entry.target.dataset.motionVisible = 'true';
     observer.unobserve(entry.target);
    }
   }
  }, { threshold: .1 });
  const targets = '.hero-content, .astronaut-label, .cosmic-balance, .xp-card, .quick-top, .quick-grid, .section-title, .achievement, .list-card';
  root.current.querySelectorAll(targets).forEach(target => observer.observe(target));
  const sectionObserver = new IntersectionObserver(entries => {
   for (const entry of entries) {
    if (entry.target instanceof HTMLElement) {
     entry.target.dataset.animationPaused = String(!entry.isIntersecting);
    }
   }
  });
  root.current.querySelectorAll('.cosmic-banner, .hero, .balance-grid, .xp-card, .quick-section, .section-title, .achievement, .list-card')
   .forEach(section => sectionObserver.observe(section));
  return () => {
   observer.disconnect();
   sectionObserver.disconnect();
  };
 }, []);

 return <div className="home-page" ref={root}>{children}</div>;
}

function CoinSpin() {
 return <span className="hero-coin-spin">
  {coinRimAngles.map(angle => <span className="hero-coin-rim-segment" key={angle}
   style={{ transform: `rotateZ(${angle}deg)` }}/>)}
  <span className="hero-coin-face">C</span>
  <span className="hero-coin-face hero-coin-face--back">C</span>
 </span>;
}

function BalanceToken({ currency }: { currency: 'fc' | 'rc' }) {
 const image = currency === 'fc' ? '/fc-helmet.webp' : '/rc-moon.webp';
 return <span className="balance-coin" aria-hidden="true">
  <span className="balance-token-spin">
   {[-2, -1, 0, 1, 2].map(depth => <span key={depth} className="balance-token-edge"
    style={{ transform: `translateZ(${depth}px)` }}/>)}
   <img className="balance-token-face" src={image} alt=""/>
   <img className="balance-token-face balance-token-face--back" src={image} alt=""/>
  </span>
 </span>;
}

function FloatingCoins() {
 return <div className="hero-coins" aria-hidden="true">
  {['lower', 'upper'].map(position => <span className={`hero-coin hero-coin--${position}`} key={position}>
   <CoinSpin/>
  </span>)}
 </div>;
}
const nav:[Exclude<Page,'exchange'|'withdraw'|'admin'>,typeof Home][]=[['home',Home],['mining',Pickaxe],['tasks',ListChecks],['bonus',Gift],['wallet',Wallet],['profile',UserRound]];
const extras:[Exclude<Page,'exchange'|'withdraw'|'admin'>,typeof Home][]=[['coin',Coins],['shop',ShoppingBag],['referrals',Users],['leaderboard',Trophy]];
const Card=({children,className=''}:{children:React.ReactNode;className?:string})=><div className={'glass '+className}>{children}</div>;
const languages = [
 { code: 'uz', name: 'O‘zbekcha' },
 { code: 'ru', name: 'Русский' },
 { code: 'en', name: 'English' },
] as const;

function LanguageFlag({ code }: { code: Lang }) {
 return <svg className="language-flag" viewBox="0 0 60 36" aria-hidden="true" focusable="false">
  {code === 'uz' && <>
   <path fill="#1eb4dc" d="M0 0h60v12H0z"/>
   <path fill="#fff" d="M0 12h60v12H0z"/>
   <path fill="#1eb53a" d="M0 24h60v12H0z"/>
   <path stroke="#ce1126" d="M0 12h60M0 24h60"/>
   <circle fill="#fff" cx="9" cy="6" r="4.3"/>
   <circle fill="#1eb4dc" cx="10.8" cy="5.2" r="3.8"/>
   <g fill="#fff">
    {[0, 1, 2].map(row => Array.from({ length: 3 + row }, (_, column) =>
     <path key={row + ':' + column} transform={`translate(${19 - row * 2.6 + column * 2.6} ${2.5 + row * 3.1})`}
      d="M0-1 .25-.33H1L.4.13.62.9 0 .44-.62.9-.4.13-1-.33H-.25z"/>))}
   </g>
  </>}
  {code === 'ru' && <>
   <path fill="#fff" d="M0 0h60v12H0z"/>
   <path fill="#0039a6" d="M0 12h60v12H0z"/>
   <path fill="#d52b1e" d="M0 24h60v12H0z"/>
  </>}
  {code === 'en' && <>
   <path fill="#012169" d="M0 0h60v36H0z"/>
   <path stroke="#fff" strokeWidth="7" d="M0 0l60 36M60 0 0 36"/>
   <path fill="#c8102e" d="M0 0v2l25 15h4zm60 0h-4L31 15v2zM0 36h4l25-15v-2zm60 0v-2L35 19h-4z"/>
   <path stroke="#fff" strokeWidth="11" d="M30 0v36M0 18h60"/>
   <path stroke="#c8102e" strokeWidth="6" d="M30 0v36M0 18h60"/>
  </>}
 </svg>;
}

function LanguagePicker({ lang, label, open, onToggle, onClose, onSelect }: {
 lang: Lang;
 label: string;
 open: boolean;
 onToggle: () => void;
 onClose: () => void;
 onSelect: (value: Lang) => void;
}) {
 const picker = useRef<HTMLDivElement>(null);
 const trigger = useRef<HTMLButtonElement>(null);

 useEffect(() => {
  if (!open) return;
  function dismiss(event: PointerEvent | FocusEvent) {
   if (event.target instanceof Node && !picker.current?.contains(event.target)) onClose();
  }
  function escape(event: KeyboardEvent) {
   if (event.key === 'Escape') {
    onClose();
    trigger.current?.focus();
   }
  }
  document.addEventListener('pointerdown', dismiss);
  document.addEventListener('focusin', dismiss);
  document.addEventListener('keydown', escape);
  return () => {
   document.removeEventListener('pointerdown', dismiss);
   document.removeEventListener('focusin', dismiss);
   document.removeEventListener('keydown', escape);
  };
 }, [open, onClose]);

 return <div className="language-picker" ref={picker}>
  <button type="button" className="lang" ref={trigger} aria-label={label + ' · ' + languages.find(language => language.code === lang)?.name}
   aria-expanded={open} aria-controls="language-options" onClick={onToggle}>
   <Globe className="lang-globe" size={19} aria-hidden="true"/>
   <LanguageFlag code={lang}/>
   <ChevronRight className="lang-chevron" size={14} aria-hidden="true"/>
  </button>
  <div className="language-options" id="language-options" role="group" aria-label={label} hidden={!open}>
   {languages.map(({ code, name }) => <button type="button" key={code} className="language-option"
    lang={code} aria-pressed={lang === code} onClick={() => {
     onSelect(code);
     onClose();
     trigger.current?.focus();
    }}>
    <span className="language-code"><LanguageFlag code={code}/></span>
    <span>{name}</span>
    {lang === code && <Check className="language-check" size={17} aria-hidden="true"/>}
   </button>)}
  </div>
 </div>;
}

function App(){const [lang,setLang]=useState<Lang>((['uz','ru','en'].includes(localStorage.getItem('coinova-lang')||'')?localStorage.getItem('coinova-lang') as Lang:'uz'));const t=(key:TranslationKey)=>dictionary[lang][key];const [page,setPage]=useState<Page>('home');const[loading,setLoading]=useState(true);const[data,setData]=useState<State|null>(null);const[busy,setBusy]=useState('');const[error,setError]=useState('');const[notifs,setNotifs]=useState(false);const[languageOpen,setLanguageOpen]=useState(false);const[copied,setCopied]=useState(false);const[now,setNow]=useState(Date.now());
 const [openedChannels,setOpenedChannels]=useState<Record<string,boolean>>({});
 const [channelResults,setChannelResults]=useState<Record<string,{error?:string;fc?:number}>>({});
 async function verifyChannel(id:string, identity?:unknown){
  if(busy)return;
  setBusy(id);
  setChannelResults(results=>({...results,[id]:{}}));
  try {
   if(identity)await request('/telegram/link','POST',identity);
   const result=await request<{awardedFC:number}>(`/tasks/${id}/claim`,'POST');
   setChannelResults(results=>({...results,[id]:{fc:result.awardedFC}}));
  } catch(e) {
   setChannelResults(results=>({...results,[id]:{error:(e as Error).message}}));
  } finally {
   try{await reload()}catch{ /* Keep the result of the completed verification. */ }
   setBusy('');
  }
 }
 const today=tashkentDay(now);useEffect(()=>{localStorage.setItem('coinova-lang',lang);document.documentElement.lang=lang},[lang]);useEffect(()=>{setNow(Date.now());const id=window.setInterval(()=>setNow(Date.now()),(page==='mining'||page==='shop')?1000:30000);return()=>clearInterval(id)},[page]);
 async function reload(){
  const startParam = isRender ? new URLSearchParams(telegramWebApp()?.initData).get('start_param') : null;
  const referralCode = startParam?.match(/^ref_([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/i)?.[1];
  const ref = referralCode ?? new URLSearchParams(location.search).get('ref');
  const v=await request<State>('/bootstrap'+(ref?'?ref='+encodeURIComponent(ref):''));
  setData(v);setError('');
 }
 async function openAccount() {
  setLoading(true);
  try {
   if (isRender) {
    await loadTelegramSdk();
    const app = telegramWebApp();
    app?.ready?.();
    if (!app?.initData) return;
   }
   await reload();
  } catch (cause) {
   setError((cause as Error).message);
  } finally {
   setLoading(false);
  }
 }
 useEffect(()=>{void openAccount()},[]);

 async function action(key:string,url:string,body?:unknown){
  if(busy)return;
  setBusy(key);setError('');
  try{await request(url,'POST',body);await reload()}catch(e){setError((e as Error).message)}finally{setBusy('')}
 }
 const avatarInput = useRef<HTMLInputElement>(null);
 const avatarLabel = lang === 'uz' ? 'Profil rasmini tanlash' : lang === 'ru' ? 'Выбрать фото профиля' : 'Choose profile photo';
 const avatarError = lang === 'uz' ? 'Rasmni saqlab bo‘lmadi. Boshqa rasmni tanlab ko‘ring.' : lang === 'ru' ? 'Не удалось сохранить фото. Выберите другое.' : 'Could not save the photo. Try another image.';
 const [avatarUploading, setAvatarUploading] = useState(false);
 const [avatarFailed, setAvatarFailed] = useState(false);
 async function uploadAvatar(file: File) {
  setAvatarUploading(true);
  setAvatarFailed(false);
  try {
   const image = await createImageBitmap(file);
   const canvas = document.createElement('canvas');
   canvas.width = canvas.height = 256;
   const context = canvas.getContext('2d');
   try {
    if (!context) throw new Error('avatar_invalid');
    const side = Math.min(image.width, image.height);
    context.fillStyle = '#221634';
    context.fillRect(0, 0, 256, 256);
    context.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, 256, 256);
   } finally {
    image.close();
   }
   let avatar = canvas.toDataURL('image/jpeg', .82);
   if (avatar.length > 45000) avatar = canvas.toDataURL('image/jpeg', .55);
   await request('/profile/avatar', 'POST', {avatar});
   setData(current => current && ({...current, user: {...current.user, avatar}}));
  } catch {
   setAvatarFailed(true);
  } finally {
   setAvatarUploading(false);
  }
 }
 function avatarContent(user: User) {
  return user.avatar ? <img className="profile-avatar-photo" src={user.avatar} alt=""/> : user.first_name.slice(0,1).toUpperCase();
 }
 const errorKey=('error_'+error) as TranslationKey;
 const bundleErrors: Record<string, string> = {
  invalid_bundle: {uz:'2–5 ta buyum tanlang. Narx 50 RC dan boshlanishi va buyumlar jami narxidan past bo‘lishi kerak.',ru:'Выберите 2–5 товаров. Цена от 50 RC и ниже общей стоимости.',en:'Select 2–5 items and set a price of at least 50 RC, below their total.'}[lang],
  bundle_expired: {uz:'Bu aksiya tugagan yoki yangilangan.',ru:'Акция истекла или была обновлена.',en:'This offer has ended or changed.'}[lang],
 };
 const errorMessage=error ? (bundleErrors[error] || dictionary[lang][errorKey] || t('error_server_error')) : '';
 function changePage(v:Page){setCopied(false);setPage(v);setNotifs(false);setError('');window.scrollTo({top:0,behavior:'smooth'})}
 const header=<header className="header"><button className="brand" onClick={()=>changePage('home')}><img className="brand-mark" src="/coinova-mark.webp" width={40} height={40} alt=""/><span className="brand-text">COINOVA</span></button><div className="header-actions"><LanguagePicker lang={lang} label={t('language')} open={languageOpen}
  onToggle={()=>{setLanguageOpen(!languageOpen);setNotifs(false)}}
  onClose={()=>setLanguageOpen(false)} onSelect={setLang}/><button className="circle-button" aria-label={t('notifications')} aria-expanded={notifs} onClick={()=>{setNotifs(!notifs);setLanguageOpen(false);if(!notifs && data)void reload().catch(()=>{})}}><Bell size={21}/></button>{data&&<button className="avatar top-avatar" aria-label={t('profile')} onClick={()=>changePage('profile')}>{avatarContent(data.user)}</button>}{notifs&&<div className="notif-pop glass"><strong>{t('notifications')}</strong>{data?.payouts?.length ? data.payouts.slice(0,5).map(item=><button className="payout-notification" key={item.id} onClick={()=>changePage('withdraw')}>
 <strong>{number(item.amount)} UZS</strong><span>{payoutWords[lang][item.status]}</span>
 </button>) : <p>{t('noNotifications')}</p>}</div>}</div></header>;
 function renderBalance(currency:'fc'|'rc'){const fc=currency==='fc';const todayEarned=data!.transactions.filter(tx=>tx.currency==='FC'&&Number(tx.delta)>0&&tashkentDay(Date.parse(tx.created_at))===today).reduce((sum,tx)=>sum+Number(tx.delta),0);return <button className={'glass balance-card cosmic-balance '+(fc?'coin-fc':'coin-rc')} onClick={()=>changePage('wallet')}><div className="balance-head"><span>{t(fc?'freeCoin':'ruzoCoin')}</span><BalanceToken currency={currency}/></div><div className="balance-body"><strong>{number(data!.user[currency])} <small>{currency.toUpperCase()}</small></strong><p>{fc?(lang==='uz'?'O‘yin va vazifalardan yig‘ilgan':lang==='ru'?'Заработано в играх и заданиях':'Earned from games and tasks'):(lang==='uz'?'Premium imkoniyatlar uchun':lang==='ru'?'Для премиум-возможностей':'For premium features')}</p></div><div className="balance-foot"><span>{fc?<><Zap size={17}/> +{number(todayEarned)} {lang==='uz'?'bugun':lang==='ru'?'сегодня':'today'}</>:<><Sparkles size={17}/> Premium</>}</span><span>{lang==='uz'?'Batafsil':lang==='ru'?'Подробнее':'Details'} <ChevronRight size={20}/></span></div></button>}
 function renderXP(isProfile = false) {
  const xp = Number(data!.user.xp);
  const level = data!.user.level;
  const base = (level - 1) ** 2 * 100;
  const target = level ** 2 * 100;
  const progress = Math.min(target - base, Math.max(0, xp - base));
  const heading = lang === 'uz' ? 'SIZNING NATIJALARINGIZ' : lang === 'ru' ? 'ВАШИ РЕЗУЛЬТАТЫ' : 'YOUR PROGRESS';

  return <Card className="xp-card">
   <div className="xp-head">
    <div className="xp-title">{!isProfile && <span className="xp-eyebrow">{heading}</span>}<h2>{isProfile ? (lang === 'uz' ? 'Keyingi daraja' : lang === 'ru' ? 'Следующий уровень' : 'Next level') : `${t('level')} ${level}`}</h2></div>
    <img className="xp-trophy-model" src="/xp-cosmic-trophy.webp" width={64} height={64} alt="" loading="lazy"/>
   </div>
   <div className="progress" role="progressbar" aria-label={heading}
    aria-valuenow={progress} aria-valuemin={0} aria-valuemax={target - base}
    aria-valuetext={`${number(xp)} / ${number(target)} XP`}>
    <div className="xp-fill" style={{ width: `${progress / (target - base) * 100}%` }}/>
   </div>
   <div className="xp-range"><span><strong className="xp-number">{number(xp)}</strong> XP</span><span><strong className="xp-number">{number(target)}</strong> XP</span></div>
   <p className="xp-remain">{t('nextLevel')} <strong><span className="xp-number">{number(Math.max(0, target - xp))}</span> XP</strong></p>
  </Card>;
 }
 function SectionHeader({title,to}:{title:string;to?:Page}){return <div className="section-title"><h2>{title}</h2>{to&&<button className="text-link" onClick={()=>changePage(to)}>{t('viewAll')} </button>}</div>}
 function Transactions(){return <div className="transaction-list">{data!.transactions.length===0?<p className="empty">{t('noTransactions')}</p>:data!.transactions.map(tx=><div className="transaction" key={tx.id}><span className={'tx-icon '+(Number(tx.delta)>0?'positive':'negative')}>{Number(tx.delta)>0?<ArrowDownLeft size={19}/>:<ArrowUpRight size={19}/>}</span><div className="tx-main"><strong>{tx.reason==='mining_storage_upgrade'?{uz:'Sig‘im yangilandi',ru:'Увеличение вместимости',en:'Capacity upgrade'}[lang]:tx.reason==='shop'?t('shop_transaction'):((tx.reason in dictionary[lang])?t(tx.reason as TranslationKey):tx.reason)}</strong><small className="muted">{date(tx.created_at)}</small></div><span className={Number(tx.delta)>0?'plus':'minus'}>{Number(tx.delta)>0?'+':''}{number(tx.delta)} {tx.currency}</span></div>)}</div>}
 function Leaderboard(){
  const leaders = data!.leaders;
  const title = lang === 'uz' ? 'Kosmik reyting' : lang === 'ru' ? 'Космический рейтинг' : 'Cosmic rankings';
  const vacant = lang === 'uz' ? 'Bo‘sh o‘rin' : lang === 'ru' ? 'Свободное место' : 'Open spot';
  return <section className="cosmic-ranking" aria-label={title}>
   <div className="ranking-hero ranking-stage">
    <h1><span aria-hidden="true">✦</span>{t('topTitle')}<span aria-hidden="true">✦</span></h1><p>{t('topDesc')}</p>
    <img src="/ranking-podium.webp" width={900} height={305} alt="" decoding="async"/>
    <ol className="ranking-podium" aria-label={title}>
     {[1,2,3].map(place => {
      const leader = leaders[place - 1];
      const initial = leader?.first_name.normalize().match(/[\p{L}\p{N}]/u)?.[0]?.toUpperCase();
      return <li key={place} data-place={place} className="ranking-podium-slot" aria-label={'#' + place + ' · ' + (leader?.first_name ?? vacant)}>
       <span className="podium-avatar" aria-hidden="true">{leader?.avatar ? <img className="profile-avatar-photo" src={leader.avatar} alt=""/> : initial || <UserRound size={16}/>}</span>
       <div className="podium-result">
        <strong title={leader?.first_name}>{leader?.first_name ?? vacant}</strong>
        {leader && <><b>{number(leader.xp)} XP</b><span>{t('level')} {leader.level}</span></>}
       </div>
      </li>;
     })}
    </ol>
   </div>
   <ol className="ranking-list" start={4}>
    {Array.from({length: 7}, (_, index) => {
     const place = index + 4;
     const leader = leaders[place - 1];
     const initial = leader?.first_name.normalize().match(/[\p{L}\p{N}]/u)?.[0]?.toUpperCase();
     return <li key={place} className="ranking-entry" data-vacant={!leader}>
      <span className="ranking-medal">{place}</span>
      <span className="ranking-avatar" aria-hidden="true">{initial || <UserRound size={18}/>}</span>
      <div className="ranking-person"><strong>{leader?.first_name ?? vacant}</strong>{leader && <span>{t('level')} {leader.level}</span>}</div>
      <strong className="ranking-score">{leader ? <>{number(leader.xp)} <small>XP</small></> : '—'}</strong>
     </li>;
    })}
   </ol>
  </section>;
 }
 function HomePage(){const adventure={uz:'Kosmos seni kutmoqda.',ru:'Космос ждёт тебя.',en:'The cosmos awaits you.'};const salutation={uz:'Salom',ru:'Привет',en:'Hello'};const nickname = data!.user.username?.trim() || data!.user.first_name;return <HomeMotion><h1 className="cosmic-banner"><img src="/coinova-banner.webp" width={2048} height={682} alt="COINOVA · PLAY • EARN • GROW" lang="en" fetchPriority="high"/><span className="banner-wordmark-motion" aria-hidden="true"/><span className="banner-slogan-motion" aria-hidden="true"><span/><span/><span/></span></h1><section className="hero"><div className="stars"/><div className="hero-content"><span className="hero-badge"><Zap size={14}/> {lang==='uz'?'SENING KOSMIK SARGUZASHTING SHU YERDAN BOSHLANADI':lang==='ru'?'ТВОЁ КОСМИЧЕСКОЕ ПРИКЛЮЧЕНИЕ НАЧИНАЕТСЯ ЗДЕСЬ':'YOUR COSMIC ADVENTURE STARTS HERE'}</span><h2><span className="hero-greeting">{salutation[lang]}, <span className="gradient-text">{nickname}!</span></span><span className="hero-adventure">{adventure[lang]}</span></h2><HeroTypewriter key={lang} text={heroQuestion[lang]}/><button className="primary-btn" onClick={()=>changePage('mining')}><Rocket className="hero-launch-icon" size={19} aria-hidden="true"/>{t('startAdventure')}</button><div className="hero-metrics"><span><small>{lang==='uz'?'JAMI TAJRIBA':lang==='ru'?'ВСЕГО ОПЫТА':'TOTAL EXPERIENCE'}</small><strong><span className="hero-stat-number">{number(data!.user.xp)}</span> XP</strong></span><span><small>{lang==='uz'?'HOZIRGI DARAJA':lang==='ru'?'ТЕКУЩИЙ УРОВЕНЬ':'CURRENT LEVEL'}</small><strong><span className="hero-stat-number">{data!.user.level}</span> {t('level')}</strong></span></div></div><Astronaut/><FloatingCoins/><div className="astronaut-label"><Sparkles size={13}/>{lang==='uz'?'Kichik kosmonavt':lang==='ru'?'Маленький космонавт':'Little astronaut'}</div></section><div className="balance-grid">{renderBalance('fc')}{renderBalance('rc')}</div>{renderXP()}<div className="quick-section glass"><div className="quick-top"><div><span className="xp-eyebrow">{lang==='uz'?'TEZKOR KIRISH':lang==='ru'?'БЫСТРЫЙ ДОСТУП':'QUICK ACCESS'}</span><h2>{t('quick')}</h2></div><span className="quick-flare"><Sparkles size={24}/></span></div><div className="quick-grid">{[...extras,['mining',Pickaxe] as const,['bonus',Gift] as const].map(([key,Icon])=><button className="quick glass" key={key} onClick={()=>changePage(key as Page)}><span className="quick-icon"><Icon size={21}/></span><strong>{t(key as TranslationKey)}</strong><ChevronRight size={15} className="muted"/></button>)}</div></div><SectionHeader title={t('achievements')} to="leaderboard"/><Card className="achievement"><span className="trophy-bubble"><Trophy size={25}/></span><div><strong>{t('level')} {data!.user.level}</strong><p className="muted sm">{number(data!.user.xp)} XP · {t('totalReferrals')}: {data!.user.referral_count}</p></div><button className="icon-link" aria-label={t('leaderboard')} onClick={()=>changePage('leaderboard')}><ArrowRight/></button></Card><SectionHeader title={t('recent')} to="wallet"/><Card className="list-card"><Transactions/></Card></HomeMotion>}
 function MiningPage(){
  const { mining, miningHistory, user, miningLevel = 1, miningLevels = [] } = data!;
  const active = !!mining;
  const rate = mining?.rate ?? data!.miningConfig?.mining?.rate ?? miningLevels[miningLevel - 1]?.rate ?? 12;
  const next = miningLevels[miningLevel];
  const balance = Number(user.fc);
  const elapsed = mining ? Math.max(0, now - Date.parse(mining.last_claimed_at)) : 0;
  const storageLevel = data!.mainStorageLevel ?? 1;
  const nextStorage = data!.mainStorageLevels?.[storageLevel];
  const capacity = mining?.capacity ?? data!.miningConfig?.mining?.capacity ?? 200;
  const pending = Math.min(capacity, Math.floor(elapsed / (60000 / rate)));
  const owned = (data!.equipment ?? []).filter(item => data!.purchases.some(purchase => purchase.item_id === item.id));
  const devices = owned.filter(item => item.kind === 'miner');
  const modifiers = (['boost','storage'] as const).flatMap(kind =>
   owned.filter(item => item.kind === kind).sort((a,b)=>b.value-a.value).slice(0,1));
  const storageLabel = lang === 'uz' ? 'Sig‘im' : lang === 'ru' ? 'Вместимость' : 'Capacity';
  const unavailable = active ? t('error_mining_upgrade_active') : next && balance < next.price ? t('error_insufficient_fc') : '';
  return <>
   <div className="page-heading"><span className="eyebrow"><Pickaxe size={15}/> {t('mining')}</span><h1>{t('mineTitle')}</h1><p>{t('mineDesc')}</p></div>
   <div className={devices.length ? "mining-device-grid" : undefined}>
   <Card className="mining-panel">
    <figure className={'press-scene' + (active ? ' press-active' : '')}>
     <img src="/cosmic-press.webp" width={768} height={512} alt={t('pressScene')}/>
     {active && <PressAnimation/>}
     <PressUpgrades level={miningLevel}/>
     <span className="press-level"><Zap size={15}/> {t('level')} {miningLevel}</span>
     <span className="press-power" aria-hidden="true">{miningLevels.map((_, i) => <i className={i < miningLevel ? 'lit' : ''} key={i}/>)}</span>
    </figure>
    <div role="status" className={active ? 'mining-live' : 'status'}>
     {active ? <><span className="mining-live-icon"><Zap size={15} aria-hidden="true"/></span>{t('active')}<span className="mining-signal" aria-hidden="true"><i/><i/><i/></span></>
      : <><span className="pulse-dot"/>{t('inactive')}</>}
    </div>
    <h2 className={'mining-pending' + (active ? ' mining-pending-live' : '')}>
     <strong key={pending} className="mining-count">+{number(pending)}</strong> <span>FC</span>
    </h2>
    <div className="mining-stats"><div><span className="muted sm">{t('miningRate')}</span><strong>{rate} {t('perMinute')}</strong></div><div><span className="muted sm">{t('collected')}</span><strong>{number(mining?.earned_fc||'0')} FC</strong></div></div>
    <p className="muted sm">{storageLabel} · {number(capacity)} FC</p>
    <div className="mining-buttons">{!active
     ? <button className="primary-btn" disabled={!!busy} onClick={()=>action('start','/mining/start')}><Play size={18}/>{t('mineStart')}</button>
     : <>
      <button className="primary-btn mining-claim" disabled={!!busy || pending < 1} onClick={()=>action('claim','/mining/claim')}>
       <span className="mining-action-icon"><HandCoins size={20} aria-hidden="true"/></span>{t('claim')}
      </button>
      <button className="secondary-btn mining-stop" disabled={!!busy} onClick={()=>action('stop','/mining/stop')}>
       <span className="mining-action-icon"><CircleStop size={20} aria-hidden="true"/></span>{t('mineStop')}
      </button>
     </>}
    </div>
   </Card>
   {devices.map(device => {
    const deviceLevel = data!.deviceLevels?.[device.id] ?? 1;
    const upgradePrice = data!.deviceUpgradePrices?.[deviceLevel];
    const upgradesBlocked = active || Object.values(data!.deviceMining ?? {}).some(Boolean);
    const modules = [
     [Zap, 'Quvvat yadrosi', 'Энергоядро', 'Power core'],
     [ShieldCheck, 'Himoya qoplamasi', 'Защитный корпус', 'Armor plating'],
     [Orbit, 'Orbital halqa', 'Орбитальное кольцо', 'Orbital ring'],
     [Gem, 'Kristall modul', 'Кристальный модуль', 'Crystal module'],
     [Flame, 'Plazma dvigateli', 'Плазменный двигатель', 'Plasma engine'],
     [Rocket, 'Turbo modul', 'Турбомодуль', 'Turbo module'],
     [Sparkles, 'Kvant modul', 'Квантовый модуль', 'Quantum module'],
     [Star, 'Nova reaktori', 'Реактор Нова', 'Nova reactor'],
     [Crown, 'Galaktik yadro', 'Галактическое ядро', 'Galactic core'],
    ] as const;
    const moduleLanguage = lang === 'uz' ? 1 : lang === 'ru' ? 2 : 3;
    const session = data!.deviceMining?.[device.id];
    const config = data!.miningConfig?.[device.id];
    const deviceRate = session?.rate ?? config?.rate ?? device.value;
    const limit = session?.capacity ?? config?.capacity ?? device.value * (60 + (miningLevel - 1) * 15);
    const amount = session ? Math.min(limit, Math.floor(Math.max(0, now - Date.parse(session.last_claimed_at)) * deviceRate / 60000)) : 0;
    const operate = (operation: string) => action(device.id, '/mining/' + device.id + '/' + operation);
    return <Card className="mining-panel mining-aux" key={device.id}>
     <div className="device-upgrade-art" data-level={deviceLevel}>
      <EquipmentArt item={device}/>
      <span className="device-level-badge">{t('level')} {deviceLevel}</span>
      {deviceLevel > 1 && <div className="device-module-icons">
       {modules.slice(0, deviceLevel - 1).map(module => {
        const Icon = module[0];
        return <span key={module[1]} title={module[moduleLanguage]}><Icon size={15} aria-hidden="true"/></span>;
       })}
      </div>}
     </div>
     <h3>{device.name}</h3>
     {deviceLevel > 1 && <p className="gold-text sm">{modules[deviceLevel - 2]?.[moduleLanguage]}</p>}
     <p className="muted sm">{number(deviceRate)} {t('perMinute')} · {storageLabel} {number(limit)} FC</p>
     <strong className="gold-text">+{number(amount)} FC</strong>
     <div className="mining-buttons">{session ? <>
      <button className="primary-btn" disabled={!!busy || amount < 1} onClick={()=>operate('claim')}>{t('claim')}</button>
      <button className="secondary-btn" disabled={!!busy} onClick={()=>operate('stop')}>{t('mineStop')}</button>
     </> : <button className="primary-btn" disabled={!!busy} onClick={()=>operate('start')}>{t('mineStart')}</button>}</div>
     {upgradePrice !== undefined && <div className="device-upgrade-action">
      <p className="muted sm">{t('level')} {deviceLevel + 1} · {modules[deviceLevel - 1]?.[moduleLanguage]}</p>
      <button className="secondary-btn" disabled={!!busy || upgradesBlocked || Number(user.rc) < upgradePrice}
       onClick={()=>action('device-upgrade', '/mining/device-upgrade/' + device.id + '/' + (deviceLevel + 1))}>
       <Zap size={15} aria-hidden="true"/>{number(upgradePrice)} RC
      </button>
      {upgradesBlocked && <p className="muted sm">{t('error_mining_upgrade_active')}</p>}
     </div>}
     {deviceLevel === 10 && <p className="gold-text sm"><Trophy size={15}/> {t('level')} 10</p>}
    </Card>;
   })}
   </div>
   {modifiers.length > 0 && <div className="mining-modifiers">{modifiers.map(item =>
    <Card className="mining-modifier" key={item.id}><EquipmentArt item={item}/><div><strong>{item.name}</strong>
     <div className="gold-text">+{number(item.value)}{item.kind === 'boost' ? '%' : ' FC'}</div></div></Card>
   )}</div>}
   {miningLevels.length > 0 && <>
    <SectionHeader title={t('mining_upgrade')}/>
    <Card className="press-upgrades">
     <div className="press-upgrade-head"><strong>{t('balanceFC')}</strong><span className="gold-text">{number(balance)} FC</span></div>
     {next ? <>
      <div className="press-next">
       <span className="press-step"><Zap size={17} aria-hidden="true"/></span>
       <span><strong>{t('level')} {miningLevel + 1}</strong><small>{next.rate} {t('perMinute')}</small></span>
       <strong className="press-price">{number(next.price)} FC</strong>
      </div>
      <div className="press-upgrade-action">
       <button className="primary-btn" disabled={!!busy || !!unavailable} onClick={()=>action('upgrade', '/mining/upgrade/' + (miningLevel + 1))}>
        <Zap size={17} aria-hidden="true"/>{t('upgradePress')}
       </button>
       {unavailable && <p className="muted sm">{unavailable}</p>}
      </div>
     </> : <p className="press-upgrade-action gold-text"><Trophy size={18}/> {t('maxPress')}</p>}
    </Card>
   </>}
   {data!.mainStorageLevels && <>
    <SectionHeader title={{uz:'Asosiy mining sig‘imi',ru:'Вместимость основного майнера',en:'Main miner capacity'}[lang]}/>
    <Card className="press-upgrades">
     <div className="press-upgrade-head"><strong>{t('level')} {storageLevel}</strong><span className="gold-text">{number(data!.mainStorageLevels[storageLevel - 1].capacity)} FC</span></div>
     {nextStorage && <>
      <div className="press-next">
       <span className="press-step"><Coins size={17} aria-hidden="true"/></span>
       <span><strong>{t('level')} {storageLevel + 1}</strong><small>{storageLabel} · {number(nextStorage.capacity)} FC</small></span>
       <strong className="press-price">{number(nextStorage.price)} FC</strong>
      </div>
      <div className="press-upgrade-action">
       <button className="primary-btn" disabled={!!busy || active || balance < nextStorage.price}
        onClick={()=>action('storage-upgrade', '/mining/storage-upgrade/' + (storageLevel + 1))}>
        <Coins size={17} aria-hidden="true"/>{{uz:'Sig‘imni oshirish',ru:'Увеличить вместимость',en:'Upgrade capacity'}[lang]}
       </button>
       {active && <p className="muted sm">{t('error_mining_upgrade_active')}</p>}
       {!active && balance < nextStorage.price && <p className="muted sm">{t('error_insufficient_fc')}</p>}
      </div>
     </>}
    </Card>
   </>}
   <details className="mining-history">
    <summary className="glass"><Clock size={20} aria-hidden="true"/><span>{t('miningHistory')}</span><ChevronRight size={18} className="history-chevron" aria-hidden="true"/></summary>
    <Card className="list-card">{miningHistory.length===0?<p className="empty">{t('noHistory')}</p>:miningHistory.map((s,i)=><div className="transaction" key={i}><span className="tx-icon positive"><Clock size={18}/></span><div className="tx-main"><strong>{t('session')}</strong><small className="muted">{date(s.started_at)}</small></div><strong className="gold-text">+{number(s.earned_fc)} FC</strong></div>)}</Card>
   </details>
  </>;
 }
 function TasksPage(){return <>
  <div className="page-heading mission-heading"><span className="eyebrow"><ListChecks size={15}/> {t('tasks')}</span><h1>{t('allTasks')}</h1><p>{t('tasksInfo')}</p></div>
  <div className="stack">{data!.tasks.map((task,i)=>{
   const claimed=data!.claims.some(c=>c.task_id===task.id&&(task.type==='once'||String(c.claim_day).slice(0,10)===today));
   const Icon=task.kind==='channel'?Send:task.kind==='bot'?Bot:i===0?UserRound:i===1?Sparkles:Pickaxe;
   const isChannel=task.kind==='channel';
   const needsLink=task.kind==='bot' && !data!.telegramLinked;
   const result=channelResults[task.id];
   return <Card className="task-card mission-card" key={task.id}>
    <div className={'task-symbol symbol-'+Math.min(i,2)}><Icon aria-hidden="true"/></div>
    <div className="task-body">
     <span className="muted tiny uppercase">{t(task.type==='daily'?'daily':'once')}</span>
     <h3>{task.kind ? t(isChannel?'channelSubscribe':'telegramBotTask') : t(('task_'+task.id) as TranslationKey)}</h3>
     {task.handle && !isChannel && <a className="mission-link" href={'https://t.me/'+task.handle+(task.kind==='bot'?'?start=coinova':'')} target="_blank" rel="noopener noreferrer">@{task.handle}</a>}
     <p className="rewards"><span><Coins size={15} aria-hidden="true"/> +{number(task.fc)} FC</span>{task.xp>0&&<span><Zap size={15} aria-hidden="true"/> +{task.xp} XP</span>}</p>
    </div>
    {isChannel && task.handle && !claimed && !openedChannels[task.id]
     ? <a className="small-primary mission-claim channel-open" href={'https://t.me/'+task.handle} target="_blank" rel="noopener noreferrer"
        onClick={()=>setOpenedChannels(opened=>({...opened,[task.id]:true}))}>
        <Send size={16} aria-hidden="true"/>{t('channelSubscribe')}
       </a>
     : <button className={claimed?'claimed-btn':'small-primary mission-claim'} disabled={claimed||!!busy}
       onClick={()=>isChannel?verifyChannel(task.id):needsLink?changePage('profile'):action(task.id,`/tasks/${task.id}/claim`)}>
       {claimed||isChannel?<Check size={16} aria-hidden="true"/>:needsLink?<Send size={16} aria-hidden="true"/>:<Gift size={17} aria-hidden="true"/>}
       {t(claimed?'done':isChannel?'channelVerify':needsLink?'telegramLink':'claimReward')}
      </button>}
    {isChannel && result && <div className="channel-result" role="status">
     {result.fc!==undefined && t('channelRewarded').replace('{fc}',number(result.fc))}
     {result.error==='telegram_link_required' && data!.telegramBot
      ? <><p>{t('channelIdentify')}</p><TelegramLogin bot={data!.telegramBot} onAuth={identity=>verifyChannel(task.id,identity)}/></>
      : result.error && t(result.error==='telegram_link_required'?'error_telegram_unavailable':(('error_'+result.error) as TranslationKey)) || (result.error ? t('error_server_error') : '')}
    </div>}
   </Card>;
  })}</div>
 </>}
 function renderTelegramSettings() {
  return <>
   <details className="profile-telegram">
    <summary><Send size={19}/> {t('telegramLink')}<ChevronRight size={17}/></summary>
    <div className="profile-telegram-body">
    {data!.telegramLinked ? <p>{t('telegramConnected')}</p>
     : data!.telegramBot ? <TelegramLogin bot={data!.telegramBot} onAuth={value=>action('telegram','/telegram/link',value)}/>
     : <p className="muted">{t('error_telegram_unavailable')}</p>}
    </div>
   </details>
   
  </>;
 }
 function BonusPage(){
  const { bonuses, user }=data!;
  const claimed=bonuses.some(entry=>String(entry.claim_day).slice(0,10)===today);
  const ongoing=user.last_bonus_day===tashkentDay(now-86400000);
  const streak=claimed||ongoing?user.streak:0;
  const selected=claimed?(streak-1)%7:streak%7;
  const completed=selected+Number(claimed);
  return <>
   <div className="page-heading"><span className="eyebrow"><Gift size={15}/> {t('bonus')}</span><h1>{t('bonusHub')}</h1></div>
   <Card className="daily-vault">
    <div className="daily-vault-main">
     <div>
      <h2>{t('bonusTitle')}</h2>
      <p className="muted daily-streak"><Zap size={16} aria-hidden="true"/> {streak} {t('streak')}</p>
      <div className="daily-amount"><span>{t('todayReward')}</span><strong>+10 FC</strong></div>
      <button className={claimed ? "primary-btn daily-claimed" : "primary-btn"} disabled={claimed||!!busy} onClick={()=>action('bonus','/bonus/claim')}>
       {claimed?<span className="daily-claimed-icon"><Check size={17} aria-hidden="true"/></span>:<Gift size={18} aria-hidden="true"/>}<span>{t(claimed?'received':'getBonus')}</span>
      </button>
     </div>
     <div className="daily-chest"><img src="/daily-chest.webp" alt="" width={320} height={320}/></div>
    </div>
    <ol className="daily-track">{[Star,Moon,Orbit,Rocket,Gem,Flame,Crown].map((Icon,i)=>{
     const earned=i<completed;
     const current=i===selected;
     return <li key={i} className={`daily-day daily-day-${i+1}${current?' daily-current':''}${earned?' daily-complete':''}`}
      aria-current={current?'step':undefined}>
      <span className="daily-day-label">{t('day')} {i+1}</span>
      <span className="daily-medallion"><Icon size={23} aria-hidden="true"/></span>
      <strong className="daily-day-value">10 <small>FC</small></strong>
      {earned&&<span className="daily-earned" title={t('received')}><Check size={12} aria-hidden="true"/><span className="daily-sr-only">{t('received')}</span></span>}
     </li>;
    })}</ol>
   </Card>
   <div className="bonus-options">
    <Card className="bonus-option">
     <span className="bonus-option-icon"><Users size={23} aria-hidden="true"/></span>
     <h2>{t('refTitle')}</h2><p>{t('refDesc')}</p>
     <button className="secondary-btn" onClick={()=>changePage('referrals')}>{t('referrals')}</button>
    </Card>
    <Card className="bonus-option">
     <span className="bonus-option-icon"><ListChecks size={23} aria-hidden="true"/></span>
     <h2>{t('allTasks')}</h2><p>{t('tasksInfo')}</p>
     <button className="secondary-btn" onClick={()=>changePage('tasks')}>{t('tasks')}</button>
    </Card>
   </div>
  </>;
 }
 function WalletSection(mode:'exchange'|'withdraw'){
  return <>
   <button className="secondary-btn" onClick={()=>changePage('wallet')}>{t('wallet')}</button>
   <div className="page-heading"><h1>{payoutWords[lang][mode]}</h1></div>
   <WalletActions mode={mode} lang={lang} fc={Number(data!.user.fc)} rc={Number(data!.user.rc)}
    enabled={!!data!.payoutEnabled} admin={!!data!.isAdmin} payouts={data!.payouts??[]} request={request} reload={reload}/>
  </>;
 }
 function WalletPage(){return <><div className="page-heading"><span className="eyebrow"><Wallet size={15}/> {t('wallet')}</span><h1>{t('walletTitle')}</h1></div><div className="balance-grid">{renderBalance('fc')}{renderBalance('rc')}</div><div className="wallet-actions">{(['exchange','withdraw'] as const).map(mode=><div className="mining-history wallet-disclosure" key={mode}><button className="glass wallet-entry" onClick={()=>changePage(mode)}>{mode==='exchange'?<Coins size={20}/>:<Wallet size={20}/>}<span>{payoutWords[lang][mode]}</span><ChevronRight size={18} className="history-chevron"/></button></div>)}</div>{renderXP()}<details className="mining-history">
  <summary className="glass"><ListChecks size={20} aria-hidden="true"/><span>{t('transactions')}</span><ChevronRight size={18} className="history-chevron" aria-hidden="true"/></summary>
  <Card className="list-card"><Transactions/></Card>
 </details></>}
 function ShopPage(){
  const bundle = data!.shopBundle;
  const seconds = Math.max(0, Math.ceil(((bundle?.endsAt ?? 0) - now) / 1000));
  const available = [...(data!.equipment ?? []).filter(item => item.currency === 'RC'), ...data!.shop.map(item => ({...item, name: t(item.id as TranslationKey)}))];
  const items = bundle ? available.filter(item => bundle.itemIds.includes(item.id)) : [];
  const ownsItem = items.some(item => data!.purchases.some(purchase => purchase.item_id === item.id));
  const clock = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(value => String(value).padStart(2, '0')).join(':');
  const offerTitle = {uz:'2 soatlik aksiya',ru:'Акция на 2 часа',en:'2-hour offer'}[lang];
  return <>
   <div className="page-heading"><span className="eyebrow"><ShoppingBag size={15}/> {t('shop')}</span><h1>{t('shopTitle')}</h1></div>
   {bundle && seconds > 0 && <details className="equipment-category" open>
    <summary>{offerTitle} · {clock}</summary>
    <ul>{items.map(item => <li key={item.id}>{item.name}</li>)}</ul>
    <p className="gold-text"><del>{number(items.reduce((total, item) => total + item.price, 0))} RC</del> → {number(bundle.price)} RC · {number(bundle.price * 100)} {lang === 'uz' ? 'so‘m' : 'UZS'}</p>
    <button className="secondary-btn" disabled={ownsItem || Number(data!.user.rc) < bundle.price || !!busy}
     onClick={()=>action('bundle', '/shop/bundle/' + bundle.id + '/buy')}>
     {ownsItem ? {uz:'To‘plamdagi buyumlardan biri sizda bor',ru:'Один из предметов уже куплен',en:'You already own a bundle item'}[lang] : Number(data!.user.rc) < bundle.price ? t('notEnough') : t('buy')}
    </button>
   </details>}
   
   {(['FC','RC'] as const).map(currency => <section key={currency}>
    {(['miner','boost','storage'] as const).map(kind => <details className="equipment-category" key={kind} open={currency === 'FC' && kind === 'miner'}>
     <summary>{equipmentLabels[lang][kind]} · {currency}</summary>
     <div className="shop-grid equipment-shop-grid">
      {(data!.equipment ?? []).filter(item => item.currency === currency && item.kind === kind).map(item => {
       const owned = data!.purchases.some(purchase => purchase.item_id === item.id);
       const affordable = Number(data!.user[currency === 'FC' ? 'fc' : 'rc']) >= item.price;
       const unit = item.kind === 'miner' ? ' ' + t('perMinute') : item.kind === 'boost' ? '%' : ' FC';
       return <Card className="shop-item" key={item.id}><EquipmentArt item={item}/>
        <h3>{item.name}</h3><p className="muted sm">{equipmentLabels[lang][kind]} · +{number(item.value)}{unit}</p>
        <p className="gold-text">{number(item.price)} {currency}</p>
        <button className="secondary-btn" disabled={owned || !affordable || !!busy} onClick={()=>action(item.id, '/shop/' + item.id + '/buy')}>
         {owned ? t('owned') : affordable ? t('buy') : t('notEnough')}
        </button></Card>;
      })}
     </div>
    </details>)}
   </section>)}
   <SectionHeader title={lang === 'uz' ? 'Bezaklar · RC' : lang === 'ru' ? 'Украшения · RC' : 'Cosmetics · RC'}/>
   <div className="shop-grid">{data!.shop.map(item=>{const owned=data!.purchases.some(p=>p.item_id===item.id);return <Card className="shop-item" key={item.id}><div className="shop-cosmetic-art" data-cosmetic={item.id} aria-hidden="true"/><h3>{t(item.id as TranslationKey)}</h3><p className="gold-text"><Coins size={16}/> {item.price} RC</p><button className={owned?'claimed-btn':'secondary-btn'} disabled={owned||!!busy||Number(data!.user.rc)<item.price} onClick={()=>action(item.id,`/shop/${item.id}/buy`)}>{owned?t('owned'):Number(data!.user.rc)<item.price?t('notEnough'):t('buy')}</button></Card>})}</div>
  </>;
 }
 const adminTitle = {uz:'Admin paneli',ru:'Панель администратора',en:'Admin panel'}[lang];
 function AdminPage(){
  if (!data!.isAdmin) return <ProfilePage/>;
  const available = [...(data!.equipment ?? []).filter(item => item.currency === 'RC'), ...data!.shop.map(item => ({...item, name: t(item.id as TranslationKey)}))];
  const offerTitle = {uz:'2 soatlik aksiyani boshlash',ru:'Запустить акцию на 2 часа',en:'Launch 2-hour offer'}[lang];
  return <>
   <div className="page-heading"><span className="eyebrow"><ShieldCheck size={16}/> {t('profile')}</span><h1>{adminTitle}</h1><p>{data!.user.first_name} · ID {data!.user.profile_id}</p></div>
   {data!.isAdmin && <Card className="telegram-settings">
    <h3>{t('adminMissions')}</h3>
    <form onSubmit={e=>{
     e.preventDefault();
     const values=new FormData(e.currentTarget);
     void action('admin-mission','/admin/task',{kind:values.get('kind'),handle:values.get('handle'),fc:Number(values.get('fc'))});
    }}>
     <label>{t('missionKind')}<select name="kind"><option value="channel">{t('telegramChannel')}</option><option value="bot">{t('telegramBotTask')}</option></select></label>
     <label>{t('telegramHandle')}<input name="handle" required maxLength={33} placeholder="@coinova"/></label>
     <label>{t('missionReward')}<input name="fc" required type="number" min={1} max={100000}/></label>
     <button className="primary-btn" disabled={!!busy}><Check size={17}/>{t('saveMission')}</button>
    </form>
    {data!.managedTasks?.map(task=><div className="managed-mission" key={task.id}>
     <strong>@{task.handle} · {number(task.fc)} FC</strong>
     {task.secret && <details><summary>{t('integrationInfo')}</summary>
      <p><code>POST /api/telegram/bot-proof/{task.id}</code></p>
      <p><code>Authorization: Bearer {task.secret}</code></p>
      <p><code>{'{"telegramId":"<Telegram user ID>"}'}</code></p>
     </details>}
    </div>)}
   </Card>}
   {data!.isAdmin && <details className="equipment-category">
    <summary>{{uz:'Aksiya to‘plamini yaratish',ru:'Создать акционный набор',en:'Create a bundle offer'}[lang]}</summary>
    <form onSubmit={event=>{
     event.preventDefault();
     const form = new FormData(event.currentTarget);
     const itemIds = form.getAll('items').map(String);
     const price = Number(form.get('price'));
     const total = available.filter(item => itemIds.includes(item.id)).reduce((sum, item) => sum + item.price, 0);
     if (itemIds.length < 2 || itemIds.length > 5 || !Number.isSafeInteger(price) || price < 50 || price >= total) {
      setError('invalid_bundle');
      return;
     }
     void action('admin-bundle', '/admin/shop-bundle', {itemIds, price});
    }}>
     <p>{{uz:'2–5 ta RC buyumini tanlang. Yangi aksiya joriy aksiyani almashtiradi.',ru:'Выберите 2–5 товаров за RC. Новый набор заменит текущий.',en:'Choose 2–5 RC items. A new offer replaces the current one.'}[lang]}</p>
     {available.map(item => <div key={item.id}><label><input type="checkbox" name="items" value={item.id}/> {item.name} · {item.price} RC</label></div>)}
     <p><label>{{uz:'To‘plam narxi (RC)',ru:'Цена набора (RC)',en:'Bundle price (RC)'}[lang]} <input type="number" name="price" required min={50} step={1}/></label></p>
     <button type="submit" className="secondary-btn" disabled={!!busy}>{offerTitle}</button>
    </form>
   </details>}
   {data!.payoutEnabled ? <WalletActions mode="admin" lang={lang} fc={0} rc={0} enabled admin payouts={[]} request={request} reload={reload}/>
    : <Card className="telegram-settings"><h3>{payoutWords[lang].review}</h3><p>{payoutWords[lang].disabled}</p></Card>}
  </>;
 }
 function ProfilePage(){return <section className="explorer-profile"><div className="page-heading"><span className="eyebrow"><UserRound size={15}/> {t('profile')}</span><h1>{t('profileTitle')}</h1></div><Card className="profile-card"><div className="avatar profile-avatar">
 <span className="profile-avatar-face">{avatarContent(data!.user)}</span>
 <input ref={avatarInput} type="file" accept="image/*" hidden onChange={event=>{
  const file = event.currentTarget.files?.[0];
  event.currentTarget.value = '';
  if (file && !avatarUploading) void uploadAvatar(file);
 }}/>
 <button type="button" className="profile-camera" aria-label={avatarLabel} title={avatarLabel} disabled={avatarUploading} onClick={()=>avatarInput.current?.click()}><Camera size={17}/></button>
 </div>{avatarFailed && <p className="profile-avatar-error" role="alert">{avatarError}</p>}<h2>{data!.user.first_name}</h2><span className="tag gold">{t('level')} {data!.user.level}</span><span className="muted tiny user-id">ID: {data!.user.profile_id}</span></Card>{renderXP(true)}<SectionHeader title={t('stats')}/><div className="stat-grid"><Card><Trophy className="purple-text"/><strong>{number(data!.user.xp)}</strong><span className="muted sm">XP</span></Card><Card><Users className="purple-text"/><strong>{data!.user.referral_count}</strong><span className="muted sm">{t('totalReferrals')}</span></Card><Card><Clock className="purple-text"/><strong>{date(data!.user.created_at)}</strong><span className="muted sm">{t('memberSince')}</span></Card></div><SectionHeader title={t('settings')}/><Card className="settings-card">{data!.isAdmin && <button onClick={()=>changePage('admin')}><ShieldCheck size={19}/>{adminTitle}<ChevronRight size={17}/></button>}{renderTelegramSettings()}<button onClick={()=>changePage('referrals')}><Users size={19}/>{t('referrals')}<ChevronRight size={17}/></button><button onClick={()=>changePage('leaderboard')}><Trophy size={19}/>{t('leaderboard')}<ChevronRight size={17}/></button><button onClick={()=>changePage('coin')}><Coins size={19}/>{t('coin')}<ChevronRight size={17}/></button><a className="settings-link" href={authPath('signout')} target="_top"><LogOut size={19}/>{t('logout')}<ChevronRight size={17}/></a></Card></section>}
 function ReferralPage(){
  const {id,referral_count:count}=data!.user;
  const link = isRender
    ? 'https://t.me/coin_ova_bot?startapp=' + encodeURIComponent('ref_' + id)
    : new URL('/?ref='+encodeURIComponent(id),location.origin).href;
  async function copyReferral(){
   try {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setError('');
   } catch {
    document.querySelector<HTMLInputElement>('.referral-url input')?.select();
    setError('copy_failed');
   }
  }
  return <>
   <div className="page-heading"><span className="eyebrow"><Users size={15}/> {t('referrals')}</span><h1>{t('refTitle')}</h1></div>
   <Card className="referral-vault">
    <div className="referral-reward">
     <span className="referral-medal"><Users size={27} aria-hidden="true"/></span>
     <div><strong>+50 FC</strong><p>{t('refDesc')}</p></div>
    </div>
    <dl className="referral-stats">
     <div><dt>{t('totalReferrals')}</dt><dd>{number(count)}</dd></div>
     <div><dt>{t('refEarned')}</dt><dd>{number(count*50)} FC</dd></div>
    </dl>
    <label className="referral-url"><span>{t('refLinkLabel')}</span>
     <input value={link} readOnly onClick={event=>event.currentTarget.select()}/>
    </label>
    <button className={`primary-btn referral-copy${copied?' referral-copied':''}`} onClick={copyReferral}>
     {copied?<Check size={18} aria-hidden="true"/>:<Copy size={18} aria-hidden="true"/>}
     <span aria-live="polite">{t(copied?'copied':'copy')}</span>
    </button>
   </Card>
  </>;
 }
 function CoinPage(){return <><div className="page-heading"><span className="eyebrow"><Coins size={15}/> COIN CENTER</span><h1>{t('coinTitle')}</h1><p>{t('coinDesc')}</p></div><div className="balance-grid">{renderBalance('fc')}{renderBalance('rc')}</div><Card className="coin-rules"><ShieldCheck size={27} className="purple-text"/><p>{t('coinRules')}</p><button className="secondary-btn" onClick={()=>changePage('wallet')}><Wallet size={17}/>{t('wallet')}</button></Card><SectionHeader title={t('transactions')}/><Card className="list-card"><Transactions/></Card></>}
 const activePage=page==='exchange'||page==='withdraw'?'wallet':page;
 const pages:Record<Page,()=>React.ReactNode>={home:HomePage,mining:MiningPage,tasks:TasksPage,bonus:BonusPage,wallet:WalletPage,exchange:()=>WalletSection('exchange'),withdraw:()=>WalletSection('withdraw'),profile:ProfilePage,shop:ShopPage,coin:CoinPage,referrals:ReferralPage,leaderboard:Leaderboard,admin:AdminPage};
 if (isRender && !data) return <main className="telegram-welcome">
  <div className="telegram-welcome-art" aria-hidden="true"/>
  <div className="telegram-welcome-language"><LanguagePicker lang={lang} label={t('language')} open={languageOpen}
    onToggle={()=>setLanguageOpen(!languageOpen)} onClose={()=>setLanguageOpen(false)} onSelect={setLang}/></div>
  <section className="telegram-welcome-content">
   <h1>COIN<span>O</span>VA</h1>
   <p>{t('platformName')}</p>
   {loading || telegramWebApp()?.initData || error === 'telegram_unavailable' ?
    <button className="primary-btn telegram-welcome-action" disabled={loading} onClick={()=>void openAccount()}><Send size={20}/>{loading ? t('loading') : telegramLoginCopy[lang][0]}</button> :
    <a className="primary-btn telegram-welcome-action" href="https://t.me/coin_ova_bot" target="_blank" rel="noopener noreferrer"><Send size={20}/>{telegramLoginCopy[lang][0]}</a>}
   <p className="telegram-welcome-note" role="status">{telegramWebApp()?.initData && error ? errorMessage : telegramLoginCopy[lang][1]}</p>
  </section>
 </main>;
 return <div className="app-shell">{header}{!data?<main className="login-screen"><div className="login-art"><PlanetLogo size={100}/></div><h1>COINOVA</h1><p>{t('platformName')}</p><div className="glass login-card"><h2>{t('signIn')}</h2>{loading?<p>{t('loading')}</p>:<><p className="muted">{errorMessage}</p>{error==='sign_in_required'?<a href={authPath('signin')} target="_top" className="primary-btn">{t('chatgptSignIn')}</a>:<button className="primary-btn" onClick={()=>location.reload()}>{t('retry')}</button>}</>}</div></main>:<div className="layout"><aside className="sidebar"><nav>{nav.concat(extras).map(([name,Icon])=><button key={name} className={activePage===name?'selected':''} onClick={()=>changePage(name)}><Icon size={20}/><span>{t(name)}</span></button>)}</nav></aside><main className="content"><div className="content-inner" key={page}>{error&&<div className="error-banner"><span role="alert">{errorMessage}</span><button onClick={()=>setError('')}>×</button></div>}{pages[page]()}<footer className="footer"><PlanetLogo size={21}/> COINOVA © 2026 · {t('limit')}</footer></div></main></div>}{data&&<nav className="bottom-nav" aria-label={t('navigation')}>{nav.map(([name,Icon])=><button key={name} aria-current={activePage===name?'page':undefined} className={activePage===name?'active':''} onClick={()=>changePage(name)}><Icon size={20} strokeWidth={activePage===name?2.6:1.8}/><span>{t(name)}</span></button>)}</nav>}</div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
