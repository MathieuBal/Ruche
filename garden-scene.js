'use strict';

// All positions use a 1000 × 1000 garden. The colony and its foraging beds share this map.
const gardenRandom = seed => {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
};
const beds = [
  {x:.15,y:.24,group:0}, {x:.32,y:.17,group:0},
  {x:.79,y:.24,group:1}, {x:.87,y:.41,group:2},
  {x:.15,y:.82,group:2}, {x:.11,y:.57,group:1},
  {x:.87,y:.86,group:1}, {x:.72,y:.91,group:0},
  {x:.15,y:.40,group:0}, {x:.35,y:.89,group:2}
];
const bedCounts = [4,3,3];
function chooseBed(flowers, roll) {
  let budget = roll * flowers.reduce((a,b) => a+b, 0);
  for (const bed of beds) {
    budget -= flowers[bed.group] / bedCounts[bed.group];
    if (budget <= 0) return bed;
  }
  return beds[beds.length-1];
}
function gardenSky(sim) {
  const hour = (sim.day % 1) * 24;
  const length = 12 + 3.4 * Math.sin((sim._yearDay-80)*2*Math.PI/365);
  const sun = Math.sin(Math.PI*(hour-12+length/2)/length);
  const light = Math.min(1,Math.max(0,(sun+.16)*3.1));
  const breeze = .45 + .22*Math.sin(sim.day*3.1) + .4*Number(sim.rain);
  return {hour,light,sun,breeze,flight:Math.min(1,Math.max(0,sun*2.6))};
}
function gardenWind(x,y,time,strength) {
  // A broad gust travels across the whole garden, with smaller local flutter.
  return strength * (Math.sin(time*.9-x*.007+y*.003)
    + .38*Math.sin(time*1.9-x*.012) + .17*Math.sin(time*3.6+y*.016));
}
const garden = {
  ground:null, atlas:null, sprites:[], plants:[], grass:[], trees:[], stones:[],
  autumn:0, winter:0, wet:.65, rain:0, bloom:[.6,.2,.01], lastTime:null
};
const atlasImage = new Image();
atlasImage.onload = () => {
  const tile = atlasImage.naturalWidth/2;
  for (let i=0;i<4;i++) {
    const variants = [];
    for (const filter of ['none','sepia(.72) saturate(1.2) hue-rotate(345deg)','grayscale(.7) brightness(.78)']) {
      const canvas = document.createElement('canvas');
      canvas.width=canvas.height=320;
      const brush=canvas.getContext('2d');
      brush.filter=filter;
      brush.drawImage(atlasImage,(i%2)*tile,Math.floor(i/2)*tile,tile,tile,0,0,320,320);
      variants.push(canvas);
    }
    garden.sprites.push(variants);
  }
  garden.atlas=atlasImage;
};
atlasImage.src='assets/garden-atlas.webp';
const meadowImage=new Image();
let meadowReady=false;
meadowImage.onload=()=>{meadowReady=true;garden.ground=null;};
meadowImage.src='assets/meadow.webp';

function ellipse(ctx,x,y,rx,ry,color,angle=0) {
  ctx.fillStyle=color;
  ctx.beginPath();ctx.ellipse(x,y,rx,ry,angle,0,Math.PI*2);ctx.fill();
}
function gardenPath(ctx) {
  ctx.beginPath();ctx.moveTo(420,1050);
  ctx.bezierCurveTo(570,880,323,760,424,630);
  ctx.bezierCurveTo(467,569,611,604,647,455);
  ctx.bezierCurveTo(694,279,693,154,818,-30);
}
function pondOutline(ctx) {
  ctx.beginPath();ctx.moveTo(674,635);
  ctx.bezierCurveTo(696,583,817,587,847,643);
  ctx.bezierCurveTo(881,705,821,771,755,754);
  ctx.bezierCurveTo(687,750,646,694,674,635);ctx.closePath();
}
function createGarden() {
  garden.plants.length=0;garden.grass.length=0;garden.trees.length=0;garden.stones.length=0;
  const ground=document.createElement('canvas');
  ground.width=ground.height=1000;
  const ctx=ground.getContext('2d');
  const lawn=ctx.createRadialGradient(470,480,80,500,500,720);
  lawn.addColorStop(0,'#73834c');lawn.addColorStop(.65,'#5d733e');lawn.addColorStop(1,'#364e32');
  ctx.fillStyle=lawn;ctx.fillRect(0,0,1000,1000);
  if(meadowReady) {
    ctx.drawImage(meadowImage,0,0,1000,1000);
    ctx.globalAlpha=.32;ctx.fillStyle=lawn;ctx.fillRect(0,0,1000,1000);ctx.globalAlpha=1;
  }
  for(let i=0;i<3500;i++) {
    const x=gardenRandom(i+1)*1000,y=gardenRandom(i+18000)*1000;
    ellipse(ctx,x,y,1+gardenRandom(i+900)*2.2,.5+gardenRandom(i+89),
      i%3?'rgba(186,182,111,.15)':'rgba(25,50,26,.23)',gardenRandom(i+60)*3);
  }
  ctx.lineCap='round';
  gardenPath(ctx);ctx.strokeStyle='#4b5d36';ctx.lineWidth=83;ctx.stroke();
  gardenPath(ctx);ctx.strokeStyle='#a89c7c';ctx.lineWidth=76;ctx.stroke();
  gardenPath(ctx);ctx.strokeStyle='#c4b898';ctx.lineWidth=60;ctx.stroke();
  // Individual gravel grains are cached with the ground, never redrawn every frame.
  for(let i=0;i<2400;i++) {
    const x=300+gardenRandom(i+99)*570,y=gardenRandom(i+9000)*1000;
    gardenPath(ctx);ctx.lineWidth=65;
    if(ctx.isPointInStroke(x,y)) ellipse(ctx,x,y,1+gardenRandom(i+23)*2,.7,
      i%2?'#d6ccb1':'#9b8c6b',i);
  }
  for(const [index,bed] of beds.entries()) {
    ellipse(ctx,bed.x*1000,bed.y*1000+7,63,38,'#45502e',-.25);
    ellipse(ctx,bed.x*1000,bed.y*1000+7,51,31,'#645438',-.25);
    for(let i=0;i<22;i++) {
      const seed=index*103+i;
      garden.plants.push({
        x:bed.x*1000+(gardenRandom(seed+4)-.5)*105,
        y:bed.y*1000+(gardenRandom(seed+31)-.5)*62,
        size:40+gardenRandom(seed+221)*44,
        group:bed.group, seed, lean:(gardenRandom(seed+212)-.5)*.35
      });
    }
  }
  garden.plants.sort((a,b)=>a.y-b.y);
  for(let i=0;i<600;i++) {
    const x=gardenRandom(i+333)*1000,y=gardenRandom(i+555)*1000;
    gardenPath(ctx);ctx.lineWidth=97;
    if(ctx.isPointInStroke(x,y) || ((x-760)/115)**2+((y-678)/100)**2<1) continue;
    garden.grass.push({x,y,height:5+gardenRandom(i+45)*15,seed:i});
  }
  // Branch endpoints are permanent attachment points for articulated foliage.
  for(const [index,tree] of [{x:102,y:158,r:158},{x:911,y:130,r:148},{x:-12,y:627,r:120}].entries()) {
    const branches=[];
    for(let i=0;i<36;i++) {
      const angle=i*2.39996+index, distance=tree.r*(.05+.95*Math.sqrt(gardenRandom(i+index*81)));
      branches.push({x:Math.cos(angle)*distance,y:Math.sin(angle)*distance*.72,
        size:118+gardenRandom(i+290)*60,angle,seed:i+index*27});
    }
    branches.sort((a,b)=>a.y-b.y);
    garden.trees.push({...tree,branches});
  }
  for(let i=0;i<32;i++) {
    const angle=i*Math.PI*2/32;
    garden.stones.push({x:760+94*Math.cos(angle),y:676+79*Math.sin(angle),
      r:8+gardenRandom(i+197)*6,angle});
  }
  garden.ground=ground;
}
function gardenSprite(ctx,index,x,y,size,angle,seasonal=true) {
  const variants=garden.sprites[index];
  if(!variants) return;
  const opacity=ctx.globalAlpha;
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);
  ctx.drawImage(variants[0],-size/2,-size,size,size);
  if(seasonal) {
    if(garden.autumn>.01) {
      ctx.globalAlpha=opacity*garden.autumn;
      ctx.drawImage(variants[1],-size/2,-size,size,size);
    }
    if(garden.winter>.01) {
      ctx.globalAlpha=opacity*garden.winter;
      ctx.drawImage(variants[2],-size/2,-size,size,size);
    }
  }
  ctx.restore();
}
function paintWater(ctx,sky,time) {
  // A bank, a water surface, reflections and ripples are independently rendered.
  ellipse(ctx,761,681,106,89,'#394e36');
  ctx.save();pondOutline(ctx);ctx.clip();
  const water=ctx.createLinearGradient(680,595,840,765);
  water.addColorStop(0,'#344e48');water.addColorStop(.5,'#638681');water.addColorStop(1,'#a0b4a0');
  ctx.fillStyle=water;ctx.fillRect(650,580,220,200);
  ctx.lineWidth=1;
  for(let i=0;i<22;i++) {
    const y=604+i*7,shift=Math.sin(time*.8+i)*5;
    ctx.strokeStyle=i%3?'rgba(198,218,181,.2)':'rgba(30,65,53,.22)';
    ctx.beginPath();ctx.moveTo(659+shift,y);
    ctx.bezierCurveTo(713,y+Math.sin(time+i)*2,778,y-3,865+shift,y+1);ctx.stroke();
  }
  for(let i=0;i<8;i++) {
    const phase=(time*(.16+garden.rain*.7)+gardenRandom(i+31))%1;
    const x=694+gardenRandom(i+42)*126,y=622+gardenRandom(i+53)*110;
    ctx.strokeStyle='rgba(222,235,208,'+((1-phase)*(.16+garden.rain*.48))+')';
    ctx.beginPath();ctx.ellipse(x,y,phase*22,phase*9,0,0,Math.PI*2);ctx.stroke();
  }
  for(let i=0;i<4;i++) {
    const x=720+i*24+Math.sin(time*.7+i)*1.5,y=714+Math.sin(i*2)*13;
    ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(time*.45+i)*.08);
    ctx.fillStyle='#577548';ctx.beginPath();ctx.moveTo(0,0);ctx.ellipse(0,0,10,6,0,.2,6);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#92a46a';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-6,-3);ctx.stroke();ctx.restore();
  }
  ctx.restore();
  for(const stone of garden.stones) {
    ellipse(ctx,stone.x+2,stone.y+3,stone.r,stone.r*.65,'#354331',stone.angle);
    ellipse(ctx,stone.x,stone.y,stone.r,stone.r*.65,'#a29f85',stone.angle);
    ellipse(ctx,stone.x-2,stone.y-2,stone.r*.65,stone.r*.35,'#c0bca2',stone.angle);
  }
}
function paintGrass(ctx,sky,time) {
  ctx.lineCap='round';ctx.lineWidth=1.15;
  const colors=garden.winter>.55?['#86806a','#a59c7c','#beb395']:
    garden.autumn>.45?['#7b713a','#a59852','#c1ae69']:['#526a34','#899c53','#acb571'];
  for(let blade=0;blade<3;blade++) {
    ctx.strokeStyle=colors[blade];ctx.beginPath();
    for(const grass of garden.grass) {
      const wind=gardenWind(grass.x,grass.y,time,sky.breeze);
      const h=grass.height*(1-blade*.15);
      ctx.moveTo(grass.x,grass.y);
      ctx.quadraticCurveTo(grass.x+wind*2,grass.y-h*.65,
        grass.x+wind*h*.4+(blade-1)*3,grass.y-h);
    }
    ctx.stroke();
  }
}
function paintPlants(ctx,sky,time) {
  for(const plant of garden.plants) {
    const wind=gardenWind(plant.x,plant.y,time,sky.breeze);
    const bloom=Math.min(1,garden.bloom[plant.group]/[.65,.88,.45][plant.group]);
    const size=plant.size*(.65+.35*bloom);
    const lean=plant.lean+wind*.14;
    ellipse(ctx,plant.x+wind*3+5,plant.y+1,size*.30,size*.12,'rgba(25,39,20,.18)',lean);
    // Dormant leaves and stems remain rooted in the bed between flowering periods.
    ctx.save();ctx.translate(plant.x,plant.y);ctx.rotate(lean);
    ctx.strokeStyle=garden.winter>.4?'#7d7654':'#556c35';ctx.lineWidth=1.6;
    ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(4,-size*.3,1,-size*.58);ctx.stroke();
    for(let leaf=0;leaf<4;leaf++) {
      ellipse(ctx,leaf%2?4:-4,-10-leaf*5,6,2,garden.winter>.4?'#8b8660':'#667c3f',leaf%2?-.5:.5);
    }
    ctx.restore();
    if(bloom>.08) {
      ctx.save();ctx.globalAlpha=Math.min(1,bloom*2.2);
      gardenSprite(ctx,plant.group===1?1:2,plant.x,plant.y,size,lean,false);
      ctx.restore();
    }
  }
}
function paintTreeShadows(ctx,sky,time) {
  const shift=(sky.hour-12)*4;
  for(const tree of garden.trees) {
    for(const branch of tree.branches) {
      const wind=gardenWind(tree.x+branch.x,tree.y+branch.y,time,sky.breeze);
      ellipse(ctx,tree.x+branch.x+shift+wind*4,tree.y+branch.y+48,
        branch.size*.46,branch.size*.28,'rgba(19,34,23,'+(.08*(1-garden.winter*.7))+')',branch.angle);
    }
  }
}
function paintTrees(ctx,sky,time) {
  for(const tree of garden.trees) {
    ctx.lineCap='round';
    for(const branch of tree.branches) {
      const wind=gardenWind(tree.x+branch.x,tree.y+branch.y,time,sky.breeze);
      const x=tree.x+branch.x+wind*5,y=tree.y+branch.y+wind*2;
      ctx.strokeStyle='#51452d';ctx.lineWidth=5;
      ctx.beginPath();ctx.moveTo(tree.x,tree.y+35);
      ctx.quadraticCurveTo(tree.x+branch.x*.3,tree.y+branch.y*.7,x,y);ctx.stroke();
      ctx.strokeStyle='#8d7850';ctx.lineWidth=1.4;ctx.stroke();
    }
    for(const branch of tree.branches) {
      const wind=gardenWind(tree.x+branch.x,tree.y+branch.y,time,sky.breeze);
      const x=tree.x+branch.x+wind*5,y=tree.y+branch.y+wind*2;
      if(garden.winter<.97) {
        ctx.save();ctx.globalAlpha=1-garden.winter*.92;
        gardenSprite(ctx,0,x,y+branch.size*.45,branch.size,
          branch.angle*.38+wind*.07);
        ctx.restore();
      }
      if(garden.bloom[0]>.25 && garden.winter<.3) {
        for(let i=0;i<3;i++) ellipse(ctx,x+(i-1)*8,y+Math.sin(i+branch.seed)*13,2.3,2,'#e9d5c7');
      }
    }
  }
}
function paintGarden(ctx,sim,sky,time) {
  if(!garden.ground) createGarden();
  const delta=garden.lastTime===null?0:Math.max(0,time-garden.lastTime);
  garden.lastTime=time;
  const ease=1-Math.exp(-delta*.4);
  garden.autumn+=(sim.autumnColor-garden.autumn)*ease;
  garden.winter+=(sim.winterColor**6-garden.winter)*ease;
  garden.wet+=(sim.moisture-garden.wet)*ease;
  garden.rain+=(Number(sim.rain)-garden.rain)*ease;
  for(let i=0;i<3;i++) garden.bloom[i]+=(sim.flowers[i]-garden.bloom[i])*ease;
  ctx.drawImage(garden.ground,0,0,1000,1000);
  ctx.fillStyle='rgba(169,128,62,'+(garden.autumn*.24)+')';ctx.fillRect(0,0,1000,1000);
  ctx.fillStyle='rgba(188,183,160,'+(garden.winter*.25)+')';ctx.fillRect(0,0,1000,1000);
  paintWater(ctx,sky,time);
  paintTreeShadows(ctx,sky,time);
  paintGrass(ctx,sky,time);
  paintPlants(ctx,sky,time);
  // The hive is an independent object, with its own ground contact and solar shadow.
  ctx.save();ctx.translate(500,559);ctx.rotate((sky.hour-12)*.05);
  ellipse(ctx,23,19,97,34,'rgba(25,35,20,.25)');ctx.restore();
  ellipse(ctx,500,566,85,20,'rgba(21,29,17,.3)');
  if(garden.atlas) gardenSprite(ctx,3,500,602,243,0,false);
  else {
    ctx.fillStyle='#b48a4e';ctx.fillRect(425,420,150,142);
    ctx.fillStyle='#775b38';ctx.fillRect(417,409,166,74);
  }
}
function paintGardenForeground(ctx,sim,sky,time) {
  paintTrees(ctx,sky,time);
  // Wind carries loose petals and leaves across the composition.
  const autumn=garden.autumn, spring=Math.min(1,garden.bloom[0]*2);
  for(let i=0;i<24;i++) {
    const phase=(time*(.035+.02*gardenRandom(i+4))+gardenRandom(i+77))%1;
    const x=30+gardenRandom(i+42)*880+phase*125;
    const y=-40+phase*1100;
    const opacity=Math.sin(phase*Math.PI)*Math.max(autumn,spring*.65);
    ctx.save();ctx.globalAlpha=opacity;
    ellipse(ctx,x+Math.sin(time*1.3+i)*16,y,autumn>.35?4:2.4,
      1+Math.abs(Math.sin(time*2+i)),autumn>.35?'#c4944c':'#f2dbd2',time*.8+i);
    ctx.restore();
  }
  if(sky.light>.5 && garden.rain<.2 && sim.air>13) {
    for(let i=0;i<3;i++) {
      const x=370+260*Math.sin(time*.085+i*2.1),y=550+220*Math.cos(time*.113+i*2);
      const flap=.2+.8*Math.abs(Math.sin(time*8+i));
      ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(time*.4+i));
      for(const side of [-1,1]) ellipse(ctx,side*3*flap,0,4.5*flap,5,i%2?'#ded8b5':'#d2a15b',side*.4);
      ctx.fillStyle='#4c4833';ctx.fillRect(-.6,-4,1.2,8);ctx.restore();
    }
  }
  if(garden.rain>.015) {
    ctx.strokeStyle='rgba(220,232,229,'+(garden.rain*.46)+')';ctx.lineWidth=1.1;ctx.beginPath();
    for(let i=0;i<100;i++) {
      const y=(gardenRandom(i+311)*1100+time*400)%1100-50;
      const x=(gardenRandom(i+80)*1100+y*.2)%1100-30;
      ctx.moveTo(x,y);ctx.lineTo(x+4,y+16);
    }
    ctx.stroke();
  }
  const cloudX=(time*24)%1800-400;
  const cloud=ctx.createRadialGradient(cloudX,380,40,cloudX,380,460);
  cloud.addColorStop(0,'rgba(28,42,45,'+(.10+garden.rain*.13)+')');cloud.addColorStop(1,'rgba(28,42,45,0)');
  ctx.fillStyle=cloud;ctx.fillRect(0,0,1000,1000);
  const dusk=Math.max(0,1-Math.abs(sky.sun-.10)*3)*sky.light;
  const glow=ctx.createLinearGradient(sky.hour<12?0:1000,0,sky.hour<12?1000:0,700);
  glow.addColorStop(0,'rgba(255,173,82,'+dusk*.4+')');glow.addColorStop(1,'rgba(255,188,122,0)');
  ctx.fillStyle=glow;ctx.fillRect(0,0,1000,1000);
  ctx.fillStyle='rgba(11,23,45,'+(.72*(1-sky.light))+')';ctx.fillRect(0,0,1000,1000);
}
