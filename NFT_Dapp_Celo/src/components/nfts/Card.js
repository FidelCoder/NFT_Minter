import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { Card, Col, Badge, Stack, Button, Modal, Form, FloatingLabel  } from "react-bootstrap";
import { truncateAddress } from "../../utils";
import Identicon from "../ui/Identicon";
import { toast } from "react-toastify";
import { NotificationSuccess,  NotificationError} from "../ui/Notifications";
import {useMarketContract} from "../../hooks/useMarketContract";
import { useContractKit } from "@celo-tools/use-contractkit";
import { ethers } from "ethers";

const NftCard = ({ nft }) => {
  
  // get user wallet address and performActions function from Celo Contract Kit
  const { address, performActions } = useContractKit();
  const navigate = useNavigate()

  // handles the state of the modal
  const [show, setShow] = useState(false);

  // sets price for relisting acording to user input from change price Button
  const [price, setPrice] = useState(0);
  // creates market contract abstraction
  const marketContract = useMarketContract();

  // check if all form data has been filled
  const isFormFilled = () =>
  nft && price;

  // close the popup modal
  const handleClose = () => {
    setShow(false);
  };

  // function for updating NFT price
  const relistNft = async () => {
    try {
        await performActions(async (kit) => {
          /* user will be prompted to pay the asking process to complete the transaction */
          console.log(price)
          // calls relist function from marketplace contract, passing NFT item id, id that keeps track of each market item 
          // (not tokenId, which tracks the id in the NFT contract)
          const relistItem = await marketContract.methods.relistItem(nft.itemId, price).send({ from: address });
          if (!relistItem) alert("Failed to Re-List NFT." );
          toast(<NotificationSuccess text="Updating NFT list...." />);
          // react component that redirects user to the explore page
          navigate(`/explore`)
        })
      } catch (error) {
        console.log({ error });
        alert("Failed to Re-List NFT." )
        toast(<NotificationError text="Failed to Re-List NFT." />);
      }
    };

  // function for buying listed NFTs
  const buyNft = async () => {
    try {
        // itemId (id that keeps track of each market item)
        const id = parseInt(nft.itemId)

        await performActions(async (kit) => {
          // user wallet address
          const { defaultAccount } = kit;
          // market fee charged for buying NFT, determined when deploying the marketplace contract
          const marketFee = 1;
          // calculation of total price, nft price + fee percentage
          const nftMarketPrice = (nft.price*(100 + marketFee))/100;
          // parse total price to ether
          const _totalPrice =( ethers.utils.parseUnits(nftMarketPrice.toString(), 'ether')).toString();
          console.log(_totalPrice)
          // call function from marketContract specifying the exact price of the NFT,
          // if the price is incorrect wallet will say not able to estimate gas.
          await marketContract.methods.purchaseItem(id).send({ from: defaultAccount, value: _totalPrice });

          alert(`You have successfully purchased this NFT!`)
          // redirects user to profile page
          navigate(`/profile`)
        })
        // updates remove property of nft to true, so the button for buying is updated to Change price (for relisting)
        nft.remove = true
      } catch (error) {
        console.log({ error });
        alert("Failed to Buy NFT." )
        toast(<NotificationError text="Failed to Buy NFT." />);
      }
    };


  // gets the price from the form and updates to Ether
  const getPrice = (e) => {
    try {
      // change price to ether so unit is correct
      const priceFormatted = ethers.utils.parseEther(e.toString())
      // updates price state
      setPrice(priceFormatted);
    } catch (error) {
      console.log({ error })
      toast(<NotificationError text="Price must be a Number." />);
    }
  }

  // display the popup modal
  const handleShow = () => setShow(true);


  return (
    <Col xs={5} sm={3} lg={3} xl={2} key={nft.tokenId} className="p-1 m-5">
      <Card className="h-100">
        <Card.Header>
          <Stack direction="horizontal" className="w-5" gap={3}>
            <Identicon address={nft.seller} size={22} />
            <span className="font-monospace text-secondary">
              {truncateAddress(nft.seller)}
            </span>
            <Badge bg="secondary" className="ms-auto">
              {nft.tokenId} ID
            </Badge>
          </Stack>
        </Card.Header>

        <div className=" ratio ratio-4x3">
          <img src={nft.image} alt={nft.description} />
        </div>

        <Card.Body className="d-flex  flex-column text-center">
          <Card.Title>{nft.name}</Card.Title>
          <Card.Text className="flex-grow-1">{nft.description}</Card.Text>
          <Card.Text className="flex-grow-1">{`${nft.price} USD`}</Card.Text>
          <Card.Text className="flex-grow-1">{nft.exteralUrl}</Card.Text>
        </Card.Body>
        <Card.Footer className="d-flex  flex-row justify-content-center text-center">
          {/*renders buttons conditionally depending on whether or not user is the NFT owner */}
          {!nft.relist && <Button variant="outline-dark" className="rounded-pill px-4 mx-2 card-btn" onClick={buyNft}>Buy</Button>}
          {nft.relist && (
            <>
            <Button
              onClick={handleShow}
              variant="dark"
              className="rounded-pill px-4 card-btn"
            >
              Change price
            </Button>
      
            {/* Modal */}
            <Modal show={show} onHide={handleClose} centered>
              <Modal.Header closeButton>
                <Modal.Title>Re-List NFT</Modal.Title>
              </Modal.Header>
      
              <Modal.Body>
                  <Form>
                      <FloatingLabel
                          controlId="InputPrice"
                          label="Price"
                          className="mb-3"
                          >
                      <Form.Control
                          as="textarea"
                          placeholder="Listing Price for your NFT"
                          style={{ height: "80px" }}
                          onChange={(e) => {
                          getPrice(e.target.value);
                          }}
                      />
                      <select>
                          <option value="CELO">CELO</option>
                      </select>
                      </FloatingLabel>
                  </Form>
              </Modal.Body>
      
              <Modal.Footer>
                <Button variant="outline-secondary" onClick={handleClose}>
                  Close
                </Button>
                <Button
                  variant="dark"
                  disabled={!isFormFilled()}
                  onClick={() => {
                    relistNft();
                    handleClose();
                  }}
                >
                  Re-List NFT
                </Button>
              </Modal.Footer>
            </Modal>
          </>
          )}
        </Card.Footer>
      </Card>
    </Col>
  );
};

NftCard.propTypes = {
  // props passed into this component
  nft: PropTypes.instanceOf(Object).isRequired,
};

export default NftCard;
