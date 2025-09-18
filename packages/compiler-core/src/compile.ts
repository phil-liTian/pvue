import { isString } from '@pvue/shared'
import { RootNode } from './ast'
import { baseParse } from './parser'
import { generate } from './codegen'
import { transform } from './transform'

export function baseCompile(source: string | RootNode) {
  const ast = isString(source) ? baseParse(source) : source

  transform(ast, {})
  return generate(ast, {})
}
