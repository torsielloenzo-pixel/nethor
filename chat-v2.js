const SUPABASE_URL='https://gioxrpaiwogqqtakjpnv.supabase.co';
const SUPABASE_KEY='sb_publishable_nJPMS-Z_20ng1aMJmufbmg_gWFFndrC';
const db=supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const state={
 session:null,profile:null,canManage:false,members:[],onlineIds:new Set(),conversations:[],activeId:null,
 messages:[],participants:[],reactions:[],presenceHistory:new Map(),selectedFile:null,replyTo:null,editingId:null,newMode:'direct',
 groupMembers:new Set(),typing:new Map(),typingChannel:null,dataChannel:null,memberChannel:null,recording:null,
 signedCache:new Map(),avatarSignedCache:new Map(),search:'',messageSearch:'',onlyUnread:false,archives:[],adminArchives:[],actionConversationId:null,longPressTimer:null,longPressTriggered:false,addMemberSelection:new Set(),messageLoadSeq:0,messageRenderSeq:0,lastMessageRenderKey:'',lastConversationRenderKey:'',voicePeaks:new Map(),activeVoiceId:null
};
const ALLOWED_EXT=new Set(['jpg','jpeg','png','webp','gif','heic','heif','mp4','mov','webm','pdf','txt','doc','docx','xls','xlsx','mp3','m4a','ogg','wav']);
const ALLOWED_MIME=new Set([
 'image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif',
 'video/mp4','video/quicktime','video/webm','application/pdf','text/plain',
 'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
 'audio/mpeg','audio/mp4','audio/ogg','audio/webm','audio/wav','audio/x-m4a'
]);
function initials(name){return String(name||'?').trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]?.toUpperCase()).join('')||'?'}
function member(id){return state.members.find(x=>x.id===id)||null}
function roleLabel(role){return window.NettoProfileUI?.roleLabel?.(role)||({admin:'Administrateur',point_vente:'Point de vente',surface_vente:'Point de vente',responsable:'Responsable',employe:'Employé',lecture:'Lecture seule'}[role]||role||'Utilisateur')}
function chatRoleKey(m){
 const raw=String(m?.role||'').trim().toLowerCase(),label=String(roleLabel(m?.role)||'').trim().toLowerCase();
 if(raw==='admin'||label.includes('administrateur'))return'admin';
 if(raw==='point_vente'||raw==='surface_vente'||label.includes('point de vente')||label.includes('surface de vente'))return'point-vente';
 if(raw==='responsable'||label.includes('responsable'))return'responsable';
 if(raw==='lecture'||label.includes('lecture seule'))return'lecture';
 return'employe'
}
function generalSenderHtml(author,name){
 const role=chatRoleKey(author),label=author?.role?roleLabel(author.role):'Membre';
 return '<div class="messageSender generalSender role-'+role+'"><span class="senderRole">'+esc(label)+'</span><span class="senderName">'+esc(name)+'</span></div>'
}
function showToast(message){let t=$('chatToast');if(!t){t=document.createElement('div');t.id='chatToast';t.className='toast';document.body.appendChild(t)}t.textContent=message;t.classList.remove('show');requestAnimationFrame(()=>t.classList.add('show'));clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.classList.remove('show'),2200)}
function timeShort(v){if(!v)return'';const d=new Date(v),n=new Date();if(d.toDateString()===n.toDateString())return d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});return d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})}
function messageTime(v){return new Date(v).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
function dayLabel(v){const d=new Date(v),n=new Date(),y=new Date(n);y.setDate(n.getDate()-1);if(d.toDateString()===n.toDateString())return"Aujourd’hui";if(d.toDateString()===y.toDateString())return"Hier";return d.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}
function sizeLabel(n){n=Number(n)||0;if(n<1024)return n+' o';if(n<1048576)return(n/1024).toFixed(1).replace('.',',')+' Ko';return(n/1048576).toFixed(1).replace('.',',')+' Mo'}
function attachmentAllowed(file){const ext=(file?.name?.split('.').pop()||'').toLowerCase();return ALLOWED_EXT.has(ext)&&(!file.type||ALLOWED_MIME.has(file.type))}
async function signed(path){if(!path)return null;const cached=state.signedCache.get(path);if(cached&&cached.exp>Date.now())return cached.url;const {data}=await db.storage.from('chat-files').createSignedUrl(path,3600);const url=data?.signedUrl||null;if(url)state.signedCache.set(path,{url,exp:Date.now()+3300000});return url}
async function signedAvatar(path){if(!path)return null;const cached=state.avatarSignedCache.get(path);if(cached&&cached.exp>Date.now())return cached.url;const {data}=await db.storage.from('profile-avatars').createSignedUrl(path,3600);const url=data?.signedUrl||null;if(url)state.avatarSignedCache.set(path,{url,exp:Date.now()+3300000});return url}
function avatarHtml(m,cls='convAvatar'){const name=m?.display_name||'Utilisateur',frame=m?.avatar_frame?' data-avatar-frame="'+esc(m.avatar_frame)+'"':'',style=' style="background:'+(esc(m?.profile_color||'#ff5a2a'))+'"';return '<div class="'+cls+'"'+frame+style+'>'+(m?.avatar_url?'<img src="'+esc(m.avatar_url)+'" alt="">':esc(initials(name)))+'</div>'}
function conversationTitle(c){if(!c)return'Discussion';if(c.conversation_type==='general')return'Général';if(c.conversation_type==='group')return c.conversation_name||'Groupe';const other=(c.member_ids||[]).find(id=>id!==state.session?.user?.id);return member(other)?.display_name||'Discussion privée'}
function conversationMember(c){if(!c||c.conversation_type!=='direct')return null;const other=(c.member_ids||[]).find(id=>id!==state.session?.user?.id);return member(other)}
function conversationAvatar(c,active=false){const cls=active?'activeAvatar':'convAvatar';if(c?.conversation_type==='general')return '<div class="'+cls+' general"><img src="assets/logo-chat.svg" alt=""></div>';if(c?.conversation_type==='direct')return avatarHtml(conversationMember(c),cls);const title=conversationTitle(c);return '<div class="'+cls+'" style="background:linear-gradient(135deg,#ff3422,#ff8524)">'+esc(initials(title))+'</div>'}
function activeConversation(){return state.conversations.find(c=>c.conversation_id===state.activeId)||null}
function conversationById(id){return state.conversations.find(c=>c.conversation_id===id)||state.archives.find(c=>c.conversation_id===id)||null}
function lastSeenLabel(userId){
 const row=state.presenceHistory.get(userId);if(!row?.last_seen_at)return'Hors ligne';
 const d=new Date(row.last_seen_at),now=new Date(),y=new Date(now);y.setDate(now.getDate()-1);
 const time=d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
 if(d.toDateString()===now.toDateString())return'En ligne aujourd’hui à '+time;
 if(d.toDateString()===y.toDateString())return'En ligne hier à '+time;
 return'En ligne le '+d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})+' à '+time
}
function conversationPresence(c){if(!c)return'';const ids=(c.member_ids||[]).filter(id=>id!==state.session?.user?.id);const online=ids.filter(id=>state.onlineIds.has(id)).length;if(c.conversation_type==='direct'){const other=ids[0];return online?'En ligne':lastSeenLabel(other)}return (c.member_ids||[]).length+' membre'+((c.member_ids||[]).length>1?'s':'')+(online?' · '+online+' en ligne':'')}
async function loadPresenceHistory(){
 const ids=state.members.map(m=>m.id);if(!ids.length){state.presenceHistory=new Map();return}
 const {data,error}=await db.from('chat_presence_history').select('user_id,online_since,last_seen_at,last_session_seconds,total_online_seconds').in('user_id',ids);
 if(error){console.warn('Présence chat:',error);return}
 state.presenceHistory=new Map((data||[]).map(r=>[r.user_id,r]));
 renderConversationHeader();renderConversations()
}
async function loadMembers(){
 const {data,error}=await db.rpc('list_team_members');if(error){console.warn(error);return}
 const rows=[...(data||[])];if(state.session?.user?.id&&state.profile&&!rows.some(x=>x.id===state.session.user.id))rows.push({id:state.session.user.id,...state.profile});
 state.members=await Promise.all(rows.map(async m=>{if(m.avatar_path)m.avatar_url=await signedAvatar(m.avatar_path);return m}));
 await loadPresenceHistory();renderConversations();renderNewChatMembers();renderConversationHeader()
}
function syncPresence(ids){const before=new Set(state.onlineIds),next=new Set(ids||window.NettoProfileUI?.onlineIds||[]);const changed=before.size!==next.size||[...before].some(id=>!next.has(id));state.onlineIds=next;if(changed){state.lastConversationRenderKey='';renderConversations();renderConversationHeader()}renderTyping();const left=[...before].some(id=>!next.has(id));if(left)setTimeout(()=>loadPresenceHistory(),700)}
function startPresence(){syncPresence();window.addEventListener('netto:presence',e=>syncPresence(e.detail?.ids||[]))}
async function loadConversations(){
 const {data,error}=await db.rpc('list_chat_conversations');if(error){console.error('Conversations:',error);showToast('Impossible de charger les discussions');return}
 state.conversations=data||[];renderConversations();
 if(state.activeId&&!state.conversations.some(c=>c.conversation_id===state.activeId)){state.activeId=null;state.messages=[];state.participants=[];renderConversationHeader();renderMessages()}
}
function renderConversations(){
 const box=$('conversationList');if(!box)return;
 const q=(state.search||'').trim().toLowerCase();
 const list=state.conversations.filter(c=>{if(state.onlyUnread&&Number(c.unread_count)<=0)return false;if(!q)return true;return(conversationTitle(c)+' '+(c.last_message||'')).toLowerCase().includes(q)});
 const memberVisual=state.members.map(m=>[m.id,m.avatar_url||'',m.profile_color||'',m.avatar_frame||''].join(':')).join(';');
 const key=q+'|'+(state.onlyUnread?'1':'0')+'|'+(state.activeId||'')+'|'+[...state.onlineIds].sort().join(',')+'|'+memberVisual+'|'+list.map(c=>[c.conversation_id,c.conversation_name||'',c.last_message||'',c.last_message_at||'',c.updated_at||'',c.unread_count||0,c.created_by||''].join(':')).join(';');
 if(key===state.lastConversationRenderKey)return;
 state.lastConversationRenderKey=key;
 if(!list.length){box.innerHTML='<div class="listEmpty">'+(q?'Aucune discussion trouvée.':state.onlyUnread?'Aucune discussion non lue.':'Aucune discussion pour le moment.')+'</div>';return}
 box.innerHTML=list.map(c=>{
  const title=conversationTitle(c),active=c.conversation_id===state.activeId,preview=(c.last_sender===state.session?.user?.id?'Vous : ':'')+(c.last_message||'Nouvelle discussion'),direct=conversationMember(c),online=direct&&state.onlineIds.has(direct.id);
  const ownerGroup=c.conversation_type==='group'&&c.created_by===state.session?.user?.id;
  return '<button class="convRow '+(active?'active ':'')+(ownerGroup?'ownerGroup':'')+'" data-conversation-id="'+c.conversation_id+'" onclick="conversationRowClick(event,\''+c.conversation_id+'\')" onpointerdown="startConversationLongPress(event,\''+c.conversation_id+'\')" onpointerup="cancelConversationLongPress()" onpointercancel="cancelConversationLongPress()" onpointerleave="cancelConversationLongPress()" oncontextmenu="conversationContextMenu(event,\''+c.conversation_id+'\')">'+conversationAvatar(c)+
   '<span class="convCopy"><span class="convTitleLine"><strong>'+esc(title)+'</strong>'+(online?'<i class="onlineMini"></i>':'')+'</span><span class="convPreview">'+esc(preview)+'</span></span>'+
   '<span class="convMeta"><span class="convTime">'+esc(timeShort(c.last_message_at||c.updated_at))+'</span>'+(Number(c.unread_count)>0?'<b class="unreadBadge">'+Math.min(99,Number(c.unread_count))+'</b>':'')+'</span></button>'
 }).join('');
 syncConversationFilterButtons()
}
function syncConversationFilterButtons(){
 $('conversationFilterAll')?.classList.toggle('active',!state.onlyUnread);
 $('conversationFilterUnread')?.classList.toggle('active',state.onlyUnread)
}
function setConversationListFilter(mode){
 state.onlyUnread=mode==='unread';state.lastConversationRenderKey='';syncConversationFilterButtons();renderConversations()
}
function searchConversations(v){state.search=v;renderConversations()}
function conversationRowClick(e,id){
 if(state.longPressTriggered){e.preventDefault();state.longPressTriggered=false;return}
 openConversation(id,{showMobile:true})
}
function startConversationLongPress(e,id){
 if(window.innerWidth>780||e.pointerType==='mouse')return;
 cancelConversationLongPress();state.longPressTriggered=false;
 state.longPressTimer=setTimeout(()=>{state.longPressTriggered=true;navigator.vibrate?.(18);openConversationActions(id)},520)
}
function cancelConversationLongPress(){if(state.longPressTimer){clearTimeout(state.longPressTimer);state.longPressTimer=null}}
function conversationContextMenu(e,id){if(window.innerWidth>780)return;e.preventDefault();cancelConversationLongPress();state.longPressTriggered=true;openConversationActions(id)}
function openConversationActions(id,opts={}){
 const conv=conversationById(id),backdrop=$('conversationActionSheet'),sheet=backdrop?.querySelector('.conversationActionSheet');if(!conv||!backdrop||!sheet)return;state.actionConversationId=id;
 const head=$('conversationActionHeader');if(head)head.innerHTML=conversationAvatar(conv)+'<div><strong>'+esc(conversationTitle(conv))+'</strong><small>'+esc(conv.conversation_type==='direct'?'Contact Nethor':conv.conversation_type==='general'?'Canal général':(conv.member_ids||[]).length+' membre(s)')+'</small></div>';
 const protectedGeneral=conv.conversation_type==='general'&&state.profile?.role!=='admin';
 $('conversationActionArchive')?.classList.toggle('hidden',protectedGeneral);
 $('conversationActionHide')?.classList.toggle('hidden',protectedGeneral);
 backdrop.classList.toggle('desktopContext',!!opts.desktop&&window.innerWidth>780);backdrop.classList.remove('hidden');
 sheet.style.left='';sheet.style.top='';
 if(opts.desktop&&window.innerWidth>780&&opts.anchor){
  requestAnimationFrame(()=>{
   const r=opts.anchor.getBoundingClientRect(),w=sheet.offsetWidth,h=sheet.offsetHeight;
   const left=Math.max(10,Math.min(window.innerWidth-w-10,r.left));
   let top=r.bottom+9;if(top+h>window.innerHeight-10)top=Math.max(10,r.top-h-9);
   sheet.style.left=left+'px';sheet.style.top=top+'px'
  })
 }
}
function openHeaderConversationActions(e){e?.stopPropagation?.();if(!state.activeId)return;openConversationActions(state.activeId,{desktop:true,anchor:e?.currentTarget})}
function closeConversationActions(){const backdrop=$('conversationActionSheet'),sheet=backdrop?.querySelector('.conversationActionSheet');backdrop?.classList.add('hidden');backdrop?.classList.remove('desktopContext');if(sheet){sheet.style.left='';sheet.style.top=''}state.actionConversationId=null}
function contactPresence(userId){return state.onlineIds.has(userId)?'En ligne':lastSeenLabel(userId)}
function openContactCard(userId){
 const m=member(userId);if(!m)return showToast('Profil indisponible');
 closeConversationActions();closeDiscussionMenu();
 const box=$('contactCardContent'),modal=$('contactModal');if(!box||!modal)return;
 const status=(m.status_text||'').trim();
 box.innerHTML='<div class="contactHero">'+avatarHtml(m,'contactAvatar')+'<h3>'+esc(m.display_name||'Utilisateur')+'</h3><span class="contactRole">'+esc(roleLabel(m.role))+'</span><span class="contactPresence">'+esc(contactPresence(m.id))+'</span></div>'+
  '<div class="contactGrid"><div class="contactField"><small>Rôle</small><strong>'+esc(roleLabel(m.role))+'</strong></div><div class="contactField"><small>Présence</small><strong>'+esc(contactPresence(m.id))+'</strong></div>'+
  (status?'<div class="contactField full"><small>Statut</small><strong>'+esc(status)+'</strong></div>':'')+
  '<div class="contactField full"><small>Profil</small><strong>Membre de l’équipe Nethor</strong></div></div>'+
  (m.id!==state.session?.user?.id?'<button class="contactAction" type="button" onclick="openDirectFromContact(\''+m.id+'\')">Envoyer un message</button>':'');
 modal.classList.remove('hidden')
}
function closeContactCard(){$('contactModal')?.classList.add('hidden')}
async function openDirectFromContact(userId){closeContactCard();await openDirect(userId)}
function openConversationDetails(id){
 const conv=conversationById(id);if(!conv)return;
 if(conv.conversation_type==='direct'){const m=conversationMember(conv);if(m)openContactCard(m.id);return}
 closeConversationActions();closeDiscussionMenu();
 const box=$('contactCardContent'),modal=$('contactModal');if(!box||!modal)return;
 const ids=(conv.member_ids||[]).filter(Boolean),members=ids.map(member).filter(Boolean);
 box.innerHTML='<div class="contactHero">'+conversationAvatar(conv,true)+'<h3>'+esc(conversationTitle(conv))+'</h3><span class="contactRole">'+esc(conv.conversation_type==='general'?'Canal général':'Groupe')+'</span><span class="contactPresence">'+esc(conversationPresence(conv))+'</span></div>'+
  '<div class="infoSection"><div class="infoSectionTitle">Contacts</div><div class="infoMembers">'+members.map(m=>'<button class="infoRow contactInfoRow" type="button" onclick="openContactCard(\''+m.id+'\')">'+avatarHtml(m,'pickAvatar')+'<div><strong>'+esc(m.display_name||'Utilisateur')+'</strong><small>'+esc(roleLabel(m.role))+' · '+esc(contactPresence(m.id))+'</small></div><span>›</span></button>').join('')+'</div></div>';
 modal.classList.remove('hidden')
}
function actionSheetInfo(){const id=state.actionConversationId;closeConversationActions();if(id)openConversationDetails(id)}
async function setPersonalConversationState(id,action){
 const {error}=await db.rpc('chat_set_user_conversation_state',{p_conversation:id,p_action:action});if(error){console.error(error);showToast('Action impossible');return false}return true
}
async function actionSheetArchive(){const id=state.actionConversationId;if(!id)return;const conv=conversationById(id);if(conv?.conversation_type==='general'&&state.profile?.role!=='admin'){closeConversationActions();return showToast('Le canal Général ne peut pas être archivé')}closeConversationActions();if(!await setPersonalConversationState(id,'archive'))return;await afterPersonalConversationRemoval(id);showToast('Conversation archivée')}
async function actionSheetHide(){
 const id=state.actionConversationId;if(!id)return;const conv=conversationById(id);if(conv?.conversation_type==='general'&&state.profile?.role!=='admin'){closeConversationActions();return showToast('Le canal Général ne peut pas être supprimé de tes discussions')}closeConversationActions();
 if(!confirm('Supprimer cette conversation de tes discussions ?\n\nElle sera masquée uniquement pour ton compte.'))return;
 if(!await setPersonalConversationState(id,'hide'))return;await afterPersonalConversationRemoval(id);showToast('Conversation supprimée de ta liste')
}
async function afterPersonalConversationRemoval(id){
 if(state.activeId===id){state.activeId=null;state.messages=[];state.participants=[];document.body.classList.remove('mobileConversationOpen');history.replaceState(null,'','chat.html');renderConversationHeader();renderMessages()}
 await loadConversations()
}
async function openConversation(id,opts={}){
 if(!id)return;state.activeId=id;state.replyTo=null;state.editingId=null;state.messageSearch='';$('messageSearchInput').value='';$('messageSearchBar').classList.remove('show');renderComposeBanner();clearAttachment();
 const c=activeConversation();renderConversations();renderConversationHeader();
 if(opts.showMobile||window.innerWidth>780)document.body.classList.add('mobileConversationOpen');
 history.replaceState(null,'','chat.html?c='+encodeURIComponent(id));
 await Promise.all([loadParticipants(),loadMessages()]);await markRead();setupTypingChannel();renderConversationHeader()
}
function closeMobileConversation(){document.body.classList.remove('mobileConversationOpen');history.replaceState(null,'','chat.html')}
async function loadParticipants(){
 if(!state.activeId){state.participants=[];renderDesktopDetails();return}
 const {data,error}=await db.from('chat_participants').select('conversation_id,user_id,role,joined_at,last_read_at,muted').eq('conversation_id',state.activeId);
 if(!error)state.participants=data||[];
 renderDesktopDetails()
}
function renderConversationHeader(){
 const c=activeConversation(),av=$('activeAvatarMount'),avatarBtn=$('activeAvatarButton'),title=$('activeTitle'),sub=$('activeSubtitle'),info=$('conversationMenuBtn'),search=$('messageSearchBtn'),composer=$('composer');
 if(!c){if(av)av.innerHTML='';if(avatarBtn)avatarBtn.disabled=true;if(title)title.textContent='Sélectionne une discussion';if(sub)sub.textContent='';if(info)info.disabled=false;if(search)search.disabled=true;if(composer)composer.classList.add('hidden');renderDesktopDetails();return}
 av.innerHTML=conversationAvatar(c,true);if(avatarBtn)avatarBtn.disabled=false;title.textContent=conversationTitle(c);sub.textContent=conversationPresence(c);info.disabled=false;search.disabled=false;composer.classList.remove('hidden');renderDesktopDetails()
}
async function loadMessages(){
 if(!state.activeId){state.messages=[];state.reactions=[];state.lastMessageRenderKey='';renderMessages();return}
 const conversationId=state.activeId,seq=++state.messageLoadSeq;
 const {data,error}=await db.from('chat_messages').select('id,user_id,display_name,body,attachment_path,attachment_name,attachment_type,attachment_size,created_at,conversation_id,reply_to,edited_at,deleted_at').eq('conversation_id',conversationId).order('created_at',{ascending:true}).limit(400);
 if(seq!==state.messageLoadSeq||state.activeId!==conversationId)return;
 if(error){console.error(error);$('messages').innerHTML='<div class="listEmpty">Impossible de charger les messages.</div>';return}
 state.messages=data||[];await loadReactions();
 if(seq!==state.messageLoadSeq||state.activeId!==conversationId)return;
 await renderMessages();renderDesktopDetails()
}
async function loadReactions(){
 const ids=state.messages.map(m=>m.id);if(!ids.length){state.reactions=[];return}
 const {data,error}=await db.from('chat_reactions').select('message_id,user_id,emoji,created_at').in('message_id',ids);
 state.reactions=error?[]:(data||[])
}
async function attachmentHtml(m){
 if(!m.attachment_path||m.deleted_at)return'';const url=await signed(m.attachment_path);if(!url)return'';
 const type=m.attachment_type||'',name=esc(m.attachment_name||'Pièce jointe'),size=esc(sizeLabel(m.attachment_size));
 if(type.startsWith('image/'))return '<div class="attachment attachmentImage"><img src="'+esc(url)+'" alt="'+name+'" decoding="async" onclick="openImage(this.src)"><div class="fileRow"><div class="fileInfo"><strong>'+name+'</strong><small>'+size+'</small></div><a class="downloadFile" href="'+esc(url)+'" target="_blank" rel="noopener">Ouvrir</a></div></div>';
 if(type.startsWith('video/'))return '<div class="attachment"><video controls preload="metadata" src="'+esc(url)+'"></video><div class="fileRow"><div class="fileInfo"><strong>'+name+'</strong><small>'+size+'</small></div><a class="downloadFile" href="'+esc(url)+'" target="_blank" rel="noopener">Ouvrir</a></div></div>';
 if(type.startsWith('audio/')){
  const voiceId='voice-'+String(m.id).replace(/[^a-zA-Z0-9_-]/g,'');
  return '<div id="'+voiceId+'" class="voiceMessage" data-voice-id="'+esc(String(m.id))+'" data-audio-path="'+esc(m.attachment_path)+'">'+
   '<button class="voicePlay" type="button" onclick="toggleVoicePlayback(event,\''+esc(String(m.id))+'\')" aria-label="Lire le vocal"><span class="voicePlayIcon">▶</span></button>'+
   '<button class="voiceWaveButton" type="button" onclick="seekVoiceMessage(event,\''+esc(String(m.id))+'\')" aria-label="Se déplacer dans le vocal"><span class="voiceWaveform" aria-hidden="true"></span></button>'+
   '<div class="voiceTools"><button class="voiceSpeed" type="button" onclick="cycleVoiceSpeed(event,\''+esc(String(m.id))+'\')">1×</button><span class="voiceDuration"><span class="voiceCurrent">0:00</span><span class="voiceDurationSep"> / </span><span class="voiceTotal">--:--</span></span></div>'+
   '<audio class="voiceAudio" preload="metadata" src="'+esc(url)+'"></audio>'+
  '</div>'
 }
 return '<div class="attachment"><div class="fileRow"><div class="fileIcon">📎</div><div class="fileInfo"><strong>'+name+'</strong><small>'+size+'</small></div><a class="downloadFile" href="'+esc(url)+'" target="_blank" rel="noopener">Télécharger</a></div></div>'
}

const VOICE_BAR_COUNT=46;
function voiceRoot(id){return document.getElementById('voice-'+String(id).replace(/[^a-zA-Z0-9_-]/g,''))}
function formatVoiceTime(seconds){
 seconds=Math.max(0,Number(seconds)||0);const m=Math.floor(seconds/60),s=Math.floor(seconds%60);return m+':'+String(s).padStart(2,'0')
}
function fallbackVoicePeaks(seed){
 const str=String(seed||'voice');let n=0;for(let i=0;i<str.length;i++)n=(n*31+str.charCodeAt(i))>>>0;
 return Array.from({length:VOICE_BAR_COUNT},(_,i)=>{n=(1664525*n+1013904223)>>>0;const base=.18+((n>>>8)%1000)/1000*.72;return Math.max(.16,Math.min(1,base*(.74+.26*Math.sin((i+2)*.63)**2)))})
}
function paintVoiceWave(root,peaks){
 const wave=root?.querySelector('.voiceWaveform');if(!wave)return;
 const values=(Array.isArray(peaks)&&peaks.length?peaks:fallbackVoicePeaks(root.dataset.audioPath)).slice(0,VOICE_BAR_COUNT);
 const bars=values.map((v,i)=>'<i class="voiceBar" data-bar="'+i+'" style="--voice-h:'+Math.round(8+Math.max(.08,Math.min(1,v))*27)+'px"></i>').join('');
 wave.innerHTML='<span class="voiceWaveLayer voiceWaveBase">'+bars+'</span><span class="voiceWaveLayer voiceWavePlayed">'+bars+'</span>';
 updateVoiceProgress(root)
}
async function computeVoicePeaks(root,audio){
 const path=root?.dataset.audioPath||'',cached=state.voicePeaks.get(path);if(cached){paintVoiceWave(root,cached);return}
 paintVoiceWave(root,fallbackVoicePeaks(path));
 try{
  const response=await fetch(audio.currentSrc||audio.src,{credentials:'omit'});if(!response.ok)throw new Error('audio '+response.status);
  const buf=await response.arrayBuffer(),Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;
  const ctx=new Ctx(),decoded=await ctx.decodeAudioData(buf.slice(0));try{await ctx.close()}catch(_){}
  const channels=decoded.numberOfChannels,frames=decoded.length,step=Math.max(1,Math.floor(frames/VOICE_BAR_COUNT)),peaks=[];
  let maxPeak=.0001;
  for(let b=0;b<VOICE_BAR_COUNT;b++){
   const start=b*step,end=b===VOICE_BAR_COUNT-1?frames:Math.min(frames,start+step);let sum=0,count=0,peak=0;
   for(let ch=0;ch<channels;ch++){
    const data=decoded.getChannelData(ch),stride=Math.max(1,Math.floor((end-start)/180));
    for(let i=start;i<end;i+=stride){const a=Math.abs(data[i]||0);sum+=a*a;count++;if(a>peak)peak=a}
   }
   const rms=Math.sqrt(sum/Math.max(1,count)),value=Math.max(rms*2.5,peak*.6);peaks.push(value);if(value>maxPeak)maxPeak=value
  }
  const normalized=peaks.map(v=>Math.max(.08,Math.min(1,v/maxPeak)));state.voicePeaks.set(path,normalized);
  if(document.body.contains(root))paintVoiceWave(root,normalized)
 }catch(e){console.warn('Waveform vocal:',e)}
}
function updateVoiceProgress(root){
 if(!root)return;const audio=root.querySelector('.voiceAudio'),current=root.querySelector('.voiceCurrent'),total=root.querySelector('.voiceTotal'),play=root.querySelector('.voicePlayIcon');
 if(!audio)return;const duration=Number.isFinite(audio.duration)?audio.duration:0,currentTime=Number.isFinite(audio.currentTime)?audio.currentTime:0,progress=duration?currentTime/duration:0;
 root.style.setProperty('--voice-progress',String(Math.max(0,Math.min(1,progress))));
 if(current)current.textContent=formatVoiceTime(currentTime);if(total)total.textContent=duration?formatVoiceTime(duration):'--:--';
 if(play)play.textContent=audio.paused?'▶':'❚❚';root.classList.toggle('playing',!audio.paused)
}
function startVoiceProgressLoop(root){
 if(!root)return;cancelAnimationFrame(Number(root.dataset.voiceRaf||0));
 const tick=()=>{const audio=root.querySelector('.voiceAudio');if(!audio||audio.paused||audio.ended){root.dataset.voiceRaf='';updateVoiceProgress(root);return}updateVoiceProgress(root);root.dataset.voiceRaf=String(requestAnimationFrame(tick))};
 root.dataset.voiceRaf=String(requestAnimationFrame(tick))
}
function stopVoiceProgressLoop(root){
 if(!root)return;const id=Number(root.dataset.voiceRaf||0);if(id)cancelAnimationFrame(id);root.dataset.voiceRaf='';updateVoiceProgress(root)
}
function initVoiceMessage(root){
 if(!root||root.dataset.voiceReady==='1')return;root.dataset.voiceReady='1';
 const audio=root.querySelector('.voiceAudio');if(!audio)return;paintVoiceWave(root,fallbackVoicePeaks(root.dataset.audioPath));
 ['loadedmetadata','durationchange','timeupdate','seeked'].forEach(type=>audio.addEventListener(type,()=>updateVoiceProgress(root)));
 audio.addEventListener('play',()=>{updateVoiceProgress(root);startVoiceProgressLoop(root)});
 audio.addEventListener('pause',()=>stopVoiceProgressLoop(root));
 audio.addEventListener('loadedmetadata',()=>computeVoicePeaks(root,audio),{once:true});
 audio.addEventListener('ended',()=>{stopVoiceProgressLoop(root);audio.currentTime=0;state.activeVoiceId=null;updateVoiceProgress(root)});
 if(audio.readyState>=1){updateVoiceProgress(root);computeVoicePeaks(root,audio)}
}
function initVoiceMessages(scope=document){scope.querySelectorAll?.('.voiceMessage').forEach(initVoiceMessage)}
function pauseOtherVoices(id){
 document.querySelectorAll('.voiceMessage .voiceAudio').forEach(a=>{const r=a.closest('.voiceMessage');if(r?.dataset.voiceId!==String(id)&&!a.paused)a.pause()})
}
function toggleVoicePlayback(event,id){
 event?.stopPropagation?.();const root=voiceRoot(id),audio=root?.querySelector('.voiceAudio');if(!audio)return;
 pauseOtherVoices(id);
 if(audio.paused){audio.play().then(()=>{state.activeVoiceId=String(id);updateVoiceProgress(root);startVoiceProgressLoop(root)}).catch(()=>showToast('Lecture du vocal impossible'))}
 else{audio.pause();if(state.activeVoiceId===String(id))state.activeVoiceId=null}
}
function seekVoiceMessage(event,id){
 event?.stopPropagation?.();const root=voiceRoot(id),audio=root?.querySelector('.voiceAudio'),wave=root?.querySelector('.voiceWaveButton');if(!audio||!wave||!Number.isFinite(audio.duration))return;
 const rect=wave.getBoundingClientRect(),x=Math.max(0,Math.min(rect.width,event.clientX-rect.left));audio.currentTime=(x/Math.max(1,rect.width))*audio.duration;updateVoiceProgress(root)
}
function cycleVoiceSpeed(event,id){
 event?.stopPropagation?.();const root=voiceRoot(id),audio=root?.querySelector('.voiceAudio'),btn=root?.querySelector('.voiceSpeed');if(!audio)return;
 const rates=[1,1.5,2],i=rates.findIndex(x=>Math.abs(x-audio.playbackRate)<.01),next=rates[(i+1+rates.length)%rates.length];audio.playbackRate=next;if(btn)btn.textContent=String(next).replace('.5',',5')+'×'
}
function replyHtml(m){
 if(!m.reply_to)return'';const r=state.messages.find(x=>String(x.id)===String(m.reply_to));if(!r)return'';
 const who=r.user_id===state.session?.user?.id?'Vous':(member(r.user_id)?.display_name||r.display_name||'Utilisateur');
 const preview=r.deleted_at?'Message supprimé':(r.body||r.attachment_name||'Pièce jointe');
 return '<div class="replyQuote" onclick="scrollToMessage(\''+r.id+'\')"><strong>'+esc(who)+'</strong><span>'+esc(preview)+'</span></div>'
}
function reactionsHtml(messageId){
 const rs=state.reactions.filter(r=>String(r.message_id)===String(messageId));if(!rs.length)return'';
 const groups=new Map();rs.forEach(r=>{const a=groups.get(r.emoji)||[];a.push(r);groups.set(r.emoji,a)});
 return '<div class="reactions">'+[...groups.entries()].map(([emoji,items])=>'<button class="reactionChip '+(items.some(x=>x.user_id===state.session?.user?.id)?'mineReact':'')+'" onclick="toggleReaction(\''+messageId+'\',\''+emoji+'\')"><span>'+esc(emoji)+'</span><b>'+items.length+'</b></button>').join('')+'</div>'
}
function readTicks(m){
 if(m.user_id!==state.session?.user?.id)return'';const others=state.participants.filter(p=>p.user_id!==state.session.user.id);if(!others.length)return'<span class="readTicks">✓</span>';
 const read=others.every(p=>p.last_read_at&&new Date(p.last_read_at)>=new Date(m.created_at));return '<span class="readTicks '+(read?'read':'')+'">'+(read?'✓✓':'✓')+'</span>'
}
async function renderMessages(){
 const box=$('messages'),conversationId=state.activeId,renderSeq=++state.messageRenderSeq;
 if(!conversationId){state.lastMessageRenderKey='';box.innerHTML='<div class="noConversation"><div><div class="logo"><img src="assets/logo-chat.svg" alt=""></div><strong>Messagerie Nethor</strong><span>Choisis une discussion ou crée une conversation privée ou un groupe.</span></div></div>';return}
 const q=state.messageSearch.trim().toLowerCase();const visible=state.messages.filter(m=>!q||(m.body||'').toLowerCase().includes(q)||(m.attachment_name||'').toLowerCase().includes(q));
 if(!visible.length){state.lastMessageRenderKey='empty:'+conversationId+':'+q;box.innerHTML='<div class="listEmpty">'+(q?'Aucun message trouvé.':'Aucun message pour le moment.<br>Écris le premier message.')+'</div>';return}
 const general=activeConversation()?.conversation_type==='general';
 const key=conversationId+'|'+q+'|'+(general?'g':'d')+'|'+visible.map(m=>[m.id,m.body||'',m.attachment_path||'',m.edited_at||'',m.deleted_at||'',m.reply_to||''].join(':')).join(';')+'|'+state.reactions.map(r=>[r.message_id,r.user_id,r.emoji].join(':')).join(';')+'|'+state.participants.map(p=>[p.user_id,p.last_read_at||''].join(':')).join(';');
 if(key===state.lastMessageRenderKey)return;
 const attachments=await Promise.all(visible.map(attachmentHtml));
 if(renderSeq!==state.messageRenderSeq||state.activeId!==conversationId)return;
 let html='',lastDay='';
 visible.forEach((m,i)=>{const day=dayLabel(m.created_at);if(day!==lastDay){html+='<div class="daySep">'+esc(day)+'</div>';lastDay=day}
  const mine=m.user_id===state.session?.user?.id,author=member(m.user_id),name=author?.display_name||m.display_name||'Utilisateur',canDelete=mine||state.canManage,canEdit=mine&&!m.deleted_at;
  const body=m.deleted_at?'<div class="messageDeleted">Message supprimé</div>':(m.body?'<div class="messageBody">'+esc(m.body)+'</div>':'');
  const sender=general?generalSenderHtml(author,name):(!mine?'<div class="messageSender">'+esc(name)+'</div>':'');
  html+='<div id="message-'+m.id+'" class="messageRow '+(mine?'mine':'')+' '+(general?'generalMessage':'')+'">'+(!mine?avatarHtml(author,'msgAvatar'):'')+'<div class="messageBlock">'+sender+
   '<div class="bubble" onclick="toggleMessageActions(event,\''+m.id+'\')">'+replyHtml(m)+body+attachments[i]+
   '<div class="messageMeta">'+(m.edited_at?'<span class="editedMark">modifié</span>':'')+'<span>'+esc(messageTime(m.created_at))+'</span>'+readTicks(m)+'</div>'+
   (!m.deleted_at?'<div class="msgActions"><button onclick="replyToMessage(event,\''+m.id+'\')" title="Répondre">↩</button><button onclick="openReactionPicker(event,\''+m.id+'\')" title="Réagir">♡</button>'+(canEdit?'<button onclick="editMessage(event,\''+m.id+'\')" title="Modifier">✎</button>':'')+(canDelete?'<button class="dangerAction" onclick="deleteMessage(event,\''+m.id+'\')" title="Supprimer">⌫</button>':'')+'</div>':'')+
   '</div>'+reactionsHtml(m.id)+'</div></div>'
 });
 if(renderSeq!==state.messageRenderSeq||state.activeId!==conversationId)return;
 state.lastMessageRenderKey=key;
 const wasNearBottom=box.scrollHeight-box.scrollTop-box.clientHeight<120;
 box.innerHTML=html;
 initVoiceMessages(box);
 if(!q&&(wasNearBottom||!box.dataset.rendered)){box.dataset.rendered='1';requestAnimationFrame(()=>box.scrollTop=box.scrollHeight)}
}
function toggleMessageActions(e,id){if(e.target.closest('button,a,img,video,audio'))return;const row=$('message-'+id);document.querySelectorAll('.messageRow.actionsOpen').forEach(x=>{if(x!==row)x.classList.remove('actionsOpen')});row?.classList.toggle('actionsOpen')}
function scrollToMessage(id){const el=$('message-'+id);if(!el)return;el.scrollIntoView({behavior:'smooth',block:'center'});el.animate([{filter:'brightness(1)'},{filter:'brightness(.88)'},{filter:'brightness(1)'}],{duration:700})}
function replyToMessage(e,id){e.stopPropagation();state.replyTo=state.messages.find(m=>String(m.id)===String(id))||null;state.editingId=null;renderComposeBanner();$('message').focus()}
function editMessage(e,id){e.stopPropagation();const m=state.messages.find(x=>String(x.id)===String(id));if(!m||m.user_id!==state.session.user.id||m.deleted_at)return;state.editingId=m.id;state.replyTo=null;$('message').value=m.body||'';autoGrow();renderComposeBanner();$('message').focus()}
function cancelComposeMode(){state.replyTo=null;state.editingId=null;renderComposeBanner()}
function renderComposeBanner(){const b=$('composeBanner');if(!b)return;if(state.editingId){b.classList.add('show');$('composeBannerTitle').textContent='Modifier le message';$('composeBannerText').textContent='Modifie ton texte puis envoie pour enregistrer.';return}if(state.replyTo){b.classList.add('show');$('composeBannerTitle').textContent='Répondre à '+(state.replyTo.user_id===state.session.user.id?'vous':(member(state.replyTo.user_id)?.display_name||state.replyTo.display_name||'Utilisateur'));$('composeBannerText').textContent=state.replyTo.body||state.replyTo.attachment_name||'Pièce jointe';return}b.classList.remove('show')}
function openReactionPicker(e,id){e.stopPropagation();const p=$('reactionPicker'),r=e.currentTarget.getBoundingClientRect();p.dataset.message=id;p.style.left=Math.max(8,Math.min(window.innerWidth-218,r.left-75))+'px';p.style.top=Math.max(8,r.top-48)+'px';p.classList.remove('hidden')}
function closeReactionPicker(){const p=$('reactionPicker');if(p)p.classList.add('hidden')}
async function pickReaction(emoji){const id=$('reactionPicker').dataset.message;closeReactionPicker();if(id)await toggleReaction(id,emoji)}
async function toggleReaction(id,emoji){const mine=state.reactions.find(r=>String(r.message_id)===String(id)&&r.user_id===state.session.user.id&&r.emoji===emoji);if(mine)await db.from('chat_reactions').delete().eq('message_id',id).eq('user_id',state.session.user.id).eq('emoji',emoji);else await db.from('chat_reactions').insert({message_id:id,user_id:state.session.user.id,emoji});await loadReactions();renderMessages()}
function selectAttachment(input){const f=input.files?.[0];if(!f)return;if(f.size>25*1024*1024){showToast('25 Mo maximum');input.value='';return}if(!attachmentAllowed(f)){showToast('Format non autorisé');input.value='';return}state.selectedFile=f;renderAttachmentPreview()}
function renderAttachmentPreview(){const p=$('attachPreview');if(!state.selectedFile){p.classList.remove('show');$('attachName').textContent='';return}p.classList.add('show');$('attachName').textContent=state.selectedFile.name+' • '+sizeLabel(state.selectedFile.size)}
function clearAttachment(){state.selectedFile=null;$('file').value='';renderAttachmentPreview()}
function autoGrow(){const ta=$('message');ta.style.height='40px';ta.style.height=Math.min(120,Math.max(40,ta.scrollHeight))+'px'}
let typingStopTimer=null,lastTypingSent=0;
function composerInput(){autoGrow();if(!state.typingChannel||!state.activeId)return;const now=Date.now();if(now-lastTypingSent>700){lastTypingSent=now;state.typingChannel.send({type:'broadcast',event:'typing',payload:{user_id:state.session.user.id,name:state.profile.display_name||'Utilisateur',typing:true}})}clearTimeout(typingStopTimer);typingStopTimer=setTimeout(()=>state.typingChannel?.send({type:'broadcast',event:'typing',payload:{user_id:state.session.user.id,name:state.profile.display_name||'Utilisateur',typing:false}}),1200)}
function handleKey(e){if(e.key==='Enter'&&!e.shiftKey&&window.innerWidth>780){e.preventDefault();sendMessage()}}
async function sendMessage(){
 if(!state.activeId)return;const ta=$('message'),body=ta.value.trim(),btn=$('sendBtn');
 if(state.editingId){if(!body)return;btn.disabled=true;const {error}=await db.from('chat_messages').update({body,edited_at:new Date().toISOString()}).eq('id',state.editingId).eq('user_id',state.session.user.id);btn.disabled=false;if(error)return showToast('Modification impossible');ta.value='';state.editingId=null;renderComposeBanner();autoGrow();await loadMessages();return}
 if(!body&&!state.selectedFile)return;btn.disabled=true;let path=null;
 try{
  let name=null,type=null,size=null;
  if(state.selectedFile){
   const ext=(state.selectedFile.name.split('.').pop()||'bin').replace(/[^a-z0-9]/gi,'').toLowerCase();
   path=state.session.user.id+'/'+state.activeId+'/'+Date.now()+'-'+crypto.randomUUID()+'.'+ext;
   const {error:up}=await db.storage.from('chat-files').upload(path,state.selectedFile,{upsert:false,contentType:state.selectedFile.type||undefined});if(up)throw up;
   name=state.selectedFile.name;type=state.selectedFile.type||'application/octet-stream';size=state.selectedFile.size
  }
  const payload={conversation_id:state.activeId,user_id:state.session.user.id,display_name:state.profile.display_name||'Utilisateur',body:body||null,attachment_path:path,attachment_name:name,attachment_type:type,attachment_size:size,reply_to:state.replyTo?.id||null};
  const {data:sent,error}=await db.from('chat_messages').insert(payload).select('id').single();if(error)throw error;try{await db.functions.invoke('planning-push',{body:{action:'chat-message',conversation_id:state.activeId,message_id:sent.id}})}catch(_){};
  ta.value='';state.replyTo=null;clearAttachment();renderComposeBanner();autoGrow();window.NettoSounds?.play?.('message');await Promise.all([loadMessages(),loadConversations()]);await markRead()
 }catch(err){if(path){try{await db.storage.from('chat-files').remove([path])}catch(_){}}console.error(err);showToast('Envoi impossible')}
 finally{btn.disabled=false}
}
async function deleteMessage(e,id){
 e.stopPropagation();
 const m=state.messages.find(x=>String(x.id)===String(id));if(!m)return;
 const isAdmin=state.profile?.role==='admin';
 if(!(m.user_id===state.session.user.id||state.canManage))return;
 const prompt=isAdmin?'Supprimer définitivement ce message ?\n\nCette action le fera disparaître complètement du chat.':'Supprimer ce message ?';
 if(!confirm(prompt))return;
 if(isAdmin){
  const {data:attachmentPath,error}=await db.rpc('chat_admin_delete_message',{p_message:Number(id)});
  if(error){console.error('Suppression définitive admin:',error);return showToast('Suppression impossible')}
  const path=attachmentPath||m.attachment_path;
  if(path){try{await db.storage.from('chat-files').remove([path])}catch(err){console.warn('Suppression pièce jointe:',err)}}
  window.NettoSounds?.play?.('delete');
  await Promise.all([loadMessages(),loadConversations()]);
  showToast('Message supprimé définitivement');
  return
 }
 const {error}=await db.from('chat_messages').update({body:null,deleted_at:new Date().toISOString(),attachment_name:null,attachment_type:null,attachment_size:null}).eq('id',id).eq('user_id',state.session.user.id);
 if(error)return showToast('Suppression impossible');
 if(m.attachment_path){try{await db.storage.from('chat-files').remove([m.attachment_path])}catch(_){}}
 window.NettoSounds?.play?.('delete');await loadMessages()
}
async function markRead(){if(!state.activeId)return;await db.rpc('chat_mark_read',{p_conversation:state.activeId});const c=activeConversation();if(c){c.unread_count=0;c.last_read_at=new Date().toISOString()}renderConversations();try{await db.from('planning_notifications').update({read_at:new Date().toISOString()}).eq('user_id',state.session.user.id).eq('kind','chat_message').eq('target_url','chat.html?c='+state.activeId).is('read_at',null)}catch(_){}}
function setupTypingChannel(){
 if(state.typingChannel){db.removeChannel(state.typingChannel);state.typingChannel=null}state.typing.clear();renderTyping();if(!state.activeId)return;
 state.typingChannel=db.channel('chat-typing-'+state.activeId,{config:{broadcast:{self:false}}}).on('broadcast',{event:'typing'},({payload})=>{
  if(!payload?.user_id||payload.user_id===state.session.user.id)return;
  clearTimeout(state.typing.get(payload.user_id)?.timer);
  if(payload.typing){const timer=setTimeout(()=>{state.typing.delete(payload.user_id);renderTyping()},2200);state.typing.set(payload.user_id,{name:payload.name||member(payload.user_id)?.display_name||'Quelqu’un',timer})}else state.typing.delete(payload.user_id);renderTyping()
 }).subscribe()
}
function renderTyping(){const el=$('typingLine');if(!el)return;const names=[...state.typing.values()].map(x=>x.name);el.textContent=names.length?(names.slice(0,2).join(', ')+(names.length>2?' et '+(names.length-2)+' autre(s)':'')+' écrit'+(names.length>1?'vent':'')+'…'):''}
async function toggleRecording(){
 if(state.recording){state.recording.recorder.stop();return}
 if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){showToast('Enregistrement vocal non compatible');return}
 try{
  const stream=await navigator.mediaDevices.getUserMedia({audio:true}),chunks=[],recorder=new MediaRecorder(stream);
  const started=Date.now();state.recording={recorder,stream,started};$('micBtn').classList.add('recording');$('micBtn').textContent='■';
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  recorder.onstop=()=>{const type=recorder.mimeType||'audio/webm',blob=new Blob(chunks,{type}),ext=type.includes('ogg')?'ogg':type.includes('mp4')?'m4a':'webm';state.selectedFile=new File([blob],'Vocal-'+new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}).replace(':','h')+'.'+ext,{type});stream.getTracks().forEach(t=>t.stop());state.recording=null;$('micBtn').classList.remove('recording');$('micBtn').textContent='🎙';renderAttachmentPreview();window.NettoSounds?.play?.('confirm')};
  recorder.start();showToast('Enregistrement vocal…')
 }catch(e){showToast('Microphone inaccessible')}
}

async function renderDesktopDetails(){
 const box=$('chatDetailsContent');if(!box)return;
 const conv=activeConversation();
 if(!conv){box.innerHTML='<div class="detailsEmpty"><img src="assets/logo-chat.svg" alt=""><strong>Informations</strong><span>Sélectionne une discussion pour afficher ses détails.</span></div>';return}
 const currentId=conv.conversation_id,direct=conversationMember(conv),isDirect=conv.conversation_type==='direct',isGeneral=conv.conversation_type==='general',isGroup=conv.conversation_type==='group';
 const title=conversationTitle(conv),presence=conversationPresence(conv),ids=(conv.member_ids||[]).filter(Boolean),people=ids.map(member).filter(Boolean);
 const hero=isDirect&&direct?avatarHtml(direct,'activeAvatar'):conversationAvatar(conv,true);
 const role=isDirect&&direct?roleLabel(direct.role):(isGeneral?'Canal général':'Groupe');
 const canAdd=!isGeneral&&(isDirect||(isGroup&&(conv.created_by===state.session?.user?.id||state.profile?.role==='admin')));
 const canArchive=!(isGeneral&&state.profile?.role!=='admin');
 const media=state.messages.filter(m=>!m.deleted_at&&m.attachment_path&&/^(image|video)\//.test(m.attachment_type||''));
 const files=state.messages.filter(m=>!m.deleted_at&&m.attachment_path&&!/^(image|video)\//.test(m.attachment_type||''));
 box.innerHTML='<div class="detailsHero">'+hero+'<h2>'+esc(title)+'</h2><span class="detailsRole">'+esc(role)+'</span><p>'+esc(presence)+'</p></div>'+
  '<div class="detailsActions detailsActionsCompact">'+
   '<button class="detailsAction" type="button" onclick="toggleMessageSearch()"><span class="detailsActionIcon"><svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 4 4"/></svg></span><span>Rechercher</span></button>'+
   (canAdd?'<button class="detailsAction" type="button" onclick="openAddMembersFromConversation()"><span class="detailsActionIcon"><svg viewBox="0 0 24 24"><circle cx="9" cy="9" r="3"/><path d="M3.5 19c.8-3.4 2.7-5 5.5-5"/><path d="M18 7v7M14.5 10.5h7"/></svg></span><span>Ajouter</span></button>':'')+
  '</div>'+
  '<details class="detailsSection" open><summary>Informations sur la discussion</summary><div class="detailsSectionBody">'+
   '<button class="detailsRow" type="button" onclick="'+(isDirect&&direct?'openContactCard(\''+direct.id+'\')':'openConversationParticipants()')+'"><span class="detailsRowIcon">👥</span><span class="detailsRowCopy"><strong>'+(isDirect?'Profil du contact':'Participants')+'</strong><small>'+esc(isDirect?presence:(people.length+' membre'+(people.length>1?'s':'')))+'</small></span><span>›</span></button>'+
   '<button class="detailsRow" type="button" onclick="openConversationInfo()"><span class="detailsRowIcon">⚙</span><span class="detailsRowCopy"><strong>Paramètres de la discussion</strong><small>Notifications'+(isGroup?' et gestion du groupe':'')+'</small></span><span>›</span></button>'+
  '</div></details>'+
  '<details class="detailsSection" open><summary>Fichiers et contenus multimédias</summary><div class="detailsSectionBody">'+
   '<button class="detailsRow" type="button" onclick="openAttachmentBrowser(\'media\')"><span class="detailsRowIcon">▧</span><span class="detailsRowCopy"><strong>Photos et vidéos</strong><small>'+media.length+' élément'+(media.length>1?'s':'')+'</small></span><span>›</span></button>'+
   '<button class="detailsRow" type="button" onclick="openAttachmentBrowser(\'files\')"><span class="detailsRowIcon">▤</span><span class="detailsRowCopy"><strong>Fichiers et audios</strong><small>'+files.length+' élément'+(files.length>1?'s':'')+'</small></span><span>›</span></button>'+
   '<div id="detailsMediaPreview" class="detailsMediaGrid"></div>'+
  '</div></details>'+
  (canArchive?'<details class="detailsSection"><summary>Actions</summary><div class="detailsSectionBody"><button class="detailsRow" type="button" onclick="desktopArchiveActive()"><span class="detailsRowIcon">▣</span><span class="detailsRowCopy"><strong>Archiver la conversation</strong><small>La conserver hors de la liste principale</small></span><span>›</span></button></div></details>':'');
 if(state.activeId!==currentId)return;
 const previewBox=$('detailsMediaPreview');if(!previewBox||!media.length)return;
 const latest=media.slice(-6).reverse(),thumbs=await Promise.all(latest.map(async m=>{
  const url=await signed(m.attachment_path);if(!url)return'';
  if((m.attachment_type||'').startsWith('image/'))return'<button class="detailsMediaThumb" type="button" onclick="openImage(\''+esc(url)+'\')"><img src="'+esc(url)+'" alt=""></button>';
  return'<button class="detailsMediaThumb" type="button" onclick="openAttachmentBrowser(\'media\')">▶</button>'
 }));
 if(state.activeId===currentId&&previewBox)previewBox.innerHTML=thumbs.join('')
}
async function openAttachmentBrowser(kind){
 const modal=$('infoModal'),box=$('infoContent'),title=$('infoTitle');if(!modal||!box)return;
 const media=kind==='media';
 const list=state.messages.filter(m=>!m.deleted_at&&m.attachment_path&&(media?/^(image|video)\//.test(m.attachment_type||''):! /^(image|video)\//.test(m.attachment_type||'')));
 if(title)title.textContent=media?'Photos et vidéos':'Fichiers et audios';
 modal.classList.remove('hidden');
 if(!list.length){box.innerHTML='<div class="listEmpty">Aucun élément dans cette conversation.</div>';return}
 box.innerHTML='<div class="infoSection"><div class="infoMembers">'+(await Promise.all(list.slice().reverse().map(async m=>{
  const url=await signed(m.attachment_path),name=esc(m.attachment_name||'Pièce jointe');if(!url)return'';
  if((m.attachment_type||'').startsWith('image/'))return'<button class="infoRow contactInfoRow" type="button" onclick="openImage(\''+esc(url)+'\')"><span class="pickAvatar" style="background:#eef0f2;overflow:hidden"><img src="'+esc(url)+'" alt="" style="width:100%;height:100%;object-fit:cover"></span><div><strong>'+name+'</strong><small>'+esc(sizeLabel(m.attachment_size))+'</small></div><span>›</span></button>';
  return'<a class="infoRow contactInfoRow" href="'+esc(url)+'" target="_blank" rel="noopener" style="text-decoration:none;color:inherit"><span class="pickAvatar">📎</span><div><strong>'+name+'</strong><small>'+esc(sizeLabel(m.attachment_size))+'</small></div><span>›</span></a>'
 }))).join('')+'</div></div>'
}
function desktopArchiveActive(){if(!state.activeId)return;state.actionConversationId=state.activeId;actionSheetArchive()}
function toggleMessageSearch(){const b=$('messageSearchBar');b.classList.toggle('show');if(b.classList.contains('show'))setTimeout(()=>$('messageSearchInput').focus(),30);else{state.messageSearch='';$('messageSearchInput').value='';renderMessages()}}
function searchMessages(v){state.messageSearch=v;renderMessages()}
function openImage(url){$('lightboxImage').src=url;$('imageLightbox').classList.remove('hidden')}
function closeImage(e){if(e&&e.target!==$('imageLightbox')&&!e.target.closest('.lightboxClose'))return;$('imageLightbox').classList.add('hidden');$('lightboxImage').src=''}
function positionFloatingMenu(menu,btn){
 menu.classList.remove('hidden');menu.style.visibility='hidden';
 requestAnimationFrame(()=>{
  const r=btn.getBoundingClientRect(),w=menu.offsetWidth,h=menu.offsetHeight;
  let left=Math.min(window.innerWidth-w-8,Math.max(8,r.right-w)),top=r.bottom+9;
  if(top+h>window.innerHeight-8)top=Math.max(8,r.top-h-9);
  menu.style.left=left+'px';menu.style.top=top+'px';menu.style.visibility='visible'
 })
}
function toggleDiscussionMenu(e){
 e?.stopPropagation?.();closeConversationMenu();const menu=$('discussionMenu'),btn=e?.currentTarget;if(!menu||!btn)return;
 if(!menu.classList.contains('hidden')){closeDiscussionMenu();return}
 positionFloatingMenu(menu,btn)
}
function closeDiscussionMenu(){const m=$('discussionMenu');if(!m)return;m.classList.add('hidden');m.style.visibility=''}
function toggleConversationMenu(e){
 e?.stopPropagation?.();closeDiscussionMenu();const menu=$('conversationMenu'),btn=e?.currentTarget,c=activeConversation();if(!menu||!btn||!c)return;
 if(!menu.classList.contains('hidden')){closeConversationMenu();return}
 configureConversationMenu(c);positionFloatingMenu(menu,btn)
}
function closeConversationMenu(){const m=$('conversationMenu');if(!m)return;m.classList.add('hidden');m.style.visibility=''}
function closeAllChatMenus(){closeDiscussionMenu();closeConversationMenu()}
function configureConversationMenu(c){
 const isGeneral=c.conversation_type==='general',isGroup=c.conversation_type==='group',isDirect=c.conversation_type==='direct';
 const creator=c.created_by===state.session?.user?.id,admin=state.profile?.role==='admin',canManageGroup=isGroup&&(creator||admin),canDeleteConversation=canManageGroup||(isGeneral&&admin);
 const myParticipant=state.participants.find(p=>p.user_id===state.session?.user?.id);
 const subtitle=$('conversationMenuSubtitle');if(subtitle)subtitle.textContent=isGeneral?'Canal de toute l’équipe':isDirect?'Discussion privée':((c.member_ids||[]).length+' membre(s)');
 $('conversationAddMembersItem')?.classList.toggle('hidden',isGeneral||(isGroup&&!canManageGroup));
 const hint=$('conversationAddMembersHint');if(hint)hint.textContent=isDirect?'Créer un groupe avec ce contact':'Ajouter au groupe';
 $('conversationSettingsItem')?.classList.toggle('hidden',!canManageGroup);
 $('conversationDeleteItem')?.classList.toggle('hidden',!canDeleteConversation);
 const deleteLabel=$('conversationDeleteLabel'),deleteHint=$('conversationDeleteHint');
 if(deleteLabel)deleteLabel.textContent=isGeneral?'Supprimer le canal':'Supprimer le groupe';
 if(deleteHint)deleteHint.textContent=isGeneral?'Administrateur uniquement':'Réservé au créateur ou administrateur';
 $('conversationLeaveItem')?.classList.toggle('hidden',!isGroup||canManageGroup||myParticipant?.role==='owner');
 $('conversationDangerDivider')?.classList.toggle('hidden',!(canDeleteConversation||(isGroup&&!canManageGroup&&myParticipant?.role!=='owner')))
}
function openConversationParticipants(){
 closeConversationMenu();const c=activeConversation();if(!c)return;
 const box=$('contactCardContent'),modal=$('contactModal');if(!box||!modal)return;
 const ids=(c.member_ids||[]).filter(Boolean),members=ids.map(member).filter(Boolean);
 box.innerHTML='<div class="contactHero">'+conversationAvatar(c,true)+'<h3>'+esc(conversationTitle(c))+'</h3><span class="contactRole">'+esc(c.conversation_type==='general'?'Canal général':c.conversation_type==='group'?'Groupe':'Discussion privée')+'</span><span class="contactPresence">'+esc(conversationPresence(c))+'</span></div>'+
 '<div class="infoSection"><div class="infoSectionTitle">Participants · '+members.length+'</div><div class="infoMembers">'+members.map(m=>'<button class="infoRow contactInfoRow" type="button" onclick="openContactCard(\''+m.id+'\')">'+avatarHtml(m,'pickAvatar')+'<div><strong>'+esc(m.display_name||'Utilisateur')+(m.id===state.session?.user?.id?' · Vous':'')+'</strong><small>'+esc(roleLabel(m.role))+' · '+esc(contactPresence(m.id))+'</small></div><span>›</span></button>').join('')+'</div></div>';
 modal.classList.remove('hidden')
}
function openConversationInfoFromManageMenu(){closeConversationMenu();openConversationInfo()}
function leaveGroupFromMenu(){closeConversationMenu();leaveGroup()}
function deleteConversationFromMenu(){closeConversationMenu();deleteConversation()}
function openAddMembersFromConversation(){
 closeConversationMenu();const c=activeConversation();if(!c||c.conversation_type==='general')return;
 state.addMemberSelection.clear();
 $('addMembersSearch').value='';
 $('addMembersSubtitle').textContent=c.conversation_type==='direct'?'Les membres ajoutés formeront un nouveau groupe.':'Sélectionne une ou plusieurs personnes à ajouter au groupe.';
 $('addMembersSubmit').textContent=c.conversation_type==='direct'?'Créer le groupe':'Ajouter au groupe';
 renderAddMembersList();$('addMembersModal').classList.remove('hidden')
}
function closeAddMembersModal(){$('addMembersModal')?.classList.add('hidden');state.addMemberSelection.clear()}
function renderAddMembersList(){
 const box=$('addMembersList'),c=activeConversation();if(!box||!c)return;
 const q=($('addMembersSearch')?.value||'').trim().toLowerCase();
 const existing=new Set(c.member_ids||[]);
 const list=state.members.filter(m=>m.id!==state.session?.user?.id&&!existing.has(m.id)&&(!q||(m.display_name||'').toLowerCase().includes(q)||roleLabel(m.role).toLowerCase().includes(q)));
 if(!list.length){box.innerHTML='<div class="listEmpty">'+(q?'Aucun membre trouvé.':'Tous les membres disponibles sont déjà présents.')+'</div>';return}
 box.innerHTML=list.map(m=>{const selected=state.addMemberSelection.has(m.id);return '<button class="pickMember '+(selected?'selected':'')+'" type="button" onclick="toggleAddMemberSelection(\''+m.id+'\')">'+avatarHtml(m,'pickAvatar')+'<span><strong>'+esc(m.display_name||'Utilisateur')+'</strong><small>'+esc(roleLabel(m.role))+(state.onlineIds.has(m.id)?' · En ligne':'')+'</small></span><i class="pickCheck">✓</i></button>'}).join('')
}
function toggleAddMemberSelection(id){state.addMemberSelection.has(id)?state.addMemberSelection.delete(id):state.addMemberSelection.add(id);renderAddMembersList()}
async function saveAddedMembers(){
 const c=activeConversation();if(!c||!state.addMemberSelection.size)return showToast('Sélectionne au moins un membre');
 const btn=$('addMembersSubmit');btn.disabled=true;
 try{
  if(c.conversation_type==='direct'){
   const other=(c.member_ids||[]).find(id=>id!==state.session.user.id);
   const ids=[other,...state.addMemberSelection].filter(Boolean);
   const names=ids.map(id=>member(id)?.display_name).filter(Boolean);
   const groupName=names.slice(0,3).join(', ')+(names.length>3?'…':'');
   const {data,error}=await db.rpc('create_chat_conversation',{p_type:'group',p_name:groupName||'Nouveau groupe',p_member_ids:ids});
   if(error)throw error;
   closeAddMembersModal();await loadConversations();await openConversation(data,{showMobile:true});showToast('Groupe créé')
  }else if(c.conversation_type==='group'){
   const creator=c.created_by===state.session.user.id,admin=state.profile?.role==='admin';if(!creator&&!admin)throw new Error('not allowed');
   const ids=[...new Set([...(c.member_ids||[]),...state.addMemberSelection])];
   const {error}=await db.rpc('chat_update_group',{p_conversation:c.conversation_id,p_name:c.conversation_name||'Groupe',p_member_ids:ids});
   if(error)throw error;
   closeAddMembersModal();await Promise.all([loadConversations(),loadParticipants()]);renderConversationHeader();showToast('Membres ajoutés')
  }
 }catch(err){console.error('Ajout membres:',err);showToast('Ajout impossible')}
 finally{btn.disabled=false}
}
async function markAllRead(){
 closeDiscussionMenu();
 const {error}=await db.rpc('chat_mark_all_read');
 if(error){console.error(error);return showToast('Impossible de marquer les discussions comme lues')}
 state.conversations.forEach(x=>{x.unread_count=0;x.last_read_at=new Date().toISOString()});
 renderConversations();showToast('Toutes les discussions sont marquées comme lues')
}
function toggleUnreadOnly(){
 closeDiscussionMenu();state.onlyUnread=!state.onlyUnread;
 $('unreadOnlyBtn')?.classList.toggle('active',state.onlyUnread);
 renderConversations();
 showToast(state.onlyUnread?'Discussions non lues uniquement':'Toutes les discussions affichées')
}
async function refreshChat(){closeDiscussionMenu();await Promise.all([loadMembers(),loadConversations()]);if(state.activeId)await Promise.all([loadParticipants(),loadMessages()]);showToast('Discussions actualisées')}
async function openChatArchives(){
 closeDiscussionMenu();$('archivesModal')?.classList.remove('hidden');
 const box=$('archivesList');if(box)box.innerHTML='<div class="listEmpty">Chargement…</div>';
 const {data,error}=await db.rpc('list_my_archived_chat_conversations');
 if(error){console.error(error);if(box)box.innerHTML='<div class="listEmpty">Archives indisponibles.</div>';return}
 state.archives=data||[];
 if(state.profile?.role==='admin'){
  $('adminArchiveSection')?.classList.remove('hidden');
  const {data:adminData,error:adminError}=await db.rpc('list_chat_archives');
  state.adminArchives=adminError?[]:(adminData||[])
 }else{$('adminArchiveSection')?.classList.add('hidden');state.adminArchives=[]}
 renderChatArchives()
}
function closeChatArchives(){$('archivesModal')?.classList.add('hidden')}
function archiveAvatar(a){
 if(a.conversation_type==='direct'){const other=(a.member_ids||[]).find(id=>id!==state.session?.user?.id);return avatarHtml(member(other),'archiveRowAvatar')}
 if(a.conversation_type==='general')return '<div class="archiveRowAvatar"><img src="assets/logo-chat.svg" alt=""></div>';
 return '<div class="archiveRowAvatar">'+esc(initials(conversationTitle(a)))+'</div>'
}
function renderChatArchives(){
 const box=$('archivesList');if(box){
  box.innerHTML=state.archives.length?state.archives.map(a=>'<div class="archiveRow">'+archiveAvatar(a)+'<div><strong>'+esc(conversationTitle(a))+'</strong><small>'+esc(a.last_message||'Conversation archivée')+' · '+esc(timeShort(a.last_message_at||a.archived_at))+'</small></div><div class="archiveActions"><button class="archiveRestore" type="button" onclick="restorePersonalArchivedConversation(\''+a.conversation_id+'\')">Restaurer</button></div></div>').join(''):'<div class="listEmpty">Aucune conversation archivée.</div>'
 }
 const adminBox=$('adminArchivesList');if(adminBox&&state.profile?.role==='admin'){
  adminBox.innerHTML=state.adminArchives.length?state.adminArchives.map(a=>'<div class="archiveRow"><div class="archiveRowAvatar">'+esc(initials(a.conversation_name||'Groupe'))+'</div><div><strong>'+esc(a.conversation_name||a.conversation_type||'Conversation')+'</strong><small>'+Number(a.member_count||0)+' membre(s) · '+Number(a.message_count||0)+' message(s) · '+new Date(a.archived_at).toLocaleString('fr-FR')+'</small></div><div class="archiveActions"><button class="archiveRestore" type="button" onclick="restoreAdminArchivedConversation(\''+a.conversation_id+'\')">Restaurer</button></div></div>').join(''):'<div class="listEmpty">Aucune archive administrateur.</div>'
 }
}
async function restorePersonalArchivedConversation(id){
 if(!await setPersonalConversationState(id,'restore'))return;showToast('Conversation restaurée');await Promise.all([openChatArchives(),loadConversations()])
}
async function restoreAdminArchivedConversation(id){
 if(state.profile?.role!=='admin')return;const {error}=await db.rpc('chat_restore_conversation',{p_conversation:id});
 if(error){console.error(error);return showToast('Restauration impossible')}
 showToast('Conversation restaurée');await Promise.all([openChatArchives(),loadConversations()])
}
function openNewChat(){state.newMode='direct';state.groupMembers.clear();$('newChatSearch').value='';$('groupName').value='';$('newChatModal').classList.remove('hidden');setNewChatMode('direct')}
function closeNewChat(){ $('newChatModal').classList.add('hidden') }
function setNewChatMode(mode){state.newMode=mode;document.querySelectorAll('[data-chat-mode]').forEach(b=>b.classList.toggle('active',b.dataset.chatMode===mode));$('groupName').classList.toggle('hidden',mode!=='group');$('createGroupBtn').classList.toggle('hidden',mode!=='group');renderNewChatMembers()}
function renderNewChatMembers(){
 const box=$('newChatMembers');if(!box||!state.session)return;const q=($('newChatSearch')?.value||'').trim().toLowerCase();
 const list=state.members.filter(m=>m.id!==state.session.user.id&&(!q||(m.display_name||'').toLowerCase().includes(q)||roleLabel(m.role).toLowerCase().includes(q)));
 if(!list.length){box.innerHTML='<div class="listEmpty">Aucun membre trouvé.</div>';return}
 box.innerHTML=list.map(m=>{const selected=state.groupMembers.has(m.id);return '<button class="pickMember '+(selected?'selected':'')+'" onclick="'+(state.newMode==='direct'?'openDirect(\''+m.id+'\')':'toggleGroupMember(\''+m.id+'\')')+'">'+avatarHtml(m,'pickAvatar')+'<span><strong>'+esc(m.display_name||'Utilisateur')+'</strong><small>'+esc(roleLabel(m.role))+(state.onlineIds.has(m.id)?' · En ligne':'')+'</small></span>'+(state.newMode==='group'?'<i class="pickCheck">✓</i>':'<span>›</span>')+'</button>'}).join('')
}
function toggleGroupMember(id){state.groupMembers.has(id)?state.groupMembers.delete(id):state.groupMembers.add(id);renderNewChatMembers()}
async function openDirect(id){const {data,error}=await db.rpc('create_chat_conversation',{p_type:'direct',p_name:null,p_member_ids:[id]});if(error){console.error(error);return showToast('Création impossible')}await db.rpc('chat_set_user_conversation_state',{p_conversation:data,p_action:'restore'});closeNewChat();await loadConversations();await openConversation(data,{showMobile:true})}
async function createGroup(){const name=$('groupName').value.trim();if(!name)return showToast('Donne un nom au groupe');if(!state.groupMembers.size)return showToast('Ajoute au moins un membre');const btn=$('createGroupBtn');btn.disabled=true;const {data,error}=await db.rpc('create_chat_conversation',{p_type:'group',p_name:name,p_member_ids:[...state.groupMembers]});btn.disabled=false;if(error){console.error(error);return showToast('Création impossible')}closeNewChat();await loadConversations();await openConversation(data,{showMobile:true})}
function infoMemberRow(p){const m=member(p.user_id)||{id:p.user_id,display_name:'Utilisateur'};return '<button type="button" class="infoRow contactInfoRow" onclick="openContactCard(\''+m.id+'\')">'+avatarHtml(m,'pickAvatar')+'<div><strong>'+esc(m.display_name||'Utilisateur')+(p.user_id===state.session.user.id?' · Vous':'')+'</strong><small>'+esc(roleLabel(m.role))+' · '+esc(contactPresence(m.id))+'</small></div>'+(p.role==='owner'?'<span style="font-size:8px;color:#e34b27;font-weight:900">CRÉATEUR</span>':'<span>›</span>')+'</button>'}
function openConversationInfo(){const c=activeConversation();if(!c)return;$('infoModal').classList.remove('hidden');renderConversationInfo()}
function closeConversationInfo(){$('infoModal').classList.add('hidden')}
function renderConversationInfo(){
 const c=activeConversation(),box=$('infoContent');if(!c||!box)return;const mine=state.participants.find(p=>p.user_id===state.session.user.id),canGroupManage=c.conversation_type==='group'&&(c.created_by===state.session.user.id||state.profile.role==='admin');
 let html='<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">'+conversationAvatar(c,true)+'<div><strong style="font-size:15px">'+esc(conversationTitle(c))+'</strong><small style="display:block;margin-top:3px;color:#858b93;font-size:9px">'+esc(conversationPresence(c))+'</small></div></div>';
 html+='<label class="infoToggle"><span>Mettre les notifications en sourdine</span><input type="checkbox" '+(mine?.muted?'checked':'')+' onchange="setMuted(this.checked)"></label>';
 if(canGroupManage)html+='<div class="infoSection"><div class="infoSectionTitle">Nom du groupe</div><input id="infoGroupName" class="groupNameInput" value="'+esc(c.conversation_name||'')+'" maxlength="80"></div><div class="infoSection"><div class="infoSectionTitle">Membres du groupe</div><div class="modalMembers">'+state.members.filter(m=>m.id!==state.session.user.id).map(m=>{const selected=state.participants.some(p=>p.user_id===m.id);return '<button class="pickMember '+(selected?'selected':'')+'" onclick="this.classList.toggle(\'selected\')" data-info-member="'+m.id+'">'+avatarHtml(m,'pickAvatar')+'<span><strong>'+esc(m.display_name||'Utilisateur')+'</strong><small>'+esc(roleLabel(m.role))+'</small></span><i class="pickCheck">✓</i></button>'}).join('')+'</div><button class="modalAction" onclick="saveGroupInfo()">Enregistrer le groupe</button></div>';
 else html+='<div class="infoSection"><div class="infoSectionTitle">Participants</div><div class="infoMembers">'+state.participants.map(infoMemberRow).join('')+'</div></div>';
 if(c.conversation_type==='group'){if(canGroupManage)html+='<div class="infoHint">Le créateur peut renommer le groupe, ajouter ou retirer des membres et le supprimer visuellement. Une suppression est conservée dans les archives administrateur.</div><button class="infoDanger" onclick="deleteConversation()">Supprimer le groupe</button>';else if(mine?.role!=='owner')html+='<button class="infoDanger" onclick="leaveGroup()">Quitter le groupe</button>'}
 box.innerHTML=html
}
async function setMuted(v){const {error}=await db.rpc('chat_set_muted',{p_conversation:state.activeId,p_muted:!!v});if(error)showToast('Impossible de modifier ce réglage');else{const p=state.participants.find(x=>x.user_id===state.session.user.id);if(p)p.muted=!!v;showToast(v?'Notifications en sourdine':'Notifications réactivées')}}
async function saveGroupInfo(){const name=$('infoGroupName')?.value.trim();if(!name)return showToast('Nom du groupe requis');const ids=[...document.querySelectorAll('[data-info-member].selected')].map(x=>x.dataset.infoMember);const {error}=await db.rpc('chat_update_group',{p_conversation:state.activeId,p_name:name,p_member_ids:ids});if(error){console.error(error);return showToast('Modification impossible')}showToast('Groupe mis à jour');await Promise.all([loadConversations(),loadParticipants()]);renderConversationHeader();renderConversationInfo()}
async function deleteConversation(){
 const conv=activeConversation();if(!conv)return;
 const creator=conv.created_by===state.session?.user?.id,admin=state.profile?.role==='admin',isGeneral=conv.conversation_type==='general';
 if(isGeneral&&!admin)return showToast('Seul un administrateur peut supprimer le canal Général');
 if(!isGeneral&&!creator&&!admin)return showToast('Seul le créateur du groupe peut le supprimer');
 const label=isGeneral?'canal Général':'groupe';
 if(!confirm('Supprimer visuellement ce '+label+' ?\n\nIl sera retiré des discussions. L’administrateur en conservera une trace dans les archives.'))return;
 const conversationId=state.activeId;
 const {error}=await db.rpc('chat_archive_conversation',{p_conversation:conversationId});
 if(error){console.error('Archivage conversation:',error);return showToast('Suppression impossible')}
 closeConversationInfo();state.activeId=null;state.messages=[];state.participants=[];document.body.classList.remove('mobileConversationOpen');history.replaceState(null,'','chat.html');
 await loadConversations();renderConversationHeader();renderMessages();showToast(isGeneral?'Canal Général supprimé des discussions':'Groupe supprimé des discussions')
}
async function leaveGroup(){if(!confirm('Quitter ce groupe ?'))return;const {error}=await db.rpc('chat_leave_conversation',{p_conversation:state.activeId});if(error)return showToast(error.message.includes('owner')?'Le créateur doit supprimer le groupe':'Action impossible');closeConversationInfo();state.activeId=null;document.body.classList.remove('mobileConversationOpen');history.replaceState(null,'','chat.html');await loadConversations();renderConversationHeader();renderMessages()}
function startRealtime(){
 if(state.dataChannel)return;
 let msgTimer=null,partTimer=null,convTimer=null,reactTimer=null;
 const conversationFromPayload=payload=>payload?.new?.conversation_id||payload?.old?.conversation_id||null;
 const onMessages=payload=>{const changedConversation=conversationFromPayload(payload);clearTimeout(msgTimer);msgTimer=setTimeout(async()=>{await loadConversations();if(state.activeId&&(!changedConversation||changedConversation===state.activeId)){await Promise.all([loadParticipants(),loadMessages()]);await markRead()}},120)};
 const onParticipants=payload=>{const changedConversation=conversationFromPayload(payload);clearTimeout(partTimer);partTimer=setTimeout(async()=>{await loadConversations();if(state.activeId&&(!changedConversation||changedConversation===state.activeId)){await loadParticipants();await renderMessages();renderConversationHeader()}},140)};
 const onConversations=()=>{clearTimeout(convTimer);convTimer=setTimeout(async()=>{await loadConversations();renderConversationHeader()},140)};
 const onReactions=payload=>{clearTimeout(reactTimer);reactTimer=setTimeout(async()=>{if(state.activeId){await loadReactions();await renderMessages()}},100)};
 state.dataChannel=db.channel('nethor-chat-v2-data')
  .on('postgres_changes',{event:'*',schema:'public',table:'chat_messages'},onMessages)
  .on('postgres_changes',{event:'*',schema:'public',table:'chat_reactions'},onReactions)
  .on('postgres_changes',{event:'*',schema:'public',table:'chat_conversations'},onConversations)
  .on('postgres_changes',{event:'*',schema:'public',table:'chat_participants'},onParticipants)
  .subscribe()
}
function startMemberRealtime(){if(state.memberChannel)return;state.memberChannel=db.channel('nethor-chat-members').on('postgres_changes',{event:'UPDATE',schema:'public',table:'profiles'},()=>loadMembers()).subscribe()}
document.addEventListener('click',e=>{if(!e.target.closest('#reactionPicker')&&!e.target.closest('.msgActions'))closeReactionPicker();if(!e.target.closest('.messageRow'))document.querySelectorAll('.messageRow.actionsOpen').forEach(x=>x.classList.remove('actionsOpen'));if(!e.target.closest('#discussionMenu')&&!e.target.closest('#chatMenuListBtn'))closeDiscussionMenu();if(!e.target.closest('#conversationMenu')&&!e.target.closest('#conversationMenuBtn'))closeConversationMenu()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeReactionPicker();closeAllChatMenus();$('newChatModal')?.classList.add('hidden');$('infoModal')?.classList.add('hidden');$('archivesModal')?.classList.add('hidden');$('contactModal')?.classList.add('hidden');$('addMembersModal')?.classList.add('hidden');$('conversationActionSheet')?.classList.add('hidden');$('imageLightbox')?.classList.add('hidden')}});
window.addEventListener('resize',()=>{if(window.innerWidth>780&&state.activeId)document.body.classList.add('mobileConversationOpen')},{passive:true});
async function boot(){
 const {data:{session}}=await db.auth.getSession();state.session=session;if(!session){location.replace('index.html');return}
 const {data:p,error}=await db.from('profiles').select('display_name,email,role,avatar_path,profile_color,avatar_frame').eq('id',session.user.id).maybeSingle();if(error||!p){location.replace('index.html');return}
 state.profile=p;window.currentRole=p.role;await window.NettoProfileUI?.refresh?.();const permission=window.NettoProfileUI?.permissionLevel?.('chat',p)||'none';if(permission==='none'){location.replace('home.html');return}state.canManage=permission==='manage';
 await loadMembers();startPresence();await loadConversations();startRealtime();startMemberRealtime();
 const requested=new URLSearchParams(location.search).get('c'),general=state.conversations.find(c=>c.conversation_type==='general')?.conversation_id,initial=(requested&&state.conversations.some(c=>c.conversation_id===requested))?requested:general;
 if(initial)await openConversation(initial,{showMobile:!!requested||window.innerWidth>780});else{renderConversationHeader();renderMessages()}
 window.addEventListener('focus',async()=>{await Promise.all([loadMembers(),loadConversations()]);if(state.activeId)await markRead()})
}
boot();