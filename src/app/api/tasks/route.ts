import { applyDailyTemplates } from '@/lib/apply-daily-templates'
import { dbError, parseBody, withAuth } from '@/lib/api/route-helpers'
import { createTaskSchema } from '@/lib/api/schemas'

export const GET = withAuth(async (request, { supabase, user }) => {
  const { searchParams } = new URL(request.url)
  const scope = searchParams.get('scope')
  const targetDate = searchParams.get('target_date')
  const start = searchParams.get('start')
  const end = searchParams.get('end')
  const completed = searchParams.get('completed')
  const clientNow = searchParams.get('client_now') // 로컬 현재시각 'yyyy-MM-ddTHH:mm'

  // 시간 게이트: scope=daily이고, 조회 날짜가 클라이언트 기준 오늘 이후이며,
  // 현재 로컬 시각이 그날의 "하루 시작 시각"을 지났을 때만 템플릿을 시딩한다.
  if (scope === 'daily' && targetDate && clientNow) {
    const today = clientNow.slice(0, 10)
    if (targetDate >= today) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('day_start_time')
        .eq('id', user.id)
        .single()
      const startTime = (profile?.day_start_time ?? '06:00:00').slice(0, 5)
      if (clientNow >= `${targetDate}T${startTime}`) {
        await applyDailyTemplates(supabase, user.id, targetDate)
      }
    }
  }

  let query = supabase.from('tasks').select('*')

  if (completed === 'true') {
    query = query.eq('is_completed', true).order('completed_at', { ascending: false })
  } else if (scope === 'monthly' && start && end) {
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
