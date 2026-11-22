'use strict';
const sim = new HiveSim();
sim.step(9/24);
const $ = id => document.getElementById(id);
const scene=$('scene'), canvas=scene.querySelector('canvas'), ctx=canvas.getContext('2d');
const format=new Intl.NumberFormat('fr-FR'), dec=new Intl.NumberFormat('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1});
let inside=false, paused=matchMedia("(prefers-reduced-motion: reduce)").matches, speed=1, elapsed=0, last=0, lastUpdate=-1;
const rows=[['Ouvrières','population'],['Butineuses en vol','foragers'],['Miel','honey'],['Couvain','brood'],['Œufs','eggs'],['Larves','larvae'],['Cellules operculées','sealed'],['Pollen','pollen'],['Température du couvain','temp'],['Reine','queenStatus'],['Collecte de pollen','pollenForagers'],['Collecte de nectar','nectarForagers']];
for(const [label,key] of rows){
  const div=document.createElement('div'), dt=document.createElement('dt'), dd=document.createElement('dd');
  dt.textContent=label; dd.id='stat-'+key;div.append(dt,dd);$('stats').append(div);
}
function update(){
  const sky=gardenSky(sim);
  for(let i=0;i<rows.length;i++){
    const key=rows[i][1], dd=$('stat-'+key);
    dd.parentNode.hidden=!inside && i>=4;
    dd.parentNode.style.display=dd.parentNode.hidden?'none':'';
    dd.textContent=key==='temp'?dec.format(sim.temp)+' °C':key==='honey'||key==='pollen'?dec.format(sim[key])+' kg':key==='queenStatus'?sim[key]:format.format(['foragers','pollenForagers','nectarForagers'].includes(key)?Math.round(sim[key]*sky.flight):sim[key]);
  }
  $('event').textContent=sim.event;
  $('season').textContent=sim.season;
  $('date').textContent=sim.date+' · '+String(Math.floor(sky.hour)).padStart(2,'0')+' h '+String(Math.floor(sky.hour*60)%60).padStart(2,'0')+' · '+sim.weather;
}
function setView(value){
  inside=value;scene.classList.toggle('inside',inside);
  document.querySelector('h1').textContent=inside?'La ruche':'Le jardin';
  $('combKey').hidden=!inside; $('visit').hidden=inside;$('back').hidden=!inside;
  (inside?$('back'):$('visit')).focus({preventScroll:true});
  update(); draw();
}
$('visit').onclick=()=>setView(true);$('back').onclick=()=>setView(false);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&inside&&!document.querySelector('dialog').open)setView(false)});
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'▶':'Ⅱ';$('pause').setAttribute('aria-label',paused?'Reprendre':'Mettre en pause')};
document.querySelectorAll('[data-speed]').forEach(btn=>btn.onclick=()=>{speed=Number(btn.dataset.speed);document.querySelectorAll('[data-speed]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)))});
const modal=document.querySelector('dialog');$('sources').onclick=()=>modal.showModal();$('close').onclick=()=>modal.close();
function resize(){
  const size=Math.max(1,Math.round(scene.clientWidth*Math.min(devicePixelRatio||1,2))); canvas.width=canvas.height=size;draw();
}
const flowers=[[.13,.12],[.31,.075],[.77,.18],[.85,.28],[.11,.89],[.085,.74],[.88,.78],[.89,.91],[.09,.40],[.62,.94]];
function noise(k){const v=Math.sin(k*127.1+311.7)*43758.5453;return v-Math.floor(v)}
function bee(x,y,angle,s,flight,id,pellets=false){
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(s,s);
  ctx.fillStyle='rgba(31,25,11,.24)';ctx.beginPath();ctx.ellipse(1.6,1.7,3,1.1,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#452d17';ctx.beginPath();ctx.ellipse(0,0,2.9,1.25,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#d6a347';ctx.fillRect(-1.55,-.92,.8,1.84);ctx.fillRect(-.28,-1.1,.8,2.2);
  ctx.fillStyle=flight?'rgba(255,252,231,.78)':'rgba(226,218,184,.68)';
  for(const side of [-1,1]){ctx.beginPath();ctx.ellipse(-.25,side*(flight?1.24:.65),1.75,.78,side*(flight?.6+.22*Math.sin(elapsed*26+id):.27),0,Math.PI*2);ctx.fill();}
  if(pellets){
    ctx.fillStyle='#ffc33f';
    for(const side of [-1,1]){ctx.beginPath();ctx.arc(-1.35,side*1.38,1,0,Math.PI*2);ctx.fill();}
  }
  ctx.restore();
}
function flight(i,t){
  const target=flowers[i%flowers.length],phase=(t*(.065+.05*noise(i+2))+noise(i+27))%1;
  const perched=phase>=.4 && phase<.6, returning=phase>=.6;
  const u=returning?(1-phase)/.4:Math.min(1,phase/.4), dir=returning?-1:1;
  const ex=.501,ey=.582,tx=target[0]+.04*(noise(i+6)-.5),ty=target[1]+.04*(noise(i+15)-.5);
  const dx=tx-ex,dy=ty-ey,bend=.22*(noise(i+10)-.5)*Math.sin(u*Math.PI);
  const flutter=.005*Math.sin(13*u+i)*Math.sin(Math.PI*u);
  return [ex+u*dx+dy*bend+flutter,ey+u*dy-dx*bend+flutter,Math.atan2(dy*dir,dx*dir),perched,returning];
}
// Sample a patch of the brood comb. Each cell keeps its rank between model updates.
const cellPatch=[];
for(let row=-4; row<=4; row++)for(let col=-6; col<=6; col++){
  if((col/6.5)**2+(row/4.7)**2>1)continue;
  const index=cellPatch.length;
  cellPatch.push({x:505+12.1*(col+(row%2)/2),y:542+row*10.5,rank:noise(index+54)});
}
function drawBrood(){
  const occupancy=Math.min(.98,sim.brood/15000);
  const eggs=occupancy*sim.eggs/Math.max(1,sim.brood);
  const larvae=occupancy*sim.larvae/Math.max(1,sim.brood);
  for(const {x,y,rank} of cellPatch){
    const cap=rank>=eggs+larvae && rank<occupancy;
    ctx.fillStyle=cap?'#b4773ded':'#6a391adf';ctx.strokeStyle='#d79745';ctx.lineWidth=.85;
    ctx.beginPath();
    for(let k=0;k<6;k++){const a=(k+.5)*Math.PI/3;
      const px=x+6.8*Math.cos(a),py=y+6.8*Math.sin(a);
      if(k===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
    }
    ctx.closePath();ctx.fill();ctx.stroke();
    if(rank<eggs){ctx.fillStyle='#fff2c9';ctx.beginPath();ctx.ellipse(x,y,.85,2.15,rank*8,0,Math.PI*2);ctx.fill();}
    else if(rank<eggs+larvae){ctx.strokeStyle='#f2dda0';ctx.lineWidth=2.2;ctx.beginPath();ctx.arc(x,y,2.45,.3,5.4);ctx.stroke();}
    else if(cap){ctx.fillStyle='#e8bd7d88';ctx.beginPath();ctx.ellipse(x-1,y-1.7,3.5,1.7,-.15,0,Math.PI*2);ctx.fill();}
  }
}
function draw(){
  const dim=canvas.width; ctx.setTransform(dim/1000,0,0,dim/1000,0,0);ctx.clearRect(0,0,1000,1000);
  if(!inside){
    const sky=gardenSky(sim);
    paintGarden(ctx,sim,sky,elapsed);
    const n=Math.min(150,Math.ceil(sim.foragers*sky.flight/45));
    for(let i=0;i<n;i++){
      const [x,y,a,perched,returning]=flight(i,elapsed);
      const pollen=returning && noise(i+73)<sim.pollenForagers/Math.max(1,sim.foragers);
      bee(x*1000,y*1000,a,1.5,!perched,i,pollen);
    }
    if(sim.rain){
      ctx.fillStyle='rgba(22,43,58,.18)';ctx.fillRect(0,0,1000,1000);
      ctx.strokeStyle='rgba(218,231,236,.42)';ctx.lineWidth=1.3;ctx.beginPath();
      for(let i=0;i<65;i++){
        const y=(noise(i+7)*1000+elapsed*330)%1020-10;
        const x=(noise(i+50)*1000+.17*y+1000)%1000;
        ctx.moveTo(x,y);ctx.lineTo(x+2,y+11);
      }
      ctx.stroke();
    }
    return;
  }
  drawBrood();
  const n=Math.min(110,Math.ceil(Math.max(0,sim.population-sim.foragers*gardenSky(sim).flight)/245));
  for(let i=0;i<n;i++){
    const theta=2*Math.PI*noise(i+32),r=Math.sqrt(noise(i+15));
    const spread=sim.season==='Hiver'?.62:1;
    const phase=elapsed*(.18+.11*noise(i+24))+12*noise(i+8);
    const x=.505+spread*.313*r*Math.cos(theta)+.010*Math.sin(phase),y=.514+spread*.258*r*Math.sin(theta)+.012*Math.cos(phase*1.2);
    bee(x*1000,y*1000,Math.atan2(-1.44*Math.sin(phase*1.2),Math.cos(phase)),2.3,false,i);
  }
}
function frame(ms){
  const dt=Math.min(.12,Math.max(0,(ms-(last||ms))/1000));last=ms;
  if(!paused&&!modal.open&&!document.hidden){sim.step(dt*speed/120);elapsed+=dt*Math.min(4,Math.sqrt(speed));}
  if(lastUpdate!==Math.floor(sim.day*1440)){lastUpdate=Math.floor(sim.day*1440);update();}
  draw();requestAnimationFrame(frame);
}
if(paused){$('pause').textContent='▶';$('pause').setAttribute('aria-label','Reprendre');}
new ResizeObserver(resize).observe(scene);update();resize();requestAnimationFrame(frame);
