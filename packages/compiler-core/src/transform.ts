import { RootNode } from './ast'

function createRootCodegen(root: RootNode) {
  const { children } = root
  root.codegenNode = children[0]
}

export function transform(root: RootNode) {
  createRootCodegen(root)
}
