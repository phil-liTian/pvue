import { TrackOpTypes, TriggerOpTypes } from './constants'
import { activeSub, EffectFlags, endBatch, type Subscriber } from './effect'

type KeyToDepMap = Map<any, any>
const targetMap: WeakMap<object, KeyToDepMap> = new WeakMap()

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

    try {
      for (let link = this.subs; link; link = link.prevSub) {
        if (link.sub.notify()) {
        }
      }
    } finally {
      endBatch()
    }
  }

  clear() {
    // this.subs.length = 0
  }
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

export function trigger(target: Object, type: TriggerOpTypes, key: unknown) {
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

  run(dep)
}
