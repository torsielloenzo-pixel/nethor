
(function(){
'use strict';
const api={ctx:null,host:null,state:{orders:[],deliveries:[],flashes:[],active:null,loading:false}};
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const attr=esc;
function cfg(){
 const raw=api.ctx?.config?.home_widgets?.operations_hub||{};
 return{
  enabled:raw.enabled!==false,
  label:String(raw.label||'Pilotage magasin'),
  subtitle:String(raw.subtitle||'Relève, service, commandes, livraisons et Flash magasin'),
  density:raw.density==='detailed'?'detailed':'compact',
  max_items:Math.min(8,Math.max(1,Number(raw.max_items)||3)),
  show_counters:raw.show_counters!==false,
  default_section:['handover','service','orders','deliveries','flashes'].includes(raw.default_section)?raw.default_section:'handover',
  sections:{
   handover:raw.sections?.handover!==false,
   service:raw.sections?.service!==false,
   orders:raw.sections?.orders!==false,
   deliveries:raw.sections?.deliveries!==false,
   flashes:raw.sections?.flashes!==false
  },
  roles:raw.roles||{},subroles:raw.subroles||{}
 }
}
function canSee(){
 const c=cfg(),p=api.ctx?.profile||{},role=p.role||'';
 if(!c.enabled)return false;
 const personal=p?.ui_preferences?.home_widgets?.operations_hub;
 if(personal===false)return false;
 const rv=c.roles?.[role];
 const base=typeof rv==='boolean'?rv:role==='admin';
 return base||(api.ctx?.subroleKeys||[]).some(k=>c.subroles?.[k]===true)
}
function canManage(){return api.ctx?.profile?.role==='admin'}
function sections(){
 const c=cfg(),all=[
  {id:'handover',label:'Relève',icon:'↔'},
  {id:'service',label:'Mon service',icon:'◷'},
  {id:'orders',label:'Commandes',icon:'▣'},
  {id:'deliveries',label:'Livraisons',icon:'▤'},
  {id:'flashes',label:'Flash',icon:'!'}
 ];
 return all.filter(x=>c.sections[x.id])
}
function counts(){
 const tasks=handoverRows(),orders=api.state.orders.filter(x=>!['collected','cancelled'].includes(x.status)),deliveries=api.state.deliveries.filter(x=>!['put_away','cancelled'].includes(x.status)),flashes=activeFlashes();
 return{handover:tasks.length,service:serviceRanges().length?1:0,orders:orders.length,deliveries:deliveries.length,flashes:flashes.length}
}
function dateFr(v){
 if(!v)return'—';const d=new Date(v);if(Number.isNaN(d.getTime()))return String(v);
 return d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})+' · '+d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})
}
function clock(n){if(!Number.isFinite(Number(n)))return'—';const x=Number(n),h=Math.floor(x),m=Math.round((x-h)*60);return String(h).padStart(2,'0')+'h'+String(m).padStart(2,'0')}
function serviceRanges(){return Array.isArray(api.ctx?.service?.ranges)?api.ctx.service.ranges:[]}
function operationalUsers(){return (api.ctx?.tasks?.team||[]).filter(x=>['responsable','employe'].includes(String(x.role||'').toLowerCase()))}
function handoverRows(){
 const t=api.ctx?.tasks||{},rows=t.rows||[],ass=t.assignees||[],done=t.completions||[],team=operationalUsers();
 return rows.map(row=>{
  const expected=row.all_users?team.length:ass.filter(x=>x.task_id===row.id).length;
  const completed=done.filter(x=>x.task_id===row.id).length;
  const status=expected>0&&completed>=expected?'done':completed>0?'partial':'todo';
  return{...row,expected,completed,status}
 }).filter(x=>x.status!=='done')
}
function activeFlashes(){
 const now=Date.now();return (api.state.flashes||[]).filter(x=>x.active!==false&&(!x.expires_at||new Date(x.expires_at).getTime()>=now))
}
function ensureActive(){
 const allowed=sections();if(!allowed.length){api.state.active=null;return}
 if(!allowed.some(x=>x.id===api.state.active))api.state.active=allowed.some(x=>x.id===cfg().default_section)?cfg().default_section:allowed[0].id
}
function badge(text,cls=''){return'<span class="operationsHubBadge '+cls+'">'+esc(text)+'</span>'}
function empty(title,text){return'<div class="operationsHubEmpty"><strong>'+esc(title)+'</strong>'+esc(text)+'</div>'}
function iconFor(kind){
 return{handover:'↔',service:'◷',orders:'▣',deliveries:'▤',flashes:'!',todo:'•',partial:'◐',ready:'✓'}[kind]||'•'
}
function renderShell(){
 if(!api.host||!canSee()){api.host?.remove();return}
 ensureActive();const c=cfg(),cs=counts(),tabs=sections();
 api.host.className='operationsHub';api.host.dataset.density=c.density;
 api.host.innerHTML='<div class="operationsHubHead"><div class="operationsHubHeadCopy"><span class="operationsHubKicker">WIDGET TERRAIN</span><h2>'+esc(c.label)+'</h2><p>'+esc(c.subtitle)+'</p></div><button class="operationsHubRefresh" type="button" data-op-refresh>↻ Actualiser</button></div>'+
  '<div class="operationsHubTabs">'+tabs.map(x=>'<button type="button" class="operationsHubTab '+(api.state.active===x.id?'active':'')+'" data-op-tab="'+x.id+'"><span>'+esc(x.icon)+'</span>'+esc(x.label)+(c.show_counters?'<b class="operationsHubCount">'+String(cs[x.id]||0)+'</b>':'')+'</button>').join('')+'</div>'+
  '<div class="operationsHubBody" id="operationsHubBody">'+renderActive()+'</div>'+
  '<div class="operationsHubFoot"><span>Données Nethor · accès selon Rôles & permissions</span>'+(canManage()?'<a href="admin-portal.html?tab=system">Configurer</a>':'<span>Consultation</span>')+'</div>';
 api.host.querySelectorAll('[data-op-tab]').forEach(b=>b.onclick=()=>{api.state.active=b.dataset.opTab;renderShell()});
 api.host.querySelector('[data-op-refresh]')?.addEventListener('click',()=>loadData(true));
 bindActions()
}
function renderActive(){
 if(api.state.loading)return empty('Chargement…','Mise à jour des données opérationnelles.');
 if(!api.state.active)return empty('Widget vide','Active au moins une section depuis Gestion > Pages & menus.');
 if(api.state.active==='handover')return renderHandover();
 if(api.state.active==='service')return renderService();
 if(api.state.active==='orders')return renderOrders();
 if(api.state.active==='deliveries')return renderDeliveries();
 return renderFlashes()
}
function toolbar(title,subtitle,kind){
 const add=canManage()&&['orders','deliveries','flashes'].includes(kind)?'<button class="operationsHubAdd" type="button" data-op-add="'+kind+'">＋ Ajouter</button>':'';
 return'<div class="operationsHubToolbar"><div class="operationsHubToolbarCopy"><strong>'+esc(title)+'</strong><small>'+esc(subtitle)+'</small></div>'+add+'</div>'
}
function renderHandover(){
 const rows=handoverRows(),max=cfg().max_items;
 if(!rows.length)return toolbar('Relève équipe','Tâches incomplètes du jour','handover')+empty('Rien à reprendre','Toutes les tâches publiées pour aujourd’hui sont terminées.');
 return toolbar('Relève équipe','Ce qui reste à faire ou à reprendre','handover')+'<div class="operationsHubRows">'+rows.slice(0,max).map(x=>{
  const partial=x.status==='partial',state=partial?'En cours':'À reprendre',cls=partial?'amber':'red',meta=(x.section_label||x.section_key||'Tâche')+' · '+x.completed+'/'+Math.max(x.expected,1)+' validation'+(Math.max(x.expected,1)>1?'s':'');
  return'<div class="operationsHubRow"><span class="operationsHubRowIcon">'+iconFor(partial?'partial':'todo')+'</span><div class="operationsHubRowCopy"><strong>'+esc(x.title||'Tâche')+'</strong><small>'+esc(meta)+'</small></div>'+badge(state,cls)+'</div>'
 }).join('')+'</div>'
}
function renderService(){
 const ranges=serviceRanges(),hours=Number(api.ctx?.service?.hours||0),week=Number(api.ctx?.service?.weekHours||0);
 const shift=ranges.length?ranges.map(r=>clock(r.a)+' → '+clock(r.b)).join(' · '):'Repos / non planifié';
 return toolbar('Mon service','Planning personnel du jour','service')+
  '<div class="operationsHubService"><div class="operationsHubServiceCard"><span class="operationsHubKicker">AUJOURD’HUI</span><strong>'+esc(shift)+'</strong><small>'+esc(hours?hours.toFixed(2).replace('.',',')+' h planifiées':'Aucune heure planifiée')+'</small></div>'+
  '<div class="operationsHubMiniStats"><div class="operationsHubMiniStat"><span>Total semaine</span><strong>'+esc(week.toFixed(2).replace('.',','))+' h</strong></div><div class="operationsHubMiniStat"><span>Détail</span><strong><a href="planning.html" style="color:#e95431;text-decoration:none">Planning →</a></strong></div></div></div>'
}
const orderLabel={pending:['À préparer','amber'],preparing:['En préparation','amber'],ready:['Prête','green'],collected:['Retirée','blue'],cancelled:['Annulée','red']};
function orderItemsText(items){if(!Array.isArray(items))return'';return items.map(x=>typeof x==='string'?x:(x?.label||x?.name||'')).filter(Boolean).join(' · ')}
function renderOrders(){
 const rows=(api.state.orders||[]).filter(x=>!['collected','cancelled'].includes(x.status)),max=cfg().max_items;
 if(!rows.length)return toolbar('Commandes clients','Réservations et retraits à suivre','orders')+empty('Aucune commande active','Ajoute une réservation client directement depuis ce widget.');
 return toolbar('Commandes clients','Réservations et retraits à suivre','orders')+'<div class="operationsHubRows">'+rows.slice(0,max).map(x=>{
  const meta=[x.pickup_label||dateFr(x.pickup_at),orderItemsText(x.items),x.location].filter(Boolean).join(' · '),s=orderLabel[x.status]||orderLabel.pending;
  return'<div class="operationsHubRow"><span class="operationsHubRowIcon">▣</span><div class="operationsHubRowCopy"><strong>'+esc(x.customer_name)+'</strong><small>'+esc(meta||'Commande client')+'</small></div><div>'+badge(s[0],s[1])+(canManage()?'<button class="operationsHubRowAction" type="button" data-order-next="'+attr(x.id)+'">Suivant</button>':'')+'</div></div>'
 }).join('')+'</div>'
}
const deliveryLabel={planned:['Prévue','blue'],en_route:['En route','amber'],arrived:['Arrivée','amber'],received:['Réceptionnée','green'],put_away:['Rangée','green'],cancelled:['Annulée','red']};
const streamLabel={sec:'Sec',frais:'Frais',surg:'Surgelé',fl:'Fruits & Légumes',other:'Autre'};
function renderDeliveries(){
 const rows=(api.state.deliveries||[]).filter(x=>!['put_away','cancelled'].includes(x.status)),max=cfg().max_items;
 if(!rows.length)return toolbar('Livraisons','Camions et réceptions du jour','deliveries')+empty('Aucune livraison active','Ajoute une livraison pour suivre son arrivée et sa réception.');
 return toolbar('Livraisons','Camions et réceptions du jour','deliveries')+'<div class="operationsHubRows">'+rows.slice(0,max).map(x=>{
  const meta=[streamLabel[x.stream]||x.stream,x.supplier,x.expected_label,x.supports!=null?x.supports+' supports':null,x.position_label].filter(Boolean).join(' · '),s=deliveryLabel[x.status]||deliveryLabel.planned;
  return'<div class="operationsHubRow"><span class="operationsHubRowIcon">▤</span><div class="operationsHubRowCopy"><strong>'+esc(x.supplier||streamLabel[x.stream]||'Livraison')+'</strong><small>'+esc(meta)+'</small></div><div>'+badge(s[0],s[1])+(canManage()?'<button class="operationsHubRowAction" type="button" data-delivery-next="'+attr(x.id)+'">Suivant</button>':'')+'</div></div>'
 }).join('')+'</div>'
}
const flashClass={procedure:'blue',price:'amber',material:'red',product:'green',info:'blue'};
const flashLabel={procedure:'Procédure',price:'Prix',material:'Matériel',product:'Produit',info:'Info'};
function renderFlashes(){
 const rows=activeFlashes(),max=cfg().max_items;
 if(!rows.length)return toolbar('Flash magasin','Informations temporaires à connaître','flashes')+empty('Aucun Flash actif','Crée une information temporaire sans encombrer le chat.');
 return toolbar('Flash magasin','Informations temporaires à connaître','flashes')+'<div class="operationsHubRows">'+rows.slice(0,max).map(x=>{
  const meta=[flashLabel[x.category]||x.category,x.target_ean13?'EAN13 '+x.target_ean13:null,x.expires_at?'jusqu’au '+dateFr(x.expires_at):'sans expiration'].filter(Boolean).join(' · ');
  return'<div class="operationsHubRow"><span class="operationsHubRowIcon">!</span><div class="operationsHubRowCopy"><strong>'+esc(x.title)+'</strong><small>'+esc(x.body)+' · '+esc(meta)+'</small></div><div>'+badge(flashLabel[x.category]||'Info',flashClass[x.category]||'blue')+(canManage()?'<button class="operationsHubRowAction" type="button" data-flash-close="'+attr(x.id)+'">Clore</button>':'')+'</div></div>'
 }).join('')+'</div>'
}
function bindActions(){
 api.host.querySelectorAll('[data-op-add]').forEach(b=>b.onclick=()=>openDialog(b.dataset.opAdd));
 api.host.querySelectorAll('[data-order-next]').forEach(b=>b.onclick=()=>advanceOrder(b.dataset.orderNext));
 api.host.querySelectorAll('[data-delivery-next]').forEach(b=>b.onclick=()=>advanceDelivery(b.dataset.deliveryNext));
 api.host.querySelectorAll('[data-flash-close]').forEach(b=>b.onclick=()=>closeFlash(b.dataset.flashClose))
}
async function loadData(showLoading=false){
 if(!canSee())return;
 if(showLoading){api.state.loading=true;renderShell()}
 const db=api.ctx.db,today=api.ctx.todayKey||new Date().toISOString().slice(0,10),now=new Date().toISOString();
 const [o,d,f]=await Promise.all([
  db.from('operations_orders').select('id,customer_name,customer_phone,pickup_label,pickup_at,items,payment_status,status,location,note,created_at').order('created_at',{ascending:false}).limit(40),
  db.from('operations_deliveries').select('id,delivery_date,stream,supplier,expected_label,expected_at,supports,position_label,status,note,created_at').eq('delivery_date',today).order('created_at',{ascending:false}).limit(40),
  db.from('operations_flashes').select('id,category,title,body,target_ean13,starts_at,expires_at,active,created_at').eq('active',true).lte('starts_at',now).or('expires_at.is.null,expires_at.gte.'+now).order('created_at',{ascending:false}).limit(40)
 ]);
 api.state.orders=o.error?[]:(o.data||[]);api.state.deliveries=d.error?[]:(d.data||[]);api.state.flashes=f.error?[]:(f.data||[]);
 api.state.loading=false;renderShell()
}
function ensureDialog(){
 let d=document.getElementById('operationsHubDialog');if(d)return d;
 d=document.createElement('dialog');d.id='operationsHubDialog';d.className='operationsHubDialog';document.body.appendChild(d);return d
}
function openDialog(kind){
 if(!canManage())return;const d=ensureDialog();
 if(kind==='orders')d.innerHTML=orderForm();
 else if(kind==='deliveries')d.innerHTML=deliveryForm();
 else d.innerHTML=flashForm();
 d.querySelector('[data-op-close]')?.addEventListener('click',()=>d.close());
 d.querySelector('form')?.addEventListener('submit',e=>submitDialog(e,kind));d.showModal()
}
function orderForm(){return'<form class="operationsHubModal"><div class="operationsHubModalHead"><div><h3>Nouvelle commande</h3><p>Réservation client suivie dans Nethor.</p></div><button type="button" class="operationsHubClose" data-op-close>×</button></div><div class="operationsHubForm"><div class="operationsHubField"><label>Client</label><input name="customer_name" required maxlength="120"></div><div class="operationsHubField"><label>Retrait</label><input name="pickup_label" placeholder="Aujourd’hui · 18h"></div><div class="operationsHubField full"><label>Produits · une ligne par article</label><textarea name="items" required></textarea></div><div class="operationsHubField"><label>Paiement</label><select name="payment_status"><option value="unpaid">Non payé</option><option value="paid">Payé</option><option value="deposit">Acompte</option></select></div><div class="operationsHubField"><label>Emplacement</label><input name="location"></div><div class="operationsHubField full"><label>Note</label><textarea name="note"></textarea></div></div><div class="operationsHubModalActions"><button type="button" class="operationsHubCancel" data-op-close>Annuler</button><button class="operationsHubSave">Créer</button></div></form>'}
function deliveryForm(){return'<form class="operationsHubModal"><div class="operationsHubModalHead"><div><h3>Nouvelle livraison</h3><p>Suivi du camion et de la réception.</p></div><button type="button" class="operationsHubClose" data-op-close>×</button></div><div class="operationsHubForm"><div class="operationsHubField"><label>Flux</label><select name="stream"><option value="sec">Sec</option><option value="frais">Frais</option><option value="surg">Surgelé</option><option value="fl">Fruits & Légumes</option><option value="other">Autre</option></select></div><div class="operationsHubField"><label>Fournisseur / origine</label><input name="supplier"></div><div class="operationsHubField"><label>Prévision</label><input name="expected_label" placeholder="16h30"></div><div class="operationsHubField"><label>Supports</label><input type="number" min="0" name="supports"></div><div class="operationsHubField"><label>Position</label><input name="position_label" placeholder="1re position"></div><div class="operationsHubField full"><label>Note</label><textarea name="note"></textarea></div></div><div class="operationsHubModalActions"><button type="button" class="operationsHubCancel" data-op-close>Annuler</button><button class="operationsHubSave">Créer</button></div></form>'}
function flashForm(){return'<form class="operationsHubModal"><div class="operationsHubModalHead"><div><h3>Nouveau Flash</h3><p>Information temporaire visible par les rôles autorisés.</p></div><button type="button" class="operationsHubClose" data-op-close>×</button></div><div class="operationsHubForm"><div class="operationsHubField"><label>Type</label><select name="category"><option value="procedure">Procédure</option><option value="price">Prix</option><option value="material">Matériel</option><option value="product">Produit</option><option value="info">Information</option></select></div><div class="operationsHubField"><label>Expiration</label><select name="expiry"><option value="today">Fin de journée</option><option value="week">7 jours</option><option value="none">Sans expiration</option></select></div><div class="operationsHubField full"><label>Titre</label><input name="title" required maxlength="140"></div><div class="operationsHubField full"><label>Message</label><textarea name="body" required maxlength="1200"></textarea></div><div class="operationsHubField"><label>EAN13 lié · optionnel</label><input name="target_ean13" inputmode="numeric" maxlength="13"></div></div><div class="operationsHubModalActions"><button type="button" class="operationsHubCancel" data-op-close>Annuler</button><button class="operationsHubSave">Publier</button></div></form>'}
async function submitDialog(e,kind){
 e.preventDefault();const f=new FormData(e.currentTarget),db=api.ctx.db,uid=api.ctx.session?.user?.id;let res;
 if(kind==='orders'){
  const items=String(f.get('items')||'').split(/\n+/).map(x=>x.trim()).filter(Boolean).map(label=>({label}));
  res=await db.from('operations_orders').insert({customer_name:String(f.get('customer_name')||'').trim(),pickup_label:String(f.get('pickup_label')||'').trim()||null,items,payment_status:String(f.get('payment_status')||'unpaid'),location:String(f.get('location')||'').trim()||null,note:String(f.get('note')||'').trim()||null,created_by:uid})
 }else if(kind==='deliveries'){
  const supports=String(f.get('supports')||'').trim();
  res=await db.from('operations_deliveries').insert({delivery_date:api.ctx.todayKey,stream:String(f.get('stream')||'other'),supplier:String(f.get('supplier')||'').trim()||null,expected_label:String(f.get('expected_label')||'').trim()||null,supports:supports?Number(supports):null,position_label:String(f.get('position_label')||'').trim()||null,note:String(f.get('note')||'').trim()||null,created_by:uid})
 }else{
  const expiry=f.get('expiry'),now=new Date(),expires=expiry==='today'?new Date(now.getFullYear(),now.getMonth(),now.getDate()+1).toISOString():expiry==='week'?new Date(Date.now()+7*86400000).toISOString():null,ean=String(f.get('target_ean13')||'').trim();
  if(ean&&!/^\d{13}$/.test(ean)){alert('EAN13 invalide : 13 chiffres attendus.');return}
  res=await db.from('operations_flashes').insert({category:String(f.get('category')||'info'),title:String(f.get('title')||'').trim(),body:String(f.get('body')||'').trim(),target_ean13:ean||null,expires_at:expires,created_by:uid})
 }
 if(res.error){alert('Enregistrement impossible : '+res.error.message);return}
 ensureDialog().close();await loadData(true)
}
async function advanceOrder(id){
 const row=api.state.orders.find(x=>x.id===id);if(!row||!canManage())return;
 const next={pending:'preparing',preparing:'ready',ready:'collected'}[row.status];if(!next)return;
 const {error}=await api.ctx.db.from('operations_orders').update({status:next,updated_at:new Date().toISOString()}).eq('id',id);if(error)return alert(error.message);await loadData(false)
}
async function advanceDelivery(id){
 const row=api.state.deliveries.find(x=>x.id===id);if(!row||!canManage())return;
 const next={planned:'en_route',en_route:'arrived',arrived:'received',received:'put_away'}[row.status];if(!next)return;
 const {error}=await api.ctx.db.from('operations_deliveries').update({status:next,updated_at:new Date().toISOString()}).eq('id',id);if(error)return alert(error.message);await loadData(false)
}
async function closeFlash(id){
 if(!canManage())return;const {error}=await api.ctx.db.from('operations_flashes').update({active:false,updated_at:new Date().toISOString()}).eq('id',id);if(error)return alert(error.message);await loadData(false)
}
api.mount=async function(context){
 api.ctx=context;if(!canSee())return;
 const stack=context.host?.querySelector('.mhdStack')||context.host;if(!stack)return;
 let host=document.getElementById('operationsHubWidget');if(!host){host=document.createElement('section');host.id='operationsHubWidget';stack.appendChild(host)}
 api.host=host;api.state.active=cfg().default_section;renderShell();await loadData(false)
};
window.NethorOperationsWidget=api;
})();
