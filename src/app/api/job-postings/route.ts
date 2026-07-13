import { dbError, parseBody, withAuth } from '@/lib/api/route-helpers'
import { createJobPostingSchema } from '@/lib/api/schemas'

export const GET = withAuth(async (_request, { supabase }) => {
  const { data, error } = await supabase
    .from('job_postings')
    .select('*')
    .order('deadline', { ascending: true })

  if (error) return dbError(error)
  return Response.json(data ?? [])
})

export const POST = withAuth(async (request, { supabase, user }) => {
  const parsed = await parseBody(request, createJobPostingSchema)
  if (!parsed.ok) return parsed.response

  const { data, error } = await supabase
    .from('job_postings')
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single()

  if (error) return dbError(error)
  return Response.json(data, { status: 201 })
})
