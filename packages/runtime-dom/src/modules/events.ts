/*
 * @Author: phil
 * @Date: 2025-08-26 10:51:13
 */

import { callWithAsyncErrorHandling, ErrorCodes } from '@pvue/runtime-core'
import { hyphenate } from '@pvue/shared'
import { ComponentInternalInstance } from 'packages/runtime-core/src/component'

type EventValue = Function | Function[]

interface Invoker extends EventListener {
  value: EventValue
  attached: number
}

function addEventListner(
  el: Element,
  event: string,
  handler: EventListener,
  options?: EventListenerOptions
) {
  el.addEventListener(event, handler, options)
}

export function patchEvent(
  el: Element,
  rawName: string,
  prevValue: EventValue | null,
  nextValue: EventValue | unknown,
  instance: ComponentInternalInstance | null
) {
  const [name, options] = parseName(rawName)
  const invoker = createInvoker(nextValue! as EventValue, instance)
  addEventListner(el, name, invoker, options)
}

function createInvoker(
  initialValue: EventValue,
  instance: ComponentInternalInstance | null
): Invoker {
  const invoker: Invoker = e => {
    callWithAsyncErrorHandling(
      initialValue,
      instance,
      ErrorCodes.NATIVE_EVENT_HANDLER,
      [e]
    )
  }

  invoker.value = initialValue
  invoker.attached = 0

  return invoker
}

function parseName(name: string) {
  let options

  const event = name[2] === ':' ? name.slice(3) : hyphenate(name.slice(2))
  return [event, options]
}
