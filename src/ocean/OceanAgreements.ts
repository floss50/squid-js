import AquariusProvider from "../aquarius/AquariusProvider"
import BrizoProvider from "../brizo/BrizoProvider"
import { generateId } from "../utils/GeneratorHelpers"
import Account from "./Account"
import DID from "./DID"
import ServiceAgreement from "./ServiceAgreements/ServiceAgreement"

export interface AgreementPreparionResult {
    agreementId: string
    signature: string
}

/**
 * Agreements submodule of Ocean Protocol.
 */
export default class OceanAgreements {

    /**
     * Returns the instance of OceanAgreements.
     * @return {Promise<OceanAgreements>}
     */
    public static async getInstance(): Promise<OceanAgreements> {
        if (!OceanAgreements.instance) {
            OceanAgreements.instance = new OceanAgreements()
        }

        return OceanAgreements.instance
    }

    /**
     * OceanAgreements instance.
     * @type {OceanAgreements}
     */
    private static instance: OceanAgreements = null

    /**
     * Creates a consumer signature for the specified asset service.
     * @param  {string} did Decentralized ID.
     * @param  {string} serviceDefinitionId Service definition ID.
     * @param  {Account} consumer Consumer account.
     * @return {Promise<AgreementPreparionResult>} Agreement ID and signaturee.
     */
    public async prepare(
        did: string,
        serviceDefinitionId: string,
        consumer: Account,
    ): Promise<AgreementPreparionResult> {

        const d: DID = DID.parse(did as string)
        const ddo = await AquariusProvider.getAquarius().retrieveDDO(d)
        const agreementId: string = generateId()

        const signature = await ServiceAgreement.signServiceAgreement(ddo, serviceDefinitionId, agreementId, consumer)

        return {agreementId, signature}
    }

    /**
     * Submit a service agreement to the publisher to create the agreement on-chain.
     * @param  {string} did Decentralized ID.
     * @param  {string} serviceDefinitionId Service definition ID.
     * @param  {Account} consumer Consumer account.
     * @return {Promise<void>}
     */
    public async send(
        did: string,
        agreementId: string,
        serviceDefinitionId: string,
        signature: string,
        consumer: Account,
    ): Promise<void> {

        const result = await BrizoProvider
            .getBrizo()
            .initializeServiceAgreement(
                did,
                agreementId,
                serviceDefinitionId,
                signature,
                consumer.getId(),
            )

        if (!result.ok) {
            throw new Error("Error on initialize agreement: " + await result.text())
        }
    }

    /**
     * Create a service agreement on-chain. This should be called by the publisher of the asset.
     * Consumer signature will be verified on-chain, but it is recommended to verify the signature
     * in this method before submitting on-chain.
     * @param  {string} did Decentralized ID.
     * @param  {string} agreementId Service agreement ID.
     * @param  {string} serviceDefinitionId Service definition ID.
     * @param  {string} signature Service agreement signature.
     * @param  {Account} consumer Consumer account.
     * @param  {Account} publisher Publisher account.
     * @return {Promise<ServiceAgreement>}
     */
    public async create(
        did: string,
        agreementId: string,
        serviceDefinitionId: string,
        signature: string,
        consumer: Account,
        publisher: Account,
    ): Promise<ServiceAgreement> {
        const d: DID = DID.parse(did)
        const ddo = await AquariusProvider.getAquarius().retrieveDDO(d)

        const serviceAgreement: ServiceAgreement = await ServiceAgreement
            .executeServiceAgreement(
                d,
                ddo,
                agreementId,
                serviceDefinitionId,
                signature,
                consumer,
                publisher)

        return serviceAgreement
    }
}
