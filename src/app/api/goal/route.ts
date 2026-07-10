import { dbError, parseBody, withAuth } from '@/lib/api/route-helpers'
import { upsertGoalSchema } from '@/lib/api/schemas'

export const GET = withAuth(async (_request, { supabase, user }) => {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return dbError(error)
  return Response.json(data)
})

export const PUT = withAuth(async (request, { supabase, user }) => {
  const parsed = await parseBody(request, upsertGoalSchema)
  if (!parsed.ok) return parsed.response

  const { data, error } = await supabase
    .from('goals')
    .upsert({ user_id: user.id, content: parsed.data.content }, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) return dbError(error)
  return Response.json(data)
})
