import { ElementNode, Namespace } from './ast'
import { NodeTransform } from './transform'

export interface CodegenOptions {
  mode?: 'module' | 'function'
  /**
   * 默认到处模块的名称
   * @default pvue
   */
  runtimeModuleName?: string
}

export interface ErrorHandlingOptions {
  onError?: (error) => void
}

export interface ParserOptions extends ErrorHandlingOptions {
  isVoidTag?: (tag: string) => boolean
  delimiters?: [string, string]
  comments?: boolean
  ns?: Namespace
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
}
