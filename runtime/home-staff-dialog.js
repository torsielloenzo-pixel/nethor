/* Fenêtres détail : effectif présent et couverture, Desktop uniquement. */
(function(){
'use strict';
if(window.NethorHomeStaffDialog)return;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const working=v=>v==='g'||v==='b';
const hour=n=>{const total=Math.round(n*60);return String(Math.floor(total/60)).padStart(2,'0')+':'+String(total%60).padStart(2,'0')};
let dialog=null,context=null,kind='staff';
function timeNow(){const d=new Date();return d.getHours()+d.getMinutes()/60}
function intervals(c){
 const model=c?.model,day=model?.days?.[c.date];if(!day)return[];
 const start=Number(model.startTime??6),step=.25,result=[];
 (model.employees||[]).forEach((emp,index)=>{
  const cells=day.cells?.[index]||[];let from=null;
  for(let i=0;i<=cells.length;i++){
   if(i<cells.length&&working(cells[i])){if(from===null)from=i;continue}
   if(from!==null){result.push({name:String(emp?.name||'Utilisateur'),start:start+from*step,end:start+i*step});from=null}
  }
 });
 return result
}
function count(ranges,t){return new Set(ranges.filter(r=>r.start<=t&&t<r.end).map(r=>r.name)).size}
function groupEvents(ranges,field,now){
 const future=ranges.filter(x=>x[field]>now+.001).sort((a,b)=>a[field]-b[field]);
 if(!future.length)return null;
 const time=future[0][field],names=[...new Set(future.filter(x=>Math.abs(x[field]-time)<.001).map(x=>x.name))];
 return{time,names};
}
function eventCard(title,ev,sign){
 return '<div class="ndsEvent"><span>'+esc(title)+'</span><strong>'+(ev?hour(ev.time):'—')+'</strong><small>'+(ev?esc(sign+ev.names.length+' · '+ev.names.join(', ')):'Aucun autre mouvement prévu')+'</small></div>'
}
function summary(c,rs,now){
 if(!c?.model?.days?.[c.date])return '<div class="ndsEmpty">Aucun planning publié pour aujourd’hui.</div>';
 const current=[...new Set(rs.filter(x=>x.start<=now&&now<x.end).map(x=>x.name))],today=[...new Set(rs.map(x=>x.name))];
 const arrivals=groupEvents(rs,'start',now),departures=groupEvents(rs,'end',now);
 return '<div class="ndsNumbers"><div><span>Actuellement en poste</span><strong>'+current.length+'</strong><small>sur '+today.length+' personne'+(today.length>1?'s':'')+' planifiée'+(today.length>1?'s':'')+' aujourd’hui</small></div><div><span>Dans une heure</span><strong>'+count(rs,now+1)+'</strong><small>selon les horaires publiés</small></div></div>'+
 '<div class="ndsEvents">'+eventCard('Prochaine arrivée',arrivals,'+')+eventCard('Prochain départ',departures,'−')+'</div>'+
 '<h3>Actuellement en poste</h3>'+(current.length?'<div class="ndsNames">'+current.map(n=>'<span>'+esc(n)+'</span>').join('')+'</div>':'<div class="ndsEmpty">Aucun collaborateur planifié à cette heure.</div>');
}
function timeline(c,rs){
 const m=c?.model;if(!m?.days?.[c.date])return '<div class="ndsEmpty">Aucun planning publié pour aujourd’hui.</div>';
 const first=Number(m.startTime??6),length=Math.max(0,...(m.days[c.date].cells||[]).map(x=>x?.length||0));
 const end=first+length*.25,slots=[];
 for(let t=first;t<end;t+=1){const stop=Math.min(end,t+1),counted=count(rs,(t+stop)/2);slots.push({start:t,end:stop,value:counted})}
 if(!slots.length)return '<div class="ndsEmpty">Aucun créneau horaire renseigné.</div>';
 const peak=Math.max(1,...slots.map(x=>x.value));
 const zero=slots.filter(x=>x.value===0),low=slots.filter(x=>x.value>0&&x.value<=2);
 return '<div class="ndsLegend"><span><b class="ndsDot"></b>Présence planifiée</span><span>Indicateur, pas une mesure de charge</span></div>'+
 '<div class="ndsTimeline">'+slots.map(x=>'<div class="ndsSlot"><div class="ndsBarTrack"><span class="'+(x.value===0?'isZero':x.value<=2?'isLow':'')+'" style="height:'+Math.max(x.value?9:2,Math.round(x.value/peak*100))+'%"></span></div><b>'+x.value+'</b><small>'+hour(x.start)+'</small></div>').join('')+'</div>'+
 '<div class="ndsCoverageStats"><div><strong>'+zero.length+'</strong><span>créneau'+(zero.length>1?'x':'')+' d’une heure sans présence</span></div><div><strong>'+low.length+'</strong><span>créneau'+(low.length>1?'x':'')+' à 1–2 personnes</span></div></div>'+
 '<p class="ndsNote">Le calcul utilise les horaires publiés par tranche d’une heure. « 1–2 personnes » indique seulement un effectif réduit, sans préjuger des besoins du magasin.</p>';
}
function ensure(){
 if(dialog?.isConnected)return dialog;
 dialog=document.createElement('dialog');dialog.id='nethorStaffCoverageDialog';dialog.className='ndStaffDialog';
 dialog.innerHTML='<div class="ndsPanel"><header class="ndsHead"><span class="ndsIcon">▦</span><div><small>PLANNING · AUJOURD’HUI</small><h2 data-nds-title></h2><p data-nds-subtitle></p></div><button type="button" data-nds-close aria-label="Fermer">×</button></header><div class="ndsContent" data-nds-content></div><footer class="ndsFoot"><small>Source : planning publié de la journée.</small><a href="planning.html">Voir le planning complet ↗</a></footer></div>';
 document.body.appendChild(dialog);
 dialog.querySelector('[data-nds-close]').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
 dialog.addEventListener('close',()=>{context=null});
 return dialog
}
function paint(){
 const rs=intervals(context),now=timeNow(),staff=kind==='staff';
 dialog.querySelector('[data-nds-title]').textContent=staff?'Effectif présent':'Couverture planning';
 dialog.querySelector('[data-nds-subtitle]').textContent=staff?'Présences et prochains mouvements du personnel.':'Répartition des effectifs sur la journée.';
 dialog.querySelector('[data-nds-content]').innerHTML=staff?summary(context,rs,now):timeline(context,rs)
}
function open(nextKind,nextContext){
 kind=nextKind==='coverage'?'coverage':'staff';context=nextContext||null;ensure();paint();
 if(!dialog.open)dialog.showModal()
}
window.NethorHomeStaffDialog=Object.freeze({open});
})();
