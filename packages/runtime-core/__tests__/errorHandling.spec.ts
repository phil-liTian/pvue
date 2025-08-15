import {
  h,
  nodeOps,
  onErrorCaptured,
  onMounted,
  render,
} from '@pvue/runtime-test'

describe('error handling', () => {
  test.skip('propagation', () => {
    const err = new Error('foo')
    const fn = vi.fn()

    const Comp = {
      setup() {
        onErrorCaptured((err, instance, info) => {
          fn(err, info, 'root')
          return false
        })
        return () => h(Child)
      },
    }

    const Child = {
      setup() {
        onErrorCaptured((err, instance, info) => {
          fn(err, info, 'child')
        })
        return () => h(GrandChild)
      },
    }

    const GrandChild = {
      setup() {
        onMounted(() => {
          throw err
        })
        return () => null
      },
    }

    render(h(Comp), nodeOps.createElement('div'))
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenCalledWith(err, 'mounted hook', 'root')
    expect(fn).toHaveBeenCalledWith(err, 'mounted hook', 'child')
  })
})
