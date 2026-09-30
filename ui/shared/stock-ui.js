/* Nethor — UI partagée Stock, Phase 4.21 */
function playUISound(type='tick'){const map={tick:'tap',open:'menuOpen',close:'menuClose'};window.NettoSounds?.play?.(map[type]||'tap')}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.closest('.counter')||b.classList.contains('catHeader')||b.closest('.nettoGlobalTools'))return;playUISound('tick')},{passive:true});

function toggleBrandMenu(e){if(e)e.stopPropagation();if(profile?.role!=='admin')return;const m=$('brandMenu'),b=$('brandMenuBtn'),opening=m.classList.contains('hidden');m.classList.toggle('hidden',!opening);b.classList.toggle('active',opening);b.setAttribute('aria-expanded',opening?'true':'false');playUISound(opening?'open':'close')}
function closeBrandMenu(sound=false){const m=$('brandMenu'),b=$('brandMenuBtn');if(!m||m.classList.contains('hidden'))return;m.classList.add('hidden');b.classList.remove('active');b.setAttribute('aria-expanded','false');if(sound)playUISound('close')}
function goBrand(url){closeBrandMenu();window.NettoSounds?.play?.('navigate');setTimeout(()=>location.href=url,55)}
function openUsersFromBrand(){closeBrandMenu();window.NettoSounds?.play?.('navigate');setTimeout(()=>location.href='admin-portal.html?tab=accounts',55)}
document.addEventListener('click',e=>{const w=e.target.closest('.brandMenuWrap');if(!w)closeBrandMenu(true)});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeBrandMenu(true)});

async function loadSharedSiteConfig(){
 try{
  if(!db)return null;
  const {data}=await db.from('app_settings').select('value').eq('key','site_config').maybeSingle();
  const cfg=data?.value;if(!cfg)return null;
  applySharedSiteConfig(cfg);return cfg;
 }catch(e){console.warn('Réglages du site:',e);return null}
}
function setMenuEntry(urlKey,cfg){
 const n=cfg?.nav?.[urlKey];if(!n)return;
 const defaults={home:'home.html',stock:'index.html',planning:'planning.html',chat:'chat.html'};
 const old=defaults[urlKey];
 document.querySelectorAll('#nMenu button,#brandMenu button').forEach(b=>{
  const oc=b.getAttribute('onclick')||'';
  if(!oc.includes("'"+old+"'")&&!oc.includes('"'+old+'"'))return;
  const icon=b.querySelector(':scope > span'),strong=b.querySelector('strong'),small=b.querySelector('small');
  if(icon)icon.textContent=n.icon||icon.textContent;if(strong)strong.textContent=n.label||strong.textContent;if(small)small.textContent=n.subtitle||'';
  const target=String(n.url||old).replace(/['"<>]/g,'');b.onclick=()=>location.href=target;
 });
}
function applySharedSiteConfig(cfg){
 ['home','stock','planning','chat','test'].forEach(k=>setMenuEntry(k,cfg));
 const pt=cfg?.pageTitles?.['stock'];
 if(pt){const t=document.querySelector('header .title');const s=document.querySelector('header .subtitle,header .sub');if(t&&pt.title)t.textContent=pt.title;if(s&&pt.subtitle)s.textContent=pt.subtitle}
 const settings=document.querySelectorAll('.settingsLink');settings.forEach(x=>x.classList.toggle('hidden',!(window.currentRole==='admin'||window.planningCanEdit||profile?.role==='admin')));
}
