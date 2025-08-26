/*
 * @Author: phil
 * @Date: 2025-08-26 10:36:27
 */

import { isString } from '@pvue/shared'

type Style = string | Record<string, string | string[]> | null

export function patchStyle(el: Element, prev: Style, next: Style) {
  const style = (el as HTMLElement).style
  const isClassString = isString(next)

  if (next && !isClassString) {
    // 更新
    if (prev) {
    }

    for (const key in next) {
      setStyle(style, key, next[key])
    }
  }
}

function setStyle(
  style: CSSStyleDeclaration,
  key: string,
  val: string | string[]
) {
  style[key] = val
}
