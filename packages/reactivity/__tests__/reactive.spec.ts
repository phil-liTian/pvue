/*
 * @Author: phil
 * @Date: 2025-08-01 20:07:37
 */
import {
  isProxy,
  isReactive,
  isShallow,
  markRaw,
  reactive,
  shallowReactive,
  toRaw,
} from '../src/reactive'

describe.skip('reactivity/reactive', () => {
  it('Object', () => {
    const original = { foo: 1 }
    const observed = reactive(original)
    expect(observed).not.toBe(original)
    expect(isReactive(observed)).toBe(true)
    expect(isReactive(original)).toBe(false)

    expect(observed.foo).toBe(1)
    expect('foo' in observed).toBe(true)
    expect(Object.keys(observed)).toEqual(['foo'])
  })

  test('proto', () => {
    const obj = {}
    const reactiveObj = reactive(obj)
    expect(isReactive(reactiveObj)).toBe(true)
    // read prop of reactiveObject will cause reactiveObj[prop] to be reactive
    const prototype = reactiveObj['__proto__']
    const otherObj = { data: ['a'] }
    expect(isReactive(otherObj)).toBe(false)
    const reactiveOther = reactive(otherObj)
    expect(isReactive(reactiveOther)).toBe(true)
    expect(reactiveOther.data[0]).toBe('a')
  })

  test('nested reactives', () => {
    const original = {
      nested: {
        foo: 1,
      },
      array: [{ bar: 2 }],
    }
    const observed = reactive(original)
    expect(isReactive(observed.nested)).toBe(true)
    expect(isReactive(observed.array)).toBe(true)
    expect(isReactive(observed.array[0])).toBe(true)
  })

  test.skip('observing subtypes of IterableCollections(Map, Set)', () => {
    // subtypes of Map
    class CustomMap extends Map {}
    const cmap = reactive(new CustomMap())

    expect(cmap).toBeInstanceOf(Map)
    expect(isReactive(cmap)).toBe(true)

    cmap.set('key', {})
    expect(isReactive(cmap.get('key'))).toBe(true)

    // // subtypes of Set
    // class CustomSet extends Set {}
    // const cset = reactive(new CustomSet())

    // expect(cset).toBeInstanceOf(Set)
    // expect(isReactive(cset)).toBe(true)

    // let dummy
    // effect(() => (dummy = cset.has('value')))
    // expect(dummy).toBe(false)
    // cset.add('value')
    // expect(dummy).toBe(true)
    // cset.delete('value')
    // expect(dummy).toBe(false)
  })

  test.skip('observing subtypes of WeakCollections(WeakMap, WeakSet)', () => {
    // subtypes of WeakMap
    class CustomMap extends WeakMap {}
    const cmap = reactive(new CustomMap())

    expect(cmap).toBeInstanceOf(WeakMap)
    expect(isReactive(cmap)).toBe(true)

    const key = {}
    cmap.set(key, {})
    expect(isReactive(cmap.get(key))).toBe(true)

    // subtypes of WeakSet
    class CustomSet extends WeakSet {}
    const cset = reactive(new CustomSet())

    expect(cset).toBeInstanceOf(WeakSet)
    expect(isReactive(cset)).toBe(true)

    let dummy
    effect(() => (dummy = cset.has(key)))
    expect(dummy).toBe(false)
    cset.add(key)
    expect(dummy).toBe(true)
    cset.delete(key)
    expect(dummy).toBe(false)
  })

  test('observed value should proxy mutations to original (Object)', () => {
    const original: any = { foo: 1 }
    const observed = reactive(original)
    // set
    observed.bar = 1
    expect(observed.bar).toBe(1)
    expect(original.bar).toBe(1)
    // delete
    delete observed.foo
    expect('foo' in observed).toBe(false)
    expect('foo' in original).toBe(false)
  })

  test('original value change should reflect in observed value (Object)', () => {
    const original: any = { foo: 1 }
    const observed = reactive(original)
    // set
    original.bar = 1
    expect(original.bar).toBe(1)
    expect(observed.bar).toBe(1)
    // delete
    delete original.foo
    expect('foo' in original).toBe(false)
    expect('foo' in observed).toBe(false)
  })

  test('setting a property with an unobserved value should wrap with reactive', () => {
    const observed = reactive<{ foo?: object }>({})
    const raw = {}
    observed.foo = raw
    expect(observed.foo).not.toBe(raw)
    expect(isReactive(observed.foo)).toBe(true)
  })

  test('observing already observed value should return same Proxy', () => {
    const original = { foo: 1 }
    const observed = reactive(original)
    const observed2 = reactive(observed)
    expect(observed2).toBe(observed)
  })

  test('observing the same value multiple times should return same Proxy', () => {
    const original = { foo: 1 }
    const observed = reactive(original)
    const observed2 = reactive(original)
    expect(observed2).toBe(observed)
  })

  test.skip('不应该用Proxies污染原始对象', () => {
    const original: any = { foo: 1 }
    const original2 = { bar: 2 }
    const observed = reactive(original)
    const observed2 = reactive(original2)
    observed.bar = observed2
    expect(observed.bar).toBe(observed2)
    expect(original.bar).toBe(original2)
  })

  test.skip('mutation on objects using reactive as prototype should not trigger', () => {
    const observed = reactive({ foo: 1 })
    const original = Object.create(observed)
    let dummy
    effect(() => (dummy = original.foo))
    expect(dummy).toBe(1)
    observed.foo = 2
    expect(dummy).toBe(2)
    original.foo = 3
    expect(dummy).toBe(2)
    original.foo = 4
    expect(dummy).toBe(2)
  })

  test('toRaw', () => {
    const original = { foo: 1 }
    const observed = reactive(original)
    expect(toRaw(observed)).toBe(original)
    expect(toRaw(original)).toBe(original)
  })

  // toRaw 函数应该直接返回这个继承对象本身，而不是尝试获取其原型链上响应式对象的原始对象。
  test('toRaw对使用reactive作为原型的对象的处理', () => {
    const original = { foo: 1 }
    const observed = reactive(original)
    const inherited = Object.create(observed)
    expect(toRaw(observed)).toBe(original)
    expect(toRaw(inherited)).toBe(inherited)
  })

  // 当用户自定义的 Proxy 包装了 Vue 的响应式对象时， toRaw 函数仍然能够正确地获取到最原始的对象 。
  test('toRaw on user Proxy wrapping reactive', () => {
    const original = {}
    const re = reactive(original)
    const obj = new Proxy(re, {})
    const raw = toRaw(obj)
    expect(raw).toBe(original)
  })

  test.skip('should not unwrap Ref<T>', () => {
    // const observedNumberRef = reactive(ref(1))
    // const observedObjectRef = reactive(ref({ foo: 1 }))
    // expect(isRef(observedNumberRef)).toBe(true)
    // expect(isRef(observedObjectRef)).toBe(true)
  })

  test.skip('should unwrap computed refs', () => {
    // readonly
    // const a = computed(() => 1)
    // // writable
    // const b = computed({
    //   get: () => 1,
    //   set: () => {},
    // })
    // const obj = reactive({ a, b })
    // // check type
    // obj.a + 1
    // obj.b + 1
    // expect(typeof obj.a).toBe(`number`)
    // expect(typeof obj.b).toBe(`number`)
  })

  test.skip('should allow setting property from a ref to another ref', () => {
    const foo = ref(0)
    const bar = ref(1)
    const observed = reactive({ a: foo })
    const dummy = computed(() => observed.a)
    expect(dummy.value).toBe(0)
    observed.a = bar
    expect(dummy.value).toBe(1)
    bar.value++
    expect(dummy.value).toBe(2)
  })

  test.skip('non-observable values', () => {
    const assertValue = (value: any) => {
      reactive(value)
      expect(
        `value cannot be made reactive: ${String(value)}`
      ).toHaveBeenWarnedLast()
    }

    // number
    assertValue(1)
    // string
    assertValue('foo')
    // boolean
    assertValue(false)
    // null
    assertValue(null)
    // undefined
    assertValue(undefined)
    // symbol
    const s = Symbol()
    assertValue(s)
    // bigint
    const bn = BigInt('9007199254740991')
    assertValue(bn)

    // built-ins should work and return same value
    const p = Promise.resolve()
    expect(reactive(p)).toBe(p)
    const r = new RegExp('')
    expect(reactive(r)).toBe(r)
    const d = new Date()
    expect(reactive(d)).toBe(d)
  })

  // markRaw的对象 不会做响应式处理了
  test('markRaw', () => {
    const obj = reactive({
      foo: { a: 1 },
      bar: markRaw({ b: 2 }),
    })
    expect(isReactive(obj.foo)).toBe(true)
    expect(isReactive(obj.bar)).toBe(false)
  })

  test('markRaw should skip non-extensible objects', () => {
    const obj = Object.seal({ foo: 1 })
    expect(() => markRaw(obj)).not.toThrowError()
  })

  test('markRaw should not redefine on an marked object', () => {
    const obj = markRaw({ foo: 1 })
    const raw = markRaw(obj)
    expect(raw).toBe(obj)
    expect(() => markRaw(obj)).not.toThrowError()
  })

  // 确保被 markRaw 标记过的对象不会被转换为响应式对象，即使它被添加到一个响应式对象中
  test.skip('should not markRaw object as reactive', () => {
    const a = reactive({ a: 1 })
    const b = reactive({ b: 2 }) as any
    b.a = markRaw(toRaw(a))
    console.log('b.a', b.a)

    expect(b.a === a).toBe(false)
  })

  test('should not observe non-extensible objects', () => {
    const obj = reactive({
      foo: Object.preventExtensions({ a: 1 }),
      // sealed or frozen objects are considered non-extensible as well
      bar: Object.freeze({ a: 1 }),
      baz: Object.seal({ a: 1 }),
    })
    expect(isReactive(obj.foo)).toBe(false)
    expect(isReactive(obj.bar)).toBe(false)
    expect(isReactive(obj.baz)).toBe(false)
  })

  test('should not observe objects with __v_skip', () => {
    const original = {
      foo: 1,
      __v_skip: true,
    }
    const observed = reactive(original)
    expect(isReactive(observed)).toBe(false)
  })

  test.skip('hasOwnProperty edge case: Symbol values', () => {
    const key = Symbol()
    const obj = reactive({ [key]: 1 }) as { [key]?: 1 }
    let dummy
    effect(() => {
      dummy = obj.hasOwnProperty(key)
    })
    expect(dummy).toBe(true)

    delete obj[key]
    expect(dummy).toBe(false)
  })

  test.skip('hasOwnProperty edge case: non-string values', () => {
    const key = {}
    const obj = reactive({ '[object Object]': 1 }) as { '[object Object]'?: 1 }
    let dummy
    effect(() => {
      // @ts-expect-error
      dummy = obj.hasOwnProperty(key)
    })
    expect(dummy).toBe(true)

    // @ts-expect-error
    delete obj[key]
    expect(dummy).toBe(false)
  })

  test('isProxy', () => {
    const foo = {}
    expect(isProxy(foo)).toBe(false)

    const fooRe = reactive(foo)
    expect(isProxy(fooRe)).toBe(true)

    // const fooSRe = shallowReactive(foo)
    // expect(isProxy(fooSRe)).toBe(true)

    // const barRl = readonly(foo)
    // expect(isProxy(barRl)).toBe(true)

    // const barSRl = shallowReadonly(foo)
    // expect(isProxy(barSRl)).toBe(true)

    // const c = computed(() => {})
    // expect(isProxy(c)).toBe(false)
  })

  test.skip('The results of the shallow and readonly assignments are the same (Map)', () => {
    const map = reactive(new Map())
    map.set('foo', shallowReactive({ a: 2 }))
    expect(isShallow(map.get('foo'))).toBe(true)

    // map.set('bar', readonly({ b: 2 }))
    // expect(isReadonly(map.get('bar'))).toBe(true)
  })

  test.skip('The results of the shallow and readonly assignments are the same (Set)', () => {
    const set = reactive(new Set())
    set.add(shallowReactive({ a: 2 }))
    set.add(readonly({ b: 2 }))
    let count = 0
    for (const i of set) {
      if (count === 0) expect(isShallow(i)).toBe(true)
      else expect(isReadonly(i)).toBe(true)
      count++
    }
  })

  // #11696
  test.skip('should use correct receiver on set handler for refs', () => {
    const a = reactive(ref(1))
    effect(() => a.value)
    expect(() => {
      a.value++
    }).not.toThrow()
  })

  // #11979
  test.skip('should release property Dep instance if it no longer has subscribers', () => {
    let obj = { x: 1 }
    let a = reactive(obj)
    const e = effect(() => a.x)
    expect(targetMap.get(obj)?.get('x')).toBeTruthy()
    e.effect.stop()
    expect(targetMap.get(obj)?.get('x')).toBeFalsy()
  })

  test.skip('should trigger reactivity when Map key is undefined', () => {
    const map = reactive(new Map())
    const c = computed(() => map.get(void 0))

    expect(c.value).toBe(void 0)

    map.set(void 0, 1)
    expect(c.value).toBe(1)
  })

  test.skip('should return true for reactive objects', () => {
    expect(isReactive(reactive({}))).toBe(true)
    expect(isReactive(readonly(reactive({})))).toBe(true)
    expect(isReactive(ref({}).value)).toBe(true)
    expect(isReactive(readonly(ref({})).value)).toBe(true)
    expect(isReactive(shallowReactive({}))).toBe(true)
  })

  test.skip('should return false for non-reactive objects', () => {
    expect(isReactive(ref(true))).toBe(false)
    expect(isReactive(shallowRef({}).value)).toBe(false)
  })
})
