/*
 * @Author: phil
 * @Date: 2025-08-06 14:25:43
 */
import { vitest, type MockInstance } from 'vitest'

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

interface CustomMatchers<R = unknown> {
  toHaveBeenWarned(): R
  toHaveBeenWarnedLast(): R
  toHaveBeenWarnedTimes(n: number): R
}

expect.extend({
  toHaveBeenWarned(received: string) {
    const passed = warn.mock.calls.some(args => args[0].includes(received))
    if (passed) {
      asserted.add(received)
      return {
        pass: true,
        message: () => `expected "${received}" not to have been warned.`,
      }
    } else {
      const msgs = warn.mock.calls.map(args => args[0]).join('\n - ')
      return {
        pass: false,
        message: () =>
          `expected "${received}" to have been warned` +
          (msgs.length
            ? `.\n\nActual messages:\n\n - ${msgs}`
            : ` but no warning was recorded.`),
      }
    }
  },

  toHaveBeenWarnedTimes(received: string, n: number) {
    let found = 0
    warn.mock.calls.forEach(args => {
      if (args[0].includes(received)) {
        found++
      }
    })

    if (found === n) {
      asserted.add(received)
      return {
        pass: true,
        message: () => `expected "${received}" to have been warned ${n} times.`,
      }
    } else {
      return {
        pass: false,
        message: () =>
          `expected "${received}" to have been warned ${n} times but got ${found}.`,
      }
    }
  },
})

let warn: MockInstance
const asserted: Set<string> = new Set()

beforeEach(() => {
  asserted.clear()
  warn = vitest.spyOn(console, 'warn')
  warn.mockImplementation(() => {})
})
