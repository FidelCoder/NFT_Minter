import React from 'react'
import { Link } from "react-router-dom";
import { Button } from "react-bootstrap";
import {useContractKit} from "@celo-tools/use-contractkit";
import Create  from "../create/Create";
import './Navigation.css'


 const Navigation = () => {
     // gets wallet address and connect and destroy from Contract kit to allow user to log in and log out
     const {address, destroy, connect} = useContractKit();

     return (
         <>

            <nav className="navbar-main p-2 border-b-2">
                <h1 className='py-4 px-4 font-bold text-3xl'>VMS Marketplace</h1>
                <div className='div-links'>
                    <Link to="/explore" className="navbar-links rounded-pill py-3 m-1">
                        Explore
                    </Link>

                    <Link to="/profile" className="navbar-links rounded-pill py-3 m-1">
                        My NFTs
                    </Link>

                    <Create />

                    {!address ? (
                        <>
                            <Button type='button' onClick={connect} variant="outline-dark" className="navbar-btn rounded-pill px-5 m-1">Connect Wallet</Button>
                        </>
                    ): (
                        <>
                            <Button type='button' onClick={destroy} variant="outline-dark" className="navbar-btn rounded-pill px-5 m-1">LOGOUT</Button>
                        </>
                    )}
                </div>
            </nav>
         </>
     )
}

export default Navigation
