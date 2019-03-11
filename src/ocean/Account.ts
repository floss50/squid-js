import BigNumber from "bignumber.js"
import * as EthJsUtils from "ethereumjs-util"
import Keeper from "../keeper/Keeper"
import Web3Provider from "../keeper/Web3Provider"
import Balance from "../models/Balance"
import Logger from "../utils/Logger"
import OceanBase from "./OceanBase"

/**
 * Account information.
 */
export default class Account extends OceanBase {
    private password?: string

    /**
     * Set account password.
     * @param {string} password Password for account.
     */
    public setPassword(password: string): void {
        this.password = password
    }

    /**
     * Returns account password.
     * @return {string} Account password.
     */
    public getPassword(): string {
        return this.password
    }

    /**
     * Balance of Ocean Token.
     * @return {Promise<number>}
     */
    public async getOceanBalance(): Promise<number> {
        const token = (await Keeper.getInstance()).token
        return await token.balanceOf(this.id) / (10 ** await token.decimals())
    }

    /**
     * Balance of Ether.
     * @return {Promise<number>}
     */
    public async getEtherBalance(): Promise<number> {
        // Logger.log("getting balance for", account);
        return Web3Provider
            .getWeb3()
            .eth
            .getBalance(this.id, "latest")
            .then((balance: string): number => {
                // Logger.log("balance", balance);
                return new BigNumber(balance).toNumber()
            })
    }

    /**
     * Balances of Ether and Ocean Token.
     * @return {Promise<Balance>}
     */
    public async getBalance(): Promise<Balance> {
        return {
            eth: await this.getEtherBalance(),
            ocn: await this.getOceanBalance(),
        }
    }

    /**
     * Request Ocean Tokens.
     * @param  {number} amount Tokens to be requested.
     * @return {Promise<number>}
     */
    public async requestTokens(amount: number): Promise<number> {
        try {
            await (await Keeper.getInstance())
                .dispenser
                .requestTokens(amount, this.id)
        } catch (e) {
            Logger.error(e)
            throw new Error("Error requesting tokens")

        }
        return amount
    }

    /**
     * Returns the account public key.
     * @return {Promise<string>}
     */
    public async getPublicKey(): Promise<string> {

        const web3 = Web3Provider.getWeb3()

        const msg = web3.utils.sha3(this.getId())
        const sig = await web3.eth.sign(msg, this.getId())
        const {v, r, s} = EthJsUtils.fromRpcSig(sig)

        return EthJsUtils.ecrecover(EthJsUtils.toBuffer(msg), v, r, s).toString("hex")
    }
}
