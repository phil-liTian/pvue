/*
 * @Author: phil
 * @Date: 2025-08-22 13:38:30
 */
import { renderList, h } from 'pvue'

export const RenderList = {
  name: 'renderList',
  setup() {
    return () => {
      return h(
        'div',
        renderList(['1', '2', '3'], (item, index) =>
          h('div', `node: ${item} ${index}`)
        )
      )
    }
  },
}
