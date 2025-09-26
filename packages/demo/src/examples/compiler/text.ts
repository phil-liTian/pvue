/*
 * @Author: phil
 * @Date: 2025-09-25 10:45:16
 */
export const CompilerText = {
  name: 'Text',
  template: `{{ foo }} bar {{ one + two }}`,
  setup() {
    return {
      foo: 1,
      one: 1,
      two: 2,
    }
  },
  // render: ctx => {
  //   return h('div', {}, '123')
  // },
}
