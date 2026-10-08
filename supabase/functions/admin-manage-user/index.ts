import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:corsHeaders});
  if(req.method!=="POST") return json({error:"Méthode non autorisée."},405);
  try{
    const url=Deno.env.get("SUPABASE_URL"), anon=Deno.env.get("SUPABASE_ANON_KEY"), service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(!url||!anon||!service) return json({error:"Configuration serveur incomplète."},500);
    const auth=req.headers.get("Authorization");
    if(!auth) return json({error:"Authentification requise."},401);

    const caller=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
    const {data:{user},error:authError}=await caller.auth.getUser();
    if(authError||!user) return json({error:"Session invalide."},401);
    const {data:securityContext,error:securityError}=await caller.rpc("nethor_security_context");
    if(securityError||securityContext?.session_active!==true) return json({error:"Session inactive ou révoquée."},401);
    if(String(securityContext?.role||"")!=="admin") return json({error:"Accès administrateur requis."},403);
    const {data:callerProfile,error:profileError}=await caller.from("profiles").select("role,display_name").eq("id",user.id).single();
    if(profileError||callerProfile?.role!=="admin") return json({error:"Accès administrateur requis."},403);

    const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
    const body=await req.json().catch(()=>({}));
    const action=String(body.action||"list");

    if(action==="list"){
      const {data:authList,error:listError}=await admin.auth.admin.listUsers({page:1,perPage:1000});
      if(listError) return json({error:listError.message},400);
      const {data:profiles,error:profilesError}=await admin.from("profiles").select("id,email,display_name,role,created_at,avatar_path,status_text,profile_color,avatar_frame,contract_hours,planning_name,account_enabled");
      if(profilesError) return json({error:profilesError.message},400);
      const {data:planningRows,error:planningRowsError}=await admin.from("planning_weeks")
        .select("week_start,employee_order")
        .order("week_start",{ascending:false})
        .limit(24);
      if(planningRowsError) console.warn("Planning names:",planningRowsError);
      const planningNames:string[]=[];
      const planningSeen=new Set<string>();
      for(const row of planningRows||[]){
        const values=Array.isArray((row as any)?.employee_order)?(row as any).employee_order:[];
        for(const raw of values){
          const name=String(raw||"").trim(),key=name.toLocaleLowerCase("fr");
          if(!name||planningSeen.has(key))continue;
          planningSeen.add(key);planningNames.push(name);
        }
      }
      const byId=new Map((profiles||[]).map((p:any)=>[p.id,p]));
      const users=(authList.users||[]).map((u:any)=>{
        const p:any=byId.get(u.id)||{};
        return {
          id:u.id,
          email:u.email||p.email||"",
          username:u.user_metadata?.username||(String(u.email||"").endsWith("@stock-fl.local")?String(u.email||"").replace(/@stock-fl\.local$/i,""):(p.role==="admin"?"admin":String(u.email||"").split("@")[0])),
          display_name:p.display_name||u.user_metadata?.display_name||"Utilisateur",
          role:p.role||"lecture",
          status_text:p.status_text||"",
          profile_color:p.profile_color||"#ff5a2a",
          avatar_frame:p.avatar_frame||null,
          avatar_path:p.avatar_path||null,
          contract_hours:p.contract_hours==null?null:Number(p.contract_hours),
          planning_name:p.planning_name||null,
          account_enabled:p.account_enabled!==false,
          created_at:p.created_at||u.created_at,
          last_sign_in_at:u.last_sign_in_at||null,
          email_confirmed_at:u.email_confirmed_at||null,
          banned_until:u.banned_until||null
        };
      });
      return json({success:true,users,planning_names:planningNames});
    }

    if(action==="revoke-sessions"){
      const userId=String(body.user_id||"").trim();
      if(!/^[0-9a-f-]{36}$/i.test(userId)) return json({error:"Compte invalide."},400);
      const cutoff=new Date().toISOString();
      const {data:target,error:targetError}=await admin.from("profiles")
        .update({sessions_valid_after:cutoff})
        .eq("id",userId)
        .select("id,display_name")
        .maybeSingle();
      if(targetError) return json({error:"Impossible de révoquer les sessions."},500);
      if(!target) return json({error:"Compte introuvable."},404);
      await admin.from("audit_logs").insert({
        actor_id:user.id,
        target_user_id:userId,
        action:"sessions_revoked",
        area:"Gestion des comptes",
        resource_type:"auth.sessions",
        resource_id:userId,
        summary:"Révocation des sessions · "+(target.display_name||"Utilisateur"),
        details:{cutoff}
      });
      return json({success:true,sessions_revoked:true,valid_after:cutoff});
    }

    if(action==="create"){
      const displayName=String(body.display_name||"").trim();
      const username=String(body.username||"").trim().toLowerCase().replace(/[^a-z0-9._-]/g,"");
      const password=String(body.password||"");
      const resetRequestId=String(body.reset_request_id||"").trim();
      const role=String(body.role||"lecture");
      const avatarFrame=String(body.avatar_frame||"").trim()||null;
      const planningName=String(body.planning_name||"").trim().slice(0,120)||null;
      if(!displayName) return json({error:"Le nom affiché est obligatoire."},400);
      if(username.length<3) return json({error:"L’identifiant doit contenir au moins 3 caractères."},400);
      if(password.length<8) return json({error:"Le mot de passe temporaire doit contenir au moins 8 caractères."},400);
      if(avatarFrame && !["admin","responsable","point_vente","employe","lecture"].includes(avatarFrame)) return json({error:"Cadre d’avatar invalide."},400);
      const {data:roleRow,error:roleError}=await admin.from("app_roles").select("key").eq("key",role).maybeSingle();
      if(roleError||!roleRow) return json({error:"Rôle invalide."},400);
      const technicalEmail=`${username}@stock-fl.local`;
      const {data:created,error:createError}=await admin.auth.admin.createUser({
        email:technicalEmail,password,email_confirm:true,
        user_metadata:{display_name:displayName,username}
      });
      if(createError){
        const msg=createError.message.toLowerCase();
        if(msg.includes("already")||msg.includes("exists")||msg.includes("registered")) return json({error:"Cet identifiant est déjà utilisé."},409);
        return json({error:createError.message},400);
      }
      if(!created.user) return json({error:"Création du compte impossible."},500);
      const {error:profileCreateError}=await admin.from("profiles").upsert({
        id:created.user.id,email:technicalEmail,display_name:displayName,role,
        profile_color:"#ff5a2a",avatar_frame:avatarFrame,planning_name:planningName,account_enabled:true
      },{onConflict:"id"});
      if(profileCreateError){
        await admin.auth.admin.deleteUser(created.user.id);
        return json({error:"Le compte Auth a été créé mais le profil a échoué : "+profileCreateError.message},500);
      }
      await admin.from("audit_logs").insert({
        actor_id:user.id,target_user_id:created.user.id,action:"account_create",
        area:"Gestion des comptes",resource_type:"auth.users",resource_id:created.user.id,
        summary:"Création du compte · "+displayName,
        details:{changed_fields:["display_name","username","role","password"].concat(avatarFrame?["avatar_frame"]:[]).concat(planningName?["planning_name"]:[])}
      });
      return json({success:true,user_id:created.user.id});
    }

    if(action==="set-enabled"){
      const userId=String(body.user_id||"").trim();
      const enabled=body.enabled===true;
      if(!/^[0-9a-f-]{36}$/i.test(userId)) return json({error:"Compte invalide."},400);
      if(userId===user.id && !enabled) return json({error:"Tu ne peux pas désactiver ton propre compte administrateur."},400);

      const {data:targetProfile,error:targetProfileError}=await admin.from("profiles")
        .select("id,display_name,account_enabled")
        .eq("id",userId)
        .maybeSingle();
      if(targetProfileError) return json({error:targetProfileError.message},400);
      if(!targetProfile) return json({error:"Compte introuvable."},404);

      const {error:authStateError}=await admin.auth.admin.updateUserById(userId,{ban_duration:enabled?"none":"876000h"});
      if(authStateError) return json({error:"Impossible de modifier l’accès Auth : "+authStateError.message},400);

      const {data:stateRows,error:stateError}=await admin.rpc("admin_set_account_enabled",{p_user_id:userId,p_enabled:enabled});
      if(stateError){
        await admin.auth.admin.updateUserById(userId,{ban_duration:enabled?"876000h":"none"}).catch(()=>{});
        return json({error:"Impossible de modifier l’état du compte : "+stateError.message},500);
      }
      const stateRow=Array.isArray(stateRows)?stateRows[0]:stateRows;
      await admin.from("audit_logs").insert({
        actor_id:user.id,
        target_user_id:userId,
        action:enabled?"account_enabled":"account_disabled",
        area:"Gestion des comptes",
        resource_type:"auth.users",
        resource_id:userId,
        summary:(enabled?"Réactivation du compte · ":"Désactivation du compte · ")+(targetProfile.display_name||"Utilisateur"),
        details:{
          changed_fields:["account_enabled"].concat(enabled?[]:["sessions_revoked"]),
          account_enabled:enabled,
          revoked_sessions:Number(stateRow?.revoked_sessions||0)
        }
      });
      return json({
        success:true,
        account_enabled:enabled,
        revoked_sessions:Number(stateRow?.revoked_sessions||0),
        sessions_valid_after:stateRow?.sessions_valid_after||null
      });
    }

    if(action==="cancel-reset"){
      const requestId=String(body.reset_request_id||"").trim();
      if(!/^[0-9a-f-]{36}$/i.test(requestId)) return json({error:"Demande de réinitialisation invalide."},400);
      const {data:reqRow,error:reqError}=await admin.from("password_reset_requests")
        .select("id,user_id,display_name,resolved_at")
        .eq("id",requestId)
        .maybeSingle();
      if(reqError) return json({error:reqError.message},400);
      if(!reqRow) return json({error:"Demande introuvable."},404);
      if(reqRow.resolved_at) return json({success:true,already_resolved:true});
      const now=new Date().toISOString();
      const {error:cancelError}=await admin.from("password_reset_requests").update({
        resolved_at:now,
        resolved_by:user.id
      }).eq("id",requestId).is("resolved_at",null);
      if(cancelError) return json({error:cancelError.message},400);
      await admin.from("planning_notifications")
        .delete()
        .eq("kind","password_reset_request")
        .ilike("target_url","%"+requestId+"%");
      await admin.from("audit_logs").insert({
        actor_id:user.id,
        target_user_id:reqRow.user_id,
        action:"password_reset_cancelled",
        area:"Gestion des comptes",
        resource_type:"password_reset_requests",
        resource_id:requestId,
        summary:"Demande de réinitialisation annulée · "+(reqRow.display_name||"Utilisateur"),
        details:{}
      });
      return json({success:true,cancelled:true});
    }


    if(action==="cancel-email-reset"){
      const requestId=String(body.email_reset_request_id||"").trim();
      if(!/^[0-9a-f-]{36}$/i.test(requestId)) return json({error:"Demande e-mail invalide."},400);
      const {data:reqRow,error:reqError}=await admin.from("email_reset_requests")
        .select("id,user_id,display_name,resolved_at")
        .eq("id",requestId)
        .maybeSingle();
      if(reqError) return json({error:reqError.message},400);
      if(!reqRow) return json({error:"Demande introuvable."},404);
      if(reqRow.resolved_at) return json({success:true,already_resolved:true});
      const now=new Date().toISOString();
      const {error:cancelError}=await admin.from("email_reset_requests").update({
        resolved_at:now,
        resolved_by:user.id
      }).eq("id",requestId).is("resolved_at",null);
      if(cancelError) return json({error:cancelError.message},400);
      await admin.from("planning_notifications")
        .delete()
        .eq("kind","password_reset_request")
        .ilike("target_url","%email_request="+requestId+"%");
      await admin.from("audit_logs").insert({
        actor_id:user.id,
        target_user_id:reqRow.user_id,
        action:"recovery_email_reset_cancelled",
        area:"Gestion des comptes",
        resource_type:"email_reset_requests",
        resource_id:requestId,
        summary:"Demande de réinitialisation e-mail annulée · "+(reqRow.display_name||"Utilisateur"),
        details:{}
      });
      return json({success:true,cancelled:true});
    }

    if(action==="reset-recovery-email"){
      const requestId=String(body.email_reset_request_id||"").trim();
      const userId=String(body.user_id||"").trim();
      if(!/^[0-9a-f-]{36}$/i.test(requestId)||!/^[0-9a-f-]{36}$/i.test(userId)) return json({error:"Demande e-mail invalide."},400);
      const {data:reqRow,error:reqError}=await admin.from("email_reset_requests")
        .select("id,user_id,display_name,resolved_at")
        .eq("id",requestId)
        .maybeSingle();
      if(reqError) return json({error:reqError.message},400);
      if(!reqRow||reqRow.user_id!==userId) return json({error:"Demande introuvable pour ce compte."},404);
      if(reqRow.resolved_at) return json({success:true,already_resolved:true});

      const {error:deleteError}=await admin.from("user_recovery_emails").delete().eq("user_id",userId);
      if(deleteError) return json({error:"Impossible de réinitialiser l’adresse e-mail."},500);

      const now=new Date().toISOString();
      const {error:resolveError}=await admin.from("email_reset_requests").update({
        resolved_at:now,
        resolved_by:user.id
      }).eq("id",requestId).is("resolved_at",null);
      if(resolveError) return json({error:resolveError.message},400);

      await admin.from("planning_notifications")
        .delete()
        .eq("kind","password_reset_request")
        .ilike("target_url","%email_request="+requestId+"%");

      await admin.from("planning_notifications").insert({
        user_id:userId,
        created_by:user.id,
        kind:"admin_message",
        title:"Adresse e-mail réinitialisée",
        message:"Votre ancienne adresse e-mail de récupération a été supprimée. Vous pouvez maintenant en enregistrer une nouvelle depuis Mon profil.",
        target_url:"profile.html"
      });

      await admin.from("audit_logs").insert({
        actor_id:user.id,
        target_user_id:userId,
        action:"recovery_email_reset_resolved",
        area:"Gestion des comptes",
        resource_type:"email_reset_requests",
        resource_id:requestId,
        summary:"Adresse e-mail de récupération réinitialisée · "+(reqRow.display_name||"Utilisateur"),
        details:{changed_fields:["recovery_email"]}
      });

      return json({success:true,email_reset_resolved:true});
    }

    if(action==="update"){
      const userId=String(body.user_id||"").trim();
      const displayName=String(body.display_name||"").trim();
      const username=String(body.username||"").trim().toLowerCase().replace(/[^a-z0-9._-]/g,"");
      const role=String(body.role||"");
      const statusText=String(body.status_text||"").trim().slice(0,80);
      const color=String(body.profile_color||"#ff5a2a");
      const password=String(body.password||"");
      const resetRequestId=String(body.reset_request_id||"").trim();
      const avatarFrame=String(body.avatar_frame||"").trim()||null;
      const contractRaw=body.contract_hours;
      const contractHours=(contractRaw===null||contractRaw===undefined||String(contractRaw).trim()==="")?null:Number(contractRaw);
      const planningName=String(body.planning_name||"").trim().slice(0,120)||null;
      if(!/^[0-9a-f-]{36}$/i.test(userId)) return json({error:"Compte invalide."},400);
      if(!displayName) return json({error:"Le nom affiché est obligatoire."},400);
      if(username.length<3) return json({error:"L’identifiant doit contenir au moins 3 caractères."},400);
      const {data:roleRow,error:roleError}=await admin.from("app_roles").select("key").eq("key",role).maybeSingle();
      if(roleError||!roleRow) return json({error:"Rôle invalide."},400);
      if(!/^#[0-9a-f]{6}$/i.test(color)) return json({error:"Couleur invalide."},400);
      if(password && password.length<8) return json({error:"Le nouveau mot de passe doit contenir au moins 8 caractères."},400);
      if(resetRequestId && !/^[0-9a-f-]{36}$/i.test(resetRequestId)) return json({error:"Demande de réinitialisation invalide."},400);
      if(avatarFrame && !["admin","responsable","point_vente","employe","lecture"].includes(avatarFrame)) return json({error:"Cadre d’avatar invalide."},400);

      if(contractHours!==null && (!Number.isFinite(contractHours)||contractHours<0||contractHours>80)) return json({error:"Les heures contrat doivent être comprises entre 0 et 80 h."},400);

      const {data:existingProfile}=await admin.from("profiles").select("display_name,email,role,status_text,profile_color,avatar_frame,contract_hours,planning_name,account_enabled").eq("id",userId).maybeSingle();
      const {data:existingAuth,error:existingAuthError}=await admin.auth.admin.getUserById(userId);
      if(existingAuthError||!existingAuth?.user) return json({error:"Compte Auth introuvable."},404);
      const currentAuthEmail=String(existingAuth.user.email||"");
      const isTechnicalAccount=/@stock-fl\.local$/i.test(currentAuthEmail);
      const technicalEmail=username+"@stock-fl.local";
      const nextAuthEmail=isTechnicalAccount?technicalEmail:currentAuthEmail;
      const authPatch:any={
        email:nextAuthEmail,
        email_confirm:true,
        user_metadata:{...(existingAuth.user.user_metadata||{}),display_name:displayName,username}
      };
      if(password) authPatch.password=password;

      const {error:updateAuthError}=await admin.auth.admin.updateUserById(userId,authPatch);
      if(updateAuthError){
        const msg=updateAuthError.message.toLowerCase();
        if(msg.includes("already")||msg.includes("exists")||msg.includes("registered")) return json({error:"Cet identifiant est déjà utilisé."},409);
        return json({error:updateAuthError.message},400);
      }

      const profilePatch:any={
        email:nextAuthEmail,
        display_name:displayName,
        role,
        status_text:statusText||null,
        profile_color:color,
        avatar_frame:avatarFrame,
        contract_hours:contractHours,
        planning_name:planningName
      };
      if(password) profilePatch.sessions_valid_after=new Date().toISOString();
      const {error:updateProfileError}=await admin.from("profiles").update(profilePatch).eq("id",userId);
      if(updateProfileError) return json({error:"Compte Auth modifié, mais profil non synchronisé : "+updateProfileError.message},500);

      const changed:string[]=[];
      const old:any=existingProfile||{};
      if(old.display_name!==displayName) changed.push("display_name");
      if(old.email!==nextAuthEmail || (existingAuth.user.user_metadata?.username||"")!==username) changed.push("username");
      if(old.role!==role) changed.push("role");
      if((old.status_text||"")!==statusText) changed.push("status_text");
      if((old.profile_color||"#ff5a2a").toLowerCase()!==color.toLowerCase()) changed.push("profile_color");
      if((old.avatar_frame||null)!==avatarFrame) changed.push("avatar_frame");
      if((old.contract_hours==null?null:Number(old.contract_hours))!==contractHours) changed.push("contract_hours");
      if((old.planning_name||null)!==planningName) changed.push("planning_name");
      if(password){changed.push("password");changed.push("sessions_revoked")}

      await admin.from("audit_logs").insert({
        actor_id:user.id,
        target_user_id:userId,
        action:"account_update",
        area:"Gestion des comptes",
        resource_type:"auth.users",
        resource_id:userId,
        summary:"Modification du compte · "+displayName,
        details:{changed_fields:changed}
      });

      let resetResolved=false;
      if(password && resetRequestId){
        const {data:reqRow}=await admin.from("password_reset_requests")
          .select("id,user_id,resolved_at")
          .eq("id",resetRequestId)
          .maybeSingle();
        if(reqRow && reqRow.user_id===userId && !reqRow.resolved_at){
          await admin.from("password_reset_requests").update({
            resolved_at:new Date().toISOString(),
            resolved_by:user.id
          }).eq("id",resetRequestId);
          await admin.from("planning_notifications")
            .delete()
            .eq("kind","password_reset_request")
            .ilike("target_url","%"+resetRequestId+"%");
          await admin.from("audit_logs").insert({
            actor_id:user.id,
            target_user_id:userId,
            action:"password_reset_resolved",
            area:"Gestion des comptes",
            resource_type:"password_reset_requests",
            resource_id:resetRequestId,
            summary:"Mot de passe réinitialisé · "+displayName,
            details:{}
          });
          resetResolved=true;
        }
      }

      return json({success:true,changed_fields:changed,reset_resolved:resetResolved});
    }

    return json({error:"Action inconnue."},400);
  }catch(error){
    console.error(error);
    return json({error:error instanceof Error?error.message:"Erreur serveur inconnue."},500);
  }
});