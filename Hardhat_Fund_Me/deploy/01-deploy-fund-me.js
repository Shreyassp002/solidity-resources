// const { getAccountPath } = require("ethers");

const { networks } = require("../hardhat.config")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const{ deploy, log} = deployments
    const{deployer} = await getNamedAccounts
    const chainId = networks.config.chainId
}