import { Command, Option } from 'commander'
import select from '@inquirer/select'
import { setRunMode, type RunMode } from './runMode'

async function resolveRunMode(): Promise<RunMode> {
  const program = new Command()
    .name('private-chef-server')
    .description('Private Chef API 服务')
    .addOption(
      new Option('-m, --mode <mode>', '运行模式')
        .choices(['local', 'online'])
    )

  program.parse(process.argv)
  const fromCli = program.opts().mode as RunMode | undefined

  if (fromCli) return fromCli

  if (!process.stdin.isTTY) {
    program.error('非交互环境请指定：--mode local 或 --mode online')
  }

  return select<RunMode>({
    message: '选择运行模式',
    choices: [
      { name: 'local（本地上传目录）', value: 'local' },
      { name: 'online（阿里云 OSS）', value: 'online' },
    ],
  })
}

setRunMode(await resolveRunMode())

const { default: server } = await import('./server')
export default server
