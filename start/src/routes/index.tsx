import { createFileRoute, Link } from "@tanstack/react-router";
import { QubeLogo } from "@/components/ChatWrapper";
import { motion } from "framer-motion";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center min-h-screen gap-8">
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-12 -ml-4">
          <motion.span
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-6xl font-bold text-white tracking-[0.3em]"
          >
            QU
          </motion.span>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <QubeLogo className="size-32 text-foreground" />
          </motion.div>

          <motion.span
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-6xl font-bold text-white tracking-[0.3em]"
          >
            BE
          </motion.span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <Link
            to="/dashboard"
            className="relative px-8 py-3 rounded-xl font-semibold text-white bg-zinc-800/70 backdrop-blur-md border border-zinc-600/50 overflow-hidden inline-block shadow-lg hover:bg-zinc-700/70 transition-colors"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
            <span className="relative">Get Started</span>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
