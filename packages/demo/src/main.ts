/*
 * @Author: phil
 * @Date: 2025-08-09 17:39:09
 */
import { createVNode, h, createApp } from 'pvue'
import { App } from './App'

const app = createApp(App, { count: 1 })

app.provide('foo', '我的根组件全局提供的provides')
app.component('parent', () => '全局注册的组件')
// app.config.isNativeTag = tag => tag === 'div'

app.use(app => app.provide('global', '插件机制'))

app.mount(document.querySelector('#app'))
// 不可以重复挂载到相同的实例上
// app.mount(document.querySelector('#app'))
