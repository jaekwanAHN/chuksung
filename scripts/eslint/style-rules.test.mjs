import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ESLint, RuleTester } from 'eslint'
import { noRawFormControl, noRawStyleUtilities } from './style-rules.mjs'

RuleTester.describe = describe
RuleTester.it = it
const tester = new RuleTester({
  languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
})

tester.run('no-raw-style-utilities', noRawStyleUtilities, {
  valid: [
    '<div className="rounded-field border-border-subtle" />',
    '<div className="rounded-card border-border-muted" />',
    '<div className="rounded-modal rounded-full rounded-sm" />',
    'cn("rounded-full", active && "border-amber-200")',
    '<div title="rounded-lg" data-kind="border-zinc-200" />',
    'const errorMessage = "rounded-xl"',
    '<div className={active === "rounded-lg" ? "rounded-field" : "rounded-card"} />',
    '<div className={cn({ "rounded-field": kind === "rounded-lg" })} />',
    '<div className="outline-none focus-visible:outline-2 focus-visible:outline-focus-ring" />',
    'cn("outline-none", "focus-visible:outline-2", "focus-visible:outline-focus-ring")',
    'cn("outline-none", active ? "focus:outline-2 focus:outline-focus-ring" : "focus:outline-2 focus:outline-focus-ring")',
    'cn(active ? "outline-none focus-visible:outline-2 focus-visible:outline-focus-ring" : "")',
    '<div className={`rounded-${size} border-border-subtle`} />',
    '<div className={`custom-${suffix}-rounded-lg`} />',
    'cn("[&:hover]:rounded-card")',
    'cn("rounded-lg-custom")',
    'cn("constructor toString")',
  ],
  invalid: [
    ...['rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'border-zinc-100', 'border-zinc-200', 'border-zinc-300', 'border-zinc-400', 'hover:border-zinc-200/50', 'md:rounded-lg!', '!rounded-lg', '[&:hover]:rounded-xl'].map((token) => ({
      code: `<div className="${token}" />`, errors: [{ messageId: 'raw' }],
    })),
    { code: 'cn("rounded-lg", active && "border-zinc-200")', errors: [{ messageId: 'raw' }, { messageId: 'raw' }] },
    { code: '<div className={cn("rounded-lg")} />', errors: [{ messageId: 'raw' }] },
    { code: '<div className={active ? "rounded-xl" : "rounded-lg"} />', errors: [{ messageId: 'raw' }, { messageId: 'raw' }] },
    { code: '<div className={`rounded-xl ${active ? "border-zinc-100" : ""}`} />', errors: [{ messageId: 'raw' }, { messageId: 'raw' }] },
    { code: 'cn(["rounded-lg", { "border-zinc-200": active }])', errors: [{ messageId: 'raw' }, { messageId: 'raw' }] },
    { code: '<div className="outline-none" />', errors: [{ messageId: 'outline' }] },
    { code: 'cn("outline-none", active && "focus:outline-2 focus:outline-focus-ring")', errors: [{ messageId: 'outline' }] },
    { code: 'cn(active ? "outline-none" : "focus-visible:outline-2 focus-visible:outline-focus-ring")', errors: [{ messageId: 'outline' }] },
    { code: 'cn("focus:outline-none", "focus-visible:outline-2 focus-visible:outline-focus-ring")', errors: [{ messageId: 'outline' }] },
    { code: 'cn({ "outline-none": active, "focus:outline-2 focus:outline-focus-ring": other })', errors: [{ messageId: 'outline' }] },
    { code: '<div className={`border-${color} rounded-lg`} />', errors: [{ messageId: 'raw' }] },
  ],
})

tester.run('no-raw-form-control', noRawFormControl, {
  valid: [
    '<Input />', '<Select />', '<Textarea />', '<Field><Input /></Field>',
    '<input type="checkbox" />', '<input type={"radio"} />',
    '<input {...props} type="checkbox" />',
    '<Custom.input />',
  ],
  invalid: [
    '<input />', '<input type="text" />', '<input type="number" />',
    '<select />', '<textarea />', '<input type={kind} />',
    '<input type="checkbox" {...props} />', '<input type="checkbox" type="text" />',
  ].map((code) => ({ code, errors: [{ messageId: 'raw' }] })),
})

it('실제 설정은 앱에서 error로 집행하고 UI primitive만 제외한다', async () => {
  const eslint = new ESLint()
  const code = 'export default function Example() { return <input className="rounded-lg" /> }'
  const [app] = await eslint.lintText(code, { filePath: 'src/components/StyleProbe.tsx' })
  const errors = app.messages.filter((message) => message.ruleId?.startsWith('chuksung/'))
  assert.deepEqual(errors.map(({ ruleId, severity }) => [ruleId, severity]).sort(), [
    ['chuksung/no-raw-form-control', 2], ['chuksung/no-raw-style-utilities', 2],
  ])
  const [primitive] = await eslint.lintText(code, { filePath: 'src/components/ui/StyleProbe.tsx' })
  assert.equal(primitive.messages.filter((message) => message.ruleId?.startsWith('chuksung/')).length, 0)
})

it('근거를 명시한 국소 예외만 허용하고 같은 파일의 다른 위반은 보고한다', async () => {
  const eslint = new ESLint()
  const [result] = await eslint.lintText(`
    import { cn } from '@/lib/utils'
    export const miniature = cn(
      // eslint-disable-next-line chuksung/no-raw-style-utilities -- 미니 달력 셀 (docs/design-tokens.md)
      'rounded-md'
    )
    export const invalid = cn('rounded-lg')
  `, { filePath: 'src/components/StyleProbe.tsx' })
  const violations = result.messages.filter(({ ruleId }) => ruleId === 'chuksung/no-raw-style-utilities')
  assert.equal(violations.length, 1)
  assert.match(violations[0].message, /rounded-lg/)
})
