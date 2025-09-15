export interface CodegenOptions {
  mode?: 'module' | 'function'
  /**
   * 默认到处模块的名称
   * @default pvue
   */
  runtimeModuleName?: string
}
