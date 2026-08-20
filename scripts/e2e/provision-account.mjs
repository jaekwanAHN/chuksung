#!/usr/bin/env node
/**
 * 테스트 계정을 하나(또는 여럿) 새로 만들고, 기준 계정의 데이터를 그대로 복제한다.
 *
 * 쓰임새 두 가지. `--use` 로 고르며, 출력하는 환경변수 이름이 달라진다.
 *   perf  perf 측정 전용 계정을 E2E 계정에서 떼어낸다  → docs/perf/accounts.md
 *   slot  병렬 작업용 E2E 계정 풀을 만든다             → docs/parallel-work.md
 * 배경·제약·복제 대상 선정 근거는 위 문서를 볼 것.
 *
 * 사용법:
 *   node scripts/e2e/provision-account.mjs --use perf --email perf@example.com
 *   node scripts/e2e/provision-account.mjs --use slot --email a@x.com --email b@x.com
 *   node scripts/e2e/provision-account.mjs --use slot --email a@x.com --dry-run
 *
 * 필요한 환경변수 (.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   E2E_TEST_USER_EMAIL (--from 으로 덮어쓸 수 있는 복제 원본)
 */
import fs from 'node:fs'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

for (const f of ['.env.local', '.env.test']) {
  if (fs.existsSync(f)) process.loadEnvFile(f)
}

// 복제 순서 = FK 의존 순서. task_template_applications 는 task_templates 뒤에 와야 한다.
// user_id 가 없는 전역 테이블(quiz_categories/questions/follow_ups)은 복제 대상이 아니다.
const CLONED_TABLES = [
  'tasks',
  'job_postings',
  'goals',
  'ddays',
  'quiz_histories',
  'task_templates',
  'task_template_applications',
]

// 복제 시 원본 값을 버리는 컬럼. id 는 새로 발급하고, user_id 는 대상 계정으로 바꾼다.
const DROPPED_COLUMNS = new Set(['id', 'user_id'])

const INSERT_BATCH = 500
const SELECT_PAGE = 1000

/**
 * 만든 계정을 `.env.local` 에 어떤 이름으로 넣을지.
 *
 * 이 스크립트는 perf 계정을 떼어내려고 생겼지만(#113) 지금은 병렬 작업용 E2E
 * 계정 풀도 만든다(#135). 용도를 묻지 않고 `PERF_TEST_USER_*` 를 출력하면,
 * 그 안내를 따랐을 때 **perf 가 E2E 계정을 가리키게 된다** — `docs/perf/accounts.md`
 * 가 경고하는 바로 그 사고다. 그래서 용도를 인자로 받는다.
 */
const USES = {
  perf: () => ['PERF_TEST_USER_EMAIL', 'PERF_TEST_USER_PASSWORD'],
  // 슬롯 번호가 붙는다. 풀 크기는 _1 부터 끊길 때까지 세어 정한다
  // (scripts/worktree/slots.mjs, docs/parallel-work.md).
  slot: (i) => [`E2E_TEST_USER_EMAIL_${i}`, `E2E_TEST_USER_PASSWORD_${i}`],
}

function parseArgs(argv) {
  const opts = {
    emails: [],
    from: process.env.E2E_TEST_USER_EMAIL,
    password: null,
    dryRun: false,
    use: null,
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--email') opts.emails.push(argv[++i])
    else if (a === '--from') opts.from = argv[++i]
    else if (a === '--password') opts.password = argv[++i]
    else if (a === '--use') opts.use = argv[++i]
    else if (a === '--dry-run') opts.dryRun = true
    else if (a === '--help' || a === '-h') opts.help = true
    else throw new Error(`알 수 없는 인자: ${a}`)
  }
  if (opts.use && !(opts.use in USES)) {
    throw new Error(`--use 는 ${Object.keys(USES).join(' | ')} 중 하나입니다: ${opts.use}`)
  }
  return opts
}

const HELP = `테스트 계정 프로비저닝 (기준 계정 데이터 복제)

  --email <addr>    만들 계정. 여러 번 지정하면 그만큼 만든다 (필수)
  --from <addr>     복제 원본 계정 (기본: E2E_TEST_USER_EMAIL)
  --password <pw>   비밀번호 (기본: 계정마다 랜덤 생성 후 출력)
  --use <용도>      만든 계정을 .env.local 에 넣을 이름 (필수)
                      perf  → PERF_TEST_USER_*        (docs/perf/accounts.md)
                      slot  → E2E_TEST_USER_*_<번호>  (docs/parallel-work.md)
  --dry-run         복제 대상 행 수만 세고 아무것도 쓰지 않는다
`

/** 서비스 롤 클라이언트. 세션을 남기지 않는다. */
function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      '환경변수 누락: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 를 .env.local 에 설정하세요.\n' +
        '서비스 롤 키는 Supabase 대시보드 → Project Settings → API → service_role 에 있습니다.'
    )
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** 이메일로 auth 사용자를 찾는다. admin.listUsers 에 필터가 없어 페이지를 훑는다. */
async function findUserByEmail(admin, email) {
  const target = email.toLowerCase()
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new Error(`사용자 목록 조회 실패: ${error.message}`)
    const hit = data.users.find((u) => u.email?.toLowerCase() === target)
    if (hit) return hit
    if (data.users.length < 200) return null
  }
  return null
}

/**
 * 한 테이블에서 원본 계정의 행을 전부 읽는다.
 *
 * user_id 로 반드시 좁힌다 — 같은 프로젝트에 실제 사용자 계정이 함께 있어서
 * 범위를 넓히면 실데이터를 건드린다 (docs/perf/accounts.md).
 */
async function readAll(admin, table, userId) {
  const rows = []
  for (let from = 0; ; from += SELECT_PAGE) {
    const { data, error } = await admin
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .range(from, from + SELECT_PAGE - 1)
    if (error) throw new Error(`${table} 조회 실패: ${error.message}`)
    rows.push(...data)
    if (data.length < SELECT_PAGE) return rows
  }
}

async function insertBatched(admin, table, rows) {
  for (let i = 0; i < rows.length; i += INSERT_BATCH) {
    const chunk = rows.slice(i, i + INSERT_BATCH)
    const { error } = await admin.from(table).insert(chunk)
    if (error) throw new Error(`${table} 복제 실패 (${i}행부터): ${error.message}`)
  }
}

/** 원본 행에서 id·user_id 를 걷어내고 대상 계정 소유로 바꾼다. */
function rebase(row, targetUserId) {
  const out = { user_id: targetUserId }
  for (const [k, v] of Object.entries(row)) {
    if (!DROPPED_COLUMNS.has(k)) out[k] = v
  }
  return out
}

async function countRows(admin, table, userId) {
  const { count, error } = await admin
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (error) throw new Error(`${table} 카운트 실패: ${error.message}`)
  return count
}

/**
 * 계정 하나를 만들고 원본 데이터를 복제한다.
 * @returns {Promise<{email: string, password: string, userId: string, counts: Record<string, number>}>}
 */
export async function provisionAccount(admin, { email, password, source }) {
  const existing = await findUserByEmail(admin, email)
  if (existing) {
    throw new Error(
      `${email} 계정이 이미 있습니다 (id: ${existing.id}). ` +
        '다시 만들려면 Supabase 대시보드에서 먼저 삭제하세요 — ' +
        '이 스크립트는 기존 계정에 덧씌우지 않습니다(행이 두 배가 됩니다).'
    )
  }

  const pw = password ?? crypto.randomBytes(18).toString('base64url')
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: pw,
    email_confirm: true, // 메일 확인 없이 바로 password 로그인이 되게 한다
  })
  if (createErr) throw new Error(`계정 생성 실패: ${createErr.message}`)
  const userId = created.user.id

  // profiles 행은 on_auth_user_created 트리거가 만든다. 커밋 직후라 잠깐 늦을 수 있다.
  let profileReady = false
  for (let i = 0; i < 10 && !profileReady; i++) {
    const { data } = await admin.from('profiles').select('id').eq('id', userId).maybeSingle()
    profileReady = Boolean(data)
    if (!profileReady) await new Promise((r) => setTimeout(r, 300))
  }
  if (!profileReady) throw new Error('profiles 행이 생성되지 않았습니다 (handle_new_user 트리거 확인)')

  // day_start_time 은 반드시 옮긴다 — 일간 경계 계산이 이 값에 의존한다.
  const { error: profErr } = await admin
    .from('profiles')
    .update({ day_start_time: source.profile.day_start_time })
    .eq('id', userId)
  if (profErr) throw new Error(`profiles 복사 실패: ${profErr.message}`)

  const counts = {}
  const templateIdMap = new Map()

  for (const table of CLONED_TABLES) {
    const rows = source.rows[table]
    if (rows.length === 0) {
      counts[table] = 0
      continue
    }

    let payload
    if (table === 'task_templates') {
      // id 를 클라이언트에서 발급해 매핑을 미리 확보한다. insert 반환 순서에
      // 기대지 않기 위해서다. (applications 의 template_id 재매핑에 쓴다)
      payload = rows.map((row) => {
        const newId = crypto.randomUUID()
        templateIdMap.set(row.id, newId)
        return { ...rebase(row, userId), id: newId }
      })
    } else if (table === 'task_template_applications') {
      // UNIQUE (template_id, applied_date) 가 user_id 를 포함하지 않는다.
      // 원본 template_id 를 그대로 쓰면 원본 계정 행과 충돌한다 — 반드시 재매핑.
      payload = rows.map((row) => {
        const mapped = templateIdMap.get(row.template_id)
        if (!mapped) throw new Error(`template_id 재매핑 실패: ${row.template_id}`)
        return { ...rebase(row, userId), template_id: mapped }
      })
    } else {
      payload = rows.map((row) => rebase(row, userId))
    }

    await insertBatched(admin, table, payload)
    counts[table] = payload.length
  }

  return { email, password: pw, userId, counts }
}

/** 원본 계정의 프로필과 복제 대상 행을 한 번만 읽어 둔다 (계정 N개에 재사용). */
async function loadSource(admin, email) {
  const user = await findUserByEmail(admin, email)
  if (!user) throw new Error(`원본 계정을 찾을 수 없습니다: ${email}`)

  const { data: profile, error } = await admin
    .from('profiles')
    .select('day_start_time')
    .eq('id', user.id)
    .single()
  if (error) throw new Error(`원본 profiles 조회 실패: ${error.message}`)

  const rows = {}
  for (const table of CLONED_TABLES) rows[table] = await readAll(admin, table, user.id)
  return { email, userId: user.id, profile, rows }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help) return console.log(HELP)
  if (opts.emails.length === 0) throw new Error(`--email 이 필요합니다.\n\n${HELP}`)
  if (!opts.from) throw new Error('--from 또는 E2E_TEST_USER_EMAIL 이 필요합니다.')
  // 기본값을 두지 않는다. 용도를 잘못 고르면 perf 가 E2E 계정을 가리키게 되고,
  // 그 사고는 몇 주 뒤에야 드러난다 (docs/perf/accounts.md).
  if (!opts.use) throw new Error(`--use 가 필요합니다 (perf | slot).\n\n${HELP}`)

  const admin = serviceClient()
  console.log(`원본 계정: ${opts.from}`)
  const source = await loadSource(admin, opts.from)

  const total = CLONED_TABLES.reduce((n, t) => n + source.rows[t].length, 0)
  for (const t of CLONED_TABLES) console.log(`  ${t.padEnd(28)} ${source.rows[t].length}`)
  console.log(`  ${'합계'.padEnd(27)} ${total}`)
  console.log(`  day_start_time             ${source.profile.day_start_time}`)

  if (opts.dryRun) return console.log('\n--dry-run — 아무것도 쓰지 않았습니다.')

  for (const [i, email] of opts.emails.entries()) {
    console.log(`\n${email} 프로비저닝…`)
    const result = await provisionAccount(admin, { email, password: opts.password, source })
    for (const t of CLONED_TABLES) {
      const actual = await countRows(admin, t, result.userId)
      const ok = actual === result.counts[t]
      console.log(`  ${t.padEnd(28)} ${actual}${ok ? '' : ` ⚠️ 기대 ${result.counts[t]}`}`)
    }
    // slot 은 1번부터 센다 — 슬롯 0 은 기본 체크아웃의 기존 계정이다.
    const [emailKey, passwordKey] = USES[opts.use](i + 1)
    console.log(`\n  user_id: ${result.userId}`)
    console.log('  기본 체크아웃의 .env.local 에 추가하세요:')
    console.log(`    ${emailKey}=${result.email}`)
    console.log(`    ${passwordKey}=${result.password}`)
  }
}

main().catch((e) => {
  console.error(`\n실패: ${e.message}`)
  process.exit(1)
})
