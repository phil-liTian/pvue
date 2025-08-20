/*
 * @Author: phil
 * @Date: 2025-08-20 10:23:11
 */
export const patchProp = (el, key, prevValue, nextValue) => {
  el.setAttribute(key, nextValue)
}
