import { createRenderer } from '@pvue/runtime-core'
import { nodeOps } from './nodeOps'

const { render: baseRender, createApp: baseCreateApp } = createRenderer(nodeOps)

export const render = baseRender
export const createApp = baseCreateApp

export * from './nodeOps'
export * from '@pvue/runtime-core'
