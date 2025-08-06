/*
 * @Author: phil
 * @Date: 2025-08-06 17:48:38
 */

export type IfAny<T, Y, N> = 0 extends 1 & T ? Y : N
