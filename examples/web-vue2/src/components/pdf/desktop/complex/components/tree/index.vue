<template>
  <div
    class="tree"
    ref="root"
    :style="{
      // 展开，折叠动画时长
      '--tree-duration': duration + 'ms',
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
      <template v-if="$scopedSlots.label" #label="slotProps"><slot name="label" v-bind="slotProps"></slot></template>
    </tree-node>
    <!-- empty slot -->
    <div v-if="!data || !data.length"><slot name="empty"></slot></div>
  </div>
</template>

<script>
import TreeNode from "./TreeNode.vue";
import commonMixin from "./commonMixin";

export default {
  name: "Tree",
  components: { TreeNode },
  // 里面有一些和 TreeNode 通用的方法，比如根据属性映射获取真实数据的 props 等
  mixins: [commonMixin],
  props: {
    // tree 数据源
    data: { type: Array, default: () => [] },
    // 包含所有展开节点 key 的数组（支持 expandedKey.sync）
    expandedKeys: { type: Array, default: () => [] },
    // 初始是否展开全部节点（当未传 expandedKeys 时生效）
    defaultExpandAll: { type: Boolean, default: false },
    // 互斥展开：仅保留一条展开路径；默认关闭
    accordion: { type: Boolean, default: false },
    // 是否允许选择节点（触发 select 事件和 activeKey 更新）
    selectable: { type: Boolean, default: true },
    // 当前选中节点 key（支持 activeKey.sync）
    activeKey: [String, Number],
    // 过渡动画时长（毫秒）
    duration: { type: Number, default: 160 },
  },
  data() {
    // 初始化将 expandedKeys 映射为 {}，方便后面查询对应节点
    const map = {};
    (this.expandedKeys || []).forEach((key) => {
      map[key] = true;
    });
    return {
      // 展开状态映射表：key => true
      expandedMap: map,
      // 快速索引映射：包含节点和父节点映射
      // nodesMap: key => node；parentMap: childKey => parentKey
      maps: { nodesMap: {}, parentMap: {} },
    };
  },
  // 保持展开和选中状态的同步，并在数据变化时重建映射表
  watch: {
    expandedKeys: {
      deep: true,
      handler(newVal) {
        // 将新的 expandedKeys 数组转换为映射表
        const map = {};
        (newVal || []).forEach((key) => {
          map[key] = true;
        });
        this.expandedMap = map;
      },
    },
    activeKey(newVal) {
      // 当 activeKey 变化时，自动展开其所有父节点
      if (newVal !== undefined && newVal !== null) {
        this.expandToKey(newVal);
      }
    },
    data: {
      immediate: true,
      handler() {
        // 重建节点和父节点的映射表
        this.maps = this.buildMaps(this.data);
        // 如果设置了 defaultExpandAll 且 expandedKeys 为空，则自动展开所有节点
        if (this.defaultExpandAll && (!this.expandedKeys || !this.expandedKeys.length)) {
          const all = this.collectAllExpandable(this.data);
          // 触发 expandedKeys 的更新
          this.$emit("update:expandedKeys", all);
        }
      },
    },
  },
  methods: {
    // 递归构建 nodesMap (key -> node) 和 parentMap (childKey -> parentKey)
    buildMaps(list, parent = null, maps = { nodesMap: {}, parentMap: {} }) {
      for (const node of list || []) {
        const key = this.getKey(node);
        if (key != null) {
          maps.nodesMap[key] = node;
          if (parent != null) {
            const pkey = this.getKey(parent);
            if (pkey != null) maps.parentMap[key] = pkey;
          }
        }
        const child = this.getChildren(node);
        if (child?.length) {
          this.buildMaps(child, node, maps);
        }
      }
      return maps;
    },

    // 处理子组件传递的 toggle 事件
    onToggle(node, isExpanded) {
      const key = this.getKey(node);
      // 如果 accordion 为 true
      if (isExpanded && this.accordion) {
        // 只保留“祖先链 + 当前节点”处于展开状态
        const pm = this.maps?.parentMap || this.buildMaps(this.data)?.parentMap;
        const keep = {};
        // 向上追溯父节点，保留祖先链
        let cur = key;
        while (pm[cur]) {
          keep[pm[cur]] = true;
          cur = pm[cur];
        }
        // 保留当前节点
        keep[key] = true;
        const next = Object.keys(keep);
        this.expandedMap = keep;
        // 触发更新事件
        this.$emit("update:expandedKeys", next);
        this.$emit("toggle", node, isExpanded, { expandedKeys: next });
        return;
      }
      // 默认：合并/移除单个展开项
      const map = { ...(this.expandedMap || {}) };
      // 展开
      if (isExpanded) {
        map[key] = true;
      } else {
        // 收起
        delete map[key];
      }
      const next = Object.keys(map);
      this.expandedMap = map;
      // 触发更新事件
      this.$emit("update:expandedKeys", next);
      this.$emit("toggle", node, isExpanded, { expandedKeys: next });
    },

    // 处理子组件传递的 select 事件
    onSelect(node) {
      // 如果不可选择，则直接返回
      if (!this.selectable) return;
      const key = this.getKey(node);
      // 选中时自动展开其所有父节点
      this.expandToKey(key);
      // 触发 activeKey 更新
      this.$emit("update:activeKey", key);
      this.$emit("select", node, { activeKey: key });
    },

    // 递归收集所有可展开节点的 key
    collectAllExpandable(list, acc = []) {
      for (const n of list || []) {
        const child = this.getChildren(n);
        if (child?.length) {
          const key = this.getKey(n);
          if (key != null) acc.push(key);
          this.collectAllExpandable(child, acc);
        }
      }
      return acc;
    },

    // 展开所有节点
    expandAll() {
      const keys = this.collectAllExpandable(this.data);
      const map = {};
      keys.forEach((k) => {
        map[k] = true;
      });
      this.expandedMap = map;
      this.$emit("update:expandedKeys", keys);
    },

    // 收起所有节点
    collapseAll() {
      this.expandedMap = {};
      this.$emit("update:expandedKeys", []);
    },

    // 展开到指定 key 所在的路径
    expandToKey(key) {
      const pm = this.maps?.parentMap || this.buildMaps(this.data)?.parentMap;
      // 单路径模式：仅保留祖先链展开
      if (this.accordion) {
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
      // 默认：在现有展开基础上合并祖先展开
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

    // 滚动到指定 key 对应的节点
    scrollToKey(key) {
      const root = this.$refs.root;
      const el = root?.querySelector(`[data-key="${CSS.escape(String(key))}"]`);
      if (!el || !root) return;
      if (typeof el?.scrollIntoView === "function") {
        el?.scrollIntoView({ behavior: "smooth" });
      }
    },

    // 等待目标节点在 DOM 中存在且动画结束
    waitForNodeReady(key, maxMs = 2000) {
      const root = this.$refs.root;
      const start = Date.now();
      return new Promise((resolve) => {
        const check = () => {
          const el = root?.querySelector(`[data-key="${CSS.escape(String(key))}"]`);
          // 检查节点是否可见
          const present = !!el?.getClientRects?.().length;
          // 检查是否有高度过渡动画正在进行
          const running = root?.querySelector('.tree__children[style*="height"]');
          // 如果节点存在且没有动画运行，或超时
          if ((present && !running) || Date.now() - start > maxMs) {
            resolve();
          } else {
            // 否则，在下一帧继续检查
            requestAnimationFrame(check);
          }
        };
        requestAnimationFrame(check);
      });
    },

    // 展开祖先，设置激活状态，可选：滚动 key 对应的节点
    async activate(key, opts = {}) {
      if (key === undefined || key === null) return;
      this.expandToKey(key);
      this.$emit("update:activeKey", key);
      // 如果需要滚动
      if (opts?.scroll) {
        // 等待节点准备就绪
        await this.waitForNodeReady(key);
        // 滚动到该节点
        this.scrollToKey(key);
      }
    },

    // 获取指定 key 的所有祖先 key
    getAncestorKeys(key) {
      const pm = this.maps?.parentMap || this.buildMaps(this.data)?.parentMap;
      const chain = [];
      // 迭代获取祖先链
      let cur = pm[key];
      while (cur) {
        chain.push(cur);
        cur = pm[cur];
      }
      // 返回从根节点到父节点的顺序
      return chain.reverse();
    },

    // 根据 key 获取节点的 label
    getLabelByKey(key) {
      const node = this.maps?.nodesMap ? this.maps.nodesMap[key] : null;
      return node ? this.getLabel(node) : undefined;
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
