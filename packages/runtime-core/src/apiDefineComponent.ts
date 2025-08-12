import { extend, isFunction } from '@pvue/shared'
import type { ComponentOptions } from './componentOptions'

export function defineComponent(
  options: unknown,
  extraOptions?: ComponentOptions
) {
  return isFunction(options)
    ? extend({ name: options.name }, extraOptions, { setup: options })
    : options
}
