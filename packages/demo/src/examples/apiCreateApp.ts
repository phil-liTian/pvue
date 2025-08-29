/*
 * @Author: phil
 * @Date: 2025-08-29 12:36:09
 */
import { h, inject, resolveComponent } from 'pvue'

export const ApiCreateApp = {
  name: 'div',
  // components: {

  // },
  props: {
    count: {
      default: 0,
    },
  },
  setup(props) {
    const foo = inject('foo')
    const global = inject('global')
    const parent = resolveComponent('parent')
    return () => [
      h('div', props.count),
      `根组件provides: ${foo}`,
      h('div', { style: { color: 'red' } }, [h(parent)]),
      global,
    ]
  },
}
