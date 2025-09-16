<script>
export default {
  name: "TreeNode",
  props: {
    node: { type: Object, required: true },
    level: { type: Number, default: 1 },
    expandedMap: { type: Object, required: true },
    activeKey: [String, Number],
    indent: { type: Number, default: 16 },
    itemHeight: { type: Number, default: 44 },
    useTransition: { type: Boolean, default: true },
    duration: { type: Number, default: 250 },
    easing: { type: String, default: "cubic-bezier(0.2,0,0,1)" },
    // 字段映射
    props: {
      type: Object,
      default: () => ({
        key: "key",
        label: "label",
        children: "children",
        disabled: "disabled",
        isLeaf: "isLeaf",
      }),
    },
  },
  data() {
    return { expanded: false };
  },
  computed: {
    isLeaf() {
      return this.getIsLeaf(this.node);
    },
    isActive() {
      return this.activeKey === this.getKey(this.node);
    },
  },
  watch: {
    expandedMap: {
      immediate: true,
      handler() {
        this.expanded = !!(
          this.expandedMap && this.expandedMap[this.getKey(this.node)]
        );
      },
    },
  },
  methods: {
    // mapping helpers
    getKey(n) {
      const kf = (this.props && this.props.key) || "key";
      return n && n[kf];
    },
    getChildren(n) {
      const cf = (this.props && this.props.children) || "children";
      return (n && n[cf]) || [];
    },
    getLabel(n) {
      const lf = (this.props && this.props.label) || "label";
      return n ? n[lf] : undefined;
    },
    getIsLeaf(n) {
      const lf = (this.props && this.props.isLeaf) || "isLeaf";
      const ch = this.getChildren(n);
      return !!(n && (n[lf] || !ch || ch.length === 0));
    },

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
      console.log("onEnter");
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
      console.log("onLeave");
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
          this.$scopedSlots.label({ node: this.node })
        ) : (
          <div class="tree__label" attrs={{ title: this.getLabel(this.node) }}>
            {this.getLabel(this.node)}
          </div>
        )}
        {this.$scopedSlots.suffix &&
          this.$scopedSlots.suffix({ node: this.node })}
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
