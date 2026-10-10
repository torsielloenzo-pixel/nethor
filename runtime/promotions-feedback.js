/* Nethor Promotions : mémoire déterministe issue des corrections humaines.
 * Réutilise uniquement les correspondances exactes de nom ; jamais un prix historique.
 * Un rejet n'exclut un candidat futur que si son nom ET l'extrait source
 * correspondent exactement, pour ne pas supprimer une offre réelle différente.
 */
(function(root){
'use strict';
const normalize=s=>String(s??'').trim().replace(/\s+/g,' ').toLocaleLowerCase('fr');
function useRules(products,feedback){
 const byName=new Map();
 for(const row of [...(feedback||[])].sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||''))||(Number(b.id)||0)-(Number(a.id)||0))){
  const key=normalize(row.source_key||row.source_product_name);
  if(key&&!byName.has(key))byName.set(key,row)
 }
 const output=[],stats={renamed:0,recategorized:0,excluded:0,learned:0};
 for(const raw of products||[]){
  const product={...raw},rule=byName.get(normalize(product.product_name));
  if(!rule){output.push(product);continue}
  if(rule.action==='rejected'){
   if(normalize(rule.source_excerpt)&&normalize(rule.source_excerpt)===normalize(product.source_excerpt)){
    stats.excluded++;continue
   }
   output.push(product);continue
  }
  stats.learned++;
  if(rule.corrected_name&&normalize(rule.corrected_name)!==normalize(product.product_name)){
   product.product_name=String(rule.corrected_name).slice(0,500);
   stats.renamed++
  }
  if(rule.corrected_category&&rule.corrected_category!==product.category){
   product.category=String(rule.corrected_category).slice(0,60);
   stats.recategorized++
  }
  // Prix, quantité, origine, g/kg et avantages demeurent ceux du nouveau PDF.
  output.push(product)
 }
 return{products:output,stats}
}
root.NethorPromotionsFeedback=Object.freeze({normalize,useRules})
})(window);
