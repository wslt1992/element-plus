import path from 'path'
import { copyFile, mkdir } from 'fs/promises'
import { copy } from 'fs-extra'
import { parallel, series } from 'gulp'
import {
  buildOutput,
  epOutput,
  epPackage,
  projRoot,
} from '@element-plus/build-utils'
import { buildConfig, run, runTask, withTaskName } from './src'
import type { TaskFunction } from 'gulp'
import type { Module } from './src'

export const copyFiles = () =>
  Promise.all([
    copyFile(epPackage, path.join(epOutput, 'package.json')),
    copyFile(
      path.resolve(projRoot, 'README.md'),
      path.resolve(epOutput, 'README.md')
    ),
    copyFile(
      path.resolve(projRoot, 'global.d.ts'),
      path.resolve(epOutput, 'global.d.ts')
    ),
  ])

export const copyTypesDefinitions: TaskFunction = (done) => {
  const src = path.resolve(buildOutput, 'types', 'packages')
  const copyTypes = (module: Module) =>
    withTaskName(`copyTypes:${module}`, () =>
      copy(src, buildConfig[module].output.path, { recursive: true })
    )

  return parallel(copyTypes('esm'), copyTypes('cjs'))(done)
}

export const copyFullStyle = async () => {
  await mkdir(path.resolve(epOutput, 'dist'), { recursive: true })
  await copyFile(
    path.resolve(epOutput, 'theme-chalk/index.css'),
    path.resolve(epOutput, 'dist/index.css')
  )
}
/*series：将等待前一个任务完成，在执行后一个
 * parallel：任务将平行执行
 * */
export default series(
  /*
   * withTaskName的作用，函数fn添加displayName属性，然后返回fn
   * */
  /*执行清理，清理dist文件夹*/
  withTaskName('clean', () => run('pnpm run clean')),
  /* 创建/dist/element-plus目录 */
  withTaskName('createOutput', () => mkdir(epOutput, { recursive: true })),

  parallel(
    /*
    这里的任务定义在，src/task目录中，gulp.js（当前文件）引入后抛出，如下
    * export * from './src' (文件最后一行)
    * */

    /*runTask执行过程，
     * runTask(buildModules)
     * --> spawn(pnpm run start buildModules)
     * --> gulp  gulpfile.ts buildModules
     * --> 最终调用到当前gulp文件的 buildModules
     * */
    runTask('buildModules'),
    runTask('buildFullBundle'),
    runTask('generateTypesDefinitions'),
    runTask('buildHelper'),
    series(
      withTaskName('buildThemeChalk', () =>
        run('pnpm run -C packages/theme-chalk build')
      ),
      copyFullStyle
    )
  ),

  parallel(copyTypesDefinitions, copyFiles)
)

export * from './src'
