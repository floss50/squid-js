import {assert} from "chai"
import ConfigProvider from "../../../src/ConfigProvider"
import { EscrowAccessSecretStoreTemplate } from "../../../src/keeper/contracts/templates"
import Keeper from "../../../src/keeper/Keeper"
import config from "../../config"
import TestContractHandler from "../TestContractHandler"

let condition: EscrowAccessSecretStoreTemplate

describe("EscrowAccessSecretStoreTemplate", () => {

    before(async () => {
        ConfigProvider.setConfig(config)
        await TestContractHandler.prepareContracts()
        condition = (await Keeper.getInstance()).templates.escrowAccessSecretStoreTemplate

    })

    // describe("#hashValues()", () => {
    //     it("should hash the values", async () => {
    //         const address = `0x${"a".repeat(40)}`
    //         const hash = await condition.hashValues(address, 15)

    //         assert.match(hash, /^0x[a-f0-9]{64}$/i)
    //     })
    // })

})
