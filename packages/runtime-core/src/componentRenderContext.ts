import { ComponentInternalInstance } from './component'

export let currentRenderingInstance: ComponentInternalInstance | null = null

export function setCurrentRenderingInstance(
  instance: ComponentInternalInstance | null
) {
  currentRenderingInstance = instance
}

export function withCtx(
  fn: Function,
  ctx: ComponentInternalInstance | null = currentRenderingInstance
) {
  if (!ctx) {
  }
  return fn
}
