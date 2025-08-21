/*
 * @Author: phil
 * @Date: 2025-08-09 17:48:17
 */
import { h } from 'pvue'
import { apiInject } from './examples/apiInject'
import { Slots, Slots1 } from './examples/slots'
export const App = {
  render() {
    return h(Slots1)
  },

  setup() {
    return {
      msg: 'p-vue',
    }
  },
}
