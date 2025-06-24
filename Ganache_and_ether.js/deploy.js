const { ethers } = require("ethers");
const fs = require("fs-extra");

async function main() {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:7545");

  const wallet = new ethers.Wallet(
    "0x53b7091d6a844bef41a4b49baacf1fa6237261af9fae95af3d8a0b1abd850cb6",
    provider
  );

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

  const storeFavoriteNumberTx = await contract.store("42");
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
