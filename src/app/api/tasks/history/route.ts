import { dbError, withAuth } from '@/lib/api/route-helpers'

/**
 * 완료 기록 집계 + 목록 한 페이지.
 *
 * 기존 `GET /api/tasks?completed=true` 는 완료 태스크를 전부 내려보내 브라우저가
 * 집계했는데, PostgREST 기본 max-rows(1000)에 걸려 응답이 조용히 잘렸다.
 * 그래서 총 완료 수·완료율·과거 월 필터가 전부 틀린 값을 보여줬다.
 * 집계는 DB가 전체 행에 대해 수행하고 목록은 요청한 페이지만 돌려준다.
 *
 * 쿼리 파라미터
 *   tz         IANA 타임존 (필수) — 날짜 절단 기준. 없으면 UTC 로 잘려 KST 새벽 건이 전날로 밀린다
 *   month      'yyyy-MM' 목록 필터. 생략 시 전체 기간
 *   category   카테고리 필터. 생략/'all' 이면 전체
 *   limit      목록 건수 (기본 40, 0 이면 집계만)
 *   offset     목록 시작 위치 (기본 0)
 *   grid_start 일별 카운트 시작일 (히트맵·미니달력). grid_end 와 함께 있을 때만 계산
 *   grid_end   일별 카운트 종료일
 */
export const GET = withAuth(async (request, { supabase }) => {
  const { searchParams } = new URL(request.url)

  const month = searchParams.get('month')
  const gridStart = searchParams.get('grid_start')
  const gridEnd = searchParams.get('grid_end')

  const limitRaw = Number(searchParams.get('limit') ?? 40)
  const offsetRaw = Number(searchParams.get('offset') ?? 0)
  // 음수·NaN·과대 요청을 막는다 (한 페이지 상한 500).
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 0), 500) : 40
  const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0

  if (month && !/^\d{4}-\d{2}$/.test(month)) {
    return Response.json({ error: 'month 는 yyyy-MM 형식이어야 합니다.' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('completed_history', {
    p_tz: searchParams.get('tz') || 'UTC',
    p_month: month,
    p_category: searchParams.get('category') || 'all',
    p_limit: limit,
    p_offset: offset,
    p_grid_start: gridStart,
    p_grid_end: gridEnd,
  })

  if (error) return dbError(error)
  return Response.json(data)
})
