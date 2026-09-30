(function(){
'use strict';
const ICONS={planning_changes:'🗓️',direct_message:'💬',group_message:'👥',absence:'🏖️',admin_message:'📣',app_update:'⬆️',maintenance:'🛠️',security:'🔑'};
const state={host:null,mounted:false,rules:[]};
function services(){return window.NethorMobileServices||window.MobileServices||null}
function router(){return window.NethorMobileRouter||window.MobileRouter||null}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function root(){return state.host?.querySelector('[data-notification-settings-view]')}
function isIOS(){return /iPad|iPhone|iPod/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1}
function isStandalone(){return window.matchMedia?.('(display-mode: standalone)')?.matches===true||navigator.standalone===true}
function pushSupported(){return 'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window}
function b64(value){const pad='='.repeat((4-value.length%4)%4),base64=(value+pad).replace(/-/g,'+').replace(/_/g,'/'),raw=atob(base64),out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out}
async function currentSubscription(){if(!pushSupported())return null;const reg=await navigator.serviceWorker.ready;return reg.pushManager.getSubscription()}
function setPushUI(mode,title,text){
 const box=root()?.querySelector('[data-push-status]'),enable=root()?.querySelector('[data-action="push-enable"]'),disable=root()?.querySelector('[data-action="push-disable"]'),help=root()?.querySelector('[data-push-help]');
 if(!box)return;box.className='nnsPushStatus'+(mode?' '+mode:'');box.querySelector('strong').textContent=title;box.querySelector('small').textContent=text;
 if(enable)enable.classList.toggle('hidden',['active','blocked','unsupported','install'].includes(mode));
 if(disable)disable.classList.toggle('hidden',mode!=='active');
 if(help)help.classList.toggle('show',mode==='install')
}
async function refreshPush(){
 if(!pushSupported()){setPushUI('unsupported','Non compatible','Ce navigateur ne prend pas en charge les notifications Push.');return}
 if(isIOS()&&!isStandalone()){setPushUI('install','Installation requise','Ajoute Nethor à l’écran d’accueil avant d’activer les notifications.');return}
 try{
  const {data}=await services().client.from('notification_controls').select('enabled').eq('user_id',services().session.user.id).maybeSingle();
  if(data?.enabled===false){setPushUI('blocked','Notifications désactivées par l’administrateur','Les envois sont suspendus pour ton compte.');return}
 }catch(_){}
 if(Notification.permission==='denied'){setPushUI('blocked','Notifications bloquées','Réactive les notifications dans les réglages de ton appareil.');return}
 try{const sub=await currentSubscription();if(sub&&Notification.permission==='granted')setPushUI('active','Notifications activées','Les alertes autorisées peuvent être reçues sur cet appareil.');else setPushUI('','Notifications désactivées','Active-les pour recevoir les alertes autorisées.')}catch(_){setPushUI('warning','État indisponible','Impossible de vérifier l’abonnement Push.')}
}
async function syncSubscription(){if(!pushSupported()||Notification.permission!=='granted')return;try{const sub=await currentSubscription();if(sub)await services().client.functions.invoke('planning-push',{body:{action:'subscribe',subscription:sub.toJSON(),user_agent:navigator.userAgent}})}catch(_){}}
async function enablePush(button){
 if(!pushSupported()||(isIOS()&&!isStandalone())){await refreshPush();return}
 button.disabled=true;const stateEl=root()?.querySelector('[data-push-state]');if(stateEl)stateEl.textContent='Activation…';
 try{
  const permission=await Notification.requestPermission();
  if(permission!=='granted'){if(stateEl)stateEl.textContent=permission==='denied'?'Autorisation refusée.':'Activation annulée.';await refreshPush();return}
  const reg=await navigator.serviceWorker.ready;let sub=await reg.pushManager.getSubscription();
  if(!sub){const key=await services().client.functions.invoke('planning-push',{body:{action:'public-key'}});if(key.error||!key.data?.public_key)throw key.error||new Error('Clé Push indisponible');sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(key.data.public_key)})}
  const result=await services().client.functions.invoke('planning-push',{body:{action:'subscribe',subscription:sub.toJSON(),user_agent:navigator.userAgent}});if(result.error)throw result.error;
  if(stateEl)stateEl.textContent='✓ Notifications mobiles activées.';await refreshPush()
 }catch(e){if(stateEl)stateEl.textContent='Activation impossible.';console.error('[Nethor NotificationSettings]',e);await refreshPush()}
 finally{button.disabled=false}
}
async function disablePush(button){button.disabled=true;const stateEl=root()?.querySelector('[data-push-state]');if(stateEl)stateEl.textContent='Désactivation…';try{const sub=await currentSubscription();if(sub){try{await services().client.functions.invoke('planning-push',{body:{action:'unsubscribe',endpoint:sub.endpoint}})}catch(_){}await sub.unsubscribe()}if(stateEl)stateEl.textContent='Notifications mobiles désactivées.';await refreshPush()}catch(e){if(stateEl)stateEl.textContent='Désactivation impossible.'}finally{button.disabled=false}}
function mode(rule){const portal=rule.global_portal_enabled!==false&&rule.user_portal_enabled!==false,push=rule.push_allowed!==false&&rule.global_push_enabled!==false&&rule.user_push_enabled!==false;if(portal&&push)return'both';if(portal)return'portal';if(push)return'push';return'off'}
function options(rule){const portal=rule.global_portal_enabled!==false,push=rule.push_allowed!==false&&rule.global_push_enabled!==false,current=mode(rule),disabled=!rule.global_enabled||(!portal&&!push),out=[['off','Aucun']];if(portal)out.push(['portal','Portail']);if(push)out.push(['push','Push']);if(portal&&push)out.push(['both','Les deux']);return '<div class="nnsChannels">'+out.map(([m,label])=>'<button type="button" data-rule="'+esc(rule.rule_key)+'" data-mode="'+m+'" class="'+(current===m?'active':'')+'" '+(disabled?'disabled':'')+'>'+label+'</button>').join('')+'</div>'}
function renderRules(){const host=root()?.querySelector('[data-rule-list]');if(!host)return;if(!state.rules.length){host.innerHTML='<div class="nnsInfo">Aucun type de notification disponible.</div>';return}host.innerHTML=state.rules.map(r=>{const globalPortal=r.global_portal_enabled!==false,globalPush=r.push_allowed!==false&&r.global_push_enabled!==false,badge=globalPortal&&globalPush?'Push + portail':globalPortal?'Portail uniquement':globalPush?'Push uniquement':'Désactivé';return '<div class="nnsRule"><span class="nnsIcon">'+(ICONS[r.rule_key]||'🔔')+'</span><div class="nnsCopy"><strong>'+esc(r.label||r.rule_key)+'<em>'+esc(badge)+'</em></strong><p>'+esc(r.description||'')+'</p><small>'+esc(r.trigger_text||'')+'</small></div>'+options(r)+'</div>'}).join('')}
async function loadRules(){const host=root()?.querySelector('[data-rule-list]');if(host)host.innerHTML='<div class="nnsInfo">Chargement des préférences…</div>';try{state.rules=await services().notificationRules();renderRules()}catch(e){if(host)host.innerHTML='<div class="nnsInfo">Impossible de charger les préférences.</div>'}}
async function setRule(button){const key=button.dataset.rule,m=button.dataset.mode,row=state.rules.find(x=>x.rule_key===key);if(!row)return;const push=row.push_allowed!==false&&row.global_push_enabled!==false&&(m==='push'||m==='both'),portal=row.global_portal_enabled!==false&&(m==='portal'||m==='both');root()?.querySelectorAll('[data-rule="'+CSS.escape(key)+'"]').forEach(x=>x.disabled=true);try{await services().setNotificationChannels(key,{push,portal});row.user_push_enabled=push;row.user_portal_enabled=portal;renderRules()}catch(e){console.error('[Nethor NotificationSettings]',e);renderRules()}}
function render(){if(!state.mounted||!state.host)return;state.host.innerHTML='<div class="nethorNotificationSettingsView" data-notification-settings-view><div class="nnsTop"><button class="nnsBack" data-action="back" type="button">‹</button><div><h1>Notifications</h1><p>Choisis où recevoir chaque type de notification.</p></div></div><section class="nnsCard"><div class="nnsHead"><h2>Notifications mobiles</h2><p>Active ou désactive les Push sur cet appareil.</p></div><div class="nnsPush"><div class="nnsPushStatus" data-push-status><i></i><div><strong>Vérification…</strong><small>État des notifications sur cet appareil.</small></div></div><div class="nnsPushActions"><button class="nnsPrimary" data-action="push-enable" type="button">Activer</button><button class="nnsDanger hidden" data-action="push-disable" type="button">Désactiver</button></div></div><div class="nnsPushHelp" data-push-help>Sur iPhone, ouvre Nethor depuis l’icône ajoutée à l’écran d’accueil.</div><div class="nnsState" data-push-state></div></section><section class="nnsCard"><div class="nnsHead"><h2>Contrôle des notifications</h2><p>Choisis Portail, Push, les deux ou aucun.</p></div><div data-rule-list></div></section><div class="nnsInfo">Les réglages globaux définis par l’administrateur restent prioritaires.</div></div>';void Promise.all([loadRules(),refreshPush(),syncSubscription()])}
function onClick(e){const action=e.target.closest('[data-action]');if(action){if(action.dataset.action==='back')router()?.replace?.('user-menu',{source:'notification-settings-back'});else if(action.dataset.action==='push-enable')void enablePush(action);else if(action.dataset.action==='push-disable')void disablePush(action);return}const rule=e.target.closest('[data-rule][data-mode]');if(rule)void setRule(rule)}
async function mount(host){state.host=host;state.mounted=true;host.innerHTML='<div class="nnsLoading">Chargement…</div>';host.addEventListener('click',onClick);await services()?.ready?.();if(!state.mounted)return false;render();return true}
async function unmount(){state.mounted=false;if(state.host){state.host.removeEventListener('click',onClick);state.host.innerHTML=''}state.host=null;state.rules=[];return true}
const api=Object.freeze({mount,unmount,render});window.NethorMobileNotificationSettingsView=api;router()?.register?.('notification-settings',api);
})();