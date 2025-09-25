/*
 * @Author: phil
 * @Date: 2025-09-22 21:02:10
 */
import {
  SimpleExpressionNode,
  ForNode,
  ForCodegenNode,
  NodeTypes,
  ElementNode,
  InterpolationNode,
} from '../../src/ast'
import type { CompilerOptions, RootNode } from '../../src/index'
import { baseParse as parse, transform, ErrorCodes } from '../../src/index'
import { transformIf } from '../../src/transforms/vIf'
import { transformFor } from '../../src/transforms/vFor'
import { transformElement } from '../../src/transforms/transformElement'
import { transformSlotOutlet } from '../../src/transforms/transformSlotOutlet'
import { transformExpression } from '../../src/transforms/transformExpression'

export function parseWithForTransform(
  template: string,
  options: CompilerOptions = {}
): {
  root: RootNode
  node: ForNode & { codegenNode: ForCodegenNode }
} {
  const ast = parse(template, options)
  transform(ast, {
    nodeTransforms: [
      transformIf,
      transformFor,
      ...(options.prefixIdentifiers ? [transformExpression] : []),
      transformSlotOutlet,
      transformElement,
    ],
    // directiveTransforms: {
    //   bind: transformBind,
    // },
    ...options,
  })
  return {
    root: ast,
    node: ast.children[0] as ForNode & { codegenNode: ForCodegenNode },
  }
}

describe('compiler: v-for', () => {
  describe('transform', () => {
    test('number expression', () => {
      const { node: forNode } = parseWithForTransform(
        '<span v-for="index in 5" />'
      )
      expect(forNode.keyAlias).toBeUndefined()
      expect(forNode.objectIndexAlias).toBeUndefined()
      expect((forNode.valueAlias as SimpleExpressionNode).content).toBe('index')
      expect((forNode.source as SimpleExpressionNode).content).toBe('5')
    })

    test('value', () => {
      const { node: forNode } = parseWithForTransform(
        '<span v-for="(item) in items" />'
      )
      expect(forNode.keyAlias).toBeUndefined()
      expect(forNode.objectIndexAlias).toBeUndefined()
      expect((forNode.valueAlias as SimpleExpressionNode).content).toBe('item')
      expect((forNode.source as SimpleExpressionNode).content).toBe('items')
    })

    test('object de-structured value', () => {
      const { node: forNode } = parseWithForTransform(
        '<span v-for="({ id, value }) in items" />'
      )
      expect(forNode.keyAlias).toBeUndefined()
      expect(forNode.objectIndexAlias).toBeUndefined()
      expect((forNode.valueAlias as SimpleExpressionNode).content).toBe(
        '{ id, value }'
      )
      expect((forNode.source as SimpleExpressionNode).content).toBe('items')
    })

    test('array de-structured value', () => {
      const { node: forNode } = parseWithForTransform(
        '<span v-for="([ id, value ]) in items" />'
      )
      expect(forNode.keyAlias).toBeUndefined()
      expect(forNode.objectIndexAlias).toBeUndefined()
      expect((forNode.valueAlias as SimpleExpressionNode).content).toBe(
        '[ id, value ]'
      )
      expect((forNode.source as SimpleExpressionNode).content).toBe('items')
    })

    test('value and key', () => {
      const { node: forNode } = parseWithForTransform(
        '<span v-for="(item, key) in items" />'
      )
      expect(forNode.keyAlias).not.toBeUndefined()
      expect((forNode.keyAlias as SimpleExpressionNode).content).toBe('key')
      expect(forNode.objectIndexAlias).toBeUndefined()
      expect((forNode.valueAlias as SimpleExpressionNode).content).toBe('item')
      expect((forNode.source as SimpleExpressionNode).content).toBe('items')
    })

    test('value, key and index', () => {
      const { node: forNode } = parseWithForTransform(
        '<span v-for="(value, key, index) in items" />'
      )
      expect(forNode.keyAlias).not.toBeUndefined()
      expect((forNode.keyAlias as SimpleExpressionNode).content).toBe('key')
      expect(forNode.objectIndexAlias).not.toBeUndefined()
      expect((forNode.objectIndexAlias as SimpleExpressionNode).content).toBe(
        'index'
      )
      expect((forNode.valueAlias as SimpleExpressionNode).content).toBe('value')
      expect((forNode.source as SimpleExpressionNode).content).toBe('items')
    })

    test('skipped key', () => {
      const { node: forNode } = parseWithForTransform(
        '<span v-for="(value,,index) in items" />'
      )
      expect(forNode.keyAlias).toBeUndefined()
      expect(forNode.objectIndexAlias).not.toBeUndefined()
      expect((forNode.objectIndexAlias as SimpleExpressionNode).content).toBe(
        'index'
      )
      expect((forNode.valueAlias as SimpleExpressionNode).content).toBe('value')
      expect((forNode.source as SimpleExpressionNode).content).toBe('items')
    })

    test('skipped value and key', () => {
      const { node: forNode } = parseWithForTransform(
        '<span v-for="(,,index) in items" />'
      )
      expect(forNode.keyAlias).toBeUndefined()
      expect(forNode.objectIndexAlias).not.toBeUndefined()
      expect((forNode.objectIndexAlias as SimpleExpressionNode).content).toBe(
        'index'
      )
      expect(forNode.valueAlias).toBeUndefined()
      expect((forNode.source as SimpleExpressionNode).content).toBe('items')
    })

    test('unbracketed value', () => {
      const { node: forNode } = parseWithForTransform(
        '<span v-for="item in items" />'
      )
      expect(forNode.keyAlias).toBeUndefined()
      expect(forNode.objectIndexAlias).toBeUndefined()
      expect((forNode.valueAlias as SimpleExpressionNode).content).toBe('item')
      expect((forNode.source as SimpleExpressionNode).content).toBe('items')
    })

    test('unbracketed value and key', () => {
      const { node: forNode } = parseWithForTransform(
        '<span v-for="item, key in items" />'
      )
      expect(forNode.keyAlias).not.toBeUndefined()
      expect((forNode.keyAlias as SimpleExpressionNode).content).toBe('key')
      expect(forNode.objectIndexAlias).toBeUndefined()
      expect((forNode.valueAlias as SimpleExpressionNode).content).toBe('item')
      expect((forNode.source as SimpleExpressionNode).content).toBe('items')
    })

    test('unbracketed value, key and index', () => {
      const { node: forNode } = parseWithForTransform(
        '<span v-for="value, key, index in items" />'
      )
      expect(forNode.keyAlias).not.toBeUndefined()
      expect((forNode.keyAlias as SimpleExpressionNode).content).toBe('key')
      expect(forNode.objectIndexAlias).not.toBeUndefined()
      expect((forNode.objectIndexAlias as SimpleExpressionNode).content).toBe(
        'index'
      )
      expect((forNode.valueAlias as SimpleExpressionNode).content).toBe('value')
      expect((forNode.source as SimpleExpressionNode).content).toBe('items')
    })

    test('unbracketed skipped key', () => {
      const { node: forNode } = parseWithForTransform(
        '<span v-for="value, , index in items" />'
      )
      expect(forNode.keyAlias).toBeUndefined()
      expect(forNode.objectIndexAlias).not.toBeUndefined()
      expect((forNode.objectIndexAlias as SimpleExpressionNode).content).toBe(
        'index'
      )
      expect((forNode.valueAlias as SimpleExpressionNode).content).toBe('value')
      expect((forNode.source as SimpleExpressionNode).content).toBe('items')
    })

    test('unbracketed skipped value and key', () => {
      const { node: forNode } = parseWithForTransform(
        '<span v-for=", , index in items" />'
      )
      expect(forNode.keyAlias).toBeUndefined()
      expect(forNode.objectIndexAlias).not.toBeUndefined()
      expect((forNode.objectIndexAlias as SimpleExpressionNode).content).toBe(
        'index'
      )
      expect(forNode.valueAlias).toBeUndefined()
      expect((forNode.source as SimpleExpressionNode).content).toBe('items')
    })

    test('source containing string expression with spaces', () => {
      const { node: forNode } = parseWithForTransform(
        `<span v-for="item in state ['my items']" />`
      )
      expect(forNode.keyAlias).toBeUndefined()
      expect(forNode.objectIndexAlias).toBeUndefined()
      expect((forNode.valueAlias as SimpleExpressionNode).content).toBe('item')
      expect((forNode.source as SimpleExpressionNode).content).toBe(
        "state ['my items']"
      )
    })
  })

  describe('errors', () => {
    test('missing expression', () => {
      const onError = vi.fn()
      parseWithForTransform('<span v-for />', { onError })

      expect(onError).toHaveBeenCalledTimes(1)
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: ErrorCodes.X_V_FOR_NO_EXPRESSION,
        })
      )
    })

    test('empty expression', () => {
      const onError = vi.fn()
      parseWithForTransform('<span v-for="" />', { onError })

      expect(onError).toHaveBeenCalledTimes(1)
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: ErrorCodes.X_V_FOR_MALFORMED_EXPRESSION,
        })
      )
    })

    test('invalid expression', () => {
      const onError = vi.fn()
      parseWithForTransform('<span v-for="items" />', { onError })

      expect(onError).toHaveBeenCalledTimes(1)
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: ErrorCodes.X_V_FOR_MALFORMED_EXPRESSION,
        })
      )
    })

    test('missing source', () => {
      const onError = vi.fn()
      parseWithForTransform('<span v-for="item in" />', { onError })

      expect(onError).toHaveBeenCalledTimes(1)
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: ErrorCodes.X_V_FOR_MALFORMED_EXPRESSION,
        })
      )
    })

    test('missing source and have multiple spaces with', () => {
      const onError = vi.fn()
      parseWithForTransform('<span v-for="item in  " />', { onError })

      expect(onError).toHaveBeenCalledTimes(1)
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: ErrorCodes.X_V_FOR_MALFORMED_EXPRESSION,
        })
      )
    })

    test('missing value', () => {
      const onError = vi.fn()
      parseWithForTransform('<span v-for="in items" />', { onError })

      expect(onError).toHaveBeenCalledTimes(1)
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: ErrorCodes.X_V_FOR_MALFORMED_EXPRESSION,
        })
      )
    })

    test.skip('<template v-for> key placement', () => {
      const onError = vi.fn()
      parseWithForTransform(
        `
      <template v-for="item in items">
        <div :key="item.id"/>
      </template>`,
        { onError }
      )

      expect(onError).toHaveBeenCalledTimes(1)
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: ErrorCodes.X_V_FOR_TEMPLATE_KEY_PLACEMENT,
        })
      )

      // should not warn on nested v-for keys
      parseWithForTransform(
        `
      <template v-for="item in items">
        <div v-for="c in item.children" :key="c.id"/>
      </template>`,
        { onError }
      )
      expect(onError).toHaveBeenCalledTimes(1)
    })
  })

  describe('source location', () => {
    test('value & source', () => {
      const source = '<span v-for="item in items" />'
      const { node: forNode } = parseWithForTransform(source)

      const itemOffset = source.indexOf('item')
      const value = forNode.valueAlias as SimpleExpressionNode
      expect((forNode.valueAlias as SimpleExpressionNode).content).toBe('item')
      expect(value.loc.start.offset).toBe(itemOffset)
      expect(value.loc.start.line).toBe(1)
      expect(value.loc.start.column).toBe(itemOffset + 1)
      expect(value.loc.end.line).toBe(1)
      expect(value.loc.end.column).toBe(itemOffset + 1 + `item`.length)

      const itemsOffset = source.indexOf('items')
      expect((forNode.source as SimpleExpressionNode).content).toBe('items')
      expect(forNode.source.loc.start.offset).toBe(itemsOffset)
      expect(forNode.source.loc.start.line).toBe(1)
      expect(forNode.source.loc.start.column).toBe(itemsOffset + 1)
      expect(forNode.source.loc.end.line).toBe(1)
      expect(forNode.source.loc.end.column).toBe(
        itemsOffset + 1 + `items`.length
      )
    })

    test('bracketed value', () => {
      const source = '<span v-for="( item ) in items" />'
      const { node: forNode } = parseWithForTransform(source)

      const itemOffset = source.indexOf('item')
      const value = forNode.valueAlias as SimpleExpressionNode
      expect(value.content).toBe('item')
      expect(value.loc.start.offset).toBe(itemOffset)
      expect(value.loc.start.line).toBe(1)
      expect(value.loc.start.column).toBe(itemOffset + 1)
      expect(value.loc.end.line).toBe(1)
      expect(value.loc.end.column).toBe(itemOffset + 1 + `item`.length)

      const itemsOffset = source.indexOf('items')
      expect((forNode.source as SimpleExpressionNode).content).toBe('items')
      expect(forNode.source.loc.start.offset).toBe(itemsOffset)
      expect(forNode.source.loc.start.line).toBe(1)
      expect(forNode.source.loc.start.column).toBe(itemsOffset + 1)
      expect(forNode.source.loc.end.line).toBe(1)
      expect(forNode.source.loc.end.column).toBe(
        itemsOffset + 1 + `items`.length
      )
    })

    test('de-structured value', () => {
      const source = '<span v-for="(  { id, key }) in items" />'
      const { node: forNode } = parseWithForTransform(source)

      const value = forNode.valueAlias as SimpleExpressionNode
      const valueIndex = source.indexOf('{ id, key }')
      expect(value.content).toBe('{ id, key }')
      expect(value.loc.start.offset).toBe(valueIndex)
      expect(value.loc.start.line).toBe(1)
      expect(value.loc.start.column).toBe(valueIndex + 1)
      expect(value.loc.end.line).toBe(1)
      expect(value.loc.end.column).toBe(valueIndex + 1 + '{ id, key }'.length)

      const itemsOffset = source.indexOf('items')
      expect((forNode.source as SimpleExpressionNode).content).toBe('items')
      expect(forNode.source.loc.start.offset).toBe(itemsOffset)
      expect(forNode.source.loc.start.line).toBe(1)
      expect(forNode.source.loc.start.column).toBe(itemsOffset + 1)
      expect(forNode.source.loc.end.line).toBe(1)
      expect(forNode.source.loc.end.column).toBe(
        itemsOffset + 1 + `items`.length
      )
    })

    test('bracketed value, key, index', () => {
      const source = '<span v-for="( item, key, index ) in items" />'
      const { node: forNode } = parseWithForTransform(source)

      const itemOffset = source.indexOf('item')
      const value = forNode.valueAlias as SimpleExpressionNode
      expect(value.content).toBe('item')
      expect(value.loc.start.offset).toBe(itemOffset)
      expect(value.loc.start.line).toBe(1)
      expect(value.loc.start.column).toBe(itemOffset + 1)
      expect(value.loc.end.line).toBe(1)
      expect(value.loc.end.column).toBe(itemOffset + 1 + `item`.length)

      const keyOffset = source.indexOf('key')
      const key = forNode.keyAlias as SimpleExpressionNode
      expect(key.content).toBe('key')
      expect(key.loc.start.offset).toBe(keyOffset)
      expect(key.loc.start.line).toBe(1)
      expect(key.loc.start.column).toBe(keyOffset + 1)
      expect(key.loc.end.line).toBe(1)
      expect(key.loc.end.column).toBe(keyOffset + 1 + `key`.length)

      const indexOffset = source.indexOf('index')
      const index = forNode.objectIndexAlias as SimpleExpressionNode
      expect(index.content).toBe('index')
      expect(index.loc.start.offset).toBe(indexOffset)
      expect(index.loc.start.line).toBe(1)
      expect(index.loc.start.column).toBe(indexOffset + 1)
      expect(index.loc.end.line).toBe(1)
      expect(index.loc.end.column).toBe(indexOffset + 1 + `index`.length)

      const itemsOffset = source.indexOf('items')
      expect((forNode.source as SimpleExpressionNode).content).toBe('items')
      expect(forNode.source.loc.start.offset).toBe(itemsOffset)
      expect(forNode.source.loc.start.line).toBe(1)
      expect(forNode.source.loc.start.column).toBe(itemsOffset + 1)
      expect(forNode.source.loc.end.line).toBe(1)
      expect(forNode.source.loc.end.column).toBe(
        itemsOffset + 1 + `items`.length
      )
    })

    test('skipped key', () => {
      const source = '<span v-for="( item,, index ) in items" />'
      const { node: forNode } = parseWithForTransform(source)

      const itemOffset = source.indexOf('item')
      const value = forNode.valueAlias as SimpleExpressionNode
      expect(value.content).toBe('item')
      expect(value.loc.start.offset).toBe(itemOffset)
      expect(value.loc.start.line).toBe(1)
      expect(value.loc.start.column).toBe(itemOffset + 1)
      expect(value.loc.end.line).toBe(1)
      expect(value.loc.end.column).toBe(itemOffset + 1 + `item`.length)

      const indexOffset = source.indexOf('index')
      const index = forNode.objectIndexAlias as SimpleExpressionNode
      expect(index.content).toBe('index')
      expect(index.loc.start.offset).toBe(indexOffset)
      expect(index.loc.start.line).toBe(1)
      expect(index.loc.start.column).toBe(indexOffset + 1)
      expect(index.loc.end.line).toBe(1)
      expect(index.loc.end.column).toBe(indexOffset + 1 + `index`.length)

      const itemsOffset = source.indexOf('items')
      expect((forNode.source as SimpleExpressionNode).content).toBe('items')
      expect(forNode.source.loc.start.offset).toBe(itemsOffset)
      expect(forNode.source.loc.start.line).toBe(1)
      expect(forNode.source.loc.start.column).toBe(itemsOffset + 1)
      expect(forNode.source.loc.end.line).toBe(1)
      expect(forNode.source.loc.end.column).toBe(
        itemsOffset + 1 + `items`.length
      )
    })
  })

  describe('prefixIdentifiers: true', () => {
    test('should prefix v-for source', () => {
      const { node } = parseWithForTransform(`<div v-for="i in list"/>`, {
        prefixIdentifiers: true,
      })
      expect(node.source).toMatchObject({
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: `_ctx.list`,
      })
    })

    test('should prefix v-for source w/ complex expression', () => {
      const { node } = parseWithForTransform(
        `<div v-for="i in list.concat([foo])"/>`,
        { prefixIdentifiers: true }
      )
      expect(node.source).toMatchObject({
        type: NodeTypes.COMPOUND_EXPRESSION,
        children: [
          { content: `_ctx.list` },
          `.`,
          { content: `concat` },
          `([`,
          { content: `_ctx.foo` },
          `])`,
        ],
      })
    })

    test('should not prefix v-for alias', () => {
      const { node } = parseWithForTransform(
        `<div v-for="i in list">{{ i }}{{ j }}</div>`,
        { prefixIdentifiers: true }
      )
      const div = node.children[0] as ElementNode

      expect((div.children[0] as InterpolationNode).content).toMatchObject({
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: `i`,
      })
      expect((div.children[1] as InterpolationNode).content).toMatchObject({
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: `_ctx.j`,
      })
    })
  })
})
