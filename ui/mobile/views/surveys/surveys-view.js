(function(){
'use strict';

// Nethor mobile · Campagne « Votre avis, notre magasin »
// Les votes sont enregistrés dans Supabase et protégés par RLS.
const CAMPAIGN='nethor_2026_q4';
const MIN_PUBLIC_RESULTS=5;
const state={host:null,mounted:false,token:0,polls:[],options:[],votes:{},results:{},week:1,loading:false,saving:false,error:'',notice:''};
const router=()=>window.NethorMobileRouter||window.MobileRouter;
const services=()=>window.NethorMobileServices||window.MobileServices;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const parisDate=()=>{
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const v=key=>parts.find(p=>p.type===key)?.value||'';
 return v('year')+'-'+v('month')+'-'+v('day');
};
function dateLabel(iso){
 return new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'short',timeZone:'Europe/Paris'}).format(new Date(iso+'T12:00:00Z'));
}
function currentPoll(){
 return state.polls.find(p=>Number(p.week_number)===state.week)||null;
}
function pollStatus(p){
 if(!p)return'unknown';
 const now=parisDate();
 return now<p.start_on?'future':now>p.end_on?'closed':'open';
}
function statusText(p){
 return pollStatus(p)==='future'?'À venir':pollStatus(p)==='closed'?'Terminé':'En cours';
}
function render(){
 if(!state.mounted||!state.host)return;
 const p=currentPoll(),status=p?pollStatus(p):'unknown';
 const answers=p?state.options.filter(o=>o.poll_id===p.id):[];
 const selected=p?state.votes[p.id]:null;
 const aggregate=p?state.results[p.id]:null;
 const resultsVisible=status==='closed'&&aggregate?.available===true;
 const pct=(number,total)=>total>0?Math.round(100*Number(number||0)/total):0;
 const selectedSet=new Set(state.polls.map(x=>Number(x.week_number)));
 state.host.innerHTML='<section class="nethorWeeklyPollView">'+
  '<div class="nwpTop"><button type="button" class="nwpBack" data-nwp-back aria-label="Retour au menu">‹</button><span>Sondages de l’équipe</span><span class="nwpCampaignTag">8 semaines</span></div>'+
  '<header class="nwpHero"><span class="nwpEyebrow">VOTRE AVIS, NOTRE MAGASIN</span><h1>Ensemble, améliorons notre quotidien.</h1><p>Une question chaque semaine pour identifier les besoins du magasin. Ton avis compte, sans obligation.</p></header>'+
  '<div class="nwpWeekHead"><strong>Les 8 semaines</strong><small>Sélectionne une semaine</small></div>'+
  '<div class="nwpWeeks" role="group" aria-label="Navigation entre les sondages">'+
  Array.from({length:8},(_,i)=>{
    const n=i+1, poll=state.polls.find(x=>Number(x.week_number)===n);
    const s=poll?pollStatus(poll):'future';
    return '<button type="button" data-nwp-week="'+n+'" class="nwpWeek'+(n===state.week?' current':'')+'" aria-pressed="'+(n===state.week)+'" aria-label="Semaine '+n+', '+(poll?statusText(poll):'à venir')+'"><b>'+n+'</b><i aria-hidden="true" class="nwpDot '+s+'"></i></button>';
  }).join('')+'</div>'+
  (state.loading?'<div class="nwpCard nwpInfo" role="status">Chargement des sondages…</div>':
   state.error?'<div class="nwpCard nwpInfo" role="alert"><strong>Impossible de charger les sondages</strong><p>'+esc(state.error)+'</p><button type="button" class="nwpRetry" data-nwp-retry>Réessayer</button></div>':
   !p?'<div class="nwpCard nwpInfo">Aucun sondage disponible pour cette campagne.</div>':
   '<article class="nwpCard">'+
    '<div class="nwpMeta"><span class="nwpStatus '+status+'">'+esc(statusText(p))+'</span><span>Semaine '+esc(p.week_number)+' · '+esc(dateLabel(p.start_on))+' – '+esc(dateLabel(p.end_on))+'</span></div>'+
    '<h2>'+esc(p.theme)+'</h2>'+
    '<p class="nwpQuestion">'+esc(p.question)+'</p>'+
    '<div class="nwpOptions">'+answers.map((o,i)=>{
      const picked=String(selected||'')===String(o.id);
      const count=resultsVisible?(aggregate.options||[]).find(x=>x.id===o.id)?.count||0:0;
      const percent=pct(count,aggregate?.total||0);
      const voting=status==='open';
      const tag=resultsVisible?'<span class="nwpCount">'+percent+' %</span>':picked?'<span class="nwpChosen">Mon choix ✓</span>':'';
      return '<button type="button" class="nwpOption'+(picked?' selected':'')+'" data-nwp-option="'+esc(o.id)+'"'+(voting&&!state.saving?'':' disabled')+' aria-pressed="'+picked+'">'+
      (resultsVisible?'<span class="nwpOptionProgress" style="width:'+percent+'%"></span>':'')+
      '<span class="nwpOptionNumber">'+(i+1)+'</span><span class="nwpOptionLabel">'+esc(o.label)+'</span>'+tag+'</button>';
    }).join('')+'</div>'+
    (state.saving?'<div class="nwpFootNote" role="status">Enregistrement de ton choix…</div>':
     state.notice?'<div class="nwpFootNote nwpSuccess" role="status">'+esc(state.notice)+'</div>':'')+
    (status==='open'?'<p class="nwpFootNote">'+(selected?'Ton vote est enregistré. Tu peux modifier ta réponse jusqu’à dimanche soir.':'Choisis une seule réponse. Tu pourras modifier ton vote avant la clôture.')+'</p>':
     status==='future'?'<p class="nwpFootNote">Le vote ouvrira le '+esc(dateLabel(p.start_on))+'.</p>':
     resultsVisible?'<div class="nwpResultFoot">'+esc(aggregate.total)+' participation'+(Number(aggregate.total)>1?'s':'')+' · Résultats collectifs</div>':
     '<p class="nwpFootNote">Résultats masqués : moins de '+MIN_PUBLIC_RESULTS+' participations ou comptage en cours, pour préserver la confidentialité.</p>')+
    (status==='closed'?'<div class="nwpAction"><strong>Et maintenant ?</strong><p>'+esc(p.action_hint)+'</p><small>Une piste à étudier avec l’équipe, pas une décision déjà prise.</small></div>':'')+
   '</article>')+
  '<footer class="nwpPrivacy"><span aria-hidden="true">◈</span> Participation facultative · une réponse par compte · seuls les résultats collectifs sont publiés après clôture (au moins cinq votes). Une situation dangereuse doit être signalée immédiatement, sans attendre un sondage.</footer>'+
  '</section>';
}
async function loadResults(p){
 if(!p||pollStatus(p)!=='closed'||state.results[p.id])return;
 const client=services()?.client;
 if(!client)return;
 try{
  const {data,error}=await client.rpc('weekly_poll_results',{p_poll_id:p.id});
  if(error)throw error;
  if(!state.mounted)return;
  state.results[p.id]=data||{available:false};
  if(currentPoll()?.id===p.id)render();
 }catch(error){
  console.warn('[Nethor Weekly Polls] résultats',error);
  if(state.mounted&&currentPoll()?.id===p.id){
   state.notice='';
   // Ne jamais afficher de chiffres locaux non vérifiés.
  }
 }
}
async function load(){
 const shared=services(),token=++state.token;
 state.loading=true;state.error='';state.notice='';render();
 try{
  await shared?.ready?.();
  if(!state.mounted||token!==state.token)return;
  if(navigator.onLine===false)throw new Error('Une connexion est nécessaire pour accéder aux sondages et voter.');
  const client=shared?.client,uid=shared?.session?.user?.id;
  if(!client||!uid)throw new Error('Connecte-toi à Nethor pour consulter les sondages.');
  const response=await client.from('weekly_polls')
    .select('id,week_number,start_on,end_on,theme,question,action_hint')
    .eq('campaign_code',CAMPAIGN).order('week_number',{ascending:true});
  if(response.error)throw response.error;
  const polls=response.data||[],ids=polls.map(x=>x.id);
  const [opts,votes]=ids.length?await Promise.all([
    client.from('weekly_poll_options').select('id,poll_id,position,label').in('poll_id',ids).order('position',{ascending:true}),
    client.from('weekly_poll_votes').select('poll_id,option_id').eq('user_id',uid).in('poll_id',ids)
  ]):[{data:[]},{data:[]}];
  if(opts.error)throw opts.error;
  if(votes.error)throw votes.error;
  if(!state.mounted||token!==state.token)return;
  state.polls=polls;state.options=opts.data||[];
  state.votes=Object.fromEntries((votes.data||[]).map(x=>[x.poll_id,x.option_id]));
  const present=polls.find(x=>pollStatus(x)==='open')
   || polls.find(x=>pollStatus(x)==='future')
   || [...polls].reverse()[0];
  if(!polls.some(x=>Number(x.week_number)===state.week)&&present)state.week=Number(present.week_number);
  // Au premier chargement, afficher le sondage actuel ou le prochain.
  if(!state.hasChosenWeek&&present)state.week=Number(present.week_number);
  state.loading=false;render();
  const selected=currentPoll();if(selected)void loadResults(selected);
 }catch(error){
  if(!state.mounted||token!==state.token)return;
  state.loading=false;
  state.error=error?.message||'Une erreur est survenue.';
  render();
 }
}
async function vote(optionId){
 const p=currentPoll(),shared=services();
 if(!p||state.saving||pollStatus(p)!=='open')return;
 const option=state.options.find(o=>o.poll_id===p.id&&o.id===optionId);
 const uid=shared?.session?.user?.id;
 if(!uid||!option||!shared?.client)return;
 if(navigator.onLine===false){state.notice='Tu dois être connecté pour voter.';render();return}
 state.saving=true;state.notice='';render();
 try{
  const {error}=await shared.client.from('weekly_poll_votes').upsert({
   poll_id:p.id,user_id:uid,option_id:option.id
  },{onConflict:'poll_id,user_id'});
  if(error)throw error;
  if(!state.mounted)return;
  state.votes[p.id]=option.id;
  state.notice='Merci ! Ton choix a bien été enregistré.';
 }catch(error){
  if(!state.mounted)return;
  state.notice='Vote non enregistré : '+(error?.message||'réessaie plus tard.');
 }finally{
  if(state.mounted){state.saving=false;render()}
 }
}
function onClick(event){
 const button=event.target?.closest?.('button');
 if(!button||!state.host?.contains(button))return;
 if(button.hasAttribute('data-nwp-back')){void router()?.open?.('user-menu',{source:'weekly-polls'});return}
 if(button.hasAttribute('data-nwp-retry')){void load();return}
 if(button.hasAttribute('data-nwp-week')){
  const next=Number(button.dataset.nwpWeek);
  if(next>=1&&next<=8){state.week=next;state.hasChosenWeek=true;state.notice='';render();void loadResults(currentPoll())}
  return
 }
 const optionId=button.dataset.nwpOption;
 if(optionId)void vote(optionId);
}
async function mount(host){
 state.host=host;state.mounted=true;state.hasChosenWeek=false;
 state.polls=[];state.options=[];state.votes={};state.results={};
 host.addEventListener('click',onClick);
 void load();
 return true;
}
async function unmount(){
 state.token++;state.mounted=false;
 state.host?.removeEventListener('click',onClick);
 if(state.host)state.host.innerHTML='';
 state.host=null;
 return true;
}
const api=Object.freeze({mount,unmount,refresh:load});
window.NethorMobileWeeklyPollsView=api;
router()?.register?.('surveys',api);
})();
