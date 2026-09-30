/* Nethor Stock — suggestions et panier, Phase 4.19 */
function normProduct(s){return String(s||'').toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
const categoryFamilyOrder={
 'Fruits':[
  ['pomme'],['poire'],['orange'],['clementine'],['mandarine'],['pomelo'],['citron'],
  ['kiwi'],['raisin'],['peche'],['nectarine'],['abricot'],['prune'],
  ['fraise'],['framboise'],['myrtille'],['figue'],
  ['melon'],['pasteque'],
  ['banane'],['ananas'],['mangue'],['passion'],
  ['coing'],['noix'],['marron'],['gingembre']
 ],
 'Légumes':[
  ['tomate'],['poivron'],['aubergine'],['courgette'],['concombre'],
  ['avocat'],['carotte'],['navet'],['radis'],['poireau'],['celeri'],['fenouil'],
  ['brocoli'],['chou-fleur','chou fleur'],['chou'],
  ['champignon'],['artichaut'],
  ['butternut'],['potimarron']
 ],
 'Salades':[
  ['laitue','feuille de chene','batavia','pommee'],['iceberg'],['sucrine'],['mache'],['endive']
 ],
 'Pommes de terre':[
  ['pomme de terre'],['patate douce']
 ],
 'Herbes aromatiques':[
  ['persil'],['basilic'],['menthe']
 ],
 'Condiments':[
  ['oignon'],['echalote'],['ail'],['gingembre']
 ]
};
function familyRank(cat,name){
 const n=normProduct(name),groups=categoryFamilyOrder[cat]||[];
 for(let i=0;i<groups.length;i++)if(groups[i].some(k=>n.includes(k)))return i;
 return 999;
}
function productLogicalSort(cat,a,b){
 const ra=familyRank(cat,a.name),rb=familyRank(cat,b.name);
 if(ra!==rb)return ra-rb;
 const na=normProduct(a.name),nb=normProduct(b.name);
 if(na!==nb)return na.localeCompare(nb,'fr',{numeric:true,sensitivity:'base'});
 const packOrder={vrac:0,botte:1,piece:2,filet:3,sachet:4,barquette:5};
 const pa=packOrder[normProduct(a.packaging)]??99,pb=packOrder[normProduct(b.packaging)]??99;
 if(pa!==pb)return pa-pb;
 return (Number(a.position)||0)-(Number(b.position)||0);
}
function orderFamily(name){const n=normProduct(name),keys=['raisin','pomme','poire','tomate','courgette','orange','citron','melon','pasteque','kiwi','banane','aubergine','poivron','concombre','carotte','oignon','echalote','ail','avocat','mangue','ananas','peche','nectarine','abricot','prune','fraise','framboise','myrtille','champignon','radis','navet','poireau','celeri','fenouil','chou','endive'];return keys.find(k=>n.includes(k))||n.split(/[ -]/)[0]}
function seasonScore(name,date=new Date()){const n=normProduct(name),m=date.getMonth()+1;const ranges={raisin:[8,9,10],pomme:[9,10,11,12,1,2,3],poire:[8,9,10,11,12,1,2],fraise:[4,5,6],framboise:[6,7,8,9],myrtille:[6,7,8],peche:[6,7,8,9],nectarine:[6,7,8,9],abricot:[6,7,8],melon:[6,7,8,9],pasteque:[6,7,8],tomate:[5,6,7,8,9],courgette:[5,6,7,8,9],aubergine:[6,7,8,9],poivron:[6,7,8,9],concombre:[5,6,7,8,9],poireau:[9,10,11,12,1,2,3],chou:[9,10,11,12,1,2,3],endive:[10,11,12,1,2,3],fenouil:[6,7,8,9,10],celeri:[7,8,9,10,11]};const k=Object.keys(ranges).find(k=>n.includes(k));return k?(ranges[k].includes(m)?1:-1):0}
function isLargePackaging(p){const s=normProduct((p.packaging||'')+' '+(p.name||''));return /(caisse|colis|plateau|sac|filet.*(5|10|15|20|25)|kg|gros condition)/.test(s)}
function getOrderConfigs(){
 try{
  const all=JSON.parse(localStorage.getItem('nettoOrderConfigs')||'{}')||{};let changed=false;
  Object.values(all).forEach(v=>{if(v&&Object.prototype.hasOwnProperty.call(v,'shelfSpace')){delete v.shelfSpace;changed=true}});
  if(changed)localStorage.setItem('nettoOrderConfigs',JSON.stringify(all));
  return all
 }catch(e){return {}}
}
function getOrderConfig(id){const all=getOrderConfigs(),v=all[id]||{};return{lossLeader:!!v.lossLeader,season:!!v.season,sensitive:!!v.sensitive,blocked:!!v.blocked}}
function saveOrderConfig(id,cfg){const all=getOrderConfigs();all[id]={lossLeader:!!cfg.lossLeader,season:!!cfg.season,sensitive:!!cfg.sensitive,blocked:!!cfg.blocked};localStorage.setItem('nettoOrderConfigs',JSON.stringify(all));resetSuggestionView()}
getOrderConfigs();
function suggestOrder(p){
 const q=Number(p.quantity)||0,fam=orderFamily(p.name),sameFamily=products.filter(x=>x.id!==p.id&&orderFamily(x.name)===fam),familyStock=sameFamily.reduce((s,x)=>s+(Number(x.quantity)||0),0),catStock=products.filter(x=>x.id!==p.id&&x.category===p.category).reduce((s,x)=>s+(Number(x.quantity)||0),0),autoSeason=seasonScore(p.name),large=isLargePackaging(p),cfg=getOrderConfig(p.id),day=new Date().getDay(),weekend=day===0||day===6;
 const season=cfg.season?1:autoSeason;if(cfg.blocked)return{qty:0,status:'Bloqué',why:['article bloqué des suggestions de commande'],season,familyStock,catStock,large,weekend,priority:-999,cfg};let qty=0,status='Ne pas commander',why=[],priority=0;
 if(cfg.lossLeader){why.push('produit d’appel : recommandation forte');priority+=10}
 if(cfg.season){why.push('article marqué de saison : priorité renforcée');priority+=3}
 if(cfg.sensitive){why.push('produit sensible : commande plus prudente');priority-=3}
 if(q>1)why.push('stock déjà élevé ('+fmt(q)+') : éviter le surstock');
 if(familyStock>=3)why.push('surplus de la même famille ('+fmt(familyStock)+') à écouler en priorité');
 if(large&&q===0)why.push('gros conditionnement : stock à zéro traité avec prudence');
 if(!weekend&&familyStock<3&&q<1&&!large&&!cfg.sensitive){qty=1;status='À envisager';why.push('stock faible : proposition d’un conditionnement')}
 if(!weekend&&cfg.sensitive&&q<.5&&!large){why.push('stock faible, mais article sensible : contrôle manuel conseillé')}
 if(cfg.lossLeader&&!weekend&&q<1&&familyStock<3&&!large){qty=Math.max(qty,1);status='Recommandation forte';why.push('produit d’appel à maintenir disponible')}
 if(q>1||familyStock>=3)qty=0;
 if(weekend){qty=0;why.push('week-end : pas de commande, priorité à l’écoulement du stock')}
 if(season<0&&qty>0)why.push('hors saison : commande volontairement prudente');
 if(qty>0)priority+=5;
 return{qty,status:qty===0?'Ne pas commander':status,why,season,familyStock,catStock,large,weekend,priority,cfg}
}

function setSuggestTab(cat){suggestActiveTab=cat;renderSuggestions();playUISound('tick')}
function renderSuggestions(){
 const list=$('suggestList'),all=products.filter(p=>p.on_sale!==false).map(p=>({p,s:suggestOrder(p)})).filter(x=>!x.s.cfg?.blocked).sort((a,b)=>(b.s.priority-a.s.priority)||(a.p.name||'').localeCompare(b.p.name||'','fr'));
 if(!all.length){list.innerHTML='<div class="suggestEmpty">Aucun article disponible.</div>';return}
 const cats=[...new Set(all.map(x=>x.p.category||'Autres'))];
 if(suggestActiveTab!=='Tous'&&!cats.includes(suggestActiveTab))suggestActiveTab='Tous';
 const tabs=['Tous',...cats].map(cat=>{
   const arr=cat==='Tous'?all:all.filter(x=>(x.p.category||'Autres')===cat),m=cat==='Tous'?{emoji:'☷',color:'#202024'}:(meta[cat]||{emoji:'📦',color:'#555'}),recommended=arr.filter(x=>x.s.qty>0).length;
   return '<button class="suggestTab '+(suggestActiveTab===cat?'active':'')+'" style="--tabColor:'+esc(m.color||'#555')+'" onclick="setSuggestTab(decodeURIComponent(\''+encodeURIComponent(cat)+'\'))"><span>'+m.emoji+'</span><strong>'+esc(cat)+'</strong><small>'+arr.length+(recommended?' • '+recommended+' sugg.':'')+'</small></button>'
 }).join('');
 const shown=suggestActiveTab==='Tous'?all:all.filter(x=>(x.p.category||'Autres')===suggestActiveTab);
 const rows=shown.map(({p,s})=>{const m=meta[p.category]||{emoji:'📦',color:'#555'};return '<button class="suggestRow '+(s.qty>0?'isSuggested':'notSuggested')+'" onclick="suggestDialog.close();openInfo(\''+p.id+'\');setTimeout(showOrderSuggestion,80)">'+(p.photo_url?'<img src="'+esc(p.photo_url)+'" alt="" loading="lazy" decoding="async">':'<span class="suggestPic">'+esc(m.emoji||'📦')+'</span>')+'<span class="suggestProduct"><strong>'+esc(p.name)+'</strong><small class="suggestMeta">'+esc(p.category||'Autres')+' · '+esc(p.packaging||'Non renseigné')+'</small><span class="suggestStatus"><b>Stock '+fmt(p.quantity)+'</b><em class="'+sm.cls+'"><i></i>'+esc(sm.label)+'</em></span></span><span class="suggestActions"><span class="suggestQty '+(s.qty>0?'':'none')+'">'+(s.qty>0?'+'+s.qty:'—')+'</span><span class="cartQuick" onclick="event.stopPropagation();addToOrderCart(\''+p.id+'\',1)" title="Ajouter au panier">＋🛒</span></span></button>'}).join('');
 list.innerHTML='<div class="suggestTabs">'+tabs+'</div><div class="suggestTabList">'+rows+'</div>'
}
function getOrderCart(){try{return JSON.parse(localStorage.getItem('nettoOrderCart')||'{}')||{}}catch(e){return {}}}
function saveOrderCart(cart){localStorage.setItem('nettoOrderCart',JSON.stringify(cart));updateCartBadge();if($('cartDialog')?.open)renderOrderCart();if(stockMode==='order')renderWorkspaceDashboards()}
function cartItemCount(){const cart=getOrderCart();return Object.values(cart).reduce((n,v)=>n+(Number(v)||0),0)}
function updateCartBadge(){const b=$('cartCount');if(!b)return;const n=cartItemCount();b.textContent=n;b.classList.toggle('hidden',n<=0)}
function addToOrderCart(id,amount=1){const cart=getOrderCart(),n=Math.max(0,(Number(cart[id])||0)+amount);if(n>0)cart[id]=n;else delete cart[id];saveOrderCart(cart);playUISound('tick')}
function setOrderCartQty(id,qty){const cart=getOrderCart(),n=Math.max(0,Number(qty)||0);if(n>0)cart[id]=n;else delete cart[id];saveOrderCart(cart);playUISound('tick')}
function resetOrderCart(){const cart=getOrderCart();if(!Object.keys(cart).length)return;if(!confirm('Remettre complètement le panier de commande à zéro ?'))return;localStorage.removeItem('nettoOrderCart');updateCartBadge();renderOrderCart();playUISound('close')}
function toggleCartCat(cat){const body=document.querySelector('[data-cart-body="'+CSS.escape(cat)+'"]'),head=document.querySelector('[data-cart-head="'+CSS.escape(cat)+'"]');if(!body)return;const closed=body.classList.toggle('closed');head?.classList.toggle('closed',closed);playUISound(closed?'close':'open')}
function renderOrderCart(){const list=$('cartList'),cart=getOrderCart(),items=products.filter(p=>(Number(cart[p.id])||0)>0).sort((a,b)=>(a.category||'').localeCompare(b.category||'','fr')||(a.name||'').localeCompare(b.name||'','fr'));const total=items.reduce((n,p)=>n+(Number(cart[p.id])||0),0);$('cartTotal').textContent=fmt(total)+' conditionnement'+(total>1?'s':'');$('resetCartBtn').disabled=!items.length;if(!items.length){list.innerHTML='<div class="suggestEmpty cartEmpty"><span>🛒</span><strong>Panier vide</strong><small>Ajoute des articles depuis le menu Suggérer.</small></div>';return}const groups={};items.forEach(p=>(groups[p.category||'Autres']??=[]).push(p));list.innerHTML=Object.entries(groups).map(([cat,arr])=>{const m=meta[cat]||{emoji:'📦',color:'#555'},catQty=arr.reduce((n,p)=>n+(Number(cart[p.id])||0),0);return '<section class="suggestGroup"><button class="suggestCatHead closed" data-cart-head="'+esc(cat)+'" onclick="toggleCartCat(decodeURIComponent(\''+encodeURIComponent(cat)+'\'))"><span class="suggestCatIcon" style="background:'+esc(m.color||'#555')+'">'+esc(m.emoji||'📦')+'</span><span><strong>'+esc(cat)+'</strong><small>'+arr.length+' article'+(arr.length>1?'s':'')+' • '+fmt(catQty)+' conditionnement'+(catQty>1?'s':'')+'</small></span><span class="suggestChevron">⌄</span></button><div class="suggestCatBody closed" data-cart-body="'+esc(cat)+'">'+arr.map(p=>{const q=Number(cart[p.id])||0;return '<div class="cartRow">'+(p.photo_url?'<img src="'+esc(p.photo_url)+'" alt="" loading="lazy" decoding="async">':'<span class="suggestPic">'+esc(m.emoji||'📦')+'</span>')+'<span class="suggestProduct"><strong>'+esc(p.name)+'</strong><small>'+esc(p.packaging||'Non renseigné')+' • Stock '+fmt(p.quantity)+'</small></span><div class="cartCounter"><button onclick="setOrderCartQty(\''+p.id+'\','+(q-1)+')">−</button><strong>'+fmt(q)+'</strong><button onclick="setOrderCartQty(\''+p.id+'\','+(q+1)+')">＋</button></div><button class="cartRemove" onclick="setOrderCartQty(\''+p.id+'\',0)" title="Supprimer">×</button></div>'}).join('')+'</div></section>'}).join('')}
function openOrderCart(){if(!canOperateFL)return;renderOrderCart();$('cartDialog').showModal();playUISound('open')}
function openSuggestions(){if(!canOperateFL)return;suggestActiveTab='Tous';renderSuggestions();$('suggestDialog').showModal();playUISound('open')}
function showOrderSuggestion(){if(!canOperateFL)return;const p=products.find(x=>x.id===$('infoId').value);if(!p)return;const old=$('orderSuggestion');if(old)old.remove();const s=suggestOrder(p),box=document.createElement('div');box.id='orderSuggestion';box.className='orderSuggest';const badge=s.qty===0?'no':s.status==='Commande prudente'?'maybe':'';box.innerHTML='<div class="orderSuggestHead"><div class="orderSuggestTitle">Suggestion de commande</div><span class="orderBadge '+badge+'">'+esc(s.status)+'</span></div><div class="orderSuggestQty">'+(s.qty===0?'0':esc(s.qty))+' <span style="font-size:13px;color:#888;font-weight:700">conditionnement'+(s.qty>1?'s':'')+'</span></div><div class="orderSuggestReason">'+esc(s.why.join(' • ')||'Aucun signal particulier.')+'</div><div class="orderSignals"><span class="orderSignal">≈ 600 clients/jour</span><span class="orderSignal">'+(s.season>0?'Saison favorable':s.season<0?'Hors saison':'Saison neutre')+'</span><span class="orderSignal">Famille : '+fmt(s.familyStock)+'</span><span class="orderSignal">Catégorie : '+fmt(s.catStock)+'</span></div>'; $('infoView').appendChild(box);playUISound('open')}
