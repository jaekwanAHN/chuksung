import { dbError, parseBody, withAuth } from '@/lib/api/route-helpers'
import { createTaskTemplateSchema } from '@/lib/api/schemas'

export const GET = withAuth(async (_request, { supabase }) => {
  const { data, error } = await supabase
    .from('task_templates')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) return dbError(error)
  return Response.json(data ?? [])
})

export const POST = withAuth(async (request, { supabase, user }) => {
  const parsed = await parseBody(request, createTaskTemplateSchema)
  if (!parsed.ok) return parsed.response

  const { data, error } = await supabase
    .from('task_templates')
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single()

  if (error) return dbError(error)
  return Response.json(data, { status: 201 })
})
