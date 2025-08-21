/*
 * @Author: phil
 * @Date: 2025-08-09 17:48:17
 */
import { h } from 'pvue'
export const App = {
  render() {
    return h('div', { class: 'red' }, ['hi-pvue', h('div', 'children')])
  },

  setup() {
    return {
      msg: 'p-vue',
    }
  },
}
