window.Game = (()=>{
  let scene,camera,renderer,clock,arena,homeRoot,homeCharacter=null,homeToken=0,resultRoot=null,resultActors=[],resultEmoteClock=0;
  let state='boot',running=false,ending=false,roundTransition=false,roundStart=0,roundIndex=0,qualifierRound=0,finalSeries=false,currentMap=null,currentMode=CFG.MODES[1],botDifficulty=1;
  let homeDrag=false,homeDragMoved=false,homePointerId=null,homeLastX=0,homeSpinPause=0;
  let roundWins={blue:0,red:0},profiles=[],totalKills={},roundMapHistory=[],cameraShake=0;
  let perfFrames=0,perfTime=0,mobileDpr=Math.min(devicePixelRatio,1.2);
  const fighters=[];

  function wait(ms){return new Promise(r=>setTimeout(r,ms));}
  async function init(){
    const studioIntroStart=performance.now();
    scene=new THREE.Scene();scene.background=new THREE.Color(0x8bdfff);scene.fog=new THREE.Fog(0xbfe9ff,35,100);
    camera=new THREE.PerspectiveCamera(52,innerWidth/innerHeight,.1,180);camera.position.set(0,4.5,9);
    renderer=new THREE.WebGLRenderer({antialias:!CFG.MOBILE_OPT,alpha:false,powerPreference:'high-performance',precision:CFG.MOBILE_OPT?'mediump':'highp'});mobileDpr=Math.min(devicePixelRatio,1.2);renderer.setPixelRatio(CFG.MOBILE_OPT?mobileDpr:Math.min(devicePixelRatio,1.7));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=!CFG.MOBILE_OPT;renderer.shadowMap.type=CFG.MOBILE_OPT?THREE.BasicShadowMap:THREE.PCFSoftShadowMap;renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
    document.querySelector('#game').appendChild(renderer.domElement);
    const hemi=new THREE.HemisphereLight(0xffffff,0x6aa0c8,CFG.MOBILE_OPT?1.35:1.2);scene.add(hemi);const sun=new THREE.DirectionalLight(0xffffff,CFG.MOBILE_OPT?1.35:1.6);sun.position.set(12,22,9);sun.castShadow=!CFG.MOBILE_OPT;sun.shadow.mapSize.set(CFG.MOBILE_OPT?512:1536,CFG.MOBILE_OPT?512:1536);sun.shadow.camera.left=-28;sun.shadow.camera.right=28;sun.shadow.camera.top=28;sun.shadow.camera.bottom=-28;scene.add(sun);
    arena=new ArenaSystem(scene);arena.root.visible=false;buildHomeStage();buildResultStage();addEventListener('resize',onResize);
    const canvas=renderer.domElement;
    canvas.addEventListener('pointerdown',ev=>{
      if((state!=='home'&&state!=='select')||!homeCharacter)return;
      homeDrag=true;homeDragMoved=false;homePointerId=ev.pointerId;homeLastX=ev.clientX;homeSpinPause=4.0;
      if(canvas.setPointerCapture)try{canvas.setPointerCapture(ev.pointerId);}catch(_){ }
    });
    canvas.addEventListener('pointermove',ev=>{
      if(!homeDrag||ev.pointerId!==homePointerId||!homeCharacter)return;
      const dx=ev.clientX-homeLastX;homeLastX=ev.clientX;
      if(Math.abs(dx)>1.5)homeDragMoved=true;
      homeCharacter.group.rotation.y+=dx*0.014;
      homeSpinPause=4.0;
    });
    const finishHomeDrag=ev=>{
      if(!homeDrag||!homeCharacter)return;
      if(homePointerId!==null&&ev.pointerId!==undefined&&ev.pointerId!==homePointerId)return;
      const tap=!homeDragMoved;
      homeDrag=false;homePointerId=null;
      if(tap)emoteHome();
    };
    canvas.addEventListener('pointerup',finishHomeDrag);
    canvas.addEventListener('pointercancel',finishHomeDrag);
    canvas.addEventListener('lostpointercapture',()=>{homeDrag=false;homePointerId=null;});
    clock=new THREE.Clock();loop();const bootText=document.querySelector('#boot span');if(bootText)bootText.textContent='Preparing fighters and arenas…';await showHome();const introLeft=1650-(performance.now()-studioIntroStart);if(introLeft>0)await wait(introLeft);document.querySelector('#boot').classList.add('hidden');
  }
  function onResize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(CFG.MOBILE_OPT?mobileDpr:Math.min(devicePixelRatio,1.7));renderer.setSize(innerWidth,innerHeight);}
  function buildHomeStage(){
    homeRoot=new THREE.Group();scene.add(homeRoot);const podium=new THREE.Mesh(new THREE.CylinderGeometry(2.1,2.45,.75,48),new THREE.MeshStandardMaterial({color:0x5dc7ff,roughness:.45,metalness:.08}));podium.position.y=-.38;podium.castShadow=true;podium.receiveShadow=true;homeRoot.add(podium);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(2.05,.18,10,64),new THREE.MeshStandardMaterial({color:0xffd23f,roughness:.35,metalness:.2,emissive:0x7a4f00,emissiveIntensity:.2}));ring.rotation.x=Math.PI/2;ring.position.y=.03;homeRoot.add(ring);
    const back=new THREE.Mesh(new THREE.CircleGeometry(10,64),new THREE.MeshBasicMaterial({color:0x87ddff,transparent:true,opacity:.22}));back.position.set(0,4,-8);homeRoot.add(back);
  }
  function buildResultStage(){
    resultRoot=new THREE.Group();resultRoot.visible=false;scene.add(resultRoot);
    const matCenter=new THREE.MeshStandardMaterial({color:0xffd84d,roughness:.38,metalness:.08,emissive:0x6a3f00,emissiveIntensity:.12});
    const matSide=new THREE.MeshStandardMaterial({color:0x63d5ff,roughness:.42,metalness:.05});
    const base=new THREE.Mesh(new THREE.CylinderGeometry(3.35,3.65,.62,48),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.55}));base.position.y=-.48;resultRoot.add(base);
    const center=new THREE.Mesh(new THREE.CylinderGeometry(1.15,1.32,.55,36),matCenter);center.position.set(0,.0,0);resultRoot.add(center);
    for(const x of[-2.05,2.05]){const side=new THREE.Mesh(new THREE.CylinderGeometry(.92,1.05,.38,32),matSide);side.position.set(x,-.08,.18);resultRoot.add(side);}
    const ring=new THREE.Mesh(new THREE.TorusGeometry(3.28,.12,10,64),new THREE.MeshStandardMaterial({color:0xff4d70,roughness:.35,emissive:0x5c1022,emissiveIntensity:.12}));ring.rotation.x=Math.PI/2;ring.position.y=-.14;resultRoot.add(ring);
    for(let i=0;i<10;i++){const a=i*Math.PI*2/10,r=4.1+(i%2)*.55,star=new THREE.Mesh(new THREE.OctahedronGeometry(.14+(i%3)*.03,0),new THREE.MeshBasicMaterial({color:i%2?0xffd84d:0x59cfff,transparent:true,opacity:.9}));star.position.set(Math.cos(a)*r,1.6+(i%3)*.55,-1.4+Math.sin(a)*1.1);star.rotation.set(a*.3,a,a*.2);resultRoot.add(star);}
  }
  function resultEmoteFor(f,index){
    if(!f||!f.model)return;
    let action='cheer';
    if(f.isHuman){const id=(Save.data.equippedEmotes||[])[index%4]||(Save.data.equippedEmotes||[])[0]||'cheer';const def=CFG.EMOTES.find(e=>e.id===id);action=def&&def.action||'cheer';}
    else{const pool=['cheer','taunt','emoteWave','emoteCheer','emoteInteract','emoteDodgeLeft','emoteDodgeRight'];action=pool[(Math.random()*pool.length)|0];if(f.model.has&&!f.model.has(action))action='cheer';}
    f.model.play(action,.06,true,1.0,true);
  }
  function prepareResultStage(team){
    arena.root.visible=false;homeRoot.visible=false;resultRoot.visible=true;resultActors=[];resultEmoteClock=0;
    fighters.forEach(f=>{f.group.visible=false;if(f.teamRing)f.teamRing.visible=false;if(f.playerArrow)f.playerArrow.visible=false;});
    let winners=fighters.filter(f=>f.team===team).slice().sort((a,b)=>(totalKills[b.id]||0)-(totalKills[a.id]||0));
    const human=winners.find(f=>f.isHuman);if(human){winners=winners.filter(f=>f!==human);winners.unshift(human);}winners=winners.slice(0,3);
    const slots=winners.length===1?[0]:winners.length===2?[-1.35,1.35]:[0,-2.05,2.05];
    winners.forEach((f,i)=>{f.group.visible=true;f.group.scale.setScalar(i===0?1.14:.92);f.group.position.set(slots[i],i===0?.54:.26,0);f.group.rotation.set(0,Math.PI,0);f.vel.set(0,0,0);f.stun=0;f.hitState='';if(f.dizzyGroup)f.dizzyGroup.visible=false;resultActors.push(f);resultEmoteFor(f,i);});
    camera.position.set(0,4.0,9.0);camera.lookAt(0,1.1,0);
  }
  async function changeHomeSkin(id){
    const token=++homeToken;if(homeCharacter){homeRoot.remove(homeCharacter.group);homeCharacter=null;}
    try{const c=await Models.createCharacter(id,3.15);if(token!==homeToken)return;homeCharacter=c;c.group.position.set(0,.04,0);homeRoot.add(c.group);c.play('idle',0,false);}
    catch(e){console.error('[Rival Guys] home fighter load failed',e);if(token!==homeToken)return;const c=Models.createFallbackCharacter(3.15);homeCharacter=c;c.group.position.set(0,.04,0);homeRoot.add(c.group);UI.toast('Model fallback loaded — check browser console');}
  }
  function emoteHome(emoteId){if(!homeCharacter)return;const id=emoteId||Save.data.selectedHomeEmote||(Save.data.equippedEmotes||[])[0]||'wave';const def=CFG.EMOTES.find(e=>e.id===id)||CFG.EMOTES[0];homeCharacter.play(def.action||'cheer',.05,true,1,true);}
  async function showHome(){
    state='home';running=false;ending=false;document.body.classList.remove('in-match');arena.root.visible=false;if(resultRoot)resultRoot.visible=false;homeRoot.visible=true;fighters.forEach(f=>scene.remove(f.group));fighters.length=0;
    camera.position.set(0,3.05,7.0);camera.lookAt(0,1.35,0);UI.showHome();if(!homeCharacter||homeCharacter.skin.id!==Save.data.selectedSkin)await changeHomeSkin(Save.data.selectedSkin);homeSpinPause=0;homeDrag=false;homePointerId=null;
  }
  async function showBattleSelect(){
    if(state==='round'||state==='lobby')return;state='select';running=false;ending=false;arena.root.visible=false;if(resultRoot)resultRoot.visible=false;homeRoot.visible=true;camera.position.set(0,3.0,7.25);camera.lookAt(0,1.35,0);UI.showBattleSelect();if(!homeCharacter||homeCharacter.skin.id!==Save.data.selectedSkin)await changeHomeSkin(Save.data.selectedSkin);emoteHome();
  }

  function makeProfiles(mode){
    const used=new Set(),out=[];
    // Mix personalities deliberately so a lobby does not accidentally become 6 identical Bully bots.
    const personalityDeck=Util.shuffle(['Bully','Camper','Trickster','Rookie','Camper','Trickster','Rookie','Bully']);
    let pi=0;
    function profile(team,index){
      let name;do{name=BotNames[(Math.random()*BotNames.length)|0];}while(used.has(name));used.add(name);
      const personality=personalityDeck[pi++%personalityDeck.length];
      const skill=team==='red'?Util.rand(.52,.94):Util.rand(.36,.84);return {name,skill,personality,skinId:Util.pick(CFG.SKINS).id,team,index};
    }
    for(let i=0;i<mode.teamSize-1;i++)out.push(profile('blue',i));
    for(let i=0;i<mode.teamSize;i++)out.push(profile('red',i));
    return out;
  }
  async function setupFighters(){
    fighters.forEach(f=>scene.remove(f.group));fighters.length=0;totalKills={};
    const human=new Fighter({id:'human',name:'YOU',isHuman:true,team:'blue',skinId:Save.data.selectedSkin,skill:1,personality:'You',stats:Object.assign({},Save.data.upgrades)});human.matchEliminated=false;fighters.push(human);totalKills.human=0;
    profiles.forEach((p,i)=>{const remote=new BotRemotePlayer(p);const f=new Fighter({id:'bot'+i,name:p.name,team:p.team,skinId:p.skinId,skill:p.skill,personality:p.personality,remote,spawnIndex:i+1});f.matchEliminated=false;fighters.push(f);totalKills[f.id]=0;});
    await Promise.all(fighters.map(f=>f.load().catch(e=>console.error('fighter load',f.id,e))));fighters.forEach(f=>scene.add(f.group));
  }
  async function startPlay(modeId){
    if(state==='lobby'||state==='round')return;
    AudioFX.init();if(window.RivalAds){RivalAds.resetSession();RivalAds.init();}currentMode=CFG.MODES.find(m=>m.id===modeId)||CFG.MODES[1];Save.setMode(currentMode.id);state='lobby';homeRoot.visible=false;if(resultRoot)resultRoot.visible=false;arena.root.visible=true;
    profiles=makeProfiles(currentMode);roundMapHistory=[];currentMap=null;
    roundWins={blue:0,red:0};roundIndex=0;qualifierRound=0;finalSeries=currentMode.teamSize<=2;botDifficulty=1;cameraShake=0;
    UI.showLobbyUI(null,profiles,currentMode);UI.lobbyCountdown('FINDING PLAYERS…');const loadPromise=setupFighters();
    const joins=(async()=>{let count=1;const order=Util.shuffle(profiles.slice());for(const p of order){await wait(180+Math.random()*150);count++;UI.addLobbyPlayer(p,count,currentMode.total);}UI.lobbyCountdown('TEAMS LOCKED • FIRST ARENA READY');})();
    await Promise.all([loadPromise,joins,wait(4200)]);await wait(450);startNextRound();
  }
  function orderedForSpawns(){
    // Interleave teams around the spawn ring so every red bot starts near a different opponent
    // instead of the entire enemy team choosing the same nearest player.
    const blue=Util.shuffle(fighters.filter(f=>f.team==='blue'&&!f.matchEliminated).slice()),red=Util.shuffle(fighters.filter(f=>f.team==='red'&&!f.matchEliminated).slice()),out=[];
    const humanIndex=blue.findIndex(f=>f.isHuman);if(humanIndex>0)[blue[0],blue[humanIndex]]=[blue[humanIndex],blue[0]];
    const n=Math.max(blue.length,red.length);for(let i=0;i<n;i++){if(blue[i])out.push(blue[i]);if(red[i])out.push(red[i]);}return out;
  }
  function nextRoundTeamCap(roundNo){
    const start=currentMode.teamSize;
    if(start<=2)return 2;
    if(start<=4)return roundNo<=1?3:2;
    if(start<=8){if(roundNo<=1)return 6;if(roundNo===2)return 4;return 2;}
    return Math.max(2,Math.ceil(start/2));
  }
  function activeMatchFighters(team){return fighters.filter(f=>!f.matchEliminated&&(!team||f.team===team));}
  function prepareQualificationForNextRound(){
    const cap=nextRoundTeamCap(qualifierRound),summary={blue:[],red:[]};
    for(const team of ['blue','red']){
      const pool=activeMatchFighters(team);
      // Fighters who fell are always out. If more than the next-stage cap survive,
      // keep the best surviving performers so the tournament reliably narrows to 2v2.
      const alive=pool.filter(f=>f.alive).sort((a,b)=>((totalKills[b.id]||0)-(totalKills[a.id]||0))||((a.impactMeter||0)-(b.impactMeter||0))||(Math.random()-.5));
      // If the user survived the round, never remove them just because of a bracket cut.
      // A surviving human always occupies one qualification slot.
      let chosen=alive.slice(0,cap);const humanAlive=alive.find(f=>f.isHuman);
      if(humanAlive&&cap>0&&!chosen.includes(humanAlive)){chosen=chosen.slice(0,Math.max(0,cap-1));chosen.unshift(humanAlive);}
      const minimum=Math.min(2,cap,pool.length);
      if(chosen.length<minimum){
        const fallen=pool.filter(f=>!chosen.includes(f)).sort((a,b)=>(b.lastHitAt||0)-(a.lastHitAt||0)||((totalKills[b.id]||0)-(totalKills[a.id]||0)));
        while(chosen.length<minimum&&fallen.length)chosen.push(fallen.shift());
      }
      const keep=new Set(chosen.map(f=>f.id));
      pool.forEach(f=>{
        if(!keep.has(f.id)){f.matchEliminated=true;f.alive=false;f.elimTimer=0;f.group.visible=false;}
      });
      summary[team]=activeMatchFighters(team);
    }
    const b=summary.blue.length,r=summary.red.length;
    if(b&&r)UI.showEvent(`QUALIFIED • ${b} VS ${r}`);
    return summary;
  }

  async function startNextRound(){
    state='round';running=false;ending=false;roundTransition=true;
    const nextRound=(finalSeries?roundIndex:qualifierRound)+1;
    // Pick the arena only after the lobby is locked / previous round is finished.
    // The in-match history makes every round different until the full six-map pool is exhausted.
    currentMap=Meta.chooseRoundMap(roundMapHistory);
    roundMapHistory.push(currentMap.id);
    Save.rememberMap(currentMap.id);
    await UI.arenaRoulette(currentMap,nextRound,nextRound===1,finalSeries?'final':'qualifier');
    UI.arenaLoading(34,`LOADING ${currentMap.name.toUpperCase()}…`);
    const buildPromise=arena.build(currentMap.id);
    await wait(260);UI.arenaLoading(68,'BUILDING ARENA…');
    await buildPromise;arena.root.visible=true;UI.arenaLoading(90,'SPAWNING FIGHTERS…');
    fighters.filter(f=>f.matchEliminated).forEach(f=>{f.alive=false;f.elimTimer=0;f.group.visible=false;});
    const ordered=orderedForSpawns(),spawns=arena.getSpawnPoints(Math.max(ordered.length,1));
    const offset=nextRound>1?Math.floor(Math.random()*spawns.length):0;
    ordered.forEach((f,i)=>f.reset(spawns[(i+offset)%spawns.length]));
    if(finalSeries)roundIndex=nextRound;else qualifierRound=nextRound;await UI.arenaReady();
    roundTransition=false;UI.startHUD(currentMap,finalSeries?roundIndex:qualifierRound,roundWins,currentMode,finalSeries?'final':'qualifier');UI.updateHUD(CFG.ROUND_TIME,activeMatchFighters('blue').length,activeMatchFighters('red').length);
    for(let n=3;n>=0;n--){UI.countdown(n);AudioFX.sfx.countdown(n);await wait(n===0?650:850);}roundStart=performance.now()/1000;running=true;
  }
  function recordKO(f){totalKills[f.id]=(totalKills[f.id]||0)+1;}
  function getFighter(id){return fighters.find(f=>f.id===id)||null;}
  function worldState(){return {fighters,human:getFighter('human'),arena,botDifficulty,elapsed:running?performance.now()/1000-roundStart:0,mode:currentMode};}
  function teamStats(team){const fs=fighters.filter(f=>f.team===team&&!f.matchEliminated),alive=fs.filter(f=>f.alive);return {fighters:fs,alive,kos:fs.reduce((s,f)=>s+(f.kills||0),0),edge:alive.length?alive.reduce((s,f)=>s+arena.edgeDanger(f.pos.x,f.pos.z,f.pos.y),0)/alive.length:9};}
  function chooseTimeoutTeam(){const b=teamStats('blue'),r=teamStats('red');const score=s=>s.alive.length*1000+s.kos*100-s.edge*25;if(score(b)===score(r))return Math.random()<.5?'blue':'red';return score(b)>score(r)?'blue':'red';}
  async function endRound(team){
    if(ending)return;ending=true;running=false;roundTransition=true;team=team||chooseTimeoutTeam();Save.data.rounds++;Save.commit();
    const humanWon=team==='blue';botDifficulty=humanWon?CFG.BOT_RUBBER_WIN:CFG.BOT_RUBBER_LOSS;
    fighters.filter(f=>f.alive&&f.team===team).forEach(f=>f.model&&f.model.play('cheer',.04,true,1.05));
    if(finalSeries){
      roundWins[team]=(roundWins[team]||0)+1;
      UI.updateWins(roundWins);UI.roundBanner(humanWon?'BLUE TEAM WINS ROUND!':'RED TEAM WINS ROUND',humanWon);humanWon?AudioFX.sfx.win():AudioFX.sfx.lose();await wait(2200);
      const reached=(roundWins[team]||0)>=CFG.WINS_TO_MATCH;
      if(reached||roundIndex>=CFG.MAX_ROUNDS){if(window.RivalAds)await RivalAds.showInterstitial('match-complete');roundTransition=false;endMatch();return;}
      if(window.RivalAds)await RivalAds.onRoundComplete('between-final-rounds');
      await wait(500);await startNextRound();return;
    }
    UI.roundBanner(humanWon?'BLUE TEAM WINS QUALIFIER!':'RED TEAM WINS QUALIFIER',humanWon);humanWon?AudioFX.sfx.win():AudioFX.sfx.lose();await wait(1900);
    if(window.RivalAds)await RivalAds.onRoundComplete('between-qualifiers');
    const qualified=prepareQualificationForNextRound();
    if(qualified.blue.length<=2&&qualified.red.length<=2){
      finalSeries=true;roundWins={blue:0,red:0};roundIndex=0;UI.updateWins(roundWins);UI.showEvent('FINAL 2 VS 2 • FIRST TO 3');await wait(1300);await startNextRound();return;
    }
    await wait(650);await startNextRound();
  }
  function endMatch(){
    running=false;ending=false;state='results';const blueWins=roundWins.blue||0,redWins=roundWins.red||0,championTeam=blueWins===redWins?(teamStats('blue').kos>=teamStats('red').kos?'blue':'red'):(blueWins>redWins?'blue':'red');
    const win=championTeam==='blue',kills=totalKills.human||0,rewards=Meta.applyMatchRewards(win,kills);const rows=fighters.map(f=>({name:f.name,team:f.team,kos:totalKills[f.id]||0})).sort((a,b)=>a.team.localeCompare(b.team)||b.kos-a.kos);
    prepareResultStage(championTeam);
    UI.showResults({win,champion:win?'YOUR TEAM WINS!':'RIVALS WIN',kills,rewards,scoreRows:rows,mode:currentMode});win?AudioFX.sfx.win():AudioFX.sfx.lose();
  }
  function impactShake(amount=.12){cameraShake=Math.min(.42,cameraShake+Math.max(0,amount));}
  function updateCamera(dt){
    if(roundTransition||ending){
      UI.spectate(false);const h=currentMode.teamSize>=8?20:17,z=currentMode.teamSize>=8?21:18;
      const desired=new THREE.Vector3(0,h,z),look=new THREE.Vector3(0,1.0,0);camera.position.lerp(desired,1-Math.pow(.0015,dt));camera.lookAt(look);cameraShake=Math.max(0,cameraShake-dt*1.8);return;
    }
    const human=getFighter('human');let target=human;
    if(!target||!target.alive){target=fighters.find(f=>f.alive&&f.team==='blue')||fighters.find(f=>f.alive)||null;UI.spectate(!!target&&target.id!=='human');}else UI.spectate(false);
    if(!target){const desired=new THREE.Vector3(0,17,18);camera.position.lerp(desired,1-Math.pow(.002,dt));camera.lookAt(0,0,0);return;}
    const size=currentMode.teamSize>=8?1.18:currentMode.teamSize>=4?1.06:1;
    const desired=new THREE.Vector3(target.pos.x,target.pos.y+10.7*size,target.pos.z+13.6*size),look=new THREE.Vector3(target.pos.x,target.pos.y+.85,target.pos.z-.45);
    camera.position.lerp(desired,1-Math.pow(.0022,dt));
    if(cameraShake>0){const a=cameraShake;camera.position.x+=Util.rand(-a,a);camera.position.y+=Util.rand(-a*.55,a*.55);camera.position.z+=Util.rand(-a,a);cameraShake=Math.max(0,cameraShake-dt*2.7);}
    camera.lookAt(look);
  }
  function tuneMobileQuality(dt){
    if(!CFG.MOBILE_OPT||!renderer)return;perfTime+=dt;perfFrames++;if(perfTime<2.5)return;
    const fps=perfFrames/perfTime;let next=mobileDpr;if(fps<42)next=Math.max(.82,mobileDpr-.12);else if(fps<50)next=Math.max(.92,mobileDpr-.06);else if(fps>57)next=Math.min(Math.min(devicePixelRatio,1.2),mobileDpr+.04);
    perfFrames=0;perfTime=0;if(Math.abs(next-mobileDpr)>.025){mobileDpr=next;renderer.setPixelRatio(mobileDpr);renderer.setSize(innerWidth,innerHeight,false);}
  }
  function loop(){
    requestAnimationFrame(loop);const dt=Math.min(.05,clock?clock.getDelta():.016);tuneMobileQuality(dt);
    if((state==='home'||state==='select')&&homeCharacter){
      homeCharacter.update(dt);
      if(!homeDrag){
        if(homeSpinPause>0)homeSpinPause=Math.max(0,homeSpinPause-dt);
        else homeCharacter.group.rotation.y+=dt*.16;
      }
    }
    if(state==='results'){
      resultEmoteClock+=dt;resultActors.forEach((f,i)=>{if(f.model)f.model.update(dt);f.group.rotation.y+=dt*(i===0?.08:.045);});
      if(resultEmoteClock>2.75){resultEmoteClock=0;resultActors.forEach((f,i)=>resultEmoteFor(f,i));}
      const desired=new THREE.Vector3(0,4.0,9.0);camera.position.lerp(desired,1-Math.pow(.0018,dt));camera.lookAt(0,1.1,0);
    }
    if(state==='round'){
      if(!running)fighters.forEach(f=>{if(f.model)f.model.update(dt);});
      if(running){
        const elapsed=performance.now()/1000-roundStart;Combat.beginFrame();arena.update(dt,elapsed,fighters);fighters.forEach(f=>f.update(dt,arena));Combat.resolveBodies(fighters);Combat.update(dt);Input.resetActions();updateCamera(dt);
        const blueAlive=fighters.filter(f=>f.alive&&!f.matchEliminated&&f.team==='blue').length,redAlive=fighters.filter(f=>f.alive&&!f.matchEliminated&&f.team==='red').length;UI.updateHUD(CFG.ROUND_TIME-elapsed,blueAlive,redAlive);
        if(!ending){
          const totalAlive=blueAlive+redAlive;
          // Do not make the last surviving fighter stand around until the timer expires.
          // A total of one fighter (or a complete team wipe) ends the round immediately.
          const decisiveFinish=totalAlive<=1||blueAlive===0||redAlive===0;
          if(decisiveFinish){
            let team;if(blueAlive===0&&redAlive>0)team='red';else if(redAlive===0&&blueAlive>0)team='blue';else team=chooseTimeoutTeam();
            endRound(team);
          }else if(elapsed>=60){
            // Before 60 seconds, qualifiers keep fighting unless the round is decisively over.
            // After 60 seconds, reaching the next bracket size may advance the tournament.
            const nextCap=nextRoundTeamCap(qualifierRound),qualificationReached=!finalSeries&&(blueAlive<=nextCap||redAlive<=nextCap);
            const finalRoundDone=finalSeries&&elapsed>=CFG.ROUND_TIME;
            if(qualificationReached||finalRoundDone||elapsed>=CFG.ROUND_TIME){
              const team=chooseTimeoutTeam();endRound(team);
            }
          }
        }
      }else updateCamera(dt);
    }
    renderer.render(scene,camera);
  }
  return {init,startPlay,showHome,showBattleSelect,changeHomeSkin,emoteHome,getFighter,worldState,recordKO,impactShake,get fighters(){return fighters;},get arena(){return arena;},get mode(){return currentMode;},get currentMap(){return currentMap;},get roundMapHistory(){return roundMapHistory.slice();}};
})();

document.addEventListener('DOMContentLoaded',()=>Game.init().catch(err=>{console.error('[Rival Guys] init failed',err);const b=document.querySelector('#boot span');if(b)b.textContent='Startup error — open browser console';}));
