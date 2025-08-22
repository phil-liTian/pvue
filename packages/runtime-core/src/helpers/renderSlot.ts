import { isSymbol } from '@pvue/shared'
import { Data } from '../component'
import { createBlock, Fragment, isVNode, VNode, VNodeChild } from '../vnode'

/*
 * @Author: phil
 * @Date: 2025-08-21 21:21:12
 */
export function renderSlot(
  slots,
  name: string,
  props: Data = {},
  fallback?: () => VNodeChild
): VNode {
  let slot = slots[name]
  const validSlotContent = slot && ensureValidVNode(slot(props))

  const slotKey = props.key

  const rendered = createBlock(
    Fragment,
    {
      key:
        (slotKey && !isSymbol(slotKey) ? slotKey : `_${name}`) +
        (!validSlotContent && fallback ? '_fb' : ''),
    },
    validSlotContent || (fallback ? fallback() : [])
  )

  return rendered
}

export function ensureValidVNode(vnodes: VNodeChild): VNodeChild | null {
  return vnodes.some(child => {
    if (isVNode(child)) return true
  })
    ? vnodes
    : null
}
