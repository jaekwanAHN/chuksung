import type { createClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

interface TemplateRow {
  id: string
  title: string
  description: string | null
  category: string
  priority: number
}

/**
 * 지정한 날짜(targetDate)에 아직 적용되지 않은 활성 템플릿을 일간 태스크로 시딩한다.
 * (템플릿, 날짜) 당 1회만 적용되며 멱등하다.
 * 호출 측에서 시간 게이트(하루 시작 시각)를 통과했을 때만 호출할 것.
 */
export async function applyDailyTemplates(
  supabase: SupabaseServerClient,
  userId: string,
  targetDate: string
) {
  const { data: templates } = await supabase
    .from('task_templates')
    .select('id, title, description, category, priority')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (!templates || templates.length === 0) return

  // 이미 적용된 템플릿은 빠르게 거른다(흔한 경우 — 매 조회마다 재시딩 방지).
  const { data: applied } = await supabase
    .from('task_template_applications')
    .select('template_id')
    .eq('user_id', userId)
    .eq('applied_date', targetDate)

  const appliedIds = new Set((applied ?? []).map((a) => a.template_id))
  const candidates = (templates as TemplateRow[]).filter((t) => !appliedIds.has(t.id))
  if (candidates.length === 0) return

  // 적용 기록을 먼저 "선점"한다. UNIQUE(template_id, applied_date) 제약이
  // 동시 요청을 원자적으로 중재하므로, 실제로 새로 삽입된 행만 태스크로 시딩하면
  // 중복 시딩이 발생하지 않는다.
  const { data: claimed } = await supabase
    .from('task_template_applications')
    .upsert(
      candidates.map((t) => ({
        user_id: userId,
        template_id: t.id,
        applied_date: targetDate,
      })),
      { onConflict: 'template_id,applied_date', ignoreDuplicates: true }
    )
    .select('template_id')

  const claimedIds = new Set((claimed ?? []).map((a) => a.template_id))
  const toSeed = candidates.filter((t) => claimedIds.has(t.id))
  if (toSeed.length === 0) return

  await supabase.from('tasks').insert(
    toSeed.map((t) => ({
      user_id: userId,
      title: t.title,
      description: t.description,
      scope: 'daily',
      target_date: targetDate,
      is_completed: false,
      category: t.category,
      priority: t.priority,
    }))
  )
}
