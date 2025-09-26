export const CompilerText = {
  name: 'Text',
  template: `{{ foo }} bar`,
  // template: '<div />',
  setup() {
    return {
      foo: 1,
    }
  },
  // render: ctx => {
  //   return h('div', {}, '123')
  // },
}
