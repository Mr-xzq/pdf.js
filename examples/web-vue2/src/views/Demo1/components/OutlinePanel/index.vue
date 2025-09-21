<template>
  <div class="outline-panel">
    <div v-if="loading" class="loading">加载目录中...</div>
    <div v-else>
      <Tree
        ref="tree"
        :data="treeData"
        :props="treeProps"
        :default-expand-all="true"
        :active-key="activeKey"
        :expanded-keys.sync="expandedKeys"
        @select="onTreeSelect"
      />
    </div>
  </div>
</template>

<script>
import Tree from "../Tree/index.vue";

export default {
  name: "OutlinePanel",
  components: { Tree },
  props: {
    getOutline: { type: Function, required: true },
    navigateToDestination: { type: Function, required: true },
    // 新增：用于根据 dest 解析页码（由 PdfReader 提供）
    resolveDestToPageNumber: { type: Function, required: true },
    // 新增：外部传入当前页，实现与目录的双向绑定
    currentPage: { type: Number, default: 1 },
  },
  data() {
    return {
      loading: false,
      outline: [],
      treeData: [],
      activeKey: null,
      treeProps: { key: "key", label: "title", children: "items" },
      // 可见 / 待同步
      visible: false,
      pendingActiveKey: null,
      // 显示展开态（配合 Tree 的 .sync）
      expandedKeys: [],
      // 映射：页码 -> 最佳节点 key（更深层优先）
      pageToKeyMap: Object.create(null),
      pageMapReady: false,
    };
  },
  async mounted() {
    this.loading = true;
    try {
      const data = await this.getOutline();
      this.outline = Array.isArray(data) ? data : [];
      this.treeData = this.buildTreeData(this.outline);
      console.log("[Demo1] OutlinePanel loaded, nodes =", this.treeData.length);
      await this.ensurePageMapOnce();
      // 初始化时尝试根据 currentPage 高亮
      let initKey = this.pickKeyForPageSafe(this.currentPage);
      if (initKey) {
        initKey = await this.normalizeKeyForDom(initKey);
        this.activeKey = initKey;
      }
    } finally {
      this.loading = false;
    }
  },
  watch: {
    // 在外部或内部变更 activeKey 时，根据可见性与就绪时机滚动到位
    activeKey(n) {
      if (n == null) return;
      if (!this.visible) {
        this.pendingActiveKey = n;
      } else {
        this.$nextTick(async () => {
          await this.activateAndScroll(n, "center");
        });
      }
    },
    // 外部当前页变化：自动匹配对应目录节点
    async currentPage(n) {
      if (!Number.isFinite(n)) return;
      await this.ensurePageMapOnce();
      const key = this.pickKeyForPageSafe(n);
      if (!key) return;
      if (!this.visible) {
        // 不可见时只记录，等 opened 再统一滚动
        this.activeKey = key;
        this.pendingActiveKey = key;
      } else {
        // 可见时直接通过 Tree 的 activate 完成展开+高亮+滚动
        this.activeKey = key;
        await this.$nextTick();
        await this.activateAndScroll(key, "center");
      }
    },
  },
  methods: {
    async onTreeSelect(node) {
      console.log(
        "[Demo1] OutlinePanel.select",
        node && {
          key: node.key,
          title: node.title,
          hasDest: !!(node && node.dest),
        }
      );
      if (node) this.activeKey = node.key;
      if (node && node.dest) {
        await this.navigateToDestination(node.dest);
        this.$emit("selected", node);
      }
    },
    onParentOpened() {
      this.visible = true;
      this.$nextTick(async () => {
        await this.ensurePageMapOnce();
        const k =
          this.pendingActiveKey != null
            ? this.pendingActiveKey
            : this.activeKey;
        if (k != null) {
          await this.activateAndScroll(k, "center");
          this.pendingActiveKey = null;
        }
      });
    },
    onParentClosed() {
      this.visible = false;
    },
    // 构建页码 -> 最佳节点 key 的映射（仅构建一次）
    async ensurePageMapOnce() {
      if (this.pageMapReady) return;
      const map = Object.create(null);
      const depthMap = Object.create(null);
      const resolver = this.resolveDestToPageNumber;
      const walk = async (nodes, depth = 0) => {
        for (const n of nodes || []) {
          // 解析当前节点页码
          let page = null;
          try {
            if (n && n.dest) page = await resolver(n.dest);
          } catch (_) {}
          if (Number.isInteger(page) && page > 0) {
            const prevDepth = depthMap[page] ?? -1;
            if (depth > prevDepth) {
              map[page] = n.key;
              depthMap[page] = depth;
            }
          }
          // 递归子节点
          if (n && n.items && n.items.length) {
            await walk(n.items, depth + 1);
          }
        }
      };
      await walk(this.treeData, 0);
      this.pageToKeyMap = map;
      this.pageMapReady = true;
    },
    // 安全：page→key（支持“就近前驱”回退）
    pickKeyForPageSafe(pageNumber) {
      if (!this.pageMapReady) return null;
      const map = this.pageToKeyMap || {};
      const direct = map[pageNumber];
      if (direct) return direct;
      const pages = Object.keys(map)
        .map(n => parseInt(n, 10))
        .sort((a, b) => a - b);
      const prev = pages
        .filter(n => Number.isFinite(n) && n <= pageNumber)
        .pop();
      const target = prev != null ? prev : pages[0];
      return target != null ? map[target] || null : null;
    },
    pickKeyForPage(pageNumber) {
      if (!this.pageMapReady) return null;
      const direct = this.pageToKeyMap?.[pageNumber];
      if (direct) return direct;
      // 未命中：查找小于等于 page 的最大页码
      const pages = Object.keys(this.pageToKeyMap || {})
        .map(n => parseInt(n, 10))
        .filter(n => Number.isFinite(n) && n <= pageNumber);
      if (!pages.length) return null;
      const nearest = Math.max.apply(Math, pages);
      return this.pageToKeyMap[nearest] || null;
    },
    // 等待树节点 DOM 出现（通过 data-key）
    waitForNodeReady(key, maxMs = 2000) {
      const start = Date.now();
      return new Promise(resolve => {
        const check = () => {
          const root = this.$el;
          const el = root && root.querySelector('[data-key="' + key + '"]');
          if (el) return resolve(el);
          if (Date.now() - start > maxMs) return resolve(null);
          this.$nextTick(() => requestAnimationFrame(check));
        };
        check();
      });
    },
    async activateAndScroll(key, align = "center") {
      const tree = this.$refs.tree;
      const useKey = await this.normalizeKeyForDom(key);
      if (tree && typeof tree.activate === "function") {
        await tree.activate(useKey, { scroll: align });
        return;
      }
      // 兜底：无 Tree 方法时走旧的 DOM 定位
      await this.waitForNodeReady(useKey, 1200);
      const root = this.$el;
      const el = root && root.querySelector('[data-key="' + useKey + '"]');
      if (el && typeof el.scrollIntoView === "function") {
        try {
          el.scrollIntoView({
            block: align,
            inline: "nearest",
            behavior: "smooth",
          });
        } catch (_) {
          el.scrollIntoView(true);
        }
      }
    },
    async normalizeKeyForDom(key) {
      // 若 key 对应的 DOM 不存在，则回退到其最近存在的祖先 key
      const root = this.$el;
      const exists = k =>
        !!(root && root.querySelector('[data-key="' + k + '"]'));
      if (exists(key)) return key;
      const tree = this.$refs.tree;
      if (tree && typeof tree.getAncestorKeys === "function") {
        const chain = [...(tree.getAncestorKeys(key) || []), key].reverse();
        for (const k of chain) if (exists(k)) return k;
      }
      return key;
    },
    buildTreeData(list, parentKey = "") {
      const out = [];
      (list || []).forEach((item, idx) => {
        const key = parentKey ? parentKey + "-" + (idx + 1) : String(idx + 1);
        out.push({
          key,
          title: item && item.title != null ? item.title : "无标题",
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
.outline-panel {
  height: 100%;
}
.loading {
  color: #999;
  padding: 12px;
}
</style>
