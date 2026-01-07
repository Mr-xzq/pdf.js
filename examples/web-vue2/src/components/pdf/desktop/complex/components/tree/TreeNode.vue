<script>
import commonMixin from "./commonMixin";

// TreeNode (递归节点): 负责单个节点的渲染与交互
export default {
  name: "TreeNode",
  // 里面有一些和 Tree 通用的方法，比如根据属性映射获取真实数据的 props 等
  mixins: [commonMixin],
  props: {
    // 当前节点数据对象
    node: { type: Object, required: true },
    // 当前节点的层级，默认为 1
    level: { type: Number, default: 1 },
    // 展开状态的映射表
    expandedMap: { type: Object, required: true },
    // 当前激活（选中）节点的 key
    activeKey: [String, Number],
  },
  data() {
    return {
      // 当前节点的展开状态（从 expandedMap 获取，用于内部控制）
      expanded: false,
    };
  },
  computed: {
    // 判断是否为叶子节点 (没有子节点)
    isLeaf() {
      return this.isLeafNode(this.node);
    },
    // 判断当前节点是否为激活（选中）状态
    isActive() {
      return this.activeKey === this.getKey(this.node);
    },
  },
  watch: {
    expandedMap: {
      immediate: true,
      handler() {
        // 根据传入的 expandedMap 更新内部的 expanded 状态
        this.expanded = !!this?.expandedMap[this.getKey(this.node)];
      },
    },
  },
  methods: {
    // 切换节点的展开/收起状态
    toggle(e) {
      // 阻止事件冒泡
      e?.stopPropagation();
      // 如果是叶子节点，则不能切换，直接返回
      if (this.isLeaf) return;
      const isExpanded = !this.expanded;
      // 传递当前节点和新的展开状态
      this.$emit("toggle", this.node, isExpanded);
    },
    // 选中当前节点
    select() {
      this.$emit("select", this.node);
    },
    // 动画过渡钩子函数
    // 节点进入前的钩子 (展开动画开始)
    onEnter(el) {
      // 手动改 height 触发 css transiton height 过渡动画
      el.style.height = "0px";
      // 获取子节点容器的实际高度
      const h = el.scrollHeight + "px";
      // 确保在下一帧更新高度，触发过渡
      requestAnimationFrame(() => {
        el.style.height = h;
      });
    },
    // 节点进入后的钩子 (展开动画结束)
    onAfterEnter(el) {
      // 动画结束后，清除 onEnter 中手动设置的高度样式，让其由内容撑开，避免布局问题
      el.style.height = "";
    },
    // 节点离开前的钩子 (收起动画开始)
    onLeave(el) {
      // 动画开始前，将高度设为实际高度
      el.style.height = el.scrollHeight + "px";
      // 确保在下一帧将高度设为 0，触发过渡
      requestAnimationFrame(() => {
        el.style.height = "0px";
      });
    },
    // 节点离开后的钩子 (收起动画结束)
    onAfterLeave(el) {
      // 动画结束后，清除高度样式
      el.style.height = "";
    },
  },
  render() {
    // 渲染切换图标 (展开/收起箭头) 或占位符
    const switcherVnode = this.isLeaf ? (
      // 如果是叶子节点，显示一个不可点击的占位符
      <div class="tree__toggle tree__toggle--placeholder" />
    ) : (
      // 如果不是叶子节点，显示可点击的切换图标
      <div class={["tree__toggle", { "is-expanded": this.expanded }]} onClick={this.toggle}>
        {this.$scopedSlots.switcher ? (
          this.$scopedSlots.switcher({
            node: this.node,
            expanded: this.expanded,
            level: this.level,
          })
        ) : (
          // 没有 switcher 插槽就渲染默认的箭头图标
          <span class="arrow" />
        )}
      </div>
    );

    // 渲染节点的主要内容区域 - label
    const contentSectionVnode = (
      <div class="tree__content">
        {this.$scopedSlots.label ? (
          this.$scopedSlots.label({
            node: this.node,
            label: this.getLabel(this.node),
          })
        ) : (
          // 没有 label 插槽就渲染默认的标签文本
          <div class={["tree__label", this.labelClassName]}>{this.getLabel(this.node)}</div>
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
        // 根据层级设置左侧缩进
        paddingLeft: (this.level - 1) * this.indent + "px",
      },
      attrs: { "data-key": this.getKey(this.node) },
      on: {
        click: this.select,
      },
    };

    // 切换图标 + 内容区
    const mainVnode = (
      <div {...mainVnodeConfig}>
        {switcherVnode}
        {contentSectionVnode}
      </div>
    );

    // 当前展开的子节点列表
    let childrenVnode = null;
    // 获取当前节点的子节点列表
    const list = this.getChildren(this.node);

    // 如果存在子节点
    if (list?.length) {
      // 渲染子节点列表容器
      const expandedChildrenVnode = (
        <div ref="wrap" class="tree__children">
          {list.map((childItem) => {
            // 为每个子节点创建一个新的 TreeNode 组件
            const treeNodeVnodeConfig = {
              props: {
                // 当前从父组件传递的 props
                ...this.$props,
                // 传入子节点数据，也就是当前要渲染的节点数据
                node: childItem,
                // 层级加 1
                level: this.level + 1,
              },
              on: {
                // 监听子组件的 toggle/select 事件并向父组件传递
                toggle: (n, next) => this.$emit("toggle", n, next),
                select: (n) => this.$emit("select", n),
              },
              // 传递作用域插槽，比如 label，switcher 等
              scopedSlots: this.$scopedSlots,
            };
            // 递归渲染子组件
            return <tree-node {...treeNodeVnodeConfig} />;
          })}
        </div>
      );
      // 根据 useTransition 属性判断是否使用过渡动画
      childrenVnode = this.useTransition ? (
        // 使用 transition 组件绑定动画钩子函数
        <transition
          on={{
            enter: this.onEnter,
            "after-enter": this.onAfterEnter,
            leave: this.onLeave,
            "after-leave": this.onAfterLeave,
          }}
        >
          {/* 只有在 expanded 为 true 时才渲染子节点 */}
          {this.expanded && expandedChildrenVnode}
        </transition>
      ) : (
        // 不使用过渡动画，直接根据 expanded 状态渲染
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
  padding: 8px 12px 8px 8px;
  user-select: none;
  transition: background 120ms ease;
  cursor: pointer;

  &:hover {
    background: rgba(0, 0, 0, 0.02);
  }

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
    transition: transform var(--tree-duration, 160ms) var(--tree-ease, cubic-bezier(0.2, 0, 0, 1));
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
  transition: height var(--tree-duration, 160ms) var(--tree-ease, cubic-bezier(0.2, 0, 0, 1));
}
</style>
