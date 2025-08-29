/*
 * @Author: phil
 * @Date: 2025-08-15 11:54:23
 */
import { EMPTY_OBJ, isArray, isFunction } from '@pvue/shared'
import { ComponentInternalInstance } from './component'
import { LifecycleHooks } from './enums'
import { warn } from './warning'

export enum ErrorCodes {
  SETUP_FUNCTION,
  RENDER_FUNCTION,
  // The error codes for the watch have been transferred to the reactivity
  // package along with baseWatch to maintain code compatibility. Hence,
  // it is essential to keep these values unchanged.
  // WATCH_GETTER,
  // WATCH_CALLBACK,
  // WATCH_CLEANUP,
  NATIVE_EVENT_HANDLER = 5,
  COMPONENT_EVENT_HANDLER,
  VNODE_HOOK,
  DIRECTIVE_HOOK,
  TRANSITION_HOOK,
  APP_ERROR_HANDLER,
  APP_WARN_HANDLER,
  FUNCTION_REF,
  ASYNC_COMPONENT_LOADER,
  SCHEDULER,
  COMPONENT_UPDATE,
  APP_UNMOUNT_CLEANUP,
}

export type ErrorTypes = LifecycleHooks | ErrorCodes

export const ErrorTypeStrings: Record<ErrorTypes, string> = {
  [LifecycleHooks.SERVER_PREFETCH]: 'serverPrefetch hook',
  [LifecycleHooks.BEFORE_CREATE]: 'beforeCreate hook',
  [LifecycleHooks.CREATED]: 'created hook',
  [LifecycleHooks.BEFORE_MOUNT]: 'beforeMount hook',
  [LifecycleHooks.MOUNTED]: 'mounted hook',
  [LifecycleHooks.BEFORE_UPDATE]: 'beforeUpdate hook',
  [LifecycleHooks.UPDATED]: 'updated',
  [LifecycleHooks.BEFORE_UNMOUNT]: 'beforeUnmount hook',
  [LifecycleHooks.UNMOUNTED]: 'unmounted hook',
  [LifecycleHooks.ACTIVATED]: 'activated hook',
  [LifecycleHooks.DEACTIVATED]: 'deactivated hook',
  [LifecycleHooks.ERROR_CAPTURED]: 'errorCaptured hook',
  [LifecycleHooks.RENDER_TRACKED]: 'renderTracked hook',
  [LifecycleHooks.RENDER_TRIGGERED]: 'renderTriggered hook',
  [ErrorCodes.SETUP_FUNCTION]: 'setup function',
  [ErrorCodes.RENDER_FUNCTION]: 'render function',
  // [WatchErrorCodes.WATCH_GETTER]: 'watcher getter',
  // [WatchErrorCodes.WATCH_CALLBACK]: 'watcher callback',
  // [WatchErrorCodes.WATCH_CLEANUP]: 'watcher cleanup function',
  [ErrorCodes.NATIVE_EVENT_HANDLER]: 'native event handler',
  [ErrorCodes.COMPONENT_EVENT_HANDLER]: 'component event handler',
  [ErrorCodes.VNODE_HOOK]: 'vnode hook',
  [ErrorCodes.DIRECTIVE_HOOK]: 'directive hook',
  [ErrorCodes.TRANSITION_HOOK]: 'transition hook',
  [ErrorCodes.APP_ERROR_HANDLER]: 'app errorHandler',
  [ErrorCodes.APP_WARN_HANDLER]: 'app warnHandler',
  [ErrorCodes.FUNCTION_REF]: 'ref function',
  [ErrorCodes.ASYNC_COMPONENT_LOADER]: 'async component loader',
  [ErrorCodes.SCHEDULER]: 'scheduler flush',
  [ErrorCodes.COMPONENT_UPDATE]: 'component update',
  [ErrorCodes.APP_UNMOUNT_CLEANUP]: 'app unmount cleanup function',
}

/**
 * 调用函数并处理可能发生的错误
 * @param fn 要调用的函数
 * @param instance 组件实例
 * @param type 错误类型
 * @param args 可选的函数参数数组
 * @returns 函数执行结果，如果出错则返回undefined
 */
export function callWithErrorHandling(
  fn: Function,
  instance: ComponentInternalInstance | null | undefined,
  type: ErrorTypes,
  args?: unknown[]
) {
  try {
    return args ? fn(...args) : fn()
  } catch (error) {
    handleError(error, instance, type)
  }
}

export function callWithAsyncErrorHandling(
  fn: Function | Function[],
  instance: ComponentInternalInstance | null,
  type: ErrorTypes,
  args?: unknown[]
): any {
  if (isFunction(fn)) {
    const res = callWithErrorHandling(fn, instance, type, args)
    return res
  }

  if (isArray(fn)) {
    let values: any[] = []
    for (let i = 0; i < fn.length; i++) {
      values.push(callWithAsyncErrorHandling(fn[i], instance, type, args))
    }

    return values
  }
}

export function handleError(
  err: unknown,
  instance: ComponentInternalInstance | null | undefined,
  type: ErrorTypes
) {
  // const { vnode } = instance
  const contextVNode = instance ? instance.vnode : null
  const { errorHandler, throwUnhandledErrorInProduction } =
    (instance && instance.appContext.config) || (EMPTY_OBJ as any)

  if (instance) {
    if (errorHandler) {
      callWithErrorHandling(errorHandler, null, ErrorCodes.APP_ERROR_HANDLER)
    }
  }

  logError(err, type, throwUnhandledErrorInProduction)
}

function logError(err: unknown, type: ErrorTypes, throwInProd = false) {
  const info = ErrorTypeStrings[type]
  if (__DEV__) {
    warn(`Unhandled error${info ? ` during execution of ${info}` : ``}`)
  } else if (throwInProd) {
    throw err
  }
}
