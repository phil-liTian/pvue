import { EMPTY_OBJ, isReservedProp, ShapeFlags } from '@pvue/shared'
import { createAppAPI } from './apiCreateApp'
import {
  type ComponentInternalInstance,
  createComponentInstance,
  Data,
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
import {
  renderComponentRoot,
  shouldUpdateComponent,
} from './componentRenderUtils'
import { ReactiveEffect } from '@pvue/reactivity'
import {
  queueJob,
  queuePostFlushCb,
  SchedulerJob,
  SchedulerJobs,
} from './scheduler'
import { updateProps } from './componentProps'

export interface RendererNode {
  [key: string | symbol]: any
}

export interface RendererElement extends RendererNode {}

export interface RenderOptions<HostNode, HostElement> {
  createElement: (type: string) => HostElement
  setElementText: (node: HostElement, text: string) => void
  setText: (node: HostElement, text: string) => void
  insert(el: HostNode, parent: HostElement, anchor?: HostNode | null): void
  patchProp(
    el: HostElement,
    key: string,
    prevValue: any,
    nextValue: any,
    parentComponent?: ComponentInternalInstance | null
  ): void
  createText(text: string): HostNode
  createComment(text: string): HostNode
  remove(el: HostNode): void
}

export const queuePostRenderEffect: (fn: SchedulerJobs) => void =
  queuePostFlushCb

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
    remove: hostRemove,
  } = options

  function updateComponentPreRender(
    instance: ComponentInternalInstance,
    nextVNode: VNode
  ) {
    const prevProps = instance.vnode.props

    updateProps(instance, nextVNode.props, prevProps)
  }

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
          queuePostRenderEffect(m)
        }
        // 不涉及到更新操作
        patch(null, subTree, container, instance)

        instance.isMounted = true
      } else {
        const { u, next } = instance

        if (next) {
          updateComponentPreRender(instance, next)
        }

        // 原来组件的tree
        const prevTree = instance.subTree
        // 更新后的组件的tree
        const nextTree = renderComponentRoot(instance)

        instance.subTree = nextTree

        patch(prevTree, nextTree, container, instance)

        if (u) {
          queuePostRenderEffect(u)
        }
      }
    }

    const effect = new ReactiveEffect(componentUpdateFn)

    const update = (instance.update = effect.run.bind(effect))

    const job: SchedulerJob = effect.runIfDirty.bind(effect)
    job.id = instance.uuid
    job.i = instance

    // 调度器 响应式数据发生变化之后 effect 不应该立即执行, 应该在nextTick之后再执行
    effect.scheduler = () => queueJob(job)

    update()
  }

  function patchProps(
    el: RendererElement,
    oldProps: Data,
    newProps: Data,
    parentComponent
  ) {
    // 更新props
    if (oldProps !== newProps) {
      // if (oldProps !== EMPTY_OBJ) {
      //   for (const key in oldProps) {
      //     if (!(key in newProps)) {
      //       // hostPatchProp()
      //     }
      //   }
      // }

      // 新的prop跟老的prop不同则更新

      for (const key in newProps) {
        if (isReservedProp(key)) continue
        const next = newProps[key]
        const prev = oldProps[key]
        if (next !== prev && key !== 'value') {
          hostPatchProp(el, key, prev, next, parentComponent)
        }
      }
    }
  }

  const mountComponent = (initialVNode, container, parentComponent) => {
    const instance = (initialVNode.component = createComponentInstance(
      initialVNode,
      parentComponent
    ))

    setupComponent(instance)

    setupRenderEffect(instance, container)
  }

  function updateComponent(n1: VNode, n2: VNode) {
    const instance = (n2.component = n1.component)!

    if (shouldUpdateComponent(n1, n2)) {
      instance.next = n2
      instance.update()
    }
  }

  const processComponent = (
    n1: VNode | null,
    n2: VNode,
    container,
    parentComponent
  ) => {
    if (n1 == null) {
      mountComponent(n2, container, parentComponent)
    } else {
      // 更新
      updateComponent(n1, n2)
    }
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

  const processElement = (
    n1: VNode | null,
    n2: VNode,
    container,
    parentContainer
  ) => {
    if (n1 == null) {
      mountElement(n2, container)
    } else {
      // 更新element
      patchElement(n1, n2, container, parentContainer)
    }
  }

  function patchElement(n1, n2, parentComponent, container) {
    const el = (n2.el = n1.el)
    const oldProps = n1.props || EMPTY_OBJ
    const newProps = n2.props || EMPTY_OBJ
    patchChildren(n1, n2, container)

    patchProps(el, oldProps, newProps, parentComponent)
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
    // 如果n1 和 n2 类型不同 则直接移除原来的dom结构
    if (n1 && !isSameVNodeType(n1, n2)) {
      unmount(n1, parentComponent)
      n1 = null
    }

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
          processComponent(n1, n2, container, parentComponent)
        } else if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, parentComponent)
        }
    }
  }

  const unmount = (vnode, parentComponent) => {
    remove(vnode)
  }

  function remove(vnode) {
    const { el } = vnode

    if (vnode.shapeFlag & ShapeFlags.ELEMENT) {
    }

    const performRemove = () => {
      hostRemove(el)
    }

    performRemove()
  }

  const render = (vnode, container) => {
    patch(container._vnode || null, vnode, container)

    // 多次执行render函数 如果vnode不同 则 需要移除之前的vnode
    container._vnode = vnode
  }

  // let hydrate: null = null
  return {
    render,
    createApp: createAppAPI(render) as any,
  }
}
