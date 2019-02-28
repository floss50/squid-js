import ConfigProvider from "../../ConfigProvider"
import { Condition } from "../../ddo/Condition"
import { DDO } from "../../ddo/DDO"
import { ServiceAccess } from "../../ddo/Service"
import Keeper from "../../keeper/Keeper"
import Web3Provider from "../../keeper/Web3Provider"
import ValuePair from "../../models/ValuePair"
import Logger from "../../utils/Logger"
import Account from "../Account"
import DID from "../DID"
import OceanBase from "../OceanBase"

export default class ServiceAgreement extends OceanBase {

    public static async signServiceAgreement(
        ddo: DDO,
        serviceDefinitionId: string,
        serviceAgreementId: string,
        consumer: Account,
    ): Promise<string> {

        Logger.log("Signing SA with serviceAgreementId", serviceAgreementId)

        const service = ddo.findServiceById<"Access">(serviceDefinitionId)
        const values: ValuePair[][] = ServiceAgreement.getValuesFromService(service, serviceAgreementId)
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

    public static async executeServiceAgreement(
        did: DID,
        ddo: DDO,
        serviceDefinitionId: string,
        serviceAgreementId: string,
        serviceAgreementHashSignature: string,
        consumer: Account,
        publisher: Account,
    ): Promise<ServiceAgreement> {

        Logger.log("Executing SA with serviceAgreementId", serviceAgreementId)

        const service = ddo.findServiceById<"Access">(serviceDefinitionId)
        const values: ValuePair[][] = ServiceAgreement.getValuesFromService(service, serviceAgreementId)
        const valueHashes: string[] = ServiceAgreement.createValueHashes(values)
        const timeoutValues: number[] = ServiceAgreement.getTimeoutValuesFromService(service)

        // todo get consumer from ddo
        const serviceAgreement: ServiceAgreement = await ServiceAgreement.executeAgreement(did, ddo,
            serviceDefinitionId, serviceAgreementId, valueHashes, timeoutValues, serviceAgreementHashSignature,
            consumer.getId(), publisher)

        return serviceAgreement
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

        const conditionKeys: string[] = service.conditions.map((condition) => {
            return condition.conditionKey
        })

        if (conditionKeys.length !== valueHashes.length) {
            throw new Error("Hashing SA failed!")
        }

        const serviceAgreementHash = ServiceAgreement.hashServiceAgreement(
            service.templateId,
            serviceAgreementId,
            conditionKeys,
            valueHashes,
            timeoutValues)

        let serviceAgreementHashSignature: string
        const web3 = Web3Provider.getWeb3()
        if (web3.currentProvider.isMetaMask) {
            // password is injected by metamask, dont try to set it!
            serviceAgreementHashSignature = await web3.eth.personal.sign(serviceAgreementHash, consumer.getId(), null)
        } else {
            serviceAgreementHashSignature = await web3.eth.sign(serviceAgreementHash, consumer.getId())
        }

        return serviceAgreementHashSignature
    }

    private static async executeAgreement(
        did: DID,
        ddo: DDO,
        serviceDefinitionId: string,
        serviceAgreementId: string,
        valueHashes: string[],
        timeoutValues: number[],
        serviceAgreementHashSignature: string,
        consumerAddress: string,
        publisher: Account,
    ): Promise<ServiceAgreement> {

        const {serviceAgreement} = <any>await Keeper.getInstance()

        const service = ddo.findServiceById<"Access">(serviceDefinitionId)

        if (!service.templateId) {
            throw new Error(`TemplateId not found in service "${service.type}" ddo.`)
        }

        const templateActive = await serviceAgreement.getTemplateStatus(service.templateId)

        if (!templateActive) {
            throw new Error(`Template with id ${service.templateId} is not active.`)
        }

        const executeAgreementReceipt = await serviceAgreement
            .initializeAgreement(
                service.templateId,
                serviceAgreementHashSignature,
                consumerAddress,
                valueHashes,
                timeoutValues,
                serviceAgreementId,
                did,
                publisher.getId(),
            )

        if (!executeAgreementReceipt.status) {
            throw new Error("executing service agreement failed.")
        }
        return new ServiceAgreement(
            executeAgreementReceipt.events.AgreementInitialized.returnValues.agreementId,
        )
    }

    private static createValueHashes(parameterValuePairs: ValuePair[][]): string[] {

        const hashes: string[] = []
        parameterValuePairs.map((valuePairs: ValuePair[]) => {

            hashes.push(ServiceAgreement.hashValuePairArray(valuePairs))
        })

        return hashes
    }

    private static hashValuePairArray(valuePairs: ValuePair[]): string {
        let hash: string
        try {
            hash = Web3Provider.getWeb3().utils.soliditySha3(...valuePairs).toString("hex")
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
        conditionKeys: string[],
        valueHashes: string[],
        timeouts: number[],
    ): string {

        const args = [
            {type: "bytes32", value: serviceAgreementTemplateId} as ValuePair,
            {type: "bytes32[]", value: conditionKeys} as ValuePair,
            {type: "bytes32[]", value: valueHashes} as ValuePair,
            {type: "uint256[]", value: timeouts} as ValuePair,
            {type: "bytes32", value: "0x" + serviceAgreementId} as ValuePair,
        ]

        return Web3Provider.getWeb3().utils.soliditySha3(...args).toString("hex")
    }

    private static getTimeoutValuesFromService(service: ServiceAccess): number[] {
        const timeoutValues: number[] = service.conditions.map((condition: Condition) => {
            return condition.timeout
        })

        return timeoutValues
    }

    private static getValuesFromService(service: ServiceAccess, serviceAgreementId: string): ValuePair[][] {

        const values: ValuePair[][] = []

        service.conditions.forEach((condition, i) => {
            const contionValues: ValuePair[] = []
            condition.parameters.forEach((parameter) => {

                contionValues.push({
                    type: parameter.type,
                    value: parameter.name === "serviceId" ? serviceAgreementId : parameter.value,
                } as ValuePair)
            })

            values[i] = contionValues
        })

        return values
    }

    constructor(serviceAgreementId: string) {
        super(serviceAgreementId)
    }

    public async payAsset(assetId: string, price: number, consumer: Account): Promise<boolean> {
        const {paymentConditions, token} = <any>await Keeper.getInstance()

        await token.approve(paymentConditions.getAddress(), price, consumer.getId())

        const lockPaymentReceipt = await paymentConditions.lockPayment(this.getId(), assetId, price, consumer.getId())

        return lockPaymentReceipt.status
    }

    public async grantAccess(documentId: string, publisher: Account): Promise<boolean> {
        const {accessConditions} = <any>await Keeper.getInstance()

        const grantAccessReceipt =
            await accessConditions.grantAccess(this.getId(), documentId, publisher.getId())

        return !!grantAccessReceipt.events.AccessGranted
    }
}
