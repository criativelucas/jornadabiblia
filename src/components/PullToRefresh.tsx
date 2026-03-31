import { useRef, useState, useCallback } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { useThemeContext } from '@/contexts/ThemeContext';

interface Props {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

const THRESHOLD = 72;

export function PullToRefresh({ onRefresh, children }: Props) {
  const { T } = useThemeContext();
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const dragY = useSpring(0, { stiffness: 400, damping: 40 });
  const rotate = useTransform(dragY, [0, THRESHOLD], [0, 360]);
  const opacity = useTransform(dragY, [0, THRESHOLD * 0.4], [0, 1]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) dragY.set(Math.min(delta * 0.5, THRESHOLD + 20));
  }, [refreshing, dragY]);

  const onTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    const current = dragY.get();
    if (current >= THRESHOLD) {
      setRefreshing(true);
      dragY.set(THRESHOLD);
      await onRefresh();
      setRefreshing(false);
    }
    dragY.set(0);
  }, [dragY, onRefresh]);

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <motion.div
        style={{ opacity, y: dragY, overflow: 'hidden' }}
        className="flex flex-col items-center justify-center"
      >
        <motion.div
          style={{ rotate }}
          className="w-8 h-8 flex items-center justify-center"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 4v8m0 0l-3-3m3 3l3-3" stroke={T.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 14a8 8 0 0016 0" stroke={T.accent} strokeWidth="2" strokeLinecap="round" />
          </svg>
        </motion.div>
        {refreshing && (
          <span style={{ fontSize: '11px', color: T.textMuted, fontWeight: 600, marginTop: '4px' }}>
            Atualizando…
          </span>
        )}
      </motion.div>
      {children}
    </div>
  );
}
