// imports
const { ethers, run, network } = require("hardhat")

//async main
async function main() {
    console.log("Deploying to network:", network.name)
    console.log("Chain ID:", network.config.chainId)

    const SimpleStorageFactory =
        await ethers.getContractFactory("SimpleStorage")
    console.log("Deploying contract...")
    const simpleStorage = await SimpleStorageFactory.deploy()
    await simpleStorage.waitForDeployment()
    const contractAddress = await simpleStorage.getAddress()
    console.log("Contract deployed to:", contractAddress)

    if (network.config.chainId === 11155111 || process.env.ETHERSCAN_API_KEY) {
        console.log("Verifying contract on Etherscan...")
        await simpleStorage.deploymentTransaction().wait(6) // wait for 6 confirmations
        // Verify the contract
        await verifyContract(contractAddress, [])
    }
}

async function verifyContract(contractAddress, args) {
    console.log("Verifying contract...")
    try {
        await run("verify:verify", {
            address: contractAddress,
            constructorArguments: args,
        })
    } catch (e) {
        if (e.message.toLowerCase().includes("already verified")) {
            console.log("Contract already verified!")
        } else {
            console.error("Error verifying contract:", e)
        }
    }

    console.log("Contract verified!")
}

// main
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
