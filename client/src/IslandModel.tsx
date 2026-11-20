import { useEffect, useRef } from 'react';

type Point = [number, number, number];
type Face = { points: Point[]; color: string };

function buildModel(kind: string, art: number) {
 const faces: Face[] = [];
 const metal = '#67517b', gold = '#e5a64d', dark = '#342746';
 const lights = ['#a769ff','#42d9ff','#ffb751','#76ffcb','#ef6bcf'];
 const glow = lights[art < 0 ? 0 : art % lights.length];

 function box(x: number, y: number, z: number, w: number, d: number, h: number, color: string) {
  const corners: Point[] = [[x-w/2,y-d/2,z],[x+w/2,y-d/2,z],[x+w/2,y+d/2,z],[x-w/2,y+d/2,z]];
  const top: Point[] = corners.map(([px,py])=>[px,py,z+h]);
  faces.push({points:top,color});
  for(let i=0;i<4;i++){
   const j=(i+1)%4;
   faces.push({points:[corners[i],corners[j],top[j],top[i]],color});
  }
 }

 function ring(x: number, y: number, z: number, radius: number, height: number, color: string, inner = 0, upper = radius) {
  const at = (i: number, r: number, pz: number): Point => [x+Math.cos(i*Math.PI/8)*r,y+Math.sin(i*Math.PI/8)*r,pz];
  for(let i=0;i<16;i++){
   const j=i+1, top=z+height;
   faces.push({points:[at(i,radius,z),at(j,radius,z),at(j,upper,top),at(i,upper,top)],color});
   faces.push({points:[at(i,upper,top),at(j,upper,top),at(j,inner,top),at(i,inner,top)],color});
   if(inner) faces.push({points:[at(j,inner,z),at(i,inner,z),at(i,inner,top),at(j,inner,top)],color});
  }
 }

 if (kind === 'press') {
  box(0,0,0,65,42,6,gold);
  for(const x of [-23,23]) box(x,0,6,8,25,46,metal);
  box(0,0,51,57,32,12,glow);
  ring(0,0,26,12,25,gold);
  box(0,0,20,30,22,7,metal);
  ring(0,0,7,11,12,glow,0,4);
 } else if (kind === 'storage') {
  const height=20+(art%5)*4, w=48+(art%4)*4;
  if (art%3===0) {
   ring(0,0,0,25,6,gold);
   ring(0,0,6,22,height,metal);
   ring(0,0,6+height,21,8,glow,0,15);
  } else {
   box(0,0,0,w+5,39,6,dark);
   box(0,0,6,w,35,height,metal);
   for(const x of [-w/3,w/3]) box(x,0,5,5,38,height+3,gold);
   box(0,18,11,17,3,height*.55,glow);
   box(0,0,height+6,w-4,31,4,glow);
  }
 } else if (kind === 'boost') {
  const height=14+(art%5)*5;
  box(0,0,0,57,42,6,dark);
  if(art%3===0){
   box(0,0,6,39,30,9,gold);
   box(0,0,15,33,24,7,glow);
   for(const x of [-19,19]) for(const y of [-11,0,11]) box(x,y,5,10,4,7,metal);
  }else{
   ring(0,0,6,19,height,glow);
   ring(0,0,7,23,5,gold,16);
   ring(0,0,6+height,22,6,metal,11);
   for(const x of [-20,20]) box(x,0,6,5,7,height+8,gold);
   if(art%3===2) ring(0,0,16+height,18,4,glow,13);
  }
 } else if(art===9 || art%5===2) {
  ring(0,0,0,32,5,dark,19);
  ring(0,0,5,29,10,gold,20);
  ring(0,0,2,20,2,glow);
  for(const x of [-22,22]) box(x,-12,13,7,7,12+art%6*3,metal);
 } else if(art%3===1) {
  ring(0,0,0,27,6,gold);
  for(const x of [-18,18]) box(x,0,6,5,9,35,metal);
  ring(0,0,8,11,24+art%5*4,glow,0,6);
  ring(0,0,41,19,5,gold,12);
  box(0,0,46,6,6,13,metal);
 } else {
  const height=19+(art%5)*3;
  for(const x of [-20,20]) box(x,0,0,11,42,9,dark);
  box(0,0,9,43,35,11,metal);
  box(0,-3,20,26,24,height,gold);
  box(0,9,height+8,19,16,12,glow);
  box(0,19,13,11,24,9,metal);
  box(0,32,14,7,9,6,glow);
 }
 return faces;
}

function drawModel(canvas: HTMLCanvasElement, kind: string, art: number) {
 const ctx=canvas.getContext('2d');
 if(!ctx)return;
 const project = ([x,y,z]: Point) => [(x-y)*1.9+120,(x+y)*.85-z*2+147];
 ctx.clearRect(0,0,240,200);
 const faces=buildModel(kind,art).sort((a,b)=>{
  const depth=({points}: Face) => points.reduce((sum,[x,y,z])=>sum+x+y+z*.8,0)/points.length;
  return depth(a)-depth(b);
 });
 for(const {points,color} of faces){
  const [a,b,c]=points;
  const u=b.map((v,i)=>v-a[i]), v=c.map((p,i)=>p-a[i]);
  const shade=u[0]*v[1]-u[1]*v[0]!==0 ? 1 : Math.abs(u[1]*v[2]-u[2]*v[1])>0 ? .73 : .53;
  ctx.beginPath();
  points.forEach((point,i)=>{
   const [x,y]=project(point);
   if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  });
  ctx.closePath();
  const rgb=color.slice(1).match(/../g)!.map(ch=>Math.round(parseInt(ch,16)*shade));
  ctx.fillStyle='rgb('+rgb.join(',')+')';
  ctx.fill();
  ctx.strokeStyle=ctx.fillStyle;
  ctx.lineWidth=.75;
  ctx.stroke();
 }
}

export function IslandModel({kind,art}: {kind:string; art:number}) {
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{if(ref.current)drawModel(ref.current,kind,art)},[kind,art]);
 return <canvas ref={ref} width={240} height={200} className="island-model" aria-hidden="true" style={{width:120,height:100,display:'block'}}/>;
}
