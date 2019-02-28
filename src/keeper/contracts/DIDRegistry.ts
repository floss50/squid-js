import {Receipt} from "web3-utils"
import Web3Provider from "../Web3Provider"
import ContractBase from "./ContractBase"

export default class DIDRegistry extends ContractBase {

    public static async getInstance(): Promise<DIDRegistry> {
        const didRegistry: DIDRegistry = new DIDRegistry("DIDRegistry")
        await didRegistry.init()
        return didRegistry
    }

    public async registerAttribute(did: string, checksum: string, value: string, ownerAddress: string): Promise<Receipt> {
        return this.send("registerAttribute", ownerAddress, ["0x" + did, Web3Provider.getWeb3().utils.fromAscii(checksum), value])
    }

    public async getOwner(did: string): Promise<string> {
        return this.call("getOwner", ["0x" + did])
    }

    public async getUpdateAt(did: string): Promise<number> {
        return +await this.call("getUpdateAt", ["0x" + did])
    }
}
