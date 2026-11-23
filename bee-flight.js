'use strict';
// Visible agents sample colony activity. Their journeys persist when demand changes.
class GardenFlights {
  constructor(random) {
    this.random=random;
    this.agents=[];
    this.departure=0;
    this.serial=0;
  }
  travel(agent,target,state) {
    agent.start={x:agent.x,y:agent.y};
    agent.target=target;
    agent.state=state;
    agent.progress=0;
    agent.duration=Math.max(.7,Math.hypot(target.x-agent.x,target.y-agent.y)/(.10+.04*this.random(agent.id+11)));
  }
  step(dt,demand,pollenShare,pickBed) {
    if(dt<=0)return;
    const home={x:.501,y:.582};
    const desired=Math.max(0,Math.min(150,Math.ceil(demand)));
    let workers=this.agents.filter(a=>a.state!=='return').length;
    for(const agent of this.agents) {
      if(workers>desired && agent.state!=='return') {
        this.travel(agent,home,'return');workers--;
      }
      if(agent.state==='flower') {
        agent.rest-=dt;
        if(agent.rest<=0)this.travel(agent,home,'return');
        continue;
      }
      agent.progress=Math.min(1,agent.progress+dt/agent.duration);
      const p=agent.progress,dx=agent.target.x-agent.start.x,dy=agent.target.y-agent.start.y;
      const bend=Math.sin(p*Math.PI)*.14*Math.sin(agent.id*2.3);
      const x=agent.start.x+p*dx+dy*bend,y=agent.start.y+p*dy-dx*bend;
      agent.angle=Math.atan2(y-agent.y,x-agent.x);
      agent.x=x;agent.y=y;
      if(p===1 && agent.state==='out') {
        agent.state='flower';agent.rest=1.2+this.random(agent.id+51)*2;
        agent.pollen=this.random(agent.id+73)<pollenShare;
      }
    }
    this.agents=this.agents.filter(a=>!(a.state==='return'&&a.progress===1));
    this.departure=Math.max(0,this.departure-dt);
    if(this.agents.length<desired && this.departure===0) {
      const id=this.serial++,bed=pickBed(this.random(id+97));
      const agent={id,x:home.x,y:home.y,angle:0,pollen:false};
      this.travel(agent,{x:bed.x+(this.random(id+7)-.5)*.035,y:bed.y+(this.random(id+19)-.5)*.035},'out');
      this.agents.push(agent);
      this.departure=.09+this.random(id+31)*.13;
    }
  }
}
