import Keeper from "../keeper/Keeper"
import Account from "./Account"

/**
 * Tokens submodule of Ocean Protocol.
 */
export default class OceanTokens {

    /**
     * Returns the instance of OceanTokens.
     * @return {Promise<OceanTokens>}
     */
    public static async getInstance(): Promise<OceanTokens> {
        if (!OceanTokens.instance) {
            OceanTokens.instance = new OceanTokens()
        }

        return OceanTokens.instance
    }

    /**
     * OceanTokens instance.
     * @type {OceanTokens}
     */
    private static instance: OceanTokens = null

    /**
     * Transfer a number of tokens to the mentioned account.
     * @param  {string}           to     Address that receives the account.
     * @param  {number}           amount Tokens to transfer.
     * @param  {Account}          from   Sender account address.
     * @return {Promise<boolean>}        Success,
     */
    public async transfer(to: string, amount: number, from: Account): Promise<boolean> {
        (await Keeper.getInstance())
            .token
            .transfer(to, amount, from.getId())
        return true
    }

    /**
     * Request tokens for a account.
     * @param  {Account}          account Account instance.
     * @param  {number}           amount  Token amount.
     * @return {Promise<boolean>}         Success.
     */
    public async request(account: Account, amount: number): Promise<boolean> {
        try {
            await account.requestTokens(amount)
            return true
        } catch (e) {
            return false
        }
    }
}
