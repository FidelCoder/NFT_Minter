import { create as ipfsHttpClient } from "ipfs-http-client";
import axios from "axios";
import NFTContractAddress from "../contracts/NFT-address.json";
import MarketplaceContractAddress from "../contracts/Marketplace-address.json";

const client = ipfsHttpClient("https://ipfs.infura.io:5001/api/v0");

// helper function for minting the NFTs
export const createNft = async (
    minterContract,
    marketContract,
    price,
    performActions,
    { name, description, exteralUrl, ipfsImage, ownerAddress}
  ) => {
    await performActions(async (kit) => {
      // require that NFT has a name, description and an image
      if (!name || !description || !ipfsImage) return;
      // address of the account that is currently connected to the dapp via the wallet.
      const { defaultAccount } = kit;
  
      // convert NFT metadata to JSON format
      const data = JSON.stringify({
        name,
        description,
        exteralUrl,
        image: ipfsImage,
        owner: defaultAccount
      });
  
      try {
        // save NFT metadata to IPFS
        const added = await client.add(data);
  
        // IPFS url for uploaded metadata
        const url = `https://ipfs.infura.io/ipfs/${added.path}`;


        // mint the NFT and save the IPFS url to the blockchain
        let transaction = await minterContract.methods
          .safeMint(ownerAddress, url)
          .send({ from: defaultAccount });

        console.log(transaction)

        // get tokenId from transaction object (generated by the safeMint method call)
        let event = transaction['events']['Transfer']
        let value = event["returnValues"]["tokenId"]
        let tokenId = parseInt(value)

        // calls function that lists the minted NFT in the marketplace
        let listing = await createMarketItem(defaultAccount, minterContract, marketContract, price, tokenId);

        console.log(listing)
  
      } catch (error) {
        console.log("Error listing NFT: ", error);
      }
    });
};


// uploads image metadata to IPFS (file system storage)
export const uploadToIpfs = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const added = await client.add(file, {
      progress: (prog) => console.log(`received: ${prog}`),
    });
    return `https://ipfs.infura.io/ipfs/${added.path}`;
  } catch (error) {
    console.log("Error uploading file: ", error);
  }
};

// function to get NFTs from the NFT contract
export const getNfts = async (minterContract) => {
  try {
    const nfts = [];
    // gets total amount of NFTs in the contract
    const nftsLength = await minterContract.methods.totalSupply().call();
    // loop through all NFTs
    for (let i = 0; i < Number(nftsLength); i++) {
      const nft = new Promise(async (resolve) => {
        // get NFT token URI to retrieve NFT metadata
        const res = await minterContract.methods.tokenURI(i).call();
        const meta = await fetchNftMeta(res);
        const owner = await fetchNftOwner(minterContract, i);
        resolve({
          index: i,
          owner,
          name: meta.data.name,
          image: meta.data.image,
          description: meta.data.description
        });
      });
      nfts.push(nft);
    }
    return Promise.all(nfts);
  } catch (e) {
    console.log({ e });
  }
};

// gets NFT metadata from IPFS
export const fetchNftMeta = async (ipfsUrl) => {
  try {
    if (!ipfsUrl) return null;
    const meta = await axios.get(ipfsUrl);
    return meta;
  } catch (e) {
    console.log({ e });
  }
};

// gets NFT owner from NFT contract
export const fetchNftOwner = async (minterContract, index) => {
  try {
    return await minterContract.methods.ownerOf(index).call();
  } catch (e) {
    console.log({ e });
  }
};

// get NFT contract owner
export const fetchNftContractOwner = async (minterContract) => {
  try {
    let owner = await minterContract.methods.owner().call();
    return owner;
  } catch (e) {
    console.log({ e });
  }
};

// List NFT in the marketplace
export const createMarketItem = async (address, minterContract, marketContract, price, tokenId) => {
  try {

    console.log(price)
    // allows marketplace to trade the user NFTs
    await minterContract.methods.setApprovalForAll(MarketplaceContractAddress.address, true).send({ from: address })
    // creates the NFT item in the marketplace contract
    let owner = await marketContract.methods.makeItem(NFTContractAddress.address, tokenId, price).send({ from: address });
    return owner;
  } catch (e) {
    console.log({ e });
  }
};
  