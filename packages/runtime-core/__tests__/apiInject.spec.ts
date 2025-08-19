import { h, inject, nodeOps, provide, render } from '@pvue/runtime-test'

/*
 * @Author: phil
 * @Date: 2025-08-19 20:40:13
 */
describe('api: provide/inject', () => {
  it('string keys', () => {
    const Provider = {
      setup() {
        provide('foo', 1)
        return () => h(Middle)
      },
    }

    const Middle = {
      render: () => h(Consumer),
    }

    const Consumer = {
      setup() {
        const foo = inject('foo')
        return () => foo
      },
    }

    const root = nodeOps.createElement('div')
    render(h(Provider), root)
    expect(serialize(root)).toBe(`<div>1</div>`)
  })
})
