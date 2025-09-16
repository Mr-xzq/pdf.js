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
    duration: { type: Number, default: 160 },
    easing: { type: String, default: "cubic-bezier(0.2,0,0,1)" },
    // 字段映射：对齐 element-ui 的 props 习惯
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
      el.style.height = "0px";
      const h = el.scrollHeight + "px";
      void el.offsetHeight;
      el.style.height = h;
    },
    onAfterEnter(el) {
      el.style.height = "";
    },
    onLeave(el) {
      el.style.height = el.scrollHeight + "px";
      void el.offsetHeight;
      el.style.height = "0px";
    },
    onAfterLeave(el) {
      el.style.height = "";
    },
  },
  // 使用 JSX 提升可读性；保留递归处对 this.$options 的引用以避免自引用引入
  render() {
    const labelClass = "tree__label";

    const switcher = this.isLeaf ? (
      <div class="tree__toggle tree__toggle--placeholder" />
    ) : (
      <div
        class={{ tree__toggle: true, "is-expanded": this.expanded }}
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

    const contentSection = (
      <div class="tree__content" onClick={this.select}>
        {this.$scopedSlots.label ? (
          this.$scopedSlots.label({ node: this.node })
        ) : (
          <div class={labelClass} attrs={{ title: this.getLabel(this.node) }}>
            {this.getLabel(this.node)}
          </div>
        )}
        {this.$scopedSlots.suffix
          ? this.$scopedSlots.suffix({ node: this.node })
          : null}
      </div>
    );

    const nodeVnodeConfig = {
      class: {
        tree__node: true,
        "tree__node--active": this.isActive,
        ["tree__node--level-" + this.level]: true,
      },
      style: {
        paddingLeft: (this.level - 1) * this.indent + "px",
        height: this.itemHeight + "px",
      },
      attrs: { "data-key": this.getKey(this.node) },
    };

    const nodeMain = (
      <div {...nodeVnodeConfig}>
        {switcher}
        {contentSection}
      </div>
    );

    let children = null;
    const list = this.getChildren(this.node);
    if (list && list.length) {
      const body = (
        <div ref="wrap" class="tree__children">
          {list.map(ch =>
            this.$createElement(this.$options, {
              props: {
                node: ch,
                level: this.level + 1,
                expandedMap: this.expandedMap,
                activeKey: this.activeKey,
                indent: this.indent,
                itemHeight: this.itemHeight,
                useTransition: this.useTransition,
                duration: this.duration,
                easing: this.easing,
                props: this.props,
              },
              on: {
                toggle: (n, next) => this.$emit("toggle", n, next),
                select: n => this.$emit("select", n),
              },
              scopedSlots: this.$scopedSlots,
            })
          )}
        </div>
      );
      children = this.useTransition ? (
        <transition
          on={{
            enter: this.onEnter,
            "after-enter": this.onAfterEnter,
            leave: this.onLeave,
            "after-leave": this.onAfterLeave,
          }}
        >
          {this.expanded ? body : null}
        </transition>
      ) : this.expanded ? (
        body
      ) : null;
    }

    return (
      <div class="tree__item">
        {nodeMain}
        {children}
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
}
.tree__node--active {
  background: rgba(0, 0, 0, 0.06);
}
.tree__node--flash {
  animation: flashBg var(--tree-duration, 160ms) ease;
}
@keyframes flashBg {
  from {
    background: rgba(24, 144, 255, 0.25);
  }
  to {
    background: transparent;
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
