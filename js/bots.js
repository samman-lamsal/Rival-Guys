window.RemotePlayer=class RemotePlayer{
  constructor(profile){this.profile=profile||{};this.targetId=null;}
  resetRound(){this.targetId=null;}
  sampleInput(world,fighter,dt){return{x:0,z:0,punch:false,dash:false,jump:false,emote:false};}
};

window.NetworkRemotePlayer=class NetworkRemotePlayer extends RemotePlayer{
  constructor(profile){super(profile);this.latest={x:0,z:0,punch:false,dash:false,jump:false,emote:false};}
  pushNetworkInput(input){this.latest=Object.assign({},this.latest,input);}
  sampleInput(){const out=Object.assign({},this.latest);this.latest.punch=this.latest.dash=this.latest.jump=this.latest.emote=false;return out;}
};

window.BotRemotePlayer=class BotRemotePlayer extends RemotePlayer{
  constructor(profile){
    super(profile);this.think=0;this.targetLock=0;this.state='roam';this.stateTime=0;this.current={x:0,z:0};this.desired={x:0,z:0};this.strafeSide=Math.random()<.5?-1:1;
    this.wander=Util.rand(0,Math.PI*2);this.roamRadius=Util.rand(2.5,7.5);this.rookieOops=Util.rand(11,20);this.actionPause=Util.rand(.06,.24);this.tauntClock=Util.rand(6,12);this.attackThink=Util.rand(.16,.38);this.comboBurst=0;this.lastTargetId=null;this.attackWindup=0;this.postAttackOpen=0;
  }
  resetRound(){
    this.targetId=null;this.lastTargetId=null;this.targetLock=0;this.think=Util.rand(.15,.55);this.state='roam';this.stateTime=Util.rand(.4,1.2);this.current={x:0,z:0};this.desired={x:0,z:0};this.strafeSide=Math.random()<.5?-1:1;this.rookieOops=Util.rand(12,21);this.actionPause=Util.rand(.05,.22);this.tauntClock=Util.rand(6,12);this.attackThink=Util.rand(.14,.34);this.comboBurst=0;this.attackWindup=0;this.postAttackOpen=0;
  }
  _aliveEnemy(world,self,id){const f=world.fighters.find(x=>x.id===id);return f&&f.alive&&f.team!==self.team?f:null;}
  _targetClaims(world,self,targetId){return world.fighters.filter(f=>f.alive&&f.team===self.team&&f!==self&&f.remote&&f.remote.targetId===targetId).length;}
  _chooseTarget(world,self,difficulty){
    const arena=world.arena,enemies=world.fighters.filter(f=>f.alive&&f.team!==self.team);if(!enemies.length)return null;
    const retaliate=self.lastHitBy?this._aliveEnemy(world,self,self.lastHitBy):null;if(retaliate&&Math.random()<.42+.28*difficulty)return retaliate;
    const awareness=Util.lerp(10.5,18.0,difficulty),personality=self.personality;
    let best=null,bestScore=-1e9;
    for(const e of enemies){
      const d=Util.dist2D(self.pos,e.pos);if(d>awareness&&personality!=='Bully')continue;
      const claims=this._targetClaims(world,self,e.id),danger=arena.edgeDanger(e.pos.x,e.pos.z,e.pos.y),selfDanger=arena.edgeDanger(self.pos.x,self.pos.z,self.pos.y);
      let score=(awareness-Math.min(d,awareness))*1.15 + danger*(personality==='Bully'?5.5:3.2) + Math.random()*4.2;
      score-=claims*(personality==='Bully'?3.8:5.4);
      if(e.isHuman){
        const cap=(world.mode&&world.mode.teamSize>=8)?2:1;if(claims>=cap)score-=12;
        score+=personality==='Bully'?3.0:1.1; // Human players are valid targets, not a permanent magnet.
      }
      if(personality==='Camper'){score-=d*1.2;if(d>6.5)score-=12;if(selfDanger>.28)score-=4;}
      if(personality==='Trickster')score+=Math.max(0,6-d)*.45;
      if(personality==='Rookie')score+=Math.random()*3-1.5;
      if(score>bestScore){bestScore=score;best=e;}
    }
    return best;
  }
  _safeVector(arena,self){const p=arena.getSafePoint?arena.getSafePoint(self.pos):{x:0,z:0};return{x:p.x-self.pos.x,z:p.z-self.pos.z};}
  _separation(world,self){let x=0,z=0;for(const f of world.fighters){if(!f.alive||f===self||f.team!==self.team)continue;const dx=self.pos.x-f.pos.x,dz=self.pos.z-f.pos.z,d2=dx*dx+dz*dz;if(d2>.01&&d2<5.0){const w=(5.0-d2)/5.0;x+=dx/Math.sqrt(d2)*w;z+=dz/Math.sqrt(d2)*w;}}return{x,z};}
  _pickState(world,self,target,difficulty){
    const danger=world.arena.edgeDanger(self.pos.x,self.pos.z,self.pos.y),p=self.personality;
    if(danger>.46||(p==='Camper'&&danger>.27))return 'recover';
    if(!target)return Math.random()<.22?'hold':'roam';
    const d=Util.dist2D(self.pos,target.pos);
    if(this.actionPause>0&&d<3.5&&self.punchCD>.16)return Math.random()<.28?'feint':'pressure';
    if(d<2.9&&self.punchCD<=.18)return 'attack';
    if(d<5.4)return Math.random()<.28?'strafe':'pressure';
    if(p==='Camper'&&d>7.2)return 'hold';
    return 'approach';
  }
  _setDesiredForState(world,self,target,difficulty){
    const arena=world.arena,p=self.personality,sep=this._separation(world,self);let tx=0,tz=0;
    if(this.state==='recover'){
      const s=this._safeVector(arena,self);tx=s.x;tz=s.z;
    }else if(this.state==='roam'||this.state==='hold'){
      const safe=arena.getSafePoint?arena.getSafePoint(self.pos):{x:0,z:0};this.wander+=Util.rand(-.45,.45);
      const rr=this.state==='hold'?2.2:this.roamRadius,goalX=safe.x+Math.cos(this.wander)*rr,goalZ=safe.z+Math.sin(this.wander)*rr;tx=goalX-self.pos.x;tz=goalZ-self.pos.z;
      if(this.state==='hold'&&Math.random()<.55){tx*=.2;tz*=.2;}
    }else if(target){
      const dx=target.pos.x-self.pos.x,dz=target.pos.z-self.pos.z,d=Math.hypot(dx,dz)||1,nx=dx/d,nz=dz/d,px=-nz*this.strafeSide,pz=nx*this.strafeSide;
      if(this.state==='approach'){const flank=p==='Trickster'?.34:(p==='Camper'?.08:.15);tx=nx+px*flank;tz=nz+pz*flank;}
      else if(this.state==='pressure'){tx=nx*.92+px*.18;tz=nz*.92+pz*.18;}
      else if(this.state==='strafe'||this.state==='feint'){
        const inward=this._safeVector(arena,self),il=Math.hypot(inward.x,inward.z)||1;tx=px*.82+nx*(this.state==='feint'?-.25:.18)+inward.x/il*.20;tz=pz*.82+nz*(this.state==='feint'?-.25:.18)+inward.z/il*.20;
      }else if(this.state==='attack'){tx=nx*.92;tz=nz*.92;}
      if(arena.edgeDanger(target.pos.x,target.pos.z,target.pos.y)>.58&&difficulty>.58&&p!=='Camper'){
        // Smarter bots circle to the inside so their shove points toward the edge instead of blindly running behind the target.
        const inward=new THREE.Vector2(-target.pos.x,-target.pos.z);if(inward.lengthSq()>.01){inward.normalize();tx=tx*.72-inward.x*.28;tz=tz*.72-inward.y*.28;}
      }
    }
    tx+=sep.x*.42;tz+=sep.z*.42;const len=Math.hypot(tx,tz);
    if(len>.001){tx/=len;tz/=len;}else{tx=0;tz=0;}
    const selfDanger=arena.edgeDanger(self.pos.x,self.pos.z,self.pos.y);
    if(selfDanger>.42){const safe=this._safeVector(arena,self),sl=Math.hypot(safe.x,safe.z)||1,force=Util.clamp((selfDanger-.42)/.42,.25,.92);tx=Util.lerp(tx,safe.x/sl,force);tz=Util.lerp(tz,safe.z/sl,force);}
    const noise=(1-difficulty)*(self.personality==='Rookie'?.48:.24);tx+=Util.rand(-noise,noise);tz+=Util.rand(-noise,noise);const l=Math.hypot(tx,tz);if(l>1){tx/=l;tz/=l;}
    this.desired.x=tx;this.desired.z=tz;
  }
  sampleInput(world,self,dt){
    const out={x:0,z:0,punch:false,dash:false,jump:false,emote:false},arena=world.arena;
    const rubber=self.team==='red'?(world.botDifficulty||1):1,difficulty=Util.clamp((self.skill||.5)*rubber,.12,1),personality=self.personality;
    this.think-=dt;this.targetLock-=dt;this.stateTime-=dt;this.rookieOops-=dt;this.actionPause=Math.max(0,this.actionPause-dt);this.tauntClock-=dt;this.postAttackOpen=Math.max(0,this.postAttackOpen-dt);

    let target=this._aliveEnemy(world,self,this.targetId);
    // One nearby rival may decide to pressure the human, but the whole enemy team
    // never locks on at once. Most bots continue fighting whoever is naturally nearby.
    const human=world.human&&world.human.alive?world.human:null;
    if(self.team==='red'&&human&&this.targetLock<=.25&&arena.edgeDanger(self.pos.x,self.pos.z,self.pos.y)<.58){
      const redAlive=world.fighters.filter(f=>f.alive&&f.team==='red');
      const nearest=redAlive.sort((a,b)=>Util.dist2D(a.pos,human.pos)-Util.dist2D(b.pos,human.pos))[0];
      const humanDist=Util.dist2D(self.pos,human.pos);
      if(nearest===self&&humanDist<13.5&&Math.random()<.38){
        this.targetId=human.id;target=human;this.targetLock=Util.rand(1.35,2.45);
      }
    }
    if(!target||this.targetLock<=0){
      const next=this._chooseTarget(world,self,difficulty);this.lastTargetId=this.targetId;this.targetId=next?next.id:null;target=next;this.targetLock=Util.rand(1.2,3.5)*(personality==='Bully'?1.15:1);
      if(Math.random()<.25)this.strafeSide*=-1;
    }

    if(personality==='Rookie'&&this.rookieOops<=0&&arena.edgeDanger(self.pos.x,self.pos.z,self.pos.y)<.28&&Math.random()<.025){
      const r=Math.hypot(self.pos.x,self.pos.z)||1;this.desired.x=self.pos.x/r;this.desired.z=self.pos.z/r;this.rookieOops=Util.rand(13,21);this.state='oops';this.stateTime=Util.rand(.25,.65);
    }else if(this.think<=0||this.stateTime<=0){
      this.think=Util.rand(Util.lerp(.48,.15,difficulty),Util.lerp(.72,.28,difficulty));this.state=this._pickState(world,self,target,difficulty);this.stateTime=Util.rand(.35,1.05);
      if(this.state==='attack'){this.actionPause=Util.rand(.04,.16);this.stateTime=Math.max(this.stateTime,Util.rand(.42,.82));}
      this._setDesiredForState(world,self,target,difficulty);
    }

    // Smooth steering gives visible human-like turns rather than instant AI vector snapping.
    const turn=Util.lerp(3.2,8.5,difficulty),blend=1-Math.exp(-turn*dt);this.current.x=Util.lerp(this.current.x,this.desired.x,blend);this.current.z=Util.lerp(this.current.z,this.desired.z,blend);
    const curLen=Math.hypot(this.current.x,this.current.z);if(curLen>1){this.current.x/=curLen;this.current.z/=curLen;}
    out.x=this.current.x;out.z=this.current.z;

    if(target&&self.stun<=0){
      const dx=target.pos.x-self.pos.x,dz=target.pos.z-self.pos.z,dist=Math.hypot(dx,dz)||1,nx=dx/dist,nz=dz/dist,danger=arena.edgeDanger(self.pos.x,self.pos.z,self.pos.y);
      const close=dist<CFG.PUNCH_RANGE*1.28;
      let releaseTelegraphedAttack=false;
      if(this.attackWindup>0){
        this.attackWindup=Math.max(0,this.attackWindup-dt);
        releaseTelegraphedAttack=this.attackWindup<=0;
      }
      if(close){
        // Bots deliberately square up before swinging. This makes attacks connect like a person
        // aiming a punch instead of randomly pressing attack while strafing sideways.
        const aim=.58+.24*difficulty;out.x=Util.lerp(out.x,nx,aim);out.z=Util.lerp(out.z,nz,aim);const ol=Math.hypot(out.x,out.z);if(ol>1){out.x/=ol;out.z/=ol;}
        const retaliating=self.lastHitBy===target.id&&performance.now()/1000-self.lastHitAt<2.2;
        const pressure=(1.18+1.55*difficulty+(personality==='Bully'?.34:0)+(retaliating?.46:0)+(target.isHuman?.08:0));
        if(this.postAttackOpen<=0&&this.attackWindup<=0&&self.punchCD<=.08)this.attackThink-=dt*pressure;
        if(target.stun>0&&target.hitState==='knockdown'&&Math.random()<.52)this.attackThink+=dt*.34;
        // Telegraph every bot swing before the hit. The warning lasts long enough for a human
        // player to jump, dash away, or counter instead of being hit on the same frame.
        if(this.attackWindup<=0&&this.postAttackOpen<=0&&self.punchCD<=.035&&this.actionPause<=.07&&this.attackThink<=0&&dist<CFG.PUNCH_RANGE*1.10){
          const skillDelay=Util.lerp(.42,.26,difficulty),persona=personality==='Trickster'?.92:personality==='Rookie'?1.18:1.0;
          this.attackWindup=Util.rand(skillDelay,skillDelay+.12)*persona;
          this.state='attack';this.stateTime=Math.max(this.stateTime,this.attackWindup+.22);this.current.x*=.48;this.current.z*=.48;
        }
        if(this.attackWindup>0||releaseTelegraphedAttack){
          // Hold position and face the target during the tell.
          out.x=Util.lerp(out.x,nx,.88);out.z=Util.lerp(out.z,nz,.88);
          if(releaseTelegraphedAttack&&dist<CFG.PUNCH_RANGE*1.12){
            out.punch=true;this.comboBurst=0;
            const base=Util.lerp(.78,.46,difficulty),tempo=personality==='Rookie'?1.25:personality==='Camper'?1.16:personality==='Trickster'?1.02:1.08;
            this.attackThink=Util.rand(base*tempo,(base+.28)*tempo);
            this.actionPause=Util.rand(.18,.30);
            this.postAttackOpen=Util.rand(.34,.58);
            if(Math.random()<.36)this.strafeSide*=-1;
          }
        }
      }else{
        if(releaseTelegraphedAttack){this.attackThink=Util.rand(.35,.60);this.postAttackOpen=Util.rand(.22,.38);}
        this.attackThink=Math.min(this.attackThink+dt*.08,Util.lerp(.58,.36,difficulty));
      }
      const predicted={x:self.pos.x+this.current.x*3.1,z:self.pos.z+this.current.z*3.1};const predictedDanger=arena.edgeDanger(predicted.x,predicted.z,self.pos.y);
      if(self.dashCD<=.03&&danger<.48&&predictedDanger<.78&&dist>2.0&&dist<5.7){
        let dashChance=personality==='Trickster'?.08+.16*difficulty:personality==='Bully'?.045+.08*difficulty:.014+.038*difficulty;
        if(Math.random()<dashChance*dt*7.0)out.dash=true;
      }
      if(arena.shouldBotJump&&arena.shouldBotJump(self,target)&&Math.random()<(.35+.45*difficulty)*dt*7)out.jump=true;
    }

    if(this.tauntClock<=0&&(!target||Util.dist2D(self.pos,target.pos)>7)&&arena.edgeDanger(self.pos.x,self.pos.z,self.pos.y)<.35&&Math.random()<.35){out.emote=true;this.tauntClock=Util.rand(8,15);}else if(this.tauntClock<=0)this.tauntClock=Util.rand(4,8);
    return out;
  }
};

window.BotNames=(()=>{
  const first=['Liam','Noah','Ava','Mia','Leo','Kai','Maya','Nina','Aria','Zoe','Finn','Luca','Eli','Theo','Jude','Milo','Ivy','Luna','Sara','Nora','Owen','Ezra','Max','Alex','Ben','Sam','Ryan','Jay','Aiden','Mason','Ella','Ruby','Iris','Tara','Ravi','Niko','Mina','Lena','Kira','Jax','Toby','Evan','Dani','Remy','Cole','Skye','Ari','Mika'];
  const last=['K','R','M','T','S','B','P','D','N','V','G','H','L','C','J','F','W','Y','Z','Q'];const pool=[];first.forEach(a=>last.forEach(b=>pool.push(`${a} ${b}.`)));return Util.shuffle(pool);
})();
