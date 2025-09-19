/*
 * @Author: phil
 * @Date: 2025-08-09 10:24:44
 */
export enum PatchFlags {
  TEXT = 1,
  CLASS = 1 << 1,
  STYLE = 1 << 2,
  PROPS = 1 << 3,
  NEED_HYDRATION = 1 << 4,
  // Indicates a fragment whose children order doesn't change.
  STABLE_FRAGMENT = 1 << 6,
  // Indicates a fragment with keyed or partially keyed children
  KEYED_FRAGMENT = 1 << 7,
  // Indicates a fragment with unkeyed children.
  UNKEYED_FRAGMENT = 1 << 8,
  // 表明 根节点有多个 但是只有一个是有效的 其余的都是注释节点
  DEV_ROOT_FRAGMENT = 1 << 11,
  BAIL = -2,
}
