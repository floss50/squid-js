import { Logger } from './Logger'

export const zeroX = (input: string) => zeroXTransformer(input, true)
export const noZeroX = (input: string) => zeroXTransformer(input, false)

export function zeroXTransformer(input: string, zeroOutput: boolean) {
    const match = input.match(/^(?:0x)?([a-f0-9]+)$/i)
    if (!match) {
        Logger.warn(`Input transformation failed.`)
        return input
    }
    return (zeroOutput ? "0x" : "") + match[1]
}
