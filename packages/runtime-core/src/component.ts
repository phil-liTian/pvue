/*
 * @Author: phil
 * @Date: 2025-08-09 08:08:16
 */
import { VNode } from './vnode'
import type { ComponentOptions } from './componentOptions'
import { isFunction } from '@pvue/shared'

export type Data = Record<string, unknown>

export type Component = ComponentOptions & {}

export type ConcreteComponent = any

export interface ComponentInternalInstance {
  vnode: VNode
  type: ConcreteComponent
  render?: Function
}

export class ClassComponent {
  __vccOpts: ComponentOptions
}

export function createComponentInstance(
  vnode: VNode,
  parent?: ComponentInternalInstance | null
): ComponentInternalInstance {
  const instance: ComponentInternalInstance = {
    vnode,
    type: vnode.type,
  }

  return instance
}

export function setupComponent(instance: ComponentInternalInstance) {
  const {} = instance.vnode

  // initProps
  // initSlots

  setupStatefulComponent(instance)
}

// TODO: 处理setup
export function setupStatefulComponent(instance: ComponentInternalInstance) {
  finishComponentSetup(instance)
}

export function finishComponentSetup(instance: ComponentInternalInstance) {
  const Component = instance.type

  console.log('Component', Component)

  if (Component.render) {
    instance.render = Component.render
  }
}

export function isClassComponent(value: unknown): value is ClassComponent {
  return isFunction(value) && '__vccOpts' in value
}
