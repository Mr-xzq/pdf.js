<template>
  <div class="outline-panel">
    <div v-if="loading" class="loading">加载目录中...</div>
    <div v-else>
      <Tree
        :data="treeData"
        :props="treeProps"
        :default-expand-all="true"
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
      treeProps: { key: 'key', label: 'title', children: 'items' },
    };
  },
  async mounted() {
    this.loading = true;
    try {
      const data = await this.getOutline();
      this.outline = Array.isArray(data) ? data : [];
      this.treeData = this.buildTreeData(this.outline);
    } finally {
      this.loading = false;
    }
  },
  methods: {
    onTreeSelect(node) {
      if (node && node.dest) this.navigateToDestination(node.dest);
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

