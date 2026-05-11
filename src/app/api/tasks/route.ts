import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const scope = searchParams.get('scope')
  const targetDate = searchParams.get('target_date')
  const start = searchParams.get('start')
  const end = searchParams.get('end')
  const completed = searchParams.get('completed')

  let query = supabase.from('tasks').select('*')

  if (completed === 'true') {
    query = query.eq('is_completed', true).order('completed_at', { ascending: false })
  } else if (scope === 'monthly' && start && end) {
    query = query
      .eq('scope', scope)
      .gte('target_date', start)
      .lte('target_date', end)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
  } else if (scope && targetDate) {
    query = query
      .eq('scope', scope)
      .eq('target_date', targetDate)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
  }

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...body, user_id: user.id })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
