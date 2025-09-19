import {
  createArrayExpression,
  createVNodeCall,
  DirectiveNode,
  ElementNode,
  ElementType,
  NodeTypes,
  VNodeCall,
} from '../ast'
import { NodeTransform, TransformContext } from '../transform'

function buildProps(node: ElementNode, context: TransformContext) {
  const { props } = node
  const runtimeDirectives: DirectiveNode[] = []
  for (let i = 0; i < props.length; i++) {
    const prop = props[i]
    runtimeDirectives.push(prop)
  }

  return {
    directives: runtimeDirectives,
  }
}

// 处理type为element 类型的type 比如 div、span这种, 如果element是slot则单独走transformSlotOutlet的逻辑
export const transformElement: NodeTransform = (node, context) => {
  return function postTransformElement() {
    node = context.currentNode

    if (
      !(node.type === NodeTypes.ELEMENT && node.tagType === ElementType.ELEMENT)
    )
      return
    const { tag, props } = node

    let vnodeTag = `"${tag}"`
    let vnodeProps: VNodeCall['props']
    let vnodeChildren: VNodeCall['children']
    let patchFlag: VNodeCall['patchFlag']
    let vnodeDynamicProps: VNodeCall['dynamicProps']
    let vnodeDirectives: VNodeCall['directives']

    // children
    if (node.children.length) {
      vnodeChildren = node.children
    }

    // props
    if (props.length) {
      // 处理props 指令、
      const propsBuildResult = buildProps(node, context)
      const directives = propsBuildResult.directives

      vnodeDirectives = (
        directives && directives.length
          ? createArrayExpression(directives.map(dir => dir))
          : undefined
      ) as VNodeCall['directives']
    }

    node.codegenNode = createVNodeCall(
      context,
      vnodeTag,
      vnodeProps,
      vnodeChildren,
      patchFlag,
      vnodeDynamicProps,
      vnodeDirectives
    )
  }
}
