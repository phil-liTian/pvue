import { isArray, isString, isSymbol, PatchFlagNames } from '@pvue/shared'
import {
  CallExpression,
  CompoundExpressionNode,
  FunctionExpression,
  getVNodeBlockHelper,
  getVNodeHelper,
  InterpolationNode,
  JSChildNode,
  NodeTypes,
  RootNode,
  SimpleExpressionNode,
  TemplateChildNode,
  TextNode,
  VNodeCall,
} from './ast'
import { CodegenOptions } from './options'
import { helperNameMap, OPEN_BLOCK, TO_DISPLAY_STRING } from './runtimeHelpers'
import { isText } from './utils'

type CodegenNode = JSChildNode | TemplateChildNode

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
  helper(key: symbol): string
}

const aliasHelper = (s: symbol) => `${helperNameMap[s]}: _${helperNameMap[s]}`

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

function genFunctionPreamble(ast: RootNode, context: CodegenContext) {
  const {
    newline,
    push,
    runtimeModuleName,
    runtimeGlobalName,
    prefixIdentifiers,
  } = context

  const VueBinding = runtimeGlobalName

  const helpers = Array.from(ast.helpers)
  if (helpers.length) {
    if (prefixIdentifiers) {
      push(`const { ${helpers.map(aliasHelper)} } = ${VueBinding}\n`)
    } else {
      push(`const _PVue = ${VueBinding}\n`, NewlineType.End)
    }
  }

  newline()

  push('return ')
}

function createCodegenContext(
  ast: RootNode,
  {
    mode = 'function',
    runtimeModuleName = 'pvue',
    runtimeGlobalName = 'PVue',
    prefixIdentifiers,
  }: CodegenOptions
): CodegenContext {
  const context: CodegenContext = {
    mode,
    source: '',
    code: ``,
    indentLevel: 0,
    runtimeModuleName,
    runtimeGlobalName,
    prefixIdentifiers,
    push(code) {
      context.code += code
    },

    helper(key) {
      return `_${helperNameMap[key]}`
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
  options: CodegenOptions = {}
): CodegenResult {
  const context = createCodegenContext(ast, options)

  const { mode, push, indent, deindent, newline, prefixIdentifiers } = context

  const useWithBlock = mode === 'function' && !prefixIdentifiers

  const helpers = Array.from(ast.helpers)
  const hasHelpers = helpers.length > 0

  // mode指定为module
  if (mode === 'module') {
    genModulePreamble(ast, context)
  } else {
    //
    genFunctionPreamble(ast, context)
  }

  const functionName = 'render'
  const args = ['_ctx', '_cache']

  const signature = args.join(', ')

  push(`function ${functionName}(${signature}) {`)
  indent()

  // push('console.log("_ctx",_ctx)\n')

  if (useWithBlock) {
    push('with (_ctx) {')
    indent()

    if (hasHelpers) {
      push(`const { ${helpers.map(aliasHelper).join(', ')} } = _PVue\n`)
      // push('console.log("a",_toDisplayString())\n')

      newline()
    }
  }

  push('return ')

  if (ast.codegenNode) {
    genNode(ast.codegenNode, context)
  }

  // test
  if (useWithBlock) {
    deindent()
    push('}')
  }

  deindent()
  push('}')

  return {
    code: context.code,
  }
}

function genNode(node: CodegenNode, context: CodegenContext) {
  const { push, helper } = context

  if (isSymbol(node)) {
    push(helper(node))
    return
  }

  switch (node.type) {
    // 处理for循环
    // 处理元素节点
    case NodeTypes.ELEMENT:
    case NodeTypes.FOR: {
      genNode(node.codegenNode, context)
      break
    }

    case NodeTypes.TEXT_CALL: {
      genNode(node.codegenNode, context)
      break
    }

    case NodeTypes.JS_CALL_EXPRESSION: {
      genCallExpression(node, context)
      break
    }

    case NodeTypes.SIMPLE_EXPRESSION: {
      genExpression(node, context)
      break
    }

    // 处理插值
    case NodeTypes.INTERPOLATION: {
      genInterpolation(node, context)
      break
    }

    // 处理混合类型表达式
    case NodeTypes.COMPOUND_EXPRESSION: {
      genCompoundExpression(node, context)
      break
    }

    // 处理文本
    case NodeTypes.TEXT: {
      genText(node, context)
      break
    }

    case NodeTypes.VNODE_CALL: {
      // 多children节点, 或者
      genVNodeCall(node, context)
      break
    }

    // 处理函数
    case NodeTypes.JS_FUNCTION_EXPRESSION: {
      genFunctionExpression(node, context)
      break
    }
  }
}

function genExpression(node: SimpleExpressionNode, context: CodegenContext) {
  const { content, isStatic } = node
  context.push(content)
}

function genText(node: TextNode, context: CodegenContext) {
  context.push(JSON.stringify(node.content))
}

// 处理插值
function genInterpolation(node: InterpolationNode, context: CodegenContext) {
  const { push, helper } = context
  push(`${helper(TO_DISPLAY_STRING)}(`)
  genNode(node.content, context)
  push(')')
}

// 处理JS_CALL_EXPRESSION类型的node节点 TEXT_CALL的codegenNode就是JS_CALL_EXPRESSION类型的
function genCallExpression(node: CallExpression, context: CodegenContext) {
  const { helper, push } = context
  const { callee } = node
  const _callee = isString(callee) ? callee : helper(callee)
  push(`${_callee}(`)
  genNodeList(node.arguments, context)
  push(')')
}

// 处理混合表达式
function genCompoundExpression(
  node: CompoundExpressionNode,
  context: CodegenContext
) {
  const { push } = context
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i]

    if (isString(child)) {
      push(child)
    } else {
      genNode(child, context)
    }
  }
}

// 处理VNODE_CALL 多根节点 或者 type是elment 并且 tagType是element的节点都是VNODE_CALL类型的
function genVNodeCall(node: VNodeCall, context: CodegenContext) {
  const { push, helper } = context
  const {
    isBlock,
    isComponent,
    tag,
    props,
    children,
    dynamicProps,
    disableTracking,
    patchFlag,
  } = node

  if (isBlock) {
    push(`(${helper(OPEN_BLOCK)}(${disableTracking ? 'true' : ''}), `)
  }

  const callHelper: symbol = isBlock
    ? getVNodeBlockHelper(isComponent)
    : getVNodeHelper(isComponent)

  push(`${helper(callHelper)}(`)

  // 处理children节点
  let patchFlagString

  if (patchFlag) {
    if (patchFlag < 0) {
    } else {
      const flagNames = Object.keys(PatchFlagNames)
        .map(Number)
        .filter(n => n > 0 && n & patchFlag)
        .map(n => PatchFlagNames[n])
        .join(', ')
      patchFlagString = patchFlag + ` /* ${flagNames} */`
    }
  }

  genNodeList(
    genNullableArgs([tag, props, children, patchFlagString, dynamicProps]),
    context
  )
  push(`)`)

  if (isBlock) {
    push(')')
  }
}

function genNodeListAsArray(nodes, context: CodegenContext) {
  const { push, indent, deindent } = context
  const multilines = nodes.length > 3 || nodes.some(n => !isText(n))

  push('[')
  multilines && indent()
  genNodeList(nodes, context, multilines)
  multilines && deindent()
  push(']')
}

function genNodeList(
  nodes: (string | TemplateChildNode | Symbol | CodegenNode)[],
  context: CodegenContext,
  multilines: boolean = false,
  comma: boolean = true
) {
  const { push, newline } = context
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (isString(node)) {
      push(node)
    } else if (isArray(node)) {
      // node里面的元素有可能还是一个array
      genNodeListAsArray(node, context)
    } else {
      // symbol
      genNode(node, context)
    }

    if (i < nodes.length - 1) {
      if (multilines) {
        comma && push(',')
        newline()
      } else {
        comma && push(', ')
      }
    }
  }
}

// 处理函数
function genFunctionExpression(
  node: FunctionExpression,
  context: CodegenContext
) {
  const { push, indent, deindent } = context
  const { params, newline, returns } = node

  push('(')
  console.log('parase', params)
  if (isArray(params)) {
    genNodeList(params, context)
  }

  push(') => ')

  if (newline) {
    push('{')
    indent()
  }

  if (returns) {
    if (newline) {
      push('return ')
    }
  }

  if (newline) {
    deindent()
    push('}')
  }
}

/**
 * 生成可为空的参数数组
 * @param args 输入参数数组
 * @returns 处理后的参数数组，移除末尾的null/undefined并将剩余null/undefined替换为'null'
 */
function genNullableArgs(args: any[]): CallExpression['arguments'] {
  let i = args.length
  while (i--) {
    if (args[i] != null) break
  }
  return args.slice(0, i + 1).map(arg => arg || 'null')
}
