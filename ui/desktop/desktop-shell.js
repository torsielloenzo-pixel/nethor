(function(){
'use strict';
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function navButton(icon,title,sub,url,cls=''){
 return '<button class="nettoNavBtn '+cls+'" data-url="'+esc(url||'')+'"><span>'+icon+'</span><span><strong>'+esc(title)+'</strong><small>'+esc(sub||'')+'</small></span></button>'
}
function buildUserMenu(ctx){
 const {name='Utilisateur',role='',shortcuts='',settingsUrl='settings.html',settingsModule=null,settingsIcon='⚙',controls={}}=ctx||{};
 const control=(key,defaults)=>{const x=controls?.[key]&&typeof controls[key]==='object'?controls[key]:{};return{...defaults,...x,label:String(x.label||defaults.label),subtitle:String(x.subtitle||defaults.subtitle),url:String(x.url||'')}};
 const icon=(node,fallback)=>node.url?'<img src="'+esc(node.url)+'" alt="" style="display:block;width:22px;height:22px;object-fit:contain">':fallback;
 const theme=control('theme',{label:'Mode sombre',subtitle:'Changer l’apparence'}),logout=control('logout',{label:'Déconnexion',subtitle:'Quitter la session'});
 const themeCustom=!!String(controls?.theme?.label||'').trim();
 return '<div class="nettoUserDesktopMenu">'+
  '<div class="nettoUserHead"><span id="nettoMenuAvatar" class="nettoTopAvatar">U</span><span><strong>'+esc(name)+'</strong><small>'+esc(role)+'</small></span></div>'+
  navButton(settingsIcon,settingsModule?.label||'Personnalisation',settingsModule?.subtitle||'Mon accueil et mes raccourcis',settingsModule?.url||settingsUrl)+
  (shortcuts?'<div class="nettoMenuSection">Raccourcis</div>'+shortcuts:'')+
  '<button id="nettoThemeBtn" class="nettoNavBtn"><span class="nettoThemeIcon" '+(theme.url?'data-static-theme-icon="1"':'')+'>'+icon(theme,'☾')+'</span><span><strong class="nettoThemeLabel" '+(themeCustom?'data-static-theme-label="1"':'')+'>'+esc(theme.label)+'</strong><small>'+esc(theme.subtitle)+'</small></span></button>'+
  '<button id="nettoLogoutBtn" class="nettoNavBtn nettoLogout"><span>'+icon(logout,'↪')+'</span><span><strong>'+esc(logout.label)+'</strong><small>'+esc(logout.subtitle)+'</small></span></button>'+
 '</div>'
}
function desktopSidebarIcon(kind){
 const icons={
  home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10.7 12 3.5l8.5 7.2"/><path d="M5.5 9.8V20h13V9.8"/><path d="M9.5 20v-6h5v6"/></svg>',
  planning:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="15" rx="2.5"/><path d="M7.5 3.5v4M16.5 3.5v4M3.5 9.5h17"/><path d="M8 13h3M13 13h3M8 16.5h3"/></svg>',
  team:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3.8 19c.4-3.3 2.1-5 5.2-5s4.8 1.7 5.2 5"/><circle cx="17" cy="9" r="2.4"/><path d="M15.2 14.2c3.2-.5 5 1.1 5.3 4.1"/></svg>',
  chat:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4.8 3.2v-3.2H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z"/><path d="M7.5 9h9M7.5 12.5h6"/></svg>',
  settings:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19 13.8a7.6 7.6 0 0 0 0-3.6l2-1.5-2-3.4-2.4 1a8.2 8.2 0 0 0-3.1-1.8L13.2 2H9.3L9 4.5a8.2 8.2 0 0 0-3.1 1.8l-2.4-1-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3.6l-2 1.5 2 3.4 2.4-1A8.2 8.2 0 0 0 9 19.5l.3 2.5h3.9l.3-2.5a8.2 8.2 0 0 0 3.1-1.8l2.4 1 2-3.4-2-1.5Z"/></svg>'
 };
 return icons[kind]||icons.home
}
function ensureDesktopSidebarStyle(){
 if(document.getElementById('nethorDesktopSidebarCss'))return;
 const link=document.createElement('link');
 link.id='nethorDesktopSidebarCss';
 link.rel='stylesheet';
 link.href='ui/desktop/desktop-sidebar.css?v=1';
 document.head.appendChild(link)
}
function desktopSidebarItem(kind,label,url,active,disabled=false){
 const attrs=disabled
  ?' aria-disabled="true" title="Disponible prochainement"'
  :' data-sidebar-url="'+esc(url)+'" onclick="window.location.href=this.dataset.sidebarUrl"';
 return '<button class="nethorSidebarItem'+(active?' active':'')+'" type="button"'+attrs+(active?' aria-current="page"':'')+'><span class="nethorSidebarIcon">'+desktopSidebarIcon(kind)+'</span><span class="nethorSidebarLabel">'+esc(label)+'</span></button>'
}
function buildDesktopSidebar(page){
 ensureDesktopSidebarStyle();
 const id=String(page||'').toLowerCase(),settingsActive=['settings','notification-settings'].includes(id);
 return '<aside class="nethorDesktopSidebar" aria-label="Navigation principale Nethor">'+
  '<nav class="nethorDesktopSidebarNav">'+
   desktopSidebarItem('home','Accueil','home.html',id==='home')+
   desktopSidebarItem('planning','Planning','planning.html',id==='planning')+
   desktopSidebarItem('team','Équipe','',false,true)+
   desktopSidebarItem('chat','Chat','chat.html',id==='chat')+
  '</nav>'+
  '<div class="nethorDesktopSidebarBottom">'+desktopSidebarItem('settings','Paramètres','settings.html',settingsActive)+'</div>'+
 '</aside>'
}
function buildPageLayout(page){
 const id=String(page||'').toLowerCase();
 const pages={
  home:{title:'Nethor',subtitle:'Portail opérationnel',back:false},
  profile:{title:'Mon profil',subtitle:'Identité & notifications',back:true},
  planning:{title:'Planning équipe',subtitle:'Organisation du magasin',back:true},
  settings:{title:'Personnalisation',subtitle:'Mon affichage et mes raccourcis',back:true},
  'notification-settings':{title:'Notifications',subtitle:'Préférences et canaux',back:true},
  'report-problem':{title:'Signaler un problème',subtitle:'Rapport à l’administration',back:true,chrome:false},
  notifications:{title:'Notifications',subtitle:'Centre d’activité Nethor',back:true},
  scanner:{title:'Scanner',subtitle:'Lecture EAN13',back:true,chrome:false},
  articles:{title:'Fiches articles',subtitle:'Référentiel produit interne',back:true},
  accounts:{title:'Gestion des comptes',subtitle:'Administration · Accès · Journal',back:true},
  'admin-portal':{title:'Gestion',subtitle:'Administration Nethor',back:true,chrome:false},
  'fl-assistant':{title:'Assistant Précommande F&L',subtitle:'Analyse dédiée',back:true,chrome:false},
  bakery:{title:'Boulangerie',subtitle:'Stock interne',back:true,chrome:false},
  rewards:{title:'Défis & Boutique',subtitle:'Missions et récompenses',back:true,chrome:false},
  chat:{title:'Chat',subtitle:'Messagerie interne',back:true,chrome:false}
 };
 const cfg=pages[id];
 if(!cfg)return null;
 if(id==='accounts'&&document.documentElement.classList.contains('embeddedAccounts'))return{platform:'desktop',handlesBack:true,header:'',lead:''};
 const back=cfg.back?'<div class="navActions"><button class="btn light backBtn" type="button" onclick="window.NettoProfileUI?.goBack?window.NettoProfileUI.goBack():window.NethorNavigation?.navigateBack?window.NethorNavigation.navigateBack():location.href=\'home.html\'">← Retour</button></div>':'';
 const sidebar=buildDesktopSidebar(id);
 const header=(cfg.chrome===false?'':'<header data-nethor-page-chrome="desktop"><div class="top"><div class="brand"><button class="nethorDesktopBrandButton" type="button" onclick="location.href=\'home.html\'" aria-label="Accueil Nethor"><span class="nethorDesktopWordmark" aria-hidden="true"><span class="nethorDesktopWordmarkNe">ne</span><span class="nethorDesktopWordmarkThor">thor</span></span></button></div>'+back+'<span data-nethor-global-tools-host style="display:contents"></span></div></header>')+sidebar;
 return {platform:'desktop',handlesBack:!!cfg.back,header,lead:''}
}
window.NethorDesktopShell=Object.freeze({buildUserMenu,buildPageLayout});
})();
