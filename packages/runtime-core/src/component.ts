/*
 * @Author: phil
 * @Date: 2025-08-09 08:08:16
 */
import { VNode } from './vnode'
import type { ComponentOptions } from './componentOptions'
import { isFunction } from '@pvue/shared'

export type Data = Record<string, unknown>

export type Component = ComponentOptions & {}

export interface CompoentInternalInstance {
  vnode: VNode
}

export class ClassComponent {
  __vccOpts: ComponentOptions
}

export function createComponentInstance(
  vnode: VNode,
  parent: CompoentInternalInstance | null
): CompoentInternalInstance {
  const instance: CompoentInternalInstance = {
    vnode,
  }

  return instance
}

export function isClassComponent(value: unknown): value is ClassComponent {
  return isFunction(value) && '__vccOpts' in value
}
