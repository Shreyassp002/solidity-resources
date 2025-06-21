const { ethers } = require("ethers");
const fs = require("fs-extra");

async function main() {``
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:7545");

  const wallet = new ethers.Wallet(
    "0x626df2558b2b5ad17e9a80fa1effe4f8676d79b3fa3aede3179a73d1e6a753a5",
    provider
  );

  const abi = fs.readFileSync("./SimpleStorage_sol_SimpleStorage.abi", "utf8");
  const binary = fs.readFileSync(
    "./SimpleStorage_sol_SimpleStorage.bin",
    "utf8"
  );

  const contractFactory = new ethers.ContractFactory(abi, binary, wallet);

  console.log("Deploying contract...");
  const contract = await contractFactory.deploy({ gasLimit: 5000000 });

  const contractAddress = contract.target;

  console.log("Contract deployed to:", contractAddress);
  const transactionReceipt = await contract.deploymentTransaction();
  console.log(transactionReceipt);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
