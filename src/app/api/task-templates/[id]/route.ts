import { dbError, parseBody, withAuth } from '@/lib/api/route-helpers'
import { updateTaskTemplateSchema } from '@/lib/api/schemas'

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
    return Response.json(data)
  }
)

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
