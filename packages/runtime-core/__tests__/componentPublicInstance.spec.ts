import { h, render, nodeOps } from '@pvue/runtime-test'
import { ComponentInternalInstance } from '../src/component'

describe('component: proxy', () => {
  test('data', () => {
    let instance: ComponentInternalInstance
    let instanceProxy: any
    const Comp = {
      data() {
        return {
          foo: 1,
        }
      },
      mounted() {
        // instance = getCurrentInstance()!
        instanceProxy = this
      },
      render() {
        return null
      },
    }
    render(h(Comp), nodeOps.createElement('div'))
    // expect(instanceProxy.foo).toBe(1)
    // instanceProxy.foo = 2
    // expect(instance!.data.foo).toBe(2)
  })
})
