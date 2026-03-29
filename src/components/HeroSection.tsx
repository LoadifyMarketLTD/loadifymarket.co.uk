import React from 'react';
import './HeroSection.css';

const HeroSection = () => {
    const targetDate = new Date('2026-06-30T23:00:00Z');
    const [timeLeft, setTimeLeft] = React.useState(calculateTimeLeft());

    React.useEffect(() => {
        const interval = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    function calculateTimeLeft() {
        const now = new Date();
        const difference = targetDate - now;
        let days = Math.floor(difference / (1000 * 60 * 60 * 24));
        let hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        let minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        return { days, hours, minutes };
    }

    return (
        <div className="hero-section">
            <img src="/path/to/your/hero-image.jpg" alt="Hero" className="hero-image" />
            <div className="hero-content">
                <h1>Your Headline Here</h1>
                <p>Your subtext here.</p>
                <div className="cta-buttons">
                    <button className="cta-button">Call to Action 1</button>
                    <button className="cta-button">Call to Action 2</button>
                </div>
                <div className="countdown-card top-right">
                    <span className="pill">0% Fees Until July 1</span>
                    <span className="label">Offer ends in</span>
                    <span className="countdown">{timeLeft.days} : {timeLeft.hours} : {timeLeft.minutes}</span>
                </div>
            </div>
            <div className="mobile-variant top-right">
                <span className="pill">0% Fees Until July 1</span>
                <span className="label">Offer ends in</span>
                <span className="countdown">{timeLeft.days} : {timeLeft.hours} : {timeLeft.minutes}</span>
            </div>
        </div>
    );
};

export default HeroSection;