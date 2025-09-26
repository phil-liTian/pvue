/*
 * @Author: phil
 * @Date: 2025-09-14 21:12:19
 */
import { ElementNode, Namespace } from './ast'
import { NodeTransform } from './transform'

export interface CodegenOptions {
  mode?: 'module' | 'function'
  /**
   * 默认到处模块的名称
   * @default pvue
   */
  runtimeModuleName?: string

  runtimeGlobalName?: string
  prefixIdentifiers?: boolean
}

export interface ErrorHandlingOptions {
  onError?: (error) => void
}

export interface ParserOptions extends ErrorHandlingOptions {
  // 是否是空标签 默认是false
  isVoidTag?: (tag: string) => boolean
  // 是否是原始标签, 不是nativeTag则认为是component类型
  isNativeTag?: (tag: string) => boolean
  // 是否是自定义标签
  isCustomElement?: (tag: string) => boolean | void
  // 内置组件
  isBuiltInComponent?: (tag: string) => symbol | void
  delimiters?: [string, string]
  comments?: boolean
  ns?: Namespace

  // 是有带前缀标识符
  prefixIdentifiers?: boolean
  getNamespace?: (
    tag: string,
    parent: ElementNode | undefined,
    rootNameSpace: Namespace
  ) => Namespace
}

export interface SharedTransformCodegenOptions {
  filename?: string
}

export interface TransformOptions
  extends SharedTransformCodegenOptions,
    ErrorHandlingOptions {
  // 对ast进行转换的transform集合
  nodeTransforms?: NodeTransform[]

  // 是否自动补齐前缀
  prefixIdentifiers?: boolean
}

export interface CompilerOptions extends ParserOptions {}
