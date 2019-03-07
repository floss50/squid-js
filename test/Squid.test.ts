import * as assert from "assert"
import * as squid from "../src/squid"

describe("Squid", () => {

    describe("interface", () => {

        it("should expose Ocean", async () => {
            assert(squid.Ocean)
        })

        it("should expose Logger", async () => {
            assert(squid.Logger)
        })
    })

})
