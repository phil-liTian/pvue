/*
 * @Author: phil
 * @Date: 2025-08-09 08:08:16
 */
import { VNode } from './vnode'
import { applyOptions, type ComponentOptions } from './componentOptions'
import {
  ComponentPublicInstance,
  createDevRenderContext,
  exposePropsOnRenderContext,
  exposeSetupStateOnRenderContext,
  normalizePropsOptions,
  PublicInstanceProxyHandlers,
} from './componentPublicInstance'
import { EMPTY_OBJ, isFunction, ShapeFlags } from '@pvue/shared'
import { currentRenderingInstance } from './componentRenderContext'
import { LifecycleHooks } from './enums'
import { SchedulerJob } from './scheduler'
import { AppContext, createAppContext } from './apiCreateApp'
import { initProps, NormalizedPropsOptions } from './componentProps'

export type LifecycleHook<TFn = Function> = (TFn | SchedulerJob)[] | null

export type Data = Record<string, unknown>

export type Component = ComponentOptions & {}

export type ConcreteComponent<
  Props = {},
  RawBindings = any,
  D = any
> = ComponentOptions

let uid = 0
export interface ComponentInternalInstance {
  uuid: number
  // app全局属性
  appContext: AppContext
  vnode: VNode
  // render函数执行后返回的tree
  subTree: VNode
  type: ConcreteComponent
  root: ComponentInternalInstance
  parent: ComponentInternalInstance | null
  render?: Function

  /**
   * @inernal 上下文对象, 返回组件实例, 用在PublicInstanceProxyHandlers组件代理对象中
   */
  ctx: Data

  // 组件代理对象, 可用作在applyOptions中的this的指向
  proxy: ComponentPublicInstance | null

  exposed: Record<string, any> | null

  // state 数据配置 options api支持当前写法, 比如是一个函数 返回一个对象
  data: Data
  // setup返回的值
  setupState: Data
  props: Data
  attrs: Data
  refs: Data
  slots: any

  propsOptions: NormalizedPropsOptions

  emit: any

  // 生命周期函数
  [LifecycleHooks.MOUNTED]: LifecycleHook

  n?: () => Promise<void>
}

export class ClassComponent {
  __vccOpts: ComponentOptions
}

const emptyAppContext = createAppContext()

export function createComponentInstance(
  vnode: VNode,
  parent: ComponentInternalInstance | null
): ComponentInternalInstance {
  const type = vnode.type as ConcreteComponent
  const appContext =
    (parent ? parent.appContext : vnode.appContext) || emptyAppContext

  const instance: ComponentInternalInstance = {
    uuid: ++uid,
    appContext,
    vnode,
    subTree: null!,
    root: null!,
    parent,
    type,

    proxy: null,
    exposed: null,

    // state
    ctx: EMPTY_OBJ,
    data: EMPTY_OBJ,
    setupState: EMPTY_OBJ,
    props: EMPTY_OBJ,
    attrs: EMPTY_OBJ,
    refs: EMPTY_OBJ,
    slots: EMPTY_OBJ,

    propsOptions: normalizePropsOptions(type, appContext),

    emit: null!,

    m: null,
  }
  if (__DEV__) {
    instance.ctx = createDevRenderContext(instance)
  } else {
    instance.ctx = { _: instance }
  }

  instance.root = parent ? parent.root : instance

  return instance
}

export function setupComponent(instance: ComponentInternalInstance) {
  const { props } = instance.type
  // 处理props、slots
  initProps(instance, props)
  // initSlots

  // 处理stateful-component 对象组件
  setupStatefulComponent(instance)
}

export function setupStatefulComponent(instance: ComponentInternalInstance) {
  const Component = instance.type
  const { setup } = Component

  // 创建组件实例的代理对象，使用Proxy将instance.ctx包装，通过PublicInstanceProxyHandlers处理器拦截对组件实例的访问
  instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandlers)

  if (__DEV__) {
    // 在开发环境下，将组件的props暴露到渲染上下文(ctx)中，方便开发调试
    exposePropsOnRenderContext(instance)
  }

  // 处理组件的setup函数
  if (setup) {
    if (isFunction(setup)) {
      // 如果setup是函数，则执行setup函数获取返回结果
      const setupResult = setup()

      // 处理setup函数的返回结果，可能是响应式对象或渲染函数
      handleSetupResult(instance, setupResult)
    }
  }

  // 设置当前实例为活动实例，为兼容Options API做准备
  setCurrentInstance(instance)

  // 完成组件设置，处理模板编译、渲染函数等剩余的组件初始化工作
  finishComponentSetup(instance)
}

// 处理setup的结果 可以是对象 或者 函数 如果是函数当render函数处理

function handleSetupResult(
  instance: ComponentInternalInstance,
  setupResult: unknown
) {
  if (isFunction(setupResult)) {
  } else {
    // 是一个对象
    instance.setupState = setupResult as Data

    if (__DEV__) {
      // 将setup返回的值挂载到ctx上面
      exposeSetupStateOnRenderContext(instance)
    }
  }
}

export function finishComponentSetup(instance: ComponentInternalInstance) {
  const Component = instance.type

  if (Component.render) {
    instance.render = Component.render
  }

  // 处理component 配置options 比如 data, lifeCycle and so on
  applyOptions(instance)
}

export function isClassComponent(value: unknown): value is ClassComponent {
  return isFunction(value) && '__vccOpts' in value
}

export function isStatefulComponent(
  instance: ComponentInternalInstance
): number {
  return instance.vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT
}

// 当前组件实例
export let currentInstance: ComponentInternalInstance | null = null

export const getCurrentInstance: () => ComponentInternalInstance | null =
  () => {
    return currentInstance || currentRenderingInstance
  }

export const setCurrentInstance = (instance: ComponentInternalInstance) => {
  currentInstance = instance
}

export const getComponentPublicInstance = (
  instance: ComponentInternalInstance
) => {
  if (instance.exposed) {
  } else {
    return instance.proxy
  }
}
