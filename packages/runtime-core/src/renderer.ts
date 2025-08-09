export interface RendererNode {
  [key: string | symbol]: any
}

export interface RendererElement extends RendererNode {}
