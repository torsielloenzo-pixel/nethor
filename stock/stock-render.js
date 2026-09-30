/* Nethor Stock — modes et rendu, Phase 4.19 */
function setStockMode(mode){
 if(!['stock','consult','order','manage'].includes(mode))mode='stock';if(mode==='order'&&!canOperateFL)mode='stock';if(mode==='manage'&&!canManageFL)mode='stock';
 stockMode=mode;if($('fab'))$('fab').classList.toggle('hidden',mode!=='consult'||!canManageFL);searchTerm='';stockCategory='Tous';if($('searchInput'))$('searchInput').value='';if($('clearSearch'))$('clearSearch').classList.add('hidden');localStorage.setItem('nettoStockMode',mode);
 const u=new URL(location.href);u.searchParams.set('mode',mode);u.searchParams.delete('ean');history.replaceState({},'',u);
 applyStockModeUI();render();playUISound('soft')
}
function applyStockModeUI(){
 const titles={stock:['Stock express','Modifier ou vérifier les quantités, sans détour.'],consult:['Consulter','Rechercher une fiche ou contrôler une information sans risque de modifier le stock.'],order:['Commande','Préparer la commande à partir des besoins et du panier.'],manage:['Gestion','Administrer les articles, familles, catégories et conditionnements du Stock F&L.']},t=titles[stockMode]||titles.stock;
 document.querySelectorAll('.stockModeBtn').forEach(b=>b.classList.toggle('active',b.dataset.mode===stockMode));$('stockModeTitle').textContent=t[0];$('stockModeSubtitle').textContent=t[1];
 $('stockSearchTools').classList.toggle('hidden',stockMode==='order'||stockMode==='manage');$('stockViewOptions').classList.toggle('hidden',stockMode!=='consult');$('orderDashboard').classList.toggle('hidden',stockMode!=='order');$('manageDashboard').classList.toggle('hidden',stockMode!=='manage');$('app').classList.toggle('hidden',stockMode==='order'||stockMode==='manage');if($('resetStockOpenBtn'))$('resetStockOpenBtn').classList.toggle('hidden',!['stock','consult'].includes(stockMode)||!canOperateFL);
 if($('searchInput'))$('searchInput').placeholder=stockMode==='stock'?'Nom, code article…':'Rechercher une fiche, EAN13, origine…';
 renderQuickCats();renderWorkspaceDashboards();updateStockModeStat()
}
function updateStockModeStat(){
 const el=$('stockModeStat');if(!el)return;const on=products.filter(p=>p.on_sale!==false),zero=on.filter(p=>Number(p.quantity)===0).length;
 if(stockMode==='stock')el.textContent=on.length+' articles • '+zero+' à 0';
 else if(stockMode==='consult')el.textContent=products.length+' fiches';
 else if(stockMode==='order'){const rec=on.filter(p=>suggestOrder(p).qty>0).length;el.textContent=rec+' suggestion'+(rec>1?'s':'')}
 else el.textContent=on.length+' actifs'
}
function renderStockExpress(){
 const app=$('app'),visible=stockVisibleProducts();app.innerHTML='';let shown=0;
 const cats=stockCategory==='Tous'?Object.keys(meta):[stockCategory];
 cats.forEach(cat=>{const items=visible.filter(p=>p.category===cat).sort((a,b)=>productLogicalSort(cat,a,b));if(!items.length)return;shown+=items.length;const s=document.createElement('section');s.className='quickSection';s.innerHTML='<div class="quickSectionHead"><span>'+esc(meta[cat]?.emoji||'📦')+'</span>'+esc(cat)+' <small>('+items.length+')</small></div><div class="quickRows"></div>';const g=s.querySelector('.quickRows');
  items.forEach(p=>{const canEdit=canOperateFL&&stockDataFresh&&p.on_sale!==false,row=document.createElement('div');row.className='quickStockRow'+(Number(p.quantity)===0?' zero':'');row.dataset.productId=p.id;const pic=p.photo_url?'<div class="quickPic"><img src="'+esc(p.photo_url)+'" alt="" loading="lazy" decoding="async"></div>':'<div class="quickPic">'+esc(meta[p.category]?.emoji||'📦')+'</div>';row.innerHTML=pic+'<div class="quickInfo"><strong>'+esc(p.name)+'</strong><small>'+esc(p.packaging||'Non renseigné')+(p.article_code?' • '+esc(p.article_code):'')+' <button class="quickInfoBtn" onclick="openInfo(\''+p.id+'\')" title="Fiche">i</button></small></div><div class="quickControls"><button '+(!canEdit?'disabled':'')+' onclick="change(\''+p.id+'\',-.5)">−</button><div class="quickQty">'+fmt(p.quantity)+'</div><button class="quickPlus" '+(!canEdit?'disabled':'')+' onclick="change(\''+p.id+'\',.5)">+</button>'+(canEdit?'<button class="quickZero" onclick="setStockZero(\''+p.id+'\')">Mettre à 0</button>':'')+'</div>';g.appendChild(row)});
  app.appendChild(s)
 });
 if(!shown)app.innerHTML='<div class="loading">Aucun article trouvé.</div>'
}
function renderConsult(){
 const app=$('app'),visible=stockVisibleProducts();app.innerHTML='';let shown=0;
 Object.keys(meta).forEach(cat=>{const items=visible.filter(p=>p.category===cat).sort((a,b)=>productLogicalSort(cat,a,b));if(!items.length)return;shown+=items.length;const s=document.createElement('section');s.className='quickSection';s.innerHTML='<div class="quickSectionHead"><span>'+esc(meta[cat]?.emoji||'📦')+'</span>'+esc(cat)+' <small>('+items.length+')</small></div><div class="consultGrid"></div>';const g=s.querySelector('.consultGrid');items.forEach(p=>{const card=document.createElement('button');card.className='consultCard'+(p.on_sale===false?' offSale':'');card.onclick=()=>openInfo(p.id);card.innerHTML=(p.photo_url?'<div class="consultVisual"><img src="'+esc(p.photo_url)+'" alt="" loading="lazy" decoding="async"></div>':'<div class="consultVisual">'+esc(meta[p.category]?.emoji||'📦')+'</div>')+'<div class="consultName">'+esc(p.name)+'</div><div class="consultMeta">'+esc(p.packaging||'Non renseigné')+(p.article_code?' • '+esc(p.article_code):'')+'</div><div class="consultBottom"><span class="consultStock '+(Number(p.quantity)===0?'zero':'')+'">Stock '+fmt(p.quantity)+'</span><span class="consultOpen">Voir la fiche →</span></div>';g.appendChild(card)});app.appendChild(s)});
 if(!shown)app.innerHTML='<div class="loading">Aucune fiche trouvée.</div>'
}
function renderWorkspaceDashboards(){
 if(!$('orderDashboard')||!$('manageDashboard'))return;
 const on=products.filter(p=>p.on_sale!==false),cartCount=cartItemCount(),recs=on.map(p=>({p,s:suggestOrder(p)})).filter(x=>x.s.qty>0).sort((a,b)=>b.s.priority-a.s.priority),zero=on.filter(p=>Number(p.quantity)===0).length,off=products.filter(p=>p.on_sale===false).length;
 $('orderDashboard').innerHTML='<div class="workspaceHero"><div><strong>Préparer la commande</strong><small>'+recs.length+' article'+(recs.length>1?'s':'')+' à regarder selon les règles actuelles.</small></div><b>'+recs.length+'</b></div><div class="workspaceActionGrid"><button class="workspaceAction" onclick="openSuggestions()"><span class="waIcon">✦</span><strong>Suggestions</strong><small>Voir uniquement les articles à analyser avant commande.</small><b>'+recs.length+' à vérifier</b></button><button class="workspaceAction" onclick="openOrderCart()"><span class="waIcon">🛒</span><strong>Panier</strong><small>Retrouver la liste préparée et ajuster les conditionnements.</small><b>'+cartCount+' au panier</b></button></div><div class="priorityPanel"><div class="priorityPanelHead"><strong>Priorités immédiates</strong><button class="secondary" onclick="openSuggestions()">Tout voir</button></div><div class="priorityList">'+(recs.length?recs.slice(0,6).map(({p,s})=>'<button class="priorityRow" onclick="openInfo(\''+p.id+'\');setTimeout(showOrderSuggestion,80)"><span><strong>'+esc(p.name)+'</strong><small>'+esc(p.category)+' • '+esc(s.status)+'</small></span><span class="priorityStock">Stock '+fmt(p.quantity)+'</span><span class="priorityQty">+'+s.qty+'</span></button>').join(''):'<div class="loading">Aucune suggestion prioritaire.</div>')+'</div></div>';
 $('manageDashboard').innerHTML='<div class="workspaceHero"><div><strong>Gestion du référentiel</strong><small>Les actions d’administration sont séparées du stock quotidien.</small></div><b>'+products.length+'</b></div><div class="manageSummary"><div><b>'+on.length+'</b><small>actifs</small></div><div><b>'+off+'</b><small>inactifs</small></div><div><b>'+zero+'</b><small>stock à 0</small></div></div><div class="workspaceActionGrid"><button class="workspaceAction" onclick="openAdd()"><span class="waIcon">＋</span><strong>Ajouter un article</strong><small>Créer une nouvelle fiche produit.</small></button><button class="workspaceAction" onclick="openManage()"><span class="waIcon">☷</span><strong>Gérer les produits</strong><small>Réordonner, supprimer ou organiser les articles.</small></button><button class="workspaceAction" onclick="openOptions(\'family\')"><span class="waIcon">◫</span><strong>Familles</strong><small>Créer, renommer ou supprimer les grandes familles de produits.</small></button><button class="workspaceAction" onclick="openOptions(\'category\')"><span class="waIcon">▤</span><strong>Catégories</strong><small>Gérer les catégories à l’intérieur de chaque famille.</small></button><button class="workspaceAction" onclick="openOptions(\'packaging\')"><span class="waIcon">▣</span><strong>Conditionnements</strong><small>Créer, renommer ou supprimer les conditionnements.</small></button><button class="workspaceAction" onclick="location.href=\'fl-assistant.html\'"><span class="waIcon">✦</span><strong>Assistant Précommande</strong><small>Centraliser les exports Excel, contrôler les données disponibles et préparer le calcul de précommande F&L.</small><b>BÊTA</b></button></div>'
}
function render(){renderQuickCats();updateStockModeStat();if(stockMode==='stock')renderStockExpress();else if(stockMode==='consult')renderConsult();else renderWorkspaceDashboards()}
function updateProductUI(id){
 const p=products.find(x=>x.id===id);if(!p)return;document.querySelectorAll('[data-product-id="'+id+'"]').forEach(row=>{row.classList.toggle('zero',Number(p.quantity)===0);const q=row.querySelector('.quickQty');if(q)q.textContent=fmt(p.quantity)});updateStockModeStat();if(stockMode==='order')renderWorkspaceDashboards()
}
async function change(id,d){
 playUISound('tick');if(!canOperateFL||!stockDataFresh)return;const p=products.find(x=>x.id===id);if(!p||p.on_sale===false)return;
 const v=Number(p.quantity)||0,q=d>0?(v===0?0.5:v===0.5?1:Math.floor(v)+1):(v<=0.5?0:v<=1?0.5:Math.max(1,Math.ceil(v)-1)),old=p.quantity;p.quantity=q;updateProductUI(id);resetSuggestionView();
 const {error}=await db.rpc('set_fl_stock_quantity',{target_product:id,new_quantity:q});if(error){p.quantity=old;updateProductUI(id);resetSuggestionView();alert('Modification refusée.')}
}
let stockResetMode='family';
function setStockResetMode(mode){
 stockResetMode=mode==='category'?'category':'family';
 $('resetModeFamilyBtn').classList.toggle('active',stockResetMode==='family');
 $('resetModeCategoryBtn').classList.toggle('active',stockResetMode==='category');
 $('resetCategoryBlock').classList.toggle('hidden',stockResetMode!=='category');
 renderStockResetSummary()
}
function openStockReset(){
 if(!canOperateFL||!flFamilyId)return;
 $('resetStockFamily').value=String(flFamilyId);
 stockResetMode='family';$('resetStockState').textContent='';setStockResetMode('family');renderStockResetCategories();renderStockResetSummary();$('stockResetDialog').showModal();window.NettoSounds?.play?.('menuOpen')
}
function resetSelectedCategoryIds(){return [...document.querySelectorAll('#resetStockCategories input:checked')].map(x=>String(x.value))}
function renderStockResetCategories(){
 const familyId=$('resetStockFamily').value,box=$('resetStockCategories'),items=categories.filter(x=>String(x.family_id)===String(familyId)).sort((a,b)=>(a.position||0)-(b.position||0)||(a.name||'').localeCompare(b.name||'','fr'));
 box.innerHTML=items.length?items.map(x=>{const n=allProducts.filter(p=>String(p.family_id)===String(familyId)&&String(p.category_id)===String(x.id)&&p.active!==false).length;return '<label class="resetCategoryChoice"><span class="resetCategoryChoiceIcon">'+esc(x.icon||'📦')+'</span><span class="resetCategoryChoiceText"><strong>'+esc(x.name)+'</strong><small>'+n+' article'+(n>1?'s':'')+'</small></span><input type="checkbox" value="'+x.id+'" onchange="renderStockResetSummary()"></label>'}).join(''):'<div class="small">Aucune catégorie disponible pour cette famille.</div>';
 renderStockResetSummary()
}
function stockResetTargets(){
 const familyId=$('resetStockFamily')?.value||'';if(!familyId)return[];
 let list=allProducts.filter(p=>String(p.family_id)===String(familyId)&&p.active!==false);
 if(stockResetMode==='category'){const ids=new Set(resetSelectedCategoryIds());list=list.filter(p=>ids.has(String(p.category_id)))}
 return list
}
function renderStockResetSummary(){
 const box=$('resetStockSummary');if(!box)return;const familyId=$('resetStockFamily')?.value||'',fam=familyById(familyId),selectedCats=resetSelectedCategoryIds(),targets=stockResetTargets(),nonZero=targets.filter(p=>Number(p.quantity)!==0).length,count=$('resetCategoryCount');if(count){count.textContent=selectedCats.length+' sélectionnée'+(selectedCats.length>1?'s':'')}
 if(!familyId){box.innerHTML='<strong>Sélection requise</strong>Choisis d’abord la famille concernée.';return}
 if(stockResetMode==='category'&&!resetSelectedCategoryIds().length){box.innerHTML='<strong>'+esc(fam?.name||'Famille')+'</strong>Sélectionne au moins une catégorie à réinitialiser.';return}
 box.innerHTML='<strong>'+esc(fam?.name||'Famille')+'</strong>'+targets.length+' article'+(targets.length>1?'s':'')+' concerné'+(targets.length>1?'s':'')+' • '+nonZero+' quantité'+(nonZero>1?'s':'')+' actuellement différente'+(nonZero>1?'s':'')+' de 0.'
}
async function confirmStockReset(){
 if(!canOperateFL)return;
 const familyId=$('resetStockFamily').value;if(!familyId)return $('resetStockState').textContent='Sélectionne une famille.';
 const categoryIds=resetSelectedCategoryIds();if(stockResetMode==='category'&&!categoryIds.length)return $('resetStockState').textContent='Sélectionne au moins une catégorie.';
 const targets=stockResetTargets(),nonZero=targets.filter(p=>Number(p.quantity)!==0);if(!targets.length)return $('resetStockState').textContent='Aucun article concerné.';
 const fam=familyById(familyId),catNames=stockResetMode==='category'?categories.filter(c=>categoryIds.includes(String(c.id))).map(c=>c.name):[];
 const scope=stockResetMode==='family'?'la famille « '+(fam?.name||'')+' »':'les catégories « '+catNames.join(' », « ')+' »';
 if(!confirm('Réinitialiser le stock de '+scope+' ? '+nonZero.length+' article'+(nonZero.length>1?'s seront':' sera')+' remis à 0.'))return;
 const btn=$('confirmStockResetBtn');btn.disabled=true;$('resetStockState').textContent='Réinitialisation en cours…';
 try{
   const rpcCategories=stockResetMode==='category'?categoryIds.map(Number):null;
   const {error}=await db.rpc('reset_fl_stock',{target_category_ids:rpcCategories});if(error)throw error;
   $('resetStockState').textContent='✓ Stock réinitialisé.';
   window.NettoSounds?.play?.('success');await loadProducts();renderStockResetSummary();setTimeout(()=>$('stockResetDialog').close(),500)
 }catch(e){$('resetStockState').textContent='Erreur : '+(e?.message||'réinitialisation impossible.');window.NettoSounds?.play?.('error')}
 finally{btn.disabled=false}
}

async function setStockZero(id){
 if(!canOperateFL||!stockDataFresh)return;const p=products.find(x=>x.id===id);if(!p||p.on_sale===false||Number(p.quantity)===0)return;const old=p.quantity;p.quantity=0;updateProductUI(id);playUISound('tick');resetSuggestionView();const {error}=await db.rpc('set_fl_stock_quantity',{target_product:id,new_quantity:0});if(error){p.quantity=old;updateProductUI(id);resetSuggestionView();alert('Modification refusée.')}
}
