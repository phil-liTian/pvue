export const CREATE_VNODE: unique symbol = Symbol('createVNode')
export const RESOLVE_DIRECTIVE: unique symbol = Symbol('resolveDirective')
export const TO_DISPLAY_STRING: unique symbol = Symbol('toDisplayString')
export const CREATE_COMMENT: unique symbol = Symbol('createCommentVNode')
export const RENDER_SLOT: unique symbol = Symbol('createSlots')

export const helperNameMap: Record<symbol, string> = {
  [CREATE_VNODE]: `createVNode`,
  [RESOLVE_DIRECTIVE]: `resolveDirective`,
}
