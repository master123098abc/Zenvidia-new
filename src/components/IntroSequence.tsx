import { motion, AnimatePresence } from 'motion/react';
import { useEffect } from 'react';

export default function IntroSequence({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.8, ease: 'easeInOut' } }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1, transition: { duration: 1, ease: 'easeOut' } }}
          className="text-center"
        >
          <h1 className="font-display font-black uppercase text-6xl md:text-8xl bg-gradient-to-r from-cyan-500 to-orange-500 text-transparent bg-clip-text">
            ZENVIDIA
          </h1>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
