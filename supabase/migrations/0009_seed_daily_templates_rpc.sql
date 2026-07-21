-- 일간 템플릿 시딩을 단일 왕복 RPC로 축소 — Supabase SQL Editor에 붙여넣고 실행하세요.
--
-- 배경: 기존 시딩은 앱(route handler)이 원격 DB로 "활성 템플릿 조회 → 적용기록 조회
--   → 선점(upsert) → 태스크 insert"를 매번 여러 번 왕복했다. 크로스리전 지연이
--   누적돼 일간 첫 조회가 느리고 CI e2e 가 간헐 실패(flake)했다.
--   이 함수는 그 과정을 한 SQL 문(CTE)으로 묶어 DB 엔진 내부에서 처리한다.
--
-- 안전성:
--   - SECURITY INVOKER(기본): 호출자 권한으로 실행 → 기존 RLS 정책이 그대로 적용된다.
--   - 선점(INSERT ... ON CONFLICT DO NOTHING RETURNING)과 태스크 insert 를 같은
--     CTE 문에 묶어, 새로 선점된 행만 시딩한다. UNIQUE(template_id, applied_date)
--     제약이 동시 요청을 원자적으로 중재하므로 (템플릿, 날짜)당 1회만 시딩된다.
--   - 단일 문 = 단일 트랜잭션이라 "선점만 되고 태스크는 안 생기는" 부분 실패 창도 없다.
--   - create or replace 이므로 재실행 멱등.

create or replace function public.seed_daily_templates(p_target_date date)
returns void
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
  join claimed c on c.template_id = t.id;
$$;

-- 인증 사용자만 실행 가능 (anon/public 차단)
revoke all on function public.seed_daily_templates(date) from public;
revoke all on function public.seed_daily_templates(date) from anon;
grant execute on function public.seed_daily_templates(date) to authenticated;
