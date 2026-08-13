-- 완료 기록 집계를 단일 RPC로 이동 — Supabase SQL Editor에 붙여넣고 실행하세요.
--
-- 배경: /history·/monthly 는 `GET /api/tasks?completed=true` 로 완료 태스크를 **전부**
--   받아 브라우저에서 집계했다. 그런데 PostgREST 기본 max-rows 가 1000이라 응답이
--   조용히 잘린다. DB에 완료 6,287건이 있어도 API는 1,000건만 돌려주고, 화면은
--   "총 완료 1000건"이라는 틀린 숫자를 보여준다. 잘렸다는 신호도 없다.
--   과거 월을 필터로 고르면 데이터가 있는데도 "0건"이 나온다.
--
-- 해결: 집계(총계/주·월 완료/일별 카운트)는 DB가 전체 행에 대해 수행하고,
--   목록은 필요한 페이지만 반환한다. 전송량이 1000행 → 숫자 몇 개 + 한 페이지로 줄고,
--   정확도는 데이터가 아무리 늘어도 유지된다.
--
-- 안전성:
--   - SECURITY INVOKER(기본): 호출자 권한 → tasks 의 RLS 정책이 그대로 적용된다.
--     SECURITY DEFINER 로 바꾸면 타인 기록이 집계에 섞이므로 금지.
--   - STABLE: 부작용 없음을 명시(플래너 최적화 힌트).
--   - create or replace 이므로 재실행 멱등.
--
-- 타임존: completed_at 은 timestamptz 다. UTC 기준으로 날짜를 자르면 KST(UTC+9)
--   00~09시 완료 건이 전날로 집계돼, 로컬 시각으로 계산하던 클라이언트(date-fns)와
--   결과가 어긋난다. 그래서 호출자가 IANA 타임존을 넘기고 모든 날짜 절단을
--   `at time zone p_tz` 로 맞춘다.

create or replace function public.completed_history(
  p_tz text default 'UTC',
  p_month text default null,          -- 'yyyy-MM' 목록 필터. null 이면 전체 기간
  p_category text default 'all',      -- 'all' 이면 전 카테고리
  p_limit int default 40,             -- 0 이면 목록 없이 집계만 (월간 미니달력용)
  p_offset int default 0,
  p_grid_start date default null,     -- 일별 카운트 범위(히트맵/미니달력). null 이면 생략
  p_grid_end date default null
)
returns jsonb
language plpgsql
security invoker
stable
as $$
declare
  v_today date;
  v_week_start date;
  v_month_start date;
  v_range_start date;
  v_range_end date;
  v_total bigint;
  v_this_week bigint;
  v_this_month bigint;
  v_filtered bigint;
  v_rows jsonb;
  v_day_counts jsonb;
begin
  -- 사용자 타임존 기준 '오늘'과 주/월 경계. 주 시작은 월요일(클라이언트 weekStartsOn:1 과 일치).
  v_today := (now() at time zone p_tz)::date;
  v_week_start := date_trunc('week', v_today::timestamp)::date;
  v_month_start := date_trunc('month', v_today::timestamp)::date;

  -- 목록 필터 범위
  if p_month is not null then
    v_range_start := to_date(p_month || '-01', 'YYYY-MM-DD');
    v_range_end := (v_range_start + interval '1 month' - interval '1 day')::date;
  end if;

  -- 집계는 전체 행에 대해 DB가 수행한다 (1000건 절단 없음).
  select
    count(*),
    count(*) filter (where (completed_at at time zone p_tz)::date >= v_week_start),
    count(*) filter (where (completed_at at time zone p_tz)::date >= v_month_start)
  into v_total, v_this_week, v_this_month
  from public.tasks
  where is_completed and completed_at is not null;

  -- 필터를 적용한 총 건수 ("완료된 태스크 (N건)" 표시용 — 페이지 크기와 무관해야 한다)
  select count(*)
  into v_filtered
  from public.tasks
  where is_completed
    and completed_at is not null
    and (p_category = 'all' or category = p_category)
    and (
      v_range_start is null
      or (completed_at at time zone p_tz)::date between v_range_start and v_range_end
    );

  -- 목록 한 페이지
  if p_limit > 0 then
    select coalesce(jsonb_agg(to_jsonb(t) order by t.completed_at desc), '[]'::jsonb)
    into v_rows
    from (
      select *
      from public.tasks
      where is_completed
        and completed_at is not null
        and (p_category = 'all' or category = p_category)
        and (
          v_range_start is null
          or (completed_at at time zone p_tz)::date between v_range_start and v_range_end
        )
      order by completed_at desc
      limit p_limit offset p_offset
    ) t;
  else
    v_rows := '[]'::jsonb;
  end if;

  -- 일별 완료 수 (히트맵 12주 / 월간 미니달력). 범위를 호출자가 정해 한 함수로 둘 다 쓴다.
  if p_grid_start is not null and p_grid_end is not null then
    select coalesce(jsonb_object_agg(d.day::text, d.cnt), '{}'::jsonb)
    into v_day_counts
    from (
      select (completed_at at time zone p_tz)::date as day, count(*) as cnt
      from public.tasks
      where is_completed
        and completed_at is not null
        and (completed_at at time zone p_tz)::date between p_grid_start and p_grid_end
      group by 1
    ) d;
  else
    v_day_counts := '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'total', v_total,
    'this_week', v_this_week,
    'this_month', v_this_month,
    'filtered_count', v_filtered,
    'rows', coalesce(v_rows, '[]'::jsonb),
    'day_counts', v_day_counts
  );
end;
$$;

-- 인증 사용자만 실행 가능 (anon/public 차단)
revoke all on function public.completed_history(text, text, text, int, int, date, date) from public;
revoke all on function public.completed_history(text, text, text, int, int, date, date) from anon;
grant execute on function public.completed_history(text, text, text, int, int, date, date) to authenticated;
