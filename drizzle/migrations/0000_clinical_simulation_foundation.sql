CREATE TABLE public.clinical_case_versions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), case_key text NOT NULL, version integer NOT NULL DEFAULT 1, title text NOT NULL, specialty text NOT NULL DEFAULT 'General', review_status text NOT NULL DEFAULT 'sourced_needs_clinical_review', source_references jsonb NOT NULL DEFAULT '[]', encounter jsonb NOT NULL DEFAULT '{}', private_rules jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(case_key, version));
GRANT ALL ON public.clinical_case_versions TO service_role;
ALTER TABLE public.clinical_case_versions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.clinical_medication_references (id text PRIMARY KEY, reference_type text NOT NULL DEFAULT 'interaction', data jsonb NOT NULL, review_status text NOT NULL DEFAULT 'sourced_needs_clinical_review', created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.clinical_medication_references TO authenticated;
GRANT ALL ON public.clinical_medication_references TO service_role;
ALTER TABLE public.clinical_medication_references ENABLE ROW LEVEL SECURITY;
CREATE POLICY clinical_references_read ON public.clinical_medication_references FOR SELECT TO authenticated USING (true);

CREATE TABLE public.clinical_attempts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, case_version_id uuid NOT NULL REFERENCES public.clinical_case_versions(id), mode text NOT NULL DEFAULT 'learning', status text NOT NULL DEFAULT 'in_progress', revision integer NOT NULL DEFAULT 0, decisions jsonb NOT NULL DEFAULT '{}', events jsonb NOT NULL DEFAULT '[]', result jsonb, started_at timestamptz NOT NULL DEFAULT now(), deadline_at timestamptz, completed_at timestamptz, submission_key uuid, UNIQUE(user_id, submission_key));
GRANT SELECT ON public.clinical_attempts TO authenticated;
GRANT ALL ON public.clinical_attempts TO service_role;
ALTER TABLE public.clinical_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY clinical_attempts_owner_read ON public.clinical_attempts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE INDEX clinical_attempts_user_completed ON public.clinical_attempts(user_id, completed_at DESC);

CREATE TABLE public.clinical_badge_definitions (id text PRIMARY KEY, name text NOT NULL, description text NOT NULL, rarity text NOT NULL DEFAULT 'ordinary', criteria jsonb NOT NULL DEFAULT '{}');
GRANT SELECT ON public.clinical_badge_definitions TO authenticated;
GRANT ALL ON public.clinical_badge_definitions TO service_role;
ALTER TABLE public.clinical_badge_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY clinical_badges_read ON public.clinical_badge_definitions FOR SELECT TO authenticated USING (true);

CREATE TABLE public.clinical_user_badges (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, badge_id text NOT NULL REFERENCES public.clinical_badge_definitions(id), attempt_id uuid NOT NULL REFERENCES public.clinical_attempts(id), awarded_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id, badge_id));
GRANT SELECT ON public.clinical_user_badges TO authenticated;
GRANT ALL ON public.clinical_user_badges TO service_role;
ALTER TABLE public.clinical_user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY clinical_user_badges_owner_read ON public.clinical_user_badges FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE FUNCTION public.complete_clinical_attempt(p_attempt_id uuid, p_user_id uuid, p_revision integer, p_decisions jsonb, p_result jsonb, p_submission_key uuid, p_badge_ids text[]) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE attempt public.clinical_attempts; reviewed boolean;
BEGIN
 SELECT * INTO attempt FROM public.clinical_attempts WHERE id = p_attempt_id AND user_id = p_user_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Attempt not found'; END IF;
 IF attempt.status = 'completed' THEN RETURN attempt.result; END IF;
 IF attempt.status <> 'in_progress' OR attempt.revision <> p_revision THEN RAISE EXCEPTION 'Attempt changed; reload before submitting'; END IF;
 SELECT review_status = 'clinically_reviewed' INTO reviewed FROM public.clinical_case_versions WHERE id = attempt.case_version_id;
 UPDATE public.clinical_attempts SET decisions = p_decisions, result = p_result, status = 'completed', completed_at = now(), submission_key = p_submission_key, revision = revision + 1 WHERE id = p_attempt_id;
 IF reviewed AND COALESCE((p_result->>'eligible')::boolean, false) THEN
  INSERT INTO public.clinical_user_badges(user_id, badge_id, attempt_id) SELECT p_user_id, badge_id, p_attempt_id FROM unnest(p_badge_ids) AS badge_id ON CONFLICT(user_id, badge_id) DO NOTHING;
 END IF;
 RETURN p_result;
END;
$$;
REVOKE ALL ON FUNCTION public.complete_clinical_attempt(uuid, uuid, integer, jsonb, jsonb, uuid, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_clinical_attempt(uuid, uuid, integer, jsonb, jsonb, uuid, text[]) TO service_role;