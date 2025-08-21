import { isArray } from '@pvue/shared'

export function createSlots(slots, dynamicSlots) {
  for (let i = 0; i < dynamicSlots.length; i++) {
    const slot = dynamicSlots[i]

    if (isArray(slot)) {
      for (let j = 0; j < slot.length; j++) {
        const _slot = slot[j]
        slots[_slot.name] = _slot.fn
      }
    } else if (slot) {
      slots[slot.name] = slot.fn
    }
  }

  return slots
}
