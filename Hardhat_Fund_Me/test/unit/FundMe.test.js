const { assert, expect } = require("chai")
const { deployments, ethers, getNamedAccounts } = require("hardhat")

describe("FundMe", function () {
    let fundMe
    let deployer
    let mockV3Aggregator
    const sendValue = ethers.parseEther("1")

    beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer
        await deployments.fixture(["all"])

        fundMe = await ethers.getContract("FundMe", deployer)
        mockV3Aggregator = await ethers.getContract(
            "MockV3Aggregator",
            deployer
        )
    })

    describe("constructor", function () {
        it("sets the aggregator address correctly", async function () {
            const response = await fundMe.priceFeed()
            console.log("FundMe priceFeed address:", response)
            console.log("Mock Aggregator address:", mockV3Aggregator.target)
            assert.equal(response, mockV3Aggregator.target)
        })
    })

    describe("fund", function () {
        it("Fails if you dont send enough ETH", async function () {
            await expect(fundMe.fund()).to.be.revertedWith(
                "You need to spend more ETH!"
            )
        })

        it("Update the amount funded data structure", async function () {
            await fundMe.fund({ value: sendValue })
            const response = await fundMe.addressToAmountFunded(deployer)
            assert.equal(response.toString(), sendValue.toString())
        })

        it("Add funder to the array of funders", async function () {
            await fundMe.fund({ value: sendValue })
            const funder = await fundMe.funders(0)
            assert.equal(funder, deployer)
        })
    })

    describe("withdraw", function () {
        beforeEach(async function () {
            await fundMe.fund({ value: sendValue })
        })

        it("Withdraw ETH from single founder", async function () {
            //Arrange
            const startingFundMeBalance = await ethers.provider.getBalance(
                fundMe.target
            )

            const startingDeployerBalance = await ethers.provider.getBalance(
                deployer
            )

            //Act
            const transactionResponse = await fundMe.withdraw()
            const transactionReceipt = await transactionResponse.wait(1)

            const { gasPrice, gasUsed } = transactionReceipt

            const gasCost = gasUsed * gasPrice

            const endingFundMeBalance = await ethers.provider.getBalance(
                fundMe.target
            )
            const endingDeployerBalance = await ethers.provider.getBalance(
                deployer
            )

            //Assert
            assert(endingFundMeBalance.toString(), "0")
            assert(
                (startingDeployerBalance + startingFundMeBalance).toString(),
                (endingDeployerBalance + gasCost).toString()
            )
        })
    })
})
