import { dbError, parseBody, withAuth } from '@/lib/api/route-helpers'
import { createTaskTemplateSchema } from '@/lib/api/schemas'
import { seedAfterTemplateMutation } from '@/lib/daily-seed'

export const GET = withAuth(async (_request, { supabase }) => {
  const { data, error } = await supabase
    .from('task_templates')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) return dbError(error)
  return Response.json(data ?? [])
})

/**
 * 템플릿 생성 + 그 자리에서 시딩. 시딩 결과를 응답에 실어 클라이언트가 일간 목록을
 * 재조회하지 않고 갱신하게 한다 (재조회 경합 제거 — docs/task-race-guards.md).
 *
 * `client_now` 는 body 가 아니라 쿼리스트링으로 받는다. `createTaskTemplateSchema` 는
 * "쓰기 가능 컬럼 화이트리스트"라 (`@/lib/api/schemas`) 컬럼이 아닌 키를 넣으면
 * insert 로 그대로 흘러간다. 일간 GET 도 같은 이름의 쿼리 파라미터를 쓴다.
 */
export const POST = withAuth(async (request, { supabase, user }) => {
  const parsed = await parseBody(request, createTaskTemplateSchema)
  if (!parsed.ok) return parsed.response

  const { data, error } = await supabase
    .from('task_templates')
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single()

  if (error) return dbError(error)

  const clientNow = new URL(request.url).searchParams.get('client_now')
  const seeding = await seedAfterTemplateMutation(supabase, user.id, clientNow)

  return Response.json({ template: data, ...seeding }, { status: 201 })
})
