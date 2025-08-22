/*
 * @Author: phil
 * @Date: 2025-08-21 20:43:00
 */
import { h, createSlots, renderSlot } from 'pvue'

console.log('renderSlot', renderSlot)

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
        // slots.header(),
        renderSlot(
          {
            header: () => [h('div', {}, '我是header')],
          },
          'header',
          { key: 'foo' }
        ),
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
