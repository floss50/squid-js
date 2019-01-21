import AquariusProvider from "../aquarius/AquariusProvider"
import Account from "./Account"
import DID from "./DID"
import ServiceAgreement from "./ServiceAgreements/ServiceAgreement"

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
     * Executes a service agreement.
     * @param  {string} did Decentralized ID.
     * @param  {string} serviceDefinitionId Service definition ID.
     * @param  {string} serviceAgreementId Service agreement ID.
     * @param  {string} serviceAgreementSignature Service agreement signature.
     * @param  {Account} consumer Consumer account.
     * @param  {Account} publisher Publisher account.
     * @return {Promise<ServiceAgreement>}
     */
    public async create(
        did: string,
        serviceDefinitionId: string,
        serviceAgreementId: string,
        serviceAgreementSignature: string,
        consumer: Account,
        publisher: Account,
    ): Promise<ServiceAgreement> {
        const d: DID = DID.parse(did)
        const ddo = await AquariusProvider.getAquarius().retrieveDDO(d)

        const serviceAgreement: ServiceAgreement = await ServiceAgreement
            .executeServiceAgreement(
                d,
                ddo,
                serviceDefinitionId,
                serviceAgreementId,
                serviceAgreementSignature,
                consumer,
                publisher)

        return serviceAgreement
    }
}
