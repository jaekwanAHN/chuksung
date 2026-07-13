-- profiles의 updated_at 자동 갱신 트리거 누락 보완 (평가리포트 §5-3)
-- day_start_time 수정(PATCH /api/profile) 시 updated_at이 갱신되지 않던 문제
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
