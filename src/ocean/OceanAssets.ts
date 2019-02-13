import AquariusProvider from "../aquarius/AquariusProvider"
import { SearchQuery } from "../aquarius/query/SearchQuery"
import BrizoProvider from "../brizo/BrizoProvider"
import { Condition } from "../ddo/Condition"
import { DDO } from "../ddo/DDO"
import { MetaData } from "../ddo/MetaData"
import { Service } from "../ddo/Service"
import ContractEvent from "../keeper/Event"
import EventListener from "../keeper/EventListener"
import Keeper from "../keeper/Keeper"
import SecretStoreProvider from "../secretstore/SecretStoreProvider"
import Account from "./Account"
import DID from "./DID"
import IdGenerator from "./IdGenerator"
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
     * @param  {Account} publisher Publicher account.
     * @return {Promise<DDO>}
     */
    public async create(metadata: MetaData, publisher: Account, services?: Service[]): Promise<DDO> {
        const {didRegistry} = await Keeper.getInstance()
        const aquarius = AquariusProvider.getAquarius()
        const brizo = BrizoProvider.getBrizo()

        const did: DID = DID.generate()
        const accessServiceDefinitionId: string = "0"
        const computeServiceDefintionId: string = "1"
        const metadataServiceDefinitionId: string = "2"

        metadata.base.encryptedFiles = await SecretStoreProvider.getSecretStore()
            .encryptDocument(did.getId(), metadata.base.files)

        const template = new Access()
        const serviceAgreementTemplate = new ServiceAgreementTemplate(template)

        const conditions: Condition[] = await serviceAgreementTemplate.getConditions(metadata, did.getId())

        const serviceEndpoint = aquarius.getServiceEndpoint(did)

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
                    serviceDefinitionId: accessServiceDefinitionId,
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
                    serviceEndpoint: brizo.getComputeEndpoint(publisher.getId(),
                        computeServiceDefintionId, "xxx", "xxx"),
                    serviceDefinitionId: computeServiceDefintionId,
                },
                {
                    type: "Metadata",
                    serviceEndpoint,
                    serviceDefinitionId: metadataServiceDefinitionId,
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
                            files: undefined,
                        } as any,
                    },
                },
            ],
        })

        ddo.addChecksum()
        await ddo.addProof(publisher.getId(), publisher.getPassword())

        const storedDdo = await aquarius.storeDDO(ddo)

        // Logger.log(JSON.stringify(storedDdo, null, 2))

        await didRegistry.registerAttribute(
            did.getId(),
            ddo.getChecksum(),
            serviceEndpoint,
            publisher.getId(),
        )

        return storedDdo
    }

    /**
     * Purchases a service agreement by DID.
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

        const d: DID = DID.parse(did as string)
        const ddo = await AquariusProvider.getAquarius().retrieveDDO(d)
        const serviceAgreementId: string = IdGenerator.generateId()

        try {
            await ServiceAgreement.signServiceAgreement(
                ddo, serviceDefinitionId, serviceAgreementId, consumer)

            const accessService: Service = ddo.findServiceByType("Access")
            const metadataService: Service = ddo.findServiceByType("Metadata")

            const price = metadataService.metadata.base.price
            const balance = await consumer.getOceanBalance()
            if (balance < price) {
                throw new Error(`Not enough ocean tokens! Should have ${price} but has ${balance}`)
            }

            const event: ContractEvent = EventListener.subscribe(
                accessService.serviceAgreementContract.contractName,
                accessService.serviceAgreementContract.events[0].name, {
                    serviceAgreementId,
                })

            event.listenOnce(async (data) => {
                const sa: ServiceAgreement = new ServiceAgreement(data.returnValues.agreementId)
                await sa.payAsset(
                    d.getId(),
                    metadataService.metadata.base.price,
                    consumer,
                )
            })

            return serviceAgreementId

        } catch (err) {
            throw new Error("Signing ServiceAgreement failed: " + err)
        }
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
