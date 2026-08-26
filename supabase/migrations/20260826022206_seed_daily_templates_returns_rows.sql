-- 시딩 RPC 가 심은 행을 돌려주게 한다 — Supabase SQL Editor에 붙여넣고 실행하세요.
--
-- 배경: 템플릿 추가·수정의 결과("오늘 태스크가 시딩됐다")를 클라이언트가 일간 목록
--   재조회로 받아오는 구조였다. 그 재조회는 뮤테이션 이전에 날아간 조회와 겹칠 수 있고,
--   낡은 응답이 캐시에 안착하면 그날 시딩이 통째로 누락된 것처럼 보인다.
--   returns void 로는 "무엇이 심겼는지"를 응답에 실을 수 없어 반환형을 바꾼다.
--   (구조와 근거: docs/task-race-guards.md 「템플릿 변경과 일간 목록」)
--
-- 배포 순서: **함수 먼저, 앱 나중.** 앱에 JS 폴백이 없다. 옛 함수(returns void)는
--   에러 없이 null 을 돌려주므로, 앱을 먼저 올리면 "시딩된 것이 없다"로 조용히 오인한다.
--
-- 안전성 — 0009 의 계약을 그대로 유지한다:
--   - SECURITY INVOKER: 호출자 권한으로 실행 → 기존 RLS 정책이 그대로 적용된다.
--     DEFINER 로 바꾸면 타인 데이터가 새어 나간다.
--   - 선점과 태스크 insert 를 **한 SQL 문(CTE)** 에 묶어, 이번 호출이 새로 따낸 행만
--     시딩한다. UNIQUE(template_id, applied_date) 가 동시 요청을 원자적으로 중재한다.
--     두 문장으로 쪼개면 장부 재조회 경로가 열려 중복 시딩이 발생한다.
--   - 바뀐 것은 마지막 문에 붙은 `returning *` 하나뿐이다. 선점·삽입 로직은 동일하다.
--
-- 반환형이 바뀌므로 create or replace 로는 교체되지 않는다(“cannot change return type”).
-- drop 하면 권한도 함께 사라지므로 revoke/grant 를 다시 건다.

drop function if exists public.seed_daily_templates(date);

create function public.seed_daily_templates(p_target_date date)
returns setof public.tasks
language sql
security invoker
as $$
  with claimed as (
    insert into public.task_template_applications (user_id, template_id, applied_date)
    select t.user_id, t.id, p_target_date
    from public.task_templates t
    where t.user_id = auth.uid()
      and t.is_active
    on conflict (template_id, applied_date) do nothing
    returning template_id
  )
  insert into public.tasks
    (user_id, title, description, scope, target_date, is_completed, category, priority)
  select t.user_id, t.title, t.description, 'daily', p_target_date, false,
         t.category, t.priority
  from public.task_templates t
  join claimed c on c.template_id = t.id
  returning *;
$$;

-- 인증 사용자만 실행 가능 (anon/public 차단)
revoke all on function public.seed_daily_templates(date) from public;
revoke all on function public.seed_daily_templates(date) from anon;
grant execute on function public.seed_daily_templates(date) to authenticated;
