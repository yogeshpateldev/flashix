import { useState, useEffect } from "react";

interface ExpiryCountdownProps {
  expiresAt: string;
  isExpired: boolean;
}

const ExpiryCountdown = ({ expiresAt, isExpired }: ExpiryCountdownProps) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (isExpired) {
      setTimeLeft("Expired");
      return;
    }

    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Expired");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) setTimeLeft(`${days}d ${hours}h`);
      else if (hours > 0) setTimeLeft(`${hours}h ${minutes}m`);
      else if (minutes > 0) setTimeLeft(`${minutes}m ${seconds}s`);
      else setTimeLeft(`${seconds}s`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, isExpired]);

  const isUrgent = !isExpired && new Date(expiresAt).getTime() - Date.now() < 60 * 60 * 1000;

  return (
    <span
      className={`font-mono text-sm font-medium ${
        isExpired
          ? "text-expired"
          : isUrgent
          ? "text-warning animate-pulse"
          : "text-success"
      }`}
    >
      {timeLeft}
    </span>
  );
};

export default ExpiryCountdown;
