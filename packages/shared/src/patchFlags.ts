/*
 * @Author: phil
 * @Date: 2025-08-09 10:24:44
 */
// export enum PatchFlags {
//   TEXT = 1,
//   CLASS = 1 << 1,
//   STYLE = 1 << 2,
//   PROPS = 1 << 3,
//   NEED_HYDRATION = 1 << 4,
//   FULL_PROPS = 1 << 5,
//   // Indicates a fragment whose children order doesn't change.
//   STABLE_FRAGMENT = 1 << 6,
//   // Indicates a fragment with keyed or partially keyed children
//   KEYED_FRAGMENT = 1 << 7,
//   // Indicates a fragment with unkeyed children.
//   UNKEYED_FRAGMENT = 1 << 8,
//   // 表明 根节点有多个 但是只有一个是有效的 其余的都是注释节点
//   DEV_ROOT_FRAGMENT = 1 << 11,
//   NEED_PATCH = 1 << 9,
//   DYNAMIC_SLOTS = 1 << 10,
//   CACHED = 1 << 12,
//   BAIL = -2,
// }

// patchFlag 是一个数字枚举，不同的数值代表不同类型的动态内容，例如：
// 1 /* TEXT */：节点的文本内容是动态的（如 {{ msg }}）。
// 2 /* CLASS */：节点的 class 属性是动态的（如 :class="cls"）。
// 4 /* STYLE */：节点的 style 属性是动态的（如 :style="sty"）。
// 8 /* PROPS */：节点的普通属性是动态的（如 :id="uid"），需配合 dynamicProps 说明具体哪些属性动态。
// 16 /* FULL_PROPS */：节点有动态的 props（如使用 v-bind="obj" 绑定多个属性）。
// 32 /* HYDRATE_EVENTS */：节点需要在服务端渲染（SSR）时激活事件。
// 64 /* STABLE_FRAGMENT */：片段（Fragment）的子节点顺序固定。
// 128 /* KEYED_FRAGMENT */：片段的子节点有 key，需按 key 对比。
// 256 /* UNKEYED_FRAGMENT */：片段的子节点无 key，需按索引对比。
// 512 /* NEED_PATCH */：节点有动态内容，但无法被上面的类型精确标记（需全量对比）。

// 在组件更新时，Vue3 的 diff 算法会读取 VNode 的 patchFlag：
// 如果节点没有 patchFlag（静态节点），则直接跳过对比，无需更新。
// 如果节点有 patchFlag，则只针对标记的动态部分进行对比和更新（例如，TEXT 标记的节点只对比文本内容，CLASS 标记的节点只对比 class 属性）。

export enum PatchFlags {
  /**
   * Indicates an element with dynamic textContent (children fast path)
   */
  TEXT = 1,

  /**
   * Indicates an element with dynamic class binding.
   */
  CLASS = 1 << 1,

  /**
   * Indicates an element with dynamic style
   * The compiler pre-compiles static string styles into static objects
   * + detects and hoists inline static objects
   * e.g. `style="color: red"` and `:style="{ color: 'red' }"` both get hoisted
   * as:
   * ```js
   * const style = { color: 'red' }
   * render() { return e('div', { style }) }
   * ```
   */
  STYLE = 1 << 2,

  /**
   * Indicates an element that has non-class/style dynamic props.
   * Can also be on a component that has any dynamic props (includes
   * class/style). when this flag is present, the vnode also has a dynamicProps
   * array that contains the keys of the props that may change so the runtime
   * can diff them faster (without having to worry about removed props)
   */
  PROPS = 1 << 3,

  /**
   * Indicates an element with props with dynamic keys. When keys change, a full
   * diff is always needed to remove the old key. This flag is mutually
   * exclusive with CLASS, STYLE and PROPS.
   */
  FULL_PROPS = 1 << 4,

  /**
   * Indicates an element that requires props hydration
   * (but not necessarily patching)
   * e.g. event listeners & v-bind with prop modifier
   */
  NEED_HYDRATION = 1 << 5,

  /**
   * Indicates a fragment whose children order doesn't change.
   */
  STABLE_FRAGMENT = 1 << 6,

  /**
   * Indicates a fragment with keyed or partially keyed children
   */
  KEYED_FRAGMENT = 1 << 7,

  /**
   * Indicates a fragment with unkeyed children.
   */
  UNKEYED_FRAGMENT = 1 << 8,

  /**
   * Indicates an element that only needs non-props patching, e.g. ref or
   * directives (onVnodeXXX hooks). since every patched vnode checks for refs
   * and onVnodeXXX hooks, it simply marks the vnode so that a parent block
   * will track it.
   */
  NEED_PATCH = 1 << 9,

  /**
   * Indicates a component with dynamic slots (e.g. slot that references a v-for
   * iterated value, or dynamic slot names).
   * Components with this flag are always force updated.
   */
  DYNAMIC_SLOTS = 1 << 10,

  /**
   * Indicates a fragment that was created only because the user has placed
   * comments at the root level of a template. This is a dev-only flag since
   * comments are stripped in production.
   */
  DEV_ROOT_FRAGMENT = 1 << 11,

  /**
   * SPECIAL FLAGS -------------------------------------------------------------
   * Special flags are negative integers. They are never matched against using
   * bitwise operators (bitwise matching should only happen in branches where
   * patchFlag > 0), and are mutually exclusive. When checking for a special
   * flag, simply check patchFlag === FLAG.
   */

  /**
   * Indicates a cached static vnode. This is also a hint for hydration to skip
   * the entire sub tree since static content never needs to be updated.
   */
  CACHED = -1,
  /**
   * 一个特殊的标志，表示差异比较算法应该退出优化模式。
   * 例如，在遇到由 renderSlot() 创建的块级片段时，
   * 如果遇到非编译器生成的插槽（即手动编写的渲染函数，
   * 这些函数应该始终进行完整的差异比较）
   * 或手动克隆的虚拟节点时
   */
  BAIL = -2,
}

export const PatchFlagNames: Record<PatchFlags, string> = {
  [PatchFlags.TEXT]: `TEXT`,
  [PatchFlags.CLASS]: `CLASS`,
  [PatchFlags.STYLE]: `STYLE`,
  [PatchFlags.PROPS]: `PROPS`,
  [PatchFlags.FULL_PROPS]: `FULL_PROPS`,
  [PatchFlags.NEED_HYDRATION]: `NEED_HYDRATION`,
  [PatchFlags.STABLE_FRAGMENT]: `STABLE_FRAGMENT`,
  [PatchFlags.KEYED_FRAGMENT]: `KEYED_FRAGMENT`,
  [PatchFlags.UNKEYED_FRAGMENT]: `UNKEYED_FRAGMENT`,
  [PatchFlags.NEED_PATCH]: `NEED_PATCH`,
  [PatchFlags.DYNAMIC_SLOTS]: `DYNAMIC_SLOTS`,
  [PatchFlags.DEV_ROOT_FRAGMENT]: `DEV_ROOT_FRAGMENT`,
  [PatchFlags.CACHED]: `CACHED`,
  [PatchFlags.BAIL]: `BAIL`,
}

// <template>
//   <div class="static-class">
//     <p>静态文本</p>
//     <p>{{ dynamicText }}</p>
//     <button :style="dynamicStyle">按钮</button>
//   </div>
// </template>
