const SUPABASE_URL='https://gioxrpaiwogqqtakjpnv.supabase.co';
const SUPABASE_KEY='sb_publishable_nJPMS-Z_20ng1aMJmufbmg_gWFFndrC';
const db=supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const state={
 session:null,profile:null,canManage:false,members:[],onlineIds:new Set(),conversations:[],activeId:null,
 messages:[],participants:[],reactions:[],selectedFile:null,replyTo:null,editingId:null,newMode:'direct',
 groupMembers:new Set(),typing:new Map(),typingChannel:null,dataChannel:null,memberChannel:null,recording:null,
 signedCache:new Map(),search:'',messageSearch:''
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
function roleLabel(role){return window.NettoProfileUI?.roleLabel?.(role)||({admin:'Administrateur',responsable:'Responsable',employe:'Employé',lecture:'Lecture seule'}[role]||role||'Utilisateur')}
function showToast(message){let t=$('chatToast');if(!t){t=document.createElement('div');t.id='chatToast';t.className='toast';document.body.appendChild(t)}t.textContent=message;t.classList.remove('show');requestAnimationFrame(()=>t.classList.add('show'));clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.classList.remove('show'),2200)}
function timeShort(v){if(!v)return'';const d=new Date(v),n=new Date();if(d.toDateString()===n.toDateString())return d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});return d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})}
function messageTime(v){return new Date(v).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
function dayLabel(v){const d=new Date(v),n=new Date(),y=new Date(n);y.setDate(n.getDate()-1);if(d.toDateString()===n.toDateString())return"Aujourd’hui";if(d.toDateString()===y.toDateString())return"Hier";return d.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}
function sizeLabel(n){n=Number(n)||0;if(n<1024)return n+' o';if(n<1048576)return(n/1024).toFixed(1).replace('.',',')+' Ko';return(n/1048576).toFixed(1).replace('.',',')+' Mo'}
function attachmentAllowed(file){const ext=(file?.name?.split('.').pop()||'').toLowerCase();return ALLOWED_EXT.has(ext)&&(!file.type||ALLOWED_MIME.has(file.type))}
async function signed(path){if(!path)return null;const cached=state.signedCache.get(path);if(cached&&cached.exp>Date.now())return cached.url;const {data}=await db.storage.from('chat-files').createSignedUrl(path,3600);const url=data?.signedUrl||null;if(url)state.signedCache.set(path,{url,exp:Date.now()+3300000});return url}
function avatarHtml(m,cls='convAvatar'){const name=m?.display_name||'Utilisateur',frame=m?.avatar_frame?' data-avatar-frame="'+esc(m.avatar_frame)+'"':'',style=' style="background:'+(esc(m?.profile_color||'#ff5a2a'))+'"';return '<div class="'+cls+'"'+frame+style+'>'+(m?.avatar_url?'<img src="'+esc(m.avatar_url)+'" alt="">':esc(initials(name)))+'</div>'}
function conversationTitle(c){if(!c)return'Discussion';if(c.conversation_type==='general')return'Général';if(c.conversation_type==='group')return c.conversation_name||'Groupe';const other=(c.member_ids||[]).find(id=>id!==state.session?.user?.id);return member(other)?.display_name||'Discussion privée'}
function conversationMember(c){if(!c||c.conversation_type!=='direct')return null;const other=(c.member_ids||[]).find(id=>id!==state.session?.user?.id);return member(other)}
function conversationAvatar(c,active=false){const cls=active?'activeAvatar':'convAvatar';if(c?.conversation_type==='general')return '<div class="'+cls+' general"><img src="assets/logo-equipe.svg" alt=""></div>';if(c?.conversation_type==='direct')return avatarHtml(conversationMember(c),cls);const title=conversationTitle(c);return '<div class="'+cls+'" style="background:linear-gradient(135deg,#ff3422,#ff8524)">'+esc(initials(title))+'</div>'}
function activeConversation(){return state.conversations.find(c=>c.conversation_id===state.activeId)||null}
function conversationPresence(c){if(!c)return'';const ids=(c.member_ids||[]).filter(id=>id!==state.session?.user?.id);const online=ids.filter(id=>state.onlineIds.has(id)).length;if(c.conversation_type==='direct')return online?'En ligne':'Hors ligne';return (c.member_ids||[]).length+' membre'+((c.member_ids||[]).length>1?'s':'')+(online?' · '+online+' en ligne':'')}
async function loadMembers(){
 const {data,error}=await db.rpc('list_team_members');if(error){console.warn(error);return}
 const rows=[...(data||[])];if(state.session?.user?.id&&state.profile&&!rows.some(x=>x.id===state.session.user.id))rows.push({id:state.session.user.id,...state.profile});
 state.members=await Promise.all(rows.map(async m=>{if(m.avatar_path){const {data:a}=await db.storage.from('profile-avatars').createSignedUrl(m.avatar_path,3600);m.avatar_url=a?.signedUrl||null}return m}));
 renderConversations();renderNewChatMembers();renderConversationHeader()
}
function syncPresence(ids){state.onlineIds=new Set(ids||window.NettoProfileUI?.onlineIds||[]);renderConversations();renderConversationHeader();renderTyping()}
function startPresence(){syncPresence();window.addEventListener('netto:presence',e=>syncPresence(e.detail?.ids||[]))}
async function loadConversations(){
 const {data,error}=await db.rpc('list_chat_conversations');if(error){console.error('Conversations:',error);showToast('Impossible de charger les discussions');return}
 state.conversations=data||[];renderConversations();
 if(state.activeId&&!state.conversations.some(c=>c.conversation_id===state.activeId)){state.activeId=null;state.messages=[];state.participants=[];renderConversationHeader();renderMessages()}
}
function renderConversations(){
 const box=$('conversationList');if(!box)return;
 const q=(state.search||'').trim().toLowerCase();
 const list=state.conversations.filter(c=>{if(!q)return true;return(conversationTitle(c)+' '+(c.last_message||'')).toLowerCase().includes(q)});
 if(!list.length){box.innerHTML='<div class="listEmpty">'+(q?'Aucune discussion trouvée.':'Aucune discussion pour le moment.')+'</div>';return}
 box.innerHTML=list.map(c=>{
  const title=conversationTitle(c),active=c.conversation_id===state.activeId,preview=(c.last_sender===state.session?.user?.id?'Vous : ':'')+(c.last_message||'Nouvelle discussion'),direct=conversationMember(c),online=direct&&state.onlineIds.has(direct.id);
  return '<button class="convRow '+(active?'active':'')+'" onclick="openConversation(\''+c.conversation_id+'\',{showMobile:true})">'+conversationAvatar(c)+
   '<span class="convCopy"><span class="convTitleLine"><strong>'+esc(title)+'</strong>'+(online?'<i class="onlineMini"></i>':'')+'</span><span class="convPreview">'+esc(preview)+'</span></span>'+
   '<span class="convMeta"><span class="convTime">'+esc(timeShort(c.last_message_at||c.updated_at))+'</span>'+(Number(c.unread_count)>0?'<b class="unreadBadge">'+Math.min(99,Number(c.unread_count))+'</b>':'')+'</span></button>'
 }).join('')
}
function searchConversations(v){state.search=v;renderConversations()}
async function openConversation(id,opts={}){
 if(!id)return;state.activeId=id;state.replyTo=null;state.editingId=null;state.messageSearch='';$('messageSearchInput').value='';$('messageSearchBar').classList.remove('show');renderComposeBanner();clearAttachment();
 const c=activeConversation();renderConversations();renderConversationHeader();
 if(opts.showMobile||window.innerWidth>780)document.body.classList.add('mobileConversationOpen');
 history.replaceState(null,'','chat.html?c='+encodeURIComponent(id));
 await Promise.all([loadParticipants(),loadMessages()]);await markRead();setupTypingChannel();renderConversationHeader()
}
function closeMobileConversation(){document.body.classList.remove('mobileConversationOpen');history.replaceState(null,'','chat.html')}
async function loadParticipants(){
 if(!state.activeId){state.participants=[];return}
 const {data,error}=await db.from('chat_participants').select('conversation_id,user_id,role,joined_at,last_read_at,muted').eq('conversation_id',state.activeId);
 if(!error)state.participants=data||[]
}
function renderConversationHeader(){
 const c=activeConversation(),av=$('activeAvatarMount'),title=$('activeTitle'),sub=$('activeSubtitle'),info=$('infoBtn'),search=$('messageSearchBtn'),composer=$('composer');
 if(!c){if(av)av.innerHTML='';if(title)title.textContent='Sélectionne une discussion';if(sub)sub.textContent='';if(info)info.disabled=true;if(search)search.disabled=true;if(composer)composer.classList.add('hidden');return}
 av.innerHTML=conversationAvatar(c,true);title.textContent=conversationTitle(c);sub.textContent=conversationPresence(c);info.disabled=false;search.disabled=false;composer.classList.remove('hidden')
}
async function loadMessages(){
 if(!state.activeId){state.messages=[];state.reactions=[];renderMessages();return}
 const {data,error}=await db.from('chat_messages').select('id,user_id,display_name,body,attachment_path,attachment_name,attachment_type,attachment_size,created_at,conversation_id,reply_to,edited_at,deleted_at').eq('conversation_id',state.activeId).order('created_at',{ascending:true}).limit(400);
 if(error){console.error(error);$('messages').innerHTML='<div class="listEmpty">Impossible de charger les messages.</div>';return}
 state.messages=data||[];await loadReactions();await renderMessages()
}
async function loadReactions(){
 const ids=state.messages.map(m=>m.id);if(!ids.length){state.reactions=[];return}
 const {data,error}=await db.from('chat_reactions').select('message_id,user_id,emoji,created_at').in('message_id',ids);
 state.reactions=error?[]:(data||[])
}
async function attachmentHtml(m){
 if(!m.attachment_path||m.deleted_at)return'';const url=await signed(m.attachment_path);if(!url)return'';
 const type=m.attachment_type||'',name=esc(m.attachment_name||'Pièce jointe'),size=esc(sizeLabel(m.attachment_size));
 if(type.startsWith('image/'))return '<div class="attachment"><img src="'+esc(url)+'" alt="'+name+'" onclick="openImage(this.src)"><div class="fileRow"><div class="fileInfo"><strong>'+name+'</strong><small>'+size+'</small></div><a class="downloadFile" href="'+esc(url)+'" target="_blank" rel="noopener">Ouvrir</a></div></div>';
 if(type.startsWith('video/'))return '<div class="attachment"><video controls preload="metadata" src="'+esc(url)+'"></video><div class="fileRow"><div class="fileInfo"><strong>'+name+'</strong><small>'+size+'</small></div><a class="downloadFile" href="'+esc(url)+'" target="_blank" rel="noopener">Ouvrir</a></div></div>';
 if(type.startsWith('audio/'))return '<div class="attachment"><audio controls preload="metadata" src="'+esc(url)+'"></audio><div class="fileRow"><div class="fileInfo"><strong>'+name+'</strong><small>'+size+'</small></div></div></div>';
 return '<div class="attachment"><div class="fileRow"><div class="fileIcon">📎</div><div class="fileInfo"><strong>'+name+'</strong><small>'+size+'</small></div><a class="downloadFile" href="'+esc(url)+'" target="_blank" rel="noopener">Télécharger</a></div></div>'
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
 const box=$('messages');if(!state.activeId){box.innerHTML='<div class="noConversation"><div><div class="logo"><img src="assets/logo-equipe.svg" alt=""></div><strong>Messagerie Nethor</strong><span>Choisis une discussion ou crée une conversation privée ou un groupe.</span></div></div>';return}
 const q=state.messageSearch.trim().toLowerCase();const visible=state.messages.filter(m=>!q||(m.body||'').toLowerCase().includes(q)||(m.attachment_name||'').toLowerCase().includes(q));
 if(!visible.length){box.innerHTML='<div class="listEmpty">'+(q?'Aucun message trouvé.':'Aucun message pour le moment.<br>Écris le premier message.')+'</div>';return}
 const attachments=await Promise.all(visible.map(attachmentHtml));let html='',lastDay='';
 visible.forEach((m,i)=>{const day=dayLabel(m.created_at);if(day!==lastDay){html+='<div class="daySep">'+esc(day)+'</div>';lastDay=day}
  const mine=m.user_id===state.session?.user?.id,author=member(m.user_id),name=author?.display_name||m.display_name||'Utilisateur',canDelete=mine||state.canManage,canEdit=mine&&!m.deleted_at;
  const body=m.deleted_at?'<div class="messageDeleted">Message supprimé</div>':(m.body?'<div class="messageBody">'+esc(m.body)+'</div>':'');
  html+='<div id="message-'+m.id+'" class="messageRow '+(mine?'mine':'')+'">'+(!mine?avatarHtml(author,'msgAvatar'):'')+'<div class="messageBlock">'+(!mine?'<div class="messageSender">'+esc(name)+'</div>':'')+
   '<div class="bubble" onclick="toggleMessageActions(event,\''+m.id+'\')">'+replyHtml(m)+body+attachments[i]+
   '<div class="messageMeta">'+(m.edited_at?'<span class="editedMark">modifié</span>':'')+'<span>'+esc(messageTime(m.created_at))+'</span>'+readTicks(m)+'</div>'+
   (!m.deleted_at?'<div class="msgActions"><button onclick="replyToMessage(event,\''+m.id+'\')" title="Répondre">↩</button><button onclick="openReactionPicker(event,\''+m.id+'\')" title="Réagir">♡</button>'+(canEdit?'<button onclick="editMessage(event,\''+m.id+'\')" title="Modifier">✎</button>':'')+(canDelete?'<button class="dangerAction" onclick="deleteMessage(event,\''+m.id+'\')" title="Supprimer">⌫</button>':'')+'</div>':'')+
   '</div>'+reactionsHtml(m.id)+'</div></div>'
 });
 box.innerHTML=html;if(!q)requestAnimationFrame(()=>box.scrollTop=box.scrollHeight)
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
  const {error}=await db.from('chat_messages').insert(payload);if(error)throw error;
  ta.value='';state.replyTo=null;clearAttachment();renderComposeBanner();autoGrow();window.NettoSounds?.play?.('message');await Promise.all([loadMessages(),loadConversations()]);await markRead()
 }catch(err){if(path){try{await db.storage.from('chat-files').remove([path])}catch(_){}}console.error(err);showToast('Envoi impossible')}
 finally{btn.disabled=false}
}
async function deleteMessage(e,id){e.stopPropagation();const m=state.messages.find(x=>String(x.id)===String(id));if(!m)return;if(!(m.user_id===state.session.user.id||state.canManage))return;if(!confirm('Supprimer ce message ?'))return;const {error}=await db.from('chat_messages').update({body:null,deleted_at:new Date().toISOString(),attachment_name:null,attachment_type:null,attachment_size:null}).eq('id',id);if(error)return showToast('Suppression impossible');if(m.attachment_path){try{await db.storage.from('chat-files').remove([m.attachment_path])}catch(_){}}window.NettoSounds?.play?.('delete');await loadMessages()}
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
function toggleMessageSearch(){const b=$('messageSearchBar');b.classList.toggle('show');if(b.classList.contains('show'))setTimeout(()=>$('messageSearchInput').focus(),30);else{state.messageSearch='';$('messageSearchInput').value='';renderMessages()}}
function searchMessages(v){state.messageSearch=v;renderMessages()}
function openImage(url){$('lightboxImage').src=url;$('imageLightbox').classList.remove('hidden')}
function closeImage(e){if(e&&e.target!==$('imageLightbox')&&!e.target.closest('.lightboxClose'))return;$('imageLightbox').classList.add('hidden');$('lightboxImage').src=''}
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
async function openDirect(id){const {data,error}=await db.rpc('create_chat_conversation',{p_type:'direct',p_name:null,p_member_ids:[id]});if(error){console.error(error);return showToast('Création impossible')}closeNewChat();await loadConversations();await openConversation(data,{showMobile:true})}
async function createGroup(){const name=$('groupName').value.trim();if(!name)return showToast('Donne un nom au groupe');if(!state.groupMembers.size)return showToast('Ajoute au moins un membre');const btn=$('createGroupBtn');btn.disabled=true;const {data,error}=await db.rpc('create_chat_conversation',{p_type:'group',p_name:name,p_member_ids:[...state.groupMembers]});btn.disabled=false;if(error){console.error(error);return showToast('Création impossible')}closeNewChat();await loadConversations();await openConversation(data,{showMobile:true})}
function infoMemberRow(p){const m=member(p.user_id)||{id:p.user_id,display_name:'Utilisateur'};return '<div class="infoRow">'+avatarHtml(m,'pickAvatar')+'<div><strong>'+esc(m.display_name||'Utilisateur')+(p.user_id===state.session.user.id?' · Vous':'')+'</strong><small>'+esc(roleLabel(m.role))+(state.onlineIds.has(m.id)?' · En ligne':'')+'</small></div>'+(p.role==='owner'?'<span style="font-size:8px;color:#e34b27;font-weight:900">CRÉATEUR</span>':'')+'</div>'}
function openConversationInfo(){const c=activeConversation();if(!c)return;$('infoModal').classList.remove('hidden');renderConversationInfo()}
function closeConversationInfo(){$('infoModal').classList.add('hidden')}
function renderConversationInfo(){
 const c=activeConversation(),box=$('infoContent');if(!c||!box)return;const mine=state.participants.find(p=>p.user_id===state.session.user.id),canGroupManage=c.conversation_type==='group'&&(c.created_by===state.session.user.id||state.profile.role==='admin');
 let html='<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">'+conversationAvatar(c,true)+'<div><strong style="font-size:15px">'+esc(conversationTitle(c))+'</strong><small style="display:block;margin-top:3px;color:#858b93;font-size:9px">'+esc(conversationPresence(c))+'</small></div></div>';
 html+='<label class="infoToggle"><span>Mettre les notifications en sourdine</span><input type="checkbox" '+(mine?.muted?'checked':'')+' onchange="setMuted(this.checked)"></label>';
 if(canGroupManage)html+='<div class="infoSection"><div class="infoSectionTitle">Nom du groupe</div><input id="infoGroupName" class="groupNameInput" value="'+esc(c.conversation_name||'')+'" maxlength="80"></div><div class="infoSection"><div class="infoSectionTitle">Membres du groupe</div><div class="modalMembers">'+state.members.filter(m=>m.id!==state.session.user.id).map(m=>{const selected=state.participants.some(p=>p.user_id===m.id);return '<button class="pickMember '+(selected?'selected':'')+'" onclick="this.classList.toggle(\'selected\')" data-info-member="'+m.id+'">'+avatarHtml(m,'pickAvatar')+'<span><strong>'+esc(m.display_name||'Utilisateur')+'</strong><small>'+esc(roleLabel(m.role))+'</small></span><i class="pickCheck">✓</i></button>'}).join('')+'</div><button class="modalAction" onclick="saveGroupInfo()">Enregistrer le groupe</button></div>';
 else html+='<div class="infoSection"><div class="infoSectionTitle">Participants</div><div class="infoMembers">'+state.participants.map(infoMemberRow).join('')+'</div></div>';
 if(c.conversation_type==='group'){if(canGroupManage)html+='<button class="infoDanger" onclick="deleteConversation()">Supprimer le groupe</button>';else if(mine?.role!=='owner')html+='<button class="infoDanger" onclick="leaveGroup()">Quitter le groupe</button>'}
 box.innerHTML=html
}
async function setMuted(v){const {error}=await db.rpc('chat_set_muted',{p_conversation:state.activeId,p_muted:!!v});if(error)showToast('Impossible de modifier ce réglage');else{const p=state.participants.find(x=>x.user_id===state.session.user.id);if(p)p.muted=!!v;showToast(v?'Notifications en sourdine':'Notifications réactivées')}}
async function saveGroupInfo(){const name=$('infoGroupName')?.value.trim();if(!name)return showToast('Nom du groupe requis');const ids=[...document.querySelectorAll('[data-info-member].selected')].map(x=>x.dataset.infoMember);const {error}=await db.rpc('chat_update_group',{p_conversation:state.activeId,p_name:name,p_member_ids:ids});if(error){console.error(error);return showToast('Modification impossible')}showToast('Groupe mis à jour');await Promise.all([loadConversations(),loadParticipants()]);renderConversationHeader();renderConversationInfo()}
async function deleteConversation(){if(!confirm('Supprimer définitivement ce groupe et tous ses messages ?'))return;const {error}=await db.rpc('chat_delete_conversation',{p_conversation:state.activeId});if(error)return showToast('Suppression impossible');closeConversationInfo();state.activeId=null;state.messages=[];document.body.classList.remove('mobileConversationOpen');history.replaceState(null,'','chat.html');await loadConversations();renderConversationHeader();renderMessages();showToast('Groupe supprimé')}
async function leaveGroup(){if(!confirm('Quitter ce groupe ?'))return;const {error}=await db.rpc('chat_leave_conversation',{p_conversation:state.activeId});if(error)return showToast(error.message.includes('owner')?'Le créateur doit supprimer le groupe':'Action impossible');closeConversationInfo();state.activeId=null;document.body.classList.remove('mobileConversationOpen');history.replaceState(null,'','chat.html');await loadConversations();renderConversationHeader();renderMessages()}
function startRealtime(){
 if(state.dataChannel)return;
 let msgTimer=null,partTimer=null,convTimer=null,reactTimer=null;
 const onMessages=()=>{clearTimeout(msgTimer);msgTimer=setTimeout(async()=>{await loadConversations();if(state.activeId){await Promise.all([loadParticipants(),loadMessages()]);await markRead()}},110)};
 const onParticipants=()=>{clearTimeout(partTimer);partTimer=setTimeout(async()=>{await loadConversations();if(state.activeId){await loadParticipants();await renderMessages();renderConversationHeader()}},130)};
 const onConversations=()=>{clearTimeout(convTimer);convTimer=setTimeout(async()=>{await loadConversations();renderConversationHeader()},120)};
 const onReactions=()=>{clearTimeout(reactTimer);reactTimer=setTimeout(async()=>{if(state.activeId){await loadReactions();await renderMessages()}},90)};
 state.dataChannel=db.channel('nethor-chat-v2-data')
  .on('postgres_changes',{event:'*',schema:'public',table:'chat_messages'},onMessages)
  .on('postgres_changes',{event:'*',schema:'public',table:'chat_reactions'},onReactions)
  .on('postgres_changes',{event:'*',schema:'public',table:'chat_conversations'},onConversations)
  .on('postgres_changes',{event:'*',schema:'public',table:'chat_participants'},onParticipants)
  .subscribe()
}
function startMemberRealtime(){if(state.memberChannel)return;state.memberChannel=db.channel('nethor-chat-members').on('postgres_changes',{event:'UPDATE',schema:'public',table:'profiles'},()=>loadMembers()).subscribe()}
document.addEventListener('click',e=>{if(!e.target.closest('#reactionPicker')&&!e.target.closest('.msgActions'))closeReactionPicker();if(!e.target.closest('.messageRow'))document.querySelectorAll('.messageRow.actionsOpen').forEach(x=>x.classList.remove('actionsOpen'))});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeReactionPicker();$('newChatModal')?.classList.add('hidden');$('infoModal')?.classList.add('hidden');$('imageLightbox')?.classList.add('hidden')}});
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