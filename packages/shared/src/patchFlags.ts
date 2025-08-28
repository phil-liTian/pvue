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
  BAIL = -2,
}
