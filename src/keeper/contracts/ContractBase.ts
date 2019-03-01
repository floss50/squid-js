import { Contract } from "web3-eth-contract"
import { TransactionReceipt } from "web3-core"
import Logger from "../../utils/Logger"
import ContractHandler from "../ContractHandler"
import Web3Provider from "../Web3Provider"

export default abstract class ContractBase {

    protected static instance = null

    private contract: Contract = null
    private contractName: string

    constructor(contractName) {
        this.contractName = contractName
    }

    public async getEventData(eventName: any, options: any) {
        if (!this.contract.events[eventName]) {
            throw new Error(`Event "${eventName}" not found on contract "${this.contractName}"`)
        }
        return this.contract.getPastEvents(eventName, options)
    }

    public getAddress(): string {
        return this.contract.options.address
    }

    public getSignatureOfMethod(methodName: string): string {
        const foundMethod = this.searchMethod(methodName)
        return foundMethod.signature
    }

    public getInputsOfMethod(methodName: string): any[] {
        const foundMethod = this.searchMethod(methodName)
        return foundMethod.inputs
    }

    protected async init() {
        this.contract = await ContractHandler.get(this.contractName)
    }

    protected async sendFrom(name: string, args: any[], from?: string): Promise<TransactionReceipt> {
        if (!from) {
            from = (await Web3Provider.getWeb3().eth.getAccounts())[0]
        }
        return this.send(name, from, args)
    }

    protected async send(name: string, from: string, args: any[]): Promise<TransactionReceipt> {
        if (!this.contract.methods[name]) {
            throw new Error(`Method "${name}" is not part of contract "${this.contractName}"`)
        }
        // Logger.log(name, args)
        const method = this.contract.methods[name]
        try {
            const methodInstance = method(...args)
            const estimatedGas = await methodInstance.estimateGas(args, {
                from,
            })
            const tx = methodInstance.send({
                from,
                gas: estimatedGas,
            })
            return tx
        } catch (err) {
            const mappedArgs = this.searchMethod(name).inputs.map((input, i) => {
                return {
                    name: input.name,
                    value: args[i],
                }
            })
            Logger.error("-".repeat(40))
            Logger.error(`Sending transaction "${name}" on contract "${this.contractName}" failed.`)
            Logger.error(`Error: ${err.message}`)
            Logger.error(`From: ${from}`)
            Logger.error(`Parameters: ${JSON.stringify(mappedArgs, null, 2)}`)
            Logger.error("-".repeat(40))
            throw err
        }
    }

    protected async call<T extends any>(name: string, args: any[], from?: string): Promise<T> {
        if (!this.contract.methods[name]) {
            throw new Error(`Method ${name} is not part of contract ${this.contractName}`)
        }
        // Logger.log(name)
        try {
            const method = this.contract.methods[name](...args)
            return method.call(from ? {from} : null)
        } catch (err) {
            Logger.error(`Calling method "${name}" on contract "${this.contractName}" failed. Args: ${args}`, err)
            throw err
        }
    }

    private searchMethod(methodName: string) {
        const foundMethod = this.contract.options.jsonInterface
            .map(method => ({...method, signature: (method as any).signature}))
            .find((method: any) => method.name === methodName)
        if (!foundMethod) {
            throw new Error(`Method "${methodName}" is not part of contract "${this.contractName}"`)
        }
        return foundMethod
    }
}
