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
  },
  data() {
    return { expanded: false };
  },
  computed: {
    isLeaf() {
      return (
        this.node.isLeaf || !this.node.children || !this.node.children.length
      );
    },
    isActive() {
      return this.activeKey === this.node.key;
    },
  },
  watch: {
    expandedMap: {
      immediate: true,
      handler() {
        this.expanded = !!(this.expandedMap && this.expandedMap[this.node.key]);
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
    const nodeStyle = {
      paddingLeft: (this.level - 1) * this.indent + "px",
      height: this.itemHeight + "px",
    };

    const labelClass = "tree__label";

    const switcher = this.isLeaf
      ? (
        <div class="tree__toggle tree__toggle--placeholder" aria-hidden="true" />
      )
      : (
        <div
          class={{ tree__toggle: true, "is-expanded": this.expanded }}
          onClick={this.toggle}
        >
          {this.$scopedSlots.switcher
            ? this.$scopedSlots.switcher({
                node: this.node,
                expanded: this.expanded,
                level: this.level,
              })
            : <span class="arrow" />}
        </div>
      );

    const contentSection = (
      <div class="tree__content" onClick={this.select}>

        {this.$scopedSlots.label ? (
          this.$scopedSlots.label({ node: this.node })
        ) : (
          <div class={labelClass} attrs={{ title: this.node.label }}>
            {this.node.label}
          </div>
        )}
        {this.$scopedSlots.suffix
          ? this.$scopedSlots.suffix({ node: this.node })
          : null}
      </div>
    );

    const nodeClass = {
      tree__node: true,
      "tree__node--active": this.isActive,
      ["tree__node--level-" + this.level]: true,
    };

    const nodeMain = (
      <div
        class={nodeClass}
        style={nodeStyle}
        attrs={{ "data-key": this.node.key }}
      >
        {switcher}
        {contentSection}
      </div>
    );

    let children = null;
    if (this.node.children && this.node.children.length) {
      const body = (
        <div ref="wrap" class="tree__children">
          {this.node.children.map(ch =>
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
