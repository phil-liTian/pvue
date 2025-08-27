import {
  def,
  EMPTY_OBJ,
  IfAny,
  isArray,
  isFunction,
  ShapeFlags,
} from '@pvue/shared'
import { ComponentInternalInstance, currentInstance } from './component'
import {
  normalizeVNode,
  VNode,
  VNodeChild,
  VNodeNormalizedChildren,
} from './vnode'
import { createInternalObject } from './internalObject'
import { warn } from './warning'
import { withCtx } from './componentRenderContext'

export type Slot<T extends any = any> = (
  ...args: IfAny<T, any[], [T]>
) => VNode[]

export type InternalSlots = {
  [name: string]: Slot | undefined
}

export type Slots = Readonly<InternalSlots>

function assignSlots(slots: InternalSlots, children: Slots) {
  for (const key in children) {
    slots[key] = children[key]
  }
}

function normalizeSlotValue(value): VNode[] {
  return isArray(value) ? value.map(normalizeVNode) : [normalizeVNode(value)]
}

function normalizeSlot(
  key,
  rawSlot: Function,
  ctx: ComponentInternalInstance | null | undefined
) {
  if ((rawSlot as any)._n) {
    return rawSlot
  }

  const normalized = withCtx(() => {
    if (currentInstance) {
      warn(
        `Slot "${key}" invoked outside of the render function: ` +
          `this will not track dependencies used in the slot. ` +
          `Invoke the slot function inside the render function instead.`
      )
    }

    return normalizeSlotValue(rawSlot())
  }, ctx)

  return normalized
}

function normalizeObjectSlots(rawSlots, slots) {
  const ctx = rawSlots._ctx
  for (const key in rawSlots) {
    const value = rawSlots[key]
    if (isFunction(value)) {
      slots[key] = normalizeSlot(key, value, ctx)
    } else if (value != null) {
      if (__DEV__) {
        warn(
          `Non-function value encountered for slot "${key}". ` +
            `Prefer function slots for better performance.`
        )
      }

      const normalized = normalizeSlotValue(value)
      slots[key] = () => normalized
    }
  }
}

function normalizeVNodeSlots(
  instance: ComponentInternalInstance,
  children: VNodeNormalizedChildren
) {
  if (__DEV__) {
    warn(
      `Non-function value encountered for default slot. ` +
        `Prefer function slots for better performance.`
    )
  }
  const normalized = normalizeSlotValue(children)
  instance.slots.default = () => normalized
}

export const initSlots = (
  instance: ComponentInternalInstance,
  children: VNodeNormalizedChildren
) => {
  const slots = (instance.slots = createInternalObject())

  if (instance.vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
    const cacheIndexes = children.__
    if (cacheIndexes) def(slots, '__', cacheIndexes, true)

    const type = children._
    if (type) {
      // 将children的属性挂载到slots上
      assignSlots(slots, children)

      def(slots, '_', type, true)
    } else {
      // 处理object slots
      normalizeObjectSlots(children, slots)
    }
  } else if (children) {
    normalizeVNodeSlots(instance, children)
  }
}

export function updateSlots(
  instance: ComponentInternalInstance,
  children: VNodeChild
) {
  const { vnode, slots } = instance
  let needDeletionCheck = true
  let deletionComparisonTarget = EMPTY_OBJ

  if (vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
    const type = children._

    if (type) {
      assignSlots(slots, children)
    } else {
      normalizeObjectSlots(children, slots)
    }

    deletionComparisonTarget = children
  } else if (children) {
    normalizeVNodeSlots(instance, children)
    // default 不需要删除了
    needDeletionCheck = false
  }

  if (needDeletionCheck) {
    for (const key in slots) {
      if (deletionComparisonTarget[key] == null) {
        delete slots[key]
      }
    }
  }
}
