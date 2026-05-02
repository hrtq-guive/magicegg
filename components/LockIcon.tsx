export interface LockIconProps {
  phase: 'idle' | 'unlocking' | 'gone' | 'open' | 'locking';
  onClick: () => void;
  size?: number;
  customColor?: string;
}

export default function LockIcon({ phase, onClick, size = 1, customColor }: LockIconProps) {
  const isClickable = phase === 'idle' || phase === 'open';
  const shackleOpen = phase === 'unlocking' || phase === 'gone' || phase === 'open';
  const color = customColor || "#111111";

  return (
    <div
      className={`lock-wrapper ${isClickable ? 'cursor-pointer' : 'pointer-events-none'} ${phase === 'gone' ? 'lock-gone' : ''} ${phase === 'shaking' ? 'lock-shake' : ''}`}
      onClick={() => {
        if (isClickable) onClick();
      }}
      style={{ transform: `scale(${size})` }}
    >
      {/* Shackle */}
      <svg
        className={`lock-shackle ${shackleOpen ? 'lock-shackle--open' : ''}`}
        width="60"
        height="55"
        viewBox="0 0 60 55"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible' }}
      >
        <path
          d="M8 55 L8 18 C8 7 17 0 30 0 C43 0 52 7 52 18 L52 55 L43 55 L43 18 C43 12 38 8 30 8 C22 8 17 12 17 18 L17 55 Z"
          fill={color}
        />
      </svg>

      {/* Body */}
      <svg
        className="lock-body"
        width="80"
        height="80"
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="40" cy="40" r="40" fill={color} />
        <circle cx="40" cy="35" r="5" fill="#f0f0f4" />
        <rect x="37" y="38" width="6" height="12" rx="2" fill="#f0f0f4" />
      </svg>
    </div>
  );
}
