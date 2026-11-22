import { useId, type ReactNode } from 'react';

const width = 1440;
const height = 960;

const bounds = {
 '-1': [108, 339, 102, 82],
 0: [360, 180, 101, 91],
 31: [459, 495, 155, 166],
} as const;

// Outlines and hinge coordinates are in the original quarry artwork's pixel space.
const outlines = {
 ram: 'M124 349 Q153 359 192 347 L191 360 Q185 372 165 374 Q139 375 124 363Z',
 crystals: 'M138 399 L136 390 L141 385 L146 387 L154 377 L161 382 L165 378 L172 387 L180 384 L188 390 L190 399 Q165 409 138 399Z',
 bit: 'M372 249 L381 228 L388 217 L393 204 Q400 197 409 199 Q422 201 429 210 L420 219 L408 230 L390 242Z',
 boom: 'M543 534 Q555 526 569 531 L586 535 L602 556 L600 581 L590 576 L575 556 L566 551 L549 551 L541 545Z',
 arm: 'M546 535 L555 535 L559 547 L549 557 L525 584 L525 594 L513 602 L500 596 L500 582 L508 572 L516 570 L532 545Z',
 bucket: 'M486 589 L505 592 L525 594 L538 594 L546 603 L543 620 L537 635 L530 646 L523 642 L514 646 L503 646 L495 642 L488 638 L478 631 L482 623 L483 604Z',
};

function TexturePart({ texture, outline }: { texture: string; outline: string }) {
 const mask = useId();
 return <>
  <defs><clipPath id={mask}><path d={outline}/></clipPath></defs>
  <use href={'#' + texture} clipPath={'url(#' + mask + ')'}/>
 </>;
}

const cycle = '0;0.24;0.42;0.65;0.82;1';
const easing = '0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1';

function Joint({ x, y, angles, children }: { x: number; y: number; angles: string; children: ReactNode }) {
 return <g transform={`translate(${x} ${y})`}>
  <g>
   <animateTransform attributeName="transform" type="rotate" values={angles} keyTimes={cycle}
    keySplines={easing} calcMode="spline" dur="4.2s" repeatCount="indefinite"/>
   <g transform={`translate(${-x} ${-y})`}>{children}</g>
  </g>
 </g>;
}

function Press({ texture, id }: { texture: string; id: string }) {
 return <>
  <defs>
   <linearGradient id={id + '-chamber'} x2="1" y2="0">
    <stop stopColor="#30144b"/><stop offset=".48" stopColor="#140b28"/><stop offset="1" stopColor="#3e2156"/>
   </linearGradient>
   <linearGradient id={id + '-rod'} x2="1" y2="0">
    <stop stopColor="#854127"/><stop offset=".29" stopColor="#e7a342"/>
    <stop offset=".54" stopColor="#fff1aa"/><stop offset="1" stopColor="#aa5b25"/>
   </linearGradient>
  </defs>
  <path d="M122 349Q148 358 193 347L195 371 185 391 172 397 137 392 122 367Z" fill={`url(#${id}-chamber)`}/>
  <g>
   <animateTransform attributeName="transform" type="translate" values="0 0;0 0;0 14;0 14;0 0"
    keyTimes="0;.18;.45;.65;1" dur="2.5s" repeatCount="indefinite"/>
   <path d="M150 337h23v26h-23z" fill={`url(#${id}-rod)`}/>
   <TexturePart texture={texture} outline={outlines.ram}/>
  </g>
  <TexturePart texture={texture} outline="M113 335H200V348Q162 363 113 349Z"/>
  <TexturePart texture={texture} outline={outlines.crystals}/>
 </>;
}

function Drill({ texture, id }: { texture: string; id: string }) {
 return <>
  <defs>
   <linearGradient id={id + '-well'} x1="0" y1="1" x2="1" y2="0">
    <stop stopColor="#48326c"/><stop offset=".62" stopColor="#282040"/><stop offset="1" stopColor="#0c192a"/>
   </linearGradient>
  </defs>
  <path d={outlines.bit} fill={`url(#${id}-well)`}/>
  <g>
   <animateTransform attributeName="transform" type="translate" values="4 -4;0 0;-9 9;-8 8;4 -4"
    keyTimes="0;.18;.48;.68;1" dur="1.75s" repeatCount="indefinite"/>
   <TexturePart texture={texture} outline={outlines.bit}/>
  </g>
  <TexturePart texture={texture} outline="M393 195Q398 182 412 181L440 189 442 204 432 219 421 218Q426 204 410 199Q399 197 393 206Z"/>
 </>;
}

function Excavator({ texture, id }: { texture: string; id: string }) {
 const backplate = id + '-terrain';
 return <>
  <defs>
   <clipPath id={backplate}><path d={outlines.boom}/><path d={outlines.arm}/><path d={outlines.bucket}/></clipPath>
  </defs>
  <g clipPath={`url(#${backplate})`}>
   <use href={'#' + texture} transform="translate(110 5)"/>
   <path d="M475 524H602V649H475Z" fill="#231435" opacity=".24"/>
  </g>
  <Joint x={595} y={565} angles="0;-5;-5;9;5;0">
   <TexturePart texture={texture} outline={outlines.boom}/>
   <Joint x={550} y={542} angles="0;-5;5;15;9;0">
    <TexturePart texture={texture} outline={outlines.arm}/>
    <Joint x={514} y={587} angles="0;14;-12;-19;9;0">
     <TexturePart texture={texture} outline={outlines.bucket}/>
    </Joint>
   </Joint>
  </Joint>
  <TexturePart texture={texture} outline="M589 549L610 556 614 590 601 609 579 593 584 574Z"/>
 </>;
}

export function IslandMechanism({ art, image }: { art: -1 | 0 | 31; image: string }) {
 const id = useId();
 const texture = id + '-texture';
 const [x,y,w,h] = bounds[art];
 const Mechanism = art === -1 ? Press : art === 0 ? Drill : Excavator;
 return <svg aria-hidden="true" className="mining-island-mechanism" viewBox={`${x} ${y} ${w} ${h}`} style={{
  position: 'absolute', overflow: 'hidden', pointerEvents: 'none',
  left: `${x / 14.4}%`, top: `${y / 9.6}%`, width: `${w / 14.4}%`, height: `${h / 9.6}%`,
 }}>
  <defs><image id={texture} href={image} width={width} height={height}/></defs>
  <Mechanism texture={texture} id={id}/>
 </svg>;
}
