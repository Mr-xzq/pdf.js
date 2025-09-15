<template>
  <div class="tree-test">
    <div class="ops">
      <van-button size="small" type="primary" @click="expandAll"
        >展开全部</van-button
      >
      <van-button size="small" @click="collapseAll">收起全部</van-button>
      <van-field
        v-model="gotoKey"
        placeholder="输入 key 定位"
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
      <label><input type="checkbox" v-model="transition" /> 动画</label>
      <label><input type="checkbox" v-model="selectable" /> 可选中</label>
      <label><input type="checkbox" v-model="useCustomSwitcher"/> 自定义开关</label>
      <label
        >激活 key：
        <input v-model="activeInput" placeholder="输入 key" />
        <button @click="activate">激活</button>
      </label>
    </div>

    <div class="pane">
      <Tree
        ref="tree"
        :data="nodes"
        :expanded-keys.sync="expanded"
        :active-key.sync="active"
        :indent="indent"
        :item-height="itemHeight"
        :transition="transition"
        :selectable="selectable"
      >
        <template v-if="useCustomSwitcher" #switcher="{ expanded }">
          <span class="switcher">{{ expanded ? "▼" : "▶" }}</span>
        </template>
        <template #label="{ node }">
          <span>{{ node.label }}</span>
        </template>
        <template #suffix="{ node }">
          <span v-if="node.meta && node.meta.count" class="badge">{{
            node.meta.count
          }}</span>
        </template>
      </Tree>
    </div>

    <div class="pane">
      <Tree :data="[]" :indent="indent">
        <template #empty>自定义空状态：暂无数据</template>
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
      selectable: true,
      useCustomSwitcher: true,
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
          label: "一个很长很长很长的节点标题，测试多行或单行截断策略的表现",
          children: [
            { key: "3-1", label: "子 3-1" },
            { key: "3-2", label: "子 3-2" },
          ],
        },
      ],
      expanded: ["1"],
      active: null,
      activeInput: "",
      gotoKey: "1-2-1",
    };
  },
  methods: {
    expandAll() {
      this.$refs.tree.expandAll();
    },
    collapseAll() {
      this.$refs.tree.collapseAll();
    },

    activate() {
      const k = ((this.activeInput || this.gotoKey) || "").trim();
      if (!k) return;
      // 展开到目标（仅展开祖先，不强制展开该节点的子级），设置激活并滚动与高亮
      this.$refs.tree.expandToKey(k);
      this.active = k;
      this.$refs.tree.scrollToKey(k, "center");
      this.$refs.tree.flashHighlight(k, 900);
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
}
</style>
