import { h, createSlots } from 'pvue'

const Parent = {
  name: 'Parent',
  props: {
    info: {
      type: Number,
      default: 123,
    },
  },
  setup(props, { slots }) {
    return () => {
      return h('div', {}, [
        slots.header(),
        h('div', { class: 'red' }, '我是父组件' + props.info),
        slots.default(),
      ])
    }
  },
}

export const Slots = {
  name: 'Slots',
  setup() {
    return () => {
      return h(
        Parent,
        { info: 1234 },
        {
          default: () => 'default',
          header: () => 'header',
        }
      )
    }
  },
}

export const Slots1 = {
  name: 'Slots1',
  setup() {
    return () => {
      return h(
        Parent,
        { info: 12345 },
        createSlots({}, [
          {
            name: 'header',
            fn: () => 'header - slot1',
          },
          {
            name: 'default',
            fn: () => 'default - slot1',
          },
        ])
      )
    }
  },
}
