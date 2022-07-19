const { expect } = require("chai");
const { ethers } = require("hardhat");

const toWei = (num) => ethers.utils.parseEther(num.toString())
const fromWei = (num) => ethers.utils.formatEther(num)


describe("NFT", function () {
  this.timeout(50000);

  let myNFT;
  let owner;
  let acc1;
  let acc2;

  this.beforeEach(async function () {
    // This is executed before each test
    // Deploying the smart contract
    const MyNFT = await ethers.getContractFactory("NFT");
    [owner, acc1, acc2] = await ethers.getSigners();

    myNFT = await MyNFT.deploy();
  });

  it("Should set the right owner", async function () {
    expect(await myNFT.owner()).to.equal(owner.address);
  });

  /* 
   it('TestContract balance should starts with 0 ETH', async () => {
        let balance = await web3.eth.getBalance(instance.address);
        assert.equal(balance, 0);
    })

    it('TestContract balance should has 1 ETH after deposit', async () => {
        let one_eth = web3.toWei(1, "ether");
        await web3.eth.sendTransaction({from: accounts[1], to: instance.address, value: one_eth});
        let balance_wei = await web3.eth.getBalance(instance.address);
        let balance_ether = web3.fromWei(balance_wei.toNumber(), "ether");
        assert.equal(balance_ether, 1);
    })

    facilitator.recordOrder(orderNumber, {value: web3.toWei(2, 'ether')});
  */
  
  it("Should mint one NFT", async function () {
    expect(await myNFT.balanceOf(acc1.address)).to.equal(0);

    //To make any call with impersonated, you will need to send some eth
    await owner.sendTransaction({
      to: acc1.address,
      value: ethers.utils.parseEther("10.0"),
    });

    const tokenURI = "https://example.com/1";
    const tx = await myNFT.connect(owner).safeMint(acc1.address, tokenURI);
    await tx.wait();

    expect(await myNFT.balanceOf(acc1.address)).to.equal(1);
  });

  it("Should set the correct tokenURI", async function () {
    const tokenURI_1 = "https://example.com/1";
    const tokenURI_2 = "https://example.com/2";

    await owner.sendTransaction({
      to: acc1.address,
      value: ethers.utils.parseEther("10.0"),
    });

    await owner.sendTransaction({
      to: acc2.address,
      value: ethers.utils.parseEther("10.0"),
    });

    const tx1 = await myNFT.connect(owner).safeMint(acc1.address, tokenURI_1);
    await tx1.wait();
    const tx2 = await myNFT.connect(owner).safeMint(acc2.address, tokenURI_2);
    await tx2.wait();

    expect(await myNFT.tokenURI(0)).to.equal(tokenURI_1);
    expect(await myNFT.tokenURI(1)).to.equal(tokenURI_2);
  });
});


describe("NFTMarketplace", function () {

  let NFT;
  let nft;
  let Marketplace;
  let marketplace
  let deployer;
  let addr1;
  let addr2;
  let addrs;
  let feePercent = 1;
  let URI = "sample URI"

  beforeEach(async function () {
    // Get the ContractFactories and Signers here.
    NFT = await ethers.getContractFactory("NFT");
    Marketplace = await ethers.getContractFactory("Marketplace");
    [deployer, addr1, addr2, ...addrs] = await ethers.getSigners();

    // To deploy our contracts
    nft = await NFT.deploy();
    marketplace = await Marketplace.deploy(feePercent);


  });

  describe("Deployment", function () {

    it("Should track name and symbol of the nft collection", async function () {
      // This test expects the owner variable stored in the contract to be equal
      // to our Signer's owner.
      const nftName = "NFT"
      const nftSymbol = "VMS"
      expect(await nft.name()).to.equal(nftName);
      expect(await nft.symbol()).to.equal(nftSymbol);
    });

    it("Should track feeAccount and feePercent of the marketplace", async function () {
      expect(await marketplace.feeAccount()).to.equal(deployer.address);
      expect(await marketplace.feePercent()).to.equal(feePercent);
    });
  });

  describe("Making marketplace items", function () {
    let price = 1
    beforeEach(async function () {
      await deployer.sendTransaction({
        to: addr1.address,
        value: ethers.utils.parseEther("10.0"),
      });
  
      // addr1 mints an nft
      await nft.connect(deployer).safeMint(addr1.address, URI);

      // addr1 approves marketplace to spend nft
      await nft.connect(addr1).setApprovalForAll(marketplace.address, true)
    })


    it("Should track newly created item, transfer NFT from seller to marketplace and emit Offered event", async function () {
      // addr1 offers their nft at a price of 1 ether
      await expect(marketplace.connect(addr1).makeItem(nft.address, 0, toWei(price)))
        .to.emit(marketplace, "Offered")
        .withArgs(
          1,
          nft.address,
          0,
          toWei(price),
          addr1.address
        )
        // Owner of NFT should now be the marketplace
        expect(await nft.ownerOf(0)).to.equal(marketplace.address);
        // Item count should now equal 1
        expect(await marketplace.itemCount()).to.equal(1)
        // Get item from items mapping then check fields to ensure they are correct
        const item = await marketplace.items(1)
        expect(item.itemId).to.equal(1)
        expect(item.nft).to.equal(nft.address)
        expect(item.tokenId).to.equal(0)
        expect(item.price).to.equal(toWei(price))
        expect(item.sold).to.equal(false)
    });

    it("Should fail if price is set to zero", async function () {
      await expect(
        marketplace.connect(addr1).makeItem(nft.address, 1, 0)
      ).to.be.revertedWith("Price must be greater than zero");
    });

  });
  describe("Purchasing marketplace items", function () {
    let price = 1
    let fee = (feePercent/100)*price
    let totalPriceInWei
    beforeEach(async function () {
      await deployer.sendTransaction({
        to: addr1.address,
        value: ethers.utils.parseEther("10.0"),
      });
  
      // addr1 mints an nft
      await nft.connect(deployer).safeMint(addr1.address, URI);
      // addr1 approves marketplace to spend tokens
      await nft.connect(addr1).setApprovalForAll(marketplace.address, true)
      // addr1 makes their nft a marketplace item.
      await marketplace.connect(addr1).makeItem(nft.address, 0 , toWei(price))
    })
    it("Should update item as sold, pay seller, transfer NFT to buyer, charge fees and emit a Bought event", async function () {
      const sellerInitalEthBal = await addr1.getBalance()
      const feeAccountInitialEthBal = await deployer.getBalance()
      // fetch items total price (market fees + item price)
      totalPriceInWei = await marketplace.getTotalPrice(1);
      // addr 2 purchases item.
      await expect(marketplace.connect(addr2).purchaseItem(1, {value: totalPriceInWei}))
      .to.emit(marketplace, "Bought")
        .withArgs(
          1,
          nft.address,
          0,
          toWei(price),
          addr1.address,
          addr2.address
        )
      const sellerFinalEthBal = await addr1.getBalance()
      const feeAccountFinalEthBal = await deployer.getBalance()
      // Item should be marked as sold
      expect((await marketplace.items(1)).sold).to.equal(true)
      // Seller should receive payment for the price of the NFT sold.
      expect(+fromWei(sellerFinalEthBal)).to.equal(+price + +fromWei(sellerInitalEthBal))
      // feeAccount should receive fee
      expect(+fromWei(feeAccountFinalEthBal)).to.equal(+fee + +fromWei(feeAccountInitialEthBal))
      // The buyer should now own the nft
      expect(await nft.ownerOf(0)).to.equal(addr2.address);
    })
    it("Should fail for invalid item ids, sold items and when not enough ether is paid", async function () {
      // fails for invalid item ids
      await expect(
        marketplace.connect(addr2).purchaseItem(2, {value: totalPriceInWei})
      ).to.be.revertedWith("item doesn't exist");
      await expect(
        marketplace.connect(addr2).purchaseItem(0, {value: totalPriceInWei})
      ).to.be.revertedWith("item doesn't exist");
      // Fails when not enough ether is paid with the transaction. 
      // In this instance, fails when buyer only sends enough ether to cover the price of the nft
      // not the additional market fee.
      await expect(
        marketplace.connect(addr2).purchaseItem(1, {value: toWei(price)})
      ).to.be.revertedWith("not enough ether to cover item price and market fee"); 
      // addr2 purchases item 1
      await marketplace.connect(addr2).purchaseItem(1, {value: totalPriceInWei})
      // addr3 tries purchasing item 1 after its been sold 
      const addr3 = addrs[0]
      await expect(
        marketplace.connect(addr3).purchaseItem(1, {value: totalPriceInWei})
      ).to.be.revertedWith("item already sold");
    });

    it("Should fetch all market items", async function() {
      const data = await marketplace.connect(deployer).fetchMarketItems()
    })

    it("Should remove item from marketplace", async function() {
      const data = await marketplace.connect(deployer).removeItem(0)
    })

  })
})

