(function(){
 'use strict';
 // Vue strictement administrative. Les infos visibles excluent user_id, URL et contenu d'erreur.
 const LABELS=Object.freeze({
  FETCH_FAILED:'Lecture serveur impossible',
  SYNC_TIMEOUT:'Synchronisation lente',
  REALTIME_DISCONNECTED:'Canal temps réel interrompu',
  STALE_DATA:'Données périmées',
  SAVE_CONFLICT:'Conflit de version',
  SAVE_UNCONFIRMED:'Publication non confirmée',
  APP_ERROR:'Erreur de l’application',
  PROMISE_ERROR:'Opération asynchrone interrompue'
 });
 const DOMAINS=Object.freeze({planning:'Planning',chat:'Chat',notifications:'Notifications',tasks:'Tâches',sync:'Synchronisation',app:'Application'});
 const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 let busy=false,mounted=false;
 function mount(){
  if(mounted)return true;
  const target=document.querySelector('#tab-maintenance .managementSettingList');
  if(!target)return false;
  const panel=document.createElement('section');
  panel.className='healthAdminPanel';
  panel.innerHTML='<div class="healthAdminHead"><div><h2>Santé de Nethor</h2><p>Incidents techniques des 7 derniers jours · codes uniquement, sans données personnelles affichées.</p></div><button type="button" data-health-refresh>Actualiser</button></div><p data-health-summary role="status">Ouvre cette page pour charger les incidents.</p><div data-health-categories></div><div data-health-recent></div>';
  target.appendChild(panel);
  panel.querySelector('[data-health-refresh]').addEventListener('click',refresh);
  mounted=true;
  return true
 }
 async function refresh(){
  if(!mount()||busy)return false;
  const client=window.NethorPortalHealthClient;
  const panel=document.querySelector('.healthAdminPanel');
  const summary=panel?.querySelector('[data-health-summary]'),categories=panel?.querySelector('[data-health-categories]'),recent=panel?.querySelector('[data-health-recent]');
  if(!client){if(summary)summary.textContent='Accès administrateur non disponible.';return false}
  busy=true;
  const button=panel.querySelector('[data-health-refresh]');button.disabled=true;
  if(summary)summary.textContent='Lecture des incidents…';
  try{
   const since=new Date(Date.now()-7*86400000).toISOString();
   const {data,error}=await client.from('nethor_client_health_events')
    .select('domain,code,platform,build,created_at')
    .gte('created_at',since).order('created_at',{ascending:false}).limit(200);
   if(error)throw error;
   const rows=data||[],counts=new Map();
   rows.forEach(row=>{
    const key=String(row.domain)+'|'+String(row.code);
    counts.set(key,(counts.get(key)||0)+1)
   });
   summary.textContent=rows.length
    ?rows.length+' événement'+(rows.length>1?'s':'')+' sur les 7 derniers jours'+(rows.length===200?' (affichage limité à 200)':'')
    :'Aucun incident technique remonté sur les 7 derniers jours.';
   categories.innerHTML=counts.size?'<h3>Par catégorie</h3><div class="healthAdminCounts">'+
    [...counts].sort((a,b)=>b[1]-a[1]).map(([key,count])=>{
     const [domain,code]=key.split('|');
     return'<div><strong>'+esc(DOMAINS[domain]||domain)+'</strong><span>'+esc(LABELS[code]||code)+'</span><b>'+count+'</b></div>'
    }).join('')+'</div>':'';
   recent.innerHTML=rows.length?'<h3>Événements récents</h3><div class="healthAdminRecent">'+rows.slice(0,30).map(row=>{
    const when=new Date(row.created_at).toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'});
    return'<div><time>'+esc(when)+'</time><strong>'+esc(DOMAINS[row.domain]||row.domain)+'</strong><span>'+esc(LABELS[row.code]||row.code)+'</span><small>'+esc(row.platform)+' · v'+esc(row.build)+'</small></div>'
   }).join('')+'</div>':'';
   return true
  }catch(_){
   if(summary)summary.textContent='Impossible de lire les incidents. Réessaie ou vérifie les autorisations.';
   categories.replaceChildren();recent.replaceChildren();
   return false
  }finally{busy=false;button.disabled=false}
 }
 window.NethorHealthAdmin=Object.freeze({refresh,mount});
 window.addEventListener('nethor:admin-ready',()=>{if(mount()&&document.querySelector('#tab-maintenance.active'))void refresh()});
})();
