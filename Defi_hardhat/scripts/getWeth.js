const { getNamedAccounts, deployments, ethers } = require("hardhat")

async function getWeth() {
    //0x7b79995e5f793a07bc00c21412e50ecae098e7f9 aaddress weth
    const { deployer } = await getNamedAccounts()
    const iweth = await ethers.getContractAt("IWETH", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2")
    console.log(iweth.target)

    const deployerSigner = await ethers.getSigner(deployer) // Turn address into a signer
    const tx = await iweth.connect(deployerSigner).deposit({ value: ethers.parseEther("1") })
    await tx.wait(1)
    
    const wethBalance = await iweth.balanceOf(deployer)
    console.log(`WETH Balance: ${ethers.formatEther(wethBalance)} WETH`)
}

module.exports = { getWeth }
