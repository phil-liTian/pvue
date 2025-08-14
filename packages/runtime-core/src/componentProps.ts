import { extend } from '@pvue/shared'
import { ComponentInternalInstance, Data } from './component'

export type NormalizedPropsOptions = []

export function initProps(
  instance: ComponentInternalInstance,
  rawProps: Data | null
) {
  // instance.ctx.props = rawProps!
  // extend(instance.ctx, rawProps || {})
}
