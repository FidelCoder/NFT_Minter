import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navigation from './components/navbar/Navigation';
import Explore from './components/explore/Explore';
import Profile from './components/profile/Profile';
import "./App.css";



const App = function AppWrapper() {

  return (
    <>
      <BrowserRouter basename="/NFT_Dapp_Celo">
        <Navigation />
        <Routes>
          <Route path="/" exact element={<Explore />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

export default App;
