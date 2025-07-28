const { getNamedAccounts } = require("hardhat")
const { getWeth, Deposit_Amount } = require("../scripts/getWeth")

//Mainnet Addresses
const daiAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
const poolAddressesProviderAddress = "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e"

async function main() {
    //the protocol treats everthings as an ERC20 token
    await getWeth()

    const pool = await getLendingPoolAddress()

    await depositToAave(pool)

    console.log("\n=== BORROWING CAPACITY CHECK ===")
    await checkBorrowingCapacity(pool)

    await borrowFromAave(pool)

    // Wait a bit to see the borrowed amount, then repay
    console.log("\n=== REPAYING LOAN ===")
    await repayToAave(pool)
}

async function getLendingPoolAddress() {
    // 2. GET POOL ADDRESSES PROVIDER CONTRACT
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

async function approveToken(tokenAddress, spenderAddress, amount, tokenName = "Token") {
    const { deployer } = await getNamedAccounts()
    const deployerSigner = await ethers.getSigner(deployer)

    try {
        console.log(
            `Approving ${tokenName} for ${spenderAddress.slice(0, 6)}...${spenderAddress.slice(-4)}...`,
        )

        const token = await ethers.getContractAt("IERC20", tokenAddress)

        // Check current allowance first
        const currentAllowance = await token.allowance(deployer, spenderAddress)

        if (currentAllowance >= amount) {
            console.log(
                `✅ ${tokenName} already has sufficient allowance: ${ethers.formatEther(currentAllowance)}`,
            )
            return true
        }

        // If allowance is insufficient, approve the required amount
        const approveTx = await token.connect(deployerSigner).approve(spenderAddress, amount)
        await approveTx.wait(1)

        console.log(`✅ ${tokenName} approved! Amount: ${ethers.formatEther(amount)}`)
        return true
    } catch (error) {
        console.log(`❌ ${tokenName} approval failed:`, error.message)
        return false
    }
}

async function depositToAave(pool) {
    const { deployer } = await getNamedAccounts()
    const deployerSigner = await ethers.getSigner(deployer)

    try {
        // Step 1: Approve Aave Pool to spend WETH
        const approvalSuccess = await approveToken(wethAddress, pool.target, Deposit_Amount, "WETH")
        if (!approvalSuccess) {
            console.log("❌ WETH approval failed, cannot proceed with deposit")
            return
        }

        // Step 2: Supply WETH to Aave
        console.log("\nSupplying WETH to Aave...")
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
    const borrowAmount = ethers.parseEther("100") // Borrow 100 DAI

    const deployerSigner = await ethers.getSigner(deployer)

    try {
        console.log("\nBorrowing DAI from Aave...")

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

async function repayToAave(pool) {
    const { deployer } = await getNamedAccounts()
    const deployerSigner = await ethers.getSigner(deployer)

    try {
        console.log("Starting repayment process...")

        // Get DAI contract
        const daiToken = await ethers.getContractAt("IERC20", daiAddress)

        // Check current DAI balance
        const daiBalance = await daiToken.balanceOf(deployer)
        console.log(`Current DAI Balance: ${ethers.formatEther(daiBalance)} DAI`)

        // Get current debt amount
        const reserveData = await pool.getReserveData(daiAddress)
        const debtToken = await ethers.getContractAt("IERC20", reserveData.variableDebtTokenAddress)
        const debtBalance = await debtToken.balanceOf(deployer)
        console.log(`Current DAI Debt: ${ethers.formatEther(debtBalance)} DAI`)

        if (debtBalance > 0) {
            // Determine repay amount (use full debt balance or available DAI balance, whichever is smaller)
            const repayAmount = daiBalance >= debtBalance ? debtBalance : daiBalance

            console.log(`Repaying: ${ethers.formatEther(repayAmount)} DAI`)

            // Step 1: Approve DAI for repayment using reusable function
            const approvalSuccess = await approveToken(daiAddress, pool.target, repayAmount, "DAI")
            if (!approvalSuccess) {
                console.log("❌ DAI approval failed, cannot proceed with repayment")
                return
            }

            // Step 2: Repay the loan
            console.log("Repaying DAI loan...")
            const repayTx = await pool.connect(deployerSigner).repay(
                daiAddress, // asset to repay
                repayAmount, // amount to repay (or use ethers.MaxUint256 for full repayment)
                2, // interestRateMode (2 = variable rate)
                deployer, // onBehalfOf
            )
            await repayTx.wait(1)
            console.log("✅ DAI loan repaid!")

            // Step 3: Check balances after repayment
            const newDaiBalance = await daiToken.balanceOf(deployer)
            const newDebtBalance = await debtToken.balanceOf(deployer)

            console.log(`\n📊 === AFTER REPAYMENT ===`)
            console.log(`DAI Balance: ${ethers.formatEther(newDaiBalance)} DAI`)
            console.log(`Remaining Debt: ${ethers.formatEther(newDebtBalance)} DAI`)

            if (newDebtBalance == 0) {
                console.log("🎉 Loan fully repaid! Your collateral is now free.")
            } else {
                console.log(
                    `💡 Partial repayment completed. ${ethers.formatEther(newDebtBalance)} DAI debt remaining.`,
                )
            }

            // Show updated borrowing capacity
            console.log("\n=== UPDATED BORROWING CAPACITY ===")
            await checkBorrowingCapacity(pool)
        } else {
            console.log("ℹ️ No debt to repay.")
        }
    } catch (error) {
        console.log("❌ Repayment failed:", error.message)

        // Common error handling
        if (error.message.includes("insufficient balance")) {
            console.log(
                "💡 Make sure you have enough DAI to cover the repayment + any interest accrued.",
            )
        } else if (error.message.includes("allowance")) {
            console.log("💡 DAI approval might have failed. Try increasing gas limit.")
        }
    }
}

async function checkBorrowingCapacity(pool) {
    const { deployer } = await getNamedAccounts()

    try {
        console.log("💰 Checking how much you can borrow...")

        // Get user account data
        const accountData = await pool.getUserAccountData(deployer)
        const availableBorrowsBase = ethers.formatEther(accountData[2]) // This is in USD

        // Get price oracle
        const poolAddressesProvider = await ethers.getContractAt(
            "IPoolAddressesProvider",
            poolAddressesProviderAddress,
        )

        const priceOracleAddress = await poolAddressesProvider.getPriceOracle()
        const priceOracle = await ethers.getContractAt("IAaveOracle", priceOracleAddress)

        // Get prices
        const daiPrice = await priceOracle.getAssetPrice(daiAddress)
        const wethPrice = await priceOracle.getAssetPrice(wethAddress)

        const daiPriceUSD = Number(ethers.formatEther(daiPrice))
        const wethPriceUSD = Number(ethers.formatEther(wethPrice))

        // Calculate borrowing capacity
        const maxBorrowDAI = Number(availableBorrowsBase) / daiPriceUSD
        const safeBorrowDAI = maxBorrowDAI * 0.8 // 80% for safety

        // Show WETH deposit info
        const depositedWeth = Number(ethers.formatEther(Deposit_Amount))
        const depositValueUSD = depositedWeth * wethPriceUSD

        console.log(`\n📊 === YOUR BORROWING POWER ===`)
        console.log(`🏦 Deposited: ${depositedWeth} WETH ($${depositValueUSD.toFixed(2)})`)
        console.log(`💎 WETH Price: $${wethPriceUSD.toFixed(2)}`)
        console.log(`🪙 DAI Price: $${daiPriceUSD.toFixed(4)}`)
        console.log(`\n💰 Available to borrow: $${availableBorrowsBase} USD`)
        console.log(`🎯 Max DAI you can borrow: ${maxBorrowDAI.toFixed(2)} DAI`)
        console.log(`✅ Safe amount to borrow: ${safeBorrowDAI.toFixed(2)} DAI`)
        console.log(
            `📈 That's ${((safeBorrowDAI / ((depositedWeth * wethPriceUSD) / daiPriceUSD)) * 100).toFixed(1)}% of your WETH value`,
        )

        return {
            maxBorrowDAI: maxBorrowDAI.toFixed(2),
            safeBorrowDAI: safeBorrowDAI.toFixed(2),
            depositedWeth,
            wethPriceUSD,
            daiPriceUSD,
        }
    } catch (error) {
        console.log("❌ Failed to check borrowing capacity:", error.message)
        console.log("💡 You can still try borrowing a small amount like 50-100 DAI")
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
