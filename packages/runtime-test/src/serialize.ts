/*
 * @Author: phil
 * @Date: 2025-08-19 20:43:24
 */
import {
  TestComment,
  TestElement,
  TestNode,
  TestNodeTypes,
  TestText,
} from './nodeOps'

export function serialize(
  node: TestNode,
  indent: number = 0,
  depth: number = 0
) {
  if (node.type === TestNodeTypes.ELEMENT) {
    return serializeElement(node, indent, depth)
  } else {
    return serializeText(node, indent, depth)
  }
}

function serializeElement(node: TestElement, indent: number, depth: number) {
  const { tag } = node
  const props = Object.keys(node.props)
    .map(key => {
      const value = node.props[key]
      return value === null
        ? ''
        : value === ''
        ? key
        : `${key}=${JSON.stringify(value)}`
    })
    .filter(Boolean)
    .join(' ')

  const padding = indent ? ` `.repeat(indent).repeat(depth) : ``

  return (
    `${padding}<${tag}${props ? ` ${props}` : ''}>` +
    `${serializeInner(node, indent, depth)}` +
    `${padding}</${tag}>`
  )
}

function serializeInner(node: TestElement, indent, depth) {
  const newLine = indent ? `\n` : ``

  return node.children.length
    ? newLine +
        node.children.map(c => serialize(c, indent, depth + 1)).join(newLine) +
        newLine
    : ''
}

function serializeText(
  node: TestText | TestComment,
  indent: number,
  depth: number
) {
  const padding = indent ? ` `.repeat(indent).repeat(depth) : ``

  return (
    padding +
    (node.type === TestNodeTypes.COMMENT ? `<!--${node.text}-->` : node.text)
  )
}
