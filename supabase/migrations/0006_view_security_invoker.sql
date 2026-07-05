-- completed_tasks_history 뷰가 소유자 권한으로 실행되어 RLS를 우회하던 문제 수정.
-- security_invoker = on 이면 뷰를 조회하는 사용자의 권한으로 실행되어
-- tasks/profiles 의 RLS 정책(본인 데이터만)이 그대로 적용된다.
ALTER VIEW public.completed_tasks_history SET (security_invoker = on);
