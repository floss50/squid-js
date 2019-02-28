import ConfigProvider from "../../ConfigProvider"
import { Condition as DDOCondition, Dependency, Parameter } from "../../ddo/Condition"
import { MetaData } from "../../ddo/MetaData"
import ContractReflector from "../../keeper/ContractReflector"
import Keeper from "../../keeper/Keeper"
import Web3Provider from "../../keeper/Web3Provider"
import MethodReflection from "../../models/MethodReflection"
import ValuePair from "../../models/ValuePair"
import Logger from "../../utils/Logger"
import Account from "../Account"
import OceanBase from "../OceanBase"
import Condition from "./Condition"
import Method from "./Method"
import TemplateBase from "./Templates/TemplateBase"

export default class ServiceAgreementTemplate extends OceanBase {

    private static generateConditionsKey(serviceAgreementTemplateId: string, methodReflection: MethodReflection): string {
        const values = [
            {type: "bytes32", value: serviceAgreementTemplateId} as ValuePair,
            {type: "address", value: methodReflection.address} as ValuePair,
            {type: "bytes4", value: methodReflection.signature} as ValuePair,
        ]
        return Web3Provider.getWeb3().utils.soliditySha3(...values).toString("hex")
    }

    public constructor(private template: TemplateBase) {
        super(template.id)
    }

    public async register(templateOwnerAddress: string): Promise<boolean> {

        const dependencyMatrix: number[] =
            await Promise.all(this.template.Methods.map(async (method: Method) => {
                return this.compressDependencies(method.dependencies, method.dependencyTimeoutFlags)
            }))

        const fulfillmentIndices: number[] = this.template.Methods
            .map((method: Method, i: number) => method.isTerminalCondition ? i : null)
            .filter((index: number) => index !== null)

        const {serviceAgreement} = <any>await Keeper.getInstance()

        const owner = await this.getOwner()

        if (owner.getId() === templateOwnerAddress) {
            // tslint:disable-next-line
            Logger.error(`Template with id "${this.template.id}" is already registered to your account "${templateOwnerAddress}".`)
            return false
        }

        if (!owner.getId().startsWith("0x00000")) {
            Logger.error(`Template with id "${this.template.id}" already registered by someone else.`)
            return false
        }

        let receipt
        try {
            receipt = await serviceAgreement
                .setupTemplate(
                    this.template.id,
                    await this.getMethodReflections(),
                    dependencyMatrix,
                    fulfillmentIndices,
                    this.template.fulfillmentOperator,
                    templateOwnerAddress)
        } catch (e) {
            Logger.error(e)
            throw new Error(`Is not possible to setup the agreement template`)
        }
        const {templateId, provider} = receipt.events.TemplateSetup.returnValues

        if (templateId !== this.template.id) {
            // tslint:disable-next-line
            throw new Error(`TemplateId missmatch on ${this.template.templateName}! Should be "${this.template.id}" but is ${templateId}`)
        }

        if (provider !== templateOwnerAddress) {
            // tslint:disable-next-line
            throw new Error(`Template owner missmatch on ${this.template.templateName}! Should be "${templateOwnerAddress}" but is ${provider}`)
        }

        if (!receipt.status) {
            Logger.error(`Registering template failed, status was "false".`)
        }

        return receipt.status
    }

    /**
     * gets the status of a service agreement template
     */
    public async getStatus(): Promise<boolean> {
        const {serviceAgreement} = <any>await Keeper.getInstance()
        return serviceAgreement.getTemplateStatus(this.getId())
    }

    public async getOwner(): Promise<Account> {
        const {serviceAgreement} = <any>await Keeper.getInstance()

        return new Account(await serviceAgreement.getTemplateOwner(this.id))
    }

    public async getConditions(metadata: MetaData, assetId: string): Promise<DDOCondition[]> {
        const conditions = await this.blendConditions()
        return conditions.map((condition: Condition, index: number): DDOCondition => {

            const mapParameterValueToName = (name) => {

                switch (name) {
                    case "price":
                        return metadata.base.price
                    case "assetId":
                        return assetId
                    case "documentKeyId":
                        return assetId
                }

                return null
            }

            const parameters: Parameter[] = condition.parameters.map((parameter: Parameter) => {
                return {
                    name: parameter.name,
                    type: parameter.type,
                    value: mapParameterValueToName(parameter.name),
                } as Parameter
            })

            // Logger.log(`${condition.methodReflection.contractName}.${condition.methodReflection.methodName}`,
            //    JSON.stringify(parameters, null, 2))

            const dependencies: Dependency[] = condition.dependencies.map((dep, i) => {
                return {
                    name: dep,
                    timeout: condition.dependencyTimeoutFlags[i],
                } as Dependency
            })

            return {
                name: condition.methodReflection.methodName,
                dependencies,
                timeout: condition.timeout,
                isTerminalCondition: condition.isTerminalCondition,
                conditionKey: condition.condtionKey,
                contractName: condition.methodReflection.contractName,
                functionName: condition.methodReflection.methodName,
                index,
                parameters,
                events: condition.events,
            } as DDOCondition
        })
    }

    private async blendConditions(): Promise<Condition[]> {
        const methodReflections = await this.getMethodReflections()

        const conditions: Condition[] = methodReflections.map((methodReflection, i) => {
            const method: Method = this.template.Methods[i]
            return {
                methodReflection,
                timeout: method.timeout,
                events: method.events,
                parameters: method.parameters,
                dependencies: method.dependencies,
                dependencyTimeoutFlags: method.dependencyTimeoutFlags,
                isTerminalCondition: method.isTerminalCondition,
                condtionKey: ServiceAgreementTemplate
                    .generateConditionsKey(this.getId(), methodReflection),
            } as Condition
        })

        Logger.debug("Conditions", JSON.stringify(conditions, null, 2))

        return conditions
    }

    private compressDependencies(dependencies: string[], dependencyTimeoutFlags: number[]): number {

        if (dependencies.length !== dependencyTimeoutFlags.length) {
            throw new Error("Deps and timeouts need the same length")
        }

        const mappedDependencies: number[] = []
        const mappedDependencyTimeoutFlags: number[] = []

        this.template.Methods.forEach((m, i) => {
            const di = dependencies.findIndex((d) => d === m.name)
            mappedDependencies.push(di > -1 ? 1 : 0)
            mappedDependencyTimeoutFlags.push((di > -1 && dependencyTimeoutFlags[di]) ? 1 : 0)
        })

        if (mappedDependencies.length !== mappedDependencyTimeoutFlags.length) {
            throw new Error("Deps and timeouts need the same length")
        }

        // Logger.log(dependencies, mappedDependencies, dependencyTimeoutFlags, mappedDependencyTimeoutFlags)

        let compressedDependencyValue: number = 0
        const numBits: number = 2  // 1st for dependency, 2nd for timeout flag
        mappedDependencies.forEach((d: number, i: number) => {
            const t: number = mappedDependencyTimeoutFlags[i]
            const offset: number = i * numBits
            // tslint:disable-next-line
            compressedDependencyValue |= d * 2 ** (offset + 0) // the dependency bit
            // tslint:disable-next-line
            compressedDependencyValue |= t * 2 ** (offset + 1) // the timeout bit
        })

        return compressedDependencyValue
    }

    private async getMethodReflections(): Promise<MethodReflection[]> {
        const methodReflections: MethodReflection[] = []
        for (const method of this.template.Methods) {
            methodReflections.push(
                await ContractReflector.reflectContractMethod(method.contractName, method.methodName),
            )
        }
        return methodReflections
    }
}
