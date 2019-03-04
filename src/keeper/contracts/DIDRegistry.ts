import Web3Provider from "../Web3Provider"
import ContractBase from "./ContractBase"
import { zeroX } from "../../utils"

export default class DIDRegistry extends ContractBase {

    public static async getInstance(): Promise<DIDRegistry> {
        const didRegistry: DIDRegistry = new DIDRegistry("DIDRegistry")
        await didRegistry.init()
        return didRegistry
    }

    public async registerAttribute(did: string, checksum: string, value: string, ownerAddress: string) {
        return this.send("registerAttribute", ownerAddress, [zeroX(did), Web3Provider.getWeb3().utils.fromAscii(checksum), value])
    }

    public async getDIDOwner(did: string): Promise<string> {
        return this.call("getDIDOwner", [zeroX(did)])
    }

    public async getBlockNumberUpdated(did: string): Promise<number> {
        return +await this.call("getBlockNumberUpdated", [zeroX(did)])
    }
}
