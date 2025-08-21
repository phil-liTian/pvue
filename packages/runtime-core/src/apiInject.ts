/*
 * @Author: phil
 * @Date: 2025-08-19 20:41:33
 */
import { isFunction } from '@pvue/shared'
import { currentApp } from './apiCreateApp'
import { currentInstance, getCurrentInstance } from './component'
import { warn } from './warning'

interface InjectionConstraint<T> {}

export type InjectionKey<T> = Symbol & InjectionConstraint<T>

export function provide(key, value) {
  if (currentInstance) {
    // 获取当前组件实例的provides对象
    let provides = currentInstance.provides
    // 获取父组件的provides对象，如果当前组件有父组件的话
    const parentProvides =
      currentInstance.parent && currentInstance.parent.provides

    // 检查当前组件的provides是否与父组件的provides相同
    // 如果相同，说明当前组件还没有自己的provides对象
    if (provides === parentProvides) {
      // 创建一个新的provides对象，以父组件的provides作为原型
      // 这样可以通过原型链访问到父组件提供的依赖
      provides = currentInstance.provides = Object.create(parentProvides)
    }

    // 在当前组件的provides对象中存储键值对
    provides[key] = value
  } else {
    // 如果不在组件实例中调用provide，在开发环境下发出警告
    __DEV__ && warn(`provide() can only be used inside setup().`)
  }
}

export function inject<T>(key: InjectionKey<T> | string): T | undefined

export function inject<T>(key: InjectionKey<T> | string, defaultValue: T): T

export function inject<T>(
  key: InjectionKey<T> | string,
  defaultValue: T,
  treatDefaultAsFactory: boolean
): T

export function inject(
  key,
  defaultValue?: unknown,
  treatDefaultAsFactory = false
) {
  const instance = getCurrentInstance()

  if (instance || currentApp) {
    const provides = instance?.parent?.provides

    if (provides && key in provides) {
      return provides[key]
    } else if (arguments.length > 1) {
      return treatDefaultAsFactory && isFunction(defaultValue)
        ? defaultValue.call(instance && instance.proxy)
        : defaultValue
    } else if (__DEV__) {
      warn(`injection "${String(key)}" not found.`)
    }
  } else {
    warn(`inject() can only be used inside setup() or functional components.`)
  }
}

export function hasInjectionContext() {
  return !!(getCurrentInstance() || currentApp)
}
