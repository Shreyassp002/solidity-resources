const { ethers } = require("ethers");
const fs = require("fs-extra");
require("dotenv").config();

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  const abi = fs.readFileSync("./SimpleStorage_sol_SimpleStorage.abi", "utf8");
  const binary = fs.readFileSync(
    "./SimpleStorage_sol_SimpleStorage.bin",
    "utf8"
  );

  const contractFactory = new ethers.ContractFactory(abi, binary, wallet);

  console.log("Deploying contract...");

  const nonce = await provider.getTransactionCount(wallet.address, "latest");
  const contract = await contractFactory.deploy({
    nonce: nonce,
    gasLimit: 5000000,
  });

  const contractAddress = contract.target;

  console.log("Contract deployed to:", contractAddress);
  //const transactionReceipt = await contract.deploymentTransaction();
  //console.log(transactionReceipt);

  const favoriteNumber = await contract.retrieve();
  console.log("Favorite Number:", favoriteNumber.toString());

  const storeFavoriteNumberTx = await contract.store("45");
  await storeFavoriteNumberTx.wait();

  const currentFavoriteNumber = await contract.retrieve();
  console.log("Updated Favorite Number:", currentFavoriteNumber.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
