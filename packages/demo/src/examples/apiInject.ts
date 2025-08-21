import { h, provide, inject } from 'pvue'

const Child = {
  name: 'Child',
  setup() {
    const msg = inject('msg')
    return () => `我是child组件：${msg}`
  },
}

const parent = {
  name: 'parent',
  setup() {
    provide('msg', 'parent')
    return () => {
      return h(Child)
    }
  },
}

export const apiInject = {
  name: 'apiInject',

  setup() {
    return () => {
      return h(parent)
    }
  },
}
