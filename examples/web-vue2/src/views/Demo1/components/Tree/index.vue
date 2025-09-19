<template>
  <div
    class="tree"
    ref="root"
    :style="{
      '--tree-duration': duration + 'ms',
      '--tree-ease': easing,
    }"
  >
    <tree-node
      v-for="n in data"
      :key="getKey(n)"
      :node="n"
      :level="1"
      :expanded-map="expandedMap"
      :active-key="activeKey"
      :indent="indent"
      :item-height="itemHeight"
      :use-transition="transition"
      :duration="duration"
      :easing="easing"
      :props="props"
      @toggle="onToggle"
      @select="onSelect"
    >
      <template v-if="$scopedSlots.switcher" #switcher="slotProps"
        ><slot name="switcher" v-bind="slotProps"
      /></template>

      <template #label="slotProps"
        ><slot name="label" v-bind="slotProps">{{
          getLabel(slotProps.node)
        }}</slot></template
      >
      <template #suffix="slotProps"
        ><slot name="suffix" v-bind="slotProps"
      /></template>
    </tree-node>
    <div v-if="!data || !data.length"><slot name="empty">无数据</slot></div>
  </div>
</template>

<script>
import TreeNode from "./TreeNode.vue";

export default {
  name: "Tree",
  components: { TreeNode },
  props: {
    data: { type: Array, default: () => [] },
    expandedKeys: { type: Array, default: () => [] },
    defaultExpandAll: { type: Boolean, default: false },
    indent: { type: Number, default: 16 },
    itemHeight: { type: Number, default: 44 },
    selectable: { type: Boolean, default: true },
    activeKey: [String, Number],
    transition: { type: Boolean, default: true },
    duration: { type: Number, default: 160 },
    easing: { type: String, default: "cubic-bezier(0.2,0,0,1)" },
    // 字段映射
    props: {
      type: Object,
      default: () => ({
        key: "key",
        label: "label",
        children: "children",
        disabled: "disabled",
        isLeaf: "isLeaf",
      }),
    },
  },
  data() {
    const m = {};
    (this.expandedKeys || []).forEach(k => {
      m[k] = true;
    });
    return {
      expandedMap: m,
      maps: { nodesMap: {}, parentMap: {} },
    };
  },
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
        // Rebuild nodesMap/parentMap
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
  mounted() {
    this.$emit("ready", {
      methods: {
        expandAll: this.expandAll,
        collapseAll: this.collapseAll,
        expandToKey: this.expandToKey,
        scrollToKey: this.scrollToKey,

        activate: this.activate,
        getAncestorKeys: this.getAncestorKeys,
        getLabelByKey: this.getLabelByKey,
      },
    });
  },
  methods: {
    // field mapping helpers
    getKey(n) {
      const kf = (this.props && this.props.key) || "key";
      return n && n[kf];
    },
    getChildren(n) {
      const cf = (this.props && this.props.children) || "children";
      return (n && n[cf]) || [];
    },
    getLabel(n) {
      const lf = (this.props && this.props.label) || "label";
      return n ? n[lf] : undefined;
    },
    isLeafNode(n) {
      const lf = (this.props && this.props.isLeaf) || "isLeaf";
      const children = this.getChildren(n);
      return !!(n && (n[lf] || !children || children.length === 0));
    },
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
        if (ch && ch.length) this.buildMaps(ch, n, maps);
      }
      return maps;
    },
    onToggle(node, ex) {
      const key = this.getKey(node);
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
        if (ch && ch.length) {
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
        if (ch && ch.length) this.buildParentMap(ch, n, map);
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
      const pm =
        (this.maps && this.maps.parentMap) ||
        this.buildMaps(this.data).parentMap;
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
    scrollToKey(key, align = "center") {
      const root = this.$refs.root;
      const el =
        root && root.querySelector(`[data-key="${CSS.escape(String(key))}"]`);
      if (!el || !root) return;
      try {
        el.scrollIntoView({ block: align, behavior: "smooth" });
      } catch (e) {
        el.scrollIntoView(true);
      }
    },

    // Wait until the target node exists in DOM and no height transitions are running
    waitForNodeReady(key, maxMs = 2000) {
      const root = this.$refs.root;
      const start = Date.now();
      return new Promise(resolve => {
        const check = () => {
          const el =
            root &&
            root.querySelector(`[data-key="${CSS.escape(String(key))}"]`);
          const present = !!(
            el &&
            el.getClientRects &&
            el.getClientRects().length
          );
          // During expand/collapse, TreeNode sets inline style.height; cleared on after-enter/after-leave
          const running =
            root && root.querySelector('.tree__children[style*="height"]');
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
      if (opts && opts.scroll) {
        const align = typeof opts.scroll === "string" ? opts.scroll : "center";
        await this.waitForNodeReady(key);
        this.scrollToKey(key, align);
      }
    },
    // get ancestor keys from root -> parent of key
    getAncestorKeys(key) {
      const pm =
        (this.maps && this.maps.parentMap) ||
        this.buildMaps(this.data).parentMap;
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
      const n =
        this.maps && this.maps.nodesMap ? this.maps.nodesMap[key] : null;
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
