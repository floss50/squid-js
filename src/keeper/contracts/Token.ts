import BigNumber from "bignumber.js"
import ContractBase from "./ContractBase"

export default class OceanToken extends ContractBase {

    public static async getInstance(): Promise<OceanToken> {
        const token: OceanToken = new OceanToken("OceanToken")
        await token.init()
        return token
    }

    public async approve(to: string, price: number, from?: string) {
        return this.sendFrom("approve", [to, price], from)
    }

    public async decimals(): Promise<number> {
        return this.call("decimals", [])
    }

    public async balanceOf(address: string): Promise<number> {
        return this.call("balanceOf", [address])
            .then((balance: string) => new BigNumber(balance).toNumber())
    }

    public async transfer(to: string, amount: number, from: string) {
        return this.send("transfer", from, [to, amount])
    }
}
