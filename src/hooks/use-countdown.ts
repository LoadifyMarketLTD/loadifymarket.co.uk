import { useState, useEffect } from "react";

export interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function computeTimeLeft(deadline: number): Omit<CountdownTime, "expired"> {
  const diff = Math.max(0, deadline - Date.now());
  return {
    days:    Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours:   Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export function useCountdown(deadline: number): CountdownTime {
  const [time, setTime] = useState(() => computeTimeLeft(deadline));

  useEffect(() => {
    const id = setInterval(() => setTime(computeTimeLeft(deadline)), 1000);
    return () => clearInterval(id);
  }, [deadline]);

  const expired =
    time.days === 0 && time.hours === 0 &&
    time.minutes === 0 && time.seconds === 0;

  return { ...time, expired };
}
