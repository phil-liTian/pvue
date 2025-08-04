import { computed } from '../src/computed'
import { reactive } from '../src/reactive'

describe('reactivity/computed', () => {
  // 依赖的数据发生变化时 computed方法也要重新执行
  it.skip('should return updated value', () => {
    const value = reactive<{ foo?: number }>({})
    const cValue = computed(() => value.foo)
    expect(cValue.value).toBe(undefined)
    value.foo = 1
    expect(cValue.value).toBe(1)
  })
})
