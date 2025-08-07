/*
 * @Author: phil
 * @Date: 2025-08-01 20:01:47
 */

import { ReactiveEffect } from './effect'
import { warn } from './warning'
export let activeEffectScope: EffectScope | undefined

// 提供了一种更优雅、更可靠的方式来管理组合式 API 中的副作用，解决了手动管理副作用的复杂性和容易遗漏的问题
export class EffectScope {
  private _active = true
  effects: ReactiveEffect[] = []
  scopes: EffectScope[] | undefined
  cleanups: (() => void)[] = []
  parent: EffectScope | undefined
  private _on = 0
  constructor(public detached = false) {
    this.parent = activeEffectScope
    if (activeEffectScope && !detached) {
      ;(activeEffectScope.scopes || (activeEffectScope.scopes = []))?.push(this)
    }
  }

  get active() {
    return this._active
  }

  // TODO
  on() {}
  off() {}

  run<T>(fn: () => T) {
    if (this._active) {
      const currentEffectScope = activeEffectScope
      try {
        activeEffectScope = this
        return fn()
      } finally {
        activeEffectScope = currentEffectScope
      }
    } else {
      warn('cannot run an inactive effect scope.')
    }
  }

  stop(fromParent?: boolean): void {
    if (this._active) {
      this._active = false
      let i, l
      for (i = 0, l = this.effects.length; i < l; i++) {
        this.effects[i].stop()
      }
      this.effects.length = 0

      if (this.scopes) {
        for (i = 0, l = this.scopes.length; i < l; i++) {
          this.scopes[i].stop()
        }
        this.scopes.length = 0
      }

      if (this.cleanups.length) {
        for (i = 0, l = this.cleanups.length; i < l; i++) {
          this.cleanups[i]()
        }
        this.cleanups.length = 0
      }

      if (this.parent && !fromParent && !this.detached) {
        const last = this.parent.scopes!.pop()
        // console.log('last', last)

        this.parent = undefined
      }
    }
  }
}

// 创建一个 effect 作用域，可以捕获其中所创建的响应式副作用 (即计算属性和侦听器)，这样捕获到的副作用可以一起处理
// 添加detached的 effect stop时不会停止监听
export function effectScope(detached?: boolean): EffectScope {
  return new EffectScope(detached)
}

// 在当前活跃的 effect 作用域上注册一个处理回调函数。当相关的 effect 作用域停止时会调用这个回调函数。
export function onScopeDispose(fn: () => void) {
  if (activeEffectScope) {
    activeEffectScope.cleanups.push(fn)
  } else {
    warn(
      'onScopeDispose() is called when there is no active effect scope to be associated with.'
    )
  }
}

// 返回当前活跃的 effect 作用域。
export function getCurrentScope(): EffectScope | undefined {
  return activeEffectScope
}
