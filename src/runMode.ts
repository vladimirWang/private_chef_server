export type RunMode = 'local' | 'online'

let current: RunMode | undefined

export function setRunMode(mode: RunMode): void {
  current = mode
}

export function getRunMode(): RunMode {
  if (current === undefined) {
    throw new Error('运行模式未初始化，请通过 src/index.ts 启动服务')
  }
  return current
}
