// 画布特效:飘落花瓣 + 点击爱心/烟花
const $=id=>document.getElementById(id);
// 画布:花瓣 + 爱心 + 烟花
const cv=$('cv'),cx=cv.getContext('2d');let W,H;
function rs(){const r=devicePixelRatio||1;W=innerWidth;H=innerHeight;cv.width=W*r;cv.height=H*r;cx.setTransform(r,0,0,r,0,0)}rs();addEventListener('resize',rs);
const petals=Array.from({length:22},()=>({x:Math.random()*W,y:Math.random()*H,s:6+Math.random()*8,v:.5+Math.random()*1,w:Math.random()*6,r:Math.random()*6}));
let ps=[];
const cols=['#ff7da6','#ffb3c9','#ff5c8a','#ffd1dc','#f9a8d4','#fff'];
function heartPath(x,y,s){cx.beginPath();cx.moveTo(x,y+s*.3);cx.bezierCurveTo(x,y-s*.3,x-s,y-s*.3,x-s,y+s*.3);cx.bezierCurveTo(x-s,y+s*.8,x,y+s,x,y+s*1.3);cx.bezierCurveTo(x,y+s,x+s,y+s*.8,x+s,y+s*.3);cx.bezierCurveTo(x+s,y-s*.3,x,y-s*.3,x,y+s*.3);cx.fill()}
function burst(x,y){
 for(let i=0;i<4;i++)ps.push({x:x+(Math.random()-.5)*30,y,vx:(Math.random()-.5)*1.4,vy:-1.5-Math.random()*1.5,s:7+Math.random()*9,l:1,h:1,c:cols[i%5],g:-.01});
 const n=26,c=cols[Math.floor(Math.random()*5)];
 for(let i=0;i<n;i++){const a=i/n*6.283,sp=2+Math.random()*3;ps.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,s:2.5,l:1,c,g:.06})}
}
function loop(){
 cx.clearRect(0,0,W,H);
 cx.fillStyle='rgba(255,150,180,.75)';
 petals.forEach(p=>{p.y+=p.v;p.w+=.02;p.x+=Math.sin(p.w)*.8;p.r+=.02;if(p.y>H+20){p.y=-20;p.x=Math.random()*W}
  cx.save();cx.translate(p.x,p.y);cx.rotate(p.r);cx.beginPath();cx.ellipse(0,0,p.s,p.s/2,0,0,6.283);cx.fill();cx.restore()});
 ps=ps.filter(p=>p.l>0);
 ps.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=p.g;p.vx*=.985;p.l-=p.h?.008:.016;cx.globalAlpha=Math.max(p.l,0);cx.fillStyle=p.c;
  if(p.h)heartPath(p.x,p.y,p.s/2);else{cx.beginPath();cx.arc(p.x,p.y,p.s,0,6.283);cx.fill()}});
 cx.globalAlpha=1;requestAnimationFrame(loop)}
loop();
addEventListener('pointerdown',e=>burst(e.clientX,e.clientY));

export{burst,W,H};
export const size=()=>[W,H];
