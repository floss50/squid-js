import ContractBase from "./ContractBase"

export default class Dispenser extends ContractBase {

    public static async getInstance(): Promise<Dispenser> {
        const market: Dispenser = new Dispenser("Dispenser")
        await market.init()
        return market
    }

    public async requestTokens(amount: number, receiverAddress: string) {
        return this.send("requestTokens", receiverAddress, [amount])
    }
}
