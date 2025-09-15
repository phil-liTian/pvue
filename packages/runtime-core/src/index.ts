/*
 * @Author: phil
 * @Date: 2025-08-08 20:36:59
 */

export * from '@pvue/reactivity'
export {
  createVNode,
  createTextVNode,
  createCommentVNode,
  isVNode,
  openBlock,
  createBlock,
  type VNode,
  Fragment,
} from './vnode'
export { h } from './h'
export { renderList } from './helpers/renderList'
export { createSlots } from './helpers/createSlots'
export { renderSlot } from './helpers/renderSlot'
export { toHandlers } from './helpers/toHandlers'
export { resolveComponent } from './helpers/resolveAssets'

export {
  isClassComponent,
  type ClassComponent,
  type Component,
} from './component'

export { createRenderer, type RenderOptions } from './renderer'

export { defineComponent } from './apiDefineComponent'

export { onMounted, onUpdated, onErrorCaptured } from './apiLifecycle'
export { setCurrentRenderingInstance, withCtx } from './componentRenderContext'

export {} from './componentProps'

export {
  watch,
  watchPostEffect,
  watchEffect,
  watchSyncEffect,
} from './apiWatch'

export { callWithAsyncErrorHandling, ErrorCodes } from './errorHandling'

export { provide, inject } from './apiInject'
export { type Plugin } from './apiCreateApp'

export {
  nextTick,
  queueJob,
  flushPreFlushCbs,
  queuePostFlushCb,
  flushPostFlushCbs,
  type SchedulerJob,
} from './scheduler'

export { registerRuntimeCompiler } from './component'
