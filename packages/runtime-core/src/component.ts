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
  PublicInstanceProxyHandlers,
} from './componentPublicInstance'
import { EMPTY_OBJ, isFunction, isObject, ShapeFlags } from '@pvue/shared'
import { currentRenderingInstance } from './componentRenderContext'
import { LifecycleHooks } from './enums'
import { SchedulerJob } from './scheduler'
import { AppConfig, AppContext, createAppContext } from './apiCreateApp'
import {
  ComponentPropsOptions,
  initProps,
  NormalizedPropsOptions,
  normalizePropsOptions,
} from './componentProps'
import { callWithErrorHandling, ErrorCodes } from './errorHandling'
import { initSlots } from './componentSlots'
import {
  emit,
  normalizeEmitsOptions,
  ObjectEmitsOptions,
} from './componentEmits'
import { warn } from './warning'

export type LifecycleHook<TFn = Function> = (TFn | SchedulerJob)[] | null

export type Data = Record<string, unknown>

export type Component = ComponentOptions & {}

export interface ComponentInternalOptions {}

export interface FunctionalComponent<P = {}> extends ComponentInternalOptions {
  (props: P, ctx: SetupContext): any
  props?: ComponentPropsOptions<P>
  emits?: any
}

export type ConcreteComponent<Props = {}, RawBindings = any, D = any> =
  | ComponentOptions & FunctionalComponent<Props>

export type SetupContext = {
  attrs: Data
  slots: Data
  emit: Data
}

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
  update: () => void
  job: SchedulerJob

  /**
   * @inernal 上下文对象, 返回组件实例, 用在PublicInstanceProxyHandlers组件代理对象中
   */
  ctx: Data

  /**
   * @internal
   */
  setupContext: SetupContext | null

  /**
   * @internal
   */
  provides: Data

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

  emitsOptions: ObjectEmitsOptions | null

  emit: any

  // 生命周期函数
  [LifecycleHooks.MOUNTED]: LifecycleHook
  [LifecycleHooks.UPDATED]: LifecycleHook

  n?: () => Promise<void>

  isMounted: boolean

  /**
   * @internal
   */

  emitted?: Record<string, boolean> | null

  /**
   * @internal
   */
  next: VNode | null

  // 是否继承attrs的属性
  inheritAttrs?: Boolean
}

export interface ClassComponent {
  new (...args: any[]): ComponentPublicInstance
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

    // 处理组件可以接受的props配置
    propsOptions: normalizePropsOptions(type, appContext),

    emitsOptions: normalizeEmitsOptions(type, appContext),

    emit: null!,

    m: null,
    u: null,

    setupContext: null,
    provides: parent ? parent.provides : Object.create(appContext.provides),

    // 标识组件是否已挂载
    isMounted: false,

    inheritAttrs: type.inheritAttrs,

    update: null!,
    job: null!,

    next: null!,
  }
  if (__DEV__) {
    instance.ctx = createDevRenderContext(instance)
  } else {
    instance.ctx = { _: instance }
  }

  instance.root = parent ? parent.root : instance
  instance.emit = emit.bind(null, instance)

  return instance
}

export function setupComponent(instance: ComponentInternalInstance) {
  const { props } = instance.vnode
  const isStateful = isStatefulComponent(instance)
  // 处理props、slots
  initProps(instance, props, isStateful)
  initSlots(instance, instance.vnode.children)

  // 处理stateful-component 对象组件
  setupStatefulComponent(instance)
}

export function validateComponentName(
  name: string,
  { isNativeTag }: AppConfig
) {
  if (isNativeTag(name)) {
    warn(
      'Do not use built-in or reserved HTML elements as component id: ' + name
    )
  }
}

export function setupStatefulComponent(instance: ComponentInternalInstance) {
  const Component = instance.type

  if (__DEV__) {
    if (Component.name) {
      validateComponentName(Component.name, instance.appContext.config)
    }

    if (Component.components) {
      const names = Object.keys(Component.components)
      for (let i = 0; i < names.length; i++) {
        validateComponentName(names[i], instance.appContext.config)
      }
    }
  }

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
      // const setupResult = setup()
      const setupContext = (instance.setupContext =
        setup.length > 1 ? createSetupContext(instance) : null)

      // 设置当前实例为活动实例，为兼容Options API做准备, 在执行setup之前就要设置currentInstance
      const reset = setCurrentInstance(instance)
      const setupResult = callWithErrorHandling(
        setup,
        instance,
        ErrorCodes.SETUP_FUNCTION,
        [instance.props, setupContext]
      )
      reset()
      // 处理setup函数的返回结果，可能是响应式对象或渲染函数
      handleSetupResult(instance, setupResult)
    }
  }

  // 完成组件设置，处理模板编译、渲染函数等剩余的组件初始化工作
  finishComponentSetup(instance)
}

// 处理setup的结果 可以是对象 或者 函数 如果是函数当render函数处理

function handleSetupResult(
  instance: ComponentInternalInstance,
  setupResult: unknown
) {
  if (isFunction(setupResult)) {
    instance.render = setupResult
  } else if (isObject(setupResult)) {
    // 是一个对象
    instance.setupState = setupResult as Data

    if (__DEV__) {
      // 将setup返回的值挂载到ctx上面
      exposeSetupStateOnRenderContext(instance)
    }
  }
}

export function finishComponentSetup(
  instance: ComponentInternalInstance,
  skipOptions?: boolean
) {
  const Component = instance.type

  if (!instance.render) {
    if (compiler) {
      const template = Component.template

      if (template) {
        Component.render = compiler(template)
      }
    }
  }

  if (Component.render) {
    instance.render = Component.render
  }

  if (__FEATURE_OPTIONS_API__ && !(__COMPAT__ && skipOptions)) {
    const reset = setCurrentInstance(instance)

    // 处理component 配置options 比如 data, lifeCycle and so on
    applyOptions(instance)
    reset()
  }
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
  return () => {
    currentInstance = null
  }
}

export const getComponentPublicInstance = (
  instance: ComponentInternalInstance
) => {
  if (instance.exposed) {
  } else {
    return instance.proxy
  }
}

export function createSetupContext(instance: ComponentInternalInstance) {
  const { attrs, slots, emit } = instance
  return {
    attrs,
    slots,
    emit,
  }
}

let compiler: any

// 打通compiler和runtime的流程

export function registerRuntimeCompiler(_compiler: any): void {
  compiler = _compiler
}
