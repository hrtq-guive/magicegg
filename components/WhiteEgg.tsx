export interface WhiteEggProps {
  phase: 'idle' | 'shaking' | 'opening';
  onClick: () => void;
  color?: string;
}

export default function WhiteEgg({ phase, onClick, color }: WhiteEggProps) {
  return (
    <div 
      className={`egg-wrapper ${phase !== 'idle' ? 'pointer-events-none' : 'cursor-pointer'} ${phase === 'shaking' ? 'egg-shake' : ''}`}
      onClick={() => {
        if (phase === 'idle') onClick();
      }}
    >
      <div className={`egg-container ${phase === 'opening' ? 'egg-cracked' : ''}`}>
        <div className="egg-left" style={color ? { backgroundColor: color } : undefined} />
        <div className="egg-right" style={color ? { backgroundColor: color } : undefined} />
      </div>
    </div>
  );
}
