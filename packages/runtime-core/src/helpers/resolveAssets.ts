/*
 * @Author: phil
 * @Date: 2025-08-29 15:30:50
 */

import { camelize, capitalize } from '@pvue/shared'
import { getCurrentInstance } from '../component'

export const COMPONENTS = 'components'
export const DIRECTIVES = 'directives'
export const FILTERS = 'filters'

export type AssetTypes = typeof COMPONENTS | typeof DIRECTIVES | typeof FILTERS

function resolveAssets(type: AssetTypes, name: string) {
  const instance = getCurrentInstance()
  const Component = instance!.type

  if (type === COMPONENTS) {
  }

  const res =
    resolve(instance![type] || Component[type], name) ||
    resolve(instance?.appContext[type], name)

  return res
}

export function resolveComponent(name: string) {
  return resolveAssets(COMPONENTS, name)
}

function resolve(registry: Record<string, any> | undefined, name) {
  return (
    registry &&
    (registry[name] ||
      registry[camelize(name)] ||
      registry[capitalize(camelize(name))])
  )
}
