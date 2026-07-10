import { dbError, parseBody, withAuth } from '@/lib/api/route-helpers'
import { updateProfileSchema } from '@/lib/api/schemas'

export const GET = withAuth(async (_request, { supabase, user }) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) return dbError(error)
  return Response.json(data)
})

export const PATCH = withAuth(async (request, { supabase, user }) => {
  const parsed = await parseBody(request, updateProfileSchema)
  if (!parsed.ok) return parsed.response

  const { data, error } = await supabase
    .from('profiles')
    .update(parsed.data)
    .eq('id', user.id)
    .select()
    .single()

  if (error) return dbError(error)
  return Response.json(data)
})
