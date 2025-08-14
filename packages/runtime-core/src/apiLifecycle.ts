import { ComponentInternalInstance, currentInstance } from './component'
import { LifecycleHooks } from './enums'

function injectHook(
  type: LifecycleHooks,
  hook: Function,
  target: ComponentInternalInstance | null = currentInstance
) {
  if (target) {
    const hooks = target[type] || (target[type] = [])

    const wrappedHook = (...args) => {
      // console.log('args', args)
    }

    hook()
    hooks.push(wrappedHook)
  }
}

const createHook =
  (lifecycle: LifecycleHooks) =>
  (hook, target: ComponentInternalInstance | null = currentInstance) => {
    // console.log('hook', hook, target)
    injectHook(lifecycle, (...args) => hook(...args), target)
  }

type CreateHook<T = any> = (
  hook: T,
  target: ComponentInternalInstance | null
) => void

export const onMounted: CreateHook = createHook(LifecycleHooks.MOUNTED)
