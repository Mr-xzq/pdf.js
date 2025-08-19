# Build System and Distribution

> **Relevant source files**
> * [.eslintrc](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/.eslintrc)
> * [gulpfile.mjs](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/gulpfile.mjs)
> * [package-lock.json](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/package-lock.json)
> * [package.json](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/package.json)
> * [tsconfig.json](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/tsconfig.json)

This document covers the build system and distribution strategy for PDF.js, including the build pipeline architecture, target platforms, bundling process, and output artifacts. The build system transforms source code into optimized packages for different deployment scenarios, from modern browsers to legacy environments and platform-specific integrations.

For information about testing infrastructure that integrates with the build system, see [Testing Infrastructure](/Mr-xzq/pdf.js-4.4.168/6-testing-infrastructure).

## Build System Architecture

PDF.js uses a sophisticated multi-stage build system orchestrated by Gulp with Webpack for module bundling. The system supports multiple target platforms and optimization levels through a combination of preprocessing, transpilation, and bundling.

```mermaid
flowchart TD

Gulp["gulp (gulpfile.mjs)"]
Tasks["Build Tasks"]
Config["Build Configuration"]
Webpack["webpack + webpack-stream"]
BabelLoader["babel-loader"]
Preprocessor["babelPluginPDFJSPreprocessor"]
PostCSS["postcss"]
HTMLPreprocess["HTML Preprocessing"]
Localization["L10n Processing"]
Generic["Generic Build"]
Legacy["Legacy Build"]
Minified["Minified Build"]
Components["Components Build"]
Mozcentral["Mozilla Central"]

Tasks --> Webpack
Tasks --> PostCSS
Tasks --> HTMLPreprocess
Tasks --> Localization
Webpack --> Generic
Webpack --> Legacy
Webpack --> Minified
Webpack --> Components
Webpack --> Mozcentral

subgraph subGraph3 ["Target Generation"]
    Generic
    Legacy
    Minified
    Components
    Mozcentral
end

subgraph subGraph2 ["Asset Processing"]
    PostCSS
    HTMLPreprocess
    Localization
end

subgraph subGraph1 ["Module Bundling"]
    Webpack
    BabelLoader
    Preprocessor
    Webpack --> BabelLoader
    BabelLoader --> Preprocessor
end

subgraph subGraph0 ["Build Orchestration"]
    Gulp
    Tasks
    Config
    Gulp --> Tasks
    Gulp --> Config
end
```

**Build System Core Components**

| Component | File | Purpose |
| --- | --- | --- |
| Build Orchestrator | `gulpfile.mjs` | Main build configuration and task definitions |
| Module Bundler | `webpack` + `webpack-stream` | JavaScript module bundling and optimization |
| Transpiler | `@babel/core` + `babel-loader` | ES6+ to ES5 transformation for legacy support |
| CSS Processor | `postcss` + plugins | CSS optimization and vendor prefixing |
| Preprocessor | `external/builder/babel-plugin-pdfjs-preprocessor.mjs` | Conditional compilation and build defines |

Sources: [gulpfile.mjs L1-L50](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/gulpfile.mjs#L1-L50)

 [package.json L4-L77](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/package.json#L4-L77)

## Build Targets and Distribution Matrix

The build system generates multiple optimized bundles for different deployment scenarios, each with specific browser compatibility and feature requirements.

```mermaid
flowchart TD

Generic["generic"]
GenericLegacy["generic-legacy"]
Components["components"]
ComponentsLegacy["components-legacy"]
Minified["minified"]
MinifiedLegacy["minified-legacy"]
ImageDecoders["image_decoders"]
Mozcentral["mozcentral"]
MainBundle["pdf.mjs"]
WorkerBundle["pdf.worker.mjs"]
SandboxBundle["pdf.sandbox.mjs"]
ScriptingBundle["pdf.scripting.mjs"]
ViewerBundle["viewer.mjs"]
ComponentBundle["pdf_viewer.mjs"]
WebpackAlias["createWebpackAlias()"]
LibraryAlias["libraryAlias"]
ViewerAlias["viewerAlias"]
PlatformStubs["Platform Stubs"]

Generic --> MainBundle
Generic --> WorkerBundle
Generic --> ViewerBundle
Components --> ComponentBundle
Minified --> MainBundle
Mozcentral --> ScriptingBundle
MainBundle --> WebpackAlias
ViewerBundle --> ViewerAlias

subgraph subGraph2 ["Platform Aliases"]
    WebpackAlias
    LibraryAlias
    ViewerAlias
    PlatformStubs
    WebpackAlias --> PlatformStubs
end

subgraph subGraph1 ["Bundle Types"]
    MainBundle
    WorkerBundle
    SandboxBundle
    ScriptingBundle
    ViewerBundle
    ComponentBundle
end

subgraph subGraph0 ["Build Targets"]
    Generic
    GenericLegacy
    Components
    ComponentsLegacy
    Minified
    MinifiedLegacy
    ImageDecoders
    Mozcentral
end
```

**Target Compatibility Matrix**

| Target | Browser Support | Babel Transpilation | Minification | Use Case |
| --- | --- | --- | --- | --- |
| `generic` | Modern browsers (ES2022) | No (`SKIP_BABEL: true`) | No | Development, modern production |
| `generic-legacy` | Older browsers | Yes (`SKIP_BABEL: false`) | No | Legacy browser support |
| `minified` | Modern browsers | No | Yes | CDN distribution |
| `minified-legacy` | Older browsers | Yes | Yes | Legacy CDN distribution |
| `components` | Modern browsers | No | No | Reusable UI components |
| `mozcentral` | Firefox | No | No | Firefox integration |

Sources: [gulpfile.mjs L86-L103](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/gulpfile.mjs#L86-L103)

 [gulpfile.mjs L1068-L1091](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/gulpfile.mjs#L1068-L1091)

 [gulpfile.mjs L1095-L1118](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/gulpfile.mjs#L1095-L1118)

## Bundle Creation Pipeline

Each bundle type follows a specific creation pipeline with platform-specific configurations and optimizations.

### Main Bundle Creation

```mermaid
flowchart TD

SrcPdf["src/pdf.js"]
WebpackConfig["createWebpackConfig()"]
MainFileConfig["mainFileConfig"]
WebpackStream["webpack2Stream()"]
TweakOutput["tweakWebpackOutput()"]
Output["pdf.mjs / pdf.min.mjs"]

SrcPdf --> WebpackStream
WebpackConfig --> MainFileConfig
MainFileConfig --> WebpackStream
WebpackStream --> TweakOutput
TweakOutput --> Output
```

The `createMainBundle()` function orchestrates the main PDF.js library bundle creation:

```javascript
// From gulpfile.mjs:459-470
function createMainBundle(defines) {
  const mainFileConfig = createWebpackConfig(defines, {
    filename: defines.MINIFIED ? "pdf.min.mjs" : "pdf.mjs",
    library: { type: "module" },
  });
  return gulp
    .src("./src/pdf.js", { encoding: false })
    .pipe(webpack2Stream(mainFileConfig))
    .pipe(tweakWebpackOutput("pdfjsLib"));
}
```

### Worker Bundle Creation

```mermaid
flowchart TD

SrcWorker["src/pdf.worker.js"]
WorkerConfig["workerFileConfig"]
WorkerStream["webpack2Stream()"]
WorkerOutput["pdf.worker.mjs"]

SrcWorker --> WorkerStream
WorkerConfig --> WorkerStream
WorkerStream --> WorkerOutput
```

Sources: [gulpfile.mjs L459-L470](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/gulpfile.mjs#L459-L470)

 [gulpfile.mjs L541-L552](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/gulpfile.mjs#L541-L552)

## Platform-Specific Build Configuration

The build system uses webpack aliases to provide platform-specific implementations through the `createWebpackAlias()` function.

```mermaid
flowchart TD

BasicAlias["basicAlias"]
LibraryAlias["libraryAlias"]
ViewerAlias["viewerAlias"]
Chrome["CHROME"]
Generic["GENERIC"]
Mozcentral["MOZCENTRAL"]
Geckoview["GECKOVIEW"]
ChromeCom["web/chromecom.js"]
GenericCom["web/genericcom.js"]
FirefoxCom["web/firefoxcom.js"]
Stubs["web/stubs-geckoview.js"]

Chrome --> ChromeCom
Generic --> GenericCom
Mozcentral --> FirefoxCom
Geckoview --> Stubs

subgraph subGraph2 ["Implementation Files"]
    ChromeCom
    GenericCom
    FirefoxCom
    Stubs
end

subgraph subGraph1 ["Platform Defines"]
    Chrome
    Generic
    Mozcentral
    Geckoview
end

subgraph subGraph0 ["Alias Categories"]
    BasicAlias
    LibraryAlias
    ViewerAlias
    BasicAlias --> LibraryAlias
    LibraryAlias --> ViewerAlias
end
```

**Platform Alias Resolution**

| Alias Key | Chrome | Generic | Mozilla Central |
| --- | --- | --- | --- |
| `web-external_services` | `web/chromecom.js` | `web/genericcom.js` | `web/firefoxcom.js` |
| `web-preferences` | `web/chromecom.js` | `web/genericcom.js` | `web/firefoxcom.js` |
| `web-null_l10n` | `web/l10n.js` | `web/genericl10n.js` | `web/l10n.js` |
| `display-fetch_stream` | `src/display/fetch_stream.js` | `src/display/fetch_stream.js` | `src/display/stubs.js` |

Sources: [gulpfile.mjs L189-L268](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/gulpfile.mjs#L189-L268)

 [gulpfile.mjs L224-L261](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/gulpfile.mjs#L224-L261)

## Build Defines and Preprocessing

The build system uses conditional compilation through build defines to customize functionality for different targets.

### Build Defines Object

```mermaid
flowchart TD

BundleVersion["BUNDLE_VERSION"]
BundleCommit["BUNDLE_BUILD"]
BrowserPrefs["BROWSER_PREFERENCES"]
DefaultPrefs["DEFAULT_PREFERENCES"]
SkipBabel["SKIP_BABEL: true"]
Testing["TESTING: undefined"]
Generic["GENERIC: false"]
Mozcentral["MOZCENTRAL: false"]
Chrome["CHROME: false"]
Minified["MINIFIED: false"]
BaseDefines["DEFINES (base)"]
TargetDefines["Target-specific defines"]
BundleDefines["bundleDefines"]
Preprocessor["babelPluginPDFJSPreprocessor"]

BaseDefines --> BundleDefines
TargetDefines --> BundleDefines
BundleDefines --> Preprocessor

subgraph subGraph1 ["Runtime Defines"]
    BundleVersion
    BundleCommit
    BrowserPrefs
    DefaultPrefs
end

subgraph subGraph0 ["Base Defines"]
    SkipBabel
    Testing
    Generic
    Mozcentral
    Chrome
    Minified
end
```

**Core Build Defines**

| Define | Purpose | Values |
| --- | --- | --- |
| `SKIP_BABEL` | Controls Babel transpilation | `true` (modern), `false` (legacy) |
| `GENERIC` | Generic web viewer build | `true`/`false` |
| `MOZCENTRAL` | Mozilla Firefox integration | `true`/`false` |
| `CHROME` | Chrome extension build | `true`/`false` |
| `MINIFIED` | Production minification | `true`/`false` |
| `COMPONENTS` | Reusable components build | `true`/`false` |

Sources: [gulpfile.mjs L111-L123](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/gulpfile.mjs#L111-L123)

 [gulpfile.mjs L283-L295](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/gulpfile.mjs#L283-L295)

## CSS and Asset Processing Pipeline

The build system processes CSS and other assets through multiple transformation stages.

```mermaid
flowchart TD

SourceHTML["web/viewer.html"]
PreprocessHTML["preprocessHTML()"]
OutputHTML["viewer.html"]
SourceCSS["web/viewer.css"]
PreprocessCSS["preprocessCSS()"]
PostCSS["postcss()"]
AutoPrefixer["autoprefixer"]
OutputCSS["viewer.css"]
DirPseudo["postcssDirPseudoClass"]
DiscardComments["discardCommentsCSS"]
Nesting["postcssNesting"]
DarkTheme["postcssDarkThemeClass"]

PostCSS --> DirPseudo
PostCSS --> DiscardComments
PostCSS --> Nesting
PostCSS --> DarkTheme

subgraph subGraph1 ["PostCSS Plugins"]
    DirPseudo
    DiscardComments
    Nesting
    DarkTheme
end

subgraph subGraph0 ["CSS Processing"]
    SourceCSS
    PreprocessCSS
    PostCSS
    AutoPrefixer
    OutputCSS
    SourceCSS --> PreprocessCSS
    PreprocessCSS --> PostCSS
    PostCSS --> AutoPrefixer
    AutoPrefixer --> OutputCSS
end

subgraph subGraph2 ["HTML Processing"]
    SourceHTML
    PreprocessHTML
    OutputHTML
    SourceHTML --> PreprocessHTML
    PreprocessHTML --> OutputHTML
end
```

Sources: [gulpfile.mjs L989-L997](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/gulpfile.mjs#L989-L997)

 [gulpfile.mjs L1012-L1020](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/gulpfile.mjs#L1012-L1020)

 [gulpfile.mjs L1048-L1058](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/gulpfile.mjs#L1048-L1058)

## Localization Build Process

The localization system processes FTL (Fluent) files for internationalization support.

```mermaid
flowchart TD

L10nDir["l10n/*/viewer.ftl"]
LocaleTask["gulp.task('locale')"]
ViewerOutput["viewerOutput object"]
LocaleJSON["web/locale/locale.json"]
CopyFTL["Copy FTL files"]
CheckDir["checkDir()"]
ValidateLocale["Locale validation"]
CreateMapping["Create locale mapping"]

L10nDir --> LocaleTask
LocaleTask --> ViewerOutput
ViewerOutput --> LocaleJSON
LocaleTask --> CopyFTL
LocaleTask --> CheckDir

subgraph subGraph0 ["Locale Processing"]
    CheckDir
    ValidateLocale
    CreateMapping
    CheckDir --> ValidateLocale
    ValidateLocale --> CreateMapping
end
```

The locale task processes localization files:

* Scans `l10n/` directory for locale folders
* Validates locale names against pattern `/^[a-z]<FileRef file-url="https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/a-z" undefined  file-path="a-z">Hii</FileRef>?(-[A-Z][A-Z])?$/`
* Creates mapping from lowercase locale codes to FTL file paths
* Copies FTL files to `web/locale/` directory

Sources: [gulpfile.mjs L914-L960](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/gulpfile.mjs#L914-L960)

 [gulpfile.mjs L923-L946](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/gulpfile.mjs#L923-L946)

## Distribution Artifacts

The build system generates structured output directories for different distribution channels.

### Output Directory Structure

```mermaid
flowchart TD

BuildDir["build/"]
Generic["generic/"]
GenericLegacy["generic-legacy/"]
Components["components/"]
Minified["minified/"]
Mozcentral["mozcentral/"]
Dist["dist/"]
JSBundles["*.mjs files"]
CSSFiles["*.css files"]
HTMLFiles["*.html files"]
Assets["Images, fonts, cmaps"]
SourceMaps["*.map files"]

BuildDir --> Generic
BuildDir --> GenericLegacy
BuildDir --> Components
BuildDir --> Minified
BuildDir --> Mozcentral
BuildDir --> Dist
Generic --> JSBundles
Generic --> CSSFiles
Generic --> HTMLFiles
Generic --> Assets
Generic --> SourceMaps

subgraph subGraph1 ["Artifact Types"]
    JSBundles
    CSSFiles
    HTMLFiles
    Assets
    SourceMaps
end

subgraph subGraph0 ["Target Directories"]
    Generic
    GenericLegacy
    Components
    Minified
    Mozcentral
    Dist
end
```

**Distribution Artifacts by Target**

| Directory | Contents | Purpose |
| --- | --- | --- |
| `build/generic/` | Complete viewer application | Modern browser deployment |
| `build/components/` | Reusable PDF viewer components | Integration into other applications |
| `build/minified/` | Optimized production builds | CDN distribution |
| `build/dist/` | NPM package structure | Node.js distribution |
| `build/mozcentral/` | Firefox-specific builds | Mozilla Central integration |

Sources: [gulpfile.mjs L53-L82](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/gulpfile.mjs#L53-L82)

 [gulpfile.mjs L1022-L1064](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/gulpfile.mjs#L1022-L1064)

## Version and Build Number Generation

The build system automatically generates version information from Git repository state.

```mermaid
flowchart TD

GitLog["git log"]
BuildNumber["Build Number Calculation"]
GitCommit["git log -n 1"]
VersionJSON["version.json"]
BaseVersion["config.baseVersion"]
CommitCount["Commit count since base"]
CommitHash["Current commit hash"]
VersionPrefix["config.versionPrefix"]

GitLog --> BuildNumber
GitCommit --> VersionJSON
BuildNumber --> VersionJSON
BaseVersion --> BuildNumber
CommitCount --> VersionJSON
CommitHash --> VersionJSON
VersionPrefix --> VersionJSON

subgraph subGraph0 ["Version Components"]
    BaseVersion
    CommitCount
    CommitHash
    VersionPrefix
end
```

The `createBuildNumber()` function generates version information by:

1. Counting commits since `config.baseVersion` using `git log --format=oneline`
2. Getting current commit hash with `git log --format="%h" -n 1`
3. Creating version string: `config.versionPrefix + buildNumber`
4. Writing `version.json` with version, build number, and commit hash

Sources: [gulpfile.mjs L777-L821](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/gulpfile.mjs#L777-L821)

 [gulpfile.mjs L782-L820](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/gulpfile.mjs#L782-L820)