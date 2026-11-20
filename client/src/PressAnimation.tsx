import { useId } from 'react';

const art = '/cosmic-press.webp';

export function PressAnimation() {
  const id = useId();
  const ref = (name: string) => `url(#${id}-${name})`;
  const source = <image href={art} width="768" height="512"/>;
  return <svg className="press-animation" viewBox="0 0 768 512" aria-hidden="true">
    <defs>
      <clipPath id={id + '-cart'}><path d="M52 290Q57 286 72 284L82 270 96 256 113 262 130 238 143 237 156 249 158 263 174 259 187 276 190 284Q210 285 207 300L202 313 194 350Q199 370 184 378Q169 384 159 371L151 372Q147 390 128 390Q115 390 112 377L84 374Q68 371 68 352L61 315Q50 310 52 290Z"/></clipPath>
      <clipPath id={id + '-cart-top'}><path d="M48 230H211V356L189 352 169 350 147 364 113 363 61 366Z"/></clipPath>
      <clipPath id={id + '-wheels'}><path d="M68 348H202V393H68Z"/></clipPath>
      <clipPath id={id + '-empty-bin'}><path d="M48 290L68 287Q115 318 190 286L213 286V365H48Z"/></clipPath>
      <clipPath id={id + '-piston'}><path d="M337 200C341 183 455 183 462 200V223C460 246 339 245 337 223Z"/></clipPath>
      <clipPath id={id + '-ore'}><path d="M364 274L368 260 376 255 382 244 409 242 424 249 435 272 427 281H374Z"/></clipPath>
      <clipPath id={id + '-token'}><circle cx="602" cy="296" r="18"/></clipPath>
      <clipPath id={id + '-chute'}><path d="M508 175L565 181 614 211 620 233H603L597 218 558 199 508 190Z"/></clipPath>
      <clipPath id={id + '-jar'}><path d="M573 247H628Q653 248 652 272V330H550V270Q552 252 573 247Z"/></clipPath>
      <clipPath id={id + '-rock'}><path d="M184 303L191 280 204 268 211 247 230 232 243 239 244 317Z"/></clipPath>
      <linearGradient id={id + '-floor'} x2="0" y2="1">
        <stop stopColor="#433153"/><stop offset="1" stopColor="#715789"/>
      </linearGradient>
      <linearGradient id={id + '-shaft'}>
        <stop stopColor="#742c13"/><stop offset=".25" stopColor="#bd6c26"/>
        <stop offset=".58" stopColor="#ffca45"/><stop offset=".78" stopColor="#fff39d"/>
        <stop offset="1" stopColor="#9e4917"/>
      </linearGradient>
      <radialGradient id={id + '-cavity'}>
        <stop stopColor="#332034"/><stop offset="1" stopColor="#190f25"/>
      </radialGradient>
      <radialGradient id={id + '-flash'}>
        <stop stopColor="#fff0b3" stopOpacity=".8"/><stop offset="1" stopColor="#ffad49" stopOpacity="0"/>
      </radialGradient>
      <g id={id + '-coin'}><g transform="translate(-602 -296)" clipPath={ref('token')}>{source}</g></g>
      <g id={id + '-gem'}><g transform="translate(-399 -264)" clipPath={ref('ore')}>{source}</g></g>
    </defs>
    {/* Expose the track and press cavity behind each moving part. */}
    <path fill="#180e24" d="M48 232H192L204 262 203 306 191 335H55L48 311Z"/>
    <g clipPath={ref('rock')}>{source}</g>
    <path fill={ref('floor')} d="M49 354L61 323 202 289 213 305 239 321 240 343 205 370 109 395 49 387Z"/>
    <path fill="none" stroke="#392447" strokeWidth="10" d="M61 378L230 324M89 396L249 347"/>
    <path fill="none" stroke="#ac6e2c" strokeWidth="7" d="M61 375L230 322M89 393L249 345"/>
    <path fill="none" stroke="#e6b562" strokeWidth="2" d="M61 372L230 320M89 390L249 343"/>
    <path fill={ref('cavity')} d="M336 197Q342 187 366 189H433Q456 188 463 199V249L454 277Q400 262 345 278L335 258Z"/>
    <ellipse cx="399" cy="278" rx="48" ry="10" fill="#aa6896"/>
    <rect className="press-shaft-extension" x="366" y="190" width="67" height="25" fill={ref('shaft')}/>
    <g className="press-piston" clipPath={ref('piston')}>{source}</g>
    <g className="press-cart">
      <g clipPath={ref('cart')}><g clipPath={ref('wheels')}>{source}</g></g>
      <g className="press-bin" clipPath={ref('cart-top')}>
        <g clipPath={ref('cart')}><g className="press-bin-loaded">{source}</g></g>
        <g className="press-bin-empty">
          <ellipse cx="130" cy="291" rx="72" ry="16" fill="#412247" stroke="#ad723d" strokeWidth="4"/>
          <g clipPath={ref('cart')}><g clipPath={ref('empty-bin')}>{source}</g></g>
        </g>
      </g>
    </g>
    <g className="press-gem-flight"><use href={'#' + id + '-gem'}/></g>
    <g className="press-ore"><use href={'#' + id + '-gem'} x="399" y="264"/></g>
    <ellipse className="press-flash" cx="400" cy="265" rx="64" ry="30" fill={ref('flash')}/>
    <g clipPath={ref('chute')}><g className="press-chute-coin"><use href={'#' + id + '-coin'}/></g></g>
    <g clipPath={ref('jar')}>
      <g className="press-jar-coin"><use href={'#' + id + '-coin'}/></g>
      <path d="M637 261Q643 267 641 291" fill="none" stroke="#f6dcff" strokeOpacity=".24" strokeWidth="3" strokeLinecap="round"/>
    </g>
  </svg>;
}
