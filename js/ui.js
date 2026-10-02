window.UI = (()=>{
  const $=s=>document.querySelector(s);
  const home=$('#home-ui'),select=$('#battle-select'),modal=$('#modal'),hud=$('#hud'),lobby=$('#lobby-ui'),transition=$('#arena-transition'),results=$('#results-ui');
  let eventTimer=null,resultAdUsed=false;
  function buttonSound(el){if(!el||el._soundBound)return;el._soundBound=true;el.addEventListener('pointerdown',()=>AudioFX.sfx.click());}
  document.querySelectorAll('button').forEach(buttonSound);

  function updateTop(){document.querySelectorAll('[data-coins]').forEach(e=>e.textContent=Save.data.coins.toLocaleString());document.querySelectorAll('[data-gems]').forEach(e=>e.textContent=Save.data.gems.toLocaleString());document.querySelectorAll('[data-level]').forEach(e=>e.textContent=Save.level());}
  addEventListener('savechange',()=>{updateTop();refreshHome();if(!select.classList.contains('hidden'))renderBattleSelect();});
  function showOnly(name){[home,select,hud,lobby,transition,results].forEach(e=>e.classList.add('hidden'));modal.classList.add('hidden');if(name==='home')home.classList.remove('hidden');if(name==='select')select.classList.remove('hidden');if(name==='hud')hud.classList.remove('hidden');if(name==='lobby')lobby.classList.remove('hidden');if(name==='transition')transition.classList.remove('hidden');if(name==='results')results.classList.remove('hidden');}
  function showHome(){showOnly('home');updateTop();refreshHome();}
  function refreshHome(){
    $('#level-badge').textContent='LV '+Save.level();$('#xp-label').textContent=`${Save.data.xp%250}/250 XP`;$('#xp-fill').style.width=`${(Save.data.xp%250)/2.5}%`;
    const skin=CFG.SKINS.find(s=>s.id===Save.data.selectedSkin)||CFG.SKINS[0],mode=CFG.MODES.find(m=>m.id===Save.data.selectedMode)||CFG.MODES[1];$('#skin-name').textContent=skin.name;$('#home-mode-label').textContent=`${mode.label} TEAM BATTLE`;
  }

  function modeIcon(size){return Array.from({length:Math.min(size,4)},()=>'<i></i>').join('');}
  function renderBattleSelect(){
    const mode=CFG.MODES.find(m=>m.id===Save.data.selectedMode)||CFG.MODES[1],skin=CFG.SKINS.find(s=>s.id===Save.data.selectedSkin)||CFG.SKINS[0];
    $('#selected-mode-pill').textContent=mode.short;$('#find-match-sub').textContent=`${mode.label} • BEST OF 5`;
    $('#mode-cards').innerHTML=CFG.MODES.map(m=>`<button class="mode-card ${m.id===mode.id?'selected':''}" data-mode="${m.id}"><div class="mode-tag">${m.tag}</div><div class="mode-people ${m.id}">${modeIcon(m.teamSize)}<b>VS</b>${modeIcon(m.teamSize)}</div><strong>${m.label}</strong><small>${m.desc}</small></button>`).join('');
    $('#select-skins').innerHTML=CFG.SKINS.map((s,i)=>{const owned=Save.ownsSkin(s.id);return `<button class="select-skin ${s.id===skin.id?'selected':''} ${owned?'owned':'locked-skin'}" ${owned?`data-select-skin="${s.id}"`:`data-locked-skin="${s.id}"`}><span>${owned?String(i+1).padStart(2,'0'):'🔒'}</span><b>${s.name}</b><small>${owned?(s.type==='kaykit'?'ADVENTURER':'CHAMPION'):Meta.priceText(s)}</small></button>`;}).join('');
    // Always render eight roster rows per side so the battle panel never changes
    // size when switching 2v2 / 4v4 / 8v8. Unused rows stay invisible placeholders.
    const blues=[];for(let i=0;i<8;i++){
      if(i<mode.teamSize)blues.push(i===0?`<div class="team-slot you"><span>${skin.name[0]}</span><div><b>YOU</b><small>${skin.name}</small></div></div>`:`<div class="team-slot waiting"><span>+</span><div><b>ALLY ${i}</b><small>Searching…</small></div></div>`);
      else blues.push(`<div class="team-slot empty-slot" aria-hidden="true"><span>•</span><div><b>EMPTY</b><small>—</small></div></div>`);
    }
    const reds=[];for(let i=0;i<8;i++){
      if(i<mode.teamSize)reds.push(`<div class="team-slot waiting"><span>?</span><div><b>RIVAL ${i+1}</b><small>Searching…</small></div></div>`);
      else reds.push(`<div class="team-slot empty-slot" aria-hidden="true"><span>•</span><div><b>EMPTY</b><small>—</small></div></div>`);
    }
    $('#blue-slots').innerHTML=blues.join('');$('#red-slots').innerHTML=reds.join('');
    select.querySelectorAll('[data-mode]').forEach(b=>{buttonSound(b);b.onclick=()=>{Save.setMode(b.dataset.mode);AudioFX.sfx.reward();};});
    select.querySelectorAll('[data-select-skin]').forEach(b=>{buttonSound(b);b.onclick=async()=>{Save.setSkin(b.dataset.selectSkin);await Game.changeHomeSkin(b.dataset.selectSkin);Game.emoteHome();};});
    select.querySelectorAll('[data-locked-skin]').forEach(b=>{buttonSound(b);b.onclick=()=>{const s=CFG.SKINS.find(x=>x.id===b.dataset.lockedSkin);toast(`Unlock ${s?s.name:'this fighter'} in FIGHTERS`);};});
  }
  function showBattleSelect(){showOnly('select');updateTop();renderBattleSelect();}

  function openModal(title,html){modal.classList.remove('hidden');$('#modal-title').textContent=title;$('#modal-body').innerHTML=html;modal.querySelectorAll('button').forEach(buttonSound);}
  function closeModal(){modal.classList.add('hidden');}$('#modal-close').onclick=closeModal;
  function missions(){const rows=Meta.missionDefs.map(d=>{const p=Save.data.mission[d.field]||0,done=p>=d.goal,claimed=!!Save.data.mission.claimed[d.id];return `<div class="task-row"><div><b>${d.label}</b><small>${Math.min(p,d.goal)}/${d.goal}</small></div><div class="task-reward">🪙 ${d.reward}</div><button class="mini-btn ${done&&!claimed?'green':'grey'}" data-claim="${d.id}" ${!done||claimed?'disabled':''}>${claimed?'CLAIMED':'CLAIM'}</button></div>`;}).join('');openModal('MISSIONS',rows);modal.querySelectorAll('[data-claim]').forEach(b=>b.onclick=()=>{Meta.claimMission(b.dataset.claim);missions();});}
  function walletStrip(){return `<div class="shop-wallet"><span>🪙 <b>${Save.data.coins.toLocaleString()}</b></span><span>◆ <b>${Save.data.gems.toLocaleString()}</b></span></div>`;}
  function upgrades(){
    const types=[['speed','⚡','Speed'],['punch','🥊','Punch Power'],['jump','⬆','Jump']];
    let html=walletStrip()+`<div class="shop-section-title"><b>CHARACTER SHOP</b><small>Unlock fighters permanently</small></div><div class="character-shop-grid">`;
    html+=CFG.SKINS.map(s=>{const owned=Save.ownsSkin(s.id),selected=Save.data.selectedSkin===s.id;return `<div class="shop-card fighter-shop-card ${owned?'owned':'locked'} ${selected?'selected':''}"><div class="shop-icon">${s.icon||'🥊'}</div><div class="shop-info"><b>${s.name}</b><small>${s.type==='kaykit'?'ADVENTURER':'CHAMPION'}</small></div><button class="shop-buy ${selected?'equipped':''}" data-shop-skin="${s.id}">${selected?'EQUIPPED':owned?'USE':Meta.priceText(s)}</button></div>`;}).join('');
    html+=`</div><div class="shop-section-title upgrade-title"><b>FIGHTER UPGRADES</b><small>Permanent account boosts</small></div>`;
    html+=types.map(([id,ic,n])=>{const lv=Save.data.upgrades[id]||0,c=Meta.upgradeCost(id);return `<div class="upgrade-row"><div class="upgrade-icon">${ic}</div><div class="grow"><b>${n}</b><div class="pips">${[0,1,2,3,4].map(i=>`<i class="${i<lv?'on':''}"></i>`).join('')}</div></div><button class="mini-btn blue" data-up="${id}" ${lv>=5?'disabled':''}>${lv>=5?'MAX':'🪙 '+c}</button></div>`;}).join('');
    openModal('FIGHTERS',html);
    modal.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>{const r=Meta.buyUpgrade(b.dataset.up);toast(r.msg);upgrades();});
    modal.querySelectorAll('[data-shop-skin]').forEach(b=>b.onclick=async()=>{const id=b.dataset.shopSkin;if(Save.ownsSkin(id)){Save.setSkin(id);await Game.changeHomeSkin(id);Game.emoteHome();upgrades();return;}const r=Meta.buySkin(id);toast(r.msg);if(r.ok){await Game.changeHomeSkin(id);Game.emoteHome();}upgrades();});
  }

  let activeEmoteSlot=0;
  function emotes(){
    const loadout=Save.data.equippedEmotes||[];
    let html=walletStrip()+`<div class="shop-section-title"><b>EMOTE LOADOUT</b><small>Tap a slot, then equip an emote • keys 1–4 in battle</small></div><div class="emote-loadout">`;
    html+=[0,1,2,3].map(i=>{const id=loadout[i],e=CFG.EMOTES.find(x=>x.id===id);return `<button class="emote-slot ${i===activeEmoteSlot?'active':''}" data-emote-slot="${i}"><span>${e?e.icon:'+'}</span><b>${e?e.name:'EMPTY'}</b><small>SLOT ${i+1}</small></button>`;}).join('');
    html+=`</div><div class="shop-section-title"><b>EMOTE SHOP</b><small>Coins and gems now have real uses</small></div><div class="emote-shop-grid">`;
    html+=CFG.EMOTES.map(e=>{const owned=Save.ownsEmote(e.id),equipped=loadout.includes(e.id);return `<div class="emote-card ${owned?'owned':'locked'} ${equipped?'equipped':''}"><div class="emote-icon">${e.icon}</div><div class="emote-copy"><b>${e.name}</b><small>${e.rarity}${equipped?' • EQUIPPED':''}</small></div><div class="emote-card-actions"><button class="emote-preview" data-preview-emote="${e.id}">▶</button><button class="shop-buy" data-emote-action="${e.id}">${owned?'EQUIP':Meta.priceText(e)}</button></div></div>`;}).join('');
    html+=`</div><p class="fineprint">Owned emotes stay unlocked. Slot 1 is also used when you tap your fighter on the home screen.</p>`;
    openModal('EMOTES',html);
    modal.querySelectorAll('[data-emote-slot]').forEach(b=>b.onclick=()=>{activeEmoteSlot=+b.dataset.emoteSlot;emotes();});
    modal.querySelectorAll('[data-preview-emote]').forEach(b=>b.onclick=()=>Game.emoteHome(b.dataset.previewEmote));
    modal.querySelectorAll('[data-emote-action]').forEach(b=>b.onclick=()=>{const id=b.dataset.emoteAction;if(!Save.ownsEmote(id)){const r=Meta.buyEmote(id);toast(r.msg);if(!r.ok){emotes();return;}}Save.equipEmote(id,activeEmoteSlot);Game.emoteHome(id);toast(`Equipped to slot ${activeEmoteSlot+1}`);emotes();});
  }

  function maps(){const lv=Save.level();const html=`<div class="map-grid">${CFG.MAPS.map(m=>`<div class="map-card ${lv<m.unlock?'locked':''}"><div class="map-thumb map-${m.id}"><span>${lv<m.unlock?'🔒':'★'}</span></div><b>${m.name}</b><small>${lv<m.unlock?'Appears in rotation • preference at Lv '+m.unlock:m.desc}</small></div>`).join('')}</div><div class="future-ban"><span>🚫</span><div><b>DAILY MAP BAN</b><small>Reserved for the future rewarded-ad feature.</small></div><button disabled>COMING SOON</button></div><p class="fineprint">Every round rotates to a different arena. A best-of-5 will not repeat a map until the available pool is exhausted.</p>`;openModal('MAPS',html);}
  function quests(){openModal('QUESTS',`<div class="quest-card"><b>🥊 Ring Cleaner</b><span>Score 5 KOs</span><div class="progress"><i style="width:${Math.min(100,(Save.data.mission.ko%5)/5*100)}%"></i></div></div><div class="quest-card"><b>🏆 Climb the Podium</b><span>Win a match</span><div class="progress"><i style="width:${Save.data.wins>0?100:0}%"></i></div></div><div class="quest-card"><b>🗺 Arena Tourist</b><span>Reach level 10 to unlock every map preference</span><div class="progress"><i style="width:${Math.min(100,Save.level()/10*100)}%"></i></div></div>`);}
  function wheel(){
    const rewarded=(window.RivalAds&&RivalAds.enabled)?`<button id="wheel-ad-coins" class="big-action blue">WATCH AD → +150 COINS</button><p class="ad-reward-note">Optional rewarded ad. Watch the full ad to receive 150 coins.</p>`:'';
    openModal('LUCKY WHEEL',`<div class="wheel-wrap"><div id="wheel-disc" class="wheel-disc"><span>50</span><span>100</span><span>💎</span><span>200</span><span>XP</span><span>500</span></div><div class="wheel-pointer">▼</div></div><button id="spin-wheel" class="big-action red">SPIN</button>${rewarded}<p class="fineprint">Free spin refreshes every 60 seconds.</p>`);
    $('#spin-wheel').onclick=()=>{const r=Meta.spinWheel();if(!r.ok){toast(`Ready in ${r.remaining}s`);return;}$('#wheel-disc').classList.add('spinning');setTimeout(()=>{toast(`+${r.reward.amount} ${r.reward.type.toUpperCase()}`);updateTop();},1500);};
    const adBtn=$('#wheel-ad-coins');if(adBtn)adBtn.onclick=async()=>{adBtn.disabled=true;adBtn.textContent='LOADING AD…';const r=await RivalAds.showRewarded('lucky-wheel-150-coins',()=>Save.addCoins(150));if(r.viewed){toast('+150 COINS');updateTop();}else{toast('Rewarded ad unavailable right now');adBtn.disabled=false;adBtn.textContent='WATCH AD → +150 COINS';}};
  }

  function showLobbyUI(map,profiles,mode){
    showOnly('lobby');$('#lobby-map-final').classList.remove('landed');$('#lobby-map-final').textContent='RANDOM AFTER LOCK';$('#lobby-players').innerHTML='';$('#lobby-count').textContent=`1/${mode.total}`;$('#lobby-mode-title').textContent=`${mode.label} LOBBY`;
    addLobbyPlayer({name:'YOU',skinId:Save.data.selectedSkin,personality:'You',team:'blue'},1,mode.total);
  }
  function mapClass(id){return id==='sky'?'map-sky':id==='bridges'?'map-bridges':id==='towers'?'map-towers':id==='sweeper'?'map-sweeper':id==='crumble'?'map-crumble':'map-wind';}
  async function arenaRoulette(map,round,isFirst=false,phase='final'){
    showOnly('transition');document.body.classList.remove('in-match');
    $('#arena-transition-kicker').textContent=isFirst?'TEAMS LOCKED • RANDOM ARENA':(phase==='qualifier'?'QUALIFIER COMPLETE • NEXT ARENA':'ROUND COMPLETE • NEXT ARENA');
    $('#arena-transition-round').textContent=phase==='qualifier'?`QUALIFIER ${round}`:`ROUND ${round} / ${CFG.MAX_ROUNDS}`;
    $('#arena-transition-status').textContent='ROLLING ARENAS…';$('#arena-load-fill').style.width='0%';
    const cards=$('#arena-roulette-cards');cards.innerHTML=CFG.MAPS.map(m=>`<div class="arena-roll-card ${mapClass(m.id)}" data-arena-card="${m.id}"><span class="swatch"></span><small>${m.name}</small></div>`).join('');
    const name=$('#arena-roulette-name'),pool=CFG.MAPS.slice();let last=-1;
    const spinStarted=performance.now(),minSpinMs=5200,steps=32;
    for(let i=0;i<steps;i++){
      let idx;
      if(i===steps-1)idx=pool.findIndex(m=>m.id===map.id);else{do{idx=(Math.random()*pool.length)|0;}while(idx===last&&pool.length>1);}
      last=idx;const pick=pool[idx];name.classList.remove('locked');name.textContent=pick.name.toUpperCase();name.classList.remove('tick');void name.offsetWidth;name.classList.add('tick');
      cards.querySelectorAll('.arena-roll-card').forEach(c=>c.classList.toggle('active',c.dataset.arenaCard===pick.id));
      if(AudioFX.started&&i%2===0)AudioFX.sfx.click();
      const t=i/Math.max(1,steps-1),delay=82+Math.pow(t,2.15)*170;await new Promise(r=>setTimeout(r,delay));
    }
    const remaining=minSpinMs-(performance.now()-spinStarted);if(remaining>0)await new Promise(r=>setTimeout(r,remaining));
    cards.querySelectorAll('.arena-roll-card').forEach(c=>{c.classList.remove('active');c.classList.toggle('selected',c.dataset.arenaCard===map.id);});
    name.textContent=map.name.toUpperCase();name.classList.remove('tick');name.classList.add('locked');$('#arena-transition-status').textContent='ARENA SELECTED!';if(AudioFX.started)AudioFX.sfx.reward();
    $('#arena-load-fill').style.width='16%';await new Promise(r=>setTimeout(r,650));
  }
  function arenaLoading(progress=55,text='LOADING ARENA…'){$('#arena-transition-status').textContent=text;$('#arena-load-fill').style.width=Math.max(0,Math.min(100,progress))+'%';}
  async function arenaReady(){arenaLoading(100,'READY!');if(AudioFX.started)AudioFX.sfx.countdown(0);await new Promise(r=>setTimeout(r,420));}
  function addLobbyPlayer(p,count,total){const skin=CFG.SKINS.find(s=>s.id===p.skinId)||CFG.SKINS[0],el=document.createElement('div');el.className=`lobby-player team-${p.team||'blue'}`;el.innerHTML=`<span class="avatar-dot"></span><b>${p.name}</b><small>${(p.team||'blue').toUpperCase()} • ${p.personality||skin.name}</small>`;$('#lobby-players').appendChild(el);$('#lobby-count').textContent=`${count}/${total||count}`;}
  function lobbyCountdown(text){$('#lobby-status').textContent=text;}

  function startHUD(map,round,wins,mode,phase='final'){showOnly('hud');$('#hud-map').textContent=map.name.toUpperCase();$('#hud-round').textContent=phase==='qualifier'?`QUALIFIER ${round}`:`ROUND ${round}/5`;$('#hud-mode').textContent=mode.short;updateWins(wins);$('#kill-feed').innerHTML='';$('#spectate').classList.add('hidden');document.body.classList.add('in-match');}
  function updateWins(wins){const b=wins.blue||0,r=wins.red||0;$('#blue-win-pips').innerHTML=[0,1,2].map(i=>`<i class="${i<b?'on':''}"></i>`).join('');$('#red-win-pips').innerHTML=[0,1,2].map(i=>`<i class="${i<r?'on':''}"></i>`).join('');}
  function updateHUD(time,blueAlive,redAlive){$('#hud-time').textContent=Util.formatTime(time);$('#hud-blue').textContent=`BLUE ${blueAlive}`;$('#hud-red').textContent=`RED ${redAlive}`;}
  function addKillFeed(text,team){const e=document.createElement('div');e.className=team==='red'?'red-feed':'blue-feed';e.textContent=text;$('#kill-feed').prepend(e);setTimeout(()=>e.remove(),4200);}
  function showEvent(text){clearTimeout(eventTimer);const e=$('#event-banner');e.textContent=text;e.classList.remove('hidden');eventTimer=setTimeout(()=>e.classList.add('hidden'),1800);}
  function roundBanner(text,good){const e=$('#round-banner');e.textContent=text;e.className='round-banner '+(good?'good':'bad');e.classList.remove('hidden');setTimeout(()=>e.classList.add('hidden'),1700);}
  function spectate(show){$('#spectate').classList.toggle('hidden',!show);}
  function countdown(n){const e=$('#countdown');e.textContent=n>0?n:'GO!';e.classList.remove('hidden');e.classList.remove('pop');void e.offsetWidth;e.classList.add('pop');setTimeout(()=>e.classList.add('hidden'),650);}

  function showResults(data){
    showOnly('results');document.body.classList.remove('in-match');results.classList.toggle('win',!!data.win);results.classList.toggle('loss',!data.win);
    $('#result-title').textContent=data.win?'VICTORY!':'DEFEAT';$('#result-title').className=data.win?'champion':'defeat';$('#result-champion').textContent=data.champion;$('#result-champion').className=data.win?'blue-result':'red-result';
    const note=results.querySelector('.result-emote-note');if(note)note.textContent=data.win?'YOUR WINNING FIGHTERS ARE USING EMOTES':'RIVALS CELEBRATE THE WIN';
    $('#result-mode').textContent=data.mode.short;$('#result-rounds').innerHTML=data.scoreRows.map(r=>`<div class="score-row ${r.team}"><span><i></i>${r.name}</span><b>${r.kos} KO</b></div>`).join('');
    $('#reward-coins').textContent='+'+data.rewards.coins;$('#reward-xp').textContent='+'+data.rewards.xp;$('#reward-gems').textContent='+'+data.rewards.gems;$('#result-kos').textContent=data.kills;updateTop();
    resultAdUsed=false;const adBtn=$('#result-ad-coins');if(adBtn){const usable=!!(window.RivalAds&&RivalAds.enabled&&data.rewards.coins>0);adBtn.classList.toggle('hidden',!usable);adBtn.disabled=false;adBtn.textContent=`WATCH AD • +${data.rewards.coins} COINS`;adBtn.onclick=usable?async()=>{if(resultAdUsed)return;adBtn.disabled=true;adBtn.textContent='LOADING AD…';const r=await RivalAds.showRewarded('double-match-coins',()=>Save.addCoins(data.rewards.coins));if(r.viewed){resultAdUsed=true;adBtn.textContent='BONUS CLAIMED ✓';toast(`+${data.rewards.coins} BONUS COINS`);updateTop();}else{adBtn.disabled=false;adBtn.textContent=`WATCH AD • +${data.rewards.coins} COINS`;toast('Rewarded ad unavailable right now');}}:null;}
  }

  function toast(text){const e=$('#toast');e.textContent=text;e.classList.remove('hidden');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.add('hidden'),1700);}

  $('#play-btn').onclick=()=>{AudioFX.init();if(window.RivalAds)RivalAds.init();Game.showBattleSelect();};$('#select-back').onclick=()=>Game.showHome();$('#find-match-btn').onclick=()=>Game.startPlay(Save.data.selectedMode);$('#missions-btn').onclick=missions;$('#upgrade-btn').onclick=upgrades;$('#emotes-btn').onclick=emotes;$('#maps-btn').onclick=maps;$('#quests-btn').onclick=quests;$('#wheel-btn').onclick=wheel;
  $('#result-home').onclick=()=>Game.showHome();$('#result-replay').onclick=()=>Game.startPlay(Save.data.selectedMode);

  const stick=$('#stick'),knob=$('#stick-knob');let joyPointer=null,joyTouchId=null,joyMouse=false,mobileEmoteSlot=0;
  function joyCoords(e){
    if(e.touches&&e.touches.length){let t=joyTouchId===null?e.touches[0]:Array.from(e.touches).find(x=>x.identifier===joyTouchId)||e.touches[0];return{x:t.clientX,y:t.clientY};}
    if(e.changedTouches&&e.changedTouches.length){let t=Array.from(e.changedTouches).find(x=>x.identifier===joyTouchId)||e.changedTouches[0];return{x:t.clientX,y:t.clientY};}
    return{x:e.clientX,y:e.clientY};
  }
  function moveJoyClient(x,y){const r=stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=x-cx,dy=y-cy,max=Math.max(18,r.width*.34),l=Math.hypot(dx,dy)||1,k=Math.min(1,max/l);dx*=k;dy*=k;knob.style.transform=`translate(${dx}px,${dy}px)`;Input.touchX=dx/max;Input.touchZ=dy/max;}
  function clearJoy(){joyPointer=null;joyTouchId=null;joyMouse=false;Input.touchX=Input.touchZ=0;knob.style.transform='translate(0,0)';}
  stick.addEventListener('pointerdown',e=>{joyPointer=e.pointerId;try{stick.setPointerCapture(e.pointerId);}catch(_){}moveJoyClient(e.clientX,e.clientY);e.preventDefault();e.stopPropagation();},{passive:false});
  addEventListener('pointermove',e=>{if(joyPointer!==null&&e.pointerId===joyPointer){moveJoyClient(e.clientX,e.clientY);e.preventDefault();}},{passive:false});
  addEventListener('pointerup',e=>{if(joyPointer!==null&&e.pointerId===joyPointer){clearJoy();e.preventDefault();}},{passive:false});
  addEventListener('pointercancel',e=>{if(joyPointer!==null&&e.pointerId===joyPointer)clearJoy();},{passive:false});
  // Touch events are bound even on PointerEvent browsers because some Android WebViews
  // and desktop device emulators fail pointer capture while still delivering touch events.
  stick.addEventListener('touchstart',e=>{const t=e.changedTouches[0];joyTouchId=t.identifier;moveJoyClient(t.clientX,t.clientY);e.preventDefault();e.stopPropagation();},{passive:false});
  stick.addEventListener('touchmove',e=>{if(joyTouchId===null)return;const t=Array.from(e.touches).find(x=>x.identifier===joyTouchId);if(t){moveJoyClient(t.clientX,t.clientY);e.preventDefault();}},{passive:false});
  stick.addEventListener('touchend',e=>{if(joyTouchId!==null&&Array.from(e.changedTouches).some(t=>t.identifier===joyTouchId)){clearJoy();e.preventDefault();}},{passive:false});
  stick.addEventListener('touchcancel',e=>{clearJoy();e.preventDefault();},{passive:false});
  // Mouse fallback makes Chrome's responsive-device preview usable too.
  stick.addEventListener('mousedown',e=>{if(e.button!==0)return;joyMouse=true;moveJoyClient(e.clientX,e.clientY);e.preventDefault();});
  addEventListener('mousemove',e=>{if(joyMouse){moveJoyClient(e.clientX,e.clientY);e.preventDefault();}},{passive:false});
  addEventListener('mouseup',()=>{if(joyMouse)clearJoy();});

  function pressAction(key,e){if(key==='punch')Input.queueAttack();else Input[key]=true;if(e){e.preventDefault();e.stopPropagation();}}
  function pressEmote(e){const slots=Save.data.equippedEmotes||[];for(let n=0;n<4;n++){const i=(mobileEmoteSlot+n)%4;if(slots[i]){Input.emote=true;Input.emoteSlot=i;mobileEmoteSlot=(i+1)%4;break;}}if(e){e.preventDefault();e.stopPropagation();}}
  function bindAction(id,key,fn){const el=$(id);if(!el)return;const fire=e=>{const now=performance.now();if(el._rgActionAt&&now-el._rgActionAt<80){e.preventDefault();return;}el._rgActionAt=now;(fn||((ev)=>pressAction(key,ev)))(e);};el.addEventListener('pointerdown',fire,{passive:false});el.addEventListener('touchstart',fire,{passive:false});el.addEventListener('mousedown',fire,{passive:false});el.addEventListener('contextmenu',e=>e.preventDefault());el.addEventListener('dragstart',e=>e.preventDefault());}
  bindAction('#btn-jump','jump');bindAction('#btn-punch','punch');bindAction('#btn-dash','dash');bindAction('#btn-emote','emote',pressEmote);
  stick.addEventListener('contextmenu',e=>e.preventDefault());stick.addEventListener('dragstart',e=>e.preventDefault());
  addEventListener('blur',clearJoy);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearJoy();});

  return {showHome,showBattleSelect,refreshHome,showLobbyUI,addLobbyPlayer,lobbyCountdown,arenaRoulette,arenaLoading,arenaReady,startHUD,updateHUD,updateWins,addKillFeed,showEvent,roundBanner,countdown,spectate,showResults,toast};
})();
