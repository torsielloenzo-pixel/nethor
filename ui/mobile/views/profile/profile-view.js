(function(){
'use strict';
const state={host:null,mounted:false,unsubscribe:null,selectedFile:null,objectUrl:null,crop:{img:null,base:1,zoom:1,x:0,y:0,drag:false,px:0,py:0},rewards:[],equipment:[],email:{loaded:false,configured:false,mode:'loading',busy:false},pendingFrame:null,frameSaving:false};
function services(){return window.NethorMobileServices||window.MobileServices||null}
function router(){return window.NethorMobileRouter||window.MobileRouter||null}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function roleLabel(role){return({admin:'Administrateur','role_point-de-vente':'Point de vente',responsable:'Responsable',employe:'Employé',lecture:'Lecture seule'})[role]||String(role||'Compte')}
function initials(name){return String(name||'U').trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()).join('')||'U'}
function activeProfileTheme(){
 const custom=String(document.documentElement.dataset.nethorMobileTheme||'').trim().toLowerCase();
 const key=['mineral','sage','plum','halloween'].includes(custom)?custom:(document.documentElement.dataset.theme==='dark'?'dark':'light');
 return{key,label:({light:'Clair',dark:'Sombre',mineral:'Bleu minéral',sage:'Sauge',plum:'Prune nocturne',halloween:'Halloween'})[key]||'Clair'}
}
function profileThemeFrames(){
 const theme=activeProfileTheme().key,raw=services()?.siteConfig?.platform_ui?.mobile?.profile_frames?.themes?.[theme];
 return{theme,frames:Array.isArray(raw)?raw.filter(x=>x&&x.id&&x.url):[]}
}
function profileFrameChoicesHtml(profile){
 const data=profileThemeFrames(),current=state.pendingFrame===null?String(profile?.avatar_frame||''):state.pendingFrame,themeLabel=activeProfileTheme().label;
 if(!data.frames.length)return '<div class="npvFrameEmpty">Aucun cadre disponible pour le thème '+esc(themeLabel)+'.</div>';
 const noneActive=!data.frames.some(x=>x.id===current);
 return '<div class="npvFrameChoices">'+
  '<button type="button" class="npvFrameChoice none '+(noneActive?'active':'')+'" data-profile-frame=""><span class="npvFrameNone">∅</span><strong>Aucun cadre</strong></button>'+
  data.frames.map(frame=>'<button type="button" class="npvFrameChoice '+(frame.id===current?'active':'')+'" data-profile-frame="'+esc(frame.id)+'"><span class="npvFramePreview"><b>'+initials(profile?.display_name)+'</b><img src="'+esc(frame.url)+'" alt=""></span><strong>'+esc(frame.name)+'</strong></button>').join('')+
 '</div>'
}
function emailCardHtml(){
 const email=state.email,loading=!email.loaded||email.mode==='loading';
 let body='';
 if(loading)body='<div class="npvEmailLoading">Chargement de l’adresse e-mail…</div>';
 else if(email.mode==='change')body='<div class="npvEmailFields"><label><span>Ancienne adresse e-mail</span><input data-recovery-email-old type="email" autocomplete="email" inputmode="email" placeholder="Ancienne adresse e-mail"></label><label><span>Nouvelle adresse e-mail</span><input data-recovery-email-next type="email" autocomplete="email" inputmode="email" placeholder="Nouvelle adresse e-mail"></label></div><div class="npvEmailActions"><button class="npvSecondary" data-action="email-cancel" type="button">Annuler</button><button class="npvPrimary" data-action="email-save-change" type="button">Enregistrer la nouvelle adresse</button></div><button class="npvEmailReset" data-action="email-reset" type="button">Je ne connais plus l’ancienne adresse e-mail</button>';
 else if(email.configured)body='<div class="npvEmailConfigured"><span class="npvEmailCheck">✓</span><div><strong>Adresse e-mail enregistrée</strong><small>L’adresse complète reste masquée pour protéger ton compte.</small></div></div><button class="npvSecondary npvEmailModify" data-action="email-change" type="button">Modifier</button>';
 else body='<div class="npvEmailFields"><label><span>Adresse e-mail</span><input data-recovery-email-new type="email" autocomplete="email" inputmode="email" placeholder="nom@exemple.fr"><small>Un e-mail te sera envoyé immédiatement après l’enregistrement.</small></label></div><button class="npvPrimary" data-action="email-save" type="button">Enregistrer l’adresse e-mail</button>';
 return '<section class="npvCard npvEmailCard"><div class="npvCardHead"><h2>Adresse e-mail de récupération</h2><p>Ajoute une adresse personnelle pour sécuriser la récupération de ton compte. Lorsqu’une adresse est déjà enregistrée, elle reste masquée.</p></div>'+body+'<div class="npvState" data-email-state aria-live="polite"></div></section>'
}
function back(){router()?.replace?.('user-menu',{source:'profile-back'})}
function root(){return state.host?.querySelector('[data-profile-view]')}
function render(){
 const shared=services(),p=shared?.profile;if(!state.mounted||!state.host||!p)return;
 const appearance=activeProfileTheme();
 state.host.innerHTML='<div class="nethorProfileView" data-profile-view>'+
 '<div class="npvTop"><button type="button" data-action="back" class="npvBack" aria-label="Retour">‹</button><div><h1>Mon profil</h1><p>Identité, apparence et sécurité de ton compte.</p></div></div>'+
 '<section class="npvCard npvIdentity"><div class="npvAvatarWrap"><div class="npvAvatar" data-avatar>'+initials(p.display_name)+'</div><button class="npvAvatarEdit" data-action="avatar-open" type="button" aria-label="Modifier la photo">✎</button></div><div class="npvIdentityCopy"><h2>'+esc(p.display_name||'Utilisateur')+'</h2><span>'+esc(roleLabel(p.role))+'</span></div></section>'+
 '<section class="npvCard npvThemeIdentity"><div class="npvCardHead"><h2>Apparence du profil</h2><p>La couleur et les cadres proposés suivent automatiquement le thème Mobile actif.</p></div><div class="npvThemeIdentityRow"><span class="npvThemeIdentitySwatch">'+initials(p.display_name)+'</span><div><strong>'+esc(appearance.label)+'</strong><small>Palette synchronisée avec le thème · aucun choix de couleur manuel</small></div></div><div class="npvFrameSection"><div class="npvFrameSectionHead"><strong>Cadre du profil</strong><small>Cadres disponibles pour '+esc(appearance.label)+' uniquement</small></div>'+profileFrameChoicesHtml(p)+'<button type="button" class="npvPrimary" data-action="frame-save">Enregistrer le cadre</button><div class="npvState" data-frame-state aria-live="polite"></div></div></section>'+emailCardHtml()+
 '<section class="npvCard"><div class="npvCardHead"><h2>Sécurité du compte</h2><p>Le mot de passe actuel est vérifié avant modification.</p></div><div class="npvPasswordGrid"><input data-current-password type="password" autocomplete="current-password" placeholder="Mot de passe actuel"><input data-new-password type="password" autocomplete="new-password" minlength="8" placeholder="Nouveau mot de passe"><input data-confirm-password type="password" autocomplete="new-password" minlength="8" placeholder="Confirmer le nouveau mot de passe"></div><button class="npvPrimary" data-action="change-password" type="button">Changer le mot de passe</button><div class="npvState" data-password-state></div></section>'+
 (p.role==='admin'?'<section class="npvCard"><div class="npvCardHead"><h2>Personnalisation avancée</h2><p>Avatar de poste, cadre, accessoire, titre et thème de récompense.</p></div><div class="npvRewardGrid" data-reward-grid><div class="npvState">Chargement…</div></div><button class="npvSecondary" data-action="open-rewards" type="button">Ouvrir Défis & Boutique</button><div class="npvState" data-reward-state></div></section><section class="npvCard" data-sound-card><div class="npvCardHead"><h2>Sons d’interface</h2><p>Réglages locaux à cet appareil.</p></div><label class="npvSwitch"><input data-sound-enabled type="checkbox"><span>Activer les sons</span></label><label class="npvVolume">Volume <b data-sound-value>72%</b><input data-sound-volume type="range" min="0" max="100" value="72"></label><button class="npvSecondary" data-action="sound-test" type="button">Tester</button></section>':'')+
 '<section class="npvCard"><div class="npvCardHead"><h2>Notifications</h2><p>Consulte ton centre d’activité complet.</p></div><button class="npvSecondary" data-action="open-notifications" type="button">Ouvrir les notifications</button></section>'+
 '<div class="npvAvatarModal hidden" data-avatar-modal><div class="npvAvatarDialog"><div class="npvModalHead"><div><strong>Photo de profil</strong><small>Choisis puis recadre l’image.</small></div><button type="button" data-action="avatar-close">×</button></div><input data-avatar-input type="file" accept="image/jpeg,image/png,image/webp" hidden><div class="npvCrop hidden" data-crop-stage><img data-crop-image alt=""><div></div></div><div class="npvCropTools hidden" data-crop-tools><button type="button" data-action="zoom-out">−</button><input data-crop-zoom type="range" min="1" max="3" step=".01" value="1"><button type="button" data-action="zoom-in">+</button></div><div class="npvModalActions"><button type="button" class="npvPrimary" data-action="avatar-choose">Choisir une image</button>'+(p.avatar_path?'<button type="button" class="npvDanger" data-action="avatar-remove">Supprimer</button>':'')+'<button type="button" class="npvSecondary" data-action="avatar-save" disabled>Valider</button></div><div class="npvState" data-avatar-state></div></div></div>'+
 '</div>';
 paintAvatar();
 bindCropStage();
 if(p.role==='admin'){loadRewards().catch(()=>{});syncSounds()}
}
function paintAvatar(){
 const shared=services(),p=shared?.profile,el=root()?.querySelector('[data-avatar]');if(!p||!el)return;
 el.innerHTML='';el.style.background='var(--nethor-profile-avatar-bg,#ff5a2a)';el.style.color='var(--nethor-profile-avatar-fg,#fff)';
 if(shared.avatarUrl){const img=document.createElement('img');img.src=shared.avatarUrl;img.alt='Photo de profil';el.appendChild(img)}
 else el.textContent=initials(p.display_name);
 const frame=String(p.avatar_frame||'').trim();
 if(frame)el.dataset.avatarFrame=frame;else delete el.dataset.avatarFrame
}
function stateText(sel,msg,type=''){const el=root()?.querySelector(sel);if(el){el.textContent=msg;el.className='npvState'+(type?' '+type:'')}}
async function invokeProfileEmail(body){
 const client=services()?.client;if(!client)throw new Error('Service indisponible');
 const {data,error}=await client.functions.invoke('profile-email',{body});
 if(error){
  let message=data?.error||data?.message||'';
  try{
   const response=error.context;
   if(!message&&response){
    const copy=response.clone?response.clone():response,type=copy.headers?.get?.('content-type')||'';
    if(type.includes('application/json')){const payload=await copy.json();message=payload?.error||payload?.message||''}
    else{const txt=await copy.text();if(txt)message=txt.slice(0,300)}
   }
  }catch(_){}
  throw new Error(message||error.message||'Action impossible')
 }
 if(data?.error)throw new Error(data.error);
 return data||{}
}
function validRecoveryEmail(value){
 const v=String(value||'').trim().toLowerCase();
 return v.length>=5&&v.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)&&!/@stock-fl\.local$/i.test(v)
}
async function loadRecoveryEmailStatus(){
 state.email.mode='loading';state.email.loaded=false;render();
 try{
  const data=await invokeProfileEmail({action:'status'});
  state.email.configured=!!data.configured;
  state.email.mode=state.email.configured?'configured':'empty';
  state.email.loaded=true;render()
 }catch(_){
  state.email.configured=false;state.email.mode='empty';state.email.loaded=true;render();
  stateText('[data-email-state]','Impossible de charger l’état de l’adresse e-mail.','err')
 }
}
function openRecoveryEmailChange(){if(!state.email.configured||state.email.busy)return;state.email.mode='change';render();setTimeout(()=>root()?.querySelector('[data-recovery-email-old]')?.focus(),40)}
function cancelRecoveryEmailChange(){if(state.email.busy)return;state.email.mode='configured';render()}
async function saveRecoveryEmail(button,changing){
 if(state.email.busy)return;
 const oldEmail=changing?String(root()?.querySelector('[data-recovery-email-old]')?.value||'').trim().toLowerCase():'';
 const newEmail=String(root()?.querySelector(changing?'[data-recovery-email-next]':'[data-recovery-email-new]')?.value||'').trim().toLowerCase();
 if(changing&&!validRecoveryEmail(oldEmail)){stateText('[data-email-state]','Renseigne correctement l’ancienne adresse e-mail.','err');window.NettoSounds?.play?.('warning');return}
 if(!validRecoveryEmail(newEmail)){stateText('[data-email-state]','Renseigne une adresse e-mail valide.','err');window.NettoSounds?.play?.('warning');return}
 if(changing&&oldEmail===newEmail){stateText('[data-email-state]','La nouvelle adresse doit être différente de l’ancienne.','err');window.NettoSounds?.play?.('warning');return}
 state.email.busy=true;button.disabled=true;stateText('[data-email-state]',changing?'Vérification et modification de l’adresse…':'Enregistrement de l’adresse…');
 try{
  const data=await invokeProfileEmail({action:'save',old_email:oldEmail,new_email:newEmail});
  state.email.configured=true;state.email.mode='configured';render();
  if(data.mail_status==='sent')stateText('[data-email-state]','✓ Adresse e-mail enregistrée. Un e-mail vient de t’être envoyé.','ok');
  else if(data.mail_status==='not_configured')stateText('[data-email-state]','✓ Adresse e-mail enregistrée. L’envoi automatique d’e-mail n’est pas encore configuré.','ok');
  else stateText('[data-email-state]','✓ Adresse e-mail enregistrée, mais l’e-mail de confirmation n’a pas pu être envoyé.','ok');
  window.NettoSounds?.play?.('success')
 }catch(e){
  stateText('[data-email-state]','Erreur : '+(e?.message||'enregistrement impossible.'),'err');
  window.NettoSounds?.play?.('error')
 }finally{state.email.busy=false}
}
async function requestRecoveryEmailReset(button){
 if(!state.email.configured||state.email.busy)return;
 if(!confirm('Envoyer une demande à l’administrateur pour réinitialiser l’adresse e-mail enregistrée ?'))return;
 state.email.busy=true;button.disabled=true;stateText('[data-email-state]','Envoi de la demande à l’administrateur…');
 try{
  const data=await invokeProfileEmail({action:'request-reset'});
  stateText('[data-email-state]',data.already_pending?'✓ Une demande de réinitialisation est déjà en attente.':'✓ Demande envoyée à l’administrateur.','ok');
  window.NettoSounds?.play?.('success')
 }catch(e){
  stateText('[data-email-state]','Erreur : '+(e?.message||'demande impossible.'),'err');
  window.NettoSounds?.play?.('error')
 }finally{state.email.busy=false;button.disabled=false}
}
async function changePassword(button){
 const current=root()?.querySelector('[data-current-password]')?.value||'',next=root()?.querySelector('[data-new-password]')?.value||'',confirmValue=root()?.querySelector('[data-confirm-password]')?.value||'';
 if(!current||!next||!confirmValue){stateText('[data-password-state]','Renseigne les trois champs.','err');return}
 if(next.length<8){stateText('[data-password-state]','8 caractères minimum.','err');return}
 if(next!==confirmValue){stateText('[data-password-state]','La confirmation ne correspond pas.','err');return}
 if(current===next){stateText('[data-password-state]','Choisis un mot de passe différent.','err');return}
 button.disabled=true;stateText('[data-password-state]','Vérification…');
 try{
  await services().changePassword(current,next);
  root().querySelectorAll('[data-current-password],[data-new-password],[data-confirm-password]').forEach(x=>x.value='');
  stateText('[data-password-state]','✓ Mot de passe modifié.','ok')
 }catch(e){stateText('[data-password-state]',e?.message||'Modification impossible.','err')}
 finally{button.disabled=false}
}
function openAvatar(){
 const modal=root()?.querySelector('[data-avatar-modal]');modal?.classList.remove('hidden');document.body.style.overflow='hidden';
 stateText('[data-avatar-state]','')
}
function cleanupAvatar(){
 if(state.objectUrl){URL.revokeObjectURL(state.objectUrl);state.objectUrl=null}
 state.selectedFile=null;state.crop={img:null,base:1,zoom:1,x:0,y:0,drag:false,px:0,py:0};
 const modal=root()?.querySelector('[data-avatar-modal]');modal?.classList.add('hidden');
 document.body.style.overflow=''
}
function cropSize(){return root()?.querySelector('[data-crop-stage]')?.clientWidth||280}
function constrainCrop(){const c=state.crop;if(!c.img)return;const v=cropSize(),scale=c.base*c.zoom,w=c.img.naturalWidth*scale,h=c.img.naturalHeight*scale;c.x=Math.min(0,Math.max(v-w,c.x));c.y=Math.min(0,Math.max(v-h,c.y))}
function applyCrop(){const c=state.crop,img=root()?.querySelector('[data-crop-image]');if(!c.img||!img)return;constrainCrop();const scale=c.base*c.zoom;img.style.width=(c.img.naturalWidth*scale)+'px';img.style.height=(c.img.naturalHeight*scale)+'px';img.style.transform='translate('+c.x+'px,'+c.y+'px)'}
function setZoom(value){const c=state.crop;if(!c.img)return;const next=Math.max(1,Math.min(3,Number(value)||1)),v=cropSize(),old=c.base*c.zoom,neu=c.base*next,ratio=neu/old;c.x=v/2-(v/2-c.x)*ratio;c.y=v/2-(v/2-c.y)*ratio;c.zoom=next;const input=root()?.querySelector('[data-crop-zoom]');if(input)input.value=String(next);applyCrop()}
function bindCropStage(){const stage=root()?.querySelector('[data-crop-stage]');if(!stage)return;stage.onpointerdown=e=>{if(!state.crop.img)return;e.preventDefault();state.crop.drag=true;state.crop.px=e.clientX;state.crop.py=e.clientY;try{stage.setPointerCapture(e.pointerId)}catch(_){}};stage.onpointermove=e=>{if(!state.crop.drag)return;e.preventDefault();state.crop.x+=e.clientX-state.crop.px;state.crop.y+=e.clientY-state.crop.py;state.crop.px=e.clientX;state.crop.py=e.clientY;applyCrop()};const stop=()=>state.crop.drag=false;stage.onpointerup=stop;stage.onpointercancel=stop}
function chooseFile(input){const f=input.files?.[0];if(!f)return;if(f.size>5*1024*1024){alert('Image trop lourde : 5 Mo maximum.');input.value='';return}state.selectedFile=f;if(state.objectUrl)URL.revokeObjectURL(state.objectUrl);state.objectUrl=URL.createObjectURL(f);const img=root()?.querySelector('[data-crop-image]'),stage=root()?.querySelector('[data-crop-stage]'),tools=root()?.querySelector('[data-crop-tools]');if(!img)return;stage?.classList.remove('hidden');tools?.classList.remove('hidden');img.onload=()=>{const v=cropSize();state.crop.img=img;state.crop.base=Math.max(v/img.naturalWidth,v/img.naturalHeight);state.crop.zoom=1;state.crop.x=(v-img.naturalWidth*state.crop.base)/2;state.crop.y=(v-img.naturalHeight*state.crop.base)/2;applyCrop()};img.src=state.objectUrl;const save=root()?.querySelector('[data-action="avatar-save"]');if(save)save.disabled=false;stateText('[data-avatar-state]','Déplace l’image et ajuste le zoom, puis valide.')}
async function croppedFile(){if(!state.selectedFile||!state.crop.img)return state.selectedFile;const v=cropSize(),size=512,c=state.crop,scale=c.base*c.zoom,factor=size/v,canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(c.img,c.x*factor,c.y*factor,c.img.naturalWidth*scale*factor,c.img.naturalHeight*scale*factor);const type=['image/jpeg','image/png','image/webp'].includes(state.selectedFile.type)?state.selectedFile.type:'image/jpeg';const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Recadrage impossible')),type,type==='image/png'?undefined:.92));return new File([blob],'avatar.'+(type==='image/png'?'png':type==='image/webp'?'webp':'jpg'),{type})}
async function saveAvatar(button){if(!state.selectedFile)return;button.disabled=true;stateText('[data-avatar-state]','Enregistrement…');try{await services().uploadAvatar(await croppedFile());cleanupAvatar();render()}catch(e){stateText('[data-avatar-state]','Erreur : '+(e?.message||'envoi impossible'),'err');button.disabled=false}}
async function removeAvatar(button){button.disabled=true;try{await services().removeAvatar();cleanupAvatar();render()}catch(e){stateText('[data-avatar-state]','Erreur : '+(e?.message||'suppression impossible'),'err');button.disabled=false}}
async function loadRewards(){
 const p=services()?.profile;if(p?.role!=='admin')return;
 const db=services()?.client;if(!db)return;
 const [catalog,equipment]=await Promise.all([db.from('reward_catalog').select('id,name,kind,visual,price,active').order('price'),db.from('reward_equipment').select('kind,item_id').eq('user_id',services().session.user.id)]);
 if(catalog.error||equipment.error)throw catalog.error||equipment.error;
 state.rewards=catalog.data||[];state.equipment=equipment.data||[];
 const grid=root()?.querySelector('[data-reward-grid]');if(!grid)return;
 const kinds=[['avatar','Avatar de poste'],['frame','Cadre'],['accessory','Accessoire'],['title','Titre'],['theme','Thème d’accent']];
 grid.innerHTML=kinds.map(([kind,label])=>{const current=state.equipment.find(x=>x.kind===kind)?.item_id||'',rows=state.rewards.filter(x=>x.kind===kind&&(x.active||x.id===current));return '<label><span>'+label+'</span><select data-reward-kind="'+kind+'"><option value="">Aucun</option>'+rows.map(x=>'<option value="'+esc(x.id)+'" '+(x.id===current?'selected':'')+'>'+esc(x.name+(x.visual&&kind!=='avatar'?' · '+x.visual:''))+'</option>').join('')+'</select></label>'}).join('')
}
async function equipReward(select){const kind=select.dataset.rewardKind;select.disabled=true;stateText('[data-reward-state]','Application…');try{const {error}=await services().client.rpc('reward_equip',{p_kind:kind,p_item:select.value||null});if(error)throw error;stateText('[data-reward-state]','✓ Personnalisation appliquée.','ok');await loadRewards()}catch(e){stateText('[data-reward-state]','Erreur : '+(e?.message||'application impossible'),'err')}finally{select.disabled=false}}
function syncSounds(){const s=window.NettoSounds,card=root()?.querySelector('[data-sound-card]');if(!card||!s){card?.classList.add('hidden');return}const enabled=!!s.isEnabled?.(),volume=Math.round((s.getVolume?.()??.72)*100);const toggle=card.querySelector('[data-sound-enabled]'),range=card.querySelector('[data-sound-volume]'),label=card.querySelector('[data-sound-value]');if(toggle)toggle.checked=enabled;if(range)range.value=String(volume);if(label)label.textContent=volume+'%'}
function selectProfileFrame(button){
 const id=String(button?.dataset?.profileFrame||'').trim(),available=profileThemeFrames().frames;
 if(id&&!available.some(x=>x.id===id))return;
 state.pendingFrame=id;
 root()?.querySelectorAll('[data-profile-frame]').forEach(x=>x.classList.toggle('active',x===button));
 stateText('[data-frame-state]','Cadre sélectionné. Appuie sur Enregistrer pour confirmer.');
}
async function saveProfileFrame(button){
 if(state.frameSaving)return;
 const shared=services(),id=state.pendingFrame===null?String(shared?.profile?.avatar_frame||''):state.pendingFrame;
 const available=profileThemeFrames().frames;
 if(id&&!available.some(x=>x.id===id)){stateText('[data-frame-state]','Ce cadre n’est pas disponible avec ton thème.','err');return}
 state.frameSaving=true;button.disabled=true;
 stateText('[data-frame-state]','Enregistrement…');
 try{
  if(typeof shared?.updateProfile!=='function')throw new Error('Service profil indisponible');
  await shared.updateProfile({avatar_frame:id||null});
  const {data,error}=await shared.client.from('profiles').select('avatar_frame').eq('id',shared.session.user.id).single();
  if(error)throw error;
  if(String(data?.avatar_frame||'')!==id)throw new Error('Le cadre n’a pas été enregistré.');
  state.pendingFrame=null;
  render();
  stateText('[data-frame-state]',id?'✓ Cadre enregistré sur ton profil':'✓ Cadre retiré de ton profil','ok');
 }catch(e){stateText('[data-frame-state]','Erreur : '+(e?.message||'enregistrement impossible'),'err')}
 finally{state.frameSaving=false;button.disabled=false}
}
function onClick(e){
 const frame=e.target.closest('[data-profile-frame]');if(frame){selectProfileFrame(frame);return}
 const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action;
 if(a==='back')back();else if(a==='frame-save')void saveProfileFrame(b);else if(a==='email-save')void saveRecoveryEmail(b,false);else if(a==='email-change')openRecoveryEmailChange();else if(a==='email-cancel')cancelRecoveryEmailChange();else if(a==='email-save-change')void saveRecoveryEmail(b,true);else if(a==='email-reset')void requestRecoveryEmailReset(b);else if(a==='change-password')void changePassword(b);else if(a==='avatar-open')openAvatar();else if(a==='avatar-close')cleanupAvatar();else if(a==='avatar-choose')root()?.querySelector('[data-avatar-input]')?.click();else if(a==='avatar-save')void saveAvatar(b);else if(a==='avatar-remove')void removeAvatar(b);else if(a==='zoom-out')setZoom(state.crop.zoom-.1);else if(a==='zoom-in')setZoom(state.crop.zoom+.1);else if(a==='open-rewards')router()?.open?.('rewards',{source:'profile'});else if(a==='open-notifications')router()?.open?.('notifications',{source:'profile'});else if(a==='sound-test')window.NettoSounds?.play?.('confirm')
}
function onChange(e){if(e.target.matches('[data-avatar-input]'))chooseFile(e.target);else if(e.target.matches('[data-crop-zoom]'))setZoom(e.target.value);else if(e.target.matches('[data-reward-kind]'))void equipReward(e.target);else if(e.target.matches('[data-sound-enabled]')){window.NettoSounds?.setEnabled?.(e.target.checked);syncSounds()}else if(e.target.matches('[data-sound-volume]')){const n=Math.max(0,Math.min(100,Number(e.target.value)||0));window.NettoSounds?.setVolume?.(n/100);syncSounds()}}
function onProfile(detail){if(state.mounted&&['core','ready'].includes(detail?.type))render()}
async function mount(host){state.host=host;state.mounted=true;state.email={loaded:false,configured:false,mode:'loading',busy:false};state.pendingFrame=null;host.innerHTML='<div class="npvLoading">Chargement du profil…</div>';host.addEventListener('click',onClick);host.addEventListener('change',onChange);host.addEventListener('input',onChange);await services()?.ready?.();if(!state.mounted)return false;state.unsubscribe=services()?.subscribe?.(onProfile,{immediate:false})||null;render();void loadRecoveryEmailStatus();return true}
async function unmount(){state.mounted=false;if(typeof state.unsubscribe==='function')state.unsubscribe();state.unsubscribe=null;cleanupAvatar();if(state.host){state.host.removeEventListener('click',onClick);state.host.removeEventListener('change',onChange);state.host.removeEventListener('input',onChange);state.host.innerHTML=''}state.host=null;return true}
const api=Object.freeze({mount,unmount,render});
window.NethorMobileProfileView=api;router()?.register?.('profile',api);
})();