/*
 * @Author: phil
 * @Date: 2025-08-12 20:23:20
 */
import { ComponentInternalInstance } from './component'

export let currentRenderingInstance: ComponentInternalInstance | null = null

export function setCurrentRenderingInstance(
  instance: ComponentInternalInstance | null
) {
  let prev = currentRenderingInstance

  currentRenderingInstance = instance

  return prev
}

export function withCtx(
  fn: Function,
  ctx: ComponentInternalInstance | null = currentRenderingInstance
) {
  if (!ctx) {
  }
  return fn
}
