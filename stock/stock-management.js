/* Nethor Stock — gestion catalogue, Phase 4.19 */
function openManage(){if(!canManageFL)return;renderManage();$('manageDialog').showModal()}
function openOptions(kind){
 if(!canManageFL)return;optionType=kind;
 const titles={family:'Gérer les familles',category:'Gérer les catégories',packaging:'Gérer les conditionnements'},labels={family:'Nouvelle famille',category:'Nouvelle catégorie',packaging:'Nouveau conditionnement'};
 $('optionsTitle').textContent=titles[kind]||'Gérer';$('optionLabel').textContent=labels[kind]||'Nouveau';$('optionName').value='';
 $('optionFamilyWrap').classList.toggle('hidden',kind!=='category');
 if(kind==='category'){const sel=$('optionFamily'),old=sel.value;sel.innerHTML=families.map(f=>'<option value="'+f.id+'">'+esc(f.name)+'</option>').join('');if(families.some(f=>String(f.id)===String(old)))sel.value=old;else if(flFamilyId)sel.value=String(flFamilyId)}
 renderOptions();$('optionsDialog').showModal()
}
function renderOptions(){
 const l=$('optionsList');l.innerHTML='';
 let rows=optionType==='family'?families:optionType==='category'?categories.filter(x=>String(x.family_id)===String($('optionFamily')?.value)):packagings;
 rows=[...rows].sort((a,b)=>(a.position||0)-(b.position||0)||(a.name||'').localeCompare(b.name||'','fr'));
 if(!rows.length){l.innerHTML='<div class="loading">Aucun élément.</div>';return}
 rows.forEach(rec=>{const row=document.createElement('div');row.className='optionRow';row.innerHTML='<input value="'+esc(rec.name)+'"><button class="secondary">Renommer</button><button class="delete">Supprimer</button>';row.children[1].onclick=()=>renameOption(rec.id,row.children[0].value.trim());row.children[2].onclick=()=>deleteOption(rec.id,rec.name);l.appendChild(row)})
}
function slugifyFamily(v){return String(v||'').toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,'-et-').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')}
async function addOption(){
 const name=$('optionName').value.trim();if(!name)return;
 let q;
 if(optionType==='family')q=db.from('product_families').insert({name,slug:slugifyFamily(name),icon:'📦',color:'#777777',position:(families.length+1)*10,admin_only:true,stock_enabled:true});
 else if(optionType==='category'){const family_id=Number($('optionFamily').value);if(!family_id)return;q=db.from('product_categories').insert({family_id,name,icon:'📦',color:'#777777',position:(categories.filter(x=>String(x.family_id)===String(family_id)).length+1)*10})}
 else q=db.from('product_packagings').insert({name,position:(packagings.length+1)*10});
 const {error}=await q;if(error)return alert('Ajout impossible : '+error.message);await loadOptions();$('optionName').value='';renderOptions();await loadProducts();renderManage()
}
async function renameOption(id,newName){
 if(!newName)return;
 const table=optionType==='family'?'product_families':optionType==='category'?'product_categories':'product_packagings',payload={name:newName};
 const {error}=await db.from(table).update(payload).eq('id',id);if(error)return alert('Modification impossible : '+error.message);await loadOptions();renderOptions();await loadProducts();renderManage()
}
async function deleteOption(id,name){
 const label=optionType==='family'?'famille':optionType==='category'?'catégorie':'conditionnement';
 if(!confirm('Supprimer '+label+' « '+name+' » ?\n\nLes articles concernés ne seront pas supprimés : ils passeront en « Non répertorié » lorsque le lien disparaît.'))return;
 const table=optionType==='family'?'product_families':optionType==='category'?'product_categories':'product_packagings';
 const {error}=await db.from(table).delete().eq('id',id);if(error)return alert('Suppression impossible : '+error.message);await loadOptions();renderOptions();await loadProducts();renderManage()
}
function toggleManageCategory(cat){const el=document.querySelector('.manageCat[data-cat="'+CSS.escape(cat)+'"]');if(el)el.classList.toggle('collapsed')}
function renderManage(){const l=$('manageList');l.innerHTML='';Object.keys(meta).forEach(cat=>{const items=products.filter(p=>p.category===cat);const box=document.createElement('div');box.className='manageCat collapsed';box.dataset.cat=cat;const head=document.createElement('button');head.className='manageCatHead';head.innerHTML='<span class="dot" style="background:'+meta[cat].color+'"></span>'+esc(cat)+'<span class="manageCount">('+items.length+')</span><span class="chevron">⌄</span>';head.onclick=()=>box.classList.toggle('collapsed');const body=document.createElement('div');body.className='manageCatBody';items.forEach(p=>{const r=document.createElement('div');r.className='manageRow';r.draggable=true;r.dataset.id=p.id;r.dataset.cat=p.category;r.innerHTML='<span class="dragHandle">☰</span><span>'+esc(p.name)+(p.packaging?' <small>• '+esc(p.packaging)+'</small>':'')+'</span><button class="delete" onclick="event.stopPropagation();removeProduct(\''+p.id+'\')">Supprimer</button>';r.addEventListener('dragstart',ev=>{r.classList.add('dragging');ev.dataTransfer.setData('text/plain',p.id);ev.dataTransfer.effectAllowed='move'});r.addEventListener('dragend',()=>{r.classList.remove('dragging');document.querySelectorAll('.dragOver').forEach(x=>x.classList.remove('dragOver'))});r.addEventListener('dragover',ev=>{if(document.querySelector('.dragging')?.dataset.cat!==p.category)return;ev.preventDefault();r.classList.add('dragOver')});r.addEventListener('dragleave',()=>r.classList.remove('dragOver'));r.addEventListener('drop',async ev=>{ev.preventDefault();r.classList.remove('dragOver');const from=ev.dataTransfer.getData('text/plain');if(from&&from!==p.id)await reorderProduct(from,p.id)});body.appendChild(r)});if(!items.length){const empty=document.createElement('div');empty.className='small';empty.style.padding='12px 2px';empty.textContent='Aucun produit';body.appendChild(empty)}box.append(head,body);l.appendChild(box)})}
async function reorderProduct(fromId,toId){const from=products.find(p=>p.id===fromId),to=products.find(p=>p.id===toId);if(!from||!to||from.category!==to.category)return;const catItems=products.filter(p=>p.category===from.category).sort((a,b)=>(Number(a.position)||0)-(Number(b.position)||0));const a=catItems.findIndex(p=>p.id===fromId),b=catItems.findIndex(p=>p.id===toId);if(a<0||b<0)return;const [moved]=catItems.splice(a,1);catItems.splice(b,0,moved);const other=products.filter(p=>p.category!==from.category);products=[...other,...catItems].sort((x,y)=>(Number(x.position)||0)-(Number(y.position)||0));catItems.forEach((p,i)=>p.position=i+1);render();renderManage();const results=await Promise.all(catItems.map((p,i)=>db.from('products').update({position:i+1}).eq('id',p.id)));if(results.some(x=>x.error)){alert('Impossible d’enregistrer le nouvel ordre.');await loadProducts();renderManage();return}await loadProducts();renderManage()}

async function removeProduct(id){if(!confirm('Supprimer ce produit ?'))return;const {error}=await db.from('products').delete().eq('id',id);if(error)return alert('Suppression impossible.');await loadProducts();renderManage()}
