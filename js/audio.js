window.AudioFX = (()=>{
  let ctx=null, master=null, started=false, music=null;

  function ensureMusic(){
    if(music) return music;
    music=new Audio('assets/audio/rival_guys_bgm.mp3');
    music.loop=true;
    music.preload='auto';
    music.volume=0.30;
    music.playsInline=true;
    return music;
  }

  function startMusic(){
    const m=ensureMusic();
    if(m.paused){
      const p=m.play();
      if(p&&p.catch)p.catch(()=>{});
    }
  }

  function init(){
    if(started){
      if(ctx&&ctx.state==='suspended')ctx.resume();
      startMusic();
      return;
    }
    started=true;
    ctx=new (window.AudioContext||window.webkitAudioContext)();
    master=ctx.createGain();master.gain.value=0.22;master.connect(ctx.destination);
    startMusic();
  }


  function pauseForAd(){
    try{if(music&&!music.paused)music.pause();}catch(e){}
    try{if(ctx&&ctx.state==='running')ctx.suspend();}catch(e){}
  }
  function resumeAfterAd(){
    try{if(ctx&&ctx.state==='suspended')ctx.resume();}catch(e){}
    if(started)startMusic();
  }

  function tone(freq=440,dur=.08,type='sine',vol=.12,slide=0){
    if(!ctx)return;
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type=type;o.frequency.setValueAtTime(freq,ctx.currentTime);
    if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide),ctx.currentTime+dur);
    g.gain.setValueAtTime(.0001,ctx.currentTime);g.gain.exponentialRampToValueAtTime(vol,ctx.currentTime+.01);g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+dur);
    o.connect(g);g.connect(master);o.start();o.stop(ctx.currentTime+dur+.02);
  }
  function noise(dur=.1,vol=.08){
    if(!ctx)return;const len=Math.floor(ctx.sampleRate*dur),buf=ctx.createBuffer(1,len,ctx.sampleRate),arr=buf.getChannelData(0);
    for(let i=0;i<len;i++)arr[i]=(Math.random()*2-1)*(1-i/len);
    const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=buf;g.gain.value=vol;s.connect(g);g.connect(master);s.start();
  }
  const sfx={
    click(){tone(360,.06,'square',.06,80);},
    punch(){noise(.08,.09);tone(115,.12,'sawtooth',.09,-45);},
    hit(){tone(86,.13,'square',.11,-35);noise(.07,.06);},
    dash(){tone(180,.12,'sawtooth',.05,280);},
    jump(){tone(260,.10,'triangle',.05,180);},
    ko(){tone(130,.16,'square',.08,-70);setTimeout(()=>tone(90,.2,'sawtooth',.07,-40),80);},
    win(){[523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,.18,'triangle',.07,40),i*90));},
    lose(){[330,247,196].forEach((f,i)=>setTimeout(()=>tone(f,.22,'triangle',.06,-20),i*110));},
    countdown(n){tone(n===0?880:440,.12,'square',.06,n===0?160:0);},
    horn(){tone(196,.55,'sawtooth',.055,-20);setTimeout(()=>tone(165,.55,'sawtooth',.045,-15),180);},
    reward(){[660,880,990].forEach((f,i)=>setTimeout(()=>tone(f,.12,'triangle',.05,80),i*70));}
  };

  // Browser autoplay rules require a gesture. The first real tap/click anywhere
  // starts the soundtrack, then it stays on across menus, rounds and results.
  addEventListener('pointerdown',()=>init(),{once:true,capture:true});
  addEventListener('keydown',()=>init(),{once:true,capture:true});

  return {init,pauseForAd,resumeAfterAd,sfx,get started(){return started;},get music(){return music;}};
})();
