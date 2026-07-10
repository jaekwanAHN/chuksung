import { dbError, parseBody, withAuth } from '@/lib/api/route-helpers'
import { upsertQuizHistorySchema } from '@/lib/api/schemas'

export const POST = withAuth(async (request, { supabase, user }) => {
  const parsed = await parseBody(request, upsertQuizHistorySchema)
  if (!parsed.ok) return parsed.response

  const { error } = await supabase
    .from('quiz_histories')
    .upsert(
      { ...parsed.data, user_id: user.id },
      { onConflict: 'user_id,question_id' },
    )

  if (error) return dbError(error)
  return new Response(null, { status: 204 })
})
