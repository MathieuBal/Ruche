'use strict';
// An illustrative section through three comb faces. Cell proportions follow the colony.
const hiveSection={plate:null,key:'',cells:[]};
function hiveHex(ctx,x,y,r) {
  ctx.beginPath();
  for(let k=0;k<6;k++) {
    const angle=(k+.5)*Math.PI/3;
    const px=x+r*Math.cos(angle),py=y+r*Math.sin(angle);
    if(k===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
  }
  ctx.closePath();
}
function buildHiveSection(sim) {
  const plate=document.createElement('canvas');plate.width=plate.height=1000;
  const ctx=plate.getContext('2d');
  const wood=ctx.createLinearGradient(0,0,1000,900);
  wood.addColorStop(0,'#9e7548');wood.addColorStop(.5,'#59402a');wood.addColorStop(1,'#b48751');
  ctx.fillStyle=wood;ctx.fillRect(0,0,1000,1000);
  for(let i=0;i<150;i++) {
    ctx.strokeStyle=i%2?'#d5ad6e22':'#26170f33';ctx.lineWidth=1+noise(i)*2;
    ctx.beginPath();ctx.moveTo(0,i*7);ctx.bezierCurveTo(240,i*7+5,680,i*7-6,1000,i*7);ctx.stroke();
  }
  hiveSection.cells=[];
  for(let frame=0;frame<3;frame++) {
    const left=61+frame*298;
    ctx.fillStyle='#24190f';ctx.fillRect(left-8,95,286,806);
    ctx.fillStyle='#bd8d50';ctx.fillRect(left,106,270,778);
    ctx.fillStyle='#4d2a15';ctx.fillRect(left+12,132,246,722);
    ctx.fillStyle='#dfb676';ctx.fillRect(left-6,106,282,18);
    for(let row=0;row<36;row++)for(let col=0;col<12;col++) {
      const x=left+21+col*20+(row%2)*10,y=148+row*19.5;
      if(x>left+249)continue;
      const rank=noise(frame*1500+row*19+col),radius=Math.hypot((x-left-135)/130,(y-535)/230);
      let type='empty';
      if(y<330 && rank<Math.min(.98,sim.honey/35))type='honey';
      else if(radius<1 && rank<Math.min(.95,sim.brood/32000)) {
        const stage=noise(frame*701+row*29+col+11)*Math.max(1,sim.brood);
        type=stage<sim.eggs?'egg':stage<sim.eggs+sim.larvae?'larva':'sealed';
      } else if(y>=330 && y<405 && rank<sim.pollen/6)type='pollen';
      const colors={empty:'#57331c',honey:'#d9a13d',pollen:'#a87931',egg:'#623e23',larva:'#70472a',sealed:'#b78147'};
      hiveHex(ctx,x,y,11.6);ctx.fillStyle=colors[type];ctx.fill();ctx.strokeStyle='#d3a55e';ctx.lineWidth=1.2;ctx.stroke();
      if(type==='egg')ellipse(ctx,x,y,1.3,3,'#fff0c8',.2);
      if(type==='larva') {ctx.strokeStyle='#f4d9a0';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,4,.1,5.3);ctx.stroke();}
      if(type==='honey')ellipse(ctx,x-2,y-3,5,2,'#ffe6a65e',-.3);
      if(type==='sealed')ellipse(ctx,x-2,y-2,7,4,'#e7bc7733',-.3);
      hiveSection.cells.push({x,y,type});
    }
    ctx.fillStyle='#d7ae71';ctx.fillRect(left,863,270,15);
    for(const x of [left+8,left+260])ellipse(ctx,x,116,3,3,'#5a482f');
  }
  ctx.fillStyle='#201a12';ctx.fillRect(435,931,130,16);
  ctx.fillStyle='#ba945e';ctx.fillRect(425,947,150,8);
  hiveSection.plate=plate;
}
function paintHive(ctx,sim,time) {
  const key=[Math.floor(sim.day),sim.population,sim.honey,sim.brood].join('|');
  if(hiveSection.key!==key) {buildHiveSection(sim);hiveSection.key=key;}
  ctx.drawImage(hiveSection.plate,0,0,1000,1000);
  const count=Math.min(150,Math.ceil(sim.population/230));
  const winter=sim.season==='Hiver';
  for(let i=0;i<count;i++) {
    const frame=i%3,left=61+frame*298;
    const nurse=i%3!==0;
    const cycle=time*(.07+.025*noise(i+6))+noise(i+81)*6;
    const progress=(1-Math.cos(cycle))* .5;
    const spread=winter?.52:1;
    const x=left+135+spread*((noise(i+34)-.5)*190+Math.sin(cycle*.8+i)*15);
    const y=nurse?535+spread*((noise(i+40)-.5)*310+Math.sin(cycle+i)*20):260+progress*560;
    const angle=nurse?Math.atan2(Math.cos(cycle+i)*20,Math.cos(cycle*.8+i)*12):Math.sin(cycle)>=0?Math.PI/2:-Math.PI/2;
    bee(x,y,angle,3.2,false,i,!nurse&&progress>.65&&sim.pollen>0);
  }
  // The queen is a visual guide to the brood area; her status remains model-driven.
  if(sim.queenStatus!=='Cellule royale') {
    const x=495+Math.sin(time*.11)*53,y=530+Math.cos(time*.09)*65;
    bee(x,y,Math.atan2(-5.85*Math.sin(time*.09),5.83*Math.cos(time*.11)),4.6,false,999);
    ellipse(ctx,x,y,2.8,2.8,'#ece2ad');
  }
  const shade=ctx.createRadialGradient(500,480,220,500,500,640);
  shade.addColorStop(0,'rgba(28,16,6,0)');shade.addColorStop(1,'rgba(28,16,6,.42)');
  ctx.fillStyle=shade;ctx.fillRect(0,0,1000,1000);
}
