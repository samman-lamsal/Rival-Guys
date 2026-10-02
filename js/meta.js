window.Meta = (()=>{
  function unlockedMaps(){ const lv=Save.level(); return CFG.MAPS.filter(m=>m.unlock<=lv); }
  // Matchmaking may rotate through every arena so a best-of-5 does not repeat the same
  // level every round. Level unlocks are kept for progression/map-preference UI.
  function chooseRoundMap(usedThisMatch=[]){
    const used=new Set(usedThisMatch||[]),recent=new Set(Save.data.lastMaps||[]);
    let pool=CFG.MAPS.filter(m=>!used.has(m.id)&&!recent.has(m.id));
    if(!pool.length)pool=CFG.MAPS.filter(m=>!used.has(m.id));
    if(!pool.length)pool=CFG.MAPS.slice();
    const weighted=[];
    pool.forEach(m=>{const w=m.id==='sky'?.65:1;for(let i=0;i<Math.max(1,Math.round(w*20));i++)weighted.push(m);});
    return Util.pick(weighted);
  }
  function chooseMap(){ return chooseRoundMap([]); }

  function priceText(item){return item.currency==='gems'?`◆ ${item.price}`:`🪙 ${item.price}`;}
  function canAfford(item){return item.currency==='gems'?Save.data.gems>=item.price:Save.data.coins>=item.price;}
  function spend(item){if(item.currency==='gems')Save.data.gems-=item.price;else Save.data.coins-=item.price;}
  function buySkin(id){
    const item=CFG.SKINS.find(x=>x.id===id);if(!item)return {ok:false,msg:'FIGHTER NOT FOUND'};if(Save.ownsSkin(id))return {ok:true,msg:'ALREADY OWNED'};
    if(!canAfford(item))return {ok:false,msg:item.currency==='gems'?'NOT ENOUGH GEMS':'NOT ENOUGH COINS'};
    spend(item);Save.data.ownedSkins=[...(Save.data.ownedSkins||[]),id];Save.data.selectedSkin=id;Save.commit();AudioFX.sfx.reward();return {ok:true,msg:`${item.name.toUpperCase()} UNLOCKED!`};
  }
  function buyEmote(id){
    const item=CFG.EMOTES.find(x=>x.id===id);if(!item)return {ok:false,msg:'EMOTE NOT FOUND'};if(Save.ownsEmote(id))return {ok:true,msg:'ALREADY OWNED'};
    if(!canAfford(item))return {ok:false,msg:item.currency==='gems'?'NOT ENOUGH GEMS':'NOT ENOUGH COINS'};
    spend(item);Save.data.ownedEmotes=[...(Save.data.ownedEmotes||[]),id];const slot=(Save.data.equippedEmotes||[]).findIndex(x=>!x);if(slot>=0)Save.data.equippedEmotes[slot]=id;Save.commit();AudioFX.sfx.reward();return {ok:true,msg:`${item.name.toUpperCase()} UNLOCKED!`};
  }

  function upgradeCost(type){ const lv=Save.data.upgrades[type]||0; return 120+lv*140; }
  function buyUpgrade(type){
    const lv=Save.data.upgrades[type]||0;if(lv>=5)return {ok:false,msg:'MAX LEVEL'};const cost=upgradeCost(type);if(Save.data.coins<cost)return {ok:false,msg:'NOT ENOUGH COINS'};
    Save.data.coins-=cost;Save.data.upgrades[type]=lv+1;Save.commit();AudioFX.sfx.reward();return {ok:true,msg:'UPGRADED!'};
  }
  const missionDefs=[
    {id:'play',label:'Play 3 matches',goal:3,reward:180,field:'play'},
    {id:'ko',label:'Knock out 10 rivals',goal:10,reward:260,field:'ko'},
    {id:'win',label:'Win 2 matches',goal:2,reward:400,field:'win'}
  ];
  function claimMission(id){ const d=missionDefs.find(x=>x.id===id);if(!d)return false;const p=Save.data.mission[d.field]||0;if(p<d.goal||Save.data.mission.claimed[id])return false;Save.data.mission.claimed[id]=true;Save.data.coins+=d.reward;Save.commit();AudioFX.sfx.reward();return true; }
  function spinWheel(){
    const now=Date.now(),cool=60000;if(now-(Save.data.lastWheel||0)<cool)return {ok:false,remaining:Math.ceil((cool-(now-Save.data.lastWheel))/1000)};
    const rewards=[{type:'coins',amount:50,w:28},{type:'coins',amount:100,w:24},{type:'coins',amount:200,w:18},{type:'xp',amount:80,w:14},{type:'gems',amount:3,w:10},{type:'gems',amount:8,w:5},{type:'coins',amount:500,w:1}];
    let total=rewards.reduce((s,r)=>s+r.w,0),roll=Math.random()*total,pick=rewards[0];for(const r of rewards){roll-=r.w;if(roll<=0){pick=r;break;}}
    if(pick.type==='coins')Save.data.coins+=pick.amount;else if(pick.type==='gems')Save.data.gems+=pick.amount;else Save.data.xp+=pick.amount;
    Save.data.lastWheel=now;Save.commit();AudioFX.sfx.reward();return {ok:true,reward:pick};
  }
  function applyMatchRewards(humanWin,kills){
    const coins=(humanWin?220:85)+kills*18,xp=(humanWin?140:70)+kills*12,gems=humanWin?2:0;
    Save.data.coins+=coins;Save.data.gems+=gems;Save.data.xp+=xp;Save.data.matches++;Save.data.mission.play++;if(humanWin){Save.data.wins++;Save.data.mission.win++;}Save.commit();return {coins,xp,gems};
  }
  return {unlockedMaps,chooseMap,chooseRoundMap,priceText,buySkin,buyEmote,upgradeCost,buyUpgrade,missionDefs,claimMission,spinWheel,applyMatchRewards};
})();
