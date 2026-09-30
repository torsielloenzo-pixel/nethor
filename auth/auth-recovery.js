/* Nethor Auth — récupération de mot de passe, Phase 4.20 */
let forgotCooldownTimer=null;
function forgotCooldownUntil(){try{return Number(localStorage.getItem('nettoPasswordResetCooldownUntil')||0)}catch(_){return 0}}
function renderForgotCooldown(){
 const btn=$('forgotSubmit'),box=$('forgotCooldown'),time=$('forgotCooldownTime');if(!btn||!box||!time)return;
 const left=Math.max(0,Math.ceil((forgotCooldownUntil()-Date.now())/1000));
 if(left>0){box.classList.remove('hidden');time.textContent=left+' s';btn.disabled=true;btn.textContent='Patienter '+left+' s'}
 else{box.classList.add('hidden');time.textContent='30 s';btn.disabled=false;btn.textContent='Envoyer la demande';try{localStorage.removeItem('nettoPasswordResetCooldownUntil')}catch(_){};if(forgotCooldownTimer){clearInterval(forgotCooldownTimer);forgotCooldownTimer=null}}
}
function startForgotCooldown(seconds=30){
 try{localStorage.setItem('nettoPasswordResetCooldownUntil',String(Date.now()+seconds*1000))}catch(_){}
 if(forgotCooldownTimer)clearInterval(forgotCooldownTimer);renderForgotCooldown();forgotCooldownTimer=setInterval(renderForgotCooldown,250)
}
function resumeForgotCooldown(){if(forgotCooldownUntil()>Date.now()){if(forgotCooldownTimer)clearInterval(forgotCooldownTimer);renderForgotCooldown();forgotCooldownTimer=setInterval(renderForgotCooldown,250)}else renderForgotCooldown()}
function openForgotPassword(){const d=$('forgotDialog'),ident=$('forgotIdentifier'),state=$('forgotState');ident.value=$('email').value.trim();state.textContent='';state.className='forgotState';d.showModal();resumeForgotCooldown();window.NettoSounds?.play?.('menuOpen');setTimeout(()=>ident.focus(),80)}
async function sendForgotRequest(){const ident=$('forgotIdentifier').value.trim(),btn=$('forgotSubmit'),state=$('forgotState');if(forgotCooldownUntil()>Date.now()){resumeForgotCooldown();return}if(ident.length<3){state.className='forgotState err';state.textContent='Saisis ton identifiant.';window.NettoSounds?.play?.('error');return}btn.disabled=true;state.className='forgotState';state.textContent='Envoi de la demande…';try{const {data,error}=await db.functions.invoke('password-reset-request',{body:{identifier:ident}});if(error)throw error;state.className='forgotState ok';state.textContent=data?.message||'Si cet identifiant correspond à un compte, la demande a été transmise à l’administrateur.';startForgotCooldown(30);window.NettoSounds?.play?.('success')}catch(e){state.className='forgotState err';state.textContent='La demande n’a pas pu être envoyée. Réessaie dans quelques instants.';btn.disabled=false;window.NettoSounds?.play?.('error')}}
