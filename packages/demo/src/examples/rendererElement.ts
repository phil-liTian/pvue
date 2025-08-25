import { h, ref } from 'pvue'

export const RendererElement = {
  name: 'RendererElement',
  setup() {
    const flag = ref(true)
    window.flag = flag

    return () => {
      return flag.value
        ? h('div', { id: 'bar' }, ['foo'])
        : h('div', { id: 'baz', class: 'bar' }, ['foo'])
    }
  },
}
