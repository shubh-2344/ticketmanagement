import React from 'react';

function NetworkBackground({ opacity = 0.08 }) {
  return (
    <svg 
      className="global-network-bg" 
      viewBox="0 0 1920 1080" 
      preserveAspectRatio="xMidYMid slice" 
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: opacity,
        transition: 'opacity 0.5s ease'
      }}
    >
      <defs>
        <filter id="bg-glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="bg-glow-purple" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* --- Background Circuit Board Traces (dimmed lines) --- */}
      <path d="M 50,100 L 300,100 L 380,180 L 380,300 L 420,340 L 520,340 L 520,480" stroke="rgba(56, 189, 248, 0.35)" strokeWidth="1.5" fill="none" />
      <path d="M 50,550 L 150,550 L 220,620 L 350,620 L 400,670 L 400,770" stroke="rgba(56, 189, 248, 0.35)" strokeWidth="1.5" fill="none" />
      <path d="M 1870,100 L 1700,100 L 1600,200 L 1600,300 L 1500,400 L 1400,400 L 1400,480" stroke="rgba(56, 189, 248, 0.35)" strokeWidth="1.5" fill="none" />
      <path d="M 1870,550 L 1750,550 L 1680,620 L 1500,620 L 1450,670 L 1450,770" stroke="rgba(56, 189, 248, 0.35)" strokeWidth="1.5" fill="none" />
      <path d="M 50,900 L 250,900 L 320,830 L 500,830 L 580,750 L 700,750" stroke="rgba(56, 189, 248, 0.35)" strokeWidth="1.5" fill="none" />
      <path d="M 1870,900 L 1650,900 L 1580,830 L 1400,830 L 1320,750 L 1220,750" stroke="rgba(56, 189, 248, 0.35)" strokeWidth="1.5" fill="none" />
      
      {/* --- Connecting Device Traces with LIVE Moving Signal Flows --- */}
      <path d="M 215,240 L 215,480" stroke="rgba(56, 189, 248, 0.2)" strokeWidth="1.5" fill="none" />
      <path className="pulse-path" d="M 215,240 L 215,480" stroke="#00f0ff" strokeWidth="2.2" fill="none" filter="url(#bg-glow-cyan)" />

      <path d="M 215,550 L 215,770" stroke="rgba(56, 189, 248, 0.2)" strokeWidth="1.5" fill="none" />
      <path className="pulse-path" d="M 215,550 L 215,770" stroke="#38bdf8" strokeWidth="2.2" fill="none" filter="url(#bg-glow-cyan)" />

      <path d="M 1650,150 L 1650,480" stroke="rgba(56, 189, 248, 0.2)" strokeWidth="1.5" fill="none" />
      <path className="pulse-path" d="M 1650,150 L 1650,480" stroke="#00f0ff" strokeWidth="2.2" fill="none" filter="url(#bg-glow-cyan)" />

      <path d="M 1650,550 L 1650,770" stroke="rgba(56, 189, 248, 0.2)" strokeWidth="1.5" fill="none" />
      <path className="pulse-path" d="M 1650,550 L 1650,770" stroke="#38bdf8" strokeWidth="2.2" fill="none" filter="url(#bg-glow-cyan)" />

      <path d="M 215,530 L 700,530 L 800,630 L 1120,630 L 1220,530 L 1650,530" stroke="rgba(56, 189, 248, 0.15)" strokeWidth="1.5" fill="none" />
      <path className="pulse-path" d="M 215,530 L 700,530 L 800,630 L 1120,630 L 1220,530 L 1650,530" stroke="#00f0ff" strokeWidth="2" fill="none" filter="url(#bg-glow-cyan)" />

      {/* --- Circuit Board Nodes & Blinking Signal LEDs --- */}
      <circle cx="380" cy="180" r="4.5" fill="#00f0ff" className="led-blink" />
      <circle cx="420" cy="340" r="4.5" fill="#38bdf8" className="led-blink-delayed" />
      <circle cx="220" cy="620" r="4.5" fill="#38bdf8" className="led-blink" />
      <circle cx="1600" cy="200" r="4.5" fill="#00f0ff" className="led-blink-delayed" />
      <circle cx="1500" cy="400" r="4.5" fill="#38bdf8" className="led-blink" />
      <circle cx="1680" cy="620" r="4.5" fill="#38bdf8" className="led-blink-delayed" />
      <circle cx="320" cy="830" r="4.5" fill="#00f0ff" className="led-blink" />
      <circle cx="1580" cy="830" r="4.5" fill="#38bdf8" className="led-blink-delayed" />
    </svg>
  );
}

export default NetworkBackground;
