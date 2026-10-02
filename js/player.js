window.Input = {
  keys:{},touchX:0,touchZ:0,punch:false,dash:false,jump:false,emote:false,emoteSlot:0,attackQueue:0,
  queueAttack(){this.attackQueue=Math.min(10,this.attackQueue+1);},
  hasAttack(){return this.attackQueue>0;},
  consumeAttack(){if(this.attackQueue<=0)return false;this.attackQueue--;return true;},
  clearAttackQueue(){this.attackQueue=0;},
  resetActions(){this.punch=this.dash=this.jump=this.emote=false;this.emoteSlot=0;},
  vector(){
    let x=(this.keys['KeyD']||this.keys['ArrowRight']?1:0)-(this.keys['KeyA']||this.keys['ArrowLeft']?1:0)+this.touchX;
    let z=(this.keys['KeyS']||this.keys['ArrowDown']?1:0)-(this.keys['KeyW']||this.keys['ArrowUp']?1:0)+this.touchZ;
    const l=Math.hypot(x,z);if(l>1){x/=l;z/=l;}return{x,z};
  }
};
addEventListener('keydown',e=>{
  Input.keys[e.code]=true;
  if(e.code==='Space'){Input.jump=true;e.preventDefault();}
  if(e.code==='KeyE'){
    // Every physical E press is remembered. Holding the key does not create an
    // automatic machine-gun attack; quick repeated taps do.
    if(!e.repeat)Input.queueAttack();
    e.preventDefault();
  }
  if(e.code==='KeyK')Input.dash=true;
  if(e.code==='KeyL'){Input.emote=true;Input.emoteSlot=0;}
  if(/^Digit[1-4]$/.test(e.code)){Input.emote=true;Input.emoteSlot=parseInt(e.code.slice(5))-1;}
});
addEventListener('keyup',e=>Input.keys[e.code]=false);

window.Fighter = class Fighter{
  constructor(opts){
    this.id=opts.id;this.name=opts.name;this.isHuman=!!opts.isHuman;this.remote=opts.remote||null;this.skinId=opts.skinId||'pirate';this.team=opts.team||'blue';
    this.group=new THREE.Group();this.model=null;this.pos=new THREE.Vector3();this.vel=new THREE.Vector3();this.dir=new THREE.Vector3(0,0,-1);this.targetYaw=Math.PI;
    this.radius=CFG.BODY_RADIUS;this.alive=true;this.onGround=false;this.wasOnGround=false;this.stun=0;this.hitInvuln=0;this.punchCD=0;this.dashCD=0;this.dashTimer=0;this.kills=0;this.lastHitBy=null;this.lastHitAt=0;
    this.skill=opts.skill||.5;this.personality=opts.personality||'Rookie';this.spawnIndex=opts.spawnIndex||0;this.elimTimer=0;this.airTime=0;this.idleVariant=Util.rand(2.2,5.0);this.idleAnim='idle';
    this.attackTimer=0;this.attackPending=false;this.attackLunge=0;this.attackConnected=false;this.attackRetry=0;this.attackBuffer=0;this.attackAge=999;this.comboStep=-1;this.comboWindow=0;this.attackPowerMult=1;this.attackRangeMult=1;this.attackKind='punch';
    this.hitState='';this.hitStateTimer=0;this.hitStateDuration=0;this.hitPhase='';this.hitVariant=0;this.hitLean=1;this.hitAge=0;
    this.stats=opts.stats||{speed:0,punch:0,jump:0};this.impactMeter=0;this._animAccum=0;this._buildTeamMarker();
  }
  _buildTeamMarker(){
    const color=CFG.TEAM_COLORS[this.team]||CFG.TEAM_COLORS.blue;
    const ring=new THREE.Mesh(new THREE.TorusGeometry(this.isHuman?.66:.59,.055,8,24),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9,depthWrite:false}));ring.rotation.x=Math.PI/2;ring.position.y=.055;ring.renderOrder=3;this.group.add(ring);this.teamRing=ring;
    if(this.isHuman){const cone=new THREE.Mesh(new THREE.ConeGeometry(.18,.38,8),new THREE.MeshBasicMaterial({color:0xffdf4d,depthWrite:false}));cone.position.set(0,2.55,0);cone.rotation.x=Math.PI;cone.renderOrder=5;this.group.add(cone);this.playerArrow=cone;}
    this.attackWarning=new THREE.Group();this.attackWarning.position.y=2.55;this.attackWarning.visible=false;
    const warnMat=new THREE.MeshBasicMaterial({color:0xffe04a,depthWrite:false,transparent:true,opacity:.95});
    const warnTop=new THREE.Mesh(new THREE.ConeGeometry(.10,.34,8),warnMat.clone());warnTop.position.y=.12;
    const warnDot=new THREE.Mesh(new THREE.SphereGeometry(.065,8,6),warnMat.clone());warnDot.position.y=-.13;
    this.attackWarning.add(warnTop,warnDot);this.group.add(this.attackWarning);
    this.dizzyGroup=new THREE.Group();this.dizzyGroup.position.y=2.22;this.dizzyGroup.visible=false;
    const geo=new THREE.OctahedronGeometry(.105,0),mat=new THREE.MeshBasicMaterial({color:0xffe44a,depthWrite:false});
    for(let i=0;i<3;i++){const star=new THREE.Mesh(geo,mat.clone());const a=i*Math.PI*2/3;star.position.set(Math.cos(a)*.44,.05+Math.sin(a*2)*.04,Math.sin(a)*.44);star.rotation.set(a*.4,a,a*.3);this.dizzyGroup.add(star);}this.group.add(this.dizzyGroup);
  }
  async load(){
    try{this.model=await Models.createCharacter(this.skinId,1.88);}catch(e){console.warn('Using fallback fighter for',this.skinId,e);this.model=Models.createFallbackCharacter(1.88);}
    this.group.add(this.model.group);this.model.group.rotation.y=0;return this;
  }
  reset(spawn){
    this.pos.copy(spawn);this.vel.set(0,0,0);this.group.position.copy(this.pos);this.group.rotation.set(0,0,0);this.group.scale.set(1,1,1);
    this.alive=true;this.onGround=false;this.wasOnGround=false;this.stun=0;this.hitInvuln=0;this.punchCD=0;this.dashCD=0;this.dashTimer=0;this.lastHitBy=null;this.lastHitAt=0;this.group.visible=true;this.kills=0;this.elimTimer=0;this.airTime=0;
    this.attackTimer=0;this.attackPending=false;this.attackLunge=0;this.attackConnected=false;this.attackRetry=0;this.attackBuffer=0;this.attackAge=999;this.comboStep=-1;this.comboWindow=0;this.attackPowerMult=1;this.attackRangeMult=1;this.attackKind='punch';
    this.hitState='';this.hitStateTimer=0;this.hitStateDuration=0;this.hitPhase='';this.hitAge=0;this.hitLean=Math.random()<.5?-1:1;this.impactMeter=0;this.idleVariant=Util.rand(2.2,5.0);this.idleAnim='idle';if(this.dizzyGroup)this.dizzyGroup.visible=false;
    const toCenter=new THREE.Vector3(-spawn.x,0,-spawn.z);if(toCenter.lengthSq()<.01)toCenter.set(0,0,-1);toCenter.normalize();this.dir.copy(toCenter);this.targetYaw=Math.atan2(this.dir.x,this.dir.z);this.group.rotation.y=this.targetYaw;
    if(this.isHuman&&window.Input)Input.clearAttackQueue();if(this.model){this.model.resetAnimation();this.model.play('spawn',.04,true,1.0);}if(this.remote&&this.remote.resetRound)this.remote.resetRound();
  }
  get speed(){return CFG.MOVE_SPEED*(1+.055*(this.stats.speed||0));}
  get punchForce(){return CFG.PUNCH_FORCE*(1+.08*(this.stats.punch||0));}
  get jumpSpeed(){return CFG.JUMP_SPEED*(1+.045*(this.stats.jump||0));}
  requestPunch(fromBuffer=false){
    if(!this.alive||this.stun>0)return false;
    // Human combat is deliberately more responsive than bot combat. A rapid E press is
    // buffered instead of being thrown away, and the next strike may cancel the tail of
    // the previous attack animation once its active frames have passed.
    const humanReadyCD=this.isHuman?.14:.42;
    // Human attacks are tap-driven. Once the active frames of the current strike have
    // passed, the next queued tap can cancel straight into another combo animation.
    if(this.punchCD>0||this.attackPending&&this.attackAge<.085)return false;
    if(this.attackPending){this.attackPending=false;this.attackTimer=0;this.attackConnected=false;this.attackRetry=0;}
    // Small close-range aim assist: if an enemy is in front/nearby, turn toward them on
    // the same frame as the E press so the visual punch and hit test agree.
    if(this.isHuman&&window.Game){
      let best=null,bestD=3.05;
      for(const t of Game.fighters||[]){if(t===this||!t.alive||t.team===this.team)continue;const dx=t.pos.x-this.pos.x,dz=t.pos.z-this.pos.z,d=Math.hypot(dx,dz);if(d<bestD&&Math.abs(t.pos.y-this.pos.y)<1.7){best=t;bestD=d;}}
      if(best){const dx=best.pos.x-this.pos.x,dz=best.pos.z-this.pos.z,d=Math.hypot(dx,dz)||1;this.dir.set(dx/d,0,dz/d);this.targetYaw=Math.atan2(this.dir.x,this.dir.z);this.group.rotation.y=this.targetYaw;}
    }
    const isKay=!!(this.model&&this.model.skin&&this.model.skin.type==='kaykit');
    // E is the single fight button. Pressing it repeatedly chains through a large
    // animation pool so combat does not look like the same punch every time.
    const kayCombo=[
      {anim:'attack1',kind:'punch', power:1.00,range:1.00,lunge:.17,timer:.22,speed:1.72,cool:-.05},
      {anim:'attack3',kind:'shove', power:.98,range:1.07,lunge:.20,timer:.24,speed:1.62,cool:-.03},
      {anim:'attack2',kind:'kick',  power:1.16,range:1.10,lunge:.25,timer:.29,speed:1.44,cool:.05},
      {anim:'attack5',kind:'chop',  power:1.04,range:1.05,lunge:.20,timer:.25,speed:1.64,cool:-.01},
      {anim:'attack6',kind:'slash', power:1.08,range:1.08,lunge:.22,timer:.27,speed:1.60,cool:.01},
      {anim:'attack7',kind:'sweep', power:1.08,range:1.10,lunge:.22,timer:.28,speed:1.57,cool:.02},
      {anim:'attack8',kind:'jab',   power:1.03,range:1.08,lunge:.24,timer:.24,speed:1.70,cool:-.02},
      {anim:'attack9',kind:'combo', power:1.12,range:1.11,lunge:.25,timer:.29,speed:1.60,cool:.03},
      {anim:'attack10',kind:'heavy',power:1.18,range:1.12,lunge:.27,timer:.31,speed:1.52,cool:.07},
      {anim:'attack4',kind:'spin',  power:1.15,range:1.12,lunge:.25,timer:.31,speed:1.50,cool:.06}
    ];
    const quatCombo=[
      {anim:'attack1',kind:'punch',power:1.00,range:1.00,lunge:.18,timer:.23,speed:1.45,cool:0},
      {anim:'attack2',kind:'heavy',power:1.11,range:1.07,lunge:.22,timer:.28,speed:1.38,cool:.05},
      {anim:'attack3',kind:'punch',power:1.04,range:1.04,lunge:.20,timer:.24,speed:1.52,cool:-.02},
      {anim:'attack4',kind:'heavy',power:1.14,range:1.08,lunge:.23,timer:.29,speed:1.44,cool:.05}
    ];
    const pool=isKay?kayCombo:quatCombo;
    if(this.comboWindow<=0||this.comboStep<0||this.comboStep>=pool.length-1){
      // New exchange starts at a different point, but never on the slow finisher.
      this.comboStep=(Math.random()*Math.max(1,pool.length-2))|0;
    }else this.comboStep=(this.comboStep+1)%pool.length;
    this.comboWindow=1.10;
    let a=pool[this.comboStep],anim=a.anim;
    if(this.model&&this.model.has&&!this.model.has(anim)){
      // Skip missing clips instead of repeating a broken/no-op attack.
      for(let i=1;i<pool.length;i++){const cand=pool[(this.comboStep+i)%pool.length];if(this.model.has(cand.anim)){a=cand;anim=cand.anim;this.comboStep=(this.comboStep+i)%pool.length;break;}}
      if(!this.model.has(anim))anim='attack1';
    }
    this.attackKind=a.kind;this.attackPowerMult=a.power;this.attackRangeMult=a.range;
    this.punchCD=this.isHuman?humanReadyCD:Math.max(.42,CFG.PUNCH_COOLDOWN+a.cool);this.attackTimer=this.isHuman?Math.min(a.timer,.18):a.timer;this.attackAge=0;this.attackPending=true;this.attackLunge=a.lunge;this.attackRetry=.035;this.attackConnected=false;this.attackBuffer=0;
    if(this.model)this.model.play(anim,this.isHuman?.010:.018,true,this.isHuman?a.speed*1.08:a.speed,true);
    // Hit check remains immediate on the E press. The retry window only catches a
    // fighter who steps into the fist a few milliseconds later.
    this.attackConnected=!!Combat.punch(this);AudioFX.sfx.punch();return true;
  }
  requestDash(){
    if(!this.alive||this.stun>0||this.dashCD>0)return;this.dashCD=CFG.DASH_COOLDOWN;this.dashTimer=CFG.DASH_DURATION;
    const d=this.dir.clone();if(Math.hypot(d.x,d.z)<.1)d.set(0,0,-1);this.vel.x=d.x*CFG.DASH_SPEED;this.vel.z=d.z*CFG.DASH_SPEED;if(this.model)this.model.play('dash',.05,true,this.model.skin&&this.model.skin.type==='kaykit'?1.08:1.42);AudioFX.sfx.dash();
  }
  requestJump(){if(this.alive&&this.stun<=0&&this.onGround){this.vel.y=this.jumpSpeed;this.onGround=false;this.airTime=0;if(this.model)this.model.play('jumpStart',.06,true,1.0);AudioFX.sfx.jump();}}
  requestEmote(slot=0){if(!this.alive||this.stun>0||!this.onGround||Math.hypot(this.vel.x,this.vel.z)>=1.0||!this.model)return;if(!this.isHuman){this.model.play(Math.random()<.5?'taunt':'cheer',.055,true,1.0,true);return;}const equipped=Save.data.equippedEmotes||[];const id=equipped[Math.max(0,Math.min(3,slot|0))]||equipped[0]||'wave';const def=CFG.EMOTES.find(e=>e.id===id)||CFG.EMOTES[0];this.model.play(def.action||'taunt',.055,true,1.0,true);}
  applyHit(attacker,impulse,lift=CFG.PUNCH_LIFT){
    if(!this.alive||this.hitInvuln>0)return false;
    const horizontal=Math.hypot(impulse.x,impulse.z),attackKind=attacker&&attacker.attackKind||'',dashHit=!!(attacker&&attacker.dashTimer>.025);
    const strong=dashHit||attackKind==='kick'||attackKind==='spin'||attackKind==='heavy'||horizontal>=CFG.KNOCKDOWN_FORCE;
    let duration=strong?Util.rand(CFG.KNOCKDOWN_STUN_MIN,CFG.KNOCKDOWN_STUN_MAX):Util.rand(CFG.HIT_STUN_MIN,CFG.HIT_STUN_MAX);if(this.isHuman)duration*=strong?.72:.68;
    // Party-brawler stability: early hits stagger more than they launch. Repeated hits
    // gradually build knockback so ring-outs still happen after a real exchange.
    const stability=Util.clamp(CFG.STABILITY_BASE+this.impactMeter*CFG.STABILITY_PER_HIT,CFG.STABILITY_BASE,CFG.STABILITY_MAX);
    // The first minute is a proper fight instead of an instant launch-fest. Hit reactions
    // stay immediate, while knockback ramps smoothly to full strength over 60 seconds.
    const elapsed=(window.Game&&Game.worldState)?(Game.worldState().elapsed||0):999;
    const ramp=CFG.ROUND_SURVIVAL_RAMP||60,survivalScale=elapsed<ramp?Util.lerp(.62,1,elapsed/ramp):1;
    const envMult=attacker?1:.90,strongMult=strong?1.06:1,launch=stability*survivalScale*envMult*strongMult;
    this.vel.x+=impulse.x*launch;this.vel.z+=impulse.z*launch;this.vel.y=Math.max(this.vel.y,lift*(.74+.18*stability)*survivalScale+(strong?.18:0));
    // Give the hit an immediate visible response on the same frame instead of waiting
    // for velocity integration/animation blending on the next frame.
    const il=Math.hypot(impulse.x,impulse.z)||1;this.pos.x+=impulse.x/il*(strong?.095:.065);this.pos.z+=impulse.z/il*(strong?.095:.065);
    this.group.rotation.z=this.hitLean*(strong?.16:.09);
    this.stun=Math.max(this.stun,duration);this.hitInvuln=this.isHuman?(strong?.34:.28):(strong?.10:.055);
    this.impactMeter=Math.min(5.2,this.impactMeter+(strong?1.45:1.0));
    this.attackPending=false;this.attackTimer=0;this.attackConnected=false;this.attackRetry=0;this.comboWindow=0;
    this.lastHitBy=attacker?attacker.id:null;this.lastHitAt=performance.now()/1000;this.hitState=strong?'knockdown':'stagger';this.hitStateTimer=duration;this.hitStateDuration=duration;this.hitAge=0;this.hitLean=Math.random()<.5?-1:1;this.hitVariant=(this.hitVariant+1)%2;
    const isKay=!!(this.model&&this.model.skin&&this.model.skin.type==='kaykit');
    if(this.model){
      if(strong&&isKay&&this.model.has('knockdown')){this.hitPhase='falling';this.model.play('knockdown',.008,true,1.58,true);}
      else if(strong&&this.model.has('knockdown')){this.hitPhase='falling';this.model.play('knockdown',.008,true,1.62,true);}
      else{this.hitPhase='stagger';this.model.play(this.hitVariant&&this.model.has('hit2')?'hit2':'hit',.006,true,isKay?1.62:1.55,true);}
    }
    AudioFX.sfx.hit();return strong;
  }
  _updateHitState(dt){
    if(this.hitStateTimer<=0){this.hitState='';this.hitPhase='';this.group.rotation.x*=Math.pow(.001,dt);this.group.rotation.z*=Math.pow(.001,dt);if(this.dizzyGroup)this.dizzyGroup.visible=false;return;}
    this.hitAge+=dt;this.hitStateTimer=Math.max(0,this.hitStateTimer-dt);
    const isKay=!!(this.model&&this.model.skin&&this.model.skin.type==='kaykit');
    if(this.dizzyGroup){this.dizzyGroup.visible=this.hitStateTimer>.10;this.dizzyGroup.rotation.y+=dt*(this.hitState==='knockdown'?7.5:5.3);this.dizzyGroup.children.forEach((s,i)=>{s.rotation.x+=dt*(3+i);s.rotation.z-=dt*(2.2+i*.5);s.position.y=.04+Math.sin((this.hitAge*8)+i*2.1)*.055;});}
    if(this.hitState==='stagger'){
      const fade=this.hitStateDuration?this.hitStateTimer/this.hitStateDuration:0;this.group.rotation.z=Math.sin(this.hitAge*19)*.12*fade*this.hitLean;
    }else if(this.hitState==='knockdown'){
      if(isKay&&this.model){
        if(this.hitPhase==='falling'&&this.hitAge>.28){this.hitPhase='down';if(this.model.has('downIdle'))this.model.play('downIdle',.055,false,1,true);}
        if(this.hitPhase==='down'&&this.hitStateTimer<.42){this.hitPhase='gettingup';if(this.model.has('getup'))this.model.play('getup',.07,true,1.48,true);}
      }else{
        const down=Math.min(1,this.hitAge/.22),up=this.hitStateTimer<.42?Util.clamp(this.hitStateTimer/.42,0,1):1;this.group.rotation.z=this.hitLean*1.03*Math.min(down,up);
        if(this.hitPhase==='falling'&&this.hitStateTimer<.38){this.hitPhase='gettingup';if(this.model)this.model.play('getup',.07,true,1.48,true);}
      }
    }
    if(this.hitStateTimer<=0){this.hitState='';this.hitPhase='';this.group.rotation.x=0;this.group.rotation.z=0;if(this.dizzyGroup)this.dizzyGroup.visible=false;}
  }
  eliminate(reason='fell'){
    if(!this.alive)return;if(this.isHuman&&window.Input)Input.clearAttackQueue();this.alive=false;this.elimTimer=1.25;this.attackPending=false;this.attackConnected=false;this.attackRetry=0;this.hitState='';this.stun=0;if(this.dizzyGroup)this.dizzyGroup.visible=false;if(this.model)this.model.play('fall',.025,true,1.0,true);
    const now=performance.now()/1000;let killer=null;if(this.lastHitBy&&now-this.lastHitAt<7)killer=Game.getFighter(this.lastHitBy);
    if(killer&&killer!==this){killer.kills++;Combat.onKO(killer,this);}else Combat.onFall(this);AudioFX.sfx.ko();
  }
  update(dt,arena){
    if(this.model){if(CFG.MOBILE_OPT&&!this.isHuman){this._animAccum+=dt;if(this._animAccum>=.033){this.model.update(this._animAccum);this._animAccum=0;}}else this.model.update(dt);}
    if(this.attackWarning){const w=!!(this.remote&&this.remote.attackWindup>0&&this.alive);this.attackWarning.visible=w;if(w){const pulse=1+Math.sin(performance.now()*.018)*.16;this.attackWarning.scale.setScalar(pulse);this.attackWarning.rotation.y+=dt*3.5;}}
    if(!this.alive){if(this.elimTimer>0){this.elimTimer-=dt;this.group.position.y-=dt*2.4;this.group.rotation.z+=dt*1.55;if(this.elimTimer<=0)this.group.visible=false;}return;}
    this.hitInvuln=Math.max(0,this.hitInvuln-dt);this.stun=Math.max(0,this.stun-dt);this.impactMeter=Math.max(0,this.impactMeter-dt*CFG.STABILITY_DECAY);this._updateHitState(dt);
    this.punchCD=Math.max(0,this.punchCD-dt);this.dashCD=Math.max(0,this.dashCD-dt);this.dashTimer=Math.max(0,this.dashTimer-dt);this.comboWindow=Math.max(0,this.comboWindow-dt);this.attackBuffer=Math.max(0,this.attackBuffer-dt);this.attackAge+=dt;
    if(this.attackPending){
      this.attackTimer-=dt;this.attackRetry-=dt;if(this.attackLunge>0&&this.onGround){const step=Math.min(this.attackLunge,dt*2.6);this.vel.x+=this.dir.x*step*6.2;this.vel.z+=this.dir.z*step*6.2;this.attackLunge-=step;}
      if(!this.attackConnected&&this.attackRetry<=0){this.attackConnected=!!Combat.punch(this);this.attackRetry=999;}if(this.attackTimer<=0){this.attackPending=false;this.attackConnected=false;this.attackRetry=0;this.attackRangeMult=1;}
    }
    if(this.isHuman&&this.stun<=0&&Input.hasAttack()&&this.punchCD<=0&&(!this.attackPending||this.attackAge>=.085)){if(this.requestPunch(true))Input.consumeAttack();}
    let input={x:0,z:0,punch:false,dash:false,jump:false,emote:false,emoteSlot:0};
    if(this.isHuman){const v=Input.vector();input.x=v.x;input.z=v.z;input.punch=false;input.dash=Input.dash;input.jump=Input.jump;input.emote=Input.emote;input.emoteSlot=Input.emoteSlot;}
    else if(this.remote)input=this.remote.sampleInput(Game.worldState(),this,dt);
    const moveIntent=Math.hypot(input.x,input.z);
    if(this.stun<=0){
      const mag=moveIntent;if(mag>.08){
        const nx=input.x/mag,nz=input.z/mag;this.dir.set(nx,0,nz);const accel=CFG.ACCEL*(this.onGround?1:CFG.AIR_CONTROL);
        if(this.dashTimer<=0){this.vel.x+=(nx*this.speed-this.vel.x)*Math.min(1,accel*dt/this.speed);this.vel.z+=(nz*this.speed-this.vel.z)*Math.min(1,accel*dt/this.speed);}this.targetYaw=Math.atan2(nx,nz);const delta=Util.angleDelta(this.group.rotation.y,this.targetYaw);this.group.rotation.y+=delta*Math.min(1,dt*(this.dashTimer>0?16:11));
      }else if(this.onGround&&this.dashTimer<=0){this.vel.x*=Math.pow(.0015,dt);this.vel.z*=Math.pow(.0015,dt);}
      if(input.jump)this.requestJump();if(input.punch)this.requestPunch();if(input.dash)this.requestDash();if(input.emote)this.requestEmote(input.emoteSlot||0);
    }else if(this.onGround&&this.hitAge>.16){
      const drag=this.hitState==='knockdown'?1.25:2.3;this.vel.x*=Math.exp(-drag*dt);this.vel.z*=Math.exp(-drag*dt);
    }
    this.wasOnGround=this.onGround;if(!this.onGround)this.airTime+=dt;const prevY=this.pos.y;this.vel.y-=CFG.GRAVITY*dt;this.pos.addScaledVector(this.vel,dt);
    const ground=arena.getGroundHeight(this.pos.x,this.pos.z,this.pos.y+.8,this,prevY);
    if(ground!==null&&this.vel.y<=0&&this.pos.y<=ground+.28){const landed=!this.wasOnGround&&this.airTime>.16;this.pos.y=ground;this.vel.y=0;this.onGround=true;if(landed&&this.model&&this.stun<=0)this.model.play('land',.07,true,1.05);this.airTime=0;}else this.onGround=false;
    arena.postFighterUpdate(this,dt);if(arena.isOutsideKillBoundary&&arena.isOutsideKillBoundary(this.pos.x,this.pos.z,this.pos.y))this.eliminate('ringout');else if(this.pos.y<CFG.FALL_Y)this.eliminate('fell');this.group.position.set(this.pos.x,this.pos.y+.075,this.pos.z);
    if(this.model&&this.alive&&this.stun<=0){
      const horizontal=Math.hypot(this.vel.x,this.vel.z);
      const wantsMove=moveIntent>.08&&this.onGround&&this.dashTimer<=0&&!this.attackPending;
      if(wantsMove&&this.model.interruptForLocomotion)this.model.interruptForLocomotion();
      if(!this.model.locked){
        let anim='idle',speed=1,fade=.095;
        if(!this.onGround){anim='jump';speed=1.0;fade=.045;}
        else if(this.dashTimer>0){anim='dash';speed=1.18;fade=.03;}
        else if(wantsMove){
          // Drive locomotion from player intent instead of waiting for velocity to build.
          // Keyboard input (magnitude ~1) enters run immediately; a partially tilted
          // mobile joystick uses walk until pushed farther out.
          const runNow=moveIntent>.56||!this.model.has('walk');
          if(runNow){anim=(this.spawnIndex%3===2&&this.model.has('runAlt'))?'runAlt':'run';speed=Util.clamp(Math.max(.92,horizontal/Math.max(.01,this.speed)),.92,1.16);}
          else{anim='walk';speed=Util.clamp(.68+moveIntent*.55,.68,1.08);}
          fade=.035;
        }else if(horizontal>2.4&&this.onGround){
          // Preserve believable animation if external knockback leaves a fighter sliding.
          anim='run';speed=.90;fade=.055;
        }else{
          this.idleVariant-=dt;
          if(this.idleVariant<=0){this.idleAnim=(Math.random()<.38&&this.model.has('idle2'))?'idle2':'idle';this.idleVariant=Util.rand(3.0,5.6);}
          anim=this.idleAnim||'idle';speed=1;fade=.085;
        }
        this.model.play(anim,fade,false,speed);
      }
    }
  }
};
