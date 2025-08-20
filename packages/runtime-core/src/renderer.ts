import { isReservedProp, ShapeFlags } from '@pvue/shared'
import { createAppAPI } from './apiCreateApp'
import {
  type ComponentInternalInstance,
  createComponentInstance,
  setupComponent,
} from './component'
import { normalizeVNode, VNode, Text } from './vnode'
import { renderComponentRoot } from './componentRenderUtils'
import { ReactiveEffect } from '@pvue/reactivity'

export interface RendererNode {
  [key: string | symbol]: any
}

export interface RendererElement extends RendererNode {}

export interface RenderOptions<HostNode, HostElement> {
  createElement: (type: string) => HostElement
  setElementText: (node: HostElement, text: string) => void
  insert(el: HostNode, parent: HostElement, anchor?: HostNode | null): void
  patchProp(el: HostElement, key: string, prevValue: any, nextValue: any): void
  createText(text: string): HostNode
}

export function createRenderer<HostNode, HostElement>(
  options: RenderOptions<HostNode, HostElement>
) {
  return baseCreateRenderer(options)
}

function baseCreateRenderer(options) {
  const {
    createElement: hostCreateElement,
    setElementText: hostSetElementText,
    insert: hostInsert,
    patchProp: hostPatchProp,
    createText: hostCreateText,
  } = options

  // 处理component
  const setupRenderEffect = (
    instance: ComponentInternalInstance,
    container
  ) => {
    const componentUpdateFn = () => {
      const { m } = instance
      const subTree = (instance.subTree = renderComponentRoot(instance))

      if (m) {
        m.forEach(v => v())
      }

      patch(instance.vnode, subTree, container)
    }

    const effect = new ReactiveEffect(componentUpdateFn)

    effect.run()
  }

  const mountComponent = (initialVNode, container) => {
    const instance = createComponentInstance(initialVNode, null)

    setupComponent(instance)

    setupRenderEffect(instance, container)
  }

  const processComponent = (vnode, container) => {
    mountComponent(vnode, container)
  }

  // 处理element
  const mountElement = (vnode: VNode, container) => {
    const { shapeFlag, children, props } = vnode

    let el = hostCreateElement(vnode.type)

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, children)
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // 处理array类型的children
      mountChildren(children, el)
    }

    if (props) {
      for (const key in props) {
        if (key !== 'value' && !isReservedProp(key)) {
          hostPatchProp(el, key, null, props[key])
        }
      }
    }

    hostInsert(el, container)
  }

  function mountChildren(children, container) {
    for (let i = 0; i < children.length; i++) {
      const child = normalizeVNode(children[i])

      patch(null, child, container)
    }
  }

  const processElement = (vnode, container) => {
    mountElement(vnode, container)
  }

  function processText(n1: VNode, n2: VNode, container) {
    if (n1 == null) {
      hostInsert(hostCreateText(n2.children), container)
    }
  }

  const patch = (n1, n2: VNode, container) => {
    const { shapeFlag, type } = n2

    switch (type) {
      case Text:
        processText(n1, n2, container)
        break
      default:
        if (shapeFlag & ShapeFlags.COMPONENT) {
          processComponent(n2, container)
        } else if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n2, container)
        }
    }
  }

  const render = (vnode, rootContainer) => {
    patch(null, vnode, rootContainer)
  }

  return {
    render,
    createApp: createAppAPI(render),
  }
}
