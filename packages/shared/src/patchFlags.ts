export enum PatchFlags {
  TEXT = 1,
  CLASS = 1 << 1,
  STYLE = 1 << 2,
  PROPS = 1 << 3,
  NEED_HYDRATION = 1 << 4,
  BAIL = -2,
}
