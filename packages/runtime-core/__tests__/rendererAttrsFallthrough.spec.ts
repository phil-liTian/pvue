/*
 * @Author: phil
 * @Date: 2025-08-25 20:29:46
 */
import { ref, h, render, nextTick, onUpdated } from '@pvue/runtime-dom'
/**
 * @vitest-environment jsdom
 */
describe('attribute fallthrough', () => {
  it.skip('should allow attrs to fallthrough', async () => {
    const click = vi.fn()
    const childUpdated = vi.fn()

    const Hello = {
      setup() {
        const count = ref(0)

        function inc() {
          count.value++
          click()
        }

        return () =>
          h(Child, {
            foo: count.value + 1,
            id: 'test',
            class: 'c' + count.value,
            style: { color: count.value ? 'red' : 'green' },
            onClick: inc,
            'data-id': count.value + 1,
          })
      },
    }

    const Child = {
      setup(props: any) {
        onUpdated(childUpdated)
        return () =>
          h(
            'div',
            {
              class: 'c2',
              style: { fontWeight: 'bold' },
            },
            props.foo
          )
      },
    }

    const root = document.createElement('div')

    document.body.appendChild(root)
    render(h(Hello), root)

    const node = root.children[0] as HTMLElement

    expect(node.getAttribute('id')).toBe('test')
    expect(node.getAttribute('foo')).toBe('1')
    expect(node.getAttribute('class')).toBe('c2 c0')
    expect(node.style.color).toBe('green')
    expect(node.style.fontWeight).toBe('bold')
    expect(node.dataset.id).toBe('1')
    node.dispatchEvent(new CustomEvent('click'))
    expect(click).toHaveBeenCalled()

    await nextTick()
    expect(childUpdated).toHaveBeenCalled()
    expect(node.getAttribute('id')).toBe('test')
    expect(node.getAttribute('foo')).toBe('2')
    // expect(node.getAttribute('class')).toBe('c2 c1')
    // expect(node.style.color).toBe('red')
    // expect(node.style.fontWeight).toBe('bold')
    // expect(node.dataset.id).toBe('2')
  })

  it.skip('should only allow whitelisted fallthrough on functional component with optional props', async () => {
    const click = vi.fn()
    const childUpdated = vi.fn()

    const count = ref(0)

    function inc() {
      count.value++
      click()
    }

    const Hello = () =>
      h(Child, {
        foo: count.value + 1,
        id: 'test',
        class: 'c' + count.value,
        style: { color: count.value ? 'red' : 'green' },
        onClick: inc,
      })

    const Child = (props: any) => {
      childUpdated()
      return h(
        'div',
        {
          class: 'c2',
          style: { fontWeight: 'bold' },
        },
        props.foo
      )
    }

    const root = document.createElement('div')
    document.body.appendChild(root)
    render(h(Hello), root)

    const node = root.children[0] as HTMLElement

    // not whitelisted
    expect(node.getAttribute('id')).toBe(null)
    expect(node.getAttribute('foo')).toBe(null)

    // whitelisted: style, class, event listeners
    expect(node.getAttribute('class')).toBe('c2 c0')
    expect(node.style.color).toBe('green')
    expect(node.style.fontWeight).toBe('bold')
    node.dispatchEvent(new CustomEvent('click'))
    expect(click).toHaveBeenCalled()

    await nextTick()
    expect(childUpdated).toHaveBeenCalled()
    expect(node.getAttribute('id')).toBe(null)
    expect(node.getAttribute('foo')).toBe(null)
    expect(node.getAttribute('class')).toBe('c2 c1')
    expect(node.style.color).toBe('red')
    expect(node.style.fontWeight).toBe('bold')
  })
})
