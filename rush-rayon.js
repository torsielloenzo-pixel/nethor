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
 this.menu=q(root,"[data-rush-menu]");this.menuPlay=q(root,"[data-rush-menu-play]");this.menuScore=q(root,"[data-rush-menu-score]");this.menuBack=q(root,"[data-rush-menu-back]");this.soundBtn=q(root,"[data-rush-sound]");this.scoresPanel=q(root,"[data-rush-scores]");this.scoreList=q(root,"[data-rush-score-list]");this.scoreClose=q(root,"[data-rush-score-close]");
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
 this.boundRestart=this.restart.bind(this);this.boundPointerUp=this.onPointerUp.bind(this);this.boundKeyUp=this.onKeyUp.bind(this);this.boundMenuPlay=this.playFromMenu.bind(this);this.boundMenuScore=this.openScores.bind(this);this.boundMenuBack=this.backToMenu.bind(this);this.boundSound=this.toggleSound.bind(this);this.boundScoreClose=this.closeScores.bind(this);
 this.stage.addEventListener("pointerdown",this.boundPointer,{passive:false});this.stage.addEventListener("pointerup",this.boundPointerUp,{passive:false});this.stage.addEventListener("pointercancel",this.boundPointerUp,{passive:false});this.menuPlay.addEventListener("click",this.boundMenuPlay);this.menuScore.addEventListener("click",this.boundMenuScore);this.menuBack.addEventListener("click",this.boundMenuBack);this.soundBtn.addEventListener("click",this.boundSound);this.scoreClose.addEventListener("click",this.boundScoreClose);
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
 this.stage.removeEventListener("pointerdown",this.boundPointer);this.stage.removeEventListener("pointerup",this.boundPointerUp);this.stage.removeEventListener("pointercancel",this.boundPointerUp);this.menuPlay.removeEventListener("click",this.boundMenuPlay);this.menuScore.removeEventListener("click",this.boundMenuScore);this.menuBack.removeEventListener("click",this.boundMenuBack);this.soundBtn.removeEventListener("click",this.boundSound);this.scoreClose.removeEventListener("click",this.boundScoreClose);this.audio.destroy();
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
RushGame.prototype.onPointer=function(e){
 if(e.target.closest("button"))return;
 e.preventDefault();
 this.stage.focus({preventScroll:true});
 if(this.mode==="ready"||this.mode==="over"){this.start(true);return}
 if(this.mode==="paused"){this.resume();return}
 this.jump();
};
RushGame.prototype.onKey=function(e){
 var jumpKey=e.code==="Space"||e.code==="ArrowUp";
 if(jumpKey){
  e.preventDefault();
  if(this.mode==="ready"||this.mode==="over"){this.start(true);return}
  if(this.mode==="paused"){this.resume();return}
  this.jump();
  return;
 }
 if((e.code==="KeyP"||e.code==="Escape")&&(this.mode==="running"||this.mode==="paused")){
  e.preventDefault();
  this.togglePause();
 }
};
RushGame.prototype.jump=function(){
 if(this.mode!=="running"||!this.player.grounded)return;
 this.player.vy=-1000;
 this.player.grounded=false;
};
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
 this.player.vy+=2550*dt;
 this.player.y+=this.player.vy*dt;
 var floorY=GROUND-this.player.h;
 if(this.player.y>=floorY){
  this.player.y=floorY;
  this.player.vy=0;
  this.player.grounded=true;
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
   this.showToast(c.kind==="coffee"?"Pause café récupérée ☕":c.kind==="promo"?"Promo attrapée · +120":"Article récupéré · +120");
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
 this.mode="over";
 cancelAnimationFrame(this.raf);
 this.pauseBtn.disabled=true;
 var score=this.score();
 var isBest=score>this.best.score;
 if(isBest){
  this.best={score:score,distance:Math.floor(this.distance),articles:this.articles};
  saveBest(this.best);
  this.updateBest();
 }
 this.updateHud();
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
 var duration=22;
 var pos=Math.max(0,this.elapsed)/duration;
 var index=Math.floor(pos)%scenes.length;
 var local=pos-Math.floor(pos);
 var blend=local>.82?(local-.82)/.18:0;
 return {index:index,next:(index+1)%scenes.length,blend:clamp(blend,0,1),key:scenes[index].key,label:scenes[index].label};
};
RushGame.prototype.drawStoreShell=function(ctx,dark){
 ctx.fillStyle=dark?"#20242a":"#e7e5df";
 ctx.fillRect(0,0,W,178);
 ctx.strokeStyle=dark?"#363b43":"#c9c8c3";
 ctx.lineWidth=2;
 for(var gx=0;gx<=W;gx+=110){ctx.beginPath();ctx.moveTo(gx,0);ctx.lineTo(gx+34,178);ctx.stroke()}
 for(var gy=0;gy<178;gy+=55){ctx.beginPath();ctx.moveTo(0,gy);ctx.lineTo(W,gy);ctx.stroke()}
 ctx.fillStyle=dark?"#f0f3f5":"#ffffff";
 for(var lx=-80-((this.distance*1.8)%260);lx<W+180;lx+=280){
  ctx.save();ctx.translate(lx,42);ctx.rotate(.08);rounded(ctx,0,0,190,20,7);ctx.fill();ctx.restore();
 }
 ctx.fillStyle=dark?"#262b31":"#d9d5cd";
 ctx.fillRect(0,178,W,640);
 ctx.fillStyle=dark?"#262a2f":"#e8e5df";
 ctx.fillRect(0,818,W,H-818);
 ctx.strokeStyle=dark?"#444a52":"#c8c4bc";
 ctx.lineWidth=2;
 for(var fy=842;fy<H;fy+=74){ctx.beginPath();ctx.moveTo(0,fy);ctx.lineTo(W,fy);ctx.stroke()}
 for(var fx=-140;fx<W+180;fx+=145){ctx.beginPath();ctx.moveTo(fx,818);ctx.lineTo(fx+82,H);ctx.stroke()}
 ctx.fillStyle=dark?"#171a1e":"#9ea1a4";
 ctx.fillRect(0,GROUND,W,8);
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
 ctx.fillStyle=dark?"#252c31":"#343a3d";ctx.fillRect(0,178,W,92);
 ctx.fillStyle="#9fc4ca";ctx.fillRect(0,178,W,56);
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
 ctx.fillStyle="#8fb5bf";ctx.fillRect(0,178,W,78);
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
 ctx.fillStyle=dark?"#3c2a26":"#6b4a3f";rounded(ctx,30,190,210,54,8);ctx.fill();
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
 var p=this.player;
 var running=this.mode==="running"&&p.grounded;
 var airborne=!p.grounded;
 var phase=running?this.elapsed*16.5:0;
 var stride=running?Math.sin(phase):0;
 var bob=running?Math.abs(Math.cos(phase))*2.5:0;
 var lean=airborne?-.04:.10;
 var baseX=p.x+p.w*.5,baseY=p.y+4+bob;
 var self=this;
 function legPoints(offset){
  var ph=phase+offset,s=Math.sin(ph),c=Math.cos(ph);
  if(airborne){s=offset?-.38:.55;c=-.25}
  var hip={x:0,y:68};
  var knee={x:hip.x+s*24+c*5,y:hip.y+29-Math.max(0,c)*7};
  var lift=running?Math.max(0,-c)*15:airborne?14:0;
  var foot={x:hip.x+s*39-c*12,y:hip.y+60-lift};
  return {hip:hip,knee:knee,foot:foot};
 }
 function armPoints(offset){
  var ph=phase+offset,s=running?Math.sin(ph):0;
  if(airborne)s=offset?.55:-.5;
  var shoulder={x:1,y:37};
  var a=s*.9;
  var elbow={x:shoulder.x+Math.sin(a)*23,y:shoulder.y+Math.cos(a)*23};
  var bend=a+(s>=0?-.62:.62);
  var hand={x:elbow.x+Math.sin(bend)*20,y:elbow.y+Math.cos(bend)*20};
  return {shoulder:shoulder,elbow:elbow,hand:hand};
 }
 var backLeg=legPoints(Math.PI),frontLeg=legPoints(0);
 var backArm=armPoints(0),frontArm=armPoints(Math.PI);
 ctx.save();
 ctx.translate(baseX,baseY);
 ctx.rotate(lean);
 ctx.fillStyle="#00000026";
 ctx.save();ctx.rotate(-lean);ctx.beginPath();ctx.ellipse(0,GROUND-baseY+4,48,11,0,0,Math.PI*2);ctx.fill();ctx.restore();

 self.runnerLimb(ctx,backLeg.hip,backLeg.knee,backLeg.foot,15,"#1f252c");
 ctx.save();ctx.translate(backLeg.foot.x,backLeg.foot.y);ctx.rotate(-.08+stride*.08);ctx.fillStyle="#11161b";rounded(ctx,-12,-3,29,10,5);ctx.fill();ctx.fillStyle="#e6e7e9";ctx.fillRect(-9,5,27,3);ctx.restore();

 self.runnerLimb(ctx,backArm.shoulder,backArm.elbow,backArm.hand,11,"#d89b77");
 ctx.strokeStyle="#252b32";ctx.lineWidth=14;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(backArm.shoulder.x,backArm.shoulder.y);ctx.lineTo(backArm.elbow.x,backArm.elbow.y);ctx.stroke();

 ctx.fillStyle="#252b32";
 ctx.beginPath();ctx.moveTo(-20,32);ctx.quadraticCurveTo(-25,49,-17,69);ctx.lineTo(-10,82);ctx.lineTo(15,82);ctx.lineTo(21,64);ctx.quadraticCurveTo(24,47,18,31);ctx.closePath();ctx.fill();
 ctx.fillStyle="#ff6a1a";ctx.beginPath();ctx.moveTo(-18,36);ctx.lineTo(-12,34);ctx.lineTo(-7,75);ctx.lineTo(-13,77);ctx.closePath();ctx.fill();
 ctx.fillStyle="#ffffff";rounded(ctx,3,43,13,10,2);ctx.fill();
 ctx.fillStyle="#ff5d2e";ctx.font="900 8px system-ui";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("N",9.5,48);

 self.runnerLimb(ctx,frontLeg.hip,frontLeg.knee,frontLeg.foot,16,"#252b32");
 ctx.save();ctx.translate(frontLeg.foot.x,frontLeg.foot.y);ctx.rotate(.02-stride*.1);ctx.fillStyle="#10151a";rounded(ctx,-12,-3,30,11,5);ctx.fill();ctx.fillStyle="#f1f2f4";ctx.fillRect(-8,6,28,3);ctx.restore();

 self.runnerLimb(ctx,frontArm.shoulder,frontArm.elbow,frontArm.hand,12,"#e5aa84");
 ctx.strokeStyle="#252b32";ctx.lineWidth=14;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(frontArm.shoulder.x,frontArm.shoulder.y);ctx.lineTo(frontArm.elbow.x,frontArm.elbow.y);ctx.stroke();

 var hairLag=running?Math.sin(phase-.8)*6:airborne?-8:0;
 ctx.strokeStyle="#4b342a";ctx.lineCap="round";
 ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(-9,13);ctx.bezierCurveTo(-26,17,-35+hairLag,25,-42+hairLag,38);ctx.stroke();
 ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(-8,10);ctx.bezierCurveTo(-25,5,-36+hairLag,13,-47+hairLag,24);ctx.stroke();

 ctx.fillStyle="#e8ad87";ctx.beginPath();ctx.arc(5,14,21,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#4b342a";ctx.beginPath();ctx.arc(1,8,21,Math.PI,Math.PI*2);ctx.fill();
 ctx.beginPath();ctx.ellipse(-11,12,8,17,-.35,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#e8ad87";ctx.beginPath();ctx.moveTo(23,14);ctx.lineTo(30,18);ctx.lineTo(23,21);ctx.closePath();ctx.fill();
 ctx.fillStyle="#1d2227";ctx.beginPath();ctx.arc(13,13,2.1,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle="#8f4c3d";ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(14,23,7,.18,1.18);ctx.stroke();

 if(running){
  ctx.strokeStyle="#ffffff55";ctx.lineWidth=3;ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(-57,50);ctx.lineTo(-77,50);ctx.stroke();
  ctx.beginPath();ctx.moveTo(-51,62);ctx.lineTo(-67,62);ctx.stroke();
 }
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
