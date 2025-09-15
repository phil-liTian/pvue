import { JSChildNode, NodeTypes, RootNode, SimpleExpressionNode } from './ast'
import { CodegenOptions } from './options'
import { helperNameMap } from './runtimeHelpers'

type CodegenNode = JSChildNode

enum NewlineType {
  Start = 0,
  End = -1,
  None = -2,
  Unknown = -3,
}

export interface CodegenResult {
  code: string
}

export interface CodegenContext extends Omit<CodegenOptions, ''> {
  source: string
  code: string
  indentLevel: number
  push(code: string, newlineIndex?: number): void
  newline(): void
  indent(): void
  deindent(withoutNewLine?: boolean): void
}

function genModulePreamble(ast: RootNode, context: CodegenContext) {
  const { helpers } = ast
  const { push, runtimeModuleName, newline } = context

  if (ast.helpers.size) {
    const helpers = Array.from(ast.helpers)

    push(
      `import { ${helpers
        .map(s => `${helperNameMap[s]} as _${helperNameMap[s]}`)
        .join(', ')} } from ${JSON.stringify(runtimeModuleName)}\n`,
      NewlineType.End
    )
  }

  newline()

  push('export ')
}

function createCodegenContext(
  ast: RootNode,
  { mode = 'function', runtimeModuleName = 'pvue' }: CodegenOptions
): CodegenContext {
  const context: CodegenContext = {
    mode,
    source: '',
    code: ``,
    indentLevel: 0,
    runtimeModuleName,
    push(code) {
      context.code += code
    },

    // 缩进并且换行
    indent() {
      newline(++context.indentLevel)
    },

    // 回撤并且换行
    deindent(withoutNewLine = false) {
      if (withoutNewLine) {
      } else {
        newline(--context.indentLevel)
      }
    },

    // 换行
    newline() {
      newline(context.indentLevel)
    },
  }

  function newline(n: number) {
    context.push('\n' + `  `.repeat(n))
  }

  return context
}

export function generate(
  ast: RootNode,
  options: CodegenOptions
): CodegenResult {
  const context = createCodegenContext(ast, options)

  const { mode, push, indent, deindent } = context

  const helpers = Array.from(ast.helpers)
  const hasHelpers = helpers.length > 0

  // mode指定为module
  if (mode === 'module') {
    genModulePreamble(ast, context)
  }

  const functionName = 'render'
  const args = ['_ctx', '_cache']

  const signature = args.join(', ')

  push(`function ${functionName}(${signature}) {`)
  indent()

  push('return ')

  if (ast.codegenNode) {
    genNode(ast.codegenNode, context)
  }

  deindent()
  push('}')

  return {
    code: context.code,
  }
}

function genNode(node: CodegenNode, context: CodegenContext) {
  switch (node.type) {
    case NodeTypes.SIMPLE_EXPRESSION: {
      genExpression(node, context)
      break
    }
  }
}

function genExpression(node: SimpleExpressionNode, context: CodegenContext) {
  const { content, isStatic } = node
  context.push(content)
}
