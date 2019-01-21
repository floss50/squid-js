import Web3Provider from "../keeper/Web3Provider"

import Account from "./Account"

/**
 * Account submodule of Ocean Protocol.
 */
export default class OceanAccounts {

    /**
     * Returns the instance of OceanAccounts.
     * @return {Promise<OceanAccounts>}
     */
    public static async getInstance(): Promise<OceanAccounts> {
        if (!OceanAccounts.instance) {
            OceanAccounts.instance = new OceanAccounts()
        }

        return OceanAccounts.instance
    }

    /**
     * OceanAccounts instance.
     * @type {OceanAccounts}
     */
    private static instance: OceanAccounts = null

    /**
     * Returns the list of accounts.
     * @return {Promise<Account[]>}
     */
    public async list(): Promise<Account[]> {

        // retrieve eth accounts
        const ethAccounts = await Web3Provider.getWeb3().eth.getAccounts()

        return ethAccounts.map((address: string) => new Account(address))
    }
}
