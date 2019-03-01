import * as HDWalletProvider from "truffle-hdwallet-provider"
import { Config } from "../src"
import * as configJson from "./config/config.json"

if (process.env.SEED_WORDS) {
    const seedphrase = process.env.SEED_WORDS

    // @ts-ignore
    configJson.web3Provider = new HDWalletProvider(
        seedphrase,
        configJson.nodeUri,
        0,
        5,
    )
}

export const config: Config = configJson as any
