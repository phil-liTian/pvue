import { createAppAPI } from './apiCreateApp'

export interface RendererNode {
  [key: string | symbol]: any
}

export interface RendererElement extends RendererNode {}

export function createRender() {
  return baseCreateRenderer()
}

function baseCreateRenderer() {
  return {
    createApp: createAppAPI(),
  }
}
