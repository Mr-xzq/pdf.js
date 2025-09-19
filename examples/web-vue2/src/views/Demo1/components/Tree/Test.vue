<template>
  <div class="tree-test">
    <div class="ops">
      <van-button size="small" type="primary" @click="expandAll"
        >展开全部</van-button
      >
      <van-button size="small" @click="collapseAll">收起全部</van-button>
      <van-field
        v-model="gotoValue"
        :placeholder="gotoPlaceholder"
        clearable
        input-align="left"
      />
      <van-button size="small" type="info" @click="activate">定位</van-button>
    </div>

    <div class="ops ops-adv">
      <label
        >缩进：
        <input type="number" v-model.number="indent" min="0" step="4" />
      </label>
      <label
        >行高：
        <input type="number" v-model.number="itemHeight" min="24" step="2" />
      </label>
      <label><input type="checkbox" v-model="transition" />动画</label>
      <label
        ><input type="number" v-model.number="transitionDuration" />动画
        duration</label
      >
      <label><input type="checkbox" v-model="selectable" />可选中</label>
      <label
        ><input type="checkbox" v-model="useCustomSwitcher" />自定义开关</label
      >
      <label
        ><input type="checkbox" v-model="useMapped" />使用字段映射 demo</label
      >
    </div>

    <div class="hint" v-if="activePathLabels && activePathLabels.length">
      <span class="crumb" v-for="(lbl, i) in activePathLabels" :key="i">
        <span class="crumb__text">{{ lbl }}</span>
        <van-icon
          v-if="i < activePathLabels.length - 1"
          name="arrow"
          class="crumb__sep"
        />
      </span>
    </div>

    <div class="pane">
      <Tree
        ref="tree"
        :data="treeData"
        :props="treeProps"
        :expanded-keys.sync="expanded"
        :active-key.sync="active"
        :indent="indent"
        :item-height="itemHeight"
        :transition="transition"
        :duration="transitionDuration || 0"
        :selectable="selectable"
      >
        <template v-if="useCustomSwitcher" #switcher="{ expanded }">
          <van-icon
            :name="expanded ? 'arrow-down' : 'arrow'"
            class="switcher-icon"
          />
        </template>
        >
        <template #suffix="{ node }">
          <span v-if="node.meta && node.meta.count" class="badge">{{
            node.meta.count
          }}</span>
          <span v-else-if="node.tips" class="badge">{{ node.tips }}</span>
        </template>
      </Tree>
    </div>
  </div>
</template>

<script>
import Tree from "./index.vue";
export default {
  name: "TreeTest",
  components: { Tree },
  data() {
    return {
      indent: 16,
      itemHeight: 44,
      transition: true,
      transitionDuration: 300,
      selectable: true,
      useCustomSwitcher: true,
      useMapped: false,

      nodes: [
        {
          key: "1",
          label: "根 1",
          meta: { count: 2 },
          children: [
            { key: "1-1", label: "子 1-1" },
            {
              key: "1-2",
              label: "子 1-2",
              children: [
                { key: "1-2-1", label: "子 1-2-1" },
                { key: "1-2-2", label: "子 1-2-2" },
              ],
            },
          ],
        },
        { key: "2", label: "根 2（叶子）", isLeaf: true },
        {
          key: "3",
          label: "一个很长很长很长很长很长很长很长很长很长的节点标题",
          children: [
            { key: "3-1", label: "子 3-1" },
            { key: "3-2", label: "子 3-2" },
            { key: "3-3", label: "子 3-3" },
            { key: "3-4", label: "子 3-4" },
            { key: "3-5", label: "子 3-5" },
            { key: "3-6", label: "子 3-6" },
            { key: "3-7", label: "子 3-7" },
          ],
        },
        {
          key: "4",
          label: "多级嵌套",
          children: [
            {
              key: "4-1",
              label: "子 4-1",
              children: [
                { key: "4-1-2", label: "子 4-1-2" },
                { key: "4-1-3", label: "子 4-1-3" },
                { key: "4-1-4", label: "子 4-1-4" },
              ],
            },
            { key: "4-2", label: "子 4-2" },
            { key: "4-3", label: "子 4-3" },
            { key: "4-4", label: "子 4-4" },
            { key: "4-5", label: "子 4-5" },
            { key: "4-6", label: "子 4-6" },
            { key: "4-7", label: "子 4-7" },
          ],
        },
      ],
      expanded: ["1"],
      active: null,
      gotoKey: "1-2-1",

      // 自定义字段映射用例（id/name/nodes/leaf）
      mappedProps: {
        key: "id",
        label: "name",
        children: "nodes",
        isLeaf: "leaf",
        disabled: "disabled",
      },
      mappedNodes: [
        {
          id: "a",
          name: "部门A",
          nodes: [
            {
              id: "a-1",
              name: "A-1",
              nodes: [{ id: "a-1-1", name: "A-1-1", leaf: true, tips: "leaf" }],
            },
          ],
        },
        { id: "b", name: "部门B", nodes: [{ id: "b-1", name: "B-1" }] },
        { id: "c", name: "节点C(叶子)", leaf: true },
      ],
      gotoId: "a-1-1",
    };
  },
  computed: {
    treeData() {
      return this.useMapped ? this.mappedNodes : this.nodes;
    },
    treeProps() {
      return this.useMapped ? this.mappedProps : undefined;
    },
    gotoValue: {
      get() {
        return this.useMapped ? this.gotoId : this.gotoKey;
      },
      set(v) {
        if (this.useMapped) this.gotoId = v;
        else this.gotoKey = v;
      },
    },
    gotoPlaceholder() {
      return this.useMapped ? "输入 id 定位（自定义映射）" : "输入 key 定位";
    },
    activePathLabels() {
      const k = this.active;
      const t = this.$refs.tree;
      if (!k || !t || !t.getAncestorKeys) return [];
      const keys = [...(t.getAncestorKeys(k) || []), k];
      return keys.map(x =>
        t.getLabelByKey ? t.getLabelByKey(x) || String(x) : String(x)
      );
    },
  },

  methods: {
    expandAll() {
      this.$refs.tree.expandAll();
    },
    collapseAll() {
      this.$refs.tree.collapseAll();
    },

    activate() {
      const k = (this.gotoValue || "").trim();
      if (!k) return;
      // 统一“定位 + 激活”：仅展开祖先，设置 active，并可选滚动
      this.$refs.tree.activate(k, { scroll: "center" });
    },
  },
};
</script>

<style lang="less" scoped>
.tree-test {
  .ops {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
    .van-field {
      flex: 1;
      min-width: 160px;
    }
  }
  .ops-adv {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 12px;
    align-items: center;
    padding: 4px 0 8px;
    label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #666;
    }
    input[type="number"] {
      width: 72px;
    }
    select {
      height: 28px;
    }
    button {
      height: 28px;
    }
  }
  .pane {
    max-height: 320px;
    overflow: auto;
    border: 1px solid #eee;
    border-radius: 6px;
    padding: 4px;

    .switcher-icon {
      font-size: 14px;
      color: #999;
      width: 16px;
    }
    .switcher {
      width: 16px;
      display: inline-block;
      text-align: center;
    }
    .badge {
      margin-left: 8px;
      background: #f0f0f0;
      color: #666;
      border-radius: 10px;
      padding: 0 6px;
      font-size: 12px;
    }
  }
  .hint {
    margin: 8px 0 6px;
    font-size: 12px;
    color: #666;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    .crumb {
      display: inline-flex;
      align-items: center;
    }
    .crumb__text {
      background: #f6f7f9;
      border: 1px solid #eee;
      border-radius: 12px;
      padding: 2px 8px;
    }
    .crumb__sep {
      margin: 0 6px;
      color: #999;
    }
  }
}
</style>
