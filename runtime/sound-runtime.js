(function(){
'use strict';

if(window.NettoSounds)return;

const SOUND_DEFS={
 tap:[[520,0,.055,.15,'sine',610]],
 menuOpen:[[330,0,.10,.16,'sine',430],[520,.045,.12,.09,'sine',620]],
 menuClose:[[520,0,.08,.13,'sine',420],[340,.045,.11,.10,'sine',290]],
 navigate:[[420,0,.065,.11,'sine',540],[680,.035,.075,.075,'sine',780]],
 switch:[[390,0,.08,.12,'triangle',650]],
 confirm:[[523.25,0,.13,.14,'sine'],[659.25,.075,.19,.13,'sine']],
 success:[[392,0,.20,.12,'sine'],[493.88,.085,.25,.14,'sine'],[659.25,.19,.34,.13,'sine']],
 update:[[392,0,.20,.12,'sine'],[493.88,.085,.25,.14,'sine'],[659.25,.19,.34,.13,'sine']],
 loginSuccess:[[329.63,0,.29,.11,'sine'],[415.3,.085,.33,.13,'sine'],[493.88,.18,.39,.14,'sine'],[659.25,.30,.50,.11,'sine']],
 welcome:[[293.66,0,.19,.095,'sine'],[392,.105,.24,.11,'sine'],[493.88,.22,.34,.10,'sine']],
 error:[[245,0,.11,.105,'square',218],[196,.115,.18,.095,'square',174]],
 warning:[[392,0,.10,.11,'triangle'],[392,.15,.12,.10,'triangle']],
 notification:[[783.99,0,.13,.105,'sine'],[1046.5,.105,.27,.09,'sine']],
 message:[[659.25,0,.11,.10,'sine'],[880,.085,.20,.09,'sine']],
 delete:[[370,0,.11,.11,'triangle',300],[246.94,.09,.21,.10,'sine',220]],
 logout:[[587.33,0,.19,.11,'sine'],[493.88,.085,.23,.12,'sine'],[392,.18,.31,.11,'sine'],[293.66,.29,.40,.08,'sine']]
};
const SOUND_DEFAULT_ENABLED=Object.freeze({loginSuccess:true,logout:true,update:true,welcome:false});
const SOUND_EQ_BANDS=Object.freeze([
 {key:'bass',type:'lowshelf',frequency:80,q:.7},
 {key:'warmth',type:'peaking',frequency:250,q:.8},
 {key:'mid',type:'peaking',frequency:1000,q:.9},
 {key:'presence',type:'peaking',frequency:4000,q:.9},
 {key:'treble',type:'highshelf',frequency:10000,q:.7}
]);

function normalizeSoundEq(raw){
 raw=raw&&typeof raw==='object'?raw:{};
 const out={};
 for(const band of SOUND_EQ_BANDS){
  const n=Number(raw[band.key]);
  out[band.key]=Number.isFinite(n)?Math.max(-12,Math.min(12,n)):0
 }
 return out
}
function soundEqActive(eq){
 const node=normalizeSoundEq(eq);
 return SOUND_EQ_BANDS.some(b=>Math.abs(node[b.key])>=.05)
}
function connectSoundEq(ctx,input,output,eq,at=ctx.currentTime){
 const values=normalizeSoundEq(eq);
 if(!soundEqActive(values)){input.connect(output);return[]}
 let previous=input;const filters=[];
 for(const band of SOUND_EQ_BANDS){
  const filter=ctx.createBiquadFilter();
  filter.type=band.type;
  filter.frequency.setValueAtTime(band.frequency,at);
  if(band.type==='peaking')filter.Q.setValueAtTime(band.q,at);
  filter.gain.setValueAtTime(values[band.key]||0,at);
  previous.connect(filter);previous=filter;filters.push(filter)
 }
 previous.connect(output);return filters
}

let soundCtx=null,soundSiteConfig={};
function soundEnabled(){try{return localStorage.getItem('nettoSoundEnabled')!=='0'}catch(_){return true}}
function soundVolume(){try{const raw=localStorage.getItem('nettoSoundVolume');if(raw===null)return .72;const v=Number(raw);return Number.isFinite(v)&&v>=0&&v<=1?v:.72}catch(_){return .72}}
function unlockSound(){
 try{
  const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;
  soundCtx=soundCtx||new A();
  if(soundCtx.state==='suspended')soundCtx.resume().catch(()=>{});
  return soundCtx
 }catch(_){return null}
}
function soundConfigNode(name,source=soundSiteConfig){
 const raw=source?.sounds?.items?.[name]&&typeof source.sounds.items[name]==='object'?source.sounds.items[name]:{};
 const volume=Number(raw.volume),trimStart=Number(raw.trim_start),trimEnd=Number(raw.trim_end);
 return{
  enabled:typeof raw.enabled==='boolean'?raw.enabled:!!SOUND_DEFAULT_ENABLED[name],
  volume:Number.isFinite(volume)?Math.max(0,Math.min(1,volume)):1,
  url:String(raw.url||'').trim(),
  name:String(raw.name||''),
  trim_start:Number.isFinite(trimStart)&&trimStart>0?trimStart:0,
  trim_end:Number.isFinite(trimEnd)&&trimEnd>0?trimEnd:null,
  eq:normalizeSoundEq(raw.eq)
 }
}
function synthSoundDuration(name){
 const def=SOUND_DEFS[name];if(!def||!def.length)return 0;
 return Math.max(...def.map(t=>(t[1]||0)+(t[2]||.1)))+.08
}
function soundTrimBounds(node,duration){
 const total=Number(duration),max=Number.isFinite(total)&&total>0?total:Infinity;
 const start=Math.max(0,Number(node?.trim_start)||0);
 const rawEnd=Number(node?.trim_end);
 const end=Number.isFinite(rawEnd)&&rawEnd>start?Math.min(max,rawEnd):max;
 return{start:Math.min(start,Number.isFinite(max)?Math.max(0,max-.001):start),end}
}
function soundFilterFrequency(name){return name==='error'?1350:name==='logout'?1750:2400}
function outputLevel(node){return Math.max(0,Math.min(1,soundVolume()*(node?.volume??1)))}

function playSynthSound(name,node){
 const def=SOUND_DEFS[name],a=unlockSound();if(!def||!a)return false;
 const run=()=>{try{
  const total=synthSoundDuration(name),bounds=soundTrimBounds(node,total),selection=Math.max(.01,bounds.end-bounds.start);
  const now=a.currentTime,master=a.createGain(),filter=a.createBiquadFilter(),level=Math.max(.0001,outputLevel(node)*.46);
  filter.type='lowpass';filter.frequency.setValueAtTime(soundFilterFrequency(name),now);
  master.gain.setValueAtTime(level,now);
  master.gain.exponentialRampToValueAtTime(.0001,now+selection+.05);
  connectSoundEq(a,filter,master,node?.eq,now);master.connect(a.destination);
  def.forEach(t=>{
   const [freq,delay=0,dur=.1,gain=.1,type='sine',endFreq]=t,noteStart=delay,noteEnd=delay+dur,clipStart=Math.max(noteStart,bounds.start),clipEnd=Math.min(noteEnd,bounds.end);
   if(clipEnd<=clipStart)return;
   const segDur=Math.max(.008,clipEnd-clipStart),st=now+(clipStart-bounds.start),o=a.createOscillator(),g=a.createGain();
   o.type=type;
   let startFreq=freq,finishFreq=endFreq;
   if(endFreq&&endFreq>0&&freq>0&&dur>0){
    const ratio=endFreq/freq,a0=(clipStart-noteStart)/dur,a1=(clipEnd-noteStart)/dur;
    startFreq=freq*Math.pow(ratio,Math.max(0,Math.min(1,a0)));
    finishFreq=freq*Math.pow(ratio,Math.max(0,Math.min(1,a1)))
   }
   o.frequency.setValueAtTime(Math.max(.01,startFreq),st);
   if(finishFreq&&finishFreq>0)o.frequency.exponentialRampToValueAtTime(Math.max(.01,finishFreq),st+segDur);
   g.gain.setValueAtTime(.0001,st);
   g.gain.exponentialRampToValueAtTime(Math.max(.001,gain),st+Math.min(.025,segDur*.28));
   g.gain.exponentialRampToValueAtTime(.0001,st+segDur);
   o.connect(g);g.connect(filter);o.start(st);o.stop(st+segDur+.02)
  })
 }catch(_){}};if(a.state==='suspended')a.resume().then(run).catch(()=>{});else run();return true
}

function playCustomSound(name,node){
 try{
  const ctx=unlockSound(),audio=new Audio();
  audio.preload='auto';
  let master=null;
  if(ctx){
   try{
    audio.crossOrigin='anonymous';
    audio.src=node.url;
    const source=ctx.createMediaElementSource(audio);
    master=ctx.createGain();
    master.gain.setValueAtTime(outputLevel(node),ctx.currentTime);
    connectSoundEq(ctx,source,master,node?.eq,ctx.currentTime);
    master.connect(ctx.destination);
    // iOS ignores/restricts HTMLMediaElement.volume. The gain node is authoritative.
    audio.volume=1
   }catch(_){
    master=null;
    audio.pause();
    audio.removeAttribute('crossorigin');
    audio.src='';
    audio.src=node.url;
    audio.volume=outputLevel(node)
   }
  }else{
   audio.src=node.url;
   audio.volume=outputLevel(node)
  }
  let started=false,stopTimer=0;
  const stop=()=>{clearTimeout(stopTimer);try{audio.pause()}catch(_){}};
  const begin=()=>{
   if(started)return;started=true;
   const total=Number(audio.duration),bounds=soundTrimBounds(node,total),selection=Number.isFinite(bounds.end)?Math.max(.01,bounds.end-bounds.start):null;
   try{audio.currentTime=bounds.start}catch(_){}
   const startPlayback=()=>{
    const p=audio.play();
    if(p?.catch)p.catch(()=>playSynthSound(name,node))
   };
   if(master&&ctx?.state==='suspended')ctx.resume().then(startPlayback).catch(startPlayback);
   else startPlayback();
   if(selection)stopTimer=setTimeout(stop,selection*1000+35);
   audio.addEventListener('timeupdate',()=>{if(Number.isFinite(bounds.end)&&audio.currentTime>=bounds.end-.015)stop()})
  };
  if(audio.readyState>=1)begin();
  else{audio.addEventListener('loadedmetadata',begin,{once:true});audio.load()}
  return true
 }catch(_){return playSynthSound(name,node)}
}

function playSound(name='tap'){
 if(!soundEnabled()||!SOUND_DEFS[name])return false;
 const node=soundConfigNode(name);if(!node.enabled)return false;
 return node.url?playCustomSound(name,node):playSynthSound(name,node)
}
function previewSound(name,nodeOverride=null){
 if(!SOUND_DEFS[name])return false;
 const base=soundConfigNode(name),node={...base,...(nodeOverride&&typeof nodeOverride==='object'?nodeOverride:{})};
 node.volume=Number.isFinite(Number(node.volume))?Math.max(0,Math.min(1,Number(node.volume))):1;
 node.trim_start=Math.max(0,Number(node.trim_start)||0);
 {const end=Number(node.trim_end);node.trim_end=Number.isFinite(end)&&end>node.trim_start?end:null}
 node.eq=normalizeSoundEq(node.eq);
 return node.url?playCustomSound(name,node):playSynthSound(name,node)
}

const sounds={
 play:playSound,
 preview:previewSound,
 unlock:unlockSound,
 names:Object.freeze(Object.keys(SOUND_DEFS)),
 configure(config){soundSiteConfig=config&&typeof config==='object'?config:{};return soundSiteConfig},
 config:name=>soundConfigNode(name),
 duration:name=>synthSoundDuration(name),
 isEnabled:soundEnabled,
 getVolume:soundVolume,
 setEnabled(v){try{localStorage.setItem('nettoSoundEnabled',v?'1':'0')}catch(_){};window.dispatchEvent(new Event('netto:sound-settings'))},
 setVolume(v){const n=Math.max(0,Math.min(1,Number(v)||0));try{localStorage.setItem('nettoSoundVolume',String(n))}catch(_){};window.dispatchEvent(new Event('netto:sound-settings'))}
};
window.NettoSounds=sounds;

function syncFromMobileServices(detail){
 const config=detail?.siteConfig||window.NethorMobileServices?.siteConfig||window.MobileServices?.siteConfig;
 if(config&&typeof config==='object'&&Object.keys(config).length)sounds.configure(config)
}
window.addEventListener('nethor:mobile-services',e=>syncFromMobileServices(e.detail));
window.addEventListener('nethor:mobile-services-ready',e=>syncFromMobileServices(e.detail));
syncFromMobileServices();
document.addEventListener('pointerdown',()=>sounds.unlock(),{once:true,capture:true});
})();