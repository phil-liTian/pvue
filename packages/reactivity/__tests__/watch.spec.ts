import { ref } from '../src'
import { watch } from '../src/watch'

describe('reactivity/watch', () => {
  test.skip('effect', () => {
    let dummy: any
    const source = ref(0)
    watch(() => {
      dummy = source.value
    })
    expect(dummy).toBe(0)
    source.value++
    expect(dummy).toBe(1)
  })
})
