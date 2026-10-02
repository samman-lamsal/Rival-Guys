window.Combat=(()=>{
  let dashHitPairs=new Set(),effects=[];
  function beginFrame(){dashHitPairs.clear();}
  function addImpact(target,dir,strong=false){
    if(!target||!target.group)return;
    const g=new THREE.Group();
    const ring=new THREE.Mesh(new THREE.TorusGeometry(strong?.46:.34,strong?.082:.065,6,18),new THREE.MeshBasicMaterial({color:strong?0xffb82e:0xfff06a,transparent:true,opacity:.95,depthWrite:false}));
    ring.rotation.x=Math.PI/2;ring.position.y=1.05;g.add(ring);
    const flash=new THREE.Mesh(new THREE.SphereGeometry(strong?.22:.16,8,6),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.9,depthWrite:false}));
    flash.position.set(dir.x*.28,1.04,dir.z*.28);g.add(flash);
    target.group.add(g);effects.push({g,parent:target.group,t:0,life:.18});
  }
  function update(dt){
    for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.t+=dt;const q=e.t/e.life,s=1+q*1.7;e.g.scale.setScalar(s);e.g.rotation.y+=dt*8;e.g.children.forEach(o=>{if(o.material)o.material.opacity=Math.max(0,1-q);});if(q>=1){e.parent.remove(e.g);effects.splice(i,1);}}
  }
  function punch(attacker){
    if(!window.Game||!attacker||!attacker.alive)return null;
    const facing=attacker.dir.clone();facing.y=0;if(facing.lengthSq()<.001)facing.set(0,0,-1);facing.normalize();
    const candidates=[];
    Game.fighters.forEach(t=>{
      if(t===attacker||!t.alive||t.team===attacker.team||t.hitInvuln>0)return;
      const dx=t.pos.x-attacker.pos.x,dz=t.pos.z-attacker.pos.z,dist=Math.hypot(dx,dz);
      // Jumping is an intentional defensive option. A fighter who has clearly left
      // the floor avoids ordinary punches/shoves instead of being hit through the air.
      const airborneDodge=!t.onGround&&((t.pos.y-attacker.pos.y)>.28||t.vel.y>.65);
      if(airborneDodge&&attacker.dashTimer<=.025)return;
      if(Math.abs(t.pos.y-attacker.pos.y)>1.55)return;
      const maxDist=CFG.PUNCH_RANGE*(attacker.attackRangeMult||1)+(t.radius||CFG.BODY_RADIUS)*.42;
      if(dist>maxDist)return;
      const dot=(dx*facing.x+dz*facing.z)/(dist||1);
      // If bodies are nearly touching, always let the punch connect. At longer range
      // use a generous forward arc so a visually aligned punch is not rejected.
      const touching=dist<=(attacker.radius+(t.radius||CFG.BODY_RADIUS)+.42);
      if(!touching&&dot<.02)return;
      const sidePenalty=(1-Math.max(-.1,dot))*.42;
      candidates.push({t,dx,dz,dist,dot,score:dist+sidePenalty});
    });
    candidates.sort((a,b)=>a.score-b.score);const hit=candidates[0];if(!hit)return null;
    const radial=new THREE.Vector3(hit.dx/(hit.dist||1),0,hit.dz/(hit.dist||1));
    const dir=radial.multiplyScalar(.64).add(facing.clone().multiplyScalar(.36)).normalize();
    const strength=attacker.punchForce*(attacker.attackPowerMult||1)*(1.12-Math.min(1,hit.dist/Math.max(.01,CFG.PUNCH_RANGE))*.12);
    const strong=hit.t.applyHit(attacker,dir.clone().multiplyScalar(strength),CFG.PUNCH_LIFT);
    addImpact(hit.t,dir,strong);
    if(window.Game&&Game.impactShake)Game.impactShake(strong?.24:(attacker.attackKind==='kick'?.20:.14));
    return hit.t;
  }
  function resolveBodies(fighters){
    for(let i=0;i<fighters.length;i++){
      const a=fighters[i];if(!a.alive)continue;
      for(let j=i+1;j<fighters.length;j++){
        const b=fighters[j];if(!b.alive||Math.abs(a.pos.y-b.pos.y)>1.2)continue;const dx=b.pos.x-a.pos.x,dz=b.pos.z-a.pos.z,d=Math.hypot(dx,dz),min=a.radius+b.radius;
        if(d>0&&d<min){
          const nx=dx/d,nz=dz/d,overlap=min-d,teamFactor=a.team===b.team?.65:1;a.pos.x-=nx*overlap*.5*teamFactor;a.pos.z-=nz*overlap*.5*teamFactor;b.pos.x+=nx*overlap*.5*teamFactor;b.pos.z+=nz*overlap*.5*teamFactor;
          const push=(a.team===b.team?.28:.52);a.vel.x-=nx*push;a.vel.z-=nz*push;b.vel.x+=nx*push;b.vel.z+=nz*push;
          const ad=a.dashTimer>0,bd=b.dashTimer>0;if(ad!==bd){const attacker=ad?a:b,target=ad?b:a;if(attacker.team===target.team)continue;const key=attacker.id+'>'+target.id;if(!dashHitPairs.has(key)){dashHitPairs.add(key);const dir=new THREE.Vector3(target.pos.x-attacker.pos.x,0,target.pos.z-attacker.pos.z).normalize();const strong=target.applyHit(attacker,dir.clone().multiplyScalar(attacker.punchForce*.90),2.65);addImpact(target,dir,strong);if(window.Game&&Game.impactShake)Game.impactShake(strong?.24:.17);}}
        }
      }
    }
  }
  function onKO(killer,victim){UI.addKillFeed(`${killer.name} knocked out ${victim.name}`,killer.team);if(window.Game&&Game.recordKO)Game.recordKO(killer);if(killer.model&&Math.random()<.32)killer.model.play('taunt',.05,true,1.0);if(killer.isHuman){Save.data.kos++;Save.data.mission.ko++;Save.commit();}}
  function onFall(victim){UI.addKillFeed(`${victim.name} fell off`,victim.team);}
  return{beginFrame,update,punch,resolveBodies,onKO,onFall};
})();
