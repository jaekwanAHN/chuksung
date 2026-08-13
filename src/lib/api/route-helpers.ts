import { NextRequest } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { PostgrestError } from '@supabase/supabase-js'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/api/rate-limit'

const MAX_BODY_BYTES = 64 * 1024

interface AuthContext {
  supabase: SupabaseClient
  user: User
}

/**
 * Route Handler 인증 가드. 미인증 요청은 401, 호출량 초과는 429로 끊고,
 * 통과한 요청에는 supabase 클라이언트와 user를 넘긴다.
 *
 * 사용 예:
 *   export const POST = withAuth(async (request, { supabase, user }) => { ... })
 *   export const PATCH = withAuth<RouteContext<'/api/tasks/[id]'>>(
 *     async (request, { supabase, user }, ctx) => { ... }
 *   )
 */
export function withAuth<Ctx = unknown>(
  handler: (
    request: NextRequest,
    auth: AuthContext,
    ctx: Ctx
  ) => Promise<Response>
) {
  return async (request: NextRequest, ctx: Ctx): Promise<Response> => {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const rate = checkRateLimit(user.id, request.method)
    if (!rate.ok) {
      return Response.json(
        { error: '요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } }
      )
    }

    return handler(request, { supabase, user }, ctx)
  }
}

type ParsedBody<T> =
  | { ok: true; data: T }
  | { ok: false; response: Response }

async function readBodyWithLimit(request: NextRequest): Promise<string | null> {
  const declared = Number(request.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return null

  const body = request.body
  if (!body) return ''

  const reader = body.getReader()
  const decoder = new TextDecoder()
  let text = ''
  let total = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_BODY_BYTES) {
      await reader.cancel()
      return null
    }
    text += decoder.decode(value, { stream: true })
  }

  return text + decoder.decode()
}

/**
 * 요청 본문을 zod 스키마로 검증한다. 스키마에 없는 키는 제거되므로
 * 임의 컬럼 주입(mass assignment)이 차단된다. 실패 시 400 응답을 돌려준다.
 */
export async function parseBody<T>(
  request: NextRequest,
  schema: z.ZodType<T>
): Promise<ParsedBody<T>> {
  const raw = await readBodyWithLimit(request)
  if (raw === null) {
    return {
      ok: false,
      response: Response.json(
        { error: '본문이 너무 큽니다.' },
        { status: 413 }
      ),
    }
  }

  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return {
      ok: false,
      response: Response.json(
        { error: '본문이 올바른 JSON이 아닙니다.' },
        { status: 400 }
      ),
    }
  }

  const result = schema.safeParse(json)
  if (!result.success) {
    return {
      ok: false,
      response: Response.json(
        {
          error: '입력값이 올바르지 않습니다.',
          details: z.flattenError(result.error),
        },
        { status: 400 }
      ),
    }
  }
  return { ok: true, data: result.data }
}

// Postgres/PostgREST 에러 코드 → 클라이언트에 보여줄 상태·메시지 매핑.
// 원본 error.message는 컬럼명 등 내부 구조를 노출하므로 응답에 싣지 않는다.
const DB_ERROR_MAP: Record<string, { status: number; message: string }> = {
  '23505': { status: 409, message: '이미 존재하는 데이터입니다.' },
  '23503': { status: 400, message: '참조하는 데이터가 존재하지 않습니다.' },
  '23514': { status: 400, message: '허용되지 않는 값입니다.' },
  '22P02': { status: 400, message: '값 형식이 올바르지 않습니다.' },
  PGRST116: { status: 404, message: '데이터를 찾을 수 없습니다.' },
}

export function dbError(error: PostgrestError): Response {
  console.error('[api] database error:', error.code, error.message)
  const mapped = DB_ERROR_MAP[error.code]
  return Response.json(
    { error: mapped?.message ?? '서버 오류가 발생했습니다.' },
    { status: mapped?.status ?? 500 }
  )
}
