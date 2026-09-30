(function(){
'use strict';
const COLORS=['#FF3B30','#FF8A00','#1F2937','#6B7280'];
const state={host:null,mounted:false,unsubscribe:null,selectedFile:null,objectUrl:null,crop:{img:null,base:1,zoom:1,x:0,y:0,drag:false,px:0,py:0},rewards:[],equipment:[]};
function services(){return window.NethorMobileServices||window.MobileServices||null}
function router(){return window.NethorMobileRouter||window.MobileRouter||null}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function roleLabel(role){return({admin:'Administrateur','role_point-de-vente':'Point de vente',responsable:'Responsable',employe:'Employé',lecture:'Lecture seule'})[role]||String(role||'Compte')}
function initials(name){return String(name||'U').trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()).join('')||'U'}
function back(){router()?.replace?.('user-menu',{source:'profile-back'})}
function root(){return state.host?.querySelector('[data-profile-view]')}
function render(){
 const shared=services(),p=shared?.profile;if(!state.mounted||!state.host||!p)return;
 const theme=p.ui_preferences?.theme==='dark'?'dark':'light',color=COLORS.includes(String(p.profile_color||'').toUpperCase())?String(p.profile_color).toUpperCase():COLORS[0];
 state.host.innerHTML='<div class="nethorProfileView" data-profile-view>'+
 '<div class="npvTop"><button type="button" data-action="back" class="npvBack" aria-label="Retour">‹</button><div><h1>Mon profil</h1><p>Identité, apparence et sécurité de ton compte.</p></div></div>'+
 '<section class="npvCard npvIdentity"><div class="npvAvatarWrap"><div class="npvAvatar" data-avatar style="background:'+esc(color)+'">'+initials(p.display_name)+'</div><button class="npvAvatarEdit" data-action="avatar-open" type="button" aria-label="Modifier la photo">✎</button></div><div class="npvIdentityCopy"><h2>'+esc(p.display_name||'Utilisateur')+'</h2><span>'+esc(roleLabel(p.role))+'</span></div></section>'+
 '<section class="npvCard"><div class="npvCardHead"><h2>Apparence</h2><p>Ta couleur et ton thème te suivent sur tes appareils.</p></div><div class="npvField"><label>Couleur du profil</label><div class="npvColors">'+COLORS.map(c=>'<button type="button" data-color="'+c+'" class="'+(c===color?'active':'')+'" style="--c:'+c+'" aria-label="'+c+'"></button>').join('')+'</div></div><div class="npvField"><label for="npvTheme">Thème</label><select id="npvTheme"><option value="light" '+(theme==='light'?'selected':'')+'>Mode clair</option><option value="dark" '+(theme==='dark'?'selected':'')+'>Mode sombre</option></select></div><button class="npvPrimary" data-action="save-profile" type="button">Enregistrer le profil</button><div class="npvState" data-profile-state></div></section>'+
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
 el.innerHTML='';el.style.background=p.profile_color||COLORS[0];
 if(shared.avatarUrl){const img=document.createElement('img');img.src=shared.avatarUrl;img.alt='Photo de profil';el.appendChild(img)}
 else el.textContent=initials(p.display_name)
}
function stateText(sel,msg,type=''){const el=root()?.querySelector(sel);if(el){el.textContent=msg;el.className='npvState'+(type?' '+type:'')}}
async function saveProfile(button){
 const p=services()?.profile;if(!p)return;
 const color=root()?.querySelector('.npvColors button.active')?.dataset.color||p.profile_color||COLORS[0];
 const theme=root()?.querySelector('#npvTheme')?.value==='dark'?'dark':'light';
 button.disabled=true;stateText('[data-profile-state]','Enregistrement…');
 try{
  const prefs={...(p.ui_preferences||{}),theme};
  await services().updateProfile({profile_color:color,ui_preferences:prefs});
  document.documentElement.dataset.theme=theme;try{localStorage.setItem('nettoTheme',theme)}catch(_){}
  stateText('[data-profile-state]','✓ Profil enregistré.','ok');paintAvatar()
 }catch(e){stateText('[data-profile-state]','Erreur : '+(e?.message||'enregistrement impossible'),'err')}
 finally{button.disabled=false}
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
function onClick(e){
 const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action;
 if(a==='back')back();else if(a==='save-profile')void saveProfile(b);else if(a==='change-password')void changePassword(b);else if(a==='avatar-open')openAvatar();else if(a==='avatar-close')cleanupAvatar();else if(a==='avatar-choose')root()?.querySelector('[data-avatar-input]')?.click();else if(a==='avatar-save')void saveAvatar(b);else if(a==='avatar-remove')void removeAvatar(b);else if(a==='zoom-out')setZoom(state.crop.zoom-.1);else if(a==='zoom-in')setZoom(state.crop.zoom+.1);else if(a==='open-rewards')router()?.open?.('rewards',{source:'profile'});else if(a==='open-notifications')router()?.open?.('notifications',{source:'profile'});else if(a==='sound-test')window.NettoSounds?.play?.('confirm')
}
function onChange(e){if(e.target.matches('[data-avatar-input]'))chooseFile(e.target);else if(e.target.matches('[data-crop-zoom]'))setZoom(e.target.value);else if(e.target.matches('[data-reward-kind]'))void equipReward(e.target);else if(e.target.matches('[data-sound-enabled]')){window.NettoSounds?.setEnabled?.(e.target.checked);syncSounds()}else if(e.target.matches('[data-sound-volume]')){const n=Math.max(0,Math.min(100,Number(e.target.value)||0));window.NettoSounds?.setVolume?.(n/100);syncSounds()}}
function onProfile(detail){if(state.mounted&&['core','ready'].includes(detail?.type))render()}
async function mount(host){state.host=host;state.mounted=true;host.innerHTML='<div class="npvLoading">Chargement du profil…</div>';host.addEventListener('click',onClick);host.addEventListener('change',onChange);host.addEventListener('input',onChange);await services()?.ready?.();if(!state.mounted)return false;state.unsubscribe=services()?.subscribe?.(onProfile,{immediate:false})||null;render();return true}
async function unmount(){state.mounted=false;if(typeof state.unsubscribe==='function')state.unsubscribe();state.unsubscribe=null;cleanupAvatar();if(state.host){state.host.removeEventListener('click',onClick);state.host.removeEventListener('change',onChange);state.host.removeEventListener('input',onChange);state.host.innerHTML=''}state.host=null;return true}
const api=Object.freeze({mount,unmount,render});
window.NethorMobileProfileView=api;router()?.register?.('profile',api);
})();