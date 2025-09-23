<template>
  <div
    class="tree"
    ref="root"
    :style="{
      '--tree-duration': duration + 'ms',
    }"
  >
    <!-- 根级节点渲染：将顶层 data 渲染为 TreeNode 列表 -->
    <tree-node
      v-for="n in data"
      :key="getKey(n)"
      :node="n"
      :level="1"
      :expanded-map="expandedMap"
      :active-key="activeKey"
      :indent="indent"
      :item-height="itemHeight"
      :use-transition="useTransition"
      :props="props"
      :label-class-name="labelClassName"
      @toggle="onToggle"
      @select="onSelect"
    >
      <!-- 自定义“展开/收起”开关 -->
      <template v-if="$scopedSlots.switcher" #switcher="slotProps"
        ><slot name="switcher" v-bind="slotProps"
      /></template>

      <!-- 自定义 label -->
      <template v-if="$scopedSlots.label" #label="slotProps"
        ><slot name="label" v-bind="slotProps"></slot
      ></template>
    </tree-node>
    <!-- empty slot -->
    <div v-if="!data || !data.length"><slot name="empty">无数据</slot></div>
  </div>
</template>

<script>
import TreeNode from "./TreeNode.vue";
import commonMixin from "./commonMixin";

export default {
  name: "Tree",
  components: { TreeNode },
  mixins: [commonMixin],
  props: {
    // 树数据源（数组）
    data: { type: Array, default: () => [] },
    // 受控：展开的 key 列表（支持 expandedKey.sync）
    expandedKeys: { type: Array, default: () => [] },
    // 初始是否展开全部（当未传 expandedKeys 时生效）
    defaultExpandAll: { type: Boolean, default: false },
    // 互斥展开：仅保留一条展开路径（类似手风琴）；默认关闭
    accordion: { type: Boolean, default: false },
    // 是否允许选择节点（触发 select 事件与 activeKey 更新）
    selectable: { type: Boolean, default: true },
    // 受控：当前选中节点 key（支持 activeKey.sync）
    activeKey: [String, Number],
    // 过渡动画时长（毫秒）
    duration: { type: Number, default: 160 },
  },
  data() {
    // 初始化展开态哈希：将 expandedKeys 转为 O(1) 查询的 Map 结构
    const m = {};
    (this.expandedKeys || []).forEach(k => {
      m[k] = true;
    });
    return {
      // 展开态映射：key => true
      expandedMap: m,
      // 快速索引映射：nodesMap: key => node；parentMap: childKey => parentKey
      maps: { nodesMap: {}, parentMap: {} },
    };
  },
  // Watchers: keep expanded/active state in sync and rebuild maps on data change
  watch: {
    expandedKeys: {
      deep: true,
      handler(v) {
        const m = {};
        (v || []).forEach(k => {
          m[k] = true;
        });
        this.expandedMap = m;
      },
    },
    activeKey(v) {
      if (v !== undefined && v !== null) this.expandToKey(v);
    },
    data: {
      immediate: true,
      handler() {
        this.maps = this.buildMaps(this.data);
        if (
          this.defaultExpandAll &&
          (!this.expandedKeys || !this.expandedKeys.length)
        ) {
          const all = this.collectAllExpandable(this.data);
          this.$emit("update:expandedKeys", all);
        }
      },
    },
  },
  methods: {
    // maps builder
    buildMaps(list, parent = null, maps = { nodesMap: {}, parentMap: {} }) {
      for (const n of list || []) {
        const key = this.getKey(n);
        if (key != null) {
          maps.nodesMap[key] = n;
          if (parent != null) {
            const pkey = this.getKey(parent);
            if (pkey != null) maps.parentMap[key] = pkey;
          }
        }
        const ch = this.getChildren(n);
        if (ch?.length) this.buildMaps(ch, n, maps);
      }
      return maps;
    },
    onToggle(node, ex) {
      const key = this.getKey(node);
      if (ex && this.accordion) {
        // 仅保留“祖先链 + 当前节点”处于展开态
        const pm = this.maps?.parentMap || this.buildMaps(this.data).parentMap;
        const keep = {};
        // 保留祖先链
        let cur = key;
        while (pm[cur]) {
          keep[pm[cur]] = true;
          cur = pm[cur];
        }
        // 保留当前节点
        keep[key] = true;
        const next = Object.keys(keep);
        this.expandedMap = keep;
        this.$emit("update:expandedKeys", next);
        this.$emit("toggle", node, ex, { expandedKeys: next });
        return;
      }
      // 默认：合并/移除单个展开项
      const map = { ...(this.expandedMap || {}) };
      if (ex) map[key] = true;
      else delete map[key];
      const next = Object.keys(map);
      this.expandedMap = map;
      this.$emit("update:expandedKeys", next);
      this.$emit("toggle", node, ex, { expandedKeys: next });
    },
    onSelect(node) {
      if (!this.selectable) return;
      const k = this.getKey(node);
      // 激活时：仅展开其祖先，不展开其子级
      this.expandToKey(k);
      this.$emit("update:activeKey", k);
      this.$emit("select", node, { activeKey: k });
    },
    collectAllExpandable(list, acc = []) {
      for (const n of list || []) {
        const ch = this.getChildren(n);
        if (ch?.length) {
          const k = this.getKey(n);
          if (k != null) acc.push(k);
          this.collectAllExpandable(ch, acc);
        }
      }
      return acc;
    },
    buildParentMap(list, parent = null, map = {}) {
      for (const n of list || []) {
        const nk = this.getKey(n);
        const pk = parent ? this.getKey(parent) : null;
        if (parent && nk != null && pk != null) map[nk] = pk;
        const ch = this.getChildren(n);
        if (ch?.length) this.buildParentMap(ch, n, map);
      }
      return map;
    },
    expandAll() {
      const keys = this.collectAllExpandable(this.data);
      const m = {};
      keys.forEach(k => {
        m[k] = true;
      });
      this.expandedMap = m;
      this.$emit("update:expandedKeys", keys);
    },
    collapseAll() {
      this.expandedMap = {};
      this.$emit("update:expandedKeys", []);
    },
    expandToKey(key) {
      const pm = this.maps?.parentMap || this.buildMaps(this.data).parentMap;
      if (this.accordion) {
        // 单路径模式：仅保留祖先链展开
        const map = {};
        let cur = pm[key];
        while (cur) {
          map[cur] = true;
          cur = pm[cur];
        }
        const next = Object.keys(map);
        this.expandedMap = map;
        this.$emit("update:expandedKeys", next);
        return;
      }
      // 默认：在原有基础上合并祖先展开
      const map = { ...(this.expandedMap || {}) };
      let cur = pm[key];
      while (cur) {
        map[cur] = true;
        cur = pm[cur];
      }
      const next = Object.keys(map);
      this.expandedMap = map;
      this.$emit("update:expandedKeys", next);
    },
    scrollToKey(key) {
      const root = this.$refs.root;
      const el = root?.querySelector(`[data-key="${CSS.escape(String(key))}"]`);
      if (!el || !root) return;
      if (typeof el?.scrollIntoView === "function") {
        el?.scrollIntoView({ behavior: "smooth" });
      }
    },

    // Wait until the target node exists in DOM and no height transitions are running
    waitForNodeReady(key, maxMs = 2000) {
      const root = this.$refs.root;
      const start = Date.now();
      return new Promise(resolve => {
        const check = () => {
          const el = root?.querySelector(
            `[data-key="${CSS.escape(String(key))}"]`
          );
          const present = !!(el?.getClientRects && el?.getClientRects().length);
          // During expand/collapse, TreeNode sets inline style.height; cleared on after-enter/after-leave
          const running = root?.querySelector(
            '.tree__children[style*="height"]'
          );
          if ((present && !running) || Date.now() - start > maxMs) {
            resolve();
          } else {
            requestAnimationFrame(check);
          }
        };
        requestAnimationFrame(check);
      });
    },

    // unified activate: expand ancestors, set active, optional scroll
    async activate(key, opts = {}) {
      if (key === undefined || key === null) return;
      this.expandToKey(key);
      this.$emit("update:activeKey", key);
      if (opts?.scroll) {
        await this.waitForNodeReady(key);
        this.scrollToKey(key);
      }
    },
    // get ancestor keys from root -> parent of key
    getAncestorKeys(key) {
      const pm = this.maps?.parentMap || this.buildMaps(this.data).parentMap;
      const chain = [];
      let cur = pm[key];
      while (cur) {
        chain.push(cur);
        cur = pm[cur];
      }
      return chain.reverse();
    },
    // get label by key with current mapping
    getLabelByKey(key) {
      const n = this.maps?.nodesMap ? this.maps.nodesMap[key] : null;
      return n ? this.getLabel(n) : undefined;
    },
  },
};
</script>

<style lang="less" scoped>
.tree {
  font-size: 14px;
  color: #111;
}
</style>
