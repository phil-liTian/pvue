/*
 * @Author: phil
 * @Date: 2025-08-12 17:02:15
 */
import { createRenderer } from '@pvue/runtime-core'
import { nodeOps } from './nodeOps'
import { extend } from '@pvue/shared'
import { patchProp } from './patchProp'

const { render: baseRender, createApp: baseCreateApp } = createRenderer(
  extend({ patchProp }, nodeOps)
)

export const render = baseRender
export const createApp = baseCreateApp

export * from './nodeOps'
export * from '@pvue/runtime-core'

export { serialize } from './serialize'
