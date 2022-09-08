import { spawn } from 'child_process'
import chalk from 'chalk'
import consola from 'consola'
import { projRoot } from '@element-plus/build-utils'

/*例如：pnpm run clean*/
/*: cwd: current working directory  */
export const run = async (command: string, cwd: string = projRoot) =>
  new Promise<void>((resolve, reject) => {
    /*cmd===pnpm,args===[run,clean]*/
    const [cmd, ...args] = command.split(' ')
    /*consola的作用是打印一个标记，chalk.green能让输出的字体为绿色*/
    consola.info(`run: ${chalk.green(`${cmd} ${args.join(' ')}`)}`)

    /*
     * https://nodejs.org/api/child_process.html#child_processspawncommand-args-options
     * node中的特性，用于执行命令
     * */
    const app = spawn(cmd, args, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    })

    const onProcessExit = () => app.kill('SIGHUP')

    app.on('close', (code) => {
      process.removeListener('exit', onProcessExit)

      if (code === 0) resolve()
      else
        reject(
          new Error(`Command failed. \n Command: ${command} \n Code: ${code}`)
        )
    })
    process.on('exit', onProcessExit)
  })
