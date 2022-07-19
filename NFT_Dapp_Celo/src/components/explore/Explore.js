import React, { useEffect, useState, useCallback } from "react";
import PropTypes from "prop-types";
import Nft from "../nfts/Card";
import Loader from "../ui/Loader";
import { Row } from "react-bootstrap";
import { useMarketContract } from "../../hooks/useMarketContract";
import { useMinterContract } from "../../hooks/useMinterContract";
import axios from "axios";
import {ethers} from "ethers";
import { useContractKit } from "@celo-tools/use-contractkit";
import { RingLoader } from "react-spinners";
import './Explore.css';




const Explore = () => {
    // to keep track of all NFTs to map over later
    const [nfts, setNfts] = useState([]);
    // check if NFTs are loaded or not
    const [loading, setLoading] = useState(false);

    // gets the wallet address of user that is currently connected
    const { address } = useContractKit();
    // create marketplace contract abstraction
    const marketContract = useMarketContract();
    // create NFT contract abstraction
    const minterContract = useMinterContract();

    const getAssets = useCallback(async () => {
        try {
            // sets loading to true so it displays react animation while NFTs load
            setLoading(true);
            // calls fetchMarketItems from marketplace contract to get info from all the items
            const data = await marketContract.methods.fetchMarketItems().call()
            // map through all items
            const items = await Promise.all(data.map(async marketItem => {
                // gets the tokenId for each market item
                const tokenId = Number(marketItem.tokenId);
                // gets tokenURI for each market item
                const tokenURI = await minterContract.methods.tokenURI(tokenId).call();
                // get the address of NFT owner (used to filter out NFTs that are not owned by user)
                const seller = marketItem.seller;
                // get NFT metadata
                const meta = await axios.get(tokenURI);
                // get price and convert unit to ether
                let price = ethers.utils.formatUnits(marketItem.price, 'ether');

                // return an object with all item info needed for other functions
                return {
                    image: meta.data.image,
                    description: meta.data.description,
                    externalUrl: meta.data.externalUrl,
                    seller: seller,
                    name: meta.data.name,
                    price: price,
                    tokenURI: tokenURI,
                    tokenId: tokenId,
                    itemId: marketItem.itemId,
                }
            }))
            if (!items) return;
            
            await items.map(nft => {
              nft['remove'] = true
              console.log(nft)
              // add remove property for allowing to display buttons conditionally later
              return address.toLowerCase() === nft.seller.toLowerCase() ? nft['relist'] = true : nft['relist'] = false
            })
            // set NFTs list to items
            setNfts(items);               
            
        } catch (error) {
          console.log({ error });
        } finally {
          // set loading to false so it stops react animation
          setLoading(false);
        }
      }, [minterContract, marketContract, address]);

      useEffect(() => {
        try {
          if (marketContract) {
            // gets all market Items when the page loads
            getAssets();
          }
        } catch (error) {
          console.log({ error });
        }
      }, [marketContract, getAssets]);

    return (
        <>
        {!loading ? (
            <div className="explore-section">
              {nfts.length >= 1 ? (
              <Row xs={1} sm={1} lg={1} className="w-100">
                  {nfts.map((_nft) => (
                      <Nft
                          key={_nft.tokenId}
                          nft={{
                          ..._nft,
                          }}
                      />
                  ))}
              </Row>
              ) : (
                  <div className="nonfts-div">
                      {<RingLoader color={"green"} size={150} />}
                      <span className="nonfts-text">No NFTs yet <br /> Create one to display</span>
                  </div>
              )
              }
            </div>
        ) : (
            <Loader />
        )}
        </>
    );
    };
    

Explore.propTypes = {
    minterContract: PropTypes.instanceOf(Object)
 };
    
Explore.defaultProps = {
minterContract: null,
};

export default Explore;
