import { vitest } from 'vitest'
import { effect, endBatch, startBatch, stop } from '../src/effect'
import {
  markRaw,
  reactive,
  readonly,
  shallowReactive,
  toRaw,
} from '../src/reactive'

describe('reactivity/effect', () => {
  it('should run the passed function once (wrapped by a effect)', () => {
    const fnSpy = vitest.fn(() => {})
    effect(fnSpy)
    expect(fnSpy).toHaveBeenCalledTimes(1)
  })

  it('should observe basic properties', () => {
    let dummy
    const counter = reactive({ num: 0 })
    effect(() => (dummy = counter.num))

    expect(dummy).toBe(0)
    counter.num = 7
    expect(dummy).toBe(7)
  })

  it('should observe multiple properties', () => {
    let dummy
    const counter = reactive({ num1: 0, num2: 0 })
    effect(() => (dummy = counter.num1 + counter.num1 + counter.num2))

    expect(dummy).toBe(0)
    counter.num1 = counter.num2 = 7
    expect(dummy).toBe(21)
  })

  it('should handle multiple effects', () => {
    let dummy1, dummy2
    const counter = reactive({ num: 0 })
    effect(() => (dummy1 = counter.num))
    effect(() => (dummy2 = counter.num))

    expect(dummy1).toBe(0)
    expect(dummy2).toBe(0)
    counter.num++
    expect(dummy1).toBe(1)
    expect(dummy2).toBe(1)
  })

  it('should observe nested properties', () => {
    let dummy
    const counter = reactive({ nested: { num: 0 } })
    effect(() => (dummy = counter.nested.num))

    expect(dummy).toBe(0)
    counter.nested.num = 8
    expect(dummy).toBe(8)
  })

  it('监听删除操作', () => {
    let dummy
    const obj = reactive<{
      prop?: string
    }>({ prop: 'value' })
    effect(() => (dummy = obj.prop))

    expect(dummy).toBe('value')
    delete obj.prop
    expect(dummy).toBe(undefined)
  })

  it('监听has运算符', () => {
    let dummy
    const obj = reactive<{ prop?: string | number }>({ prop: 'value' })
    effect(() => (dummy = 'prop' in obj))

    expect(dummy).toBe(true)
    delete obj.prop
    expect(dummy).toBe(false)
    obj.prop = 12
    expect(dummy).toBe(true)
  })

  it('should observe properties on the prototype chain', () => {
    let dummy
    const counter = reactive<{ num?: number }>({ num: 0 })
    const parentCounter = reactive({ num: 2 })
    Object.setPrototypeOf(counter, parentCounter)
    effect(() => (dummy = counter.num))

    expect(dummy).toBe(0)
    delete counter.num
    expect(dummy).toBe(2)
    parentCounter.num = 4
    expect(dummy).toBe(4)
    counter.num = 3
    expect(dummy).toBe(3)
  })

  it('should observe has operations on the prototype chain', () => {
    let dummy
    const counter = reactive<{ num?: number }>({ num: 0 })
    const parentCounter = reactive<{ num?: number }>({ num: 2 })
    Object.setPrototypeOf(counter, parentCounter)
    effect(() => (dummy = 'num' in counter))

    expect(dummy).toBe(true)
    delete counter.num
    expect(dummy).toBe(true)
    delete parentCounter.num
    expect(dummy).toBe(false)
    counter.num = 3
    expect(dummy).toBe(true)
  })

  it('should observe has operations on the prototype chain', () => {
    let dummy
    const counter = reactive<{ num?: number }>({ num: 0 })
    const parentCounter = reactive<{ num?: number }>({ num: 2 })
    Object.setPrototypeOf(counter, parentCounter)
    effect(() => (dummy = 'num' in counter))

    expect(dummy).toBe(true)
    delete counter.num
    expect(dummy).toBe(true)
    delete parentCounter.num
    expect(dummy).toBe(false)
    counter.num = 3
    expect(dummy).toBe(true)
  })

  it('should observe inherited property accessors', () => {
    let dummy, parentDummy, hiddenValue: any
    const obj = reactive<{ prop?: number }>({})
    const parent = reactive({
      set prop(value) {
        hiddenValue = value
      },
      get prop() {
        return hiddenValue
      },
    })
    Object.setPrototypeOf(obj, parent)
    effect(() => (dummy = obj.prop))
    effect(() => (parentDummy = parent.prop))

    expect(dummy).toBe(undefined)
    expect(parentDummy).toBe(undefined)
    obj.prop = 4
    expect(dummy).toBe(4)
    // this doesn't work, should it?
    // expect(parentDummy).toBe(4)
    parent.prop = 2
    expect(dummy).toBe(2)
    expect(parentDummy).toBe(2)
  })

  it('should observe function call chains', () => {
    let dummy
    const counter = reactive({ num: 0 })
    effect(() => (dummy = getNum()))

    function getNum() {
      return counter.num
    }

    expect(dummy).toBe(0)
    counter.num = 2
    expect(dummy).toBe(2)
  })

  it('should observe iteration', () => {
    let dummy
    const list = reactive(['Hello'])
    effect(() => (dummy = list.join(' ')))

    expect(dummy).toBe('Hello')
    list.push('World!')
    expect(dummy).toBe('Hello World!')
    list.shift()
    expect(dummy).toBe('World! ')
  })

  it('should observe implicit array length changes', () => {
    let dummy
    const list = reactive(['Hello'])
    effect(() => (dummy = list.join(' ')))

    expect(dummy).toBe('Hello')
    list[1] = 'World!'
    expect(dummy).toBe('Hello World!')
    list[3] = 'Hello!'
    expect(dummy).toBe('Hello World!  Hello!')
  })

  it('should observe sparse array mutations', () => {
    let dummy
    const list = reactive<string[]>([])
    list[1] = 'World!'
    effect(() => (dummy = list.join(' ')))

    expect(dummy).toBe(' World!')
    list[0] = 'Hello'
    expect(dummy).toBe('Hello World!')
    list.pop()
    expect(dummy).toBe('Hello ')
  })

  it('should observe enumeration', () => {
    let dummy = 0
    const numbers = reactive<Record<string, number>>({ num1: 3 })
    effect(() => {
      dummy = 0
      for (let key in numbers) {
        dummy += numbers[key]
      }
    })

    expect(dummy).toBe(3)
    numbers.num2 = 4
    expect(dummy).toBe(7)
    delete numbers.num1
    expect(dummy).toBe(4)
  })

  it('should observe symbol keyed properties', () => {
    const key = Symbol('symbol keyed prop')
    let dummy, hasDummy
    const obj = reactive<{ [key]?: string }>({ [key]: 'value' })
    effect(() => (dummy = obj[key]))
    effect(() => (hasDummy = key in obj))

    expect(dummy).toBe('value')
    expect(hasDummy).toBe(true)
    obj[key] = 'newValue'
    expect(dummy).toBe('newValue')
    delete obj[key]
    expect(dummy).toBe(undefined)
    expect(hasDummy).toBe(false)
  })

  it('should not observe well-known symbol keyed properties', () => {
    const key = Symbol.isConcatSpreadable
    let dummy
    const array: any = reactive([])
    effect(() => (dummy = array[key]))

    expect(array[key]).toBe(undefined)
    expect(dummy).toBe(undefined)
    array[key] = true
    expect(array[key]).toBe(true)
    expect(dummy).toBe(undefined)
  })

  it('如果key是symbol类型 不收集该依赖', () => {
    const key = Symbol.isConcatSpreadable
    const obj = reactive({
      [key]: true,
    }) as any

    const spy = vitest.fn(() => {
      key in obj
    })
    effect(spy)
    expect(spy).toHaveBeenCalledTimes(1)

    obj[key] = false
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('should support manipulating an array while observing symbol keyed properties', () => {
    const key = Symbol()
    let dummy
    const array: any = reactive([1, 2, 3])
    effect(() => (dummy = array[key]))

    expect(dummy).toBe(undefined)
    array.pop()
    array.shift()
    array.splice(0, 1)
    expect(dummy).toBe(undefined)
    array[key] = 'value'
    array.length = 0
    expect(dummy).toBe('value')
  })

  it('should observe function valued properties', () => {
    const oldFunc = () => {}
    const newFunc = () => {}

    let dummy
    const obj = reactive({ func: oldFunc })
    effect(() => (dummy = obj.func))

    expect(dummy).toBe(oldFunc)
    obj.func = newFunc
    expect(dummy).toBe(newFunc)
  })

  it('should observe chained getters relying on this', () => {
    const obj = reactive({
      a: 1,
      get b() {
        return this.a
      },
    })

    let dummy
    effect(() => (dummy = obj.b))
    expect(dummy).toBe(1)
    obj.a++
    expect(dummy).toBe(2)
  })

  it('should observe methods relying on this', () => {
    const obj = reactive({
      a: 1,
      b() {
        return this.a
      },
    })

    let dummy
    effect(() => (dummy = obj.b()))
    expect(dummy).toBe(1)
    obj.a++
    expect(dummy).toBe(2)
  })

  it('should not observe set operations without a value change', () => {
    let hasDummy, getDummy
    const obj = reactive({ prop: 'value' })

    const getSpy = vitest.fn(() => (getDummy = obj.prop))
    const hasSpy = vitest.fn(() => (hasDummy = 'prop' in obj))
    effect(getSpy)
    effect(hasSpy)

    expect(getDummy).toBe('value')
    expect(hasDummy).toBe(true)
    obj.prop = 'value'
    expect(getSpy).toHaveBeenCalledTimes(1)
    expect(hasSpy).toHaveBeenCalledTimes(1)
    expect(getDummy).toBe('value')
    expect(hasDummy).toBe(true)
  })

  it('should not observe raw mutations', () => {
    let dummy
    const obj = reactive<{ prop?: string }>({})
    effect(() => (dummy = toRaw(obj).prop))

    expect(dummy).toBe(undefined)
    obj.prop = 'value'
    expect(dummy).toBe(undefined)
  })

  it('should not be triggered by raw mutations', () => {
    let dummy
    const obj = reactive<{ prop?: string }>({})
    effect(() => (dummy = obj.prop))

    expect(dummy).toBe(undefined)
    toRaw(obj).prop = 'value'
    expect(dummy).toBe(undefined)
  })

  it('should not be triggered by inherited raw setters', () => {
    let dummy, parentDummy, hiddenValue: any
    const obj = reactive<{ prop?: number }>({})
    const parent = reactive({
      set prop(value) {
        hiddenValue = value
      },
      get prop() {
        return hiddenValue
      },
    })
    Object.setPrototypeOf(obj, parent)
    effect(() => (dummy = obj.prop))
    effect(() => (parentDummy = parent.prop))

    expect(dummy).toBe(undefined)
    expect(parentDummy).toBe(undefined)
    toRaw(obj).prop = 4
    expect(dummy).toBe(undefined)
    expect(parentDummy).toBe(undefined)
  })

  it('should avoid implicit infinite recursive loops with itself', () => {
    const counter = reactive({ num: 0 })
    // 如何避免死循环？
    const counterSpy = vitest.fn(() => counter.num++)
    effect(counterSpy)
    expect(counter.num).toBe(1)
    expect(counterSpy).toHaveBeenCalledTimes(1)
    counter.num = 4
    expect(counter.num).toBe(5)
    expect(counterSpy).toHaveBeenCalledTimes(2)
  })

  // TODO
  it('scheduler', () => {
    let dummy
    let run: any
    const scheduler = vitest.fn(() => {
      run = runner
    })
    const obj = reactive({ foo: 1 })
    const runner = effect(
      () => {
        dummy = obj.foo
      },
      { scheduler }
    )
    expect(scheduler).not.toHaveBeenCalled()
    expect(dummy).toBe(1)
    // should be called on first trigger
    obj.foo++
    expect(scheduler).toHaveBeenCalledTimes(1)
    // should not run yet
    expect(dummy).toBe(1)
    // // manually run
    run()
    // should have run
    expect(dummy).toBe(2)
  })

  it('stop', () => {
    let dummy
    const obj = reactive({ prop: 1 })
    const runner = effect(() => {
      dummy = obj.prop
    })
    obj.prop = 2
    expect(dummy).toBe(2)
    stop(runner)
    obj.prop = 3
    expect(dummy).toBe(2)

    // stopped effect should still be manually callable
    runner()
    expect(dummy).toBe(3)
  })

  it('stop with multiple dependencies', () => {
    let dummy1, dummy2
    const obj1 = reactive({ prop: 1 })
    const obj2 = reactive({ prop: 1 })
    const runner = effect(() => {
      dummy1 = obj1.prop
      dummy2 = obj2.prop
    })

    obj1.prop = 2
    expect(dummy1).toBe(2)

    obj2.prop = 3
    expect(dummy2).toBe(3)

    stop(runner)

    obj1.prop = 4
    obj2.prop = 5

    // Check that both dependencies have been cleared
    expect(dummy1).toBe(2)
    expect(dummy2).toBe(3)
  })

  it('events: onStop', () => {
    const onStop = vitest.fn()
    const runner = effect(() => {}, {
      onStop,
    })

    stop(runner)
    expect(onStop).toHaveBeenCalled()
  })

  it('stop: a stopped effect is nested in a normal effect', () => {
    let dummy
    const obj = reactive({ prop: 1 })
    const runner = effect(() => {
      dummy = obj.prop
    })
    stop(runner)
    obj.prop = 2
    expect(dummy).toBe(1)

    // observed value in inner stopped effect
    // will track outer effect as an dependency
    effect(() => {
      runner()
    })
    expect(dummy).toBe(2)

    // notify outer effect to run
    obj.prop = 3
    expect(dummy).toBe(3)
  })

  it('markRaw', () => {
    const obj = reactive({
      foo: markRaw({
        prop: 0,
      }),
    })
    let dummy
    effect(() => {
      dummy = obj.foo.prop
    })
    expect(dummy).toBe(0)
    obj.foo.prop++
    expect(dummy).toBe(0)
    obj.foo = { prop: 1 }
    expect(dummy).toBe(1)
  })

  it('should not be triggered when the value and the old value both are NaN', () => {
    const obj = reactive({
      foo: NaN,
    })
    const fnSpy = vitest.fn(() => obj.foo)
    effect(fnSpy)
    obj.foo = NaN
    expect(fnSpy).toHaveBeenCalledTimes(1)
  })

  it('should trigger all effects when array length is set to 0', () => {
    const observed: any = reactive([1])
    let dummy, record
    effect(() => {
      dummy = observed.length
    })
    effect(() => {
      record = observed[0]
    })
    expect(dummy).toBe(1)
    expect(record).toBe(1)

    observed[1] = 2
    expect(observed[1]).toBe(2)

    observed.unshift(3)
    expect(dummy).toBe(3)
    expect(record).toBe(3)

    observed.length = 0
    expect(dummy).toBe(0)
    expect(record).toBeUndefined()
  })

  it('should not be triggered when set with the same proxy', () => {
    const obj = reactive({ foo: 1 })
    const observed: any = reactive({ obj })
    const fnSpy = vitest.fn(() => observed.obj)

    effect(fnSpy)

    expect(fnSpy).toHaveBeenCalledTimes(1)
    // observed.obj = obj
    // expect(fnSpy).toHaveBeenCalledTimes(1)

    const obj2 = reactive({ foo: 1 })
    const observed2: any = shallowReactive({ obj2 })
    const fnSpy2 = vitest.fn(() => observed2.obj2)

    effect(fnSpy2)

    expect(fnSpy2).toHaveBeenCalledTimes(1)
    observed2.obj2 = obj2
    expect(fnSpy2).toHaveBeenCalledTimes(1)
  })

  it('should be triggered when set length with string', () => {
    let ret1 = 'idle'
    let ret2 = 'idle'
    const arr1 = reactive(new Array(11).fill(0))
    const arr2 = reactive(new Array(11).fill(0))
    effect(() => {
      ret1 = arr1[10] === undefined ? 'arr[10] is set to empty' : 'idle'
    })
    effect(() => {
      ret2 = arr2[10] === undefined ? 'arr[10] is set to empty' : 'idle'
    })
    arr1.length = 2
    arr2.length = '2' as any
    expect(ret1).toBe(ret2)
  })

  describe('readonly + reactive for Map', () => {
    test.skip('should work with readonly(reactive(Map))', () => {
      const m = reactive(new Map())
      const roM = readonly(m)
      const fnSpy = vitest.fn(() => roM.get(1))

      effect(fnSpy)
      expect(fnSpy).toHaveBeenCalledTimes(1)
      m.set(1, 1)
      expect(fnSpy).toHaveBeenCalledTimes(2)
    })

    test.skip('should work with observed value as key', () => {
      const key = reactive({})
      const m = reactive(new Map())
      m.set(key, 1)
      const roM = readonly(m)
      const fnSpy = vitest.fn(() => roM.get(key))

      effect(fnSpy)
      expect(fnSpy).toHaveBeenCalledTimes(1)
      m.set(key, 1)
      expect(fnSpy).toHaveBeenCalledTimes(1)
      m.set(key, 2)
      expect(fnSpy).toHaveBeenCalledTimes(2)
    })

    test('should track hasOwnProperty', () => {
      const obj: any = reactive({})
      let has = false
      const fnSpy = vitest.fn()

      effect(() => {
        fnSpy()
        has = obj.hasOwnProperty('foo')
      })
      expect(fnSpy).toHaveBeenCalledTimes(1)
      expect(has).toBe(false)

      obj.foo = 1
      expect(fnSpy).toHaveBeenCalledTimes(2)
      expect(has).toBe(true)

      delete obj.foo
      expect(fnSpy).toHaveBeenCalledTimes(3)
      expect(has).toBe(false)

      // // should not trigger on unrelated key
      obj.bar = 2
      expect(fnSpy).toHaveBeenCalledTimes(3)
      expect(has).toBe(false)
    })
  })

  it('should be triggered once with batching', () => {
    const counter = reactive({ num: 0 })

    const counterSpy = vitest.fn(() => counter.num)
    effect(counterSpy)

    counterSpy.mockClear()

    startBatch()
    counter.num++
    counter.num++
    endBatch()
    expect(counterSpy).toHaveBeenCalledTimes(1)
  })
})
