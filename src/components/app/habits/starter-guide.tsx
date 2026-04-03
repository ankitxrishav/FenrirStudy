'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Edit3, Settings2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useUser } from '@/firebase';

export function StarterGuide() {
  const { user } = useUser();
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    if (user) {
      const isDismissed = localStorage.getItem(`guide_dismissed_${user.uid}`);
      setDismissed(!!isDismissed);
    }
  }, [user]);

  const handleDismiss = () => {
    if (user) {
      localStorage.setItem(`guide_dismissed_${user.uid}`, 'true');
      setDismissed(true);
    }
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', bounce: 0.3, duration: 0.5 }}
          className="mb-6 relative group"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent rounded-[26px] blur-sm opacity-50 transition-opacity group-hover:opacity-100" />
          <Card className="glass-card bg-primary/[0.03] border-primary/20 overflow-hidden relative">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="text-sm font-bold tracking-tight text-primary uppercase tracking-[0.1em]">Welcome to Habit Rituals</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground font-medium">
                    We've seeded your routine with <strong>3 core habits</strong> to jumpstart your discipline. These are consistent anchors for your day.
                  </p>
                  
                  <div className="pt-2 flex flex-wrap gap-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground bg-white/5 px-2 py-1 rounded-lg">
                      <Edit3 className="h-3 w-3" />
                      <span>TAP TO CUSTOMIZE</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground bg-white/5 px-2 py-1 rounded-lg">
                      <Settings2 className="h-3 w-3" />
                      <span>SET TIME WINDOWS</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={handleDismiss}
                  className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
