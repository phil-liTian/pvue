import { extend, isString } from '@pvue/shared'
import { RootNode } from './ast'
import { baseParse } from './parser'
import { generate } from './codegen'
import { transform } from './transform'
import { transformElement } from './transforms/transformElement'
import { transformText } from './transforms/transformText'

export function getBaseTransformPreset() {
  return [[transformElement, transformText]]
}

export function baseCompile(source: string | RootNode) {
  const ast = isString(source) ? baseParse(source) : source
  const [nodeTransforms] = getBaseTransformPreset()

  transform(
    ast,
    extend(
      {},
      {
        nodeTransforms: [...nodeTransforms],
      }
    )
  )
  return generate(ast, {})
}
