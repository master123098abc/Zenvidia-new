import React, { useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { sounds } from '../lib/sounds';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const pullThreshold = 70;
  const pullDistance = Math.max(0, currentY - startY);
  const pullProgress = Math.min(1, pullDistance / pullThreshold);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY <= 0) {
      setStartY(e.touches[0].clientY);
      setCurrentY(e.touches[0].clientY);
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isPulling && window.scrollY <= 0) {
      setCurrentY(e.touches[0].clientY);
      if (e.touches[0].clientY > startY) {
        // We can't preventDefault in React synthetic events for touchmove easily, 
        // but overscroll-behavior-y: none on body usually handles it.
      }
    } else {
      setIsPulling(false);
    }
  };

  const handleTouchEnd = async () => {
    if (isPulling && pullDistance >= pullThreshold) {
      setIsRefreshing(true);
      setIsPulling(false);
      sounds.playPop(); // Add a little pop when refresh starts
      try {
        await onRefresh();
        sounds.playSuccess(); // And success when done
      } finally {
        setIsRefreshing(false);
        setStartY(0);
        setCurrentY(0);
      }
    } else {
      setIsPulling(false);
      setStartY(0);
      setCurrentY(0);
    }
  };

  useEffect(() => {
    if (!isPulling) {
      setStartY(0);
      setCurrentY(0);
    }
  }, [isPulling]);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full pb-[200px]"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className="w-full flex justify-center items-center overflow-hidden transition-all duration-300 pointer-events-none"
        style={{
          height: isRefreshing ? '60px' : `${Math.min(pullDistance, pullThreshold)}px`,
          opacity: isRefreshing || isPulling ? 1 : 0
        }}
      >
        {isRefreshing ? (
          <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
        ) : (
          <div 
            className="w-6 h-6 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin"
            style={{ 
              transform: `rotate(${pullProgress * 360}deg)`,
              opacity: pullProgress
            }}
          />
        )}
      </div>
      <div 
        className="transition-transform duration-300"
        style={{
          transform: isRefreshing ? 'translateY(0)' : `translateY(0)`
        }}
      >
        {children}
      </div>
    </div>
  );
}
