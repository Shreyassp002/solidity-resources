import { ethers, TransactionReceipt } from "./ethers.min.js"
import { abi, contractAddress } from "./constants.js"

const connectButton = document.getElementById("connectButton")
const fundButton = document.getElementById("fundButton")
const balanceButton = document.getElementById("balanceButton")
const withdrawButton = document.getElementById("withdrawButton")

connectButton.onclick = connect
fundButton.onclick = fund
balanceButton.onclick = getBalance
withdrawButton.onclick = withdraw

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

async function getBalance() {
    if (typeof window.ethereum != undefined) {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const balance = await provider.getBalance(contractAddress)
        console.log(ethers.formatEther(balance))
    }
}

async function fund() {
    const ethAmount = document.getElementById("ethAmount").value
    console.log("Funding with:", ethAmount, "Ethereum")

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
    console.log(`Mining ${transactionResponse.hash}...`)
    try {
        const receipt = await provider.waitForTransaction(
            transactionResponse.hash,
        )
        console.log(`Completed with ${receipt.blockNumber} confirmations`)
        return receipt
    } catch (error) {
        console.error("Error waiting for transaction:", error)
        throw error
    }
}

async function withdraw() {
    if (typeof window.ethereum != undefined) {
        console.log("Withdrawing...")
        const provider = new ethers.BrowserProvider(window.ethereum)
        const signer = await provider.getSigner()
        const contract = new ethers.Contract(contractAddress, abi, signer)

        try {
            const transactionResponse = await contract.withdraw()
            await listenForTransactionMine(transactionResponse, provider)
        } catch (error) {
            console.log(error)
        }
    }
}
