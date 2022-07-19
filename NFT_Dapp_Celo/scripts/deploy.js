// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  // abstraction of the NFT contract
  const MyNFT = await hre.ethers.getContractFactory("NFT");
  // deploys NFT contract
  const myNFT = await MyNFT.deploy();
  // abstraction of the marketplace contract
  const Marketplace = await hre.ethers.getContractFactory("Marketplace");
  // deploys marketplace contract
  const marketplace = await Marketplace.deploy(1);

  // wait for contracts to be deployed
  await myNFT.deployed();
  await marketplace.deployed();

  console.log("NFT deployed to:", myNFT.address);
  // calls function to create and store files with NFT and marketplace addresses
  storeContractData(myNFT, "NFT");
  storeContractData(marketplace, "Marketplace");
}

function storeContractData(contract, name) {
  // require file system library
  const fs = require("fs");
  // name of file where contract will be stored
  const contractsDir = __dirname + "/../src/contracts";

  // create folder if it doesn't exist
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  // write address of contract to file in the directory and parse to JSON
  fs.writeFileSync(
    contractsDir + `/${name}-address.json`,
    JSON.stringify({ address: contract.address }, undefined, 2)
  );

  const MyNFTArtifact = artifacts.readArtifactSync(name);

  // write ABI of contract to the file directory and parse to JSON
  fs.writeFileSync(
    contractsDir + `/${name}.json`,
    JSON.stringify(MyNFTArtifact, null, 2)
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


