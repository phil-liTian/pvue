/*
 * @Author: phil
 * @Date: 2025-08-09 17:48:17
 */
import { h } from 'pvue'
import { ApiInject } from './examples/apiInject'
import { Slots, Slots1 } from './examples/slots'
import { RenderList } from './examples/renderList'
import { ComponentEmits } from './examples/componentEmits'
import { RendererElement } from './examples/rendererElement'

export const App = {
  render() {
    return h(RendererElement)
  },

  setup() {
    return {
      msg: 'p-vue',
    }
  },
}
