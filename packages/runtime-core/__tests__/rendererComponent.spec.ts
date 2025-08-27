import {
  h,
  inject,
  nextTick,
  nodeOps,
  provide,
  Ref,
  ref,
  render,
  serializeInner,
  VNode,
} from '@pvue/runtime-test'

describe('renderer: component', () => {
  test('当子组件自我更新时应更新父组件(hoc)的宿主元素', async () => {
    const value = ref(true)
    let parentVnode: VNode
    let childVnode1: VNode
    let childVnode2: VNode

    const Parent = {
      render: () => {
        // let Parent first rerender
        return (parentVnode = h(Child))
      },
    }

    const Child = {
      render: () => {
        return value.value
          ? (childVnode1 = h('div'))
          : (childVnode2 = h('span'))
      },
    }

    const root = nodeOps.createElement('div')
    render(h(Parent), root)
    expect(serializeInner(root)).toBe(`<div></div>`)
    expect(parentVnode!.el).toBe(childVnode1!.el)

    value.value = false
    await nextTick()
    expect(serializeInner(root)).toBe(`<span></span>`)
    expect(parentVnode!.el).toBe(childVnode2!.el)
  })

  it('should create an Component with props', () => {
    const Comp = {
      render: () => {
        return h('div')
      },
    }
    const root = nodeOps.createElement('div')
    render(h(Comp, { id: 'foo', class: 'bar' }), root)
    expect(serializeInner(root)).toBe(`<div id="foo" class="bar"></div>`)
  })

  it('should create an Component with direct text children', () => {
    const Comp = {
      render: () => {
        return h('div', 'test')
      },
    }
    const root = nodeOps.createElement('div')
    render(h(Comp, { id: 'foo', class: 'bar' }), root)
    expect(serializeInner(root)).toBe(`<div id="foo" class="bar">test</div>`)
  })

  it('should update an Component tag which is already mounted', () => {
    const Comp1 = {
      render: () => {
        return h('div', 'foo')
      },
    }
    const root = nodeOps.createElement('div')
    render(h(Comp1), root)
    expect(serializeInner(root)).toBe('<div>foo</div>')

    const Comp2 = {
      render: () => {
        return h('span', 'foo')
      },
    }
    render(h(Comp2), root)
    expect(serializeInner(root)).toBe('<span>foo</span>')
  })

  it('should not update Component if only changed props are declared emit listeners', () => {
    const Comp1 = {
      emits: ['foo'],
      updated: vi.fn(),
      render: () => null,
    }
    const root = nodeOps.createElement('div')
    render(
      h(Comp1, {
        onFoo: () => {},
      }),
      root
    )
    render(
      h(Comp1, {
        onFoo: () => {},
      }),
      root
    )
    expect(Comp1.updated).not.toHaveBeenCalled()
  })

  test.skip('子组件同步更新父组件状态时应触发父组件重新渲染', async () => {
    const App = {
      setup() {
        const n = ref(0)
        provide('foo', n)
        return () => {
          return [h('div', n.value), h(Child)]
        }
      },
    }

    const Child = {
      setup() {
        const n = inject<Ref<number>>('foo')!
        console.log('n', n)

        n.value++

        return () => {
          return h('div', n.value)
        }
      },
    }

    const root = nodeOps.createElement('div')
    render(h(App), root)
    expect(serializeInner(root)).toBe(`<div>0</div><div>1</div>`)
    // await nextTick()
    // expect(serializeInner(root)).toBe(`<div>1</div><div>1</div>`)
  })
})
