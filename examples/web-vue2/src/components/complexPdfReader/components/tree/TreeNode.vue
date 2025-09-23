<script>
import commonMixin from "./commonMixin";

/*
    TreeNode（递归节点）职责说明：
    - 仅负责单个节点的渲染与交互；不直接管理展开集合
    - 展开状态来自父组件传入的 expandedMap；自身只维护派生状态 expanded
    - 通过 @toggle / @select 向父组件上报交互事件（父负责更新 expandedKeys/activeKey）
    - 使用过渡钩子实现“高度动画”；动画时长/缓动来自样式变量（--tree-duration/--tree-ease）
    - 字段映射 props：{ key, label, children, isLeaf }，避免绑定具体数据结构
  */
export default {
  name: "TreeNode",
  mixins: [commonMixin],
  props: {
    node: { type: Object, required: true },
    level: { type: Number, default: 1 },
    expandedMap: { type: Object, required: true },
    activeKey: [String, Number],
  },
  data() {
    return { expanded: false };
  },
  computed: {
    isLeaf() {
      return this.isLeafNode(this.node);
    },
    isActive() {
      return this.activeKey === this.getKey(this.node);
    },
  },
  watch: {
    expandedMap: {
      immediate: true,
      handler() {
        this.expanded = !!this?.expandedMap[this.getKey(this.node)];
      },
    },
  },
  methods: {
    toggle(e) {
      e && e.stopPropagation();
      if (this.isLeaf) return;
      const ex = !this.expanded;
      this.$emit("toggle", this.node, ex);
    },
    select() {
      this.$emit("select", this.node);
    },
    onEnter(el) {
      // console.log("onEnter");
      // 手动改 height 触发 transiton height 过渡动画
      el.style.height = "0px";
      const h = el.scrollHeight + "px";
      requestAnimationFrame(() => {
        el.style.height = h;
      });
    },
    onAfterEnter(el) {
      el.style.height = "";
    },
    onLeave(el) {
      // console.log("onLeave");
      // 手动改 height 触发 transiton height 过渡动画
      el.style.height = el.scrollHeight + "px";
      requestAnimationFrame(() => {
        el.style.height = "0px";
      });
    },
    onAfterLeave(el) {
      el.style.height = "";
    },
  },
  render() {
    const switcherVnode = this.isLeaf ? (
      <div class="tree__toggle tree__toggle--placeholder" />
    ) : (
      <div
        class={["tree__toggle", { "is-expanded": this.expanded }]}
        onClick={this.toggle}
      >
        {this.$scopedSlots.switcher ? (
          this.$scopedSlots.switcher({
            node: this.node,
            expanded: this.expanded,
            level: this.level,
          })
        ) : (
          <span class="arrow" />
        )}
      </div>
    );

    const contentSectionVnode = (
      <div class="tree__content" onClick={this.select}>
        {this.$scopedSlots.label ? (
          this.$scopedSlots.label({
            node: this.node,
            label: this.getLabel(this.node),
          })
        ) : (
          <div class={["tree__label", this.labelClassName]}>
            {this.getLabel(this.node)}
          </div>
        )}
      </div>
    );

    const mainVnodeConfig = {
      class: [
        "tree__node",
        "tree__node--level-" + this.level,
        {
          "tree__node--active": this.isActive,
        },
      ],
      style: {
        paddingLeft: (this.level - 1) * this.indent + "px",
        height: this.itemHeight + "px",
      },
      attrs: { "data-key": this.getKey(this.node) },
    };

    const mainVnode = (
      <div {...mainVnodeConfig}>
        {switcherVnode}
        {contentSectionVnode}
      </div>
    );

    let childrenVnode = null;
    const list = this.getChildren(this.node);

    if (list && list.length) {
      const expandedChildrenVnode = (
        <div ref="wrap" class="tree__children">
          {list.map(childItem => {
            const treeNodeVnodeConfig = {
              props: {
                ...this.$props,
                node: childItem,
                level: this.level + 1,
              },
              on: {
                toggle: (n, next) => this.$emit("toggle", n, next),
                select: n => this.$emit("select", n),
              },
              scopedSlots: this.$scopedSlots,
            };
            return <tree-node {...treeNodeVnodeConfig} />;
          })}
        </div>
      );
      childrenVnode = this.useTransition ? (
        <transition
          on={{
            enter: this.onEnter,
            "after-enter": this.onAfterEnter,
            leave: this.onLeave,
            "after-leave": this.onAfterLeave,
          }}
        >
          {this.expanded && expandedChildrenVnode}
        </transition>
      ) : (
        this.expanded && expandedChildrenVnode
      );
    }

    return (
      <div class="tree__item">
        {mainVnode}
        {childrenVnode}
      </div>
    );
  },
};
</script>

<style lang="less" scoped>
.tree__node {
  display: flex;
  align-items: center;
  padding: 0 12px 0 8px;
  user-select: none;
  transition: background 120ms ease;

  &--active {
    background: rgba(0, 0, 0, 0.06);
  }
  &:active {
    background: rgba(0, 0, 0, 0.04);
  }
}

.tree__toggle {
  width: 32px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  .arrow {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-right: 2px solid #666;
    border-bottom: 2px solid #666;
    transform: rotate(-45deg);
    transition: transform var(--tree-duration, 160ms)
      var(--tree-ease, cubic-bezier(0.2, 0, 0, 1));
  }

  &.is-expanded {
    .arrow {
      transform: rotate(45deg);
    }
  }

  &.tree__toggle--placeholder {
    pointer-events: none;
  }
}
.tree__content {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
}

.tree__label {
  flex: 1;
  min-width: 0;
}
.tree__children {
  overflow: hidden;
  transition: height var(--tree-duration, 160ms)
    var(--tree-ease, cubic-bezier(0.2, 0, 0, 1));
}
</style>
