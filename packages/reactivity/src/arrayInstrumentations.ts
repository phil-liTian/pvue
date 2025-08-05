import { TrackOpTypes } from './constants'
import { ARRAY_ITERATE_KEY, track } from './dep'
import { startBatch, endBatch } from './effect'
import { toRaw } from './reactive'

export function reactiveReadArray<T>(array: T[]): T[] {
  const raw = toRaw(array)
  if (raw === array) return raw
  track(raw, TrackOpTypes.ITERATE, ARRAY_ITERATE_KEY)

  return raw
}

export const arrayInstrumentations = {
  join(separator?: string) {
    return reactiveReadArray(this).join(separator)
  },

  unshift(...args: unknown[]) {
    return noTracking(this, 'unshift', args)
  },
}

function noTracking(
  self: unknown[],
  method: keyof Array<any>,
  args: unknown[] = []
) {
  startBatch()
  const res = (toRaw(self) as any)[method].apply(self, args)
  endBatch()
  return res
}
