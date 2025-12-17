import { useEffect, useState } from 'react';

interface Snowflake {
  id: number;
  left: number;
  animationDuration: number;
  animationDelay: number;
  size: number;
  opacity: number;
}

const SANTA_PATHS = [
  'santa-path-straight',
  'santa-path-wave',
  'santa-path-high',
  'santa-path-low',
  'santa-path-loop',
];

export default function SnowEffect() {
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([]);
  const [santaVisible, setSantaVisible] = useState(false);
  const [currentPath, setCurrentPath] = useState(SANTA_PATHS[0]);

  useEffect(() => {
    const flakes: Snowflake[] = [];
    for (let i = 0; i < 80; i++) {
      flakes.push({
        id: i,
        left: Math.random() * 100,
        animationDuration: 8 + Math.random() * 12,
        animationDelay: Math.random() * -20,
        size: 2 + Math.random() * 3,
        opacity: 0.4 + Math.random() * 0.6,
      });
    }
    setSnowflakes(flakes);
  }, []);

  useEffect(() => {
    const showSanta = () => {
      const randomPath = SANTA_PATHS[Math.floor(Math.random() * SANTA_PATHS.length)];
      setCurrentPath(randomPath);
      setSantaVisible(true);
      
      setTimeout(() => {
        setSantaVisible(false);
      }, 8000);
    };

    showSanta();
    
    const interval = setInterval(showSanta, 20000);
    return () => clearInterval(interval);
  }, []);

  const trees = [
    { left: 5, size: 20 },
    { left: 15, size: 16 },
    { left: 28, size: 22 },
    { left: 42, size: 18 },
    { left: 55, size: 24 },
    { left: 68, size: 17 },
    { left: 78, size: 21 },
    { left: 88, size: 19 },
    { left: 95, size: 15 },
  ];

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {snowflakes.map((flake) => (
        <div
          key={flake.id}
          className="absolute rounded-full bg-gray-400 snow-particle"
          style={{
            left: `${flake.left}%`,
            width: `${flake.size}px`,
            height: `${flake.size}px`,
            opacity: flake.opacity,
            animationDuration: `${flake.animationDuration}s`,
            animationDelay: `${flake.animationDelay}s`,
          }}
        />
      ))}
      
      {santaVisible && (
        <div className={`absolute ${currentPath}`} style={{ top: '15%' }}>
          <svg width="50" height="20" viewBox="0 0 100 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="20" y1="20" x2="35" y2="20" stroke="#5d3a1a" strokeWidth="1" />
            <line x1="35" y1="20" x2="50" y2="20" stroke="#5d3a1a" strokeWidth="1" />
            
            <ellipse cx="12" cy="18" rx="4" ry="5" fill="#8B4513" />
            <path d="M8 12 L6 6 M16 12 L18 6" stroke="#8B4513" strokeWidth="1" />
            <circle cx="12" cy="16" r="1" fill="#ff0000" />
            
            <ellipse cx="28" cy="18" rx="4" ry="5" fill="#8B4513" />
            <path d="M24 12 L22 6 M32 12 L34 6" stroke="#8B4513" strokeWidth="1" />
            
            <path d="M50 25 L75 25 L80 30 L45 30 Z" fill="#8B0000" />
            <path d="M45 30 L42 35 L83 35 L80 30 Z" fill="#5d3a1a" />
            <path d="M80 25 L82 30" stroke="#8B0000" strokeWidth="2" />
            
            <circle cx="60" cy="20" r="5" fill="#ffcccb" />
            <ellipse cx="60" cy="14" rx="6" ry="4" fill="#ff0000" />
            <circle cx="60" cy="10" r="2" fill="white" />
            <circle cx="60" cy="22" r="3" fill="white" />
            
            <rect x="70" y="18" width="6" height="8" fill="#228B22" />
            <rect x="65" y="20" width="4" height="6" fill="#ff6347" />
          </svg>
        </div>
      )}
      
      <div className="absolute bottom-0 left-0 right-0 flex justify-around items-end">
        {trees.map((tree, index) => (
          <div
            key={index}
            className="absolute bottom-0"
            style={{ left: `${tree.left}%` }}
          >
            <svg
              width={tree.size}
              height={tree.size * 1.4}
              viewBox="0 0 24 34"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <polygon points="12,0 24,12 18,12 24,20 18,20 24,28 0,28 6,20 0,20 6,12 0,12" fill="#1a472a" />
              <rect x="10" y="28" width="4" height="6" fill="#5d3a1a" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}
