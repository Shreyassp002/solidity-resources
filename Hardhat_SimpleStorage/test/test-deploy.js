const { ethers } = require("hardhat")
const { expect, assert } = require("chai")

describe("SimpleStorage", function () {
    this.timeout(60000)

    let simpleStorage, simpleStorageFactory
    beforeEach(async function () {
        simpleStorageFactory = await ethers.getContractFactory("SimpleStorage")
        simpleStorage = await simpleStorageFactory.deploy()
        
    })

    it("Should start with a favorite number of 0", async function () {
        const currentValue = await simpleStorage.retrieve()
        const expectedValue = "0"

        //assert
        //expect
        assert.equal(currentValue.toString(), expectedValue)
    })

    it("Should update the favorite number", async function () {
      const expectedValue = "45"
      const transactionResponse = await simpleStorage.store(expectedValue)
      await transactionResponse.wait(1)

      const currentValue = await simpleStorage.retrieve()
      assert.equal(currentValue.toString(), expectedValue)
    })
})
