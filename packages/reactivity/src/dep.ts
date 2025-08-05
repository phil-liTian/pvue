import { isArray, isIntegerKey, isSymbol } from '@pvue/shared'
import { TrackOpTypes, TriggerOpTypes } from './constants'
import {
  activeSub,
  EffectFlags,
  endBatch,
  startBatch,
  type Subscriber,
} from './effect'

type KeyToDepMap = Map<any, any>
const targetMap: WeakMap<object, KeyToDepMap> = new WeakMap()

export const ARRAY_ITERATE_KEY: unique symbol = Symbol('Array iterate')
export const ITERATE_KEY: unique symbol = Symbol('Object iterate')

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
  track() {
    if (!activeSub) {
      return
    }

    // let link = new Link(activeSub, this)
    let link = this.activeLink
    if (!link) {
      link = this.activeLink = new Link(activeSub, this)
    }
    // this.subs.push(activeSub)

    if (!activeSub.deps) {
      // 初始化链表
      activeSub.deps = activeSub.depsTail = link
    }

    addSub(link)
  }

  trigger() {
    this.notify()
  }

  notify() {
    // this.subs.forEach(effect => effect.run())
    startBatch()
    try {
      for (let link = this.subs; link; link = link.prevSub) {
        if (link.sub.notify()) {
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

  if (key != void 0) {
    // target如果是array, 这里的dep是undefined, 不会执行
    run(dep)
  }

  switch (type) {
    case TriggerOpTypes.ADD: {
      if (!targetIsArray) {
        run(depsMap.get(ITERATE_KEY))
      } else if (isArrayIndex) {
        run(depsMap.get('length'))
      }
      break
    }

    case TriggerOpTypes.DELETE: {
      // if (!targetIsArray) {
      //   run(depsMap.get(ITERATE_KEY))
      // }
    }
    default: {
    }
  }

  // 处理array
  endBatch()
}
