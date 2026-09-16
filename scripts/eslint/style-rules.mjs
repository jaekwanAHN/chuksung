// 집행 범위·예외·정적 분석의 한계: docs/design-tokens.md

function isCn(node) {
  return node?.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === 'cn'
}

function staticText(node) {
  return node?.type === 'Literal' && typeof node.value === 'string' ? node.value : null
}

function templateText(node) {
  return node.quasis.map((part, index) => {
    let value = part.value.cooked ?? part.value.raw
    if (index > 0) value = value.replace(/^\S*/, '')
    if (index < node.quasis.length - 1) value = value.replace(/\S*$/, '')
    return { node: part, value }
  })
}

function tokens(value) {
  return value.trim().split(/\s+/).filter(Boolean)
}

function splitUtility(token) {
  let depth = 0
  let boundary = -1
  for (let i = 0; i < token.length; i++) {
    if (token[i] === '[' || token[i] === '(') depth++
    else if (token[i] === ']' || token[i] === ')') depth--
    else if (token[i] === ':' && depth === 0) boundary = i
  }
  return {
    variant: token.slice(0, boundary + 1),
    utility: token.slice(boundary + 1).replace(/^!|!$/g, '').split('/')[0],
  }
}

function parts(node) {
  if (isCn(node)) return node.arguments
  if (node?.type === 'ArrayExpression') return node.elements.filter(Boolean)
  return null
}

function guaranteedTokens(node) {
  const value = staticText(node)
  if (value !== null) return tokens(value)
  if (node?.type === 'TemplateLiteral') return templateText(node).flatMap(({ value }) => tokens(value))
  const children = parts(node)
  if (children) return children.flatMap(guaranteedTokens)
  if (node?.type === 'ConditionalExpression') {
    const alternate = new Set(guaranteedTokens(node.alternate))
    return guaranteedTokens(node.consequent).filter((token) => alternate.has(token))
  }
  return []
}

function hasFocusReplacement(available, variant) {
  const classes = new Set(available)
  const prefixes = variant ? [variant] : ['focus:', 'focus-visible:']
  return prefixes.some((prefix) =>
    classes.has(`${prefix}outline-2`) && classes.has(`${prefix}outline-focus-ring`)
  )
}

export const noRawStyleUtilities = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      raw: '{{token}} 대신 {{replacement}}을 사용하세요 (AGENTS.md 「하드 룰」, docs/design-tokens.md).',
      outline: '{{token}}은 대체 포커스 표시 없이 사용할 수 없습니다. 공용 폼 컨트롤 또는 포커스 토큰을 사용하세요 (docs/design-tokens.md).',
    },
  },
  create(context) {
    const checked = new WeakSet()

    function inspectString(node, value, available) {
      if (checked.has(node)) return
      checked.add(node)
      for (const token of tokens(value)) {
        const { utility, variant } = splitUtility(token)
        const replacements = {
          'rounded-md': 'rounded-field',
          'rounded-lg': 'rounded-field',
          'rounded-xl': 'rounded-card',
          'rounded-2xl': 'rounded-modal',
          'border-zinc-100': 'border-border-muted',
          'border-zinc-200': 'border-border-subtle',
        }
        const replacement = Object.hasOwn(replacements, utility) ? replacements[utility] : null
        if (replacement || /^border-zinc-/.test(utility)) {
          context.report({
            node,
            messageId: 'raw',
            data: { token, replacement: replacement ?? '시맨틱 테두리 토큰 또는 근거가 있는 국소 예외' },
          })
        } else if (utility === 'outline-none' && !hasFocusReplacement(available, variant)) {
          context.report({ node, messageId: 'outline', data: { token } })
        }
      }
    }

    function inspect(node, inherited = []) {
      if (!node) return
      const available = [...inherited, ...guaranteedTokens(node)]
      const value = staticText(node)
      if (value !== null) return inspectString(node, value, available)
      const children = parts(node)
      if (children) {
        children.forEach((child) => inspect(child, available))
      } else if (node.type === 'TemplateLiteral') {
        templateText(node).forEach(({ node: part, value }) => inspectString(part, value, available))
        node.expressions.forEach((expression) => inspect(expression, available))
      } else if (node.type === 'ConditionalExpression') {
        inspect(node.consequent, available)
        inspect(node.alternate, available)
      } else if (node.type === 'LogicalExpression') {
        if (node.operator !== '&&') inspect(node.left, available)
        inspect(node.right, available)
      } else if (node.type === 'ObjectExpression') {
        for (const property of node.properties) {
          if (property.type !== 'Property') continue
          if (property.computed || staticText(property.key) !== null) inspect(property.key, available)
        }
      }
    }

    return {
      JSXAttribute(node) {
        if (node.name.name !== 'className') return
        inspect(node.value?.type === 'JSXExpressionContainer' ? node.value.expression : node.value)
      },
      CallExpression(node) {
        if (isCn(node)) inspect(node)
      },
    }
  },
}

export const noRawFormControl = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      raw: 'raw <{{name}}> 대신 공용 {{component}}을 사용하세요 (AGENTS.md 「하드 룰」). checkbox/radio만 예외입니다.',
    },
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        if (node.name.type !== 'JSXIdentifier') return
        const name = node.name.name
        if (!['input', 'select', 'textarea'].includes(name)) return
        const component = { input: 'Input', select: 'Select', textarea: 'Textarea' }[name]
        if (name === 'input') {
          let type = null
          for (const attribute of node.attributes) {
            if (attribute.type === 'JSXSpreadAttribute') type = null
            else if (attribute.name.name === 'type') {
              const value = attribute.value
              type = staticText(value?.type === 'JSXExpressionContainer' ? value.expression : value)
            }
          }
          if (type === 'checkbox' || type === 'radio') return
        }
        context.report({ node, messageId: 'raw', data: { name, component } })
      },
    }
  },
}
