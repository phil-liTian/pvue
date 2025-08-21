import {
  createSetupContext,
  getCurrentInstance,
  SetupContext,
} from './component'
import { warn } from './warning'

export function useSlots() {
  return getContext('useSlots').slots
}

function getContext(calledFunctionName: string): SetupContext {
  const i = getCurrentInstance()!
  if (!i && __DEV__) {
    warn(`${calledFunctionName}() called without active instance.`)
  }

  return (i.setupContext! = i.setupContext = createSetupContext(i))
}
