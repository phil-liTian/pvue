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
  comments?: boolean
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
