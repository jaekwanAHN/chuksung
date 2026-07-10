import { dbError, parseBody, withAuth } from '@/lib/api/route-helpers'
import { updateJobPostingSchema } from '@/lib/api/schemas'

export const PATCH = withAuth<RouteContext<'/api/job-postings/[id]'>>(
  async (request, { supabase, user }, ctx) => {
    const { id } = await ctx.params
    const parsed = await parseBody(request, updateJobPostingSchema)
    if (!parsed.ok) return parsed.response

    const { data, error } = await supabase
      .from('job_postings')
      .update(parsed.data)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) return dbError(error)
    return Response.json(data)
  }
)

export const DELETE = withAuth<RouteContext<'/api/job-postings/[id]'>>(
  async (_request, { supabase, user }, ctx) => {
    const { id } = await ctx.params

    const { error } = await supabase
      .from('job_postings')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) return dbError(error)
    return new Response(null, { status: 204 })
  }
)
