import { ReactiveFlags, warn } from '@pvue/reactivity'
import { RendererElement } from './renderer'
import {
  ClassComponent,
  Data,
  isClassComponent,
  type Component,
} from './component'
import {
  isString,
  PatchFlags,
  ShapeFlags,
  normalizeClass,
  normalizeStyle,
  isObject,
  isArray,
  extend,
  isFunction,
  isOn,
} from '@pvue/shared'

export const Comment: unique symbol = Symbol.for('v-cmt')
export const Fragment = Symbol.for('v-fgt')
export const Text: unique symbol = Symbol.for('v-txt')

export interface RendererNode {
  [key: string | symbol]: any
}

export type VNodeNormalizedChildren = any

export type VNodeProps = {
  key?: PropertyKey
}

export interface VNode<
  HostNode = RendererNode,
  HostElement = RendererElement,
  ExtraProps = { [key: string]: any }
> {
  /**
   * @internal
   */
  __v_isVNode: true
  [ReactiveFlags.SKIP]: true
  type: VNodeTypes
  props: Data
  key: PropertyKey | null
  patchFlag: PatchFlags
  shapeFlag: ShapeFlags
  children: VNodeNormalizedChildren

  // DOM
  el: HostNode | null
}

export type VNodeTypes = VNode | string | Component | typeof Comment

export type VNodeChild = any

export const createVNode = _createVNode

export function mergeProps(...args: (Data | VNodeProps)[]): Data {
  const ret: Data = {}
  for (let i = 0; i < args.length; i++) {
    const toMerge = args[i]

    for (const key in toMerge) {
      if (key === 'class') {
        ret.class = normalizeClass([ret.class, toMerge[key]])
      } else if (key === 'style') {
        ret.style = normalizeStyle([ret.style, toMerge[key]])
      } else if (isOn(key)) {
        const existing: any = ret[key]
        const incoming = toMerge[key]
        if (incoming && existing !== incoming && !isArray(existing)) {
          ret[key] = existing ? [].concat(existing, incoming) : incoming
        }
      } else if (key !== '') {
        ret[key] = toMerge[key]
      }
    }
  }

  return ret
}

// 暂时只处理props
export function cloneVNode(
  vnode: VNode,
  extraProps?: (Data & VNodeProps) | null
) {
  const { props, children, shapeFlag, patchFlag } = vnode
  const mergedProps = extraProps ? mergeProps(props || {}, extraProps) : props

  const cloned: VNode = {
    __v_isVNode: true,
    [ReactiveFlags.SKIP]: true,
    type: vnode.type,
    children,
    key: mergedProps && normalizeKey(mergedProps as VNodeProps),
    props: mergedProps,
    patchFlag,
    shapeFlag,
    el: vnode.el,
  }

  return cloned
}

function _createVNode(
  type: VNodeTypes | ClassComponent,
  props: Data | null = null,
  children: unknown = null,
  patchFlag: number = 0
): VNode {
  if (!type) {
    if (__DEV__) {
      warn(`Invalid vnode type when creating vnode: ${type}`)
    }
    type = Comment
  }

  if (isVNode(type)) {
    const cloned = cloneVNode(type, props)
    if (children) {
      normalizeChildren(cloned, children)
    }

    cloned.patchFlag = PatchFlags.BAIL
    return cloned
  }

  if (isClassComponent(type)) {
    type = type.__vccOpts as ClassComponent
  }

  if (props) {
    let { class: klass, style } = props

    // 处理数组 数组类型递归处理， 对象类型value是true则当作类型处理
    if (klass && !isString(klass)) {
      props.class = normalizeClass(klass)
    }

    // 处理style样式
    if (style && !isString(style)) {
      if (isObject(style)) {
        if (!isArray(style)) {
          style = extend({}, style)
        }
      }

      props.style = normalizeStyle(style)
    }
  }

  const shapeFlag = isString(type)
    ? ShapeFlags.ELEMENT
    : isObject(type)
    ? ShapeFlags.STATEFUL_COMPONENT
    : isFunction(type)
    ? ShapeFlags.FUNCTIONAL_COMPONENT
    : 0

  return createBaseVNode(type, props, children, patchFlag, shapeFlag, true)
}

function createBaseVNode(
  type,
  props: Data | null = null,
  children,
  patchFlag = 0,
  shapeFlag,
  needFullChildrenNormalization = false
) {
  const vnode = {
    __v_isVNode: true,
    [ReactiveFlags.SKIP]: true,
    type,
    key: props && normalizeKey(props),
    props,
    children,
    patchFlag,
    shapeFlag,
    el: null,
  } as VNode
  if (needFullChildrenNormalization) {
    normalizeChildren(vnode, children)
  } else if (children) {
    vnode.shapeFlag |= isString(children)
      ? ShapeFlags.TEXT_CHILDREN
      : ShapeFlags.ARRAY_CHILDREN
  }

  // NaN
  if (vnode.key !== vnode.key) {
    warn(`VNode created with invalid key (NaN). VNode type:`, vnode.type)
  }

  return vnode
}

function normalizeKey({ key }: VNodeProps): VNode['key'] {
  return (key != null ? key : null) as VNode['key']
}

export function isVNode(value): value is VNode {
  return value ? value.__v_isVNode === true : false
}

export function cloneIfMounted(child: VNode): VNode {
  return child.el === null ? child : cloneVNode(child)
}

export function normalizeVNode(child: VNodeChild): VNode {
  if (child == null || typeof child === 'boolean') {
    return createVNode(Comment)
  } else if (isArray(child)) {
    return createVNode(Fragment, {}, child.slice())
  } else if (isVNode(child)) {
    return cloneIfMounted(child)
  } else {
    return createVNode(Text, null, child)
  }
}

export function normalizeChildren(vnode: VNode, children: unknown): void {
  let type = 0

  if (children === null) {
    children = null
  } else if (isArray(children)) {
    type = ShapeFlags.ARRAY_CHILDREN
  } else if (isObject(children)) {
    if (vnode.shapeFlag & ShapeFlags.ELEMENT) {
      const slot = (children as any).default
      if (slot) {
        normalizeChildren(vnode, slot())
      }
      return
    } else {
      type = ShapeFlags.SLOTS_CHILDREN
    }
  } else if (isFunction(children)) {
    children = { default: children }
    type = ShapeFlags.SLOTS_CHILDREN
  } else {
    // string
    children = String(children)
    type = ShapeFlags.TEXT_CHILDREN
  }
  vnode.children = children
  vnode.shapeFlag |= type
}
