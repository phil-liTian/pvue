export let activeSub

export class ReactiveEffect<T = any> {
  constructor(public fn: () => T) {}

  run() {
    // 这是需要收集的effect
    activeSub = this
    this.fn()
    console.log('run--1')
  }
}

export function effect<T = any>(fn: () => T) {
  const e = new ReactiveEffect(fn)
  e.run()
}
