import DIDRegistry from "./contracts/DIDRegistry"
import Dispenser from "./contracts/Dispenser"
import OceanToken from "./contracts/Token"
import { Condition, LockRewardCondition, EscrowReward, AccessSecretStoreCondition } from "./contracts/conditions"
import { EscrowAccessSecretStoreTemplate } from "./contracts/templates"
import { TemplateStoreManager } from "./contracts/managers"

import Web3Provider from "./Web3Provider"

/**
 * Interface with Ocean Keeper contracts.
 * Ocean Keeper implementation where we put the following modules together:
 * - TCRs: users create challenges and resolve them through voting to maintain registries.
 * - Ocean Tokens: the intrinsic tokens circulated inside Ocean network, which is used in the voting of TCRs.
 * - Marketplace: the core marketplace where people can transact with each other with Ocean tokens.
 */
export default class Keeper {

    /**
     * Returns Keeper instance.
     * @return {Promise<Keeper>}
     */
    public static async getInstance(): Promise<Keeper> {
        if (Keeper.instance === null) {
            Keeper.instance = new Keeper()

            // Main contracts
            Keeper.instance.dispenser = await Dispenser.getInstance()
            Keeper.instance.token = await OceanToken.getInstance()
            Keeper.instance.didRegistry = await DIDRegistry.getInstance()

            // Managers
            Keeper.instance.templateStoreManager = await TemplateStoreManager.getInstance()

            // Conditions
            Keeper.instance.conditions = {
                lockRewardCondition: await LockRewardCondition.getInstance(),
                escrowReward: await EscrowReward.getInstance(),
                accessSecretStoreCondition: await AccessSecretStoreCondition.getInstance(),
            }

            // Conditions
            Keeper.instance.templates = {
                escrowAccessSecretStoreTemplate: await EscrowAccessSecretStoreTemplate.getInstance(),
            }
        }

        return Keeper.instance
    }

    /**
     * Keeper instance.
     * @type {Keeper}
     */
    private static instance: Keeper = null

    /**
     * Ocean Token smart contract instance.
     * @type {OceanToken}
     */
    public token: OceanToken

    /**
     * Ocean Market smart contract instance.
     * @type {Dispenser}
     */
    public dispenser: Dispenser

    /**
     * DID registry smart contract instance.
     * @type {DIDRegistry}
     */
    public didRegistry: DIDRegistry

    /**
     * Template store manager smart contract instance.
     * @type {TemplateStoreManager}
     */
    public templateStoreManager: TemplateStoreManager

    /**
     * Conditions instances.
     */
    public conditions: {
        lockRewardCondition: LockRewardCondition,
        escrowReward: EscrowReward,
        accessSecretStoreCondition: AccessSecretStoreCondition,
    }

    /**
     * Templates instances.
     */
    public templates: {
        escrowAccessSecretStoreTemplate: EscrowAccessSecretStoreTemplate,
    }

    /**
     * Returns a condition by address.
     * @param  {string}    address Address of deployed condition.
     * @return {Condition}         Condition instance.
     */
    public getConditionByAddress(address: string): Condition {
        return Object.values(this.conditions)
            .find(condition => condition.getAddress() === address)
    }

    /**
     * Returns the network by name.
     * @return {Promise<string>} Network name.
     */
    public async getNetworkName(): Promise<string> {
        return Web3Provider.getWeb3().eth.net.getId()
            .then((networkId) => {
                let network: string = "Unknown"

                switch (networkId) {
                    case 1:
                        network = "Main"
                        break
                    case 2:
                        network = "Morden"
                        break
                    case 3:
                        network = "Ropsten"
                        break
                    case 4:
                        network = "Rinkeby"
                        break
                    case 77:
                        network = "POA_Sokol"
                        break
                    case 99:
                        network = "POA_Core"
                        break
                    case 42:
                        network = "Kovan"
                        break
                    case 8996:
                        network = "Spree"
                        // network = "ocean_poa_net_local"
                        break
                    case 8995:
                        network = "Nile"
                        break
                    default:
                        // Logger.log(`NetworkId ${networkId} not found defaulting`)
                        network = "Development"
                }
                return network
            })
    }
}
