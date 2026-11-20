import { useId } from 'react';

export function PressUpgrades({ level }: { level: number }) {
  const id = useId();
  const metal = `url(#${id}-metal)`;
  const violet = `url(#${id}-violet)`;
  const energy = `url(#${id}-energy)`;

  return <svg className="press-upgrade-art" viewBox="0 0 768 512" aria-hidden="true">
    <defs>
      <linearGradient id={id + '-metal'} x2=".2" y2="1">
        <stop stopColor="#fff0a2"/><stop offset=".37" stopColor="#eda845"/>
        <stop offset=".72" stopColor="#954515"/><stop offset="1" stopColor="#f8bd54"/>
      </linearGradient>
      <linearGradient id={id + '-violet'} x2=".7" y2="1">
        <stop stopColor="#bb74ff"/><stop offset=".38" stopColor="#7328ab"/>
        <stop offset="1" stopColor="#29183f"/>
      </linearGradient>
      <linearGradient id={id + '-energy'} x2=".8" y2="1">
        <stop stopColor="#edffff"/><stop offset=".38" stopColor="#83f9ed"/>
        <stop offset="1" stopColor="#4886ec"/>
      </linearGradient>
    </defs>

    <g transform="translate(396 347)">
      <ellipse cy="4" rx="16" ry="13" fill="#341639"/>
      <ellipse rx="16" ry="13" fill={metal} stroke="#753918" strokeWidth="2"/>
      <path d="M0-8L3-3 9 0 3 3 0 8-3 3-9 0-3-3Z" fill="#fff4bd"/>
    </g>

    {level >= 2 && <g strokeLinejoin="round">
      <path d="M251 278L278 294 284 328 250 307Z" fill={metal} stroke="#74331c" strokeWidth="2"/>
      <path d="M255 289L273 300M257 297L275 308" fill="none" stroke="#fff0ab" strokeWidth="3" strokeLinecap="round"/>
    </g>}

    {level >= 3 && <g>
      <path d="M72 411L251 356" stroke="#251531" strokeWidth="10" strokeLinecap="round"/>
      <path d="M72 408L251 353" stroke="#6f50a1" strokeWidth="6" strokeLinecap="round"/>
      <path d="M84 404L107 397M131 390L153 383M176 375L199 368M222 361L245 354" stroke={energy} strokeWidth="3" strokeLinecap="round"/>
    </g>}

    {level >= 4 && <g transform="translate(480 92)">
      <path d="M0 4L26-8 43 1V46L27 60 0 49Z" fill={violet} stroke="#341344" strokeWidth="3"/>
      <path d="M9 11L29 2 36 6V39L28 47 9 40Z" fill="#22183f" stroke={metal} strokeWidth="2"/>
      <path d="M24 9L15 25H22L19 38 31 20H24Z" fill={energy}/>
    </g>}

    {level >= 5 && <g>
      <path d="M544 283Q599 302 656 282V291Q597 313 544 292Z" fill={metal} stroke="#692e21" strokeWidth="2"/>
      <path d="M550 284Q598 299 650 284" fill="none" stroke="#ffe6a5" strokeWidth="2"/>
      <path d="M544 304Q599 325 656 305V312Q597 335 544 312Z" fill={metal} stroke="#692e21" strokeWidth="2"/>
    </g>}

    {level >= 6 && <g transform="translate(185 157)">
      <path d="M16 52V8H40M12 50L16 59 20 50" fill="none" stroke={metal} strokeWidth="6" strokeLinecap="round"/>
      <path d="M-2 60Q18 67 30 58L29 71Q13 80-3 71Z" fill={violet} stroke="#2a1746" strokeWidth="2"/>
      <circle cx="16" cy="7" r="8" fill={energy} stroke="#22675d" strokeWidth="2"/>
      <path d="M-3 5Q0-8 13-11M33-5Q42 3 38 13" fill="none" stroke="#81fff0" strokeOpacity=".75" strokeWidth="3" strokeLinecap="round"/>
    </g>}

    {level >= 7 && <g>
      <ellipse cx="440" cy="407" rx="55" ry="10" fill="#311c43" opacity=".75"/>
      <path d="M388 391Q440 380 492 391V403Q440 419 388 403Z" fill={violet} stroke="#311c43" strokeWidth="2"/>
      <path d="M394 394Q439 410 486 394" fill="none" stroke={energy} strokeWidth="4" strokeLinecap="round"/>
      <ellipse cx="440" cy="391" rx="48" ry="8" fill={metal}/>
    </g>}

    {level >= 8 && <g transform="translate(669 161)">
      <path d="M0 39V13L12 3 35 10V56L21 64 3 55Z" fill={violet} stroke="#311640" strokeWidth="3"/>
      <path d="M9 45V19L15 12 27 17V45L20 52Z" fill="#282146" stroke={metal} strokeWidth="2"/>
      <path d="M14 21L20 16 25 22 24 40 19 46 14 41Z" fill={energy}/>
      <path d="M1 50L-16 65H-29" fill="none" stroke={metal} strokeWidth="5" strokeLinecap="round"/>
    </g>}

    {level >= 9 && <g>
      <path d="M354 74L365 63 381 68 385 87 413 87 418 69 433 63 444 74 439 104 359 104Z" fill={metal} stroke="#673621" strokeWidth="3"/>
      <path d="M371 100L378 92H421L427 100Z" fill={violet}/>
      <path d="M397 80L409 91 397 103 385 91Z" fill={energy} stroke="#eef9ff" strokeWidth="1.5"/>
    </g>}

    {level >= 10 && <g>
      <path d="M112 434Q280 499 570 455Q623 447 663 429" fill="none" stroke="#291731" strokeWidth="12" strokeLinecap="round"/>
      <path d="M112 433Q280 498 570 454Q623 446 663 428" fill="none" stroke={metal} strokeWidth="7" strokeLinecap="round"/>
      <path d="M176 452Q254 471 332 473M407 473Q533 467 608 445" fill="none" stroke={energy} strokeWidth="4" strokeLinecap="round"/>
      <path d="M328 45L344 14 358 33 399 5 439 33 454 14 471 45Q401 60 328 45Z" fill={metal} stroke="#6b3a23" strokeWidth="3"/>
      <path d="M399 19L412 32 399 47 386 32Z" fill={energy} stroke="#edffff" strokeWidth="2"/>
    </g>}
    {level >= 2 && <g transform="translate(468 109)">
      <circle r="11" fill={metal} stroke="#63301c" strokeWidth="2"/>
      <circle r="6" fill={energy} stroke="#286273" strokeWidth="1.5"/>
      <circle cx="-2" cy="-2" r="1.5" fill="#fff"/>
    </g>}

    {level >= 3 && <g transform="translate(105 420) rotate(-17)">
      <rect x="-22" y="-8" width="44" height="16" rx="5" fill={metal} stroke="#682d26" strokeWidth="2"/>
      <path d="M-13-3L-9 0-13 3M-4-3L0 0-4 3M5-3L9 0 5 3" fill="none" stroke="#4d2a57" strokeWidth="2.5" strokeLinecap="round"/>
    </g>}

    {level >= 4 && <g transform="translate(534 125)">
      <path d="M-13 3L-4-17 5-20 14-7 9 11-3 16Z" fill={energy} stroke="#594296" strokeWidth="2"/>
      <path d="M-4-17L0 0 14-7M0 0L-3 16" fill="none" stroke="#e5fffb" strokeWidth="1.6"/>
      <path d="M-14 12Q0 21 13 11L10 19Q-2 26-12 20Z" fill={metal} stroke="#693520" strokeWidth="2"/>
    </g>}

    {level >= 5 && <g transform="translate(628 342)">
      <path d="M-22 0Q0 5 22-4L19 13Q0 23-20 16Z" fill={violet} stroke={metal} strokeWidth="2"/>
      <path d="M-10 9L-5 14 9 6" fill="none" stroke="#ffe6a3" strokeWidth="2.5" strokeLinecap="round"/>
    </g>}

    {level >= 6 && <g transform="translate(221 142)">
      <path d="M-22 0Q-11-12 0 0Q-11 11-22 0Z" fill="#51307e" stroke={metal} strokeWidth="2"/>
      <path d="M-11 2L-1 12" stroke={metal} strokeWidth="3" strokeLinecap="round"/>
      <circle cx="-11" cy="0" r="3" fill={energy}/>
    </g>}

    {level >= 7 && <g transform="translate(509 398)">
      <path d="M-12 8Q0 16 12 8L10 15Q0 21-10 15Z" fill={metal} stroke="#592d39" strokeWidth="2"/>
      <path d="M0-21L10-2 4 11-6 9-10-1Z" fill={energy} stroke="#5758a0" strokeWidth="2"/>
      <path d="M0-19L1 6-9-1" fill="none" stroke="#dffcff" strokeWidth="1.5"/>
    </g>}

    {level >= 8 && <g transform="translate(691 276)">
      <path d="M-15-6L0-13 15-6V8L0 16-15 8Z" fill={violet} stroke={metal} strokeWidth="2"/>
      <path d="M-8 2H-4L0-5 4 7 8 1" fill="none" stroke="#92fff3" strokeWidth="2" strokeLinecap="round"/>
    </g>}

    {level >= 9 && <g transform="translate(312 86)">
      <path d="M0-14L11-8 9 8 0 16-9 8-11-8Z" fill={metal} stroke="#662e32" strokeWidth="2"/>
      <path d="M0-8L6 0 0 8-6 0Z" fill="#a976ff" stroke="#fff0ba" strokeWidth="1.2"/>
    </g>}

    {level >= 10 && <g transform="translate(590 416) rotate(-12)">
      <path d="M-23-8L0-17 23-8 19 9 0 17-19 9Z" fill={metal} stroke="#643527" strokeWidth="2"/>
      <path d="M0-11L4-4 12 0 4 4 0 11-4 4-12 0-4-4Z" fill={energy} stroke="#f4ffff" strokeWidth="1.3"/>
    </g>}
  </svg>;
}
