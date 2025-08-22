import { toHandlerKey } from '@pvue/shared'

export function toHandlers(obj: Record<string, any>) {
  let ret: Record<string, any> = {}

  for (const key in obj) {
    ret[toHandlerKey(key)] = obj[key]
  }

  return ret
}
