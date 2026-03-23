'use client';

interface Props {
  peekedByOther?: boolean;
  className?: string;
}

export default function CardBack({ peekedByOther, className = '' }: Props) {
  return (
    <div
      className={[
        'relative rounded-lg border-2 border-indigo-700 overflow-hidden w-full h-full',
        'bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950',
        className,
      ].join(' ')}
    >
      {/* Decorative pattern */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Outer diamond */}
        <div className="absolute inset-2 border border-indigo-600/40 rounded-md rotate-45 scale-75" />
        {/* Inner diamond */}
        <div className="absolute inset-4 border border-indigo-500/30 rounded-sm rotate-45 scale-50" />
        {/* Center crown */}
        <span className="text-indigo-400/60 text-xl select-none">👑</span>
      </div>
      {/* Corner decorations */}
      <div className="absolute top-1 left-1 w-2 h-2 border-l border-t border-indigo-500/50 rounded-tl" />
      <div className="absolute top-1 right-1 w-2 h-2 border-r border-t border-indigo-500/50 rounded-tr" />
      <div className="absolute bottom-1 left-1 w-2 h-2 border-l border-b border-indigo-500/50 rounded-bl" />
      <div className="absolute bottom-1 right-1 w-2 h-2 border-r border-b border-indigo-500/50 rounded-br" />

      {/* Peeked indicator */}
      {peekedByOther && (
        <span className="absolute top-0.5 right-0.5 text-[8px] text-yellow-400">👁</span>
      )}
    </div>
  );
}
