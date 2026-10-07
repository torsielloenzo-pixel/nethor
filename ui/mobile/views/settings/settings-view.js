(function(){
'use strict';
const MODULES=Object.freeze([
{id:'home',label:'Accueil',subtitle:'Retour au portail',url:'home.html',home:false,userMenu:true,defaultHome:false,defaultUser:true},
{id:'profile',label:'Mon profil',subtitle:'Profil et notifications',url:'profile.html',home:true,userMenu:true,defaultHome:false,defaultUser:true},
{id:'stock',label:'Stock F&L',subtitle:'Gestion du stock',url:'index.html',home:true,userMenu:true,defaultHome:true,defaultUser:true},
{id:'planning',label:'Planning',subtitle:'Horaires de l’équipe',url:'planning.html',home:true,userMenu:true,defaultHome:true,defaultUser:true},
{id:'chat',label:'Chat',subtitle:'Messagerie interne',url:'chat.html',home:true,userMenu:true,defaultHome:true,defaultUser:true},
{id:'scanner',label:'Scanner (bêta)',subtitle:'EAN13 vers fiche article',url:'scanner.html',home:false,userMenu:true,defaultHome:false,defaultUser:true,platform:'mobile'},
{id:'articles',label:'Fiches articles',subtitle:'Référentiel articles',url:'articles.html',home:true,userMenu:true,defaultHome:true,defaultUser:true},
{id:'notification_settings',label:'Réglages des notifications',subtitle:'Préférences et alertes',url:'notification-settings.html',home:false,userMenu:true,defaultHome:false,defaultUser:true},
{id:'problem_report',label:'Signaler un problème',subtitle:'Décrire et envoyer un bug',url:'report-problem.html',home:false,userMenu:true,defaultHome:false,defaultUser:true,platform:'mobile'},
{id:'rewards',label:'Défis & Boutique',subtitle:'Missions et récompenses',url:'rewards.html',roles:['admin'],home:true,userMenu:true,defaultHome:true,defaultUser:true},
{id:'bakery',label:'Boulangerie',subtitle:'Stock • Consulter • Gestion',url:'bakery.html',roles:['admin'],home:true,userMenu:true,defaultHome:true,defaultUser:true},
{id:'portal_admin',label:'Gestion',subtitle:'Portail, comptes et permissions',url:'admin-portal.html',roles:['admin'],home:true,userMenu:true,defaultHome:false,defaultUser:true}
]);
const WIDGETS=[
{id:'next_shift',label:'Prise de poste',description:'Prochaine prise de poste calculée depuis le planning.'},
{id:'hours',label:'Mes heures',description:'Total des heures planifiées sur la semaine.'},
{id:'absences',label:'Congés',description:'Congés issus du planning.'},
{id:'next_rest',label:'Prochain repos',description:'Prochain repos calculé.'},
{id:'tasks',label:'Tâches du jour',description:'Missions et validations de la journée.'},
{id:'important_info',label:'Informations importantes',description:'Notifications à surveiller.'},
{id:'team_today',label:'Équipe aujourd’hui',description:'Personnes planifiées aujourd’hui.'},
{id:'operations_hub',label:'Pilotage magasin',description:'Relève, service, commandes et livraisons.'}
];
const LEVEL={none:0,view:1,operate:2,manage:3};
const state={host:null,mounted:false,unsubscribe:null,prefs:null,dirty:false};
function services(){return window.NethorMobileServices||window.MobileServices||null}
function router(){return window.NethorMobileRouter||window.MobileRouter||null}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function roleLabel(r){return({admin:'Administrateur','role_point-de-vente':'Point de vente',responsable:'Responsable',employe:'Employé',lecture:'Lecture seule'})[r]||String(r||'Compte')}
function ensurePrefs(v){const p=v&&typeof v==='object'?JSON.parse(JSON.stringify(v)):{};p.home=p.home&&typeof p.home==='object'?p.home:{};p.home_widgets=p.home_widgets&&typeof p.home_widgets==='object'?p.home_widgets:{};p.user_menu=p.user_menu&&typeof p.user_menu==='object'?p.user_menu:{};p.theme=p.theme==='dark'||p.theme==='light'?p.theme:'light';p.mobile_theme=['mineral','sage','plum','halloween'].includes(p.mobile_theme)?p.mobile_theme:'';if(p.mobile_theme==='halloween'&&!services()?.halloweenThemeAllowed?.())p.mobile_theme='';return p}
function configModule(base){const cfg=services()?.siteConfig||{},p=cfg.pages?.[base.id]||{};return{...base,label:String(p.nav_label||p.label||base.label),subtitle:String(p.subtitle||base.subtitle||''),home:typeof p.home==='boolean'?p.home:base.home,userMenu:typeof p.user_menu==='boolean'?p.user_menu:base.userMenu,defaultHome:typeof p.default_home==='boolean'?p.default_home:base.defaultHome,defaultUser:typeof p.default_user==='boolean'?p.default_user:base.defaultUser,configuredRoles:Array.isArray(p.roles)?p.roles:null}}
function roleKeys(){const cfg=services()?.siteConfig||{},defs=cfg.role_definitions&&typeof cfg.role_definitions==='object'?Object.keys(cfg.role_definitions):[];return [...new Set(['admin','role_point-de-vente','responsable','employe','lecture',...defs])]}
function permission(m){const p=services()?.profile,cfg=services()?.siteConfig||{},role=p?.role||'';if(!m||!role)return'none';if(cfg.pages?.[m.id]?.enabled===false)return'none';if(role==='admin')return'manage';const max=Array.isArray(m.roles)?m.roles:roleKeys(),configured=Array.isArray(m.configuredRoles)?m.configuredRoles:max,explicit=cfg.role_permissions?.[m.id]?.[role];let base=Object.prototype.hasOwnProperty.call(LEVEL,explicit)?explicit:(configured.includes(role)?'view':'none');const extra=services()?.subrolePermissions?.[m.id];if(extra==='manage')return'manage';if(extra==='operate'&&base!=='manage')return'operate';if(extra==='view'&&base==='none')return'view';return base}
function available(area){const cfg=services()?.siteConfig||{},p=services()?.profile;return MODULES.map(configModule).filter(m=>{if(permission(m)==='none')return false;if(area==='home')return m.home;if(m.id==='profile')return false;if(p?.role!=='admin'){const items=cfg.mobile_user_menu?.items||{},global=typeof items[m.id]==='boolean'?items[m.id]:m.userMenu===true;if(!global)return false}return m.userMenu})}
function visible(area,m){const v=state.prefs?.[area]?.[m.id];if(typeof v==='boolean')return v;return area==='home'?m.defaultHome!==false:m.defaultUser!==false}
function widgetAllowed(id){const cfg=services()?.siteConfig||{},p=services()?.profile,node=cfg.home_widgets?.[id]||{},role=p?.role||'',rv=node.roles?.[role],fallback=id==='operations_hub'?role==='admin':true;return(typeof rv==='boolean'?rv:fallback)||(services()?.subroleKeys||[]).some(k=>node.subroles?.[k]===true)}
function markDirty(){state.dirty=true;const el=state.host?.querySelector('[data-save-state]');if(el){el.textContent='Modifications non enregistrées';el.className='nsvSaveState'}}
function itemHtml(area,m){return '<label class="nsvItem"><span class="nsvItemCopy"><strong>'+esc(m.label)+'</strong><small>'+esc(m.subtitle||'')+'</small></span><span class="nsvToggle"><input type="checkbox" data-pref-area="'+area+'" data-pref-id="'+esc(m.id)+'" '+(visible(area,m)?'checked':'')+'><i></i></span></label>'}
const THEME_OPTIONS=[
 {id:'light',icon:'☀',label:'Mode clair',detail:'Lumineux et classique.'},
 {id:'dark',icon:'☾',label:'Mode sombre',detail:'Anthracite intemporel.'},
 {id:'mineral',icon:'◈',label:'Bleu minéral',detail:'Bleu ardoise professionnel.'},
 {id:'sage',icon:'❧',label:'Sauge',detail:'Vert doux et naturel.'},
 {id:'plum',icon:'✦',label:'Prune nocturne',detail:'Violet profond et feutré.'},
 {id:'halloween',icon:'🎃',label:'Halloween',detail:'Citrouille, brume et nuit hantée.',restricted:true}
];
function themeButtons(selected){
 const canHalloween=services()?.halloweenThemeAllowed?.()===true;
 return THEME_OPTIONS.filter(t=>!t.restricted||canHalloween).map(t=>'<button type="button" data-theme-choice="'+t.id+'" class="'+(selected===t.id?'active':'')+'" aria-pressed="'+(selected===t.id)+'"><b class="nsvThemeSwatch '+t.id+'">'+t.icon+'</b><span class="nsvThemeLabel"><strong>'+t.label+'</strong><small>'+t.detail+'</small></span><i class="nsvThemeCheck" aria-hidden="true"></i></button>').join('')
}
function render(){
 const p=services()?.profile;if(!state.mounted||!state.host||!p)return;
 if(!state.prefs)state.prefs=ensurePrefs(p.ui_preferences);
 const homeAllowed=p.role==='admin'||services()?.siteConfig?.personalization?.home_menus_enabled!==false;
 const homes=homeAllowed?available('home'):[],menus=available('user_menu'),widgets=WIDGETS.filter(x=>widgetAllowed(x.id));
 const selected=state.prefs.mobile_theme||state.prefs.theme;
 state.host.innerHTML='<div class="nethorSettingsView"><div class="nsvTop"><button data-action="back" class="nsvBack" type="button">‹</button><div><h1>Personnalisation</h1><p>Affichage, thème et raccourcis de ton portail.</p></div></div><span class="nsvRole">'+esc(roleLabel(p.role))+'</span>'+
 '<section class="nsvPanel"><div class="nsvHead"><div><h2>Apparence</h2><p>Choisis une ambiance pour ton mobile. Le bureau reste inchangé avec les thèmes colorés.</p></div></div><div class="nsvThemes">'+themeButtons(selected)+'</div></section>'+
 (homeAllowed?'<section class="nsvPanel"><div class="nsvHead"><div><h2>Menus de l’accueil</h2><p>Choisis les pages visibles sur ton accueil.</p></div><div><button data-action="all-home" data-value="1">Tout afficher</button><button data-action="all-home" data-value="0">Tout masquer</button></div></div><div class="nsvGrid">'+homes.map(m=>itemHtml('home',m)).join('')+'</div></section>':'')+
 '<section class="nsvPanel"><div class="nsvHead"><div><h2>Widgets de l’accueil</h2><p>Synchronisés sur mobile et ordinateur.</p></div><div><button data-action="all-widgets" data-value="1">Tout afficher</button><button data-action="all-widgets" data-value="0">Tout masquer</button></div></div><div class="nsvGrid">'+widgets.map(w=>'<label class="nsvItem"><span class="nsvItemCopy"><strong>'+esc(w.label)+'</strong><small>'+esc(w.description)+'</small></span><span class="nsvToggle"><input type="checkbox" data-widget-id="'+w.id+'" '+((typeof state.prefs.home_widgets[w.id]==='boolean'?state.prefs.home_widgets[w.id]:true)?'checked':'')+'><i></i></span></label>').join('')+'</div></section>'+
 '<section class="nsvPanel"><div class="nsvHead"><div><h2>Menu utilisateur</h2><p>Choisis les raccourcis proposés dans ton menu.</p></div><div><button data-action="all-menu" data-value="1">Tout afficher</button><button data-action="all-menu" data-value="0">Tout masquer</button></div></div><div class="nsvGrid">'+menus.map(m=>itemHtml('user_menu',m)).join('')+'</div></section>'+
 '<div class="nsvActions"><span data-save-state class="nsvSaveState">'+(state.dirty?'Modifications non enregistrées':'À jour')+'</span><button class="nsvDanger" data-action="reset" type="button">Réinitialiser</button><button class="nsvPrimary" data-action="save" type="button">Enregistrer</button></div></div>'
}
function setAll(area,value){available(area).forEach(m=>state.prefs[area][m.id]=value);markDirty();render()}
function setWidgets(value){WIDGETS.filter(x=>widgetAllowed(x.id)).forEach(w=>state.prefs.home_widgets[w.id]=value);markDirty();render()}
async function save(button){button.disabled=true;const el=state.host?.querySelector('[data-save-state]');if(el)el.textContent='Enregistrement…';try{await services().savePreferences(state.prefs);state.dirty=false;services()?.previewTheme?.(state.prefs.mobile_theme,state.prefs.theme);render();const s=state.host?.querySelector('[data-save-state]');if(s){s.textContent='✓ Personnalisation enregistrée';s.className='nsvSaveState ok'}}catch(e){if(el){el.textContent='Erreur : '+(e?.message||'enregistrement impossible');el.className='nsvSaveState err'}}finally{button.disabled=false}}
async function reset(button){if(!confirm('Revenir à l’affichage par défaut prévu pour ton rôle ?'))return;const keepHome=services()?.profile?.role==='admin'||services()?.siteConfig?.personalization?.home_menus_enabled!==false?{}:JSON.parse(JSON.stringify(state.prefs.home||{}));state.prefs={home:keepHome,home_widgets:{},user_menu:{},theme:services()?.profile?.ui_preferences?.theme==='dark'?'dark':'light',mobile_theme:''};state.dirty=true;render();await save(state.host.querySelector('[data-action="save"]'))}
function onClick(e){const theme=e.target.closest('[data-theme-choice]');if(theme){const value=theme.dataset.themeChoice;if(['light','dark'].includes(value)){state.prefs.theme=value;state.prefs.mobile_theme=''}else if(['mineral','sage','plum'].includes(value))state.prefs.mobile_theme=value;else if(value==='halloween'&&services()?.halloweenThemeAllowed?.())state.prefs.mobile_theme=value;else return;services()?.previewTheme?.(state.prefs.mobile_theme,state.prefs.theme);markDirty();render();return}const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action;if(a==='back')router()?.replace?.('user-menu',{source:'settings-back'});else if(a==='all-home')setAll('home',b.dataset.value==='1');else if(a==='all-menu')setAll('user_menu',b.dataset.value==='1');else if(a==='all-widgets')setWidgets(b.dataset.value==='1');else if(a==='save')void save(b);else if(a==='reset')void reset(b)}
function onChange(e){const x=e.target;if(x.matches('[data-pref-area]')){state.prefs[x.dataset.prefArea][x.dataset.prefId]=x.checked;markDirty()}else if(x.matches('[data-widget-id]')){state.prefs.home_widgets[x.dataset.widgetId]=x.checked;markDirty()}}
function onService(detail){if(!state.mounted)return;if(['ready','permissions'].includes(detail?.type))render();if(detail?.type==='core'&&!state.dirty){state.prefs=ensurePrefs(services()?.profile?.ui_preferences);render()}}
async function mount(host){state.host=host;state.mounted=true;state.prefs=null;state.dirty=false;host.innerHTML='<div class="nsvLoading">Chargement…</div>';host.addEventListener('click',onClick);host.addEventListener('change',onChange);await services()?.ready?.();if(!state.mounted)return false;state.prefs=ensurePrefs(services()?.profile?.ui_preferences);state.unsubscribe=services()?.subscribe?.(onService,{immediate:false})||null;render();return true}
async function unmount(){state.mounted=false;if(typeof state.unsubscribe==='function')state.unsubscribe();state.unsubscribe=null;if(state.host){state.host.removeEventListener('click',onClick);state.host.removeEventListener('change',onChange);state.host.innerHTML=''}state.host=null;state.prefs=null;state.dirty=false;return true}
const api=Object.freeze({mount,unmount,render});window.NethorMobileSettingsView=api;router()?.register?.('settings',api);
})();