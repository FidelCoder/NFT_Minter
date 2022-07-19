import { useContract } from "./useContract";
import NFTAbi from "../contracts/NFT.json";
import NFTContractAddress from "../contracts/NFT-address.json";

export const useMinterContract = () =>
  useContract(NFTAbi.abi, NFTContractAddress.address);

