<template>
  <div class="outline-panel">
    <div v-if="loading" class="loading">加载目录中...</div>
    <div v-else>
      <Tree
        :data="treeData"
        :props="treeProps"
        :default-expand-all="true"
        :active-key="activeKey"
        @select="onTreeSelect"
      />
    </div>
  </div>
</template>

<script>
import Tree from "../Tree/index.vue";

export default {
  name: 'OutlinePanel',
  components: { Tree },
  props: {
    getOutline: { type: Function, required: true },
    navigateToDestination: { type: Function, required: true },
  },
  data() {
    return {
      loading: false,
      outline: [],
      treeData: [],
      activeKey: null,
      treeProps: { key: 'key', label: 'title', children: 'items' },
    };
  },
  async mounted() {
    this.loading = true;
    try {
      const data = await this.getOutline();
      this.outline = Array.isArray(data) ? data : [];
      this.treeData = this.buildTreeData(this.outline);
      console.log('[Demo1] OutlinePanel loaded, nodes =', this.treeData.length);
    } finally {
      this.loading = false;
    }
  },
  methods: {
    async onTreeSelect(node) {
      console.log('[Demo1] OutlinePanel.select', node && { key: node.key, title: node.title, hasDest: !!(node && node.dest) });
      if (node) this.activeKey = node.key;
      if (node && node.dest) {
        await this.navigateToDestination(node.dest);
        this.$emit('selected', node);
      }
    },
    buildTreeData(list, parentKey = '') {
      const out = [];
      (list || []).forEach((item, idx) => {
        const key = parentKey ? parentKey + '-' + (idx + 1) : String(idx + 1);
        out.push({
          key,
          title: item && item.title != null ? item.title : '无标题',
          dest: item && item.dest,
          items: this.buildTreeData(item && item.items, key),
        });
      });
      return out;
    },
  },
};
</script>

<style scoped>
.outline-panel { height: 100%; }
.loading { color: #999; padding: 12px; }
</style>

