import { ShapeFlags } from '@pvue/shared'
import { createAppAPI } from './apiCreateApp'
import {
  type ComponentInternalInstance,
  createComponentInstance,
  setupComponent,
} from './component'
import { VNode } from './vnode'
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
    const { shapeFlag, children } = vnode
    let el = hostCreateElement(vnode.type)

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, children)
    }

    hostInsert(el, container)
  }

  const processElement = (vnode, container) => {
    mountElement(vnode, container)
  }

  const patch = (n1, n2: VNode, container) => {
    const { shapeFlag } = n2

    if (shapeFlag & ShapeFlags.COMPONENT) {
      processComponent(n2, container)
    } else if (shapeFlag & ShapeFlags.ELEMENT) {
      processElement(n2, container)
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
