async function main() {
  console.log("Deploying contracts...");
  let variable = 5;
  console.log(variable);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
