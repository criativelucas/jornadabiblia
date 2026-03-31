import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';

const variants = {
  initial:  { opacity: 0, y: 12 },
  animate:  { opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' as const } },
  exit:     { opacity: 0, y: -8, transition: { duration: 0.12, ease: 'easeIn' as const } },
};

export function PageTransition({ children, transitionKey }: { children: ReactNode; transitionKey: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={transitionKey}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
