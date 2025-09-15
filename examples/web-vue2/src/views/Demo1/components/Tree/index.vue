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
      :key="n.key"
      :node="n"
      :level="1"
      :expanded-map="expandedMap"
      :active-key="activeKey"
      :indent="indent"
      :item-height="itemHeight"
      :use-transition="transition"
      :duration="duration"
      :easing="easing"
      @toggle="onToggle"
      @select="onSelect"
    >
      <template v-if="$scopedSlots.switcher" #switcher="slotProps"><slot name="switcher" v-bind="slotProps" /></template>

      <template #label="slotProps"
        ><slot name="label" v-bind="slotProps">{{ slotProps.node.label }}</slot></template
      >
      <template #suffix="slotProps"><slot name="suffix" v-bind="slotProps" /></template>
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
  },
  data() {
    const m = Object.create(null);
    (this.expandedKeys || []).forEach(k => { m[k] = true; });
    return { expandedMap: m };
  },
  watch: {
    expandedKeys: {
      deep: true,
      handler(v) {
        const m = Object.create(null);
        (v || []).forEach(k => { m[k] = true; });
        this.expandedMap = m;
      },
    },
    data: {
      immediate: true,
      handler() {
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
        flashHighlight: this.flashHighlight,
      },
    });
  },
  methods: {
    onToggle(node, ex) {
      const map = { ...(this.expandedMap || {}) };
      if (ex) map[node.key] = true; else delete map[node.key];
      const next = Object.keys(map);
      this.expandedMap = map;
      this.$emit("update:expandedKeys", next);
      this.$emit("toggle", node, ex, { expandedKeys: next });
    },
    onSelect(node) {
      if (!this.selectable) return;
      const k = node.key;
      this.$emit("update:activeKey", k);
      this.$emit("select", node, { activeKey: k });
    },
    collectAllExpandable(list, acc = []) {
      for (const n of list || []) {
        if (n.children && n.children.length)
          acc.push(n.key), this.collectAllExpandable(n.children, acc);
      }
      return acc;
    },
    buildParentMap(list, parent = null, map = {}) {
      for (const n of list || []) {
        if (parent) map[n.key] = parent.key;
        if (n.children) this.buildParentMap(n.children, n, map);
      }
      return map;
    },
    expandAll() {
      const keys = this.collectAllExpandable(this.data);
      const m = Object.create(null);
      keys.forEach(k => { m[k] = true; });
      this.expandedMap = m;
      this.$emit("update:expandedKeys", keys);
    },
    collapseAll() {
      this.expandedMap = Object.create(null);
      this.$emit("update:expandedKeys", []);
    },
    expandToKey(key) {
      const pm = this.buildParentMap(this.data);
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
    flashHighlight(key, ms = 800) {
      const root = this.$refs.root;
      const el =
        root && root.querySelector(`[data-key="${CSS.escape(String(key))}"]`);
      if (!el) return;
      el.classList.add("tree__node--flash");
      setTimeout(
        () => el && el.classList && el.classList.remove("tree__node--flash"),
        ms
      );
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
