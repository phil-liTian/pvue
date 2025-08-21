import { isReservedProp, ShapeFlags } from '@pvue/shared'
import { createAppAPI } from './apiCreateApp'
import {
  type ComponentInternalInstance,
  createComponentInstance,
  setupComponent,
} from './component'
import {
  normalizeVNode,
  VNode,
  Text,
  Comment,
  Fragment,
  isSameVNodeType,
} from './vnode'
import { renderComponentRoot } from './componentRenderUtils'
import { ReactiveEffect } from '@pvue/reactivity'
import { queueJob, SchedulerJob } from './scheduler'

export interface RendererNode {
  [key: string | symbol]: any
}

export interface RendererElement extends RendererNode {}

export interface RenderOptions<HostNode, HostElement> {
  createElement: (type: string) => HostElement
  setElementText: (node: HostElement, text: string) => void
  setText: (node: HostElement, text: string) => void
  insert(el: HostNode, parent: HostElement, anchor?: HostNode | null): void
  patchProp(el: HostElement, key: string, prevValue: any, nextValue: any): void
  createText(text: string): HostNode
  createComment(text: string): HostNode
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
    setText: hostSetText,
    insert: hostInsert,
    patchProp: hostPatchProp,
    createText: hostCreateText,
    createComment: hostCreateComment,
  } = options

  // 处理component
  const setupRenderEffect = (
    instance: ComponentInternalInstance,
    container
  ) => {
    const componentUpdateFn = () => {
      if (!instance.isMounted) {
        const { m } = instance
        const subTree = (instance.subTree = renderComponentRoot(instance))

        if (m) {
          // @ts-ignore
          m.forEach(v => v())
        }
        // 不涉及到更新操作
        patch(null, subTree, container, instance)

        instance.isMounted = true
      } else {
        // 原来组件的tree
        const prevTree = instance.subTree
        // 更新后的组件的tree
        const nextTree = renderComponentRoot(instance)

        instance.subTree = nextTree
        patch(prevTree, nextTree, container, instance)
      }
    }

    const effect = new ReactiveEffect(componentUpdateFn)

    const update = effect.run.bind(effect)

    const job: SchedulerJob = effect.runIfDirty.bind(effect)
    job.id = instance.uuid
    job.i = instance

    // 调度器 响应式数据发生变化之后 effect 不应该立即执行, 应该在nextTick之后再执行
    effect.scheduler = () => queueJob(job)

    update()
  }

  const mountComponent = (initialVNode, container, parentComponent) => {
    const instance = createComponentInstance(initialVNode, parentComponent)

    setupComponent(instance)

    setupRenderEffect(instance, container)
  }

  const processComponent = (vnode, container, parentComponent) => {
    mountComponent(vnode, container, parentComponent)
  }

  // 处理element
  const mountElement = (vnode: VNode, container) => {
    const { shapeFlag, children, props } = vnode

    let el = (vnode.el = hostCreateElement(vnode.type))

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

  function processText(n1: VNode | null, n2: VNode, container) {
    if (n1 == null) {
      hostInsert((n2.el = hostCreateText(n2.children)), container)
    } else {
      const el = (n2.el = n1.el)
      if (n1.children !== n2.children) {
        hostSetText(el, n2.children)
      }
    }
  }

  function processCommentNode(n1, n2, container) {
    if (n1 == null) {
      hostInsert(hostCreateComment(n2.children || ''), container)
    }
  }

  function processFragment(n1: VNode | null, n2: VNode, container) {
    if (n1 == null) {
      mountChildren(n2.children, container)
    } else {
      // 处理children
      patchChildren(n1, n2, container)
    }
  }

  function patchChildren(n1: VNode, n2: VNode, container) {
    const c1 = n1 && n1.children
    const c2 = n2.children
    const { shapeFlag } = n2

    patchKeyedChildren(c1, c2, container)
  }

  function patchKeyedChildren(c1: VNode[], c2: VNode[], container) {
    let i = 0
    const l2 = c2.length
    const e1 = c1.length - 1
    const e2 = l2 - 1

    while (i <= e1 && i <= e2) {
      const n1 = c1[i]
      const n2 = c2[i]

      if (isSameVNodeType(n1, n2)) {
        patch(n1, n2, container, null)
      }

      i++
    }
  }

  const patch = (
    n1: VNode | null,
    n2: VNode,
    container,
    parentComponent: ComponentInternalInstance | null = null
  ) => {
    const { shapeFlag, type } = n2

    switch (type) {
      case Text:
        processText(n1, n2, container)
        break
      case Comment:
        processCommentNode(n1, n2, container)
        break
      case Fragment:
        processFragment(n1, n2, container)
        break
      default:
        if (shapeFlag & ShapeFlags.COMPONENT) {
          processComponent(n2, container, parentComponent)
        } else if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n2, container)
        }
    }
  }

  const render = (vnode, rootContainer) => {
    patch(null, vnode, rootContainer)
  }

  // let hydrate: null = null
  return {
    render,
    createApp: createAppAPI(render) as any,
  }
}
