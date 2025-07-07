import { ethers, TransactionReceipt } from "./ethers.min.js"
import { abi, contractAddress } from "./constants.js"

const connectButton = document.getElementById("connectButton")
const fundButton = document.getElementById("fundButton")

connectButton.onclick = connect
fundButton.onclick = fund

async function connect() {
    if (typeof window.ethereum != "undefined") {
        await window.ethereum.request({
            method: "eth_requestAccounts",
        })
        connectButton.innerHTML = "Connected!"
    } else {
        connectButton.innerHTML = "Please Install metamask"
    }
}

async function fund() {
    const ethAmount = "77"
    console.log("Funding with:", ethAmount)

    if (typeof window.ethereum != "undefined") {
        // provider / connection to the blockchain
        // signer / wallet / someone with some gas
        // contract that we are interaction with
        // ABI & Address

        const provider = new ethers.BrowserProvider(window.ethereum)
        const signer = await provider.getSigner()
        const contract = new ethers.Contract(contractAddress, abi, signer)

        try {
            const transactionResponse = await contract.fund({
                value: ethers.parseEther(ethAmount),
            })
            await listenForTransactionMine(transactionResponse, provider)
            console.log("Done")
        } catch (error) {
            console.log(error)
        }
    }
}

async function listenForTransactionMine(transactionResponse, provider) {
    console.log(`Mining ${transactionResponse.hash}....`)

    //listen for this transaction to finish
    const receipt = await provider.waitForTransaction(transactionResponse.hash)
    console.log(`Completed with ${receipt.blockNumber} confirmations`)
}
