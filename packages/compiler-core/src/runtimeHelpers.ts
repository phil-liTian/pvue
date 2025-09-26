/*
 * @Author: phil
 * @Date: 2025-09-14 20:56:01
 */
export const FRAGMENT: unique symbol = Symbol('Fragment')

export const CREATE_VNODE: unique symbol = Symbol('createVNode')
export const RESOLVE_DIRECTIVE: unique symbol = Symbol('resolveDirective')
export const TO_DISPLAY_STRING: unique symbol = Symbol('toDisplayString')
export const CREATE_COMMENT: unique symbol = Symbol('createCommentVNode')
export const RENDER_SLOT: unique symbol = Symbol('createSlots')
export const CREATE_TEXT: unique symbol = Symbol('createTextVNode')
export const CREATE_ELEMENT_VNODE: unique symbol = Symbol('createElementVNode')
export const OPEN_BLOCK: unique symbol = Symbol('openBlock')
export const CREATE_BLOCK: unique symbol = Symbol('createBlock')
export const CREATE_ELEMENT_BLOCK: unique symbol = Symbol('createElementBlock')

export const helperNameMap: Record<symbol, string> = {
  [CREATE_VNODE]: `createVNode`,
  [RESOLVE_DIRECTIVE]: `resolveDirective`,
  [TO_DISPLAY_STRING]: 'toDisplayString',
  [CREATE_TEXT]: 'createTextVNode',
  [FRAGMENT]: 'Fragment',
  [CREATE_ELEMENT_VNODE]: 'createElementVNode',
  [OPEN_BLOCK]: 'openBlock',
  [CREATE_BLOCK]: 'createBlock',
  [CREATE_ELEMENT_BLOCK]: 'createElementBlock',
}
