// Jardin tempéré fictif. La pluie du jour alimente le sol, qui sèche davantage par temps chaud.
function gardenSky(sim){
  const hour=(sim.day%1)*24;
  const length=12+3.4*Math.sin((sim._yearDay-80)*2*Math.PI/365);
  const sun=Math.sin(Math.PI*(hour-12+length/2)/length);
  const light=Math.min(1,Math.max(0,(sun+.16)*3.1));
  const breeze=.42+.22*Math.sin(sim.day*3.1)+.29*Number(sim.rain);
  return {hour,light,sun,breeze,flight:Math.min(1,Math.max(0,sun*2.6))};
}

function paintGarden(ctx,sim,sky,t){
  const wash=(color)=>{ctx.fillStyle=color;ctx.fillRect(0,0,1000,1000);};
  const wave=Math.sin(t*.38), strength=sky.breeze;
  // Move small islands of existing foliage together, with feathered edges.
  if(foliage.length){
    for(const patch of foliage){
      const sway=Math.sin(t*.75+patch.phase)+.4*wave;
      ctx.drawImage(patch.image,patch.x+sway*strength*4,patch.y+sway*strength*2,patch.size,patch.size);
    }
  }
  wash('rgba(157,87,29,'+(.22*sim.autumnColor)+')');
  wash('rgba(178,191,187,'+(.22*sim.winterColor**3)+')');
  paintBeds(ctx,sim,sky,t);
  const dusk=Math.max(0,1-Math.abs(sky.sun-.10)*3)*sky.light;
  const glow=ctx.createLinearGradient(sky.hour<12?0:1000,0,sky.hour<12?1000:0,600);
  glow.addColorStop(0,'rgba(255,170,78,'+dusk*.52+')');glow.addColorStop(1,'rgba(255,188,122,0)');
  ctx.fillStyle=glow;ctx.fillRect(0,0,1000,1000);
  const cloudX=(t*9)%1800-400;
  const cloud=ctx.createRadialGradient(cloudX,365+85*wave,20,cloudX,365+85*wave,440);
  cloud.addColorStop(0,'rgba(30,48,67,'+(sim.rain?.21:.11)*sky.light+')');cloud.addColorStop(1,'rgba(30,48,67,0)');
  ctx.fillStyle=cloud;ctx.fillRect(0,0,1000,1000);
  wash('rgba(9,23,52,'+(.77*(1-sky.light))+')');
  if(sim.rain)wash('rgba(40,66,82,.16)');
  const wet=sim.moisture;
  for(const [x,y,r] of [[330,735,23],[610,860,17],[690,665,13]]){
    ctx.fillStyle='rgba(155,191,201,'+(Math.max(0,wet-.52)*.58)+')';
    ctx.beginPath();ctx.ellipse(x,y,r,r*.36,-.22,0,Math.PI*2);ctx.fill();
    if(sim.rain){
      const p=(t*.76+x*.17)%1;ctx.strokeStyle='rgba(224,239,240,'+(.42*(1-p))+')';
      ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(x,y,1+p*r,1+p*r*.35,-.22,0,Math.PI*2);ctx.stroke();
    }
  }
  if(sky.light<.4 && !sim.rain && sim.air>12){
    // Small moths stay near the borders and hover around the flower beds.
    for(let i=0;i<4;i++){
      const x=(i%2?840:140)+58*Math.sin(t*.41+i*2)+12*Math.sin(t*1.9+i);
      const y=180+185*i+28*Math.cos(t*.51+i*3);
      ctx.fillStyle='rgba(231,220,188,'+(.65*(1-sky.light/.4))+')';
      const span=1+2.1*Math.abs(Math.sin(t*9+i));
      for(const side of [-1,1]){
        ctx.beginPath();ctx.ellipse(x+side*span*.65,y,span,1.5,side*.6,0,Math.PI*2);ctx.fill();
      }
    }
  }
  if(!sim.rain && sim.season==='Automne'){
    for(let i=0;i<9;i++){
      const x=(i*143+t*(7+i%3))%1040-20,y=(i*83+t*9+12*Math.sin(t+i))%1030-15;
      ctx.fillStyle=i%2?'#ad753abf':'#ce9359b0';ctx.beginPath();ctx.ellipse(x,y,3.8,1.6,.5*Math.sin(t+i),0,Math.PI*2);ctx.fill();
    }
  }
}
const foliage=[];
const gardenImage=new Image();
gardenImage.onload=()=>{
  for(const [cx,cy,size] of [[100,135,175],[860,210,178],[102,822,164],[875,870,185],[275,72,105]]){
    const image=document.createElement('canvas');image.width=image.height=160;
    const g=image.getContext('2d'),x=cx-size/2,y=cy-size/2,k=gardenImage.naturalWidth/1000;
    g.drawImage(gardenImage,x*k,y*k,size*k,size*k,0,0,160,160);
    g.globalCompositeOperation='destination-in';
    const mask=g.createRadialGradient(80,80,37,80,80,79);
    mask.addColorStop(0,'#000');mask.addColorStop(1,'transparent');g.fillStyle=mask;g.fillRect(0,0,160,160);
    foliage.push({image,x,y,size,phase:cx*.16});
  }
};
gardenImage.src='garden.webp';

// Fixed garden beds. Their three flowering periods use the same curves as forage availability.
const beds=[
  {x:.13,y:.12,group:0},{x:.31,y:.075,group:0},{x:.77,y:.18,group:1},
  {x:.85,y:.28,group:2},{x:.11,y:.89,group:2},{x:.085,y:.74,group:1},
  {x:.88,y:.78,group:1},{x:.89,y:.91,group:0},{x:.09,y:.40,group:0},{x:.62,y:.94,group:2}
];
const bedCounts=[4,3,3];
function chooseBed(flowers,roll){
  const total=flowers.reduce((a,b)=>a+b,0);
  let budget=roll*total;
  for(const bed of beds){
    budget-=flowers[bed.group]/bedCounts[bed.group];
    if(budget<=0)return bed;
  }
  return beds[beds.length-1];
}
const sprites=new Map();
function blossom(group){
  if(sprites.has(group))return sprites.get(group);
  const tile=document.createElement('canvas');tile.width=tile.height=32;
  const g=tile.getContext('2d');g.translate(16,16);
  const petals=['#f4d8dd','#bea4dc','#f3c65b'];
  for(let j=0;j<6;j++){
    g.rotate(Math.PI/3);g.fillStyle=petals[group];g.beginPath();g.ellipse(0,-6,3.2,6,.12,0,Math.PI*2);g.fill();
  }
  g.fillStyle='#aa7427';g.beginPath();g.arc(0,0,3.5,0,Math.PI*2);g.fill();
  sprites.set(group,tile);return tile;
}
function paintBeds(ctx,sim,sky,t){
  const frost=Math.min(1,Math.max(0,(7-sim.air)/5))*sim.moisture*(1-sky.light*.8);
  for(const [index,bed] of beds.entries()){
    const bloom=sim.flowers[bed.group]/[.65,.88,.45][bed.group];
    for(let j=0;j<21;j++){
      const k=index*31+j,angle=noise(k+3)*Math.PI*2,r=29*Math.sqrt(noise(k+64));
      const x=bed.x*1000+r*Math.cos(angle),y=bed.y*1000+r*Math.sin(angle);
      const sway=1.8*sky.breeze*Math.sin(t*1.2+index+j*.16);
      const size=Math.max(0,Math.min(1,(bloom-noise(k+161)*.76)*3))*(6+5*noise(k+25));
      if(size>1)ctx.drawImage(blossom(bed.group),x+sway-size/2,y-size/2,size,size);
      if(frost>.03){
        ctx.fillStyle='rgba(231,241,240,'+(frost*.55)+')';
        ctx.fillRect(x,y,2.4,1.4);
      }
    }
  }
}
