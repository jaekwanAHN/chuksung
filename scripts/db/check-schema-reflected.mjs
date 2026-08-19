/**
 * 마이그레이션이 만드는 객체가 `supabase/schema.sql` 에 반영돼 있는지 검사한다.
 *
 * `schema.sql` 이 스키마의 소스 오브 트루스이고 마이그레이션은 거기 도달하는
 * 경로다(AGENTS.md 「명령어」). 그 규칙을 사람이 손으로 지키던 탓에 한 번 어긋난
 * 적이 있다 — 배경과 한계는 docs/schema-source-of-truth.md
 *
 * 잡는 것: 객체가 통째로 빠진 경우. 이름만 대조하므로 정의 내용의 어긋남은 못 잡는다.
 */
import fs from 'node:fs'
import path from 'node:path'

const MIGRATIONS_DIR = 'supabase/migrations'
const SCHEMA_FILE = 'supabase/schema.sql'

/** 객체를 만드는 구문과, 이름이 몇 번째 캡처인지 */
const PATTERNS = [
  [/create\s+(?:or\s+replace\s+)?table\s+(?:if\s+not\s+exists\s+)?([\w.]+)/gi, 'table'],
  [/create\s+(?:or\s+replace\s+)?view\s+([\w.]+)/gi, 'view'],
  [/create\s+(?:or\s+replace\s+)?function\s+([\w.]+)/gi, 'function'],
  [/create\s+(?:unique\s+)?index\s+(?:if\s+not\s+exists\s+)?([\w.]+)/gi, 'index'],
  [/create\s+trigger\s+([\w.]+)/gi, 'trigger'],
  [/create\s+type\s+([\w.]+)/gi, 'type'],
  [/create\s+policy\s+"?([\w\s.]+?)"?\s+on\s/gi, 'policy'],
  [/add\s+constraint\s+([\w.]+)/gi, 'constraint'],
  [/add\s+column\s+(?:if\s+not\s+exists\s+)?([\w.]+)/gi, 'column'],
]

/** 문자열 리터럴·주석은 대상에서 뺀다 (시드 INSERT 의 텍스트가 오탐을 만든다) */
function strip(sql) {
  return sql.replace(/--[^\n]*/g, '').replace(/'(?:[^']|'')*'/g, "''")
}

const schema = strip(fs.readFileSync(SCHEMA_FILE, 'utf8')).toLowerCase()
const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()

const missing = []
for (const file of files) {
  const sql = strip(fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'))
  for (const [re, kind] of PATTERNS) {
    for (const m of sql.matchAll(re)) {
      const name = m[1].trim().replace(/^public\./i, '').toLowerCase()
      if (!name) continue
      if (!schema.includes(name)) missing.push({ file, kind, name })
    }
  }
}

if (missing.length === 0) {
  console.log(`✔ ${files.length}개 마이그레이션의 객체가 모두 ${SCHEMA_FILE} 에 반영돼 있습니다.`)
  process.exit(0)
}

console.error(`✘ ${SCHEMA_FILE} 에 반영되지 않은 객체 ${missing.length}건:\n`)
for (const { file, kind, name } of missing) {
  console.error(`  ${kind.padEnd(11)} ${name}   (${file})`)
}
console.error(
  `\n${SCHEMA_FILE} 이 스키마의 소스 오브 트루스입니다. 위 객체의 정의를 옮기세요.` +
    `\n배경: docs/schema-source-of-truth.md`
)
process.exit(1)
