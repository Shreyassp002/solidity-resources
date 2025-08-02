const { network, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

const FUND_AMOUNT = ethers.parseEther("1") // 1 Ether, or 1e18 (10^18) Wei

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    let vrfCoordinatorV2PlusAddress, subscriptionId

    if (developmentChains.includes(network.name)) {
        // For development chains,
        const vrfCoordinatorV2PlusMockDeployment = await deployments.get("VRFCoordinatorV2_5Mock")
        const vrfCoordinatorV2PlusMock = await ethers.getContractAt(
            "VRFCoordinatorV2_5Mock",
            vrfCoordinatorV2PlusMockDeployment.address,
        )
        vrfCoordinatorV2PlusAddress = vrfCoordinatorV2PlusMock.target

        // Create subscription
        const transactionResponse = await vrfCoordinatorV2PlusMock.createSubscription()
        const transactionReceipt = await transactionResponse.wait(1)

        // Parse the event properly
        const subscriptionCreatedEvent = transactionReceipt.logs[0]
        const parsedEvent = vrfCoordinatorV2PlusMock.interface.parseLog(subscriptionCreatedEvent)
        subscriptionId = parsedEvent.args.subId

        // Fund the subscription with LINK tokens
        await vrfCoordinatorV2PlusMock.fundSubscription(subscriptionId, FUND_AMOUNT)
    } else {
        // For live networks, use the v2.5 coordinator address
        vrfCoordinatorV2PlusAddress = networkConfig[chainId]["vrfCoordinatorV2Plus"]
        subscriptionId = networkConfig[chainId]["subscriptionId"]
    }

    const gasLane = networkConfig[chainId]["gasLane"]
    const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"]
    const mintFee = networkConfig[chainId]["mintFee"]

    // Define the dog token URIs - ensure exactly 3 elements for string[3]
    const dogTokenUris = [
        "https://ipfs.io/ipfs/bafkreict6vwuolrk7kc7zek6cmnjsxjgyiss24qupbuna6sfvtx7ubzpna", // SHIBA_INU
        "https://ipfs.io/ipfs/bafkreifnfwp2aqz73mfws3jl7djlxeadhl7a7l4uzcpogoslajezhffvmq", // GERMAN_SHEPHERD
        "https://ipfs.io/ipfs/bafkreie4oafegfl5t56p3qcfpyx6iazxhwh62unjh3ftvax7fi64hxz3om", // INDIE
    ]

    // Validate array length
    if (dogTokenUris.length !== 3) {
        throw new Error(`Expected exactly 3 dog token URIs, got ${dogTokenUris.length}`)
    }

    const args = [
        vrfCoordinatorV2PlusAddress,
        subscriptionId,
        gasLane,
        mintFee,
        callbackGasLimit,
        dogTokenUris,
    ]

    log("Deploying RandomIpfsNft with args:", args)

    const randomIpfsNft = await deploy("RandomIpfsNft", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    // For development chains, add the contract as a consumer AFTER deployment
    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2PlusMockDeployment = await deployments.get("VRFCoordinatorV2_5Mock")
        const vrfCoordinatorV2PlusMock = await ethers.getContractAt(
            "VRFCoordinatorV2_5Mock",
            vrfCoordinatorV2PlusMockDeployment.address,
        )
        await vrfCoordinatorV2PlusMock.addConsumer(subscriptionId, randomIpfsNft.address)
        log("Added contract as VRF consumer")
    }

    // Verify the deployment
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(randomIpfsNft.address, args)
    }

    log("RandomIpfsNft deployed successfully!")
}

module.exports.tags = ["all", "randomipfs", "main"]
