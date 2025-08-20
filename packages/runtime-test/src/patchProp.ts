/*
 * @Author: phil
 * @Date: 2025-08-20 10:24:51
 */
export const patchProp = (el, key, prevValue, nextValue) => {
  el.props[key] = nextValue
}
