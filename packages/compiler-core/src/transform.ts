import {
  camelize,
  capitalize,
  isArray,
  isString,
  NOOP,
  PatchFlags,
} from '@pvue/shared'
import {
  convertToBlock,
  createSimpleExpression,
  createVNodeCall,
  DirectiveNode,
  ElementNode,
  JSChildNode,
  NodeTypes,
  ParentNode,
  RootNode,
  SimpleExpressionNode,
  TemplateChildNode,
} from './ast'
import { TransformOptions } from './options'
import { defaultOnError } from './errors'
import { CREATE_COMMENT, FRAGMENT, TO_DISPLAY_STRING } from './runtimeHelpers'
import { getSingleElementRoot } from './transforms/cacheStatic'

export interface TransformContext extends Required<TransformOptions> {
  selfName: string | null

  root: RootNode
  parent: ParentNode | null
  currentNode: RootNode | TemplateChildNode | null
  nodeTransforms: NodeTransform[]
  childIndex: number

  hoists: (JSChildNode | null)[]
  helpers: Map<symbol, number>

  replaceNode(node: TemplateChildNode): void
  removeNode(node?: TemplateChildNode): void
  onNodeRemoved(): void
  hoist(exp: string | JSChildNode): SimpleExpressionNode
  helper<T extends symbol>(name: T): T
}

export type NodeTransform = (
  node: RootNode | TemplateChildNode,
  context: TransformContext
) => void | (() => void) | (() => void)[]

export function createTransformContext(
  root: RootNode,
  {
    nodeTransforms = [],
    filename = '',
    onError = defaultOnError,
    prefixIdentifiers = false,
  }: TransformOptions
): TransformContext {
  const nameMatch = filename.replace(/\?.*$/, '').match(/([^/\\]+)\.\w+$/)

  const context: TransformContext = {
    filename,
    selfName: nameMatch && capitalize(camelize(nameMatch[1])),
    nodeTransforms,
    currentNode: root,
    // state
    root,
    parent: null,
    childIndex: 0,
    hoists: [],
    helpers: new Map(),
    prefixIdentifiers,
    onError,

    onNodeRemoved: NOOP,

    helper(name) {
      const count = context.helpers.get(name) || 0
      context.helpers.set(name, count + 1)
      return name
    },

    hoist(exp) {
      if (isString(exp)) exp = createSimpleExpression(exp)
      context.hoists.push(exp)

      const identifier = createSimpleExpression(
        `_hoisted_${context.hoists.length}`,
        false,
        exp.loc
      )

      return identifier
    },

    replaceNode(node) {
      // context.parent!.children 相当于是要修改ast中的内容
      context.parent!.children[context.childIndex] = context.currentNode = node
    },

    removeNode(node) {
      const list = context.parent!.children
      const removalIndex = node
        ? list.indexOf(node)
        : context.currentNode
        ? context.childIndex
        : -1

      if (!node) {
        // 移除 需要将currentNode 置为null, 后续在遍历的时候, 发现currentNode为null,则子节点不再遍历
        context.currentNode = null
        // 移除的时候需要将当前遍历的children的下标减1, 因为数组长度发生变化了
        context.onNodeRemoved()
      } else {
        // 如果移除的是前面的元素, 则遍历的i需要减1, 移除后面的元素的话 就不需要了，改变了length
        if (context.childIndex > removalIndex) {
          context.onNodeRemoved()
        }
      }

      context.parent?.children.splice(removalIndex, 1)
    },
  }

  return context
}

/**
 * 遍历AST节点并应用转换
 * @param node 当前处理的节点
 * @param context 转换上下文
 */
function traverseNode(
  node: RootNode | TemplateChildNode,
  context: TransformContext
) {
  context.currentNode = node
  const { nodeTransforms } = context
  let exitFns: (() => void)[] = []
  for (let i = 0; i < nodeTransforms.length; i++) {
    const onExit = nodeTransforms[i](node, context)
    if (onExit) {
      if (isArray(onExit)) {
        exitFns.push(...onExit)
      } else {
        exitFns.push(onExit)
      }
    }

    // 执行removeNode会将currentNode清空，清空后的node不再继续遍历
    if (!context.currentNode) {
      return
    } else {
      node = context.currentNode!
    }
  }

  switch (node.type) {
    case NodeTypes.INTERPOLATION: {
      context.helper(TO_DISPLAY_STRING)
      break
    }

    case NodeTypes.COMMENT: {
      context.helper(CREATE_COMMENT)
      break
    }

    case NodeTypes.ELEMENT:
    case NodeTypes.ROOT: {
      traverseChildren(node, context)
      break
    }
  }

  let i = exitFns.length

  while (i--) {
    exitFns[i]()
  }
}

function traverseChildren(parent: ParentNode, context: TransformContext) {
  let i = 0
  /**
   * 当节点被移除时调用的回调函数
   * 减少计数器以保持正确的遍历索引
   */
  let nodeRemoved = () => {
    i--
  }

  for (; i < parent.children.length; i++) {
    const child = parent.children[i]
    // 记录每个children的parent容器, RootNode 的 parent默认是null
    context.parent = parent
    context.childIndex = i
    context.onNodeRemoved = nodeRemoved
    traverseNode(child, context)
  }
}

function createRootCodegen(root: RootNode, context: TransformContext) {
  const { children } = root
  const { helper } = context

  // 单根节点
  if (children.length === 1) {
    const singleElementRootChild = getSingleElementRoot(root)
    if (singleElementRootChild && singleElementRootChild.codegenNode) {
      // 这里的codegenNode实际都是在各个transform中生成的
      const codegenNode = singleElementRootChild.codegenNode

      // VNODE_CALL类型 转换成isBlock
      if (codegenNode.type === NodeTypes.VNODE_CALL) {
        convertToBlock(codegenNode, context)
      }

      root.codegenNode = codegenNode
    } else {
      root.codegenNode = children[0]
    }
  } else if (children.length > 1) {
    let patchFlag = PatchFlags.STABLE_FRAGMENT
    if (
      __DEV__ &&
      children.filter(v => v.type !== NodeTypes.COMMENT).length === 1
    ) {
      patchFlag |= PatchFlags.DEV_ROOT_FRAGMENT
    }

    //  多根节点
    root.codegenNode = createVNodeCall(
      context,
      helper(FRAGMENT),
      undefined,
      root.children,
      patchFlag,
      undefined,
      undefined,
      true
    )
  } else {
    root.codegenNode = children[0]
  }
}

export function transform(root: RootNode, options: TransformOptions) {
  const context = createTransformContext(root, options)
  traverseNode(root, context)
  // 给root挂上codegenNode, 用到codegen函数中生成render函数
  createRootCodegen(root, context)

  root.hoists = context.hoists
  root.helpers = new Set([...context.helpers.keys()])
}

export type StructuralDirectiveTransform = (
  node: ElementNode,
  dir: DirectiveNode,
  context: TransformContext
) => (() => void) | void

export function createStructuralDirectiveTransform(
  name: string | RegExp,
  fn: StructuralDirectiveTransform
): NodeTransform {
  const matches = isString(name) ? n => n === name : n => name.test(n)

  return (node, context) => {
    if (node.type === NodeTypes.ELEMENT) {
      const { props } = node
      const exitFns: any = []
      for (let i = 0; i < props.length; i++) {
        const prop = props[i]
        if (matches(prop.name)) {
          const onExit = fn(node, prop, context)
          onExit && exitFns.push(onExit)
        }
      }

      return exitFns
    }
  }
}
