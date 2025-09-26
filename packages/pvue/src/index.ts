import { compile } from '@pvue/compiler-dom'
import { registerRuntimeCompiler } from '@pvue/runtime-core'
import * as runtimeDom from '@pvue/runtime-dom'

function compileToFunction(template: string | HTMLElement) {
  const { code } = compile(template as string)

  // 只需要保留函数体中的内容
  // const funcBody = code.replace(/^function\s+\w*\([^)]*\)\s*\{|\}$/g, '').trim()

  const render = new Function('PVue', code)(runtimeDom)

  console.log('render', render)

  return render
}

registerRuntimeCompiler(compileToFunction)

export * from '@pvue/runtime-dom'
