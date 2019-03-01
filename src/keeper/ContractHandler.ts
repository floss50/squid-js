import { Contract } from "web3-eth-contract"
import Logger from "../utils/Logger"
import Keeper from "./Keeper"
import Web3Provider from "./Web3Provider"

export default class ContractHandler {

    public static async get(what: string): Promise<Contract> {
        const where = (await (await Keeper.getInstance()).getNetworkName()).toLowerCase()
        try {
            return ContractHandler.contracts.get(what) || await ContractHandler.load(what, where)
        } catch (err) {
            Logger.error("Failed to load", what, "from", where, err)
            throw err
        }
    }

    protected static set(name: string, contractInstance: Contract) {
        ContractHandler.contracts.set(name, contractInstance)
    }

    protected static has(name: string): boolean {
        return ContractHandler.contracts.has(name)
    }

    private static contracts: Map<string, Contract> = new Map<string, Contract>()

    private static async load(what: string, where: string): Promise<Contract> {
        const web3 = Web3Provider.getWeb3()
        Logger.debug("Loading", what, "from", where)
        const artifact = require(`@oceanprotocol/keeper-contracts/artifacts/${what}.${where}.json`)
        // Logger.log('Loaded artifact', artifact)
        const code = await web3.eth.getCode(artifact.address)
        if (code === "0x0") {
            // no code in the blockchain dude
            throw new Error(`No code deployed at address ${artifact.address}, sorry.`)
        }
        const contract = new web3.eth.Contract(artifact.abi, artifact.address)

        Logger.debug("Getting instance of", what, "from", where, "at address", artifact.address)
        ContractHandler.contracts.set(what, contract)
        return ContractHandler.contracts.get(what)
    }
}
