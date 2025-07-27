const { getNamedAccounts } = require("hardhat")
const { getWeth } = require("../scripts/getWeth")

async function main() {
    //the protocol treats everthings as an ERC20 token
    await getWeth()
    // const { deployer } = await getNamedAccounts

    //lending pool provider address --> 0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e
    const poolAddressesProviderAddress = "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e" // Mainnet V3

    // 2. GET POOL ADDRESSES PROVIDER CONTRACT (V3) - Using installed package
    const poolAddressesProvider = await ethers.getContractAt(
        "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol:IPoolAddressesProvider",
        poolAddressesProviderAddress,
    )

    console.log("PoolAddressesProvider:", poolAddressesProvider.target)

    // 3. GET POOL ADDRESS FROM PROVIDER
    const poolAddress = await poolAddressesProvider.getPool()
    console.log("Pool address:", poolAddress)

    // 4. GET POOL CONTRACT - Using installed package
    const pool = await ethers.getContractAt(
        "@aave/core-v3/contracts/interfaces/IPool.sol:IPool",
        poolAddress,
    )
    console.log("Pool contract connected!")
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
