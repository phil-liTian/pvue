/*
 * @Author: phil
 * @Date: 2025-08-12 17:39:11
 */
import { ShapeFlags } from '@pvue/shared'
import {
  ComponentInternalInstance,
  Data,
  FunctionalComponent,
} from './component'
import { cloneVNode, normalizeVNode, VNode, Comment } from './vnode'

import { setCurrentRenderingInstance } from './componentRenderContext'
import { warn } from './warning'
import { ErrorCodes, handleError } from './errorHandling'

export function renderComponentRoot(
  instance: ComponentInternalInstance
): VNode {
  const {
    vnode,
    render,
    proxy,
    type: Component,
    props,
    attrs,
    slots,
    emit,
    inheritAttrs,
  } = instance
  let result
  // 属性
  let fallthroughAttrs
  const prev = setCurrentRenderingInstance(instance)
  try {
    if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
      // 对象组件
      const proxyToUse = proxy
      const thisProxy = __DEV__
        ? new Proxy(proxyToUse!, {
            get(target, key, receiver) {
              warn(
                `Property '${String(
                  key
                )}' was accessed via 'this'. Avoid using 'this' in templates.`
              )

              return Reflect.get(target, key, receiver)
            },
          })
        : proxyToUse

      result = normalizeVNode(render?.call(thisProxy))
      fallthroughAttrs = attrs
    } else {
      // 函数组件
      const render = Component as FunctionalComponent

      result = normalizeVNode(render(props, { attrs, slots, emit }))
    }
  } catch (err) {
    handleError(err, instance, ErrorCodes.RENDER_FUNCTION)
    result = normalizeVNode(Comment)
  }

  let root = result
  if (inheritAttrs !== false && fallthroughAttrs) {
    const keys = Object.keys(fallthroughAttrs)
    if (keys.length) {
      root = cloneVNode(root, fallthroughAttrs)
    }
  }

  setCurrentRenderingInstance(prev)
  return root
}

export function shouldUpdateComponent(prevVNode: VNode, nextVNode: VNode) {
  const { props: prevProps, children: prevChildren } = prevVNode
  const { props: nextProps, children: nextChildren } = nextVNode
  if (prevChildren || nextChildren) {
    if (!nextChildren || !nextChildren.$stable) {
      return true
    }
  }

  if (prevProps === nextProps) {
    return false
  }

  return hasPropsChanged(prevProps, nextProps)
}

function hasPropsChanged(prevProps: Data, nextProps: Data) {
  const nextKeys = Reflect.ownKeys(nextProps)

  for (let i = 0; i < nextKeys.length; i++) {
    const key = nextKeys[i] as string
    if (prevProps[key] !== nextProps[key]) {
      return true
    }
  }
}
