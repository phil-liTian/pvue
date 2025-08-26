import { isOn } from '@pvue/shared'
import { patchStyle } from './modules/style'
import { patchEvent } from './modules/events'

/*
 * @Author: phil
 * @Date: 2025-08-20 10:23:11
 */
export const patchProp = (el, key, prevValue, nextValue, parentComponent) => {
  console.log('key', key)

  if (key === 'style') {
    console.log('prevValue', prevValue, nextValue)
    patchStyle(el, prevValue, nextValue)
  } else if (isOn(key)) {
    patchEvent(el, key, prevValue, nextValue, parentComponent)
  } else {
    el.setAttribute(key, nextValue)
  }
}
