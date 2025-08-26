/*
 * @Author: phil
 * @Date: 2025-08-26 10:44:34
 */
import { h } from 'pvue'

export const RendererAttrsFallthrough = {
  name: 'rendererAttrsFallthrough',
  setup() {
    return () =>
      h(
        'div',
        {
          style: {
            color: 'blue',
            fontWeight: 'bold',
          },
          onClick: () => console.log('click'),
        },
        'attrs fall through'
      )
  },
}
