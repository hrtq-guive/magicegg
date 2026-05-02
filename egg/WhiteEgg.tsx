export interface WhiteEggProps {
  phase: 'idle' | 'shaking' | 'opening';
  onClick: () => void;
}

export default function WhiteEgg({ phase, onClick }: WhiteEggProps) {
  return (
    <div 
      className={`egg-wrapper cursor-pointer ${phase !== 'idle' ? 'pointer-events-none' : ''} ${phase === 'shaking' ? 'egg-shake' : ''}`}
      onClick={() => {
        if (phase === 'idle') onClick();
      }}
    >
      <div className={`egg-container ${phase === 'opening' ? 'egg-cracked' : ''}`}>
        <div className="egg-left" />
        <div className="egg-right" />
      </div>
    </div>
  );
}
