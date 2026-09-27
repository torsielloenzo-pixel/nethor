(function(){
'use strict';
const prefValue=p=>p?.ui_preferences?.planning_view==='agenda'?'agenda':'classic';
function profilePage(){
 const theme=document.getElementById('themeSelect');if(!theme||document.getElementById('planningViewSelect'))return false;
 const field=theme.closest('.field');if(!field)return false;
 const wrap=document.createElement('div');wrap.className='field';wrap.innerHTML='<label for="planningViewSelect">Affichage du planning</label><select id="planningViewSelect"><option value="classic">Classique</option><option value="agenda">Agenda</option></select><span class="fieldHelp">Choisit la vue ouverte par défaut dans Planning. Les deux vues utilisent exactement le même import Excel.</span>';
 field.insertAdjacentElement('afterend',wrap);
 try{wrap.querySelector('select').value=prefValue(typeof profile!=='undefined'?profile:null)}catch(_){}
 const select=wrap.querySelector('select');
 const sync=()=>{try{if(typeof profile!=='undefined'&&profile){const p=profile.ui_preferences&&typeof profile.ui_preferences==='object'?profile.ui_preferences:{};profile.ui_preferences={...p,planning_view:select.value}}}catch(_){}};
 select.addEventListener('change',sync);
 (async()=>{try{if(typeof db==='undefined'||!db)return;const s=(await db.auth.getSession()).data?.session;if(!s)return;const {data}=await db.from('profiles').select('ui_preferences').eq('id',s.user.id).maybeSingle();select.value=prefValue(data||{});sync()}catch(e){console.warn('Chargement préférence planning',e)}})();
 try{
  if(typeof saveProfile==='function'&&!saveProfile.__planningPrefHook){const base=saveProfile;const hooked=async function(){sync();return base.apply(this,arguments)};hooked.__planningPrefHook=true;saveProfile=hooked}
 }catch(e){console.warn('Planning preference profile hook',e)}
 return true;
}
async function saveAdminPreference(userId,value){
 try{
  if(typeof db==='undefined'||!db)return;
  const row=(typeof users!=='undefined'?users.find(x=>x.id===userId):null),current=row?.ui_preferences&&typeof row.ui_preferences==='object'?row.ui_preferences:{};
  const prefs={...current,planning_view:value};
  const {error}=await db.from('profiles').update({ui_preferences:prefs}).eq('id',userId);if(error)throw error;
  if(row)row.ui_preferences=prefs;
  const state=document.getElementById('planningPreferenceAdminState');if(state){state.textContent='✓ Préférence enregistrée';state.className='fieldHelp ok'}
  try{window.NettoSounds?.play?.('success')}catch(_){}
 }catch(e){const state=document.getElementById('planningPreferenceAdminState');if(state){state.textContent='Erreur : '+(e?.message||'enregistrement impossible');state.className='fieldHelp err'};try{window.NettoSounds?.play?.('error')}catch(_){}}
}
function accountsPage(){
 const detail=document.getElementById('detail');if(!detail)return false;
 const inject=()=>{
  if(document.getElementById('editPlanningView'))return;
  let u=null;try{u=typeof users!=='undefined'&&typeof selectedId!=='undefined'?users.find(x=>x.id===selectedId):null}catch(_){}
  if(!u)return;
  const grid=detail.querySelector('.formGrid');if(!grid)return;
  const field=document.createElement('div');field.className='field full';field.innerHTML='<label for="editPlanningView">Affichage du planning par défaut</label><select id="editPlanningView"><option value="classic">Classique</option><option value="agenda">Agenda</option></select><span id="planningPreferenceAdminState" class="fieldHelp">Préférence personnelle du compte.</span>';
  grid.appendChild(field);const select=field.querySelector('select');select.value=prefValue(u);select.addEventListener('change',()=>saveAdminPreference(u.id,select.value));
  const prefGrid=detail.querySelector('.preferencesGrid');if(prefGrid&&!prefGrid.querySelector('[data-planning-pref]')){const box=document.createElement('div');box.className='preferenceBox';box.dataset.planningPref='1';box.innerHTML='<span>Planning</span><strong>'+(select.value==='agenda'?'Agenda':'Classique')+'</strong>';prefGrid.appendChild(box);select.addEventListener('change',()=>{box.querySelector('strong').textContent=select.value==='agenda'?'Agenda':'Classique'})}
 };
 new MutationObserver(inject).observe(detail,{childList:true,subtree:true});inject();return true;
}
function boot(){profilePage();accountsPage();let n=0;const t=setInterval(()=>{profilePage();accountsPage();if(++n>40)clearInterval(t)},150)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();