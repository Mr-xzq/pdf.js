<template>
  <div class="outline-panel">
    <Tree
      ref="tree"
      :data="treeData"
      :props="treeProps"
      :active-key="activeKey"
      :expanded-keys.sync="expandedKeys"
      label-class-name="custom-label-content"
      @select="onTreeSelect"
    >
      <template #switcher="{ expanded }">
        <van-image class="toggle-tool-item" :src="expanded ? collapseIconUrl : expandIconUrl"></van-image>
      </template>
    </Tree>
  </div>
</template>

<script>
import Tree from "./tree/index.vue";

// 图标
import expandIconUrl from "@/assets/images/complexPdfReader/expand-2x.png";
import collapseIconUrl from "@/assets/images/complexPdfReader/collapse-2x.png";

import { mapActions } from "vuex";

export default {
  name: "OutlinePanel",
  components: { Tree },
  props: {
    // 获取 PDF 大纲数据
    getOutline: { type: Function, required: true },
    // 导航到指定 PDF 目标位置
    navigateToDestination: { type: Function, required: true },
    // 用于将 PDF dest 解析为页码
    resolveDestToPageNumber: { type: Function, required: true },
    // 当前页码，用于实现与目录的双向绑定
    currentPage: { type: Number, default: 1 },
  },
  data() {
    return {
      expandIconUrl,
      collapseIconUrl,
      // 原始大纲数据
      outline: [],
      // 格式化后供 Tree 组件使用的数据
      treeData: [],
      // 当前高亮/选中的节点key
      activeKey: null,
      treeProps: { key: "key", label: "title", children: "items" },
      visible: false,
      // popup 不可见时，待同步的高亮 key
      pendingActiveKey: null,
      // 当前展开的节点 key 列表
      expandedKeys: [],
      // 页码到节点 key 的映射
      pageToKeyMap: {},
      // 映射是否已构建完成
      pageMapReady: false,
    };
  },
  async mounted() {
    await this.runWithLoadPending({
      message: "渲染目录",
      run: async () => {
        const data = await this.getOutline();
        this.outline = Array.isArray(data) ? data : [];
        this.treeData = this.buildTreeData(this.outline);
        await this.ensurePageMapOnce();
        let initKey = this.pickKeyForPageSafe(this.currentPage);
        if (initKey) {
          this.activeKey = initKey;
        }
      },
    });
  },
  watch: {
    // 监听 activeKey 变化，根据 popup 可见性决定是立即滚动还是延迟处理
    activeKey(newVal) {
      if (newVal == null) return;
      if (!this.visible) {
        // popup 不可见时，先缓存 key
        this.pendingActiveKey = newVal;
      } else {
        // popup 可见时，执行滚动
        this.$nextTick(async () => {
          await this.activateAndScroll(newVal);
        });
      }
    },
    // 监听 currentPage 变化，自动匹配对应的目录节点
    async currentPage(newVal) {
      if (!Number.isFinite(newVal)) return;
      await this.ensurePageMapOnce();
      const key = this.pickKeyForPageSafe(newVal);
      if (!key) return;
      if (!this.visible) {
        // popup 不可见时，只记录，等打开时再统一滚动
        this.activeKey = key;
        this.pendingActiveKey = key;
      } else {
        // popup 可见时，立即激活并滚动
        this.activeKey = key;
        await this.$nextTick();
        await this.activateAndScroll(key);
      }
    },
  },
  methods: {
    ...mapActions("complexPdfReader", ["runWithLoadPending"]),
    // 树节点选中事件处理
    async onTreeSelect(node) {
      console.log(
        "OutlinePanel.select",
        node && {
          key: node.key,
          title: node.title,
          hasDest: !!node?.dest,
        }
      );
      if (node) this.activeKey = node.key;
      if (node?.dest) {
        // 导航到 PDF 指定位置
        await this.navigateToDestination(node.dest);
        this.$emit("selected", node);
      }
    },
    // 父容器打开时调用，用于处理可见性
    onParentOpened() {
      this.visible = true;
      this.$nextTick(async () => {
        const needLoad = !this.pageMapReady;
        if (needLoad) {
          await this.runWithLoadPending({
            message: "渲染目录",
            run: () => this.ensurePageMapOnce(),
          });
        } else {
          await this.ensurePageMapOnce();
        }
        const k = this.pendingActiveKey != null ? this.pendingActiveKey : this.activeKey;
        if (k != null) {
          await this.activateAndScroll(k);
          this.pendingActiveKey = null;
        }
      });
    },
    // 父容器关闭时调用
    onParentClosed() {
      this.visible = false;
    },
    // 构建页码到节点 key 的映射
    async ensurePageMapOnce() {
      if (this.pageMapReady) return;
      const map = {};
      const depthMap = {};
      const resolver = this.resolveDestToPageNumber;
      const walk = async (nodes, depth = 0) => {
        for (const node of nodes || []) {
          // 解析当前节点的页码
          let page = null;

          if (node?.dest) page = await resolver(node.dest);

          if (Number.isInteger(page) && page > 0) {
            const prevDepth = depthMap[page] ?? -1;
            // 优先选择更深层次的节点作为最佳匹配
            if (depth > prevDepth) {
              map[page] = node.key;
              depthMap[page] = depth;
            }
          }
          // 递归处理子节点
          if (node?.items?.length) {
            await walk(node.items, depth + 1);
          }
        }
      };
      await walk(this.treeData, 0);
      this.pageToKeyMap = map;
      this.pageMapReady = true;
    },
    // 根据页码找到对应的最佳节点 key（支持“就近前驱”回退）
    pickKeyForPageSafe(pageNumber) {
      if (!this.pageMapReady) return;
      const map = this.pageToKeyMap || {};
      // 页码对应的节点 key
      const direct = map[pageNumber];
      // 如果有直接匹配，直接返回
      if (direct) return direct;
      // 找到小于或等于当前页码的最大页码
      const pages = Object.keys(map)
        .map((n) => parseInt(n, 10))
        .sort((a, b) => a - b);
      const prev = pages.filter((n) => Number.isFinite(n) && n <= pageNumber).pop();
      // 如果没有前驱页码，则使用第一个页码
      const target = prev != null ? prev : pages[0];
      return target != null ? map[target] || null : null;
    },
    // 激活并滚动到指定key的节点
    async activateAndScroll(key) {
      const tree = this.$refs.tree;
      await tree?.activate(key, { scroll: true });
    },
    // 递归构建树形数据
    buildTreeData(list, parentKey = "") {
      const resTreeData = [];
      (list || []).forEach((item, idx) => {
        const key = parentKey ? parentKey + "-" + (idx + 1) : String(idx + 1);
        resTreeData.push({
          key,
          title: item?.title != null ? item.title : "无标题",
          dest: item?.dest,
          items: this.buildTreeData(item?.items, key),
        });
      });
      return resTreeData;
    },
  },
};
</script>

<style lang="less" scoped>
.outline-panel {
  height: 100%;
}
.toggle-tool-item {
  width: 1.36rem;
  height: 1.36rem;
}

/deep/ .custom-label-content {
  font-size: 1rem;
  color: #000000;
  letter-spacing: 0;
  line-height: 2rem;
  font-weight: 400;
}
</style>
