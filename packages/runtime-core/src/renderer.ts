import {
  EMPTY_ARR,
  EMPTY_OBJ,
  isReservedProp,
  PatchFlags,
  ShapeFlags,
} from '@pvue/shared'
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
import { updateSlots } from './componentSlots'

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
    // nextVNode.component = instance

    // instance 是原来的组件对象 nextVNode 是现在更新的目标对象
    const prevProps = instance.vnode.props

    // STAR: 更新的时候一定要将组件实例的vnode更新成最新的vnode, 否则每次更新都要首次创建的组件实例做比较, 会出现该删除的属性 没有正常删除的bug
    instance.vnode = nextVNode

    // 更新props
    updateProps(instance, nextVNode.props, prevProps)

    // 更新slots
    updateSlots(instance, nextVNode.children)
  }

  // 处理component
  const setupRenderEffect = (
    instance: ComponentInternalInstance,
    initialVNode,
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
        // 标识已经挂载了
        instance.isMounted = true

        // 组件类型的el 是 subTree 渲染出来的el
        initialVNode.el = subTree.el
      } else {
        let { u, next, vnode } = instance

        if (next) {
          updateComponentPreRender(instance, next)
        } else {
          next = vnode
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

        next.el = nextTree.el
      }
    }

    const effect = new ReactiveEffect(componentUpdateFn)

    const update = (instance.update = effect.run.bind(effect))

    const job: SchedulerJob = (instance.job = effect.runIfDirty.bind(effect))
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

    setupRenderEffect(instance, initialVNode, container)
  }

  function updateComponent(n1: VNode, n2: VNode) {
    const instance = (n2.component = n1.component)!

    if (shouldUpdateComponent(n1, n2)) {
      instance.next = n2
      instance.update()
    } else {
      console.log('asda')
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
  const mountElement = (vnode: VNode, container, parentComponent, anchor) => {
    const { shapeFlag, children, props } = vnode

    let el = (vnode.el = hostCreateElement(vnode.type))

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, children)
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // 处理array类型的children
      mountChildren(children, el, parentComponent)
    }
    if (props) {
      for (const key in props) {
        if (key !== 'value' && !isReservedProp(key)) {
          hostPatchProp(el, key, null, props[key])
        }
      }
    }

    hostInsert(el, container, anchor)
  }

  function mountChildren(
    children,
    container,
    parentComponent,
    anchor = null,
    start = 0
  ) {
    for (let i = start; i < children.length; i++) {
      const child = normalizeVNode(children[i])

      patch(null, child, container, parentComponent, anchor)
    }
  }

  const processElement = (
    n1: VNode | null,
    n2: VNode,
    container,
    parentComponent,
    anchor
  ) => {
    if (n1 == null) {
      mountElement(n2, container, parentComponent, anchor)
    } else {
      // 更新element
      patchElement(n1, n2, parentComponent, container)
    }
  }

  function patchElement(n1, n2, parentComponent, container) {
    const el = (n2.el = n1.el)
    const oldProps = n1.props || EMPTY_OBJ
    const newProps = n2.props || EMPTY_OBJ
    // STAR: 注意这里的容器是el
    patchChildren(n1, n2, el, parentComponent)

    patchProps(el, oldProps, newProps, parentComponent)
  }

  function processText(n1: VNode | null, n2: VNode, container, anchor = null) {
    if (n1 == null) {
      hostInsert((n2.el = hostCreateText(n2.children)), container, anchor)
    } else {
      const el = (n2.el = n1.el)
      if (n1.children !== n2.children) {
        hostSetText(el, n2.children)
      }
    }
  }

  function processCommentNode(n1, n2, container, anchor) {
    if (n1 == null) {
      hostInsert(hostCreateComment(n2.children || ''), container, anchor)
    }
  }

  function processFragment(
    n1: VNode | null,
    n2: VNode,
    container,
    parentComponent,
    anchor
  ) {
    const { patchFlag, dynamicChildren } = n2
    const fragmentStartAnchor = (n2.el = n1 ? n1.el : hostCreateText(''))
    const fragmentEndAnchor = hostCreateText('')
    if (n1 == null) {
      hostInsert(fragmentStartAnchor, container, anchor)
      hostInsert(fragmentEndAnchor, container, anchor)

      mountChildren(
        n2.children || [], // empty fragment
        container,
        parentComponent,
        fragmentEndAnchor
      )
    } else {
      if (patchFlag & PatchFlags.STABLE_FRAGMENT) {
        patchBlockChildren(
          n1.dynamicChildren,
          dynamicChildren,
          container,
          parentComponent
        )
      } else {
        // 处理children
        patchChildren(n1, n2, container, parentComponent)
      }
    }
  }

  function patchBlockChildren(
    oldChildren,
    newChildren,
    container,
    parentComponent
  ) {
    console.log('oldChildren, newChildren', oldChildren.length)
    for (let i = 0; i < newChildren.length; i++) {
      const newVNode = newChildren[i]
      const oldVNode = oldChildren[i]
      // console.log('oldVNode', oldVNode, newVNode)
    }
  }

  function patchChildren(
    n1: VNode,
    n2: VNode,
    container,
    parentComponent,
    anchor = null
  ) {
    const c1 = n1 && n1.children
    const c2 = n2.children

    const { shapeFlag: prevShapeFlag } = n1
    const { shapeFlag, patchFlag } = n2

    if (patchFlag & PatchFlags.KEYED_FRAGMENT) {
      patchKeyedChildren(c1, c2, container)
      return
    } else if (patchFlag & PatchFlags.UNKEYED_FRAGMENT) {
      // UNKEYED_FRAGMENT
      patchUnkeyedChildren(c1, c2, container, parentComponent, anchor)
      return
    }

    // text-children => text-children
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        // 都是text
        if (c1 !== c2) {
          hostSetElementText(container, c2)
        }
      }
    }

    // text-chidlren => array-children
    // array-children => text-children
    // array-children => array-children

    if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 两个array类型的children进行比较 双端diff算法
        patchKeyedChildren(c1, c2, container)
      }
    }
  }

  function patchUnkeyedChildren(c1, c2, container, parentComponent, anchor) {
    c1 = c1 || EMPTY_ARR
    c2 = c2 || EMPTY_ARR
    const oldLength = c1.length
    const newLength = c2.length
    const commonLength = Math.min(oldLength, newLength)

    let i
    for (i = 0; i < commonLength; i++) {
      const nextChild = c2[i]
      patch(c1[i], nextChild, container)
    }

    if (oldLength > newLength) {
      unmountChildren(c1, parentComponent, commonLength)
    } else {
      mountChildren(c2, container, parentComponent, anchor, commonLength)
    }
  }

  /**
   * 对比新旧虚拟DOM节点数组，进行高效的差异更新
   * @param c1 旧虚拟DOM节点数组
   * @param c2 新虚拟DOM节点数组
   * @param container 容器元素
   */
  function patchKeyedChildren(
    c1: VNode[],
    c2: VNode[],
    container,
    parentAnchor = null
  ) {
    let i = 0
    const l2 = c2.length
    let e1 = c1.length - 1
    let e2 = l2 - 1

    // 1. sync from start
    // (a b) c
    // (a b) d e
    while (i <= e1 && i <= e2) {
      const n1 = c1[i]
      const n2 = c2[i]

      if (isSameVNodeType(n1, n2)) {
        patch(n1, n2, container, null)
      } else {
        break
      }

      i++
    }

    // 2. sync from end
    // a (b c)
    // d e (b c)
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1]
      const n2 = c2[e2]
      if (isSameVNodeType(n1, n2)) {
        patch(n1, n2, container, null)
      } else {
        break
      }
      e1--
      e2--
    }

    // 3. common sequence + mount
    // (a b)
    // (a b) c
    // i = 2, e1 = 1, e2 = 2
    // (a b)
    // c (a b)
    // i = 0, e1 = -1, e2 = 0
    if (i > e1) {
      if (i <= e2) {
        // 新的比老的多 需要新增
        const nextPos = e2 + 1
        const anchor = nextPos >= l2 ? parentAnchor : (c2[nextPos] as VNode).el

        while (i <= e2) {
          patch(null, c2[i], container, null, anchor)
          i++
        }
      }
    } else if (i > e2) {
      // 4. common sequence + unmount
      // (a b) c
      // (a b)
      // i = 2, e1 = 2, e2 = 1
      // a (b c)
      // (b c)
      // i = 0, e1 = 0, e2 = -1
      // 老的比新的多 删除老children中的vnode
      // while(i<=e1) {
      // }
    } else {
      // 5. unknown sequence
      // [i ... e1 + 1]: a b [c d e] f g
      // [i ... e2 + 1]: a b [e d c h] f g
      // i = 2, e1 = 4, e2 = 5
      let s1 = i // 原来数组的开始位置
      let s2 = i // 新数组的的开始位置
      // 记录在新数组中key对index的映射关系
      const keyToNewIndexMap: Map<PropertyKey, number> = new Map()

      for (let i = s2; i <= e2; i++) {
        const nextChild = c2[i]

        if (nextChild.key) {
          keyToNewIndexMap.set(nextChild.key, i)
        }
      }

      const toBePatched = e2 - s2 + 1
      // 记录新数组在老数组中的位置
      const newIndexToOldIndexMap = new Array(toBePatched).fill(0)

      for (let i = s1; i <= e1; i++) {
        const prevChild = c1[i]

        let newIndex
        if (prevChild.key !== null) {
          newIndex = keyToNewIndexMap.get(prevChild.key)
        }

        newIndexToOldIndexMap[newIndex - s2] = i + 1

        // 新老节点存在相同的key
        if (newIndex !== undefined) {
          patch(prevChild, c2[newIndex], container, null)
        }
      }

      // 获取最长递增子序列
      const increasingNewIndexSequence = getSequence(newIndexToOldIndexMap)

      let j = increasingNewIndexSequence.length - 1
      for (let i = toBePatched - 1; i >= 0; i--) {
        const nextIndex = s2 + i
        const nextChild = c2[nextIndex]
        const anchorVNode = c2[nextIndex + 1]

        const anchor = nextIndex + 1 < l2 ? anchorVNode.el : parentAnchor

        if (j < 0 || i !== increasingNewIndexSequence[j]) {
          // TODO move
          move(nextChild, container, anchor)
        } else {
          j--
        }
      }
    }
  }

  // 移动元素
  const move = (vnode, container, anchor) => {
    const { el, type, children } = vnode
    console.log('el', el)

    if (type === Fragment) {
      hostInsert(el, container, anchor)
      for (let i = 0; i < children.length; i++) {
        move(children[i], container, anchor)
      }
      return
    }

    hostInsert(el, container, anchor)
  }

  const patch = (
    n1: VNode | null,
    n2: VNode,
    container,
    parentComponent: ComponentInternalInstance | null = null,
    anchor: any = null
  ) => {
    // 如果n1 和 n2 类型不同 则直接移除原来的dom结构
    if (n1 && !isSameVNodeType(n1, n2)) {
      unmount(n1, parentComponent)
      n1 = null
    }

    const { shapeFlag, type } = n2

    switch (type) {
      case Text:
        processText(n1, n2, container, anchor)
        break
      case Comment:
        processCommentNode(n1, n2, container, anchor)
        break
      case Fragment:
        processFragment(n1, n2, container, parentComponent, anchor)
        break
      default:
        if (shapeFlag & ShapeFlags.COMPONENT) {
          processComponent(n1, n2, container, parentComponent)
        } else if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, parentComponent, anchor)
        }
    }
  }

  function unmountComponent(instance: ComponentInternalInstance) {
    const { job, subTree } = instance

    if (job) {
      unmount(subTree, instance)
    }
  }

  function unmountChildren(
    children: VNode[],
    parentComponent: ComponentInternalInstance,
    start = 0
  ) {
    for (let i = start; i < children.length; i++) {
      unmount(children[i], parentComponent)
    }
  }

  const unmount = (vnode, parentComponent) => {
    const { shapeFlag, type, children } = vnode

    if (shapeFlag & ShapeFlags.COMPONENT) {
      unmountComponent(vnode.component)
    } else {
      if (type === Fragment) {
        unmountChildren(children, parentComponent)
      } else {
        remove(vnode)
      }
    }
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
    if (vnode == null) {
      unmount(container._vnode, null)
    } else {
      patch(container._vnode || null, vnode, container)
    }

    // 多次执行render函数 如果vnode不同 则 需要移除之前的vnode
    container._vnode = vnode
  }

  // let hydrate: null = null
  return {
    render,
    createApp: createAppAPI(render) as any,
  }
}

function getSequence(arr: number[]): number[] {
  const p = arr.slice()
  const result = [0]
  let i, j, u, v, c
  const len = arr.length
  for (i = 0; i < len; i++) {
    const arrI = arr[i]
    if (arrI !== 0) {
      j = result[result.length - 1]
      if (arr[j] < arrI) {
        p[i] = j
        result.push(i)
        continue
      }
      u = 0
      v = result.length - 1
      while (u < v) {
        c = (u + v) >> 1
        if (arr[result[c]] < arrI) {
          u = c + 1
        } else {
          v = c
        }
      }
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1]
        }
        result[u] = i
      }
    }
  }
  u = result.length
  v = result[u - 1]
  while (u-- > 0) {
    result[u] = v
    v = p[v]
  }
  return result
}
