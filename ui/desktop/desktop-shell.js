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
  planning:{title:'Planning équipe',subtitle:'Organisation du magasin',back:true}
 };
 const cfg=pages[id];
 if(!cfg)return null;
 const back=cfg.back?'<div class="navActions"><button class="btn light backBtn" type="button" onclick="window.NettoProfileUI?.goBack?window.NettoProfileUI.goBack():location.href=\'home.html\'">← Retour</button></div>':'';
 return {
  platform:'desktop',
  handlesBack:false,
  header:'<header data-nethor-page-chrome="desktop"><div class="top"><div class="brand"><button class="mark" type="button" onclick="location.href=\'home.html\'" aria-label="Retour à l’accueil">N</button><div><div class="title">'+esc(cfg.title)+'</div><div class="sub">'+esc(cfg.subtitle)+'</div></div></div>'+back+'</div></header>',
  lead:''
 }
}
window.NethorDesktopShell=Object.freeze({buildUserMenu,buildPageLayout});
})();
