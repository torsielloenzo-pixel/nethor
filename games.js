(()=>{'use strict';
const URL='https://gioxrpaiwogqqtakjpnv.supabase.co',KEY='sb_publishable_nJPMS-Z_20ng1aMJmufbmg_gWFFndrC';
const overlay=document.getElementById('gameOverlay'),host=document.getElementById('gameHost'),title=document.getElementById('gameName');
function closeGame(){
 overlay.removeAttribute('data-game');
 window.RushRayon?.unmount?.();window.CaisseRush?.unmount?.();
 host.replaceChildren();overlay.classList.add('hidden');overlay.setAttribute('aria-hidden','true');
 if(location.search)history.replaceState({},'','games.html');
}
function openGame(kind,push=true){
 if(!['rush','cashier','netto'].includes(kind))return;
 const api=kind==='rush'?window.RushRayon:kind==='cashier'?window.CaisseRush:null;
 if(kind!=='netto'&&!api?.mount){host.innerHTML='<div style="padding:24px;text-align:center">Le jeu n’a pas pu être chargé.<br><button type="button" onclick="location.reload()" style="margin-top:14px;padding:10px 16px">Recharger</button></div>';overlay.classList.remove('hidden');return}
 window.RushRayon?.unmount?.();window.CaisseRush?.unmount?.();host.replaceChildren();
 title.textContent={rush:'Rush Rayon',cashier:'Caisse Rush',netto:'Netto Rush'}[kind];overlay.dataset.game=kind;overlay.classList.remove('hidden');overlay.setAttribute('aria-hidden','false');
 if(kind==='netto'){
  const frame=document.createElement('iframe');frame.className='nettoRushFrame';frame.title='Netto Rush';frame.src='netto-rush.html';host.append(frame);
 }else api.mount('gameHost');
 if(push)history.pushState({game:kind},'','games.html?game='+encodeURIComponent(kind));
}
document.addEventListener('click',e=>{const b=e.target.closest('.gameRow[data-game]');if(b){e.preventDefault();openGame(b.dataset.game)}});
document.getElementById('gameExit')?.addEventListener('click',()=>history.state?.game?history.back():closeGame());
document.getElementById('back')?.addEventListener('click',()=>location.assign('home.html'));
addEventListener('popstate',closeGame);
addEventListener('nethor:game-exit',()=>{history.state?.game?history.back():closeGame()});
addEventListener('message',event=>{
 if(event.origin!==location.origin||event.data?.type!=='nethor:netto-rush-exit')return;
 if(event.source!==host.querySelector('.nettoRushFrame')?.contentWindow)return;
 history.state?.game?history.back():closeGame();
});
async function boot(){
 try{
  if(!window.supabase)throw Error('Supabase indisponible');
  const db=supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const {data:{user}}=await db.auth.getUser();if(!user)return location.replace('index.html');
  const [{data:permissions},{data:p}]=await Promise.all([db.rpc('my_subrole_permissions'),db.from('profiles').select('role').eq('id',user.id).maybeSingle()]);
  const allowed=(permissions||[]).some(x=>x.module==='games'&&['view','operate','manage'].includes(x.permission));
  if(!allowed&&p?.role!=='admin')return location.replace('home.html');
  const game=new URLSearchParams(location.search).get('game');if(['rush','cashier','netto'].includes(game))openGame(game,false);
 }catch(e){console.error('[Nethor Games]',e)}
}
boot();
})();
