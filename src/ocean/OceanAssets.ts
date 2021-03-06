import AquariusProvider from "../aquarius/AquariusProvider"
import { SearchQuery } from "../aquarius/query/SearchQuery"
import BrizoProvider from "../brizo/BrizoProvider"
import ConfigProvider from "../ConfigProvider"
import { Condition } from "../ddo/Condition"
import { DDO } from "../ddo/DDO"
import { MetaData } from "../ddo/MetaData"
import { Service, ServiceAuthorization } from "../ddo/Service"
import EventListener from "../keeper/EventListener"
import Keeper from "../keeper/Keeper"
import SecretStoreProvider from "../secretstore/SecretStoreProvider"
import Logger from "../utils/Logger"
import Account from "./Account"
import DID from "./DID"
import OceanAgreements from "./OceanAgreements"
import ServiceAgreement from "./ServiceAgreements/ServiceAgreement"
import ServiceAgreementTemplate from "./ServiceAgreements/ServiceAgreementTemplate"
import Access from "./ServiceAgreements/Templates/Access"

/**
 * Assets submodule of Ocean Protocol.
 */
export default class OceanAssets {

    /**
     * Returns the instance of OceanAssets.
     * @return {Promise<OceanAssets>}
     */
    public static async getInstance(): Promise<OceanAssets> {
        if (!OceanAssets.instance) {
            OceanAssets.instance = new OceanAssets()
        }

        return OceanAssets.instance
    }

    /**
     * OceanAssets instance.
     * @type {OceanAssets}
     */
    private static instance: OceanAssets = null

    /**
     * Returns a DDO by DID.
     * @param  {string} did Decentralized ID.
     * @return {Promise<DDO>}
     */
    public async resolve(did: string): Promise<DDO> {
        const d: DID = DID.parse(did)
        return AquariusProvider.getAquarius().retrieveDDO(d)
    }

    /**
     * Creates a new DDO.
     * @param  {MetaData} metadata DDO metadata.
     * @param  {Account} publisher Publisher account.
     * @return {Promise<DDO>}
     */
    public async create(metadata: MetaData, publisher: Account, services: Service[] = []): Promise<DDO> {
        const {secretStoreUri} = ConfigProvider.getConfig()
        const {didRegistry} = await Keeper.getInstance()
        const aquarius = AquariusProvider.getAquarius()
        const brizo = BrizoProvider.getBrizo()

        const did: DID = DID.generate()

        const authorizationService = (services.find(({type}) => type === "Authorization") || {}) as ServiceAuthorization
        const secretStoreUrl = authorizationService.service === "SecretStore" && authorizationService.serviceEndpoint
        const secretStoreConfig = {
            secretStoreUri: secretStoreUrl,
        }

        const encryptedFiles = await SecretStoreProvider.getSecretStore(secretStoreConfig).encryptDocument(did.getId(), metadata.base.files)

        const template = new Access()
        const serviceAgreementTemplate = new ServiceAgreementTemplate(template)

        const conditions: Condition[] = await serviceAgreementTemplate.getConditions(metadata, did.getId())

        const serviceEndpoint = aquarius.getServiceEndpoint(did)

        let serviceDefinitionIdCount = 0
        // create ddo itself
        const ddo: DDO = new DDO({
            authentication: [{
                type: "RsaSignatureAuthentication2018",
                publicKey: did.getDid() + "#keys-1",
            }],
            id: did.getDid(),
            publicKey: [
                {
                    id: did.getDid() + "#keys-1",
                    type: "Ed25519VerificationKey2018",
                    owner: did.getDid(),
                    publicKeyBase58: await publisher.getPublicKey(),
                },
            ],
            service: [
                {
                    type: template.templateName,
                    purchaseEndpoint: brizo.getPurchaseEndpoint(),
                    serviceEndpoint: brizo.getConsumeEndpoint(),
                    // the id of the service agreement?
                    serviceDefinitionId: String(serviceDefinitionIdCount++),
                    // the id of the service agreement template
                    templateId: serviceAgreementTemplate.getId(),
                    serviceAgreementContract: {
                        contractName: "ServiceExecutionAgreement",
                        fulfillmentOperator: template.fulfillmentOperator,
                        events: [
                            {
                                name: "AgreementInitialized",
                                actorType: "consumer",
                                handler: {
                                    moduleName: "payment",
                                    functionName: "lockPayment",
                                    version: "0.1",
                                },
                            },
                        ],
                    },
                    conditions,
                },
                {
                    type: "Compute",
                    serviceEndpoint: brizo.getComputeEndpoint(publisher.getId(), String(serviceDefinitionIdCount), "xxx", "xxx"),
                    serviceDefinitionId: String(serviceDefinitionIdCount++),
                },
                {
                    type: "Authorization",
                    services: "SecretStore",
                    serviceEndpoint: secretStoreUri,
                    serviceDefinitionId: String(serviceDefinitionIdCount++),
                },
                {
                    type: "Metadata",
                    serviceEndpoint,
                    serviceDefinitionId: String(serviceDefinitionIdCount++),
                    metadata: {
                        // Default values
                        curation: {
                            rating: 0,
                            numVotes: 0,
                        },
                        additionalInformation: {
                            updateFrecuency: "yearly",
                            structuredMarkup: [],
                        },
                        // Overwrites defaults
                        ...metadata,
                        // Cleaning not needed information
                        base: {
                            ...metadata.base,
                            contentUrls: [],
                            encryptedFiles,
                            files: undefined,
                        } as any,
                    },
                },
                ...services
                    .map((_) => ({..._, serviceDefinitionId: String(serviceDefinitionIdCount++)})),
            ]
                // Remove duplications
                .reverse()
                .filter(({type}, i, list) => list.findIndex(({type: t}) => t === type) === i)
                .reverse() as Service[],
        })

        ddo.addChecksum()
        await ddo.addProof(publisher.getId(), publisher.getPassword())

        const storedDdo = await aquarius.storeDDO(ddo)

        await didRegistry.registerAttribute(
            did.getId(),
            ddo.getChecksum(),
            serviceEndpoint,
            publisher.getId(),
        )

        return storedDdo
    }

    // tslint:disable-next-line
    public async consume(agreementId: string, did: string, serviceDefinitionId: string, consumerAccount: Account, resultPath: string): Promise<string>
    public async consume(agreementId: string, did: string, serviceDefinitionId: string, consumerAccount: Account): Promise<true>
    public async consume(
        agreementId: string,
        did: string,
        serviceDefinitionId: string,
        consumerAccount: Account,
        resultPath?: string,
    ): Promise<string | true> {

        const brizo = BrizoProvider.getBrizo()
        const ddo = await this.resolve(did)
        const {metadata} = ddo.findServiceByType("Metadata")

        const authorizationService = ddo.findServiceByType("Authorization")
        const accessService = ddo.findServiceById(serviceDefinitionId)

        const files = metadata.base.encryptedFiles

        const {serviceEndpoint} =  accessService

        if (!serviceEndpoint) {
            throw new Error("Consume asset failed, service definition is missing the `serviceEndpoint`.")
        }

        const secretStoreUrl = authorizationService.service === "SecretStore" && authorizationService.serviceEndpoint
        const secretStoreConfig = {
            secretStoreUri: secretStoreUrl,
        }

        Logger.log("Decrypting files")
        const decryptedFiles = await SecretStoreProvider.getSecretStore(secretStoreConfig).decryptDocument(DID.parse(did).getId(), files)
        Logger.log("Files decrypted")

        Logger.log("Consuming files")

        resultPath = resultPath ? `${resultPath}/datafile.${ddo.shortId()}.${agreementId}/` : undefined
        await brizo.consumeService(
            agreementId,
            serviceEndpoint,
            consumerAccount,
            decryptedFiles,
            resultPath,
        )
        Logger.log("Files consumed")

        if (resultPath) {
            return resultPath
        }
        return true
    }

    /**
     * Start the purchase/order of an asset's service. Starts by signing the service agreement
     * then sends the request to the publisher via the service endpoint (Brizo http service).
     * @param  {string} did Decentralized ID.
     * @param  {string} serviceDefinitionId Service definition ID.
     * @param  {Account} consumer Consumer account.
     * @return {Promise<string>} Returns Agreement ID
     */
    public async order(
        did: string,
        serviceDefinitionId: string,
        consumer: Account,
    ): Promise<string> {

        const oceanAgreements = await OceanAgreements.getInstance()

        Logger.log("Asking for agreement signature")
        const {agreementId, signature} = await oceanAgreements.prepare(did, serviceDefinitionId, consumer)
        Logger.log(`Agreement ${agreementId} signed`)

        const ddo = await this.resolve(did)

        const paymentFlow = new Promise((resolve, reject) => {
            EventListener
                .subscribe(
                    "ServiceExecutionAgreement",
                    "AgreementInitialized",
                    {agreementId: "0x" + agreementId},
                )
                .listenOnce(async (...args) => {
                    Logger.log("Agreement initialized")
                    const serviceAgreement = new ServiceAgreement("0x" + agreementId)
                    const {metadata} = ddo.findServiceByType("Metadata")

                    Logger.log("Locking payment")
                    const paid = await serviceAgreement.payAsset(ddo.shortId(), metadata.base.price, consumer)

                    if (paid) {
                        Logger.log("Payment was OK")
                    } else {
                        Logger.error("Payment was KO")
                        Logger.error("Agreement ID: ", agreementId)
                        Logger.error("DID: ", ddo.id)
                        reject("Error on payment")
                    }
                })

            EventListener
                .subscribe(
                    "AccessConditions",
                    "AccessGranted",
                    {agreementId: "0x" + agreementId},
                )
                .listenOnce(async (...args) => {
                    Logger.log("Access granted")
                    resolve()
                })
        })

        Logger.log("Sending agreement request")
        await oceanAgreements.send(did, agreementId, serviceDefinitionId, signature, consumer)

        await paymentFlow

        return agreementId
    }

    /**
     * Search over the assets using a query.
     * @param  {SearchQuery} query Query to filter the assets.
     * @return {Promise<DDO[]>}
     */
    public async query(query: SearchQuery): Promise<DDO[]> {
        return AquariusProvider.getAquarius().queryMetadataByText(query)
    }

    /**
     * Search over the assets using a keyword.
     * @param  {SearchQuery} text Text to filter the assets.
     * @return {Promise<DDO[]>}
     */
    public async search(text: string): Promise<DDO[]> {
        return AquariusProvider.getAquarius().queryMetadataByText({
            text,
            page: 0,
            offset: 100,
            query: {
                value: 1,
            },
            sort: {
                value: 1,
            },
        } as SearchQuery)
    }
}
