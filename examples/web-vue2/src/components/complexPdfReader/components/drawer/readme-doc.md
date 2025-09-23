# 移动端 H5 Drawer 组件设计文档（基于 Vant@2 Popup | Vue 2）

> 目标：提供一个轻量、顺手的“抽屉”组件，贴合移动端 H5 触控习惯，基于 Vant@2 的 Popup 实现，新增“手势滑动关闭”能力，并保持 API 简洁可控。

## 1. 组件定位与范围
- 平台：移动端 H5（触控优先）
- 组件名：`drawer`（封装自 `van-popup`）
- 能力范围（本期）：
  - 四向抽屉：left/right/top/bottom
  - 基于 Popup 的遮罩、层级、滚动锁定等
  - 手势“滑动关闭”（支持方向判定、阈值与速度判定）
  - 自定义头/尾区域插槽
- 暂不实现（可后续增强）：
  - 边缘滑动“打开”（open-from-edge）
  - 嵌套抽屉/联动抽屉、吸附态、多层级复杂交互

## 2. 与 Vant Popup 的关系
- 复用 Popup 的：遮罩（overlay）、过渡动画、挂载容器（teleport）、滚动锁定（lockScroll）等。
- 主要增强点：
  - 手势关闭（swipe-to-close）
  - 统一尺寸语义（size）与方向（position）驱动的样式

## 3. API 设计
### 3.1 Props（精简）
- `value: boolean` 抽屉显隐（v-model）
- `position: 'left' | 'right' | 'top' | 'bottom'` 抽屉方位，默认 `right`
- `size: string | number` 尺寸：
  - 水平抽屉（left/right）：宽度，默认 `80vw`
  - 垂直抽屉（top/bottom）：高度，默认 `70vh`
- `swipeToClose: boolean` 是否启用“手势滑动关闭”，默认 `true`

说明：
- 拖拽仅在内容区域（`.drawer__body`）内生效；不支持“边缘拖拽打开”。
- 内部阈值（角度/进度/速度）采用合理默认值，不对外暴露。
- `size` 支持 `px/%/vw/vh` 或数字（像素）。

### 3.2 Events
- `@input(boolean)` / `@update:value(boolean)` 显隐同步（与 v-model 配合）

### 3.3 Methods
（无）

### 3.4 Slots
- `header` 头部区域（常放标题/返回）
- `default` 主体内容
- `footer` 底部操作区（适配安全区）

## 4. 手势交互设计（核心）
- 触发动作：在抽屉“面板区域”按住并沿抽屉“关闭方向”滑动。
  - right 抽屉：向右滑动关闭；left：向左；top：向上；bottom：向下。
- 方向判定：
  - 计算滑动角度，偏角超过 `swipeAngleTolerance` 则判定为“非目标方向”，交由内部滚动处理（不进入关闭手势）。
- 触发条件（二选一满足即关闭）：
  - 位移进度 `progress >= swipeThreshold`（进度=已滑距离/面板尺寸）
  - 或 末次触发时速度 `|velocity| >= swipeVelocity`
- 拖拽体验：
  - 使用 `transform: translate3d(...)` 实时跟随，帧率优先（`will-change: transform`）
  - 拖拽中禁用面板内滚动（`preventDefaultOnDrag` 为 true 时）
  - 松手：满足条件则继续流畅关闭；否则 `snapBack()` 回弹归位
- 取消条件：
  - 多指触控、方向偏移过大、内容滚动优先（如垂直滚动列表与横向关闭手势冲突时）
- 细节建议：
  - 拖拽仅在内容区域（`.drawer__body`）内识别，避免与主体滚动冲突
  - iOS 侧滑返回与左侧抽屉的冲突：不实现“屏幕边缘”打开/关闭，手势仅在面板内部生效

## 5. DOM 结构与样式约定（BEM + Less）
```html
<div class="drawer">
  <van-popup :position="position" v-model="innerVisible" :style="panelStyle" class="drawer__popup">
    <div class="drawer__panel" :class="'is-'+position" ref="panel">
      <div class="drawer__header"><slot name="header"/></div>
      <div class="drawer__body"><slot/></div>
      <div class="drawer__footer"><slot name="footer"/></div>
    </div>
  </van-popup>
</div>
```

### Less 变量（可按主题覆盖）
```less
@drawer-radius: 12px;
@drawer-duration: 300ms;
@drawer-ease: cubic-bezier(0.2, 0, 0, 1);
```

### 基础样式片段（节选）
```less
.drawer__popup { overflow: hidden; }
.drawer__panel {
  display: flex; flex-direction: column; height: 100%; background: #fff;
  will-change: transform;
  &.is-right { border-top-left-radius: @drawer-radius; border-bottom-left-radius: @drawer-radius; }
  &.is-left  { border-top-right-radius: @drawer-radius; border-bottom-right-radius: @drawer-radius; }
  &.is-top   { border-bottom-left-radius: @drawer-radius; border-bottom-right-radius: @drawer-radius; }
  &.is-bottom{ border-top-left-radius: @drawer-radius; border-top-right-radius: @drawer-radius; }
}
.drawer__header { padding: 12px 16px; font-size: 16px; font-weight: 600; }
.drawer__body   { flex: 1; min-height: 0; overflow: auto; -webkit-overflow-scrolling: touch; }
.drawer__footer { padding: 10px 16px env(safe-area-inset-bottom); }
```

## 6. 手势实现要点（Vue 2）
- 监听对象：`panel` 元素（避免监听到遮罩层）
- 事件：优先使用 `touchstart/touchmove/touchend`；无法使用时降级到 `pointerdown/move/up`
- 被动监听：`touchstart` 可被动；`touchmove` 需 `{ passive: false }` 以便 `preventDefault`
- 关键逻辑：
  1) `start`: 记录起点与时间、方向；命中 `dragHandle`（若设）
  2) `move`: 计算 dx/dy、角度、位移进度，更新 `transform`
  3) `end`: 计算速度与进度，判定关闭或回弹
- 关闭时机：通过 `this.$emit('input', false)` 或 `this.close('gesture')`

伪代码（核心判定）：
```js
const size = position === 'left' || position === 'right' ? panel.offsetWidth : panel.offsetHeight;
const distance = clamp(projectAlongAxis(dx, dy, position), 0, size);
const progress = distance / size;
const velocity = (distance - lastDistance) / (now - lastTime);
if (progress >= swipeThreshold || Math.abs(velocity) >= swipeVelocity) close('gesture');
else snapBack();
```

## 7. 与 Vant Popup 的集成方式
- 直接使用 `<van-popup v-model="innerVisible" :position="position" :style="panelStyle">`，`panelStyle` 按 `position/size` 设置宽或高。
- 打开/关闭动画仍由 Popup 控制；拖拽时我们临时覆盖 `transform`。
- 遮罩点击保持 `closeOnClickOverlay` 语义不变，并带上 `reason='overlay'`。

## 8. 使用示例
```vue
<drawer v-model="show" position="right" size="80vw" :swipe-to-close="true">
  <template #header>标题</template>
  <div style="padding: 12px">内容区域</div>
  <template #footer>
    <van-button type="primary" block @click="show=false">完成</van-button>
  </template>
</drawer>
```

## 9. 边界与兼容
- iOS Safari/微信：避免“屏幕左侧边缘”手势与系统返回冲突——仅在面板内识别关闭手势
- Android Chrome：开启 `will-change` 可提升拖拽帧率
- 嵌套滚动：当内容区可滚动且用户明显沿内容滚动方向移动时，优先内容滚动
- RTL 语言：若有需求，以 `position` 语义为准，不自动镜像

## 10. MVP 清单（本期完成标准）
- [x] 基于 Popup 的四向抽屉与基础样式
- [x] 手势关闭（阈值/速度/角度判定 + 回弹）
- [x] v-model 显隐同步
- [x] 插槽：header/default/footer；安全区适配
- [x] 精简 Props：仅 value/position/size/swipeToClose

## 11. 测试建议
- 单元：
  - 方向/角度/进度计算函数（projectAlongAxis/angle/velocity）
  - 关闭判定与回弹判定
- 交互手测：
  - 四方向拖拽关闭/取消回弹
  - 遮罩点击关闭、按钮关闭
  - 内容区滚动与拖拽手势的冲突处理

## 12. 后续增强（可选）
- 开启“从屏幕边缘滑动打开”能力（`openFromEdge` + `edgeWidth`）
- 吸附态（半屏/全屏）与中间态拖拽切换
- 指示条（handle bar）与拖拽提示
- TS 类型与文档示例完善、E2E 自动化测试
