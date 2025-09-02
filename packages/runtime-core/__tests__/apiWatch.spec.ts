import {
  computed,
  h,
  nextTick,
  nodeOps,
  onWatcherCleanup,
  reactive,
  ref,
  render,
  serializeInner,
  shallowReactive,
  ShallowRef,
  shallowRef,
  watch,
} from '@pvue/runtime-test'
import { watchEffect } from '../src/apiWatch'

/*
 * @Author: phil
 * @Date: 2025-09-01 12:51:33
 */
describe('api: watch', () => {
  it('effect', async () => {
    const state = reactive({ count: 0 })
    let dummy
    watchEffect(() => {
      dummy = state.count
    })
    expect(dummy).toBe(0)

    state.count++
    await nextTick()
    expect(dummy).toBe(1)
  })

  it('watching single source: getter', async () => {
    const state = reactive({ count: 0 })
    let dummy
    watch(
      () => state.count,
      (count, prevCount) => {
        dummy = [count, prevCount]
        // assert types
        count + 1
        if (prevCount) {
          prevCount + 1
        }
      }
    )
    state.count++
    await nextTick()

    expect(dummy).toMatchObject([1, 0])
  })

  it('watching single source: ref', async () => {
    const count = ref(0)
    let dummy
    watch(count, (count, prevCount) => {
      dummy = [count, prevCount]
      // assert types
      count + 1
      if (prevCount) {
        prevCount + 1
      }
    })
    count.value++
    await nextTick()
    expect(dummy).toMatchObject([1, 0])
  })

  it.skip('watching single source: array', async () => {
    const array = reactive([] as number[])
    const spy = vi.fn()
    watch(array, spy)
    array.push(1)
    await nextTick()
    expect(spy).toBeCalledTimes(1)
    expect(spy).toBeCalledWith([1], [1], expect.anything())
  })

  it.skip('should not call functions inside a reactive source array', () => {
    const spy1 = vi.fn()
    const array = reactive([spy1])
    const spy2 = vi.fn()
    watch(array, spy2, { immediate: true })
    expect(spy1).toBeCalledTimes(0)
    expect(spy2).toBeCalledWith([spy1], undefined, expect.anything())
  })

  it.skip('should not unwrap refs in a reactive source array', async () => {
    const val = ref({ foo: 1 })
    const array = reactive([val])
    const spy = vi.fn()
    watch(array, spy, { immediate: true })
    expect(spy).toBeCalledTimes(1)
    expect(spy).toBeCalledWith([val], undefined, expect.anything())

    // deep by default
    val.value.foo++
    await nextTick()
    expect(spy).toBeCalledTimes(2)
    expect(spy).toBeCalledWith([val], [val], expect.anything())
  })

  it('响应式数据没有发生变化的话 不会触发回调', async () => {
    const spy = vi.fn()
    const n = ref(0)
    watch(() => n.value % 2, spy)

    n.value++
    await nextTick()
    expect(spy).toBeCalledTimes(1)

    n.value += 2
    await nextTick()
    // should not be called again because getter result did not change
    expect(spy).toBeCalledTimes(1)
  })

  it.skip('watching single source: computed ref', async () => {
    const count = ref(0)
    const plus = computed(() => count.value + 1)
    let dummy
    watch(plus, (count, prevCount) => {
      dummy = [count, prevCount]
      // assert types
      count + 1
      if (prevCount) {
        prevCount + 1
      }
    })
    count.value++
    await nextTick()

    expect(dummy).toMatchObject([2, 1])
  })

  it('watching primitive with deep: true', async () => {
    const count = ref(0)
    let dummy
    watch(
      count,
      (c, prevCount) => {
        dummy = [c, prevCount]
      },
      {
        deep: true,
      }
    )
    count.value++
    await nextTick()
    expect(dummy).toMatchObject([1, 0])
  })

  it('directly watching reactive object (with automatic deep: true)', async () => {
    const src = reactive({
      count: 0,
    })
    let dummy
    watch(src, ({ count }) => {
      dummy = count
    })
    src.count++
    await nextTick()
    expect(dummy).toBe(1)
  })

  it('directly watching reactive object with explicit deep: false', async () => {
    const src = reactive({
      state: {
        count: 0,
      },
    })
    let dummy
    watch(
      src,
      ({ state }) => {
        dummy = state?.count
      },
      {
        deep: false,
      }
    )

    // nested should not trigger
    src.state.count++
    await nextTick()

    expect(dummy).toBe(undefined)

    // root level should trigger
    src.state = { count: 1 }
    await nextTick()
    expect(dummy).toBe(1)
  })

  it.skip('directly watching reactive array with explicit deep: false', async () => {
    const val = ref(1)
    const array: any[] = reactive([val])
    const spy = vi.fn()
    watch(array, spy, { immediate: true, deep: false })
    expect(spy).toBeCalledTimes(1)
    expect(spy).toBeCalledWith([val], undefined, expect.anything())

    val.value++
    await nextTick()
    expect(spy).toBeCalledTimes(1)

    array[1] = 2
    await nextTick()
    expect(spy).toBeCalledTimes(2)
    expect(spy).toBeCalledWith([val, 2], [val, 2], expect.anything())
  })

  it.skip('watching shallow reactive array with deep: false', async () => {
    class foo {
      prop1: ShallowRef<string> = shallowRef('')
      prop2: string = ''
    }

    const obj1 = new foo()
    const obj2 = new foo()

    const collection = shallowReactive([obj1, obj2])
    const cb = vi.fn()
    watch(collection, cb, { deep: false })

    collection[0].prop1.value = 'foo'
    await nextTick()
    // should not trigger
    expect(cb).toBeCalledTimes(0)

    collection.push(new foo())
    await nextTick()
    // should trigger on array self mutation
    expect(cb).toBeCalledTimes(1)
  })

  it('should still respect deep: true on shallowReactive source', async () => {
    const obj = reactive({ a: 1 })
    const arr = shallowReactive([obj])

    let dummy
    watch(
      arr,
      () => {
        dummy = arr[0].a
      },
      { deep: true }
    )

    obj.a++
    await nextTick()
    expect(dummy).toBe(2)
  })

  it('watching multiple sources', async () => {
    const state = reactive({ count: 1 })
    const count = ref(1)
    const plus = computed(() => count.value + 1)

    let dummy
    watch([() => state.count, count, plus], (vals, oldVals) => {
      dummy = [vals, oldVals]
      // assert types
      vals.concat(1)
      oldVals.concat(1)
    })

    state.count++
    count.value++
    await nextTick()

    expect(dummy).toMatchObject([
      [2, 2, 3],
      [1, 1, 2],
    ])
  })

  it('watching multiple sources: undefined initial values and immediate: true', async () => {
    const a = ref()
    const b = ref()
    let called = false
    watch(
      [a, b],
      ([newA, newB], [oldA, oldB]) => {
        called = true
        expect([newA, newB]).toMatchObject([undefined, undefined])
        expect([oldA, oldB]).toMatchObject([undefined, undefined])
      },
      { immediate: true }
    )
    await nextTick()
    expect(called).toBe(true)
  })

  it('watching multiple sources: readonly array', async () => {
    const state = reactive({ count: 1 })
    const status = ref(false)

    let dummy
    watch([() => state.count, status] as const, (vals, oldVals) => {
      dummy = [vals, oldVals]
      const [count] = vals
      const [, oldStatus] = oldVals
      // assert types
      count + 1
      oldStatus === true
    })

    state.count++
    status.value = true
    await nextTick()
    expect(dummy).toMatchObject([
      [2, true],
      [1, false],
    ])
  })

  it('watching multiple sources: reactive object (with automatic deep: true)', async () => {
    const src = reactive({ count: 0 })
    let dummy
    watch([src], ([state]) => {
      dummy = state
      // assert types
      state.count === 1
    })
    src.count++
    await nextTick()
    expect(dummy).toMatchObject({ count: 1 })
  })

  it('warn invalid watch source', () => {
    watch(1, () => {})
    expect(`Invalid watch source`).toHaveBeenWarned()
  })

  it('warn invalid watch source: multiple sources', () => {
    watch([1], () => {})
    expect(`Invalid watch source`).toHaveBeenWarned()
  })

  it('stopping the watcher (effect)', async () => {
    const state = reactive({ count: 0 })
    let dummy
    const stop = watchEffect(() => {
      dummy = state.count
    })
    expect(dummy).toBe(0)

    stop()
    state.count++
    await nextTick()
    // should not update
    expect(dummy).toBe(0)
  })

  it.skip('stopping the watcher (SSR)', async () => {
    let dummy = 0
    const count = ref<number>(1)
    const captureValue = (value: number) => {
      dummy = value
    }
    const watchCallback = vi.fn(newValue => {
      captureValue(newValue)
    })
    const Comp = defineComponent({
      created() {
        const getter = () => this.count
        captureValue(getter()) // sets dummy to 1
        const stop = this.$watch(getter, watchCallback)
        stop()
        this.count = 2 // shouldn't trigger side effect
      },
      render() {
        return h('div', this.count)
      },
      setup() {
        return { count }
      },
    })
    let html
    html = await renderToString(h(Comp))
    // should not throw here
    expect(html).toBe(`<div>2</div>`)
    expect(watchCallback).not.toHaveBeenCalled()
    expect(dummy).toBe(1)
    await nextTick()
    count.value = 3 // shouldn't trigger side effect
    await nextTick()
    expect(watchCallback).not.toHaveBeenCalled()
    expect(dummy).toBe(1)
  })

  it('stopping the watcher (with source)', async () => {
    const state = reactive({ count: 0 })
    let dummy
    const stop = watch(
      () => state.count,
      count => {
        dummy = count
      }
    )

    state.count++
    await nextTick()
    expect(dummy).toBe(1)

    stop()
    state.count++
    await nextTick()
    // should not update
    expect(dummy).toBe(1)
  })

  it('cleanup registration (effect)', async () => {
    const state = reactive({ count: 0 })
    const cleanup = vi.fn()
    let dummy
    const stop = watchEffect(onCleanup => {
      onCleanup(cleanup)
      dummy = state.count
    })
    expect(dummy).toBe(0)

    state.count++
    await nextTick()
    expect(cleanup).toHaveBeenCalledTimes(1)
    expect(dummy).toBe(1)

    stop()
    expect(cleanup).toHaveBeenCalledTimes(2)
  })

  it('cleanup registration (with source)', async () => {
    const count = ref(0)
    const cleanup = vi.fn()
    let dummy
    const stop = watch(count, (count, prevCount, onCleanup) => {
      console.log('update')

      onCleanup(cleanup)
      dummy = count
    })

    count.value++
    await nextTick()
    expect(cleanup).toHaveBeenCalledTimes(0)
    expect(dummy).toBe(1)

    // 第二次更新的时候 scheduler不执行了？？？
    count.value++
    await nextTick()
    expect(cleanup).toHaveBeenCalledTimes(1)
    expect(dummy).toBe(2)

    stop()
    expect(cleanup).toHaveBeenCalledTimes(2)
  })

  it.skip('onWatcherCleanup', async () => {
    const count = ref(0)
    const cleanupEffect = vi.fn()
    const cleanupWatch = vi.fn()

    const stopEffect = watchEffect(() => {
      onWatcherCleanup(cleanupEffect)
      count.value
    })
    const stopWatch = watch(count, () => {
      onWatcherCleanup(cleanupWatch)
    })

    count.value++
    await nextTick()
    expect(cleanupEffect).toHaveBeenCalledTimes(1)
    expect(cleanupWatch).toHaveBeenCalledTimes(0)

    count.value++
    await nextTick()
    expect(cleanupEffect).toHaveBeenCalledTimes(2)
    expect(cleanupWatch).toHaveBeenCalledTimes(1)

    stopEffect()
    // expect(cleanupEffect).toHaveBeenCalledTimes(3)
    stopWatch()
    expect(cleanupWatch).toHaveBeenCalledTimes(2)
  })

  it.skip('flush timing: pre (default)', async () => {
    const count = ref(0)
    const count2 = ref(0)

    let callCount = 0
    let result1
    let result2
    const assertion = vi.fn((count, count2Value) => {
      callCount++
      // on mount, the watcher callback should be called before DOM render
      // on update, should be called before the count is updated
      const expectedDOM = callCount === 1 ? `` : `${count - 1}`
      console.log('serializeInner(root)', serializeInner(root), expectedDOM)

      result1 = serializeInner(root) === expectedDOM

      // in a pre-flush callback, all state should have been updated
      const expectedState = callCount - 1
      result2 = count === expectedState && count2Value === expectedState
    })

    const Comp = {
      setup() {
        watchEffect(() => {
          assertion(count.value, count2.value)
        })
        return () => count.value
      },
    }
    const root = nodeOps.createElement('div')
    render(h(Comp), root)
    expect(assertion).toHaveBeenCalledTimes(1)
    expect(result1).toBe(true)
    expect(result2).toBe(true)

    count.value++
    count2.value++
    await nextTick()
    // two mutations should result in 1 callback execution
    expect(assertion).toHaveBeenCalledTimes(2)
    console.log('result1', result1)

    expect(result1).toBe(true)
    // expect(result2).toBe(true)
  })

  it('flush timing: post', async () => {
    const count = ref(0)
    let result
    const assertion = vi.fn(count => {
      console.log('serializeInner(root)', serializeInner(root), count)

      result = serializeInner(root) === `${count}`
    })

    const Comp = {
      setup() {
        watchEffect(
          () => {
            assertion(count.value)
          },
          { flush: 'post' }
        )
        return () => count.value
      },
    }
    const root = nodeOps.createElement('div')
    render(h(Comp), root)
    await nextTick()
    expect(assertion).toHaveBeenCalledTimes(1)
    expect(result).toBe(true)

    count.value++
    await nextTick()
    expect(assertion).toHaveBeenCalledTimes(2)
    expect(result).toBe(true)
  })
})
