import { isArray, isIntegerKey, isMap, isSymbol } from '@pvue/shared'
import { TrackOpTypes, TriggerOpTypes } from './constants'
import {
  activeSub,
  EffectFlags,
  endBatch,
  shouldTrack,
  startBatch,
  type Subscriber,
} from './effect'
import { ComputedRefImpl } from './computed'

type KeyToDepMap = Map<any, any>
export const targetMap: WeakMap<object, KeyToDepMap> = new WeakMap()

// 每次响应式数据发生变化时 都会自增1
export let globalVersion = 0

export const ARRAY_ITERATE_KEY: unique symbol = Symbol('Array iterate')
// map的size、forEach方法调用的时候 记录这个key, 在增、删、改时 通过这个key触发effect方法
export const ITERATE_KEY: unique symbol = Symbol('Object iterate')
// 调用map的keys方法 记录这个key;在map增加或者删除的时候 通过这个key触发effect方法
export const MAP_KEY_ITERATE_KEY: unique symbol = Symbol('Map key iterate')

export class Link {
  version: number
  nextDep?: Link
  prevDep?: Link
  nextSub?: Link
  prevSub?: Link
  prevActiveLink?: Link
  constructor(public sub: Subscriber, public dep: Dep) {
    this.version = dep.version
    this.nextDep =
      this.prevDep =
      this.nextSub =
      this.prevSub =
      this.prevActiveLink =
        undefined
  }
}

export class Dep {
  version = 0
  activeLink: Link | undefined = undefined
  subs?: Link = undefined
  map?: KeyToDepMap = undefined
  key?: unknown = undefined
  constructor(public computed?: ComputedRefImpl | undefined) {}

  /**
   * 跟踪依赖关系
   * 将当前活动的订阅者与此依赖项关联
   * 如果已存在链接则更新其版本
   * 如果链接已失效则重新定位到链表尾部
   */
  track() {
    if (!activeSub || !shouldTrack) {
      return
    }

    // let link = new Link(activeSub, this)
    let link = this.activeLink
    // 当前dep没有activeLink,则创建一个
    if (link == undefined) {
      link = this.activeLink = new Link(activeSub, this)

      if (!activeSub.deps) {
        // 初始化链表
        activeSub.deps = activeSub.depsTail = link
      } else {
        // 有的话则在队尾加入link
        link.prevDep = activeSub.depsTail
        // 在队尾加入link
        activeSub.depsTail.nextDep = link
        // 队尾指向link
        activeSub.depsTail = link
      }
      addSub(link)
    } else if (link.version === -1) {
      link.version = this.version
      if (link.nextDep) {
        const next = link.nextDep
        next.prevDep = link.prevDep

        // link的prev指向队尾，next指向undefined
        link.prevDep = activeSub.depsTail
        link.nextDep = undefined

        // 队尾的next指向link
        activeSub.depsTail.nextDep = link
        // 队尾指向link
        activeSub.depsTail = link

        if (activeSub.deps === link) {
          activeSub.deps = next
        }
      }
    }

    return link
  }

  trigger() {
    this.version++
    globalVersion++
    this.notify()
  }

  notify() {
    // this.subs.forEach(effect => effect.run())
    startBatch()
    try {
      for (let link = this.subs; link; link = link.prevSub) {
        // 通知收集的依赖要更新了
        if (link.sub.notify()) {
          // computed 依赖的属性发生了变化
          ;(link.sub as ComputedRefImpl).dep.notify()
        }
      }
    } finally {
      endBatch()
    }
  }

  // clear() {
  //   this.subs.length = 0
  // }
}

function addSub(link: Link) {
  // link的sub就是effect
  if (link.sub.flags & EffectFlags.TRACKING) {
    // 如果effect监听的是一个computed值, 需要将该computed标记成TRACKING, 促使computed依赖的的属性发生变化时, 可以重新执行effect
    const computed = link.dep.computed
    if (computed) {
      computed.flags |= EffectFlags.TRACKING
    }

    const currentTail = link.dep.subs
    // console.log('currentTail', currentTail)
    if (currentTail !== link) {
      link.prevSub = currentTail
      if (currentTail) currentTail.nextSub = link
    }

    link.dep.subs = link
  }
}

export function track(target: Object, type: TrackOpTypes, key: unknown) {
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }

  let dep = depsMap.get(key)

  if (!dep) {
    depsMap.set(key, (dep = new Dep()))

    // 当执行stop的时候 depsMap中的内容都应该被清空掉
    dep.map = depsMap
    dep.key = key
  }

  dep.track()
}

export function trigger(
  target: Object,
  type: TriggerOpTypes,
  key?: unknown,
  newValue?: unknown,
  oldValue?: unknown
) {
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    return
  }
  const dep = depsMap?.get(key)

  const run = (dep: Dep | undefined) => {
    if (dep) {
      dep.trigger()
    }
  }

  startBatch()

  if (type === TriggerOpTypes.CLEAR) {
    // 清空map
    depsMap.forEach(run)
  } else {
    const targetIsArray = isArray(target)
    const isArrayIndex = targetIsArray && isIntegerKey(key)

    // 如果直接修改 array的length属性, 则直接触发 depsMap中收集的key对应的dep
    if (targetIsArray && key === 'length') {
      const newLength = Number(newValue)
      depsMap.forEach((dep, key) => {
        if (key === 'length' || (!isSymbol(key) && key >= newLength)) {
          run(dep)
        }
      })
    } else {
      if (isArrayIndex) {
        run(depsMap.get(ARRAY_ITERATE_KEY))
      }
    }

    // undefined 做对象的key时 也要执行trigger
    if (key != void 0 || depsMap.get(void 0)) {
      // target如果是array, 这里的dep是undefined, 不会执行
      run(dep)
    }

    switch (type) {
      case TriggerOpTypes.ADD: {
        if (!targetIsArray) {
          run(depsMap.get(ITERATE_KEY))
          if (isMap(target)) {
            run(depsMap.get(MAP_KEY_ITERATE_KEY))
          }
        } else if (isArrayIndex) {
          run(depsMap.get('length'))
        }
        break
      }

      case TriggerOpTypes.SET: {
        if (!targetIsArray) {
          run(depsMap.get(ITERATE_KEY))
        }
        break
      }

      case TriggerOpTypes.DELETE: {
        if (!targetIsArray) {
          run(depsMap.get(ITERATE_KEY))

          if (isMap(target)) {
            run(depsMap.get(MAP_KEY_ITERATE_KEY))
          }
        }
      }

      default: {
      }
    }
  }
  // 处理array
  endBatch()
}
