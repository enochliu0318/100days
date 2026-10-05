// 背景音乐:优先播放 content/site.md 中 music 指定的文件;文件不存在时播放内置氛围音
const $=id=>document.getElementById(id);
const au=new Audio();au.loop=true;let hasFile=false,amb=null,playing=false;
export const isPlaying=()=>playing;
export function setSrc(s){if(s){au.src=s;hasFile=true}}
au.onerror=()=>{hasFile=false;if(playing&&!amb)amb=ambient()};
function ambient(){ // 原创柔和氛围音(无需外部文件)
 const A=new(window.AudioContext||window.webkitAudioContext)(),g=A.createGain();g.gain.value=.12;g.connect(A.destination);
 const sc=[261.6,293.7,329.6,392,440,523.3];
 const t=setInterval(()=>{const o=A.createOscillator(),e=A.createGain();o.type='sine';o.frequency.value=sc[Math.floor(Math.random()*6)];
  e.gain.setValueAtTime(0,A.currentTime);e.gain.linearRampToValueAtTime(.6,A.currentTime+.8);e.gain.linearRampToValueAtTime(0,A.currentTime+3.5);
  o.connect(e);e.connect(g);o.start();o.stop(A.currentTime+3.6)},1400);
 return{stop(){clearInterval(t);A.close()}}}

export function play(){if(hasFile)au.play().catch(()=>{});else amb=ambient();playing=true;$('mb').classList.add('on')}
export function stop(){au.pause();amb&&amb.stop();amb=null;playing=false;$('mb').classList.remove('on')}
$('mb').onclick=e=>{e.stopPropagation();playing?stop():play()};
$('fb').onclick=e=>{e.stopPropagation();$('fi').click()};
$('fi').onchange=e=>{const f=e.target.files[0];if(!f)return;stop();au.src=URL.createObjectURL(f);hasFile=true;play()};
