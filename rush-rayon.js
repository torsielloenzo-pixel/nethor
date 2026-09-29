(function(){
"use strict";
var STORAGE_KEY="nethor:rush-rayon-best-v2";
var current=null;
var W=900,H=1180,GROUND=972;
function q(root,sel){return root.querySelector(sel)}
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function rnd(min,max){return min+Math.random()*(max-min)}
function rounded(ctx,x,y,w,h,r){
 r=Math.min(r,w/2,h/2);
 ctx.beginPath();
 ctx.moveTo(x+r,y);
 ctx.arcTo(x+w,y,x+w,y+h,r);
 ctx.arcTo(x+w,y+h,x,y+h,r);
 ctx.arcTo(x,y+h,x,y,r);
 ctx.arcTo(x,y,x+w,y,r);
 ctx.closePath();
}
function safeBest(){
 try{
  var raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}");
  return {score:Number(raw.score)||0,distance:Number(raw.distance)||0,articles:Number(raw.articles)||0};
 }catch(_){return {score:0,distance:0,articles:0}}
}
function saveBest(best){
 try{localStorage.setItem(STORAGE_KEY,JSON.stringify(best))}catch(_){}
}
function shell(){
 return [
  '<div class="rushShell">',
   '<div class="rushGameHead">',
    '<div><span class="rushGameEyebrow">MINI-JEU · NETHOR</span><h2>Rush Rayon</h2><p>Un runner arcade inspiré du magasin : simple, rapide et de plus en plus intense.</p></div>',
    '<div class="rushBestCard"><span>Meilleur score</span><strong data-rush-best>0 pts</strong></div>',
   '</div>',
   '<div class="rushDevice">',
    '<button class="rushExitGames" type="button" data-rush-exit aria-label="Retour aux jeux">‹ <span>Jeux</span></button>',
    '<div class="rushMenu" data-rush-menu><div class="rushMenuBrand"><span class="rushMenuN">N</span><div><small>NETHOR ARCADE</small><strong>RUSH RAYON</strong></div></div><div class="rushMenuRunner">🏃</div><button class="rushMenuPlay" type="button" data-rush-menu-play>▶ Jouer</button><button class="rushMenuScore" type="button" data-rush-menu-score>★ Scores</button><button class="rushMenuSound" type="button" data-rush-sound>🔊 Son</button><div class="rushScores" data-rush-scores hidden><div class="rushScoresHead"><strong>Meilleurs scores</strong><button type="button" data-rush-score-close>✕</button></div><div data-rush-score-list><p>Chargement…</p></div></div></div>',
    '<div class="rushHud">',
     '<div class="rushMetric"><span>Score</span><strong data-rush-score>0</strong></div>',
     '<div class="rushMetric"><span>Articles</span><strong data-rush-items>0</strong></div>',
     '<div class="rushMetric"><span>Distance</span><strong data-rush-distance>0 m</strong></div>',
     '<button class="rushPause" type="button" data-rush-pause aria-label="Mettre en pause" disabled>Ⅱ</button>',
    '</div>',
    '<div class="rushPhaseBar"><strong data-rush-phase>Ouverture · 06:00</strong><span data-rush-speed>Tranquille</span></div>',
    '<div class="rushStage" data-rush-stage tabindex="0" role="application" aria-label="Rush Rayon. Touchez, cliquez ou appuyez sur Espace pour sauter.">',
     '<canvas class="rushCanvas" data-rush-canvas width="900" height="1180">Ton navigateur ne prend pas en charge le jeu.</canvas>',
     '<div class="rushToast" data-rush-toast aria-live="polite"></div>',
     '<div class="rushOverlay" data-rush-overlay>',
      '<span class="rushOverlayBadge" data-rush-overlay-badge>RUSH RAYON</span>',
      '<strong data-rush-overlay-title>Prêt pour le rayon ?</strong>',
      '<p data-rush-overlay-text>Touchez l’écran, cliquez ou utilisez Espace / ↑ pour sauter.</p>',
      '<button type="button" data-rush-start>Jouer</button>',
     '</div>',
    '</div>',
    '<div class="rushHint"><span class="rushJumpIcon">↑</span><strong>Maintenir = saut plus long</strong><small>Relâche pour redescendre plus vite. Espace / ↑ fonctionne aussi.</small></div>',
   '</div>',
   '<div class="rushGameFoot"><button type="button" data-rush-restart>Recommencer</button><button type="button" data-rush-menu-back>Menu</button></div>',
   '<p class="rushRules">Les meilleurs scores sont enregistrés sur le compte Nethor connecté.</p>',
  '</div>'
 ].join("");
}
function RushGame(root){
 this.root=root;
 this.canvas=q(root,"[data-rush-canvas]");
 this.ctx=this.canvas.getContext("2d");
 this.stage=q(root,"[data-rush-stage]");
 this.pauseBtn=q(root,"[data-rush-pause]");
 this.startBtn=q(root,"[data-rush-start]");
 this.restartBtn=q(root,"[data-rush-restart]");
 this.overlay=q(root,"[data-rush-overlay]");
 this.overlayBadge=q(root,"[data-rush-overlay-badge]");
 this.overlayTitle=q(root,"[data-rush-overlay-title]");
 this.overlayText=q(root,"[data-rush-overlay-text]");
 this.toast=q(root,"[data-rush-toast]");
 this.scoreEl=q(root,"[data-rush-score]");
 this.itemsEl=q(root,"[data-rush-items]");
 this.distanceEl=q(root,"[data-rush-distance]");
 this.bestEl=q(root,"[data-rush-best]");
 this.menu=q(root,"[data-rush-menu]");this.exitGames=q(root,"[data-rush-exit]");this.menuPlay=q(root,"[data-rush-menu-play]");this.menuScore=q(root,"[data-rush-menu-score]");this.menuBack=q(root,"[data-rush-menu-back]");this.soundBtn=q(root,"[data-rush-sound]");this.scoresPanel=q(root,"[data-rush-scores]");this.scoreList=q(root,"[data-rush-score-list]");this.scoreClose=q(root,"[data-rush-score-close]");
 this.api=window.NettoProfileUI||null;this.db=this.api&&this.api.client;this.user=this.api&&this.api.session&&this.api.session.user;this.soundOn=true;try{this.soundOn=localStorage.getItem("rushRayonSound")!=="0"}catch(_){};this.audio=new RushAudio(this);
 this.phaseEl=q(root,"[data-rush-phase]");
 this.speedEl=q(root,"[data-rush-speed]");
 this.best=safeBest();
 this.mode="ready";
 this.raf=0;
 this.toastTimer=0;
 this.boundKey=this.onKey.bind(this);
 this.boundPointer=this.onPointer.bind(this);
 this.boundVisibility=this.onVisibility.bind(this);
 this.boundPause=this.togglePause.bind(this);
 this.boundStart=this.onStart.bind(this);
 this.boundRestart=this.restart.bind(this);this.boundPointerUp=this.onPointerUp.bind(this);this.boundKeyUp=this.onKeyUp.bind(this);this.boundExitGames=this.exitToGames.bind(this);this.boundMenuPlay=this.playFromMenu.bind(this);this.boundMenuScore=this.openScores.bind(this);this.boundMenuBack=this.backToMenu.bind(this);this.boundSound=this.toggleSound.bind(this);this.boundScoreClose=this.closeScores.bind(this);
 this.stage.addEventListener("pointerdown",this.boundPointer,{passive:false});this.stage.addEventListener("pointerup",this.boundPointerUp,{passive:false});this.stage.addEventListener("pointercancel",this.boundPointerUp,{passive:false});this.exitGames.addEventListener("click",this.boundExitGames);this.menuPlay.addEventListener("click",this.boundMenuPlay);this.menuScore.addEventListener("click",this.boundMenuScore);this.menuBack.addEventListener("click",this.boundMenuBack);this.soundBtn.addEventListener("click",this.boundSound);this.scoreClose.addEventListener("click",this.boundScoreClose);
 document.addEventListener("keydown",this.boundKey);document.addEventListener("keyup",this.boundKeyUp);
 document.addEventListener("visibilitychange",this.boundVisibility);
 this.pauseBtn.addEventListener("click",this.boundPause);
 this.startBtn.addEventListener("click",this.boundStart);
 this.restartBtn.addEventListener("click",this.boundRestart);
 this.resetState();this.updateSoundButton();this.loadScores();this.updateBest();
 this.updateHud();
 this.draw();
}
RushGame.prototype.destroy=function(){
 cancelAnimationFrame(this.raf);
 clearTimeout(this.toastTimer);
 this.stage.removeEventListener("pointerdown",this.boundPointer);this.stage.removeEventListener("pointerup",this.boundPointerUp);this.stage.removeEventListener("pointercancel",this.boundPointerUp);this.exitGames.removeEventListener("click",this.boundExitGames);this.menuPlay.removeEventListener("click",this.boundMenuPlay);this.menuScore.removeEventListener("click",this.boundMenuScore);this.menuBack.removeEventListener("click",this.boundMenuBack);this.soundBtn.removeEventListener("click",this.boundSound);this.scoreClose.removeEventListener("click",this.boundScoreClose);this.audio.destroy();
 document.removeEventListener("keydown",this.boundKey);document.removeEventListener("keyup",this.boundKeyUp);
 document.removeEventListener("visibilitychange",this.boundVisibility);
 this.pauseBtn.removeEventListener("click",this.boundPause);
 this.startBtn.removeEventListener("click",this.boundStart);
 this.restartBtn.removeEventListener("click",this.boundRestart);
};
RushGame.prototype.resetState=function(){
 this.elapsed=0;
 this.distance=0;
 this.articles=0;
 this.bonusScore=0;
 this.currentSpeed=390;
 this.spawnTimer=1.1;
 this.eventTimer=rnd(18,28);
 this.eventBoostUntil=0;
 this.phaseKey="";
 this.obstacles=[];
 this.collectibles=[];
 this.player={x:132,y:GROUND-128,w:80,h:128,vy:0,grounded:true,holding:false,holdTime:0,landSquash:0};
 this.last=0;
 this.updateHud();
};
RushGame.prototype.restart=function(){this.audio.menu();this.start(false)};
RushGame.prototype.exitToGames=function(e){if(e)e.stopPropagation();this.audio.menu();window.dispatchEvent(new CustomEvent("nethor:game-exit",{detail:{game:"rush"}}))};
RushGame.prototype.playFromMenu=function(e){if(e)e.stopPropagation();this.audio.menu();this.menu.hidden=true;this.start(false)};
RushGame.prototype.backToMenu=function(e){if(e)e.stopPropagation();cancelAnimationFrame(this.raf);this.mode="ready";this.pauseBtn.disabled=true;this.overlay.hidden=true;this.menu.hidden=false;this.closeScores();this.audio.stopMusic();this.audio.menu();this.resetState();this.draw()};
RushGame.prototype.toggleSound=function(e){if(e)e.stopPropagation();this.soundOn=!this.soundOn;try{localStorage.setItem("rushRayonSound",this.soundOn?"1":"0")}catch(_){}this.updateSoundButton();if(!this.soundOn)this.audio.stopMusic();else if(this.mode==="running")this.audio.startMusic()};
RushGame.prototype.updateSoundButton=function(){this.soundBtn.textContent=(this.soundOn?"🔊":"🔇")+" Son"};
RushGame.prototype.openScores=function(e){if(e)e.stopPropagation();this.audio.menu();this.scoresPanel.hidden=false;this.loadScores()};
RushGame.prototype.closeScores=function(e){if(e)e.stopPropagation();this.scoresPanel.hidden=true};
RushGame.prototype.loadScores=async function(){if(!this.db){this.updateBest();return}try{var r=await this.db.from("rush_rayon_scores").select("user_id,best_score,best_distance,best_articles").order("best_score",{ascending:false}).limit(10);if(r.error)throw r.error;var rows=r.data||[],ids=rows.map(function(x){return x.user_id}),names={};if(ids.length){var pr=await this.db.from("profiles").select("id,display_name").in("id",ids);if(!pr.error)(pr.data||[]).forEach(function(x){names[x.id]=x.display_name||"Joueur"})}var mine=rows.find(function(x){return this.user&&x.user_id===this.user.id}.bind(this));if(mine&&mine.best_score>this.best.score){this.best={score:mine.best_score,distance:mine.best_distance,articles:mine.best_articles};saveBest(this.best)}this.updateBest();this.scoreList.innerHTML=rows.length?rows.map(function(x,i){return '<div class="rushScoreRow"><b>#'+(i+1)+'</b><span>'+String(names[x.user_id]||"Joueur").replace(/[<>]/g,"")+'</span><strong>'+Number(x.best_score).toLocaleString("fr-FR")+'</strong></div>'}).join(""):"<p>Aucun score enregistré.</p>"}catch(_){this.scoreList.innerHTML="<p>Scores indisponibles pour le moment.</p>"}};
RushGame.prototype.saveScore=async function(score){if(!this.db||!this.user)return;try{var r=await this.db.rpc("submit_rush_rayon_score",{p_score:score,p_distance:Math.floor(this.distance),p_articles:this.articles});if(!r.error)this.loadScores()}catch(_){}};

RushGame.prototype.onStart=function(){
 if(this.mode==="paused"){this.resume();return}
 this.start(false);
};
RushGame.prototype.start=function(jumpNow){
 cancelAnimationFrame(this.raf);
 this.resetState();
 this.mode="running";
 this.overlay.hidden=true;
 this.pauseBtn.disabled=false;
 this.pauseBtn.textContent="Ⅱ";
 this.pauseBtn.setAttribute("aria-label","Mettre en pause");
 this.last=performance.now();
 this.showToast("Ouverture · 06:00 — on prépare le magasin !");this.audio.startMusic();
 if(jumpNow)this.jump();
 this.raf=requestAnimationFrame(this.loop.bind(this));
};
RushGame.prototype.pause=function(){
 if(this.mode!=="running")return;this.player.holding=false;this.audio.stopMusic();
 this.mode="paused";
 cancelAnimationFrame(this.raf);
 this.pauseBtn.textContent="▶";
 this.pauseBtn.setAttribute("aria-label","Reprendre");
 this.showOverlay("PAUSE","Petite pause ?","Le rayon t’attend. Reprends quand tu veux.","Reprendre");
};
RushGame.prototype.resume=function(){
 if(this.mode!=="paused")return;
 this.mode="running";
 this.overlay.hidden=true;
 this.pauseBtn.textContent="Ⅱ";
 this.pauseBtn.setAttribute("aria-label","Mettre en pause");
 this.last=performance.now();this.audio.startMusic();
 this.raf=requestAnimationFrame(this.loop.bind(this));
};
RushGame.prototype.togglePause=function(e){
 if(e)e.stopPropagation();
 if(this.mode==="running")this.pause();
 else if(this.mode==="paused")this.resume();
};
RushGame.prototype.onVisibility=function(){
 if(document.hidden&&this.mode==="running")this.pause();
};
RushGame.prototype.onPointer=function(e){if(e.target.closest("button"))return;e.preventDefault();this.stage.focus({preventScroll:true});if(this.mode==="ready"||this.mode==="over"){this.start(true);return}if(this.mode==="paused"){this.resume();return}this.jump(true)};
RushGame.prototype.onPointerUp=function(e){if(e)e.preventDefault();this.releaseJump()};
RushGame.prototype.onKey=function(e){
 var jumpKey=e.code==="Space"||e.code==="ArrowUp";
 if(jumpKey){if(e.repeat)return;
  e.preventDefault();
  if(this.mode==="ready"||this.mode==="over"){this.start(true);return}
  if(this.mode==="paused"){this.resume();return}
  this.jump(true);
  return;
 }
 if((e.code==="KeyP"||e.code==="Escape")&&(this.mode==="running"||this.mode==="paused")){
  e.preventDefault();
  this.togglePause();
 }
};
RushGame.prototype.onKeyUp=function(e){if(e.code==="Space"||e.code==="ArrowUp")this.releaseJump()};
RushGame.prototype.jump=function(holding){if(this.mode!=="running"||!this.player.grounded)return;this.player.vy=-930;this.player.grounded=false;this.player.holding=!!holding;this.player.holdTime=0;this.audio.jump()};
RushGame.prototype.releaseJump=function(){var p=this.player;p.holding=false;if(!p.grounded&&p.vy<0)p.vy=Math.max(p.vy,-390)};

RushGame.prototype.loop=function(now){
 if(this.mode!=="running")return;
 var dt=Math.min((now-this.last)/1000,.034);
 this.last=now;
 this.update(dt);
 this.draw();
 if(this.mode==="running")this.raf=requestAnimationFrame(this.loop.bind(this));
};
RushGame.prototype.phase=function(){
 if(this.elapsed<24)return {key:"open",label:"Ouverture · 06:00",pace:"Tranquille",mult:1};
 if(this.elapsed<52)return {key:"day",label:"Matinée · 10:00",pace:"Ça s’active",mult:1.035};
 if(this.elapsed<86)return {key:"rush",label:"Rush · 12:00",pace:"Ça accélère",mult:1.09};
 return {key:"evening",label:"Rush du soir · 18:00",pace:"Plein régime",mult:1.14};
};
RushGame.prototype.update=function(dt){
 this.elapsed+=dt;
 var phase=this.phase();
 if(phase.key!==this.phaseKey){
  this.phaseKey=phase.key;
  if(this.elapsed>.5)this.showToast(phase.label+" — "+phase.pace+" !");
 }
 var base=Math.min(720,390+this.elapsed*5.7);
 var eventBoost=this.elapsed<this.eventBoostUntil?1.12:1;
 this.currentSpeed=base*phase.mult*eventBoost;
 this.distance+=this.currentSpeed*dt*.038;
 var p=this.player;if(p.holding&&!p.grounded&&p.vy<80&&p.holdTime<.19){p.vy-=1050*dt;p.holdTime+=dt}var gravity=p.holding&&p.vy<0?1850:2850;p.vy+=gravity*dt;p.y+=p.vy*dt;p.landSquash=Math.max(0,p.landSquash-dt*4);
 var floorY=GROUND-this.player.h;
 if(this.player.y>=floorY){
  this.player.y=floorY;
  if(!this.player.grounded&&this.player.vy>420){this.player.landSquash=.16;this.audio.land()}this.player.vy=0;this.player.grounded=true;this.player.holding=false;
 }
 this.spawnTimer-=dt;
 if(this.spawnTimer<=0)this.spawnWave();
 this.eventTimer-=dt;
 if(this.eventTimer<=0)this.triggerEvent();
 var dx=this.currentSpeed*dt;
 var i;
 for(i=this.obstacles.length-1;i>=0;i--){
  var o=this.obstacles[i];
  o.x-=dx;
  if(!o.passed&&o.x+o.w<this.player.x){
   o.passed=true;
   this.bonusScore+=18;
  }
  if(o.x+o.w<-80){this.obstacles.splice(i,1);continue}
  if(this.hitPlayer(o)){this.gameOver();return}
 }
 for(i=this.collectibles.length-1;i>=0;i--){
  var c=this.collectibles[i];
  c.x-=dx;
  c.spin+=dt*3;
  if(c.x+c.w<-70){this.collectibles.splice(i,1);continue}
  if(this.hitCollectible(c)){
   this.collectibles.splice(i,1);
   this.articles+=1;
   this.bonusScore+=120;
   this.audio.collect();this.showToast(c.kind==="coffee"?"Pause café récupérée ☕":c.kind==="promo"?"Promo attrapée · +120":"Article récupéré · +120");
  }
 }
 this.updateHud();
};
RushGame.prototype.spawnWave=function(){
 var types=["box","box","crate","cart","puddle","pallet","banana"];
 var type=types[Math.floor(Math.random()*types.length)];
 this.spawnObstacle(type,W+rnd(70,130));
 var pace=clamp(1.78-(this.currentSpeed-390)/620,1.0,1.78);
 this.spawnTimer=pace+rnd(.24,.68);
 if(Math.random()<.52){
  var obstacle=this.obstacles[this.obstacles.length-1];
  var kind=["coffee","promo","article"][Math.floor(Math.random()*3)];
  this.collectibles.push({kind:kind,x:obstacle.x+obstacle.w+rnd(115,230),y:GROUND-rnd(225,320),w:58,h:58,spin:0});
 }
};
RushGame.prototype.spawnObstacle=function(type,x){
 var d={
  box:{w:105,h:86},
  cart:{w:170,h:102},
  puddle:{w:150,h:24},
  pallet:{w:155,h:64},
  crate:{w:132,h:76},
  banana:{w:78,h:34}
 }[type];
 this.obstacles.push({type:type,x:x,y:GROUND-d.h,w:d.w,h:d.h,passed:false});
};
RushGame.prototype.triggerEvent=function(){
 var events=[
  {label:"Livraison en avance !",type:"pallet",boost:false},
  {label:"Arrivage Fruits & Légumes !",type:"crate",boost:false},
  {label:"Casse rayon 4 !",type:"puddle",boost:false},
  {label:"Inventaire surprise !",type:"box",boost:true},
  {label:"Cliente de 19h59 !",type:"cart",boost:true}
 ];
 var ev=events[Math.floor(Math.random()*events.length)];
 this.showToast(ev.label);
 this.spawnObstacle(ev.type,W+120);
 if(ev.boost)this.eventBoostUntil=this.elapsed+4.5;
 this.eventTimer=rnd(23,36);
};
RushGame.prototype.hitPlayer=function(o){
 var p={x:this.player.x+11,y:this.player.y+12,w:this.player.w-22,h:this.player.h-16};
 var h={x:o.x+5,y:o.y+3,w:o.w-10,h:o.h-3};
 return p.x<h.x+h.w&&p.x+p.w>h.x&&p.y<h.y+h.h&&p.y+p.h>h.y;
};
RushGame.prototype.hitCollectible=function(c){
 var p={x:this.player.x+5,y:this.player.y+5,w:this.player.w-10,h:this.player.h-10};
 return p.x<c.x+c.w&&p.x+p.w>c.x&&p.y<c.y+c.h&&p.y+p.h>c.y;
};
RushGame.prototype.score=function(){
 return Math.floor(this.distance*2)+this.articles*120+this.bonusScore;
};
RushGame.prototype.gameOver=function(){
 if(this.mode!=="running")return;
 this.mode="over";cancelAnimationFrame(this.raf);this.player.holding=false;this.audio.gameOver();
 this.pauseBtn.disabled=true;
 var score=this.score();
 var isBest=score>this.best.score;
 if(isBest){
  this.best={score:score,distance:Math.floor(this.distance),articles:this.articles};
  saveBest(this.best);
  this.updateBest();
 }
 this.updateHud();this.saveScore(score);
 this.showOverlay(isBest?"NOUVEAU RECORD":"FIN DU RUSH",isBest?"Nouveau record !":"Oups, obstacle !","Score : "+score+" · "+Math.floor(this.distance)+" m · "+this.articles+" article"+(this.articles>1?"s":""),"Rejouer");
};
RushGame.prototype.showOverlay=function(badge,title,text,button){
 this.overlayBadge.textContent=badge;
 this.overlayTitle.textContent=title;
 this.overlayText.textContent=text;
 this.startBtn.textContent=button;
 this.overlay.hidden=false;
};
RushGame.prototype.showToast=function(text){
 clearTimeout(this.toastTimer);
 this.toast.textContent=text;
 this.toast.classList.add("show");
 var self=this;
 this.toastTimer=setTimeout(function(){self.toast.classList.remove("show")},1800);
};
RushGame.prototype.updateBest=function(){
 this.bestEl.textContent=this.best.score.toLocaleString("fr-FR")+" pts";
};
RushGame.prototype.updateHud=function(){
 var phase=this.phase();
 this.scoreEl.textContent=this.score().toLocaleString("fr-FR");
 this.itemsEl.textContent=String(this.articles);
 this.distanceEl.textContent=Math.floor(this.distance).toLocaleString("fr-FR")+" m";
 this.phaseEl.textContent=phase.label;
 var scene=this.scene();
 this.speedEl.textContent=phase.pace+" · "+scene.label;
};
RushGame.prototype.draw=function(){
 var ctx=this.ctx;
 ctx.clearRect(0,0,W,H);
 this.drawBackground(ctx);
 for(var i=0;i<this.collectibles.length;i++)this.drawCollectible(ctx,this.collectibles[i]);
 for(i=0;i<this.obstacles.length;i++)this.drawObstacle(ctx,this.obstacles[i]);
 this.drawRunner(ctx);
};

RushGame.prototype.scene=function(){
 var scenes=[
  {key:"produce",label:"Fruits & Légumes"},
  {key:"spices",label:"Épices"},
  {key:"frozen",label:"Surgelés"},
  {key:"wine",label:"Vins"}
 ];
 var duration=18;
 var pos=Math.max(0,this.elapsed)/duration;
 var index=Math.floor(pos)%scenes.length;
 var local=pos-Math.floor(pos);
 var blend=local>.82?(local-.82)/.18:0;
 return {index:index,next:(index+1)%scenes.length,blend:clamp(blend,0,1),key:scenes[index].key,label:scenes[index].label};
};
RushGame.prototype.drawStoreShell=function(ctx,dark){
 var t=this.distance;
 var sky=ctx.createLinearGradient(0,0,0,GROUND);sky.addColorStop(0,"#8bdcf0");sky.addColorStop(.34,"#dff4ee");sky.addColorStop(.35,"#f4d76e");sky.addColorStop(.44,"#ef8350");sky.addColorStop(.45,dark?"#29363a":"#f2eee2");sky.addColorStop(1,dark?"#263237":"#ddd7c8");ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
 ctx.fillStyle="#ffffffb8";for(var cloud=-180-((t*.22)%390);cloud<W+200;cloud+=390){ctx.beginPath();ctx.arc(cloud+55,105,31,0,Math.PI*2);ctx.arc(cloud+90,92,42,0,Math.PI*2);ctx.arc(cloud+133,108,30,0,Math.PI*2);ctx.fill()}
 var far=-((t*.7)%250)-250;for(var x=far;x<W+250;x+=250){ctx.fillStyle="#49646b";rounded(ctx,x,205,210,385,14);ctx.fill();ctx.fillStyle="#33494f";rounded(ctx,x+17,228,176,340,9);ctx.fill();ctx.fillStyle="#ffd43e";ctx.fillRect(x+27,248,156,15);for(var sy=300;sy<535;sy+=72){ctx.fillStyle="#d8e8e6";ctx.fillRect(x+28,sy,154,7);for(var px=37;px<174;px+=35){ctx.fillStyle=["#ef6744","#76b35c","#f0c84a","#71a7d5"][(px+sy)%4];rounded(ctx,x+px,sy-43,25,35,5);ctx.fill()}}}
 ctx.fillStyle=dark?"#314146":"#ebe4d3";ctx.beginPath();ctx.moveTo(0,700);ctx.lineTo(W,650);ctx.lineTo(W,GROUND+8);ctx.lineTo(0,GROUND+8);ctx.closePath();ctx.fill();
 ctx.strokeStyle=dark?"#52636a":"#c9bfa8";ctx.lineWidth=4;var floor=-((t*3.8)%145);for(var fx=floor-145;fx<W+145;fx+=145){ctx.beginPath();ctx.moveTo(fx,680);ctx.lineTo(fx+78,GROUND);ctx.stroke()}for(var fy=760;fy<GROUND;fy+=70){ctx.beginPath();ctx.moveTo(0,fy);ctx.lineTo(W,fy-30);ctx.stroke()}
 ctx.fillStyle="#24343a";ctx.fillRect(0,GROUND,W,10);ctx.fillStyle="#f4c63d";ctx.fillRect(0,GROUND+10,W,7);
};
RushGame.prototype.drawPriceRail=function(ctx,y,dark){
 ctx.fillStyle=dark?"#4f4960":"#514766";
 ctx.fillRect(0,y,W,13);
 var off=-((this.distance*4.7)%112)-112;
 for(var x=off;x<W+112;x+=112){
  ctx.fillStyle=dark?"#d8dbe0":"#f5f5f4";rounded(ctx,x+13,y-2,60,19,3);ctx.fill();
  ctx.fillStyle=dark?"#23272d":"#30343a";ctx.font="700 9px system-ui,sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.fillText((1+Math.abs(Math.floor(x/112))%5)+",99",x+43,y+8);
  ctx.fillStyle="#ffb12e";ctx.fillRect(x+77,y+1,20,8);
 }
};
RushGame.prototype.drawProduceScene=function(ctx,dark){
 ctx.fillStyle="#ee6840";ctx.fillRect(0,178,W,92);
 ctx.fillStyle="#4f9f62";ctx.fillRect(0,178,W,56);
 ctx.fillStyle="#ffffff";ctx.font="900 30px system-ui,sans-serif";ctx.textAlign="left";ctx.textBaseline="middle";ctx.fillText("LES FRUITS & LÉGUMES",38,206);
 ctx.fillStyle=dark?"#251f1b":"#4f4034";ctx.fillRect(0,266,W,53);
 var off=-((this.distance*3.1)%225)-225;
 for(var x=off;x<W+230;x+=225){
  ctx.fillStyle="#7b5a3f";ctx.fillRect(x,334,210,350);
  ctx.fillStyle="#9a7554";ctx.fillRect(x+8,342,194,16);
  ctx.fillStyle="#6d513b";ctx.fillRect(x+10,602,190,82);
  var sections=[
   {y:365,c:"#ef6a2e",leaf:"#5d7a31",kind:0},
   {y:438,c:"#4e9c4c",leaf:"#245d37",kind:1},
   {y:511,c:"#d33e35",leaf:"#3e7b42",kind:2}
  ];
  sections.forEach(function(s,ri){
   ctx.fillStyle="#c8a77e";ctx.beginPath();ctx.moveTo(x+14,s.y+68);ctx.lineTo(x+194,s.y+68);ctx.lineTo(x+181,s.y);ctx.lineTo(x+27,s.y);ctx.closePath();ctx.fill();
   for(var i=0;i<7;i++){
    var px=x+38+i*22+(ri%2)*7,py=s.y+25+(i%2)*18;
    ctx.fillStyle=s.c;ctx.beginPath();ctx.arc(px,py,15+(i%3)*2,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=s.leaf;
    if(s.kind===1){ctx.beginPath();ctx.ellipse(px,py-8,10,17,(i%2?-.5:.5),0,Math.PI*2);ctx.fill()}
    else{ctx.fillRect(px-2,py-20,4,8)}
   }
  });
  ctx.fillStyle="#d1b28b";ctx.fillRect(x+14,611,182,10);
  ctx.fillStyle="#eef1e7";for(var j=0;j<6;j++){ctx.beginPath();ctx.ellipse(x+35+j*29,648,14,8,-.15,0,Math.PI*2);ctx.fill()}
 }
 this.drawPriceRail(ctx,319,dark);
 this.drawPriceRail(ctx,696,dark);
 ctx.fillStyle=dark?"#20252b":"#dbd8d2";ctx.fillRect(0,710,W,108);
};
RushGame.prototype.drawSpiceScene=function(ctx,dark){
 ctx.fillStyle=dark?"#24272c":"#eeeeeb";ctx.fillRect(0,178,W,640);
 var rows=[270,390,510,630,750];
 for(var r=0;r<rows.length;r++){
  var sy=rows[r];
  ctx.fillStyle=dark?"#464b52":"#bfc3c6";ctx.fillRect(0,sy,W,9);
  var off=-((this.distance*(3.5+r*.15))%58)-58;
  for(var x=off;x<W+58;x+=58){
   var idx=Math.abs(Math.floor(x/58)+r*2)%5;
   var cap=["#219267","#d29a32","#bb3d36","#168a75","#6c5aa6"][idx];
   ctx.fillStyle="#e8e1d4";rounded(ctx,x+11,sy-74,34,67,6);ctx.fill();
   ctx.fillStyle=cap;rounded(ctx,x+9,sy-80,38,13,5);ctx.fill();
   ctx.fillStyle="#f7f6f1";ctx.fillRect(x+16,sy-54,24,26);
   ctx.fillStyle="#8b8277";ctx.fillRect(x+19,sy-48,18,3);
   ctx.fillStyle=cap;ctx.fillRect(x+19,sy-40,18,4);
  }
  this.drawPriceRail(ctx,sy+9,dark);
 }
 ctx.fillStyle=dark?"#272b31":"#d9d8d3";ctx.fillRect(0,788,W,30);
 ctx.fillStyle=dark?"#37323d":"#554a61";rounded(ctx,32,194,250,54,8);ctx.fill();
 ctx.fillStyle="#fff";ctx.font="900 25px system-ui,sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("ÉPICES & CONDIMENTS",157,221);
};
RushGame.prototype.drawFrozenScene=function(ctx,dark){
 ctx.fillStyle="#4b9bc4";ctx.fillRect(0,178,W,78);
 ctx.fillStyle="#ffffff";ctx.font="900 34px system-ui,sans-serif";ctx.textAlign="left";ctx.textBaseline="middle";ctx.fillText("LES SURGELÉS",38,216);
 ctx.fillStyle=dark?"#1d242a":"#c9d2d7";ctx.fillRect(0,256,W,562);
 var off=-((this.distance*2.5)%182)-182;
 for(var x=off;x<W+182;x+=182){
  ctx.fillStyle=dark?"#26323b":"#e2e8eb";rounded(ctx,x+4,270,170,522,4);ctx.fill();
  var grd=ctx.createLinearGradient(x,270,x+170,792);
  grd.addColorStop(0,dark?"#374855":"#cfe0e8");
  grd.addColorStop(.55,dark?"#23313a":"#aebfc8");
  grd.addColorStop(1,dark?"#1d272e":"#d9e1e5");
  ctx.fillStyle=grd;rounded(ctx,x+15,282,148,494,3);ctx.fill();
  ctx.globalAlpha=.75;
  for(var row=0;row<5;row++){
   for(var col=0;col<3;col++){
    var hue=(row*3+col+Math.abs(Math.floor(x/182)))%5;
    ctx.fillStyle=["#df554b","#7b62b7","#e6b64c","#58a4c8","#6d9b55"][hue];
    rounded(ctx,x+28+col*42,330+row*78,31,46,4);ctx.fill();
   }
   ctx.fillStyle="#dae0e3";ctx.fillRect(x+20,388+row*78,136,4);
  }
  ctx.globalAlpha=1;
  ctx.strokeStyle=dark?"#8695a0":"#808d94";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x+154,445);ctx.lineTo(x+154,598);ctx.stroke();
  ctx.fillStyle="#ffffff45";ctx.beginPath();ctx.moveTo(x+24,300);ctx.lineTo(x+74,300);ctx.lineTo(x+142,760);ctx.lineTo(x+112,760);ctx.closePath();ctx.fill();
 }
 ctx.fillStyle=dark?"#20252b":"#d8d9d7";ctx.fillRect(0,792,W,26);
};
RushGame.prototype.drawWineScene=function(ctx,dark){
 ctx.fillStyle=dark?"#242226":"#e8e4dc";ctx.fillRect(0,178,W,640);
 ctx.fillStyle="#813b4c";rounded(ctx,30,190,210,54,14);ctx.fill();
 ctx.fillStyle="#ffffff";ctx.font="900 27px system-ui,sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("LES VINS",135,217);
 var shelves=[324,455,586,717];
 for(var r=0;r<shelves.length;r++){
  var y=shelves[r];
  ctx.fillStyle=dark?"#555058":"#a9a6a2";ctx.fillRect(0,y,W,9);
  var off=-((this.distance*(3+r*.1))%48)-48;
  for(var x=off;x<W+50;x+=48){
   var style=(Math.abs(Math.floor(x/48))+r)%4;
   ctx.fillStyle=style===0?"#3b171d":style===1?"#26402f":style===2?"#432125":"#2c2c32";
   rounded(ctx,x+13,y-92,23,85,8);ctx.fill();
   ctx.fillStyle=style===1?"#d3b25b":"#752e31";ctx.fillRect(x+18,y-103,13,17);
   ctx.fillStyle="#f2ede1";ctx.fillRect(x+15,y-54,19,26);
   ctx.fillStyle="#8a7761";ctx.fillRect(x+18,y-48,13,3);
  }
  this.drawPriceRail(ctx,y+9,dark);
 }
 var bx=690-((this.distance*.7)%120);
 ctx.fillStyle="#3d3138";ctx.beginPath();ctx.moveTo(bx+55,210);ctx.lineTo(bx+85,210);ctx.lineTo(bx+91,265);ctx.bezierCurveTo(bx+148,315,bx+150,490,bx+142,756);ctx.lineTo(bx-2,756);ctx.bezierCurveTo(bx-10,490,bx-8,315,bx+49,265);ctx.closePath();ctx.fill();
 ctx.fillStyle="#c14243";ctx.fillRect(bx-2,500,144,147);
 ctx.fillStyle="#fff";ctx.font="900 23px system-ui";ctx.textAlign="center";ctx.fillText("FOIRE",bx+70,548);ctx.font="800 17px system-ui";ctx.fillText("AUX VINS",bx+70,574);
 ctx.fillStyle=dark?"#211f22":"#d5d1ca";ctx.fillRect(0,786,W,32);
};
RushGame.prototype.drawBackground=function(ctx){
 var dark=document.documentElement.dataset.theme==="dark";
 this.drawStoreShell(ctx,dark);
 var scene=this.scene();
 var methods=["drawProduceScene","drawSpiceScene","drawFrozenScene","drawWineScene"];
 this[methods[scene.index]](ctx,dark);
 if(scene.blend>0){
  ctx.save();
  ctx.globalAlpha=scene.blend*scene.blend*(3-2*scene.blend);
  this[methods[scene.next]](ctx,dark);
  ctx.restore();
 }
};
RushGame.prototype.runnerLimb=function(ctx,a,b,c,width,color){
 ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap="round";ctx.lineJoin="round";
 ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.stroke();
 ctx.fillStyle=color;
 ctx.beginPath();ctx.arc(b.x,b.y,width*.37,0,Math.PI*2);ctx.fill();
};
RushGame.prototype.drawRunner=function(ctx){
 var p=this.player,running=this.mode==="running"&&p.grounded,air=!p.grounded,phase=running?this.elapsed*17:0,s=Math.sin(phase),bob=running?Math.abs(Math.cos(phase))*4:0,squash=p.landSquash>0?Math.sin((p.landSquash/.16)*Math.PI)*.11:0;
 var x=p.x+p.w*.5,y=p.y+2+bob,lean=air?-.06:.13;
 ctx.save();ctx.translate(x,y);ctx.rotate(lean);ctx.scale(1+squash,1-squash);
 ctx.fillStyle="#13242a28";ctx.save();ctx.rotate(-lean);ctx.beginPath();ctx.ellipse(0,GROUND-y+3,53,12,0,0,Math.PI*2);ctx.fill();ctx.restore();
 function limb(ax,ay,bx,by,cx,cy,w,col){ctx.strokeStyle="#16262b";ctx.lineWidth=w+7;ctx.lineCap="round";ctx.lineJoin="round";ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.lineTo(cx,cy);ctx.stroke();ctx.strokeStyle=col;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.lineTo(cx,cy);ctx.stroke()}
 var l1=air?.65:s,l2=air?-.5:-s;
 limb(-8,78,l1*24,104,l1*42-10,132,17,"#263b4b");limb(7,78,l2*24+7,104,l2*43+14,132,18,"#304b60");
 ctx.fillStyle="#f6f0e5";rounded(ctx,l1*42-25,126,40,14,7);ctx.fill();ctx.fillStyle="#ee633d";ctx.fillRect(l1*42-20,135,34,5);ctx.fillStyle="#f6f0e5";rounded(ctx,l2*43-7,126,40,14,7);ctx.fill();
 var a1=air?-.8:-s*.9,a2=air?.7:s*.9;limb(-16,40,a1*25-13,60,a1*39-13,78,12,"#e9a47c");limb(17,41,a2*25+13,59,a2*39+13,75,13,"#f1b28a");
 ctx.fillStyle="#f05d37";ctx.strokeStyle="#16262b";ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(-25,32);ctx.quadraticCurveTo(-32,58,-18,86);ctx.quadraticCurveTo(0,95,22,84);ctx.quadraticCurveTo(31,56,22,31);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.fillStyle="#ffd43f";rounded(ctx,-16,49,12,30,4);ctx.fill();ctx.fillStyle="#fff";rounded(ctx,2,48,16,13,3);ctx.fill();ctx.fillStyle="#ef5c37";ctx.font="950 10px system-ui";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("N",10,55);
 var hair=running?s*5:air?-9:0;ctx.fillStyle="#f0ad83";ctx.strokeStyle="#16262b";ctx.lineWidth=7;ctx.beginPath();ctx.arc(4,10,27,0,Math.PI*2);ctx.fill();ctx.stroke();
 ctx.fillStyle="#51352b";ctx.strokeStyle="#16262b";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-23,6);ctx.bezierCurveTo(-22,-19,-5,-24,14,-17);ctx.bezierCurveTo(27,-12,31,-2,27,5);ctx.bezierCurveTo(16,-2,8,-1,0,4);ctx.bezierCurveTo(-9,-3,-17,0,-23,6);ctx.fill();ctx.stroke();
 for(var h=0;h<4;h++){ctx.strokeStyle="#6a4637";ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(-17+h*9,-5);ctx.quadraticCurveTo(-12+h*9,-20-(h%2)*5,-4+h*9,-6);ctx.stroke()}
 ctx.fillStyle="#fff";ctx.strokeStyle="#16262b";ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(14,10,8,6,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle="#2b4b55";ctx.beginPath();ctx.arc(17,10,3,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle="#704238";ctx.lineWidth=3;ctx.beginPath();ctx.arc(13,22,8,.05,1.25);ctx.stroke();
 if(running){ctx.strokeStyle="#fff9";ctx.lineWidth=5;for(var z=0;z<3;z++){ctx.beginPath();ctx.moveTo(-62-z*9,52+z*13);ctx.lineTo(-86-z*12,52+z*13);ctx.stroke()}}
 ctx.restore();
};
RushGame.prototype.drawObstacle=function(ctx,o){
 ctx.save();
 if(o.type==="box"){
  ctx.fillStyle="#c78a49";rounded(ctx,o.x,o.y,o.w,o.h,7);ctx.fill();
  ctx.fillStyle="#e4b26f";ctx.fillRect(o.x+o.w*.45,o.y,o.w*.12,o.h);
  ctx.strokeStyle="#986230";ctx.lineWidth=3;ctx.strokeRect(o.x+5,o.y+5,o.w-10,o.h-10);
  ctx.fillStyle="#fff8";ctx.fillRect(o.x+12,o.y+48,35,16);
 }else if(o.type==="cart"){
  ctx.strokeStyle="#59616c";ctx.lineWidth=8;ctx.lineJoin="round";
  ctx.beginPath();ctx.moveTo(o.x+18,o.y+17);ctx.lineTo(o.x+42,o.y+72);ctx.lineTo(o.x+141,o.y+72);ctx.lineTo(o.x+158,o.y+22);ctx.stroke();
  ctx.strokeStyle="#ff5b42";ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(o.x+4,o.y+12);ctx.lineTo(o.x+53,o.y+12);ctx.stroke();
  ctx.strokeStyle="#8a929d";ctx.lineWidth=3;
  for(var cx=o.x+52;cx<o.x+145;cx+=22){ctx.beginPath();ctx.moveTo(cx,o.y+27);ctx.lineTo(cx-9,o.y+68);ctx.stroke()}
  ctx.fillStyle="#343a42";ctx.beginPath();ctx.arc(o.x+58,o.y+94,11,0,Math.PI*2);ctx.arc(o.x+135,o.y+94,11,0,Math.PI*2);ctx.fill();
 }else if(o.type==="puddle"){
  ctx.fillStyle="#4da9e9aa";ctx.beginPath();ctx.ellipse(o.x+o.w/2,o.y+o.h/2,o.w/2,o.h/2,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#a9dcff";ctx.beginPath();ctx.ellipse(o.x+48,o.y+8,28,5,0,0,Math.PI*2);ctx.fill();
 }else if(o.type==="pallet"){
  ctx.fillStyle="#356fb0";rounded(ctx,o.x,o.y+o.h-19,o.w,19,4);ctx.fill();
  ctx.fillStyle="#ad7a45";
  for(var py=0;py<3;py++){rounded(ctx,o.x+5+py*50,o.y,44,o.h-24,3);ctx.fill()}
  ctx.fillStyle="#c9985e";ctx.fillRect(o.x,o.y+13,o.w,9);
 }else if(o.type==="crate"){
  ctx.fillStyle="#b68a5f";rounded(ctx,o.x,o.y,o.w,o.h,5);ctx.fill();
  ctx.strokeStyle="#7d5e41";ctx.lineWidth=5;ctx.strokeRect(o.x+5,o.y+7,o.w-10,o.h-12);
  ctx.fillStyle="#d5b48c";ctx.fillRect(o.x+9,o.y+23,o.w-18,8);ctx.fillRect(o.x+9,o.y+50,o.w-18,8);
  for(var pi=0;pi<6;pi++){var pc=pi%2?"#65a24d":"#ef7140";ctx.fillStyle=pc;ctx.beginPath();ctx.arc(o.x+22+pi*18,o.y+20+(pi%2)*14,12,0,Math.PI*2);ctx.fill()}
 }else if(o.type==="banana"){
  ctx.strokeStyle="#f4c52f";ctx.lineWidth=14;ctx.lineCap="round";
  ctx.beginPath();ctx.bezierCurveTo(o.x+6,o.y+5,o.x+22,o.y+35,o.x+50,o.y+21,o.x+70,o.y+7);ctx.stroke();
  ctx.strokeStyle="#8d6b1d";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(o.x+67,o.y+8);ctx.lineTo(o.x+73,o.y+3);ctx.stroke();
 }
 ctx.restore();
};
RushGame.prototype.drawCollectible=function(ctx,c){
 ctx.save();
 var cx=c.x+c.w/2,cy=c.y+c.h/2;
 ctx.shadowColor="#ffb11b";ctx.shadowBlur=28;ctx.fillStyle="#fff8dc";
 ctx.beginPath();ctx.arc(cx,cy,31,0,Math.PI*2);ctx.fill();
 ctx.shadowBlur=0;
 if(c.kind==="coffee"){
  ctx.fillStyle="#6b442d";rounded(ctx,c.x+16,c.y+19,27,28,5);ctx.fill();
  ctx.fillStyle="#f2eee8";ctx.fillRect(c.x+13,c.y+15,34,7);
  ctx.strokeStyle="#6b442d";ctx.lineWidth=4;ctx.beginPath();ctx.arc(c.x+44,c.y+31,8,-1.2,1.2);ctx.stroke();
  ctx.strokeStyle="#9b7b67";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(c.x+23,c.y+12);ctx.bezierCurveTo(c.x+18,c.y+5,c.x+31,c.y+3,c.x+27,c.y-3);ctx.stroke();
 }else if(c.kind==="promo"){
  ctx.fillStyle="#ef473d";ctx.beginPath();ctx.moveTo(c.x+12,c.y+11);ctx.lineTo(c.x+46,c.y+11);ctx.lineTo(c.x+51,c.y+31);ctx.lineTo(c.x+29,c.y+50);ctx.lineTo(c.x+7,c.y+30);ctx.closePath();ctx.fill();
  ctx.fillStyle="#fff";ctx.font="900 25px system-ui";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("%",c.x+29,c.y+29);
 }else{
  ctx.fillStyle="#e8f1ff";rounded(ctx,c.x+15,c.y+11,29,38,4);ctx.fill();
  ctx.fillStyle="#3d79c8";ctx.fillRect(c.x+15,c.y+18,29,20);
  ctx.fillStyle="#ffffff";ctx.font="900 13px system-ui";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("N",c.x+30,c.y+28);
 }
 ctx.restore();
};
function RushAudio(game){this.game=game;this.ctx=null;this.musicTimer=0;this.step=0}
RushAudio.prototype.context=function(){if(!this.game.soundOn)return null;try{var A=window.AudioContext||window.webkitAudioContext;if(!A)return null;this.ctx=this.ctx||new A();if(this.ctx.state==="suspended")this.ctx.resume().catch(function(){});return this.ctx}catch(_){return null}};
RushAudio.prototype.tone=function(f,d,t,v,delay,end){var a=this.context();if(!a)return;var at=a.currentTime+(delay||0),o=a.createOscillator(),g=a.createGain();o.type=t||"sine";o.frequency.setValueAtTime(f,at);if(end)o.frequency.exponentialRampToValueAtTime(Math.max(30,end),at+d);g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(Math.max(.001,(v||.05)*.55),at+.012);g.gain.exponentialRampToValueAtTime(.0001,at+d);o.connect(g);g.connect(a.destination);o.start(at);o.stop(at+d+.02)};
RushAudio.prototype.menu=function(){this.tone(330,.09,"sine",.05,0,430);this.tone(520,.12,"sine",.045,.05,650)};
RushAudio.prototype.jump=function(){this.tone(210,.13,"triangle",.07,0,470);this.tone(430,.09,"sine",.035,.055,620)};
RushAudio.prototype.land=function(){this.tone(115,.07,"square",.025,0,75)};
RushAudio.prototype.collect=function(){this.tone(660,.08,"sine",.06);this.tone(880,.12,"sine",.05,.055);this.tone(1175,.13,"sine",.04,.11)};
RushAudio.prototype.gameOver=function(){this.stopMusic();this.tone(330,.17,"sawtooth",.055,0,250);this.tone(220,.24,"triangle",.06,.15,125);this.tone(110,.36,"sine",.06,.32,70)};
RushAudio.prototype.startMusic=function(){var self=this;if(!this.game.soundOn||this.musicTimer)return;this.step=0;function tick(){if(!self.musicTimer||self.game.mode!=="running")return;var speed=clamp(self.game.currentSpeed||390,390,820),bpm=102+(speed-390)*.12,beat=60000/bpm,notes=[220,277.18,329.63,277.18,246.94,329.63,369.99,329.63],n=notes[self.step%notes.length];self.tone(n,.075,"triangle",.022);if(self.step%4===0)self.tone(n/2,.11,"sine",.028);if(self.step%2===0)self.tone(90,.035,"square",.012);self.step++;self.musicTimer=setTimeout(tick,beat/2)}this.musicTimer=setTimeout(tick,40)};
RushAudio.prototype.stopMusic=function(){if(this.musicTimer){clearTimeout(this.musicTimer);this.musicTimer=0}};
RushAudio.prototype.destroy=function(){this.stopMusic();try{this.ctx&&this.ctx.close()}catch(_){}this.ctx=null};
function mount(id){
 unmount();
 var root=document.getElementById(id||"content");
 if(!root)return;
 root.innerHTML=shell();
 current=new RushGame(root);
}
function unmount(){
 if(current){current.destroy();current=null}
}
window.RushRayon={mount:mount,unmount:unmount};
})();
