// MobileHeroBanner.tsx
//
// The right-side 3D gold "0%" visual is rendered as an inline SVG — no
// external image file required.  The Commission3D component reproduces the
// reference design: large metallic "0%" floating above a dark cylindrical
// pedestal with a gold rim and "COMMISSION" inscription, surrounded by a
// warm ambient glow.

function Commission3D() {
  return (
    <svg
      viewBox="0 0 240 268"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}
      aria-hidden="true"
    >
      <defs>
        {/* Metallic gold gradient – bright top highlight → dark warm base */}
        <linearGradient id="cg-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#FFF8C0" />
          <stop offset="18%"  stopColor="#F5D06E" />
          <stop offset="50%"  stopColor="#C8860A" />
          <stop offset="80%"  stopColor="#8A5200" />
          <stop offset="100%" stopColor="#3D2000" />
        </linearGradient>

        {/* Platform rim gradient */}
        <linearGradient id="cg-rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#E8A820" />
          <stop offset="50%"  stopColor="#B87010" />
          <stop offset="100%" stopColor="#4A2800" />
        </linearGradient>

        {/* Ambient gold glow behind the whole visual */}
        <radialGradient id="cg-glow" cx="50%" cy="55%" r="52%">
          <stop offset="0%"   stopColor="#C8860A" stopOpacity="0.50" />
          <stop offset="70%"  stopColor="#C8860A" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#C8860A" stopOpacity="0"    />
        </radialGradient>

        {/* Drop shadow for the text */}
        <filter id="cg-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#000000" floodOpacity="0.90" />
        </filter>
      </defs>

      {/* ── Ambient glow ─────────────────────────────────────────────── */}
      <ellipse cx="120" cy="168" rx="118" ry="110" fill="url(#cg-glow)" />

      {/* ── "0" — 3D extrusion (dark depth layers → bright face) ─────── */}
      <text x="84" y="220"
        fontFamily="'Arial Black', 'Impact', 'Haettenschweiler', sans-serif"
        fontSize="172" fontWeight="900" fill="#2A1200" textAnchor="middle">0</text>
      <text x="82" y="218"
        fontFamily="'Arial Black', 'Impact', 'Haettenschweiler', sans-serif"
        fontSize="172" fontWeight="900" fill="#5A3200" textAnchor="middle">0</text>
      <text x="80" y="216"
        fontFamily="'Arial Black', 'Impact', 'Haettenschweiler', sans-serif"
        fontSize="172" fontWeight="900" fill="#8A5200" textAnchor="middle">0</text>
      <text x="78" y="214"
        fontFamily="'Arial Black', 'Impact', 'Haettenschweiler', sans-serif"
        fontSize="172" fontWeight="900" fill="url(#cg-gold)" filter="url(#cg-shadow)"
        textAnchor="middle">0</text>

      {/* ── "%" — 3D extrusion ───────────────────────────────────────── */}
      <text x="200" y="186"
        fontFamily="'Arial Black', 'Impact', 'Haettenschweiler', sans-serif"
        fontSize="92" fontWeight="900" fill="#2A1200" textAnchor="middle">%</text>
      <text x="198" y="184"
        fontFamily="'Arial Black', 'Impact', 'Haettenschweiler', sans-serif"
        fontSize="92" fontWeight="900" fill="#5A3200" textAnchor="middle">%</text>
      <text x="196" y="182"
        fontFamily="'Arial Black', 'Impact', 'Haettenschweiler', sans-serif"
        fontSize="92" fontWeight="900" fill="#8A5200" textAnchor="middle">%</text>
      <text x="194" y="180"
        fontFamily="'Arial Black', 'Impact', 'Haettenschweiler', sans-serif"
        fontSize="92" fontWeight="900" fill="url(#cg-gold)" filter="url(#cg-shadow)"
        textAnchor="middle">%</text>

      {/* ── Cylindrical pedestal ─────────────────────────────────────── */}
      <path
        d="M 28 234 Q 28 252 120 256 Q 212 252 212 234 L 212 244 Q 212 262 120 266 Q 28 262 28 244 Z"
        fill="url(#cg-rim)"
      />
      <ellipse cx="120" cy="234" rx="92" ry="16" fill="#130C00" />
      <ellipse cx="120" cy="234" rx="92" ry="16" fill="none" stroke="#D4940A" strokeWidth="1.5" />
      <ellipse cx="88" cy="230" rx="28" ry="5" fill="rgba(255,215,80,0.20)" />

      {/* "◎ COMMISSION" inscription */}
      <text x="120" y="239"
        fontFamily="Arial, sans-serif" fontSize="9.5" fontWeight="800"
        fill="#C8860A" textAnchor="middle" letterSpacing="1.4">
        ◎ COMMISSION
      </text>

      {/* Ground shadow — oval under the pedestal */}
      <ellipse cx="120" cy="268" rx="84" ry="11" fill="#000000" opacity="0.45" />
    </svg>
  );
}

export default function MobileHeroBanner() {
  return (
    <div className="px-4 mt-4">
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0F0F14] to-[#1A1A22] p-5 flex items-center justify-between min-h-[200px] shadow-lg">

        {/* LEFT TEXT */}
        <div className="z-10 max-w-[55%]">
          <h1 className="text-[34px] leading-[38px] font-extrabold text-[#F5C76E]">
            0% COMMISSION
          </h1>

          <p className="text-white font-semibold mt-1">
            KEEP 100% OF YOUR SALE
          </p>

          <p className="text-gray-400 text-sm mt-1">
            Buy. Sell. Save more with Loadify.
          </p>

          <button className="mt-4 bg-gradient-to-r from-[#F5C76E] to-[#D4A94D] text-black font-semibold px-4 py-2 rounded-lg shadow-md">
            Start Selling
          </button>
        </div>

        {/* RIGHT: Inline 3D gold "0%" on pedestal — no external file */}
        <div className="absolute right-0 bottom-0 w-[52%] h-full flex items-end justify-end pointer-events-none">
          <Commission3D />
        </div>
      </div>

      {/* DOTS */}
      <div className="flex justify-center gap-2 mt-3">
        <div className="w-2 h-2 rounded-full bg-[#F5C76E]" />
        <div className="w-2 h-2 rounded-full bg-gray-500" />
        <div className="w-2 h-2 rounded-full bg-gray-500" />
      </div>
    </div>
  );
}
