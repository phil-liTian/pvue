import { TrackOpTypes, TriggerOpTypes } from './constants'
import { activeSub } from './effect'

type KeyToDepMap = Map<any, any>
const targetMap: WeakMap<object, KeyToDepMap> = new WeakMap()

class Dep {
  subs: any = []
  track() {
    if (!activeSub) {
      return
    }
    console.log('activeSub', activeSub)

    this.subs.push(activeSub)
  }

  trigger() {
    this.subs.forEach(effect => effect.run())
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

  console.log('dep----', dep)
}

export function trigger(target: Object, type: TriggerOpTypes, key: unknown) {
  const depsMap = targetMap.get(target)
  console.log('depsMap', depsMap)

  depsMap?.forEach(dep => {
    // console.log('dep', dep)

    dep.trigger()
  })

  // const deps = depsMap?.get(key)
  // console.log('deps', deps)

  // depsMap?.forEach(dep => {})
}
