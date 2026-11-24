'use strict';
const sim = new HiveSim();
sim.step(9/24);
const $ = id => document.getElementById(id);
const scene=$('scene'), canvas=scene.querySelector('canvas'), ctx=canvas.getContext('2d');
const format=new Intl.NumberFormat('fr-FR'), dec=new Intl.NumberFormat('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1});
let inside=false, paused=matchMedia("(prefers-reduced-motion: reduce)").matches, speed=1, elapsed=0, last=0, lastUpdate=-1, lastRender=-Infinity;
const rows=[['Ouvrières','population'],['Butineuses en vol','foragers'],['Miel','honey'],['Couvain','brood'],['Œufs','eggs'],['Larves','larvae'],['Cellules operculées','sealed'],['Pollen','pollen'],['Température du couvain','temp'],['Reine','queenStatus'],['Rayons construits','comb'],['Collecte de pollen','pollenForagers'],['Collecte de nectar','nectarForagers']];
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
    dd.textContent=key==='comb'?Math.round(sim.comb*100)+' %':key==='temp'?dec.format(sim.temp)+' °C':key==='honey'||key==='pollen'?dec.format(sim[key])+' kg':key==='queenStatus'?sim[key]:format.format(['foragers','pollenForagers','nectarForagers'].includes(key)?Math.round(sim[key]*sky.flight):sim[key]);
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
const flights=new GardenFlights(noise);
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
function draw(){
  const dim=canvas.width; ctx.setTransform(dim/1000,0,0,dim/1000,0,0);ctx.clearRect(0,0,1000,1000);
  if(!inside){
    const sky=gardenSky(sim);
    paintGarden(ctx,sim,sky,elapsed);
    for(const agent of flights.agents){
      bee(agent.x*1000,agent.y*1000,agent.angle,1.5,agent.state!=='flower',agent.id,agent.pollen);
    }
    paintGardenForeground(ctx,sim,sky,elapsed);
    return;
  }
  paintHive(ctx,sim,elapsed);
}

function frame(ms){
  const dt=Math.min(1,Math.max(0,(ms-(last||ms))/1000));last=ms;
  if(!paused&&!modal.open&&!document.hidden){// Each observed day lasts 24 seconds at normal speed. At midnight the
    // model processes the intervening days before the next observation.
    const advance=dt*speed/24;
    const midnights=Math.floor(sim.day%1+advance);
    sim.step(advance+(sim.day<30?2:13)*midnights);
    elapsed+=dt;
    const sky=gardenSky(sim);
    flights.step(dt,sim.foragers*sky.flight/45,sim.pollenForagers/Math.max(1,sim.foragers),roll=>chooseBed(sim.flowers,roll));
  }
  if(lastUpdate!==Math.floor(sim.day*240)){lastUpdate=Math.floor(sim.day*240);update();}
  if(ms-lastRender>=1000/30){draw();lastRender=ms;}
  requestAnimationFrame(frame);
}
if(paused){$('pause').textContent='▶';$('pause').setAttribute('aria-label','Reprendre');}
new ResizeObserver(resize).observe(scene);update();resize();requestAnimationFrame(frame);
