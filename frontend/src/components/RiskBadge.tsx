import React from 'react';
import { RiskLevel } from '../types';

interface RiskBadgeProps {
  level: RiskLevel;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, score, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold',
    lg: 'text-sm px-3.5 py-1.5 font-bold'
  };

  const levelStyles: Record<RiskLevel, { bg: string; text: string; border: string; dot: string }> = {
    LOW: {
      bg: 'bg-emerald-950/60',
      text: 'text-emerald-300',
      border: 'border-emerald-500/30',
      dot: 'bg-emerald-400'
    },
    MODERATE: {
      bg: 'bg-amber-950/60',
      text: 'text-amber-300',
      border: 'border-amber-500/30',
      dot: 'bg-amber-400'
    },
    HIGH: {
      bg: 'bg-orange-950/60',
      text: 'text-orange-300',
      border: 'border-orange-500/40',
      dot: 'bg-orange-400'
    },
    CRITICAL: {
      bg: 'bg-rose-950/70',
      text: 'text-rose-200',
      border: 'border-rose-500/50',
      dot: 'bg-rose-400 shadow-rose-500/50 shadow-sm animate-pulse'
    }
  };

  const style = levelStyles[level] || levelStyles.LOW;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${style.bg} ${style.text} ${style.border} ${sizeClasses[size]} tracking-wide uppercase`}>
      <span className={`w-2 h-2 rounded-full ${style.dot}`} />
      {score !== undefined ? `${score} • ${level}` : level}
    </span>
  );
};
