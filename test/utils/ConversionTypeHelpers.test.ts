import { assert } from "chai"
import { zeroX, noZeroX } from "../../src/utils/ConversionTypeHelpers"

describe("ConversionTypeHelpers", () => {
    describe("#zeroX()", () => {
        it("should return the input if it's not hex value", async () => {
            const result1 = zeroX("Test 1")
            const result2 = noZeroX("Test 2")
            assert.equal(result1, "Test 1")
            assert.equal(result2, "Test 2")
        })

        it("should return the value with 0x prefix", async () => {
            const result1 = zeroX("0x1234")
            const result2 = zeroX("1234")
            assert.equal(result1, "0x1234")
            assert.equal(result2, "0x1234")
        })

        it("should return the value without 0x prefix", async () => {
            const result1 = noZeroX("0x1234")
            const result2 = noZeroX("1234")
            assert.equal(result1, "1234",)
            assert.equal(result2, "1234")
        })
    })
})
