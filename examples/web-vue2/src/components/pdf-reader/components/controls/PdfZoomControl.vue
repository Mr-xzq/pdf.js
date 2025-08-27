<template>
  <div class="pdf-zoom-control">
    <!-- 缩小按钮 -->
    <pdf-button
      @click="onZoomOut"
      :disabled="!canZoomOut"
      size="medium"
      round
      class="pdf-zoom-control__out"
    >
      <template #icon>−</template>
    </pdf-button>

    <!-- 缩放比例显示 -->
    <div class="pdf-zoom-control__scale" @click="onScaleClick">
      {{ scalePercent }}%
    </div>

    <!-- 放大按钮 -->
    <pdf-button
      @click="onZoomIn"
      :disabled="!canZoomIn"
      size="medium"
      round
      class="pdf-zoom-control__in"
    >
      <template #icon>+</template>
    </pdf-button>

    <!-- 缩放选择器（可选，点击比例时显示） -->
    <van-popup
      v-model="showScaleSelector"
      position="bottom"
      :style="{ height: '40%' }"
      round
    >
      <div class="pdf-zoom-control__selector">
        <div class="pdf-zoom-control__selector-header">
          <h3>选择缩放比例</h3>
          <van-button
            type="primary"
            size="small"
            @click="showScaleSelector = false"
          >
            确定
          </van-button>
        </div>
        
        <div class="pdf-zoom-control__selector-content">
          <van-grid :column-num="3" :border="false">
            <van-grid-item
              v-for="preset in scalePresets"
              :key="preset.value"
              @click="onPresetScale(preset.value)"
              :class="{ 'active': Math.abs(scale - preset.value) < 0.01 }"
            >
              <div class="preset-item">
                <div class="preset-label">{{ preset.label }}</div>
                <div class="preset-value">{{ Math.round(preset.value * 100) }}%</div>
              </div>
            </van-grid-item>
          </van-grid>
          
          <!-- 自定义缩放 -->
          <div class="pdf-zoom-control__custom">
            <van-field
              v-model="customScale"
              type="number"
              label="自定义"
              placeholder="输入缩放比例"
              @blur="onCustomScaleChange"
              @keyup.enter="onCustomScaleChange"
            >
              <template #button>
                <span>%</span>
              </template>
            </van-field>
          </div>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script>
import PdfButton from '../shared/PdfButton.vue';

export default {
  name: 'PdfZoomControl',

  components: {
    PdfButton
  },

  props: {
    scale: {
      type: Number,
      default: 1.0
    },
    canZoomIn: {
      type: Boolean,
      default: true
    },
    canZoomOut: {
      type: Boolean,
      default: true
    }
  },

  data() {
    return {
      showScaleSelector: false,
      customScale: '',
      scalePresets: [
        { label: '适合宽度', value: 'page-width' },
        { label: '适合页面', value: 'page-fit' },
        { label: '实际大小', value: 1.0 },
        { label: '50%', value: 0.5 },
        { label: '75%', value: 0.75 },
        { label: '125%', value: 1.25 },
        { label: '150%', value: 1.5 },
        { label: '200%', value: 2.0 },
        { label: '300%', value: 3.0 }
      ]
    };
  },

  computed: {
    scalePercent() {
      return Math.round(this.scale * 100);
    }
  },

  methods: {
    onZoomIn() {
      this.$emit('zoom-in');
    },

    onZoomOut() {
      this.$emit('zoom-out');
    },

    onScaleClick() {
      this.showScaleSelector = true;
      this.customScale = this.scalePercent.toString();
    },

    onPresetScale(scaleValue) {
      if (typeof scaleValue === 'string') {
        // 特殊缩放模式（如 page-width, page-fit）
        this.$emit('set-scale-mode', scaleValue);
      } else {
        // 数值缩放
        this.$emit('set-scale', scaleValue);
      }
      this.showScaleSelector = false;
    },

    onCustomScaleChange() {
      const scalePercent = parseInt(this.customScale);
      if (!isNaN(scalePercent) && scalePercent > 0 && scalePercent <= 1000) {
        const scaleValue = scalePercent / 100;
        this.$emit('set-scale', scaleValue);
        this.showScaleSelector = false;
      }
    }
  }
};
</script>

<style lang="less" scoped>
.pdf-zoom-control {
  display: flex;
  align-items: center;
  gap: 8px;

  &__out,
  &__in {
    flex: 0 0 auto;
  }

  &__scale {
    flex: 0 0 auto;
    font-size: 14px;
    color: #333;
    font-weight: 500;
    min-width: 50px;
    text-align: center;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all 0.3s;

    &:hover {
      background: #f5f5f5;
      color: #1890ff;
    }
  }

  &__selector {
    padding: 16px;

    &-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e8e8e8;

      h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 500;
        color: #333;
      }
    }

    &-content {
      .preset-item {
        padding: 12px;
        text-align: center;
        border-radius: 8px;
        transition: all 0.3s;
        cursor: pointer;

        &:hover {
          background: #f5f5f5;
        }

        .preset-label {
          font-size: 14px;
          color: #333;
          margin-bottom: 4px;
        }

        .preset-value {
          font-size: 12px;
          color: #666;
        }
      }

      :deep(.van-grid-item) {
        &.active .preset-item {
          background: #e6f7ff;
          color: #1890ff;

          .preset-label {
            color: #1890ff;
          }

          .preset-value {
            color: #1890ff;
          }
        }
      }
    }
  }

  &__custom {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #e8e8e8;
  }
}

// 紧凑模式（在底部工具栏中使用）
.pdf-bottom-toolbar .pdf-zoom-control {
  gap: 4px;

  &__scale {
    min-width: 45px;
    font-size: 12px;
    padding: 2px 6px;
  }
}

// 平板适配
@media (max-width: 1024px) and (min-width: 769px) {
  .pdf-zoom-control {
    gap: 10px;

    &__scale {
      font-size: 15px;
      min-width: 55px;
      padding: 6px 10px;
    }
  }

  .pdf-bottom-toolbar .pdf-zoom-control {
    gap: 6px;

    &__scale {
      min-width: 50px;
      font-size: 13px;
      padding: 4px 8px;
    }
  }
}

// 移动端适配
@media (max-width: 768px) {
  .pdf-zoom-control {
    gap: 12px;

    &__scale {
      font-size: 16px;
      min-width: 60px;
      padding: 8px 12px;
    }
  }

  .pdf-bottom-toolbar .pdf-zoom-control {
    gap: 6px;

    &__scale {
      min-width: 50px;
      font-size: 14px;
      padding: 4px 8px;
    }
  }
}

// 小屏幕移动端适配
@media (max-width: 480px) {
  .pdf-bottom-toolbar .pdf-zoom-control {
    gap: 4px;

    &__scale {
      min-width: 45px;
      font-size: 13px;
      padding: 2px 6px;
    }
  }
}
</style>
