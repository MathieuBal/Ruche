/* Jardin tempéré illustratif. Les cohortes comptent des ouvrières, les stocks sont en kg.
   Développement des ouvrières (Université de l'Arkansas, MP577) : 3 + 6 + 12 jours.
   Cycle saisonnier : Penn State Extension, Honey Bee Management Throughout the Seasons.
   Les rendements, la météo, la mortalité et les seuils d'essaimage sont des réglages
   de simulation, pas des prévisions pour une colonie réelle. */
(() => {
  'use strict';
  const start = Date.UTC(2025, 3, 15);
  const dayLength = 86400000;
  const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
  const sum = (values, from = 0, to = values.length) => {
    let total = 0;
    for (let i = from; i < to; ++i) total += values[i];
    return total;
  };
  const dateLabel = new Intl.DateTimeFormat('fr-FR', {day:'numeric', month:'long', timeZone:'UTC'});

  class HiveSim {
    constructor() {
      this.day = 0;
      this._adults = Array.from({length:210}, (_, age) => age < 46 ? 390 * Math.exp(-age/55) : 0);
      this._young = Array.from({length:21}, (_, age) => 540 - 7 * age);
      this.honey = 10;
      this.pollen = 1.6;
      this.nectar = .55;
      this.swarms = 0;
      this.lastSwarm = -400;
      this.event = 'Les premières butineuses visitent les fleurs du jardin.';
      this.queenStatus = 'En ponte';
      this.newWorkers = 0;
      this._calendar(0);
      this._count();
      this._flight();
    }
    _calendar(day) {
      const now = new Date(start + day * dayLength);
      const month = now.getUTCMonth();
      // Fixed solar year for a temperate garden. Weather varies between years.
      this._yearDay = Math.floor((now - Date.UTC(now.getUTCFullYear(),0,1)) / dayLength);
      const yearAngle = (this._yearDay-109) * 2*Math.PI/365.25;
      this.season = ['Hiver','Printemps','Été','Automne'][Math.floor((month+1)%12/3)];
      this.date = dateLabel.format(now);
      this.air = 14 + 9*Math.sin(yearAngle) + 2.6*Math.sin(day*.78) + 1.5*Math.cos(day*.23);
      this.rain = Math.sin(day*1.31)*.7 + Math.sin(day*.27)*.3 > .62;
      const bloom = (peak, width) => Math.exp(-(((this._yearDay-peak)/width)**2));
      this.bloom = clamp(.65*bloom(117,35) + .88*bloom(172,41) + .45*bloom(245,28));
      this.weather = this.rain ? 'Pluie' : (this.air < 12 ? 'Frais' : 'Éclaircies');
    }
    _count() {
      this.population = Math.round(sum(this._adults));
      this.eggs = Math.round(sum(this._young,0,3));
      this.larvae = Math.round(sum(this._young,3,9));
      this.sealed = Math.round(sum(this._young,9));
      this.brood = this.eggs + this.larvae + this.sealed;
    }
    _flight() {
      const flightWindow = clamp((this.air-10)/9) * (this.rain ? .04 : 1);
      this.foragers = Math.round(sum(this._adults,19) * flightWindow * this.bloom * .60);
      // A larger larval cohort consumes pollen faster. Ten days of demand is
      // an illustrative response scale, not a measured biological threshold.
      const targetPollen = .25 + this.larvae * .000027 * 10;
      const pollenShare = .11 + .34 * targetPollen / (targetPollen + this.pollen);
      this.pollenForagers = Math.round(this.foragers * pollenShare);
      this.nectarForagers = this.foragers - this.pollenForagers;
      const heating = clamp(this.population/5200) * clamp(this.honey/.8);
      const coreTarget = this.brood > 60 ? 35 : 23;
      this.temp = Math.min(36, this.air + (coreTarget-this.air)*heating);
    }
    _advance(day) {
      const oldSeason = this.season;
      this._calendar(day);
      this._flight();
      if (oldSeason !== this.season) this.event = ({
        Printemps:'Les floraisons de printemps reprennent.', Été:'Les floraisons estivales se succèdent.',
        Automne:'La colonie se prépare à hiverner.', Hiver:'Les ouvrières se regroupent pendant les journées froides.'
      })[this.season];
      // Returning foragers provision the hive; nectar ripens into honey gradually.
      this.nectar += this.nectarForagers * .00049;
      this.pollen = Math.min(6, this.pollen + this.pollenForagers * .00049);
      const ripened = this.nectar * .46;
      this.nectar -= ripened;
      this.honey = Math.min(56, this.honey + .56*ripened);
      const food = this.population*(.000010 + .000008*clamp((15-this.air)/12)) + this.larvae*.000018;
      const protein = this.larvae*.000027;
      const fed = food > 0 ? clamp(this.honey/food) : 1;
      const nursing = protein > 0 ? clamp(this.pollen/protein) : 1;
      this.honey = Math.max(0,this.honey-food);
      this.pollen = Math.max(0,this.pollen-protein);
      const flightFraction = this.foragers/Math.max(1,sum(this._adults,19));
      for (let age=this._adults.length-1; age>0; --age) {
        // Reduced winter attrition; flight adds exposure in mature cohorts.
        const bornOn = (this._yearDay-age+366)%366;
        const winterBee = bornOn>=216 || bornOn<38;
        const dailyLoss = .003 + (age/95)**2*(winterBee ? .002 : .045)
          + (age >= 19 ? flightFraction*.06 : 0) + (1-fed)*.10;
        this._adults[age] = this._adults[age-1] * (1-clamp(dailyLoss));
      }
      this._adults[0] = this._young[20];
      this.newWorkers = Math.round(this._adults[0]);
      for (let age=20; age>0; --age) {
        const survival = age>=3 && age<9 ? (.945+.055*nursing)*(.96+.04*fed) : .999;
        this._young[age] = this._young[age-1] * survival;
      }
      const sinceSwarm = day - this.lastSwarm;
      if (this.queenStatus === 'Cellule royale' && sinceSwarm>=8) {
        this.queenStatus='Reine vierge';
        this.event='Une jeune reine est sortie de sa cellule.';
      }
      if (this.queenStatus === 'Reine vierge' && sinceSwarm>=17 && !this.rain && this.air>=16) {
        this.queenStatus='En ponte';
        this.event='Après ses vols de fécondation, la jeune reine commence à pondre.';
      }
      const crowd = clamp((52000-this.population-this.brood*.4)/15000);
      const availableNurses = clamp((sum(this._adults,2,19) + .34*sum(this._adults,19))/3900);
      const spring = clamp((1+Math.cos((this._yearDay-145)*2*Math.PI/365))/2);
      const lay = 1550*spring**1.65*availableNurses*crowd*clamp(this.honey/2)*clamp(this.pollen/.35);
      this._young[0] = this.queenStatus==='En ponte' ? Math.round(lay) : 0;
      // Congestion, forage and adult strength jointly gate a primary swarm.
      if (sinceSwarm>250 && this._yearDay>=107 && this._yearDay<=180 && this.population>23500 &&
          this.brood>13000 && this.honey>6 && this.bloom>.55 && !this.rain && this.air>16) {
        for(let age=0;age<this._adults.length;age++) this._adults[age]*=.57;
        this.lastSwarm=day;
        this.swarms++;
        this.queenStatus='Cellule royale';
        this.event='Essaimage : l’ancienne reine quitte la ruche avec une partie des ouvrières.';
      }
      this._count();
      this._flight();
    }
    step(days) {
      if(!Number.isFinite(days) || days <= 0) return;
      const end = this.day + days;
      for(let d=Math.floor(this.day)+1;d<=Math.floor(end);d++) this._advance(d);
      this.day=end;
    }
  }
  globalThis.HiveSim=HiveSim;
})();
