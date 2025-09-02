# vue2 中使用 render 函数和 jsx 的参考案例

当在 vue 中当渲染结构高度动态、模板表达力受限时（复杂条件、嵌套循环、动态 slot 组合）可以尝试使用 render 函数 + jsx 语法。

但要注意我们时 vue@2 中的 jsx，不要和 react 的 jsx 混为一谈，具体可以参考：
+ https://github.com/vuejs/jsx-vue2/blob/dev/README.md; 
+ https://v2.vuejs.org/v2/guide/render-function;

我们的项目中是基于 vue-cli@5，默认就是集成了 jsx 的开发环境，所以一般不用安装额外依赖和进行额外的配置。

如下是代码案例：

```vue
<script>
import Shape from './shape.vue';
import MarkLine from './markLine.vue';
import { getCanvasStyle, getComponentStyle, getShapeStyle } from '../utils/style';
import { COMPONENT_TYPE, getMaterialByName } from '../components/materials';
import { createNamespacedHelpers } from 'vuex';
import { cloneDeep } from 'lodash';

const { mapState, mapGetters, mapMutations, mapActions } = createNamespacedHelpers('h5Editor');

const initBackgroundSize = {
  width: 375,
  height: 667,
};

export default {
  components: { Shape, MarkLine },
  data() {
    return {
      backgroundImage: null,
      backgroundSize: cloneDeep(initBackgroundSize),
    };
  },
  computed: {
    ...mapState(['canvasRenderComponentData', 'activeComponent', 'canvasStyleData', 'editor']),
    effectiveCanvasStyleData() {
      return cloneDeep(this.canvasStyleData);
    },
    canvasStyle() {
      const baseStyle = getCanvasStyle(this.effectiveCanvasStyleData);
      const { width, height } = this.backgroundSize;
      return {
        ...baseStyle,
        // 增加了一个背景图的样式
        backgroundImage: this.backgroundImage ? `url(${this.backgroundImage})` : 'none',
        backgroundSize: `${width}px ${height}px`,
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      };
    },
  },
  mounted() {
    this.getEditor();
  },
  methods: {
    ...mapMutations(['getEditor', 'setCanvasStyle']),
  },
  render() {
    const { canvasStyle, activeComponent, canvasRenderComponentData } = this;

    const canvasEditorComponentDataObject = {
      style: canvasStyle,
      class: 'editor',
      attrs: { id: 'editor' },
    };

    const shapeComponentElementList = canvasRenderComponentData.map((materialItem, index) => {
      const shapeComponentDataObject = {
        key: materialItem.id,
        style: getShapeStyle(materialItem.style),
        props: {
          active: materialItem.id === (activeComponent || {}).id,
          material: materialItem,
          index,
        },
      };

      const materialComponentDataObject = {
        class: 'component',
        style: getComponentStyle(materialItem.style, ['width', 'height', 'top', 'left', 'rotate']),
        attrs: { id: 'component' + materialItem.id },
        props: {
          material: materialItem,
        },
        on: {},
      };

      const MaterialComponent = getMaterialByName({
        type: COMPONENT_TYPE.COMPONENT,
        name: materialItem.componentName,
      })[COMPONENT_TYPE.COMPONENT];

      return (
        <Shape {...shapeComponentDataObject}>
          <MaterialComponent {...materialComponentDataObject} />
        </Shape>
      );
    });

    return (
      <div {...canvasEditorComponentDataObject}>
        <MarkLine></MarkLine>
        {shapeComponentElementList}
      </div>
    );
  },
};
</script>

<style lang="less" scoped>
.editor {
  position: relative;
  background: #fff;

  .component {
    outline: none;
    width: 100%;
    height: 100%;
  }
}
</style>
```