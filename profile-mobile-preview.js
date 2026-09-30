(function(){
'use strict';
window.NethorProfileFeatures=window.NethorProfileFeatures||{};

let orientation='portrait',noticeTimer=null,bound=false;

function sounds(){return window.NettoSounds}
function isMobileViewport(){
 try{
  const kind=String(window.NethorPlatform?.current?.()||document.documentElement.dataset.nethorPlatform||'');
  return kind==='mobile'||kind==='mobile-preview'
 }catch(_){return matchMedia('(max-width:900px),(pointer:coarse)').matches}
}
function isPreviewContext(){
 try{return window.NethorPlatform?.isPreview?.()===true}catch(_){return new URLSearchParams(location.search).get('mobile_preview')==='1'}
}
function previewUrl(){
 const u=new URL(location.href);u.searchParams.set('mobile_preview','1');u.searchParams.set('_mobile_ts',String(Date.now()));return u.toString()
}
function setButton(active){
 const on=!!active,btn=document.getElementById('nettoMobilePreviewBtn'),root=document.documentElement;
 if(on)root.setAttribute('data-mobile-preview-active','1');else root.removeAttribute('data-mobile-preview-active');
 if(!btn)return;
 btn.classList.toggle('active',on);btn.setAttribute('aria-pressed',on?'true':'false');
 btn.setAttribute('aria-label',on?'Quitter la vision mobile':'Vision mobile');
 btn.title=on?'Quitter la vision mobile':'Vision mobile'
}
function notice(message){
 const old=document.getElementById('nettoMobilePreviewNotice');old?.remove();clearTimeout(noticeTimer);
 const el=document.createElement('div');el.id='nettoMobilePreviewNotice';el.className='nettoMobilePreviewNotice';
 const dot=document.createElement('i'),label=document.createElement('span');label.textContent=String(message||'');
 el.append(dot,label);document.body.appendChild(el);requestAnimationFrame(()=>el.classList.add('show'));
 noticeTimer=setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),220)},2200)
}
function setOrientation(value,announce=false){
 orientation=value==='landscape'?'landscape':'portrait';
 const device=document.getElementById('nettoMobilePreviewDevice'),state=document.getElementById('nettoMobilePreviewState'),rotate=document.getElementById('nettoMobilePreviewRotate');
 if(device)device.dataset.orientation=orientation;
 if(state)state.textContent='Aperçu mobile · '+(orientation==='landscape'?'Paysage':'Portrait');
 if(rotate){
  const next=orientation==='landscape'?'portrait':'landscape';
  rotate.setAttribute('aria-label',next==='landscape'?'Passer en paysage':'Passer en portrait');
  rotate.title=next==='landscape'?'Passer en paysage':'Passer en portrait';
  rotate.setAttribute('aria-pressed',orientation==='landscape'?'true':'false')
 }
 if(announce)notice(orientation==='landscape'?'Aperçu mobile en paysage':'Aperçu mobile en portrait')
}
function rotate(){
 setOrientation(orientation==='landscape'?'portrait':'landscape',true);
 try{sounds()?.play?.('switch')}catch(_){}
}
function close(showNotice=true){
 const overlay=document.getElementById('nettoMobilePreviewOverlay'),hadPreview=!!overlay;overlay?.remove();
 setButton(false);document.body?.style.removeProperty('overflow');
 if(hadPreview&&showNotice)notice('Vision mobile désactivée')
}
function toggle(){
 if(isMobileViewport()&&!isPreviewContext()){notice('Visualiseur mobile disponible uniquement sur ordinateur');return}
 const existing=document.getElementById('nettoMobilePreviewOverlay');
 if(existing){close(true);try{sounds()?.play?.('menuClose')}catch(_){};return}
 try{window.NettoProfileUI?.closeDrops?.()}catch(_){}
 const overlay=document.createElement('div');overlay.id='nettoMobilePreviewOverlay';overlay.className='nettoMobilePreviewOverlay';
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Aperçu mobile');
 Object.assign(overlay.style,{position:'fixed',left:'0',top:'0',right:'0',bottom:'0',zIndex:'2147483000',background:'rgba(16,18,20,.84)',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'});
 const device=document.createElement('div');device.id='nettoMobilePreviewDevice';device.className='nettoMobilePreviewDevice';device.dataset.orientation='portrait';
 Object.assign(device.style,{background:'#0d0f11',border:'7px solid #292d31',borderRadius:'38px',boxShadow:'0 30px 100px rgba(0,0,0,.7)',padding:'10px',display:'flex',flexDirection:'column'});
 const bar=document.createElement('div');Object.assign(bar.style,{height:'32px',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',flex:'none',color:'#e7eaed'});
 const state=document.createElement('span');state.id='nettoMobilePreviewState';state.textContent='Aperçu mobile · Portrait';Object.assign(state.style,{position:'absolute',left:'3px',fontSize:'8px',fontWeight:'850'});
 const notch=document.createElement('span');Object.assign(notch.style,{width:'92px',height:'19px',borderRadius:'999px',background:'#060708'});
 const rotateBtn=document.createElement('button');rotateBtn.id='nettoMobilePreviewRotate';rotateBtn.className='nettoMobilePreviewRotate';rotateBtn.type='button';
 rotateBtn.setAttribute('aria-label','Passer en paysage');rotateBtn.setAttribute('aria-pressed','false');rotateBtn.title='Passer en paysage';
 rotateBtn.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M3 8 7 4"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/><path d="m21 16-4 4"/><rect x="7" y="6" width="10" height="12" rx="2"/></svg>';
 const closeBtn=document.createElement('button');closeBtn.type='button';closeBtn.setAttribute('aria-label','Fermer');closeBtn.textContent='×';
 Object.assign(closeBtn.style,{position:'absolute',right:'0',top:'0',width:'28px',height:'28px',border:'0',borderRadius:'9px',background:'#34393e',color:'#fff',cursor:'pointer',fontSize:'18px'});
 const frame=document.createElement('iframe');frame.className='nettoMobilePreviewFrame';frame.title='Vision mobile Nethor';frame.src=previewUrl();
 Object.assign(frame.style,{width:'100%',height:'100%',border:'0',borderRadius:'25px',background:'#fff',flex:'1'});
 rotateBtn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();rotate()});
 closeBtn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();close(true)});
 overlay.addEventListener('click',e=>{if(e.target===overlay)close(true)});
 bar.append(state,notch,rotateBtn,closeBtn);device.append(bar,frame);overlay.appendChild(device);document.body.appendChild(overlay);
 document.body.style.overflow='hidden';setOrientation('portrait',false);setButton(true);notice('Vision mobile activée');
 try{sounds()?.play?.('menuOpen')}catch(_){}
}
function bind(){
 if(bound||window.__nettoMobilePreviewGlobalBound)return;
 bound=true;window.__nettoMobilePreviewGlobalBound=true;
 document.addEventListener('click',e=>{
  const btn=e.target?.closest?.('#nettoMobilePreviewBtn');if(!btn)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  try{toggle()}catch(err){console.error('Vision mobile:',err);notice('Vision mobile : '+String(err?.message||err))}
 },true);
 document.addEventListener('keydown',e=>{
  if(e.key!=='Enter'&&e.key!==' ')return;
  const btn=e.target?.closest?.('#nettoMobilePreviewBtn');if(!btn)return;
  e.preventDefault();e.stopPropagation();
  try{toggle()}catch(err){console.error('Vision mobile:',err);notice('Vision mobile : '+String(err?.message||err))}
 },true)
}
window.NethorProfileFeatures.mobilePreview=Object.freeze({bind,toggle,close,notice});
})();
