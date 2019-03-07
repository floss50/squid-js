import { ServiceAgreementTemplateCondition } from "../../ddo/ServiceAgreementTemplate"
import { DDO } from "../../ddo/DDO"
import { ServiceAccess } from "../../ddo/Service"
import Keeper from "../../keeper/Keeper"
import Web3Provider from "../../keeper/Web3Provider"
import ValuePair from "../../models/ValuePair"
import Logger from "../../utils/Logger"
import Account from "../Account"
import DID from "../DID"
import { signText } from "../../utils"


// TODO: move this class to helpers, it only contains pure functions
export default class ServiceAgreement {

    public static async signServiceAgreement(
        ddo: DDO,
        serviceDefinitionId: string,
        serviceAgreementId: string,
        valuesMap: {[value: string]: string},
        consumer: Account,
    ): Promise<string> {

        const service = ddo.findServiceById<"Access">(serviceDefinitionId)
        const values: ValuePair[][] = ServiceAgreement.getValuesFromService(service, valuesMap)
        const valueHashes: string[] = ServiceAgreement.createValueHashes(values)
        const timeoutValues: number[] = ServiceAgreement.getTimeoutValuesFromService(service)

        const serviceAgreementHashSignature = await ServiceAgreement.createSAHashSignature(
            service,
            serviceAgreementId,
            valueHashes,
            timeoutValues,
            consumer,
        )

        Logger.log("SA hash signature:", serviceAgreementHashSignature)

        return serviceAgreementHashSignature
    }

    private static async createSAHashSignature(
        service: ServiceAccess,
        serviceAgreementId: string,
        valueHashes: string[],
        timeoutValues: number[],
        consumer: Account,
    ): Promise<string> {

        if (!service.templateId) {
            throw new Error("TemplateId not found in ddo.")
        }

        const serviceAgreementHash = ServiceAgreement.hashServiceAgreement(
            service.templateId,
            serviceAgreementId,
            valueHashes,
            timeoutValues)

        let serviceAgreementHashSignature = await signText(serviceAgreementHash, consumer.getId(), consumer.getPassword())

        return serviceAgreementHashSignature
    }

    private static createValueHashes(parameterValuePairs: ValuePair[][]): string[] {
        return parameterValuePairs
            .map((valuePairs: ValuePair[]) =>  ServiceAgreement.hashValuePairArray(valuePairs))
    }

    private static hashValuePairArray(valuePairs: ValuePair[]): string {
        let hash: string
        try {
            hash = (Web3Provider as any).getWeb3().utils.soliditySha3(...valuePairs).toString("hex")
        } catch (err) {
            Logger.error(`Hashing of ${JSON.stringify(valuePairs, null, 2)} failed.`)
            throw err
        }

        if (!hash) {
            throw new Error("hashValuePairArray failed to create hash.")
        }

        return hash
    }

    private static hashServiceAgreement(
        serviceAgreementTemplateId: string,
        serviceAgreementId: string,
        valueHashes: string[],
        timeouts: number[],
    ): string {

        const args = [
            {type: "bytes32", value: serviceAgreementTemplateId},
            {type: "bytes32[]", value: valueHashes},
            {type: "uint256[]", value: timeouts},
            {type: "bytes32", value: "0x" + serviceAgreementId},
        ]

        return (Web3Provider as any).getWeb3().utils.soliditySha3(...args).toString("hex")
    }

    private static getTimeoutValuesFromService(service: ServiceAccess): number[] {
        const timeoutValues: number[] = service.serviceAgreementTemplate.conditions
            .map((condition: ServiceAgreementTemplateCondition) => condition.timeout)

        return timeoutValues
    }

    private static getValuesFromService(service: ServiceAccess, valuesMap: {[key: string]: string}): ValuePair[][] {
        return (service.serviceAgreementTemplate.conditions || [])
            .map(condition =>
                (condition.parameters || [])
                    .map(({type, name}) => ({
                        type,
                        value: valuesMap[name.replace(/^_/, "")] || "",
                    }))
            )
    }
}
