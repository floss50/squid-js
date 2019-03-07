import save = require("save-file")
import { File } from "../ddo/MetaData"
import Config from "../models/Config"
import Account from "../ocean/Account"
import Logger from "../utils/Logger"
import WebServiceConnectorProvider from "../utils/WebServiceConnectorProvider"

const apiPath = "/api/v1/brizo/services"

/**
 * Provides a interface with Brizo.
 * Brizo is the technical component executed by the Publishers allowing to them to provide extended data services.
 */
export default class Brizo {
    private url: string

    constructor(config: Config) {
        this.url = config.brizoUri
    }

    public getPurchaseEndpoint() {
        return `${this.url}${apiPath}/access/initialize`
    }

    public getConsumeEndpoint() {
        return `${this.url}${apiPath}/consume`
    }

    public getComputeEndpoint(pubKey: string, serviceId: string, algo: string, container: string) {
        // tslint:disable-next-line
        return `${this.url}${apiPath}/compute`
    }

    public async initializeServiceAgreement(
        did: string,
        serviceAgreementId: string,
        serviceDefinitionId: string,
        signature: string,
        consumerAddress: string,
    ): Promise<any> {

        const args = {
            did,
            serviceAgreementId,
            serviceDefinitionId,
            signature,
            consumerAddress,
        }

        try {
            return await WebServiceConnectorProvider
                .getConnector()
                .post(
                    this.getPurchaseEndpoint(),
                    decodeURI(JSON.stringify(args)),
                )
        } catch (e) {
            Logger.error(e)
            throw new Error("HTTP request failed")
        }
    }

    public async consumeService(
        agreementId: string,
        serviceEndpoint: string,
        account: Account,
        files: File[],
        destination: string,
    ): Promise<string> {
        const filesPromises = files
            .map(async ({url}, i) => {
                let consumeUrl = serviceEndpoint
                consumeUrl += `?url=${url}`
                consumeUrl += `&serviceAgreementId=${agreementId}`
                consumeUrl += `&consumerAddress=${account.getId()}`

                try {
                    await this.downloadFile(
                        consumeUrl,
                        url.split("/").pop() || `file-${i}`,
                        destination,
                    )
                } catch (e) {
                    Logger.error("Error consuming assets")
                    Logger.error(e)
                    throw new Error("Error consuming assets")
                }
            })
        await Promise.all(filesPromises)
        return destination
    }

    private async downloadFile(url: string, filename: string, destination?: string): Promise<string> {
        const path = `${destination}${filename}`
        const response = await WebServiceConnectorProvider
            .getConnector()
            .get(url)

        await save(await response.buffer(), path)
        return path
    }
}
