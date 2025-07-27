const { getWeth } = require("../scripts/getWeth")

async function main() {
    //the protocol treats everthings as an ERC20 token
    await getWeth()
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
