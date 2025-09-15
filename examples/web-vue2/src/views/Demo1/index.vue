<template>
  <div class="demo-1">
    <div class="top-toolbar">
      <div class="right-operate-tool">
        <van-image class="search-tool-item" :src="searchIconUrl"></van-image>
        <van-image
          class="fullscreen-tool-item"
          :src="fullscreenIconUrl"
        ></van-image>
      </div>
    </div>
    <div class="content-area"></div>
    <div class="bottom-toolbar">
      <van-image
        class="thumbnail-tool-item"
        :src="thumbnailIconUrl"
        @click="handleClickThumbnail"
      ></van-image>
      <van-image class="outline-tool-item" :src="outlineIconUrl"></van-image>
      <van-image class="page-flip-tool-item" :src="pageFlipIconUrl"></van-image>
      <van-image
        class="page-flip-audio-tool-item"
        :src="pageFlipAudioIconUrl"
      ></van-image>
      <!--<van-image class="zoom-out-tool-item" :src="zoomOutIconUrl"></van-image>-->
      <van-image class="zoom-in-tool-item" :src="zoomInIconUrl"></van-image>
      <van-image class="auto-play-tool-item" :src="autoPlayIconUrl"></van-image>
      <!--<van-image class="auto-play-tool-item" :src="pauseIconUrl"></van-image>-->
    </div>

    <drawer :is-show.sync="isShowPopup"></drawer>
  </div>
</template>

<script>
// 组件
import Drawer from "./components/Drawer/index.vue";

import fullscreenIconUrl from "@/assets/images/demo1/fullscreen-2x.png";
import searchIconUrl from "@/assets/images/demo1/search-2x.png";
import thumbnailIconUrl from "@/assets/images/demo1/thumbnail-2x.png";
import outlineIconUrl from "@/assets/images/demo1/outline-2x.png";
import pageFlipIconUrl from "@/assets/images/demo1/page-flip-2x.png";
import pageFlipAudioIconUrl from "@/assets/images/demo1/page-flip-audio-2x.png";
import zoomInIconUrl from "@/assets/images/demo1/zoom-in-2x.png";
import zoomOutIconUrl from "@/assets/images/demo1/zoom-out-2x.png";
import autoPlayIconUrl from "@/assets/images/demo1/auto-play-2x.png";
// import pauseIconUrl from "@/assets/images/demo1/pause-2x.png";

export default {
  name: "Demo1",
  components: {
    Drawer,
  },
  data() {
    return {
      // 全屏
      fullscreenIconUrl,
      // 搜索
      searchIconUrl,
      // 缩略图
      thumbnailIconUrl,
      // 目录
      outlineIconUrl,
      // 翻页
      pageFlipIconUrl,
      // 翻页声音
      pageFlipAudioIconUrl,
      // 放大
      zoomInIconUrl,
      // 缩小
      zoomOutIconUrl,
      // 自动播放
      autoPlayIconUrl,
      // 暂停
      // pauseIconUrl,
      isShowPopup: false,
    };
  },
  methods: {
    handleClickThumbnail() {
      this.isShowPopup = !this.isShowPopup;
    },
  },
};
</script>

<style lang="less" scoped>
.demo-1 {
  @top-toolbar-height: 2.73rem;
  @bottom-toolbar-height: 4.14rem;

  position: relative;

  height: 100vh;
  padding-top: @top-toolbar-height;
  padding-bottom: @bottom-toolbar-height;

  background-image: url("@/assets/images/demo1/full-background-2x.jpg");
  background-repeat: no-repeat;
  background-size: 100% 100%;

  .top-toolbar {
    position: absolute;
    top: 0;

    display: flex;
    justify-content: flex-end;

    width: 100%;
    height: @top-toolbar-height;

    opacity: 0.7;
    background-image: linear-gradient(
      180deg,
      #ffffff 0%,
      rgba(255, 255, 255, 0.6) 100%
    );
    box-shadow: 0 0.29rem 0.29rem 0 rgba(0, 0, 0, 0.05);
    border-radius: 0 0 0.57rem 0.57rem;

    .right-operate-tool {
      display: flex;
      align-items: center;
      margin-right: 1.64rem;

      .search-tool-item {
        width: 1.23rem;
        height: 1.42rem;
        margin-right: 2.06rem;
      }

      .fullscreen-tool-item {
        width: 1.46rem;
        height: 1.46rem;
      }
    }
  }

  .content-area {
    height: 100%;
  }

  .bottom-toolbar {
    position: absolute;
    bottom: 0;

    display: flex;
    align-items: center;
    justify-content: space-between;

    width: 100%;
    height: @bottom-toolbar-height;
    padding: 0 2.39rem;

    opacity: 0.7;
    background-image: linear-gradient(180deg, #ffffff 0%, #ffffff 100%);
    box-shadow: 0 -0.29rem 0.29rem 0 rgba(0, 0, 0, 0.05);
    border-radius: 0.43rem 0.43rem 0 0;

    .thumbnail-tool-item {
      width: 1.7rem;
      height: 1.56rem;
    }

    .outline-tool-item {
      width: 1.43rem;
      height: 1.29rem;
    }

    .page-flip-tool-item {
      width: 1.74rem;
      height: 0.68rem;
    }

    .page-flip-audio-tool-item {
      width: 1.21rem;
      height: 1.91rem;
    }

    .zoom-in-tool-item,
    .zoom-out-tool-item {
      width: 1.29rem;
      height: 1.52rem;
    }

    .auto-play-tool-item,
    .pause-tool-item {
      width: 1.5rem;
      height: 1.5rem;
    }
  }
}
</style>
