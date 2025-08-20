/*
 * @Author: phil
 * @Date: 2025-08-19 20:48:01
 */
import { h, nodeOps, render, serialize } from '../src/index'

describe('test renderer', () => {
  it('should be able to serialize nodes', () => {
    const App = {
      render() {
        return h(
          'div',
          {
            id: 'test',
            boolean: '',
          },
          [h('span', 'foo'), 'hello']
        )
      },
    }
    const root = nodeOps.createElement('div')
    render(h(App), root)

    expect(serialize(root)).toEqual(
      `<div><div id="test" boolean><span>foo</span>hello</div></div>`
    )
    // indented output
    serialize(root, 2)

    expect(serialize(root, 2)).toEqual(
      `<div>
  <div id="test" boolean>
    <span>
      foo
    </span>
    hello
  </div>
</div>`
    )
  })
})
