import { h } from 'pvue'

const Child = {
  name: 'Child',
  emits: ['foo'],
  setup(props, { emit }) {
    const handleClick = () => {
      emit('foo')
    }

    return () => h('span', { onClick: handleClick }, 'Child')
  },
}

export const ComponentEmits = {
  name: 'ComponentEmits',

  setup() {
    const handleClick = () => {
      console.log('click')
    }

    return () => {
      return h(Child, { onFoo: handleClick })
    }
  },
}
