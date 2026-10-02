window.RivalAds = (()=>{
  const cfg=window.RIVAL_ADS_CONFIG||{};
  let initialized=false,available=false,loading=false,lastInterstitial=0,completedRounds=0,adShowing=false;
  const validPublisher=()=>/^ca-pub-\d{10,}$/.test(String(cfg.publisherId||''));
  function pauseGameAudio(){try{if(window.AudioFX&&AudioFX.pauseForAd)AudioFX.pauseForAd();}catch(e){}}
  function resumeGameAudio(){try{if(window.AudioFX&&AudioFX.resumeAfterAd)AudioFX.resumeAfterAd();}catch(e){}}
  function init(){
    if(initialized||loading)return Promise.resolve(available);
    initialized=true;
    if(!cfg.enabled||!validPublisher()){console.info('[Rival Guys Ads] disabled until a valid AdSense publisher ID is configured.');return Promise.resolve(false);}
    loading=true;
    window.adsbygoogle=window.adsbygoogle||[];
    window.adBreak=window.adConfig=function(o){window.adsbygoogle.push(o);};
    const s=document.createElement('script');s.async=true;s.crossOrigin='anonymous';
    s.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+encodeURIComponent(cfg.publisherId);
    s.dataset.adClient=cfg.publisherId;s.dataset.adFrequencyHint=cfg.frequencyHint||'120s';if(cfg.testMode)s.dataset.adbreakTest='on';
    return new Promise(resolve=>{
      s.onload=()=>{loading=false;available=true;try{adConfig({preloadAdBreaks:'on',sound:'on'});}catch(e){}resolve(true);};
      s.onerror=()=>{loading=false;available=false;resolve(false);};document.head.appendChild(s);
    });
  }
  async function showInterstitial(name='between-round'){
    await init();
    if(!available||adShowing)return false;
    const now=Date.now(),min=Number(cfg.interstitialMinIntervalMs||120000);if(now-lastInterstitial<min)return false;
    lastInterstitial=now;adShowing=true;
    return new Promise(resolve=>{
      let finished=false;const done=(shown=false)=>{if(finished)return;finished=true;adShowing=false;resumeGameAudio();resolve(shown);};
      try{
        adBreak({type:'next',name,
          beforeAd:()=>{pauseGameAudio();},
          afterAd:()=>{resumeGameAudio();},
          adBreakDone:(info)=>done(!!info&&['viewed','dismissed'].includes(info.breakStatus))
        });
        setTimeout(()=>done(false),90000);
      }catch(e){done(false);}
    });
  }
  async function onRoundComplete(label='round-complete'){
    completedRounds++;
    if(completedRounds<Number(cfg.firstInterstitialAfterRounds||2))return false;
    return showInterstitial(label);
  }
  async function showRewarded(name,onViewed){
    await init();
    if(!available||adShowing)return {shown:false,viewed:false};
    adShowing=true;
    return new Promise(resolve=>{
      let finished=false,viewed=false;
      const done=()=>{if(finished)return;finished=true;adShowing=false;resumeGameAudio();resolve({shown:true,viewed});};
      try{
        adBreak({type:'reward',name,
          beforeReward:(showAdFn)=>{showAdFn();},
          beforeAd:()=>pauseGameAudio(),
          afterAd:()=>resumeGameAudio(),
          adViewed:()=>{viewed=true;try{if(onViewed)onViewed();}catch(e){}},
          adDismissed:()=>{},
          adBreakDone:()=>done()
        });
        setTimeout(()=>{if(!finished){adShowing=false;resumeGameAudio();resolve({shown:false,viewed:false});finished=true;}},90000);
      }catch(e){adShowing=false;resumeGameAudio();resolve({shown:false,viewed:false});}
    });
  }
  function resetSession(){completedRounds=0;lastInterstitial=0;}
  return {init,showInterstitial,onRoundComplete,showRewarded,resetSession,get enabled(){return !!cfg.enabled&&validPublisher();}};
})();
