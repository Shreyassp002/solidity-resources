const { getNamedAccounts } = require("hardhat")
const { getWeth } = require("../scripts/getWeth")

async function main() {
    //the protocol treats everthings as an ERC20 token
    await getWeth()
    // const { deployer } = await getNamedAccounts

    // Get the pool contract
    const pool = await getLendingPoolAddress()

    // Now you can use the pool for deposits/withdrawals
    await depositToAave(pool)
}

async function getLendingPoolAddress() {
    //lending pool provider address --> 0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e
    const poolAddressesProviderAddress = "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e" // Mainnet V3

    // 2. GET POOL ADDRESSES PROVIDER CONTRACT (V3) - Using installed package
    const poolAddressesProvider = await ethers.getContractAt(
        "IPoolAddressesProvider",
        poolAddressesProviderAddress,
    )

    console.log("PoolAddressesProvider:", poolAddressesProvider.target)

    // 3. GET POOL ADDRESS FROM PROVIDER
    const poolAddress = await poolAddressesProvider.getPool()
    console.log("Pool address:", poolAddress)

    // 4. GET POOL CONTRACT - Using installed package
    const pool = await ethers.getContractAt("IPool", poolAddress)
    console.log("Pool contract connected!")

    return pool
}

async function depositToAave(pool) {
    const { deployer } = await getNamedAccounts()
    const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    const depositAmount = ethers.parseEther("1")

    // Get signer and WETH contract
    const deployerSigner = await ethers.getSigner(deployer)
    const iweth = await ethers.getContractAt("IWETH", wethAddress)

    try {
        // Step 1: Approve Aave Pool to spend WETH (WETH already obtained from getWeth())
        console.log("Approving WETH for Aave...")
        const approveTx = await iweth.connect(deployerSigner).approve(pool.target, depositAmount)
        await approveTx.wait(1)
        console.log("✅ WETH approved!")

        // Step 2: Supply WETH to Aave V3
        console.log("Supplying WETH to Aave...")
        const supplyTx = await pool.connect(deployerSigner).supply(
            wethAddress, // asset
            depositAmount, // amount
            deployer, // onBehalfOf
            0, // referralCode
        )
        await supplyTx.wait(1)
        console.log("✅ WETH supplied to Aave!")

        // Step 3: Check aToken balance
        const reserveData = await pool.getReserveData(wethAddress)
        const aToken = await ethers.getContractAt("IERC20", reserveData.aTokenAddress)
        const aTokenBalance = await aToken.balanceOf(deployer)
        console.log(`aWETH Balance: ${ethers.formatEther(aTokenBalance)} aWETH`)
    } catch (error) {
        console.log("Deposit failed:", error.message)
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
