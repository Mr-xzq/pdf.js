# Element Upload Component



## 文件结构

```
packages/upload/
├── src/
│   ├── index.vue      # 主组件，负责整体布局和状态管理
│   ├── upload.vue     # 上传核心组件，处理文件选择和上传逻辑
│   ├── upload-list.vue # 文件列表组件，展示上传文件
│   ├── upload-dragger.vue # 拖拽上传组件
│   └── ajax.js       # 上传请求处理
└── index.js          # 组件入口文件
```

## 核心流程

### 1. 文件选择流程

```
触发选择文件
↓
upload.vue (handleClick)  // 触发文件选择框
↓
handleChange             // 获取选中的文件列表
↓
uploadFiles              // 处理文件列表（检查数量限制，多文件处理）
↓
handleStart             // 通知父组件开始上传
↓
更新文件列表状态         // 将文件状态设置为 ready
```

### 2. 上传流程

```
uploadFiles
↓
upload                  // 开始上传流程
  ├─ 清空 input 值     // 允许重复选择相同文件
  ↓
  beforeUpload         // 可选的上传前处理钩子
  ↓
  post                 // 执行上传请求
    ├─ 创建表单数据    // 构建 FormData
    ├─ 添加额外参数    // 合并用户配置的 data
    ↓
    httpRequest       // 发起上传请求（默认使用 ajax 模块）
      ├─ onProgress   // 上传进度回调
      ├─ onSuccess    // 上传成功回调
      └─ onError      // 上传失败回调
```

### 3. 关键状态流转

```
文件状态变化
ready → uploading → success/fail

父子组件通信
upload.vue (子组件)     index.vue (父组件)
    ↑   开始上传     ↓    管理文件列表
    ↑   上传进度     ↓    更新UI状态
    ↑   上传结果     ↓    触发回调函数
```

### 4. 重要钩子函数

- `beforeUpload`: 上传前置处理
  - 可以处理或替换上传的文件
  - 返回 `false` 可阻止上传
  - 支持返回 Promise

- `onProgress`: 上传进度
  - 参数包含上传百分比
  - 用于更新进度条显示

- `onSuccess/onError`: 上传结果处理
  - 更新文件状态
  - 触发相应的回调函数
  - 更新文件列表

## 核心变量

### uploadFiles 

#### 数据结构
```typescript
interface UploadFile {
  name: string;        // 文件名
  size: number;        // 文件大小
  status: string;      // 状态：'ready' | 'uploading' | 'success' | 'fail'
  percentage: number;  // 上传进度百分比
  uid: string;         // 唯一标识符
  raw: File;          // 原始文件对象
  url?: string;       // 预览URL（图片类型时）
  response?: any;     // 上传成功的响应数据
}
```

#### 状态初始化和更新流程

1. **初始化阶段**
   
   ```
   fileList prop 变化
   ↓
   watch handler 触发
   ↓
   映射为 uploadFiles
   - 添加 uid（如果没有）
   - 设置默认 status 为 'success'
   ```
   
2. **文件选择阶段**
   ```
   handleStart
   ↓
   创建新的文件对象
   - status: 'ready'
   - percentage: 0
   - 生成新的 uid
   ↓
   添加到 uploadFiles
   触发 onChange
   ```

3. **上传阶段**
   ```
   handleProgress
   - status → 'uploading'
   - 更新 percentage
   ↓
   handleSuccess
   - status → 'success'
   - 添加 response
   ↓
   handleError
   - status → 'fail'
   - 从列表移除
   ```

#### 特殊处理

1. **图片类型处理**
   ```
   listType 为 'picture-card' 或 'picture' 时
   ↓
   自动生成预览 URL
   - 使用 URL.createObjectURL
   - 存储在 file.url
   ```

2. **状态维护**
   - 通过 uid 唯一标识每个文件
   - tempIndex 用于生成递增的 uid
   - 文件删除时从数组中移除
   - 组件销毁时释放 URL 对象

#### 父子组件通信

1. **向上通知**
   - onChange: 文件状态变化
   - onProgress: 上传进度
   - onSuccess: 上传成功
   - onError: 上传失败

2. **向下控制**
   - submit: 手动触发上传
   - abort: 取消上传
   - clearFiles: 清空文件列表

## 功能特性

- 支持点击上传和拖拽上传
- 支持单文件和多文件上传
- 支持上传进度显示
- 支持自定义请求头和数据
- 支持上传前校验
- 支持手动上传模式
- 支持上传文件列表管理
- 支持上传失败重试

## 组件属性

| 参数 | 说明 | 类型 | 可选值 | 默认值 |
|------|------|------|------|------|
| action | 必选参数，上传的地址 | string | — | — |
| headers | 设置上传的请求头部 | object | — | — |
| multiple | 是否支持多选文件 | boolean | — | false |
| data | 上传时附带的额外参数 | object | — | — |
| name | 上传的文件字段名 | string | — | 'file' |
| drag | 是否启用拖拽上传 | boolean | — | false |
| withCredentials | 支持发送 cookie 凭证信息 | boolean | — | false |
| autoUpload | 是否在选取文件后立即进行上传 | boolean | — | true |

## 事件

| 事件名称 | 说明 | 回调参数 |
|---------|------|---------|
| on-success | 文件上传成功时的钩子 | (response, file, fileList) |
| on-error | 文件上传失败时的钩子 | (err, file, fileList) |
| on-progress | 文件上传时的钩子 | (event, file, fileList) |
| on-change | 文件状态改变时的钩子 | (file, fileList) |
| before-upload | 上传文件之前的钩子 | (file) |
| before-remove | 删除文件之前的钩子 | (file, fileList) |

## 使用示例

### 基础用法
```vue
<template>
  <el-upload
    action="https://api.example.com/upload"
    :on-success="handleSuccess"
    :on-error="handleError">
    <el-button size="small" type="primary">点击上传</el-button>
  </el-upload>
</template>

<script>
export default {
  methods: {
    handleSuccess(response, file, fileList) {
      console.log('上传成功');
    },
    handleError(err, file, fileList) {
      console.log('上传失败');
    }
  }
}
</script>
```

### 拖拽上传
```vue
<template>
  <el-upload
    action="https://api.example.com/upload"
    drag
    multiple>
    <i class="el-icon-upload"></i>
    <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
  </el-upload>
</template>
```

### 手动上传
```vue
<template>
  <el-upload
    ref="upload"
    action="https://api.example.com/upload"
    :auto-upload="false"
    :on-change="handleChange">
    <el-button slot="trigger" size="small" type="primary">选取文件</el-button>
    <el-button style="margin-left: 10px;" size="small" type="success" @click="submitUpload">上传到服务器</el-button>
  </el-upload>
</template>

<script>
export default {
  methods: {
    submitUpload() {
      this.$refs.upload.submit();
    },
    handleChange(file, fileList) {
      console.log('文件变化');
    }
  }
}
</script>
```

## 方法

| 方法名 | 说明 | 参数 |
|-------|------|------|
| clearFiles | 清空已上传的文件列表 | — |
| abort | 取消上传请求 | (file: fileList中的file对象) |
| submit | 手动上传文件列表 | — |
