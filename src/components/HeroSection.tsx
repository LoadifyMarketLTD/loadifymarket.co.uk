import React, { useEffect, useState } from 'react';

const HeroSection = () => {
    const [timeRemaining, setTimeRemaining] = useState(0);

    const calculateTimeRemaining = () => {
        const endDate = new Date('2026-07-01T00:00:00Z'); // July 1, 2026 00:00:00 UTC
        const now = new Date();
        const timeLeft = endDate.getTime() - now.getTime();
        setTimeRemaining(timeLeft > 0 ? timeLeft : 0);
    };

    useEffect(() => {
        calculateTimeRemaining();
        const timer = setInterval(calculateTimeRemaining, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTimeRemaining = (milliseconds) => {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const days = Math.floor(totalSeconds / (3600 * 24));
        const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);

        return `${days} : ${hours.toString().padStart(2, '0')} : ${minutes.toString().padStart(2, '0')}`;
    };

    return (
        <div className="hero-section">
            <div className="premium-card" style={{ position: 'absolute', top: '10px', right: '10px', padding: '20px', backgroundColor: 'white', borderRadius: '5px', boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)' }}>
                <h3>0% Fees Until July 1</h3>
                <p>Offer ends in</p>
                <h4>{formatTimeRemaining(timeRemaining)}</h4>
            </div>
            {/* Other Hero Section content */}
        </div>
    );
};

export default HeroSection;