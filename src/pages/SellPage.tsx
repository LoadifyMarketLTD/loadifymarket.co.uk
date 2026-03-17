import React from 'react';
import { Link } from 'react-router-dom';

const SellPage = () => {
  return (
    <div className="flex flex-col items-center justify-center p-10">
      <h1 className="text-4xl font-bold mb-4">Welcome to Premium Sellers</h1>
      <p className="text-lg text-center mb-8">Join us and start selling your products with priority visibility!</p>
      <Link to="/" className="bg-[#F4C400] text-[#1E3A5F] px-6 py-3 rounded">Get Started</Link>
    </div>
  );
};

export default SellPage;