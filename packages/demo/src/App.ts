import { h } from 'pvue'
export const App = {
  render() {
    return h('div', null, 'hi-pvue')
  },

  setup() {
    return {
      msg: 'p-vue',
    }
  },
}
