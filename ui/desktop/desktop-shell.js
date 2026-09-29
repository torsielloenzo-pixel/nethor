(function(){
'use strict';
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function navButton(icon,title,sub,url,cls=''){
 return '<button class="nettoNavBtn '+cls+'" data-url="'+esc(url||'')+'"><span>'+icon+'</span><span><strong>'+esc(title)+'</strong><small>'+esc(sub||'')+'</small></span></button>'
}
function buildUserMenu(ctx){
 const {name='Utilisateur',role='',shortcuts='',settingsUrl='settings.html'}=ctx||{};
 return '<div class="nettoUserDesktopMenu">'+
  '<div class="nettoUserHead"><span id="nettoMenuAvatar" class="nettoTopAvatar">U</span><span><strong>'+esc(name)+'</strong><small>'+esc(role)+'</small></span></div>'+
  navButton('⚙','Personnalisation','Mon accueil et mes raccourcis',settingsUrl)+
  (shortcuts?'<div class="nettoMenuSection">Raccourcis</div>'+shortcuts:'')+
  '<button id="nettoThemeBtn" class="nettoNavBtn"><span class="nettoThemeIcon">☾</span><span><strong class="nettoThemeLabel">Mode sombre</strong><small>Changer l’apparence</small></span></button>'+
  '<button id="nettoLogoutBtn" class="nettoNavBtn nettoLogout"><span>↪</span><span><strong>Déconnexion</strong><small>Quitter la session</small></span></button>'+
 '</div>'
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
  notifications:{title:'Notifications',subtitle:'Centre d’activité Nethor',back:false},
  scanner:{title:'Scanner',subtitle:'Lecture EAN13',back:true,chrome:false},
  articles:{title:'Fiches articles',subtitle:'Référentiel produit interne',back:true},
  accounts:{title:'Gestion des comptes',subtitle:'Administration · Accès · Journal',back:true},
  'admin-portal':{title:'Gestion',subtitle:'Administration Nethor',back:true,chrome:false},
  'fl-assistant':{title:'Assistant Précommande F&L',subtitle:'Analyse dédiée',back:true,chrome:false},
  bakery:{title:'Boulangerie',subtitle:'Stock interne',back:true,chrome:false},
  rewards:{title:'Défis & Boutique',subtitle:'Missions et récompenses',back:true,chrome:false}
 };
 const cfg=pages[id];
 if(!cfg)return null;
 if(id==='accounts'&&document.documentElement.classList.contains('embeddedAccounts'))return{platform:'desktop',handlesBack:true,header:'',lead:''};
 const back=cfg.back?'<div class="navActions"><button class="btn light backBtn" type="button" onclick="window.NettoProfileUI?.goBack?window.NettoProfileUI.goBack():window.NethorNavigation?.navigateBack?window.NethorNavigation.navigateBack():location.href=\'home.html\'">← Retour</button></div>':'';
 const header=cfg.chrome===false?'':'<header data-nethor-page-chrome="desktop"><div class="top"><div class="brand"><button class="mark" type="button" onclick="location.href=\'home.html\'" aria-label="Retour à l’accueil">N</button><div><div class="title">'+esc(cfg.title)+'</div><div class="sub">'+esc(cfg.subtitle)+'</div></div></div>'+back+'<span data-nethor-global-tools-host style="display:contents"></span></div></header>';
 return {
  platform:'desktop',
  handlesBack:!!cfg.back,
  header,
  lead:''
 }
}
window.NethorDesktopShell=Object.freeze({buildUserMenu,buildPageLayout});
})();
