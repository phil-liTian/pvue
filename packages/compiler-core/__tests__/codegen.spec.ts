import {
  CREATE_VNODE,
  helperNameMap,
  RESOLVE_DIRECTIVE,
} from '../src/runtimeHelpers'
import { generate, locStub, NodeTypes, RootNode } from '../src/index'
import { createSimpleExpression } from '../src/ast'

function createRoot(options: Partial<RootNode>): RootNode {
  return {
    source: '',
    type: NodeTypes.ROOT,
    helpers: new Set(),
    children: [],
    loc: locStub,
    codegenNode: createSimpleExpression('null', false),
    ...options,
  }
}

describe('compiler: codegen', () => {
  test('module mode preamble', () => {
    const root = createRoot({
      helpers: new Set([CREATE_VNODE, RESOLVE_DIRECTIVE]),
    })
    const { code } = generate(root, { mode: 'module' })

    expect(code).toMatch(
      `import { ${helperNameMap[CREATE_VNODE]} as _${helperNameMap[CREATE_VNODE]}, ${helperNameMap[RESOLVE_DIRECTIVE]} as _${helperNameMap[RESOLVE_DIRECTIVE]} } from "pvue"`
    )
    expect(code).toMatchSnapshot()
  })
})
