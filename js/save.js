window.Save = (() => {
  const KEY='skyShoveSaveV1';
  const defaults={
    xp:0, coins:650, gems:25, selectedSkin:'pirate', selectedMode:'4v4',
    ownedSkins:['pirate'], ownedEmotes:['wave','cheer'], equippedEmotes:['wave','cheer',null,null], selectedHomeEmote:'wave',
    upgrades:{speed:0,punch:0,jump:0},
    wins:0, matches:0, kos:0, rounds:0,
    lastMaps:[], lastWheel:0,
    mission:{play:0,ko:0,win:0,claimed:{}},
    settings:{},
  };
  let data;
  function uniq(a){return [...new Set((a||[]).filter(Boolean))];}
  function load(){
    try { data=Object.assign({},defaults,JSON.parse(localStorage.getItem(KEY)||'{}')); }
    catch(e){ data=JSON.parse(JSON.stringify(defaults)); }
    data.upgrades=Object.assign({},defaults.upgrades,data.upgrades||{});
    data.mission=Object.assign({},defaults.mission,data.mission||{});
    data.mission.claimed=Object.assign({},data.mission.claimed||{});
    // Economy migration: never take away a fighter the player was already using in older builds.
    data.ownedSkins=uniq([...(data.ownedSkins||[]),'pirate',data.selectedSkin]);
    data.ownedEmotes=uniq([...(data.ownedEmotes||[]),'wave','cheer']);
    data.equippedEmotes=Array.isArray(data.equippedEmotes)?data.equippedEmotes.slice(0,4):defaults.equippedEmotes.slice();
    while(data.equippedEmotes.length<4)data.equippedEmotes.push(null);
    data.equippedEmotes=data.equippedEmotes.map(id=>data.ownedEmotes.includes(id)?id:null);
    if(!data.equippedEmotes[0])data.equippedEmotes[0]='wave';
    if(!data.selectedHomeEmote||!data.ownedEmotes.includes(data.selectedHomeEmote))data.selectedHomeEmote=data.equippedEmotes[0]||'wave';
    if(!CFG.MODES.some(m=>m.id===data.selectedMode)) data.selectedMode='4v4';
    if(!CFG.SKINS.some(s=>s.id===data.selectedSkin)||!data.ownedSkins.includes(data.selectedSkin))data.selectedSkin='pirate';
    if(new URLSearchParams(location.search).get('unlockAll')==='1') data.xp=Math.max(data.xp,2250);
    return data;
  }
  function commit(){ localStorage.setItem(KEY,JSON.stringify(data)); window.dispatchEvent(new CustomEvent('savechange')); }
  function level(){ return Math.max(1,Math.floor(data.xp/250)+1); }
  function addXP(n){ data.xp+=n; commit(); }
  function addCoins(n){ data.coins=Math.max(0,data.coins+n); commit(); }
  function addGems(n){ data.gems=Math.max(0,data.gems+n); commit(); }
  function rememberMap(id){ data.lastMaps=[id,...(data.lastMaps||[]).filter(x=>x!==id)].slice(0,2); commit(); }
  function ownsSkin(id){return (data.ownedSkins||[]).includes(id);}
  function ownsEmote(id){return (data.ownedEmotes||[]).includes(id);}
  function setSkin(id){ if(ownsSkin(id)){data.selectedSkin=id;commit();return true;} return false; }
  function setMode(id){ if(CFG.MODES.some(m=>m.id===id)){data.selectedMode=id;commit();} }
  function equipEmote(id,slot=0){ if(!ownsEmote(id))return false;slot=Math.max(0,Math.min(3,slot|0));data.equippedEmotes=data.equippedEmotes.map((x,i)=>x===id&&i!==slot?null:x);data.equippedEmotes[slot]=id;if(slot===0)data.selectedHomeEmote=id;commit();return true; }
  function reset(){ localStorage.removeItem(KEY); load(); commit(); }
  load();
  return {get data(){return data;},load,commit,level,addXP,addCoins,addGems,rememberMap,ownsSkin,ownsEmote,setSkin,setMode,equipEmote,reset};
})();
