import { PatchFlagNames, PatchFlags, ShapeFlags, isArray } from '@pvue/shared'

type Flags = PatchFlags | ShapeFlags
export function genFlagText(
  flag: Flags | Flags[],
  names: { [k: number]: string } = PatchFlagNames
): string {
  if (isArray(flag)) {
    let f = 0
    flag.forEach(ff => {
      f |= ff
    })
    return `${f} /* ${flag.map(f => names[f]).join(', ')} */`
  } else {
    return `${flag} /* ${names[flag]} */`
  }
}
