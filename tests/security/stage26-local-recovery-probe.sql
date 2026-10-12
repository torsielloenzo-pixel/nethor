-- PHASE RECETTE : ONLY load into disposable Supabase CLI project.
-- This is a synthetic permission probe, not the Edge Function deployment.
-- It deliberately mirrors the candidate's per-link predicates after Auth login.
CREATE OR REPLACE FUNCTION public.stage26_finalize_recovery(
  p_request_id uuid,
  p_proof_digest text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO ''
AS $local_only$
DECLARE
  v_id uuid;
BEGIN
  IF NOT private.session_is_active() OR auth.uid() IS NULL THEN
    RETURN jsonb_build_object('status','unauthorized');
  END IF;
  IF p_request_id IS NULL OR p_proof_digest IS NULL OR
     p_proof_digest !~ '^[0-9a-f]{64}$' THEN
    RETURN jsonb_build_object('status','denied');
  END IF;
  UPDATE public.password_reset_requests
     SET resolved_at=pg_catalog.clock_timestamp()
   WHERE id=p_request_id
     AND user_id=auth.uid()
     AND reset_channel='email'
     AND email_status='sent'
     AND recovery_proof_digest=p_proof_digest
     AND password_changed_verified_at IS NOT NULL
     AND requested_at>=now()-interval '24 hours'
     AND resolved_at IS NULL
   RETURNING id INTO v_id;
  IF v_id IS NOT NULL THEN
    RETURN jsonb_build_object('status','resolved');
  END IF;
  -- Do not expose row existence or another user's recovery metadata.
  RETURN jsonb_build_object('status','denied');
END;
$local_only$;

REVOKE ALL ON FUNCTION public.stage26_finalize_recovery(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stage26_finalize_recovery(uuid,text) TO authenticated;
