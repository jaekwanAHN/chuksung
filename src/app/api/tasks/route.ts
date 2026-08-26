import { applyDailyTemplates } from '@/lib/apply-daily-templates'
import { dbError, parseBody, withAuth } from '@/lib/api/route-helpers'
import { createTaskSchema } from '@/lib/api/schemas'
import {
  DATE_PATTERN,
  isSeedCandidateDate,
  isTrustableClientNow,
  resolveSeedTargetDate,
} from '@/lib/daily-seed'

export const GET = withAuth(async (request, { supabase, user }) => {
  const { searchParams } = new URL(request.url)
  const scope = searchParams.get('scope')
  const targetDate = searchParams.get('target_date')
  const start = searchParams.get('start')
  const end = searchParams.get('end')
  // 완료 기록 조회는 집계 RPC 를 쓰는 `GET /api/tasks/history` 로 분리됐다.
  // 여기서 전체를 내려보내던 completed=true 모드는 PostgREST max-rows(1000)에
  // 걸려 조용히 잘렸으므로 제거했다.
  const clientNow = searchParams.get('client_now') // 로컬 현재시각 'yyyy-MM-ddTHH:mm'

  // 시간 게이트: scope=daily 이고 조회 날짜가 그 사용자의 "유효 오늘"일 때만 시딩한다.
  // 판정은 템플릿 뮤테이션과 공유한다 (`@/lib/daily-seed`) — 양쪽이 따로 판정하면
  // "GET 은 심는데 POST 는 안 심는" 날짜가 생긴다.
  if (
    scope === 'daily' &&
    targetDate &&
    DATE_PATTERN.test(targetDate) &&
    isTrustableClientNow(clientNow) &&
    isSeedCandidateDate(targetDate, clientNow)
  ) {
    const seedTargetDate = await resolveSeedTargetDate(supabase, user.id, clientNow)
    if (targetDate === seedTargetDate) {
      await applyDailyTemplates(supabase, targetDate)
    }
  }

  let query = supabase.from('tasks').select('*')

  if (scope === 'monthly' && start && end) {
    query = query
      .eq('scope', scope)
      .gte('target_date', start)
      .lte('target_date', end)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
  } else if (scope && targetDate) {
    query = query
      .eq('scope', scope)
      .eq('target_date', targetDate)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
  }

  const { data, error } = await query
  if (error) return dbError(error)
  return Response.json(data ?? [])
})

export const POST = withAuth(async (request, { supabase, user }) => {
  const parsed = await parseBody(request, createTaskSchema)
  if (!parsed.ok) return parsed.response

  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single()

  if (error) return dbError(error)
  return Response.json(data, { status: 201 })
})
