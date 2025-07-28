const { getNamedAccounts } = require("hardhat")
const { getWeth, Deposit_Amount } = require("../scripts/getWeth")

async function main() {
    //the protocol treats everthings as an ERC20 token
    await getWeth()

    const pool = await getLendingPoolAddress()

    await depositToAave(pool)

    await borrowFromAave(pool)
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

    // Get signer and WETH contract
    const deployerSigner = await ethers.getSigner(deployer)
    const iweth = await ethers.getContractAt("IWETH", wethAddress)

    try {
        // Step 1: Approve Aave Pool to spend WETH (WETH already obtained from getWeth())
        console.log("Approving WETH for Aave...")
        const approveTx = await iweth.connect(deployerSigner).approve(pool.target, Deposit_Amount)
        await approveTx.wait(1)
        console.log("✅ WETH approved!")

        // Step 2: Supply WETH to Aave V3
        console.log("Supplying WETH to Aave...")
        const supplyTx = await pool.connect(deployerSigner).supply(
            wethAddress, // asset
            Deposit_Amount, // amount
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

async function borrowFromAave(pool) {
    const { deployer } = await getNamedAccounts()
    const daiAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F" // Mainnet DAI
    const borrowAmount = ethers.parseEther("100") // Borrow 100 DAI

    const deployerSigner = await ethers.getSigner(deployer)

    try {
        console.log("Borrowing DAI from Aave...")

        // Borrow DAI against WETH collateral
        const borrowTx = await pool.connect(deployerSigner).borrow(
            daiAddress, // asset to borrow
            borrowAmount, // amount to borrow
            2, // interestRateMode 
            0, // referralCode
            deployer, // onBehalfOf
        )
        await borrowTx.wait(1)
        console.log("✅ DAI borrowed from Aave!")

        // Check DAI balance
        const daiToken = await ethers.getContractAt("IERC20", daiAddress)
        const daiBalance = await daiToken.balanceOf(deployer)
        console.log(`DAI Balance: ${ethers.formatEther(daiBalance)} DAI`)

        // Check debt token balance
        const reserveData = await pool.getReserveData(daiAddress)
        const debtToken = await ethers.getContractAt("IERC20", reserveData.variableDebtTokenAddress)
        const debtBalance = await debtToken.balanceOf(deployer)
        console.log(`DAI Debt Balance: ${ethers.formatEther(debtBalance)} DAI`)
    } catch (error) {
        console.log("Borrow failed:", error.message)
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
