export default {
  props: {
    // 每一层的缩进像素
    indent: { type: Number, default: 16 },
    // 单个节点行高（影响滚动/过渡计算）
    itemHeight: { type: Number, default: 44 },
    // 是否启用展开/折叠过渡动画
    useTransition: { type: Boolean, default: true },
    // 字段映射（用于兼容不同数据结构）
    props: {
      type: Object,
      default: () => ({
        key: "key", // 节点唯一标识字段
        label: "label", // 节点显示文本字段
        children: "children", // 子节点数组字段
        isLeaf: "isLeaf", // 是否叶子节点字段（为 true 或无 children 视为叶子）
      }),
    },
  },
  methods: {
    getKey(n) {
      const kf = this.props?.key || "key";
      return n && n[kf];
    },
    getChildren(n) {
      const cf = this.props?.children || "children";
      return (n && n[cf]) || [];
    },
    getLabel(n) {
      const lf = this.props?.label || "label";
      return n ? n[lf] : undefined;
    },
    isLeafNode(n) {
      const lf = this.props?.isLeaf || "isLeaf";
      const children = this.getChildren(n);
      return !!(n && (n[lf] || !children || children.length === 0));
    },
  },
};
