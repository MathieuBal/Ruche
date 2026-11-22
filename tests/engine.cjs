const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const engine = ['../dist/engine.js','../engine.js'].find(name => fs.existsSync(path.join(__dirname,name)));
require(engine);

test('une journée simulée est indépendante des rafraîchissements', () => {
  const a = new HiveSim(), b = new HiveSim();
  a.step(100);
  for(let i=0;i<1600;i++) b.step(1/16);
  for(const field of ['day','foragers','population','brood','honey','date','swarms','queenStatus'])
    assert.equal(a[field],b[field],field);
});

test('une ponte traverse les stades avant de devenir adulte à 21 jours', () => {
  const sim = new HiveSim();
  sim._young.fill(0);
  sim._young[0]=100;
  sim.lastSwarm=0;
  sim.queenStatus='Cellule royale';
  sim._count();
  sim.step(2);
  assert.equal(sim.eggs,100);
  assert.equal(sim.larvae,0);
  sim.step(1);
  assert.equal(sim.eggs,0);
  assert.ok(sim.larvae>=99);
  sim.step(6);
  assert.equal(sim.larvae,0);
  assert.ok(sim.sealed>=98);
  sim.step(11);
  assert.equal(sim.newWorkers,0);
  sim.step(1);
  assert.ok(sim.newWorkers>=98);
});

test('trois cycles annuels : hivernage, essaimage, relève et stocks finis', () => {
  const sim = new HiveSim(), statuses=new Set(), seasons=new Set();
  const traffic={};
  let winterLoss=false;
  for(let day=0;day<1095;day++){
    const honey=sim.honey;
    sim.step(1);
    seasons.add(sim.season);
    statuses.add(sim.queenStatus);
    (traffic[sim.season]??=[]).push(sim.foragers);
    if(sim.season==='Hiver' && sim.honey<honey)winterLoss=true;
    for(const field of ['day','population','foragers','honey','pollen','eggs','larvae','sealed','temp']) {
      assert.ok(Number.isFinite(sim[field]) && sim[field]>=0, field);
    }
    assert.ok(sim.foragers<=sim.population);
    assert.equal(sim.brood,sim.eggs+sim.larvae+sim.sealed);
    assert.ok(sim.population>0);
  }
  const mean=vs=>vs.reduce((a,b)=>a+b)/vs.length;
  assert.equal(seasons.size,4);
  assert.deepEqual(statuses,new Set(['En ponte','Cellule royale','Reine vierge']));
  assert.ok(sim.swarms>=2);
  assert.ok(winterLoss && mean(traffic.Hiver)<mean(traffic.Été)*.05);
});

test('les collectes de pollen et de nectar suivent les besoins du couvain', () => {
  const sim=new HiveSim();
  sim.pollen=4;sim._flight();
  const full=sim.pollenForagers, total=sim.foragers;
  sim.pollen=.1;sim._flight();
  assert.ok(sim.pollenForagers>full);
  const low=sim.pollenForagers;
  sim.larvae*=2;sim._flight();
  assert.ok(sim.pollenForagers>low);
  assert.equal(sim.pollenForagers+sim.nectarForagers,total);
});

test('la pluie humidifie le jardin et le sol sèche pendant les journées sèches', () => {
  const sim=new HiveSim();
  let showers=0, dryDays=0;
  for(let i=0;i<365;i++){
    const before=sim.moisture;
    sim.step(1);
    assert.ok(sim.moisture>=0 && sim.moisture<=1);
    if(sim.rain && before<.8){assert.ok(sim.moisture>before);showers++;}
    if(!sim.rain && before>.05){assert.ok(sim.moisture<before);dryDays++;}
  }
  assert.ok(showers>0 && dryDays>0);
});
