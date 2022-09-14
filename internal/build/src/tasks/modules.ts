import { rollup } from 'rollup'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import DefineOptions from 'unplugin-vue-define-options/rollup'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import esbuild from 'rollup-plugin-esbuild'
import glob from 'fast-glob'
import { epRoot, excludeFiles, pkgRoot } from '@element-plus/build-utils'
import { generateExternal, writeBundles } from '../utils'
import { ElementPlusAlias } from '../plugins/element-plus-alias'
import { buildConfigEntries, target } from '../build-info'

import type { OutputOptions } from 'rollup'

export const buildModules = async () => {
  /* 入口文件，并排除了node-module,dist等目录*/
  const input = excludeFiles(
    /* 查找文件，工作目录element-plus/packages */
    await glob('**/*.{js,ts,vue}', {
      cwd: pkgRoot,
      absolute: true,
      onlyFiles: true,
    })
  )
  const bundle = await rollup({
    input,
    plugins: [
      ElementPlusAlias(),

      // 在setup语法下，写option语法
      // https://github.com/sxzz/unplugin-vue-macros/blob/HEAD/packages/define-options/README-zh-CN.md
      DefineOptions(),

      // 提供 Vue 3 单文件组件支持
      // https://github.com/vitejs/vite/tree/main/packages/plugin-vue
      vue({
        isProduction: false,
      }),

      // 供 Vue 3 JSX 支持（通过 专用的 Babel 转换插件）
      // https://github.com/vitejs/vite/tree/main/packages/plugin-vue-jsx
      vueJsx(),

      // 处理本地和第三方模块对 node_module的依赖
      // https://github.com/rollup/plugins/tree/master/packages/node-resolve
      nodeResolve({
        extensions: ['.mjs', '.js', '.json', '.ts'],
      }),
      // 转换commonjs ==> esm，（打包过程中，依赖的第三方模块可能是commonjs格式）
      // https://github.com/rollup/plugins/tree/master/packages/commonjs
      commonjs(),

      // 最快的 TS/ESNext ==> ES6 编译器和压缩器
      // https://www.npmjs.com/package/rollup-plugin-esbuild
      esbuild({
        sourceMap: true,
        target,
        loaders: {
          // '.vue' 文件，开启对ts的支持
          '.vue': 'ts',
        },
      }),
    ],
    // generateExternal : 读取package.json-> {dependencies、peerDependencies},将读取到的字段添加到external
    external: await generateExternal({ full: false }),
    treeshake: false,
  })
  await writeBundles(
    bundle,
    buildConfigEntries.map(([module, config]): OutputOptions => {
      return {
        format: config.format,
        dir: config.output.path,
        exports: module === 'cjs' ? 'named' : undefined,
        preserveModules: true,
        preserveModulesRoot: epRoot,
        sourcemap: true,
        entryFileNames: `[name].${config.ext}`,
      }
    })
  )
}
