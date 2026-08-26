import { dbError, parseBody, withAuth } from '@/lib/api/route-helpers'
import { updateTaskTemplateSchema } from '@/lib/api/schemas'
import { seedAfterTemplateMutation } from '@/lib/daily-seed'

/**
 * 템플릿 수정 + 그 자리에서 시딩. POST 와 같은 이유로 시딩 결과를 응답에 싣는다
 * (`../route.ts` 주석, docs/task-race-guards.md).
 *
 * 수정이 시딩을 유발하는 경로는 `is_active` false→true 다. 시딩은 (템플릿, 날짜)당
 * 1회로 멱등하므로 다른 필드만 바뀐 수정에서도 그냥 호출한다 — 어떤 수정이 시딩을
 * 바꾸는지 라우트가 따로 판정하면 그 판정이 RPC 와 어긋날 수 있다.
 */
export const PATCH = withAuth<RouteContext<'/api/task-templates/[id]'>>(
  async (request, { supabase, user }, ctx) => {
    const { id } = await ctx.params
    const parsed = await parseBody(request, updateTaskTemplateSchema)
    if (!parsed.ok) return parsed.response

    const { data, error } = await supabase
      .from('task_templates')
      .update(parsed.data)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) return dbError(error)

    const clientNow = new URL(request.url).searchParams.get('client_now')
    const seeding = await seedAfterTemplateMutation(supabase, user.id, clientNow)

    return Response.json({ template: data, ...seeding })
  }
)

// 삭제는 일간 목록을 바꿀 수 없다. 이미 심긴 태스크는 `tasks` 에 template_id 가 없어
// 템플릿과 무관하게 남고, 적용 기록만 ON DELETE CASCADE 로 함께 사라진다.
// 템플릿이 없어졌으니 다시 심을 것도 없다 — 그래서 시딩도 캐시 무효화도 하지 않는다.
export const DELETE = withAuth<RouteContext<'/api/task-templates/[id]'>>(
  async (_request, { supabase, user }, ctx) => {
    const { id } = await ctx.params

    const { error } = await supabase
      .from('task_templates')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) return dbError(error)
    return new Response(null, { status: 204 })
  }
)
