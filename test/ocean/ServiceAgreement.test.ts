import {assert} from "chai"
import ConfigProvider from "../../src/ConfigProvider"
import { DDO } from "../../src/ddo/DDO"
import Account from "../../src/ocean/Account"
import DID from "../../src/ocean/DID"
import Ocean from "../../src/ocean/Ocean"
import ServiceAgreement from "../../src/ocean/ServiceAgreements/ServiceAgreement"
import { generateId } from "../../src/utils/GeneratorHelpers"
import config from "../config"
import TestContractHandler from "../keeper/TestContractHandler"


const did: DID = DID.generate()

describe("ServiceAgreement", () => {
    let ocean: Ocean

    let publisherAccount: Account
    let consumerAccount: Account

    before(async () => {
        ConfigProvider.setConfig(config)
        await TestContractHandler.prepareContracts()
        ocean = await Ocean.getInstance(config)
        const accounts = await ocean.getAccounts()

        publisherAccount = accounts[1]
        consumerAccount = accounts[2]
    })

    describe("#signServiceAgreement()", () => {
        xit("should sign an service agreement", async () => {
            // const ddo = new DDO({id: did.getDid(), service: [accessService]})
            // const serviceAgreementId: string = generateId()

            // const serviceAgreementSignature: string = await ServiceAgreement.signServiceAgreement(ddo, accessService.serviceDefinitionId,
            //         serviceAgreementId, consumerAccount)

            // assert(serviceAgreementSignature)
            // assert(serviceAgreementSignature.startsWith("0x"))
            // assert(serviceAgreementSignature.length === 132)
        })
    })
})
