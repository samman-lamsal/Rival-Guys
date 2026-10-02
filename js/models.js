window.Models = (()=>{
  const loader = new THREE.GLTFLoader();
  let kayClipsPromise = null;
  const propCache = new Map();
  const embeddedBytes = new Map();

  function decodeEmbedded(url){
    if(embeddedBytes.has(url)) return embeddedBytes.get(url).slice(0);
    const b64 = window.EMBEDDED_GLB && window.EMBEDDED_GLB[url];
    if(!b64) return null;
    const bin = atob(b64), bytes = new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
    embeddedBytes.set(url,bytes.buffer);
    return bytes.buffer.slice(0);
  }

  function parseGLB(buffer,url){
    return new Promise((resolve,reject)=>{
      try{ loader.parse(buffer,'',resolve,err=>reject(new Error(`GLB parse failed: ${url}: ${err&&err.message?err.message:err}`))); }
      catch(err){ reject(err); }
    });
  }

  function loadGLB(url){
    const embedded = decodeEmbedded(url);
    if(embedded) return parseGLB(embedded,url);
    let embeddedGltf = window.EMBEDDED_GLTF && window.EMBEDDED_GLTF[url];
    if(embeddedGltf){
      if(window.PLATFORMER_TEXTURE_URI && embeddedGltf.includes('__PLATFORMER_TEXTURE__')) embeddedGltf=embeddedGltf.split('__PLATFORMER_TEXTURE__').join(window.PLATFORMER_TEXTURE_URI);
      return new Promise((resolve,reject)=>{
        try{ loader.parse(embeddedGltf,'',resolve,err=>reject(new Error(`glTF parse failed: ${url}: ${err&&err.message?err.message:err}`))); }
        catch(err){ reject(err); }
      });
    }
    return new Promise((resolve,reject)=>loader.load(url,resolve,undefined,err=>reject(new Error(`GLB load failed: ${url}: ${err&&err.message?err.message:err}`))));
  }

  function loadKayClips(){
    if(kayClipsPromise) return kayClipsPromise;
    // Load the real KayKit combat/dodge/emote libraries supplied with the project.
    // This replaces the old "Throw/Interact as punch" fallback with proper unarmed fighting.
    kayClipsPromise = Promise.all([
      loadGLB('assets/models/kaykit/Rig_Medium_General.glb'),
      loadGLB('assets/models/kaykit/Rig_Medium_MovementBasic.glb'),
      loadGLB('assets/models/kaykit/Rig_Medium_CombatMelee.glb'),
      loadGLB('assets/models/kaykit/Rig_Medium_MovementAdvanced.glb'),
      loadGLB('assets/models/kaykit/Rig_Medium_Simulation.glb')
    ]).then(parts=>parts.flatMap(g=>g.animations||[]));
    return kayClipsPromise;
  }

  function normalize(root,targetHeight=1.9){
    root.position.set(0,0,0); root.rotation.set(0,0,0); root.scale.set(1,1,1); root.updateMatrixWorld(true);
    let box=new THREE.Box3().setFromObject(root),size=new THREE.Vector3(); box.getSize(size);
    if(!isFinite(size.y)||size.y<.001) throw new Error('Character model has invalid bounds');
    const s=targetHeight/size.y; root.scale.setScalar(s); root.updateMatrixWorld(true);
    box=new THREE.Box3().setFromObject(root); const center=new THREE.Vector3(); box.getCenter(center);
    root.position.set(-center.x,-box.min.y,-center.z); root.updateMatrixWorld(true);
    root.traverse(o=>{
      if(o.isMesh||o.isSkinnedMesh){
        o.frustumCulled=o.isSkinnedMesh?false:true; o.castShadow=!CFG.MOBILE_OPT; o.receiveShadow=!CFG.MOBILE_OPT;
        if(o.material){
          o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();
          (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{ if('side' in m)m.side=THREE.FrontSide; if('skinning' in m)m.skinning=!!o.isSkinnedMesh; m.needsUpdate=true; });
        }
      }
    });
  }

  function semanticMap(clips,type){
    const lower=clips.map(c=>({clip:c,name:(c.name||'').toLowerCase()}));
    const find=(...parts)=>{ for(const p of parts){ const term=String(p).toLowerCase(); const x=lower.find(c=>c.name.includes(term)); if(x)return x.clip; } return null; };
    if(type==='kaykit') return {
      idle:find('melee_unarmed_idle','idle_a','idle'), idle2:find('idle_b','idle_a'),
      walk:find('walking_a','walking_b','walking_c'), run:find('running_a','running_b'), runAlt:find('running_b','running_a'),
      jumpStart:find('jump_start'), jump:find('jump_idle','jump_full_short','jump'), land:find('jump_land'),
      // Real brawler clips from KayKit Character Animations 1.1.
      attack1:find('melee_unarmed_attack_punch_a','melee_unarmed_punch'),
      attack2:find('melee_unarmed_attack_kick','melee_unarmed_kick','melee_unarmed_attack_punch_a'),
      attack3:find('melee_block_attack','melee_unarmed_attack_punch_a'),
      attack4:find('melee_2h_attack_spin','melee_2h_attack_spinning','melee_unarmed_attack_kick'),
      // Extra KayKit melee clips used as bare-hand brawler motions. They all share
      // the same Rig_Medium skeleton as the Adventurers, so there is no retargeting jitter.
      attack5:find('melee_1h_attack_chop','melee_unarmed_attack_punch_a'),
      attack6:find('melee_1h_attack_slice_diagonal','melee_unarmed_attack_punch_a'),
      attack7:find('melee_1h_attack_slice_horizontal','melee_unarmed_attack_punch_a'),
      attack8:find('melee_1h_attack_stab','melee_unarmed_attack_punch_a'),
      attack9:find('melee_dualwield_attack_chop','melee_unarmed_attack_punch_a'),
      attack10:find('melee_dualwield_attack_slice','melee_2h_attack_slice','melee_unarmed_attack_punch_a'),
      punch:find('melee_unarmed_attack_punch_a','melee_unarmed_punch'),
      dash:find('dodge_forward','running_b','running_a'),
      hit:find('hit_b','hit_a','hit'), hit2:find('hit_a','hit_b','hit'),
      knockdown:find('lie_down','death_b','death_a'), downIdle:find('lie_idle'), getup:find('lie_standup','spawn_ground'),
      fall:find('death_b','death_a','death'),
      cheer:find('cheering','waving','pickup','interact'), taunt:find('waving','cheering','interact','idle_b'),
      emoteWave:find('waving','cheering','interact'), emoteCheer:find('cheering','waving'),
      emotePushups:find('push_ups','cheering'), emoteSit:find('sit_floor_down','sit_floor_idle','idle_b'),
      emoteThrow:find('throw','interact'), emotePickup:find('pickup','interact'), emoteInteract:find('interact','cheering'),
      emoteSneak:find('sneaking','walking_c'), emoteDodgeLeft:find('dodge_left','waving'), emoteDodgeRight:find('dodge_right','waving'),
      emoteCrouch:find('crouching','idle_b'), emoteCrawl:find('crawling','push_ups'),
      spawn:find('spawn_ground','spawn_air')
    };
    return {
      idle:find('|idle','idle'), idle2:find('|yes','yes','|idle','idle'), walk:find('|walk','walk'), run:find('|run','run'), runAlt:find('|run','run'),
      jumpStart:find('|jump|','jump'), jump:find('jump_idle','|jump|','jump'), land:find('jump_land','land'),
      // Quaternius fighter files already contain a proper Punch clip; keep the brawler consistent.
      attack1:find('|punch','punch'), attack2:find('|sword','sword','|punch','punch'),
      attack3:find('|punch','punch'), attack4:find('|sword','sword','|punch','punch'),
      attack5:find('|punch','punch'), attack6:find('|sword','sword','|punch','punch'),
      attack7:find('|punch','punch'), attack8:find('|sword','sword','|punch','punch'),
      attack9:find('|punch','punch'), attack10:find('|sword','sword','|punch','punch'), punch:find('|punch','punch'),
      dash:find('|run','run'), hit:find('hitreact','hit'), hit2:find('hitreact','hit'),
      knockdown:find('|death','death'), downIdle:null, getup:find('hitreact','hit','|yes','yes'), fall:find('|death','death'),
      cheer:find('|wave','wave','|yes','yes'), taunt:find('|yes','yes','|no','no','|wave','wave'),
      emoteWave:find('|wave','wave','|yes','yes'), emoteCheer:find('|yes','yes','|wave','wave'),
      emotePushups:find('|no','no','|yes','yes'), emoteSit:find('|idle','idle'), emoteThrow:find('|punch','punch'),
      emotePickup:find('|yes','yes'), emoteInteract:find('|wave','wave'), emoteSneak:find('|walk','walk'),
      emoteDodgeLeft:find('|jump|','jump'), emoteDodgeRight:find('|jump|','jump'), emoteCrouch:find('|no','no'), emoteCrawl:find('|death','death'),
      spawn:find('|yes','yes','|wave','wave')
    };
  }

  const PRIORITY={idle:0,idle2:0,walk:5,run:10,runAlt:10,jump:22,jumpStart:30,land:35,dash:45,cheer:55,taunt:55,emoteWave:56,emoteCheer:56,emotePushups:56,emoteSit:56,emoteThrow:56,emotePickup:56,emoteInteract:56,emoteSneak:56,emoteDodgeLeft:56,emoteDodgeRight:56,emoteCrouch:56,emoteCrawl:56,attack1:70,attack2:72,attack3:71,attack4:77,attack5:72,attack6:73,attack7:74,attack8:72,attack9:75,attack10:76,punch:70,hit:86,hit2:86,knockdown:94,downIdle:92,getup:95,fall:100,spawn:50};

  function buildAnimatedCharacter(skin,root,clips,targetHeight){
    normalize(root,targetHeight);
    const wrapper=new THREE.Group(); wrapper.add(root);
    const mixer=new THREE.AnimationMixer(root), sem=semanticMap(clips,skin.type),actions={};
    Object.keys(sem).forEach(k=>{if(sem[k]&&!actions[k])actions[k]=mixer.clipAction(sem[k]);});
    let current='',lockTimer=0,lockPriority=-1,currentOnce=false;

    const LOCK_RATIO={attack1:.46,attack2:.54,attack3:.47,attack4:.55,attack5:.48,attack6:.50,attack7:.50,attack8:.47,attack9:.53,attack10:.55,punch:.46,hit:.55,hit2:.55,knockdown:.78,downIdle:.10,getup:.88,jumpStart:.36,land:.24,dash:.72,spawn:.56,cheer:.64,taunt:.56,emoteWave:.78,emoteCheer:.82,emotePushups:.88,emoteSit:.78,emoteThrow:.72,emotePickup:.72,emoteInteract:.78,emoteSneak:.66,emoteDodgeLeft:.66,emoteDodgeRight:.66,emoteCrouch:.66,emoteCrawl:.78,fall:.90};
    const START_FRACTION={attack1:.050,attack2:.030,attack3:.030,attack4:.020,attack5:.030,attack6:.025,attack7:.025,attack8:.030,attack9:.020,attack10:.020,punch:.050,hit:.015,hit2:.015,knockdown:.01,getup:.01,dash:.015};
    function actionDuration(a,speed=1){ return Math.max(.10,(a&&a.getClip?a.getClip().duration:.5)/(Math.max(.05,speed))); }
    function play(name,fade=.12,once=false,speed=1,force=false){
      const requested=name, a=actions[requested]||actions.idle; if(!a)return false;
      const actual=actions[requested]?requested:'idle',pri=PRIORITY[actual]??0;
      if(!force && lockTimer>0 && pri<lockPriority) return false;
      if(current===actual && !once){ a.enabled=true;a.setEffectiveWeight(1);a.setEffectiveTimeScale(speed||1);if(!a.isRunning())a.play();return true; }
      const old=actions[current];
      a.enabled=true;a.reset();a.setEffectiveWeight(1);a.setEffectiveTimeScale(speed||1);
      // Skip tiny authored pre-rolls on combat actions so the pose reacts on the button press.
      const startFrac=START_FRACTION[actual]||0;
      if(startFrac>0&&a.getClip&&a.getClip().duration)a.time=a.getClip().duration*startFrac;
      a.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,once?1:Infinity);a.clampWhenFinished=once;a.play();
      if(old&&old!==a){
        old.enabled=true;
        const minFade=pri>=70?.006:.025;
        a.crossFadeFrom(old,Math.max(minFade,fade),false);
      }else a.fadeIn(Math.max(pri>=70?.006:.02,fade));
      current=actual;currentOnce=!!once;
      if(once){lockPriority=pri;lockTimer=actionDuration(a,speed)*(LOCK_RATIO[actual]??.72);}
      else if(force){lockTimer=0;lockPriority=-1;currentOnce=false;}
      return true;
    }
    function resetAnimation(){ Object.values(actions).forEach(a=>{try{a.stop();}catch(_){}}); current='';lockTimer=0;lockPriority=-1;currentOnce=false;play('idle',0,false,1,true); }
    function has(name){return !!actions[name];}
    function interruptForLocomotion(){
      // Movement should be able to cancel presentation-only one-shots (spawn, emote,
      // landing, dash tail), but never an active attack, hit reaction, knockdown or fall.
      if(lockTimer>0 && lockPriority<70){lockTimer=0;lockPriority=-1;currentOnce=false;return true;}
      return lockTimer<=0;
    }

    resetAnimation();
    return {
      skin,group:wrapper,root,mixer,actions,play,has,resetAnimation,interruptForLocomotion,
      update(dt){
        mixer.update(dt);
        if(lockTimer>0){
          lockTimer-=dt;
          if(lockTimer<=0){
            lockTimer=0;lockPriority=-1;currentOnce=false;
            // Do not snap to idle here. Fighter.update() selects the correct locomotion
            // animation in the same frame, so attack/hit -> run transitions stay smooth.
          }
        }
      },
      get locked(){return lockTimer>0;},
      get animationNames(){return clips.map(c=>c.name);}
    };
  }

  async function createCharacter(skinId,targetHeight=1.9){
    const skin=CFG.SKINS.find(s=>s.id===skinId)||CFG.SKINS[0],gltf=await loadGLB(skin.file),root=gltf.scene;
    const clips=skin.type==='kaykit'?await loadKayClips():(gltf.animations||[]),character=buildAnimatedCharacter(skin,root,clips,targetHeight);
    console.info(`[Rival Guys] fighter loaded: ${skin.name}; actions: ${Object.keys(character.actions).join(', ')}`);
    return character;
  }

  async function loadProp(path){
    if(!propCache.has(path))propCache.set(path,loadGLB(path)); const gltf=await propCache.get(path),root=gltf.scene.clone(true);
    root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}}); return root;
  }

  function createFallbackCharacter(targetHeight=1.9){
    const wrapper=new THREE.Group(),body=new THREE.Group();
    const skinMat=new THREE.MeshStandardMaterial({color:0xffc58f,roughness:.7}),suitMat=new THREE.MeshStandardMaterial({color:0x35b9ff,roughness:.6}),darkMat=new THREE.MeshStandardMaterial({color:0x17334a,roughness:.65});
    const torso=new THREE.Mesh(new THREE.CylinderGeometry(.42,.48,.95,12),suitMat);torso.position.y=.95;body.add(torso);const head=new THREE.Mesh(new THREE.SphereGeometry(.36,14,10),skinMat);head.position.y=1.75;body.add(head);
    const legs=[],arms=[],legGeo=new THREE.CylinderGeometry(.14,.17,.65,9);for(const x of[-.22,.22]){const leg=new THREE.Mesh(legGeo,darkMat);leg.position.set(x,.35,0);body.add(leg);legs.push(leg);}const armGeo=new THREE.CylinderGeometry(.11,.13,.66,9);for(const x of[-.56,.56]){const arm=new THREE.Mesh(armGeo,skinMat);arm.position.set(x,1.05,0);arm.rotation.z=x>0?-.25:.25;body.add(arm);arms.push(arm);}
    body.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});wrapper.add(body);wrapper.scale.setScalar(targetHeight/2.1);
    let state='idle',t=0,once=0;
    return {skin:{id:'fallback',name:'Fallback'},group:wrapper,root:body,mixer:null,actions:{},has(){return true;},resetAnimation(){state='idle';t=0;once=0;},play(name){state=name;t=0;once=['attack1','attack2','attack3','attack4','attack5','attack6','attack7','attack8','attack9','attack10','punch','hit','hit2','knockdown','getup','cheer','taunt','emoteWave','emoteCheer','emotePushups','emoteSit','emoteThrow','emotePickup','emoteInteract','emoteSneak','emoteDodgeLeft','emoteDodgeRight','emoteCrouch','emoteCrawl','fall','dash','land','spawn'].includes(name)?.55:0;return true;},update(dt){t+=dt;if(once>0){once-=dt;if(once<=0)state='idle';}const run=state==='run'||state==='dash',amp=run?.75:.08;arms[0].rotation.x=Math.sin(t*(run?10:2.2))*amp;arms[1].rotation.x=-arms[0].rotation.x;legs[0].rotation.x=-arms[0].rotation.x*.7;legs[1].rotation.x=arms[0].rotation.x*.7;if(['attack1','attack2','attack3','attack4','attack5','attack6','attack7','attack8','attack9','attack10','punch'].includes(state))arms[1].rotation.x=-1.7;if(state==='knockdown')body.rotation.z=1.05;else body.rotation.z*=.82;if(['cheer','taunt','emoteWave','emoteCheer','emoteInteract'].includes(state)){arms[0].rotation.z=2.4;arms[1].rotation.z=-2.4;}if(state==='emotePushups'||state==='emoteCrawl')body.rotation.x=-.75;body.position.y=Math.sin(t*2.2)*.025;},get locked(){return once>0;}};
  }

  return {createCharacter,createFallbackCharacter,loadProp,loadGLB};
})();
