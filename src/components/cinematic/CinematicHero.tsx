import React from 'react';
import './CinematicHero.css';

const CinematicHero = () => {
  return (
    <div className="cinematic-hero">
      <h1>Buy & Sell Anything – Products, Pallets and Bulk Deals</h1>
      <p>Open marketplace where anyone can buy or sell products across the UK.</p>
      <div className="cta-buttons">
        <a href="/shop" className="cta-button">Browse Products</a>
        <a href="/register?type=seller" className="cta-button">Sell on Loadify</a>
        <a href="/bulk" className="cta-button">Bulk & Pallet Deals</a>
      </div>
    </div>
  );
};

export default CinematicHero;