// HeroSection.tsx
import React from 'react';

const HeroSection = () => {
    return (
        <div className="bg-gray-100 flex flex-col md:flex-row justify-between items-center p-5">
            <div className="flex-1 p-5">
                <h1 className="text-3xl font-bold text-gray-800">Your Premium Countdown</h1>
                <p className="mt-3 text-gray-600">Don’t miss out on exclusive offers!</p>
            </div>
            <div className="flex-1 flex items-center justify-center p-5">
                <div className="bg-white shadow-lg rounded-lg p-5">
                    <h2 className="text-xl font-semibold text-gray-800">Countdown Timer</h2>
                    <div className="mt-3 font-bold text-2xl text-red-600">00:10:00</div>
                </div>
            </div>
        </div>
    );
};

export default HeroSection;