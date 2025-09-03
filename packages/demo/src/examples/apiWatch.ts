import { h, watch, ref, reactive } from 'pvue'

export const ApiWatch = {
  name: 'apiWatch',
  setup() {
    const count = ref(0)
    const obj = reactive({ a: '123', b: { c: 'c' } })

    const state = reactive({
      nested: {
        count: ref(0),
      },
      array: [1, 2, 3],
      map: new Map([
        ['a', 1],
        ['b', 2],
      ]),
      set: new Set([1, 2, 3]),
    })

    // @ts-ignore
    window.count = count
    // @ts-ignore
    window.obj = obj

    watch(count, (newVal, oldVal) => {
      console.log('count变化了', newVal, oldVal)
    })

    watch(
      () => obj,
      (newVal, oldVal) => {
        console.log('obj.b.c变化了', newVal, oldVal)
      },
      { deep: false }
    )

    watch(
      count,
      (newVal, oldVal) => {
        console.log('count变化了', newVal, oldVal)
      },
      { immediate: true }
    )

    watch(
      () => state,
      (newVal, oldVal) => {
        console.log('nested.count变化了', newVal, oldVal)
      },
      {
        deep: true,
      }
    )

    // @ts-ignore
    window.state = state

    // warn
    watch(1, (newVal, oldVal) => {
      console.log('count变化了', newVal, oldVal)
    })

    return () => {
      return h('div', {}, 'apiWatch' + count.value + '' + obj.b.c)
    }
  },
}
