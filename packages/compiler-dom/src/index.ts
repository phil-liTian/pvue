import { baseCompile, RootNode } from '@pvue/compiler-core'
export function compile(src: string | RootNode) {
  return baseCompile(src)
}
