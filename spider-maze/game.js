"use strict";
const LV=window.LEVELS,A=window.ASSETS,M=3,SS=14,SPEED=8.5,MAXHP=5;let li=0,L,W,H,CW,CH,WALL;
const solid=(x,y)=>x<0||y<0||x>=W||y>=H||WALL[y][x]===1;
const nbrs=(i,j)=>{const o=[];if(i<CW-1&&!WALL[3*j+1][3*i+3])o.push([1,0]);if(i>0&&!WALL[3*j+1][3*i])o.push([-1,0]);if(j<CH-1&&!WALL[3*j+3][3*i+1])o.push([0,1]);if(j>0&&!WALL[3*j][3*i+1])o.push([0,-1]);return o};
const DIR={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
const rnd=n=>{const s=Math.sin(n*127.1)*43758.5453;return s-Math.floor(s)};
const hs=(x,y)=>((Math.imul(x,73856093)^Math.imul(y,19349663))>>>0);
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const reduce=matchMedia("(prefers-reduced-motion:reduce)").matches;
const $=id=>document.getElementById(id),cv=$("c"),ctx=cv.getContext("2d");
const IM={};for(const k in A){IM[k]=new Image();IM[k].src=A[k]}const spider=IM.spiderman;$("face").src=A.spiderman;
const channelLogo=new Image();channelLogo.src="images/channel_logo_official_circular_1024.png";
let cw,ch,B,floorT,wallT,sawS,cloudS,shadow,G,camX=0,camY=0,shake=0,T=0,last=0,state="ready",ratio=innerWidth>innerHeight?"16:9":"9:16",mini,hudB=0;
const Snd={sfx:k=>{if(k==="hit")GameAudio.play("hit",{rand:.06});else if(k==="heal")GameAudio.play("heal",{rand:.03});else if(k==="shield")GameAudio.play("shield");else if(k==="win"){GameAudio.duck(2);GameAudio.play("win")}else if(k==="lose")GameAudio.play("lose")},
 music:p=>{if(p)GameAudio.begin().then(()=>{if(state==="play")GameAudio.musicStart()});else GameAudio.musicStop()},unlock:()=>GameAudio.begin(),get on(){return GameAudio.on},toggle(){GameAudio.toggle();sdIcon()}};
const SVG_ON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',SVG_OFF='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4zM17 9l5 6M22 9l-5 6"/></svg>';
function sdIcon(){const b=$("sd");b.innerHTML=Snd.on?SVG_ON:SVG_OFF;b.setAttribute("aria-pressed",String(Snd.on))}
function loadLevel(i){L=LV[li=i];W=L.W;H=L.H;CW=(W-1)/3;CH=(H-1)/3;WALL=L.walls.map(r=>Uint8Array.from(r,Number));$("tot").textContent=L.coins.length;shadow=buildShadow();buildCast();resize();newGame()}

const mk=(w,h)=>{const c=document.createElement("canvas");c.width=w;c.height=h;return c};
function blur(a,w,h,r){const t=new Float32Array(a.length),n=2*r+1;
 for(let y=0;y<h;y++){let s=0;const o=y*w;for(let x=-r;x<=r;x++)s+=a[o+clamp(x,0,w-1)];for(let x=0;x<w;x++){t[o+x]=s/n;s+=a[o+Math.min(w-1,x+r+1)]-a[o+Math.max(0,x-r)]}}
 for(let x=0;x<w;x++){let s=0;for(let y=-r;y<=r;y++)s+=t[clamp(y,0,h-1)*w+x];for(let y=0;y<h;y++){a[y*w+x]=s/n;s+=t[Math.min(h-1,y+r+1)*w+x]-t[Math.max(0,y-r)*w+x]}}}
function buildShadow(){const w=(W+2*M)*SS,h=(H+2*M)*SS,c=mk(w,h),g=c.getContext("2d");g.fillStyle="#000";
 for(let y=-M;y<H+M;y++)for(let x=-M;x<W+M;x++)if(solid(x,y))g.fillRect((x+M)*SS,(y+M)*SS,SS,SS);
 const d=g.getImageData(0,0,w,h),a=new Float32Array(w*h);for(let i=0;i<a.length;i++)a[i]=d.data[i*4+3];
 for(let k=0;k<3;k++)blur(a,w,h,Math.round(SS*.5));
 for(let i=0;i<a.length;i++)d.data[i*4+3]=Math.min(235,a[i]*1.7);g.putImageData(d,0,0);return c}
function buildTiles(){
 floorT=[...Array(8)].map((_,v)=>{const c=mk(B,B),g=c.getContext("2d"),q=n=>rnd(v*17+n);
  const gr=g.createRadialGradient(B/2,B/2,B*.1,B/2,B/2,B*.72);gr.addColorStop(0,"#ffc744");gr.addColorStop(1,"#f29d18");g.fillStyle=gr;g.fillRect(0,0,B,B);
  g.strokeStyle="rgba(180,95,0,.14)";g.lineWidth=Math.max(1,B*.02);g.strokeRect(0,0,B,B);
  g.fillStyle="rgba(150,75,0,.08)";for(let i=0;i<4;i++)g.fillRect(q(i)*B,0,B*(.015+q(i+9)*.02),B);
  g.fillStyle="rgba(120,55,0,.25)";for(let i=0;i<3;i++){g.beginPath();g.ellipse(q(i+20)*B,q(i+30)*B,B*.016,B*.01,0,0,7);g.fill()}
  if(v%3===0){const bx=B*(.28+q(40)*.4),by=B*(.62+q(41)*.3);for(let i=0;i<7;i++){const dx=(i-3)*B*.035,h=B*(.18+q(i+50)*.12),ln=(i-3)*B*.025;g.fillStyle=["#7be834","#34c828","#9eef52"][i%3];g.strokeStyle="rgba(10,65,0,.45)";g.lineWidth=Math.max(1,B*.012);g.beginPath();g.moveTo(bx+dx-B*.03,by);g.lineTo(bx+dx+ln,by-h);g.lineTo(bx+dx+B*.03,by);g.closePath();g.fill();g.stroke()}}
  return c});
 wallT=[...Array(4)].map((_,v)=>{const c=mk(B,B),g=c.getContext("2d");
  g.fillStyle="#040c2b";g.fillRect(0,0,B,B);
  const p=B*.05;
  g.fillStyle="#3d66e8";g.beginPath();g.moveTo(0,0);g.lineTo(B,0);g.lineTo(B-p,p);g.lineTo(p,p);g.lineTo(p,B-p);g.lineTo(0,B);g.closePath();g.fill();
  g.fillStyle="#06123a";g.beginPath();g.moveTo(B,0);g.lineTo(B,B);g.lineTo(0,B);g.lineTo(p,B-p);g.lineTo(B-p,B-p);g.lineTo(B-p,p);g.closePath();g.fill();
  const ip=B*.13,iw=B-2*ip;
  const gr=g.createLinearGradient(ip,ip,B-ip,B-ip);gr.addColorStop(0,"#1f41ab");gr.addColorStop(.45,"#142b78");gr.addColorStop(1,"#091748");
  g.fillStyle=gr;rrect(g,ip,ip,iw,iw,B*.06);g.fill();
  g.strokeStyle="rgba(165,200,255,.45)";g.lineWidth=Math.max(1,B*.028);rrect(g,ip,ip,iw,iw,B*.06);g.stroke();
  const rv=B*.038,offs=[[ip*.52,ip*.52],[B-ip*.52,ip*.52],[ip*.52,B-ip*.52],[B-ip*.52,B-ip*.52]];
  offs.forEach(([rx,ry])=>{
   g.fillStyle="rgba(0,0,20,.65)";g.beginPath();g.arc(rx+.8,ry+1.2,rv*1.2,0,7);g.fill();
   const rg=g.createRadialGradient(rx-rv*.35,ry-rv*.35,rv*.1,rx,ry,rv);
   rg.addColorStop(0,"#e2eeff");rg.addColorStop(.6,"#7292d5");rg.addColorStop(1,"#1b2d56");
   g.fillStyle=rg;g.beginPath();g.arc(rx,ry,rv,0,7);g.fill();
   g.fillStyle="#fff";g.beginPath();g.arc(rx-rv*.3,ry-rv*.3,rv*.32,0,7);g.fill();
  });
  return c});
 sawS=(()=>{const D=Math.ceil(B*2.5),c=mk(D,D),g=c.getContext("2d"),m=D/2;let gr;
  if(g.createConicGradient){gr=g.createConicGradient(0,m,m);for(let i=0;i<=8;i++)gr.addColorStop(i/8,i%2?"#838c9c":"#dde3ee")}else{gr=g.createRadialGradient(m,m,0,m,m,m);gr.addColorStop(0,"#e6ebf3");gr.addColorStop(1,"#727b8c")}
  g.fillStyle=gr;g.strokeStyle="#262c38";g.lineWidth=D*.013;g.beginPath();
  for(let i=0;i<48;i++){const a=i*Math.PI/24,r=i%2?D*.4:D*.485;g.lineTo(m+Math.cos(a)*r,m+Math.sin(a)*r)}
  g.closePath();g.fill();g.stroke();g.strokeStyle="rgba(35,40,55,.55)";g.lineWidth=D*.02;g.beginPath();g.arc(m,m,D*.3,0,7);g.stroke();
  g.fillStyle="rgba(30,35,48,.78)";for(let i=0;i<6;i++){const a=i*Math.PI/3;g.beginPath();g.arc(m+Math.cos(a)*D*.22,m+Math.sin(a)*D*.22,D*.055,0,7);g.fill()}
  g.fillStyle="#d3243a";g.beginPath();g.arc(m,m,D*.1,0,7);g.fill();g.fillStyle="#fff";g.fillRect(m-D*.013,m-D*.1,D*.026,D*.1);return c})();
 cloudS=(()=>{const D=Math.ceil(B*3),c=mk(D,D),g=c.getContext("2d"),P=[[.5,.55,.26],[.3,.6,.2],[.7,.6,.2],[.4,.4,.2],[.62,.42,.2],[.5,.7,.18]];
  g.fillStyle="#ece8dc";g.strokeStyle="#b7b1a0";g.lineWidth=D*.016;for(const[x,y,r]of P){g.beginPath();g.arc(x*D,y*D,r*D,0,7);g.fill();g.stroke()}
  for(const[x,y,r]of P){g.beginPath();g.arc(x*D,y*D,r*D*.96,0,7);g.fill()}return c})();
}
function rrect(g,x,y,w,h,r){g.beginPath();if(g.roundRect)g.roundRect(x,y,w,h,r);else g.rect(x,y,w,h)}
function resize(){const r=ratio==="16:9"?16/9:9/16,w=Math.min(innerWidth*.95,innerHeight*.95*r),h=w/r,f=$("frame");f.style.width=w+"px";f.style.height=h+"px";f.style.setProperty("--u",clamp(Math.min(w/412,h/760),.7,1.5));
 const dpr=Math.min(devicePixelRatio||1,2),s=$("stage");cw=cv.width=Math.max(200,Math.round(s.clientWidth*dpr));ch=cv.height=Math.max(200,Math.round(s.clientHeight*dpr));B=Math.round(clamp(Math.min(cw/8.4,ch/(r>1?8:10.5)),40,150));buildTiles();buildMini()}
function buildMini(){mini=mk(W*3,H*3);const g=mini.getContext("2d");g.fillStyle="#f2b13a";g.fillRect(0,0,W*3,H*3);g.fillStyle="#17307f";for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(WALL[y][x])g.fillRect(x*3,y*3,3,3);
 hudB=0}
function buildCast(){const c=$("cast"),fr=L.cast.friends.slice(0,6),en=L.cast.enemies.slice(0,6-fr.length),tot=fr.length+en.length;c.innerHTML="";
 const add=(n,k)=>{const d=document.createElement("div");d.className="ct "+k+(tot===1?" solo":"");d.dataset.n=n;const i=new Image();i.src=A[n]||"";i.alt=n;d.appendChild(i);c.appendChild(d)};
 fr.forEach(n=>add(n,"fr"));if(fr.length&&en.length){const v=document.createElement("div");v.className="vs";v.textContent="VS";c.appendChild(v)}en.forEach(n=>add(n,"en"))}
function drawMini(){const mh=Math.min(ch*.2,B*2.4),mw=mh*W/H,mx=cw-mw-B*.2,my=hudB+B*.15,q=mw/W,r=Math.max(2.5,q*1.6);ctx.save();
 rrect(ctx,mx-4,my-4,mw+8,mh+8,B*.15);ctx.fillStyle="rgba(8,18,56,.9)";ctx.fill();ctx.strokeStyle="#ffd23f";ctx.lineWidth=3;ctx.stroke();ctx.clip();ctx.drawImage(mini,mx,my,mw,mh);
 const P=(x,y)=>[mx+x*q,my+y*q],dot=(x,y,rr,c,s)=>{const[a,b]=P(x,y);ctx.fillStyle=c;ctx.beginPath();ctx.arc(a,b,rr,0,7);ctx.fill();if(s){ctx.strokeStyle=s;ctx.lineWidth=1.5;ctx.stroke()}};
 L.lasers.forEach(l=>{const[a,b]=P(l[0],l[1]);ctx.fillStyle=l[2]==="h"?"#ff2d44":"#2f8cff";ctx.fillRect(a-r,b-r,r*2,r*2)});
 L.saws.forEach((s,k)=>{const[x,y]=sawAt(s,k);dot(x,y,r*1.2,"#d6dce8","#222")});
 L.wsaws.forEach(w=>{const[x,y]=wsPos(w);dot(x,y,r*1.3,"#ff7a1a","#5a2a00")});
 L.enemies.forEach((s,k)=>{const[x,y]=sawAt(s,k+9);dot(x,y,r*1.3,"#e5243a","#fff")});
 G.shields.forEach(s=>{if(!s.got)dot(s.x,s.y,r*1.1,"#58b8ff","#fff")});
 G.bub.forEach(s=>{if(!s.got){const[a,b]=P(s.x,s.y);ctx.fillStyle="#19b94a";ctx.fillRect(a-r*1.3,b-r*.4,r*2.6,r*.8);ctx.fillRect(a-r*.4,b-r*1.3,r*.8,r*2.6)}});
 dot(cen(...L.exit)[0],cen(...L.exit)[1],r*1.6,"#2bd9a4","#fff");const[px,py]=pos();dot(px,py,r*1.5,"#ffd23f","#0a1536");ctx.restore();
 if(channelLogo.complete&&channelLogo.naturalWidth>0){
  const lr=Math.min(mw*.42,B*.85),lx=mx+mw/2,ly=my+mh+lr+B*.18;
  if(ly+lr<ch-8){
   ctx.save();ctx.shadowColor="rgba(0,0,0,.6)";ctx.shadowBlur=12;
   ctx.beginPath();ctx.arc(lx,ly,lr,0,7);ctx.fillStyle="rgba(8,18,56,.92)";ctx.fill();
   ctx.save();ctx.beginPath();ctx.arc(lx,ly,lr-2,0,7);ctx.clip();
   ctx.drawImage(channelLogo,lx-lr,ly-lr,lr*2,lr*2);ctx.restore();
   ctx.strokeStyle="#ffd23f";ctx.lineWidth=Math.max(2,B*.045);ctx.stroke();ctx.restore();
  }
 }}
const star=(g,x,y,r)=>{g.beginPath();for(let k=0;k<10;k++){const a=-Math.PI/2+k*Math.PI/5,q=k%2?r*.45:r;g.lineTo(x+Math.cos(a)*q,y+Math.sin(a)*q)}g.closePath()};
const cen=(i,j)=>[3*i+2,3*j+2];
function newGame(){const[si,sj]=L.start;
 G={dead:new Set(),p:{i:si,j:sj,bi:si,bj:sj,t:0,last:[si,sj]},hp:MAXHP,score:0,t:0,inv:0,shield:0,look:null,fx:[],
  coins:L.coins.map((c,k)=>({x:c[0],y:c[1],got:0,ph:k})),bub:L.bubbles.map(b=>({x:b[0],y:b[1],got:0})),shields:L.shields.map(b=>({x:b[0],y:b[1],got:0}))};
 T=0;VFX.clear();GameAudio.stopLoops();const[x,y]=pos();camX=x;camY=y;ui()}
function pos(){const p=G.p,a=cen(p.i,p.j),b=cen(p.bi,p.bj);return[a[0]+(b[0]-a[0])*p.t,a[1]+(b[1]-a[1])*p.t]}
const wsPos=(w)=>{const u=(T+w[4])%4800;let e=u<900?0:u<2400?(u-900)/1500:u<3300?1:1-(u-3300)/1500;e=e*e*(3-2*e);return[w[0]+w[2]*3*e,w[1]+w[3]*3*e]};
const lOn=(k)=>(T+k*700)%3000>1600,lWarn=(k)=>{const t=(T+k*700)%3000;return t>1250&&t<=1600};
const sawAt=(s,k)=>{const t=(Math.sin(T*.0011+k*1.9)+1)/2;return[s[0]+(s[2]-s[0])*t,s[1]+(s[3]-s[1])*t]};
const near=(cx,cy,r,px,py,h=.78)=>{const dx=Math.max(Math.abs(cx-px)-h,0),dy=Math.max(Math.abs(cy-py)-h,0);return dx*dx+dy*dy<r*r};
let toastT;function toast(m){const t=$("toast");t.textContent=m;t.classList.add("on");clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove("on"),1500)}
function ui(){$("sc").textContent=G.score;$("tm").textContent=(G.t/1000).toFixed(1)+"s";document.querySelectorAll(".ct").forEach(e=>e.classList.toggle("dead",G.dead.has(e.dataset.n)))}
function fx(type,x,y){VFX.add(type,x,y,T)}
function show(title,msg,stars,btn){$("frame").classList.remove("playing");$("ot").textContent=title;$("om").textContent=msg;$("st").textContent=stars;$("go").textContent=btn;$("ov").hidden=false;$("go").focus()}
function hit(msg){if(state!=="play")return;if(T<G.shield){if(T-(G.blk||-1e9)>300){G.blk=T;GameAudio.play("shield_block",{min:.2,rand:.08});const q=pos();VFX.add("ring",q[0],q[1],T,{c:"#7fd0ff"})}return}if(T<G.inv)return;G.hp--;G.inv=T+1600;shake=1;Snd.sfx("hit");VFX.flash("255,40,60",T);GameAudio.duck(.35);const p=G.p;fx("cloud",...pos());if(navigator.vibrate)navigator.vibrate(70);
 if(G.hp<=0){state="over";G.dead.add("spiderman");Snd.music(false);Snd.sfx("lose");ui();show("Out of health","You collected "+G.score+" of "+L.coins.length+" stars. Grab a shield before the blades and wait for the lasers to switch off.","","Try again");return}
 toast(msg);p.i=p.last[0];p.j=p.last[1];p.bi=p.i;p.bj=p.j;p.t=0}
function held(){return ctl.pad||ctl.ptr||ctl.key[ctl.key.length-1]||null}
function update(dt){if(state!=="play")return;T+=dt;G.t+=dt;const p=G.p,v=DIR[held()];
 if(v){let rem=SPEED*dt/3000,g=0;
  while(rem>1e-6&&g++<5){
   if(p.t===0){if(!nbrs(p.i,p.j).some(n=>n[0]===v[0]&&n[1]===v[1]))break;p.bi=p.i+v[0];p.bj=p.j+v[1];p.t=1e-7}
   const eu=[p.bi-p.i,p.bj-p.j];let d;
   if(eu[0]===v[0]&&eu[1]===v[1])d=1;else if(eu[0]===-v[0]&&eu[1]===-v[1])d=-1;
   else{const tn=p.t>=.5?[p.bi,p.bj]:[p.i,p.j];if(!nbrs(tn[0],tn[1]).some(n=>n[0]===v[0]&&n[1]===v[1]))break;d=p.t>=.5?1:-1}
   p.t+=d*rem;G.look=d>0?eu:[-eu[0],-eu[1]];
   if(p.t>=1){rem=p.t-1;p.last=[p.i,p.j];p.i=p.bi;p.j=p.bj;p.t=0}else if(p.t<=0){rem=-p.t;p.t=0;p.bi=p.i;p.bj=p.j}else rem=0}}
 const[px,py]=pos();
 L.saws.forEach((s,k)=>{const[x,y]=sawAt(s,k);if(near(x,y,1.05,px,py))hit("Sliced by a blade!")});
 L.wsaws.forEach(w=>{const[x,y]=wsPos(w);if(near(x,y,1.05,px,py))hit("Cut by a wall blade!")});
 L.enemies.forEach((s,k)=>{const[x,y]=sawAt(s,k+9);if(near(x,y,1.1,px,py))hit("Caught by an enemy!")});
 L.lasers.forEach((l,k)=>{if(!lOn(k))return;if(l[2]==="h"?Math.abs(py-l[1])<.8&&Math.abs(px-l[0])<1.6:Math.abs(px-l[0])<.8&&Math.abs(py-l[1])<1.6)hit("Laser zap!")});
 for(const c of G.coins)if(!c.got&&Math.hypot(c.x-px,c.y-py)<1.4){c.got=1;G.score++;GameAudio.coin();fx("spark",c.x,c.y);VFX.text(c.x,c.y,"+1"+(GameAudio.combo>1?" x"+GameAudio.combo:""),T)}
 for(const b of G.bub)if(!b.got&&Math.hypot(b.x-px,b.y-py)<1.4){b.got=1;fx("spark",b.x,b.y);Snd.sfx("heal");VFX.add("plus",b.x,b.y,T);if(G.hp<MAXHP){G.hp++;toast("Health +1")}else{G.score+=5;toast("Bonus +5 stars")}}
 for(const s of G.shields)if(!s.got&&Math.hypot(s.x-px,s.y-py)<1.4){s.got=1;fx("spark",s.x,s.y);Snd.sfx("shield");VFX.add("ring",s.x,s.y,T,{c:"#7fd0ff"});G.shield=T+8000;G.sh1=1;toast("Shield on for 8 seconds")}
 if(p.i===L.exit[0]&&p.j===L.exit[1]&&p.t===0){state="won";Snd.music(false);Snd.sfx("win");const r=G.score/L.coins.length;
  VFX.confetti(px,py,T);
  show("Level complete!",(G.t/1000).toFixed(1)+" seconds, "+G.score+" of "+L.coins.length+" stars, "+G.hp+" health left.",r>.85?"★★★":r>.55?"★★☆":"★☆☆",li<LV.length-1?"Next level":"Play again")}
 const mv=!!G.pp&&Math.hypot(px-G.pp[0],py-G.pp[1])>1e-3;G.pp=[px,py];
 if(mv&&T>(G.dt||0)){G.dt=T+130;const lk=G.look||[0,0];VFX.add("dust",px-lk[0]*.9,py-lk[1]*.9,T)}
 if(T<G.shield&&G.shield-T<2200&&T>=(G.nt||0)){G.nt=T+350;GameAudio.play("shield_tick",{vol:.6})}
 if(G.sh1&&T>=G.shield){G.sh1=0;GameAudio.play("shield_end")}
 if(state==="play")GameAudio.frame({px,py,moving:mv,hp:G.hp,saws:L.saws.map((s,k)=>sawAt(s,k)),wsaws:L.wsaws.map(w=>{const[x,y]=wsPos(w),u=(T+w[4])%4800;return[x,y,(u>=900&&u<2400)||u>=3300]}),lasers:L.lasers.map((l,k)=>[l[0],l[1],lOn(k)])});
 VFX.update(T);shake=Math.max(0,shake-dt/350);ui()}
function cam(dt){const[x,y]=pos(),k=1-Math.pow(.002,dt/1000),hw=cw/B/2,hh=ch/B/2,lk=G.look&&held()?G.look:[0,0];
 camX+=(x+lk[0]*1.4-camX)*k;camY+=(y+lk[1]*1.4-camY)*k;
 camX=hw*2>=W+2?W/2:clamp(camX,hw-1,W-hw+1);camY=hh*2>=H+2?H/2:clamp(camY,hh-1,H-hh+1)}
function draw(){
 const k=reduce?0:shake*B*.18,ox=(Math.random()-.5)*k,oy=(Math.random()-.5)*k,X=x=>(x-camX)*B+cw/2+ox,Y=y=>(y-camY)*B+ch/2+oy;
 const x0=Math.floor(camX-cw/B/2)-1,x1=Math.ceil(camX+cw/B/2)+1,y0=Math.floor(camY-ch/B/2)-1,y1=Math.ceil(camY+ch/B/2)+1,bs=Math.ceil(B)+1;
 ctx.fillStyle="#f6a21e";ctx.fillRect(0,0,cw,ch);
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)ctx.drawImage(floorT[hs(x,y)%8],Math.round(X(x)),Math.round(Y(y)),bs,bs);
 {const sx=Math.max(0,(x0+M)*SS),sy=Math.max(0,(y0+M)*SS),ex=Math.min(shadow.width,(x1+1+M)*SS),ey=Math.min(shadow.height,(y1+1+M)*SS);
  if(ex>sx&&ey>sy)ctx.drawImage(shadow,sx,sy,ex-sx,ey-sy,X(sx/SS-M),Y(sy/SS-M),(ex-sx)/SS*B,(ey-sy)/SS*B)}
 ctx.lineCap="round";
 L.lasers.forEach((l,k)=>{const on=lOn(k),w=lWarn(k);if(!on&&!(w&&Math.floor(T/60)%2))return;const hz=l[2]==="h",col=hz?"#ff163c":"#2f8cff",glow=hz?"#ff4872":"#6ec3ff",a=hz?[X(l[0]-2.2),Y(l[1])]:[X(l[0]),Y(l[1]-2.2)],b=hz?[X(l[0]+2.2),Y(l[1])]:[X(l[0]),Y(l[1]+2.2)];
  ctx.save();ctx.lineCap="round";const pl=on?(1+.18*Math.sin(T/45+k)):.4;
  ctx.shadowColor=on?col:"rgba(255,100,100,.35)";ctx.shadowBlur=on?B*.85*pl:B*.2;
  ctx.strokeStyle=on?col:"rgba(255,220,220,.3)";ctx.lineWidth=on?B*.28*pl:B*.05;ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();
  if(on){ctx.shadowBlur=B*.35;ctx.strokeStyle=glow;ctx.lineWidth=B*.14;ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();
   ctx.shadowBlur=0;ctx.strokeStyle="#fff";ctx.lineWidth=B*.065;ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();
   [a,b].forEach(([ex,ey])=>{ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(ex,ey,B*.08,0,7);ctx.fill();ctx.fillStyle=col;ctx.beginPath();ctx.arc(ex,ey,B*.045,0,7);ctx.fill()})}ctx.restore()});
 L.saws.forEach((s,k)=>{const[x,y]=sawAt(s,k),px=X(x),py=Y(y),D=sawS.width;ctx.fillStyle="rgba(0,0,0,.3)";ctx.beginPath();ctx.ellipse(px+B*.1,py+B*.18,B*1.15,B*1.05,0,0,7);ctx.fill();
  ctx.save();ctx.translate(px,py);ctx.rotate(T/650);ctx.drawImage(sawS,-D/2,-D/2);ctx.restore()});
 L.wsaws.forEach((w,k)=>{const[x,y]=wsPos(w),D=sawS.width;ctx.save();ctx.translate(X(x),Y(y));ctx.rotate(T/650*(k%2?-1:1));ctx.drawImage(sawS,-D/2,-D/2);ctx.restore()});
 L.enemies.forEach((s,k)=>{const[x,y]=sawAt(s,k+9),S=B*1.8;if(IM[s[4]])ctx.drawImage(IM[s[4]],X(x)-S/2,Y(y)-S/2,S,S)});
 for(const s of G.shields)if(!s.got){const r=B*.72;ctx.save();ctx.translate(X(s.x),Y(s.y)+Math.sin(T/280)*B*.07);ctx.shadowColor="rgba(80,180,255,.9)";ctx.shadowBlur=B*.4;
  ctx.beginPath();ctx.moveTo(0,-r*.95);ctx.bezierCurveTo(r*.55,-r*.85,r*.85,-r*.8,r*.85,-r*.5);ctx.bezierCurveTo(r*.85,r*.3,r*.45,r*.7,0,r*.98);ctx.bezierCurveTo(-r*.45,r*.7,-r*.85,r*.3,-r*.85,-r*.5);ctx.bezierCurveTo(-r*.85,-r*.8,-r*.55,-r*.85,0,-r*.95);ctx.closePath();
  const g=ctx.createLinearGradient(0,-r,0,r);g.addColorStop(0,"#7fd0ff");g.addColorStop(1,"#1b62d6");ctx.fillStyle=g;ctx.fill();ctx.shadowColor="transparent";ctx.strokeStyle="#fff";ctx.lineWidth=B*.07;ctx.stroke();
  ctx.fillStyle="rgba(255,255,255,.55)";ctx.beginPath();ctx.moveTo(-r*.5,-r*.55);ctx.lineTo(-r*.1,-r*.55);ctx.lineTo(-r*.1,r*.35);ctx.lineTo(-r*.5,-r*.1);ctx.fill();ctx.restore()}
 for(const c of G.coins)if(!c.got){const px=X(c.x),py=Y(c.y)+Math.sin(T/300+c.ph)*B*.05;ctx.save();ctx.translate(px,py);ctx.scale(Math.abs(Math.cos(T/420+c.ph))*.55+.45,1);
  ctx.lineJoin="round";star(ctx,0,0,B*.36);ctx.shadowColor="rgba(255,255,255,.95)";ctx.shadowBlur=B*.22;ctx.strokeStyle="#fffdf0";ctx.lineWidth=B*.15;ctx.stroke();ctx.shadowColor="transparent";ctx.strokeStyle="#ff8a00";ctx.lineWidth=B*.08;ctx.stroke();ctx.fillStyle="#ffe14d";ctx.fill();ctx.restore()}
 for(const b of G.bub)if(!b.got){const px=X(b.x),py=Y(b.y)+Math.sin(T/260)*B*.07,r=B*.72,g=ctx.createRadialGradient(px-r*.3,py-r*.35,r*.1,px,py,r);
  g.addColorStop(0,"rgba(190,255,250,.95)");g.addColorStop(.6,"rgba(40,200,210,.7)");g.addColorStop(1,"rgba(0,120,140,.9)");
  ctx.fillStyle=g;ctx.strokeStyle="rgba(255,255,255,.85)";ctx.lineWidth=B*.04;ctx.beginPath();ctx.arc(px,py,r,0,7);ctx.fill();ctx.stroke();
  ctx.fillStyle="rgba(255,255,255,.55)";ctx.beginPath();ctx.ellipse(px-r*.3,py-r*.45,r*.28,r*.14,-.5,0,7);ctx.fill();
  const a=r*.5,w=r*.2;ctx.lineJoin="round";ctx.lineWidth=B*.1;ctx.strokeStyle="#fff";ctx.fillStyle="#19b94a";ctx.beginPath();ctx.moveTo(px-w,py-a);ctx.lineTo(px+w,py-a);ctx.lineTo(px+w,py-w);ctx.lineTo(px+a,py-w);ctx.lineTo(px+a,py+w);ctx.lineTo(px+w,py+w);ctx.lineTo(px+w,py+a);ctx.lineTo(px-w,py+a);ctx.lineTo(px-w,py+w);ctx.lineTo(px-a,py+w);ctx.lineTo(px-a,py-w);ctx.lineTo(px-w,py-w);ctx.closePath();ctx.stroke();ctx.fill()}
 {const[ex,ey]=cen(...L.exit),px=X(ex),py=Y(ey),pl=.5+.5*Math.sin(T/260),g=ctx.createRadialGradient(px,py,B*.1,px,py,B*1.4);
  g.addColorStop(0,"rgba(190,255,240,.95)");g.addColorStop(.55,"rgba(20,200,170,"+(.55+.2*pl)+")");g.addColorStop(1,"rgba(20,200,170,0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(px,py,B*1.4,0,7);ctx.fill();
  ctx.strokeStyle="#eafff8";ctx.lineWidth=B*.08;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(px,py,B*(.35+i*.2),T/300+i*2,T/300+i*2+3.6);ctx.stroke()}}
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(solid(x,y))ctx.drawImage(wallT[hs(x,y)%4],Math.round(X(x)),Math.round(Y(y)),bs,bs);
 {const[x,y]=pos(),px=X(x),py=Y(y),S=B*1.88,sh=T<G.shield;
  ctx.save();ctx.fillStyle="rgba(8,4,0,.36)";ctx.beginPath();ctx.ellipse(px,py+S*.47,S*.44,S*.16,0,0,7);ctx.fill();ctx.restore();
  if(!(T<G.inv&&Math.floor(T/80)%2===0)){ctx.save();const br=B*.24;
   ctx.shadowColor=sh?"rgba(80,180,255,.95)":"rgba(0,0,0,.55)";ctx.shadowBlur=sh?B*.65:B*.25;ctx.shadowOffsetY=sh?0:B*.08;
   ctx.fillStyle="#08102d";rrect(ctx,px-S/2,py-S/2,S,S,br);ctx.fill();
   ctx.save();rrect(ctx,px-S/2+2,py-S/2+2,S-4,S-4,br*.9);ctx.clip();
   if(spider.complete)ctx.drawImage(spider,px-S/2,py-S/2,S,S);ctx.restore();
   ctx.strokeStyle=sh?"#6bd4ff":"#ffd23f";ctx.lineWidth=Math.max(2,B*.055);rrect(ctx,px-S/2,py-S/2,S,S,br);ctx.stroke();ctx.restore();
   if(sh){ctx.strokeStyle="rgba(120,210,255,"+(.6+.35*Math.sin(T/120))+")";ctx.lineWidth=B*.11;rrect(ctx,px-S/2-B*.07,py-S/2-B*.07,S+B*.14,S+B*.14,br*1.2);ctx.stroke()}}
  const bw=S*.96,bh=B*.2,bx=px-bw/2,by=py-S/2-bh-B*.12,f=G.hp/MAXHP;
  ctx.fillStyle="#fff";ctx.strokeStyle="#0a1536";ctx.lineWidth=B*.045;rrect(ctx,bx,by,bw,bh,bh/2);ctx.fill();ctx.stroke();
  ctx.save();rrect(ctx,bx,by,bw,bh,bh/2);ctx.clip();ctx.fillStyle=f>.6?"#2fd150":f>.3?"#ffd21f":"#ff3b3b";ctx.fillRect(bx,by,bw*f,bh);ctx.fillStyle="rgba(255,255,255,.35)";ctx.fillRect(bx,by,bw*f,bh*.35);ctx.restore();
  if(sh){const sf=(G.shield-T)/8000;ctx.fillStyle="rgba(10,21,54,.8)";rrect(ctx,bx,by-bh*.75,bw,bh*.5,bh*.25);ctx.fill();ctx.fillStyle="#58b8ff";rrect(ctx,bx,by-bh*.75,bw*sf,bh*.5,bh*.25);ctx.fill()}}
 VFX.draw(ctx,{X,Y,B,T,cloud:cloudS,cw,ch,lowhp:G.hp===1&&state==="play"});
 drawMini();
 {const[ex,ey]=cen(...L.exit),px=X(ex),py=Y(ey),m=B*.6;
  if(px<0||px>cw||py<0||py>ch){const a=Math.atan2(py-ch/2,px-cw/2);ctx.save();ctx.translate(clamp(px,m,cw-m),clamp(py,m,ch-m));ctx.rotate(a);ctx.fillStyle="#2bd9a4";ctx.strokeStyle="#053";ctx.lineWidth=B*.05;
   ctx.beginPath();ctx.moveTo(B*.42,0);ctx.lineTo(-B*.28,-B*.3);ctx.lineTo(-B*.1,0);ctx.lineTo(-B*.28,B*.3);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore()}}
}
function loop(now){const dt=Math.min(50,now-(last||now));last=now;if(G&&cw){update(dt);cam(dt);draw()}requestAnimationFrame(loop)}
const ctl={key:[],ptr:null,pad:null},KM={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right",w:"up",s:"down",a:"left",d:"right"},km=e=>KM[e.key.length>1?e.key:e.key.toLowerCase()];
addEventListener("keydown",e=>{const m=km(e);if(!m)return;e.preventDefault();if(!ctl.key.includes(m))ctl.key.push(m)});
addEventListener("keyup",e=>{const m=km(e);if(m)ctl.key=ctl.key.filter(k=>k!==m)});
addEventListener("blur",()=>{ctl.key=[];ctl.ptr=ctl.pad=null});
let ox0=0,oy0=0,pid=null;
cv.addEventListener("pointerdown",e=>{ox0=e.clientX;oy0=e.clientY;pid=e.pointerId;cv.setPointerCapture(pid)});
cv.addEventListener("pointermove",e=>{if(e.pointerId!==pid)return;const dx=e.clientX-ox0,dy=e.clientY-oy0;ctl.ptr=Math.max(Math.abs(dx),Math.abs(dy))<14?null:Math.abs(dx)>Math.abs(dy)?dx>0?"right":"left":dy>0?"down":"up"});
const endP=e=>{if(e.pointerId===pid){pid=null;ctl.ptr=null}};cv.addEventListener("pointerup",endP);cv.addEventListener("pointercancel",endP);
[["u","up"],["l","left"],["d","down"],["r","right"]].forEach(([i,d])=>{const b=$(i),up=()=>{if(ctl.pad===d)ctl.pad=null};b.addEventListener("pointerdown",e=>{e.preventDefault();ctl.pad=d;b.setPointerCapture(e.pointerId)});b.addEventListener("pointerup",up);b.addEventListener("pointercancel",up);b.addEventListener("lostpointercapture",up)});
const run=()=>{$("frame").classList.add("playing");$("ov").hidden=true;state="play";GameAudio.begin().then(()=>{GameAudio.play("start");if(state==="play")GameAudio.musicStart()})};
$("go").addEventListener("click",()=>{if(state==="won"&&li<LV.length-1)loadLevel(li+1);else newGame();run()});$("rs").addEventListener("click",()=>{newGame();run()});$("sd").addEventListener("click",()=>Snd.toggle());
$("mn").addEventListener("click",()=>{state="ready";Snd.music(false);show("Spider Maze","Choose a screen shape, then press Play.","","Play")});
document.querySelectorAll('input[name="ra"]').forEach(r=>r.addEventListener("change",()=>{ratio=r.value;resize()}));
document.addEventListener("visibilitychange",()=>{last=0});
document.querySelector('input[value="'+ratio+'"]').checked=true;loadLevel(0);sdIcon();addEventListener("resize",()=>{clearTimeout(resize.t);resize.t=setTimeout(resize,120)});
if(document.fonts)document.fonts.load('20px "Lilita One"');
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("button");if(b&&b.id!=="sd")GameAudio.play("click",{vol:.6})},true);
requestAnimationFrame(loop);
