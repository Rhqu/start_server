import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { PerformanceRecipe } from "@/lib/schemas/performance-recipe";
import { Badge } from "@/components/ui/badge";

interface RecipeTreeProps {
  analysis: PerformanceRecipe;
  className?: string;
  maxBadges?: number;
  maxDrivers?: number;
  maxAnomalies?: number;
}

export function RecipeTree({
  analysis,
  className,
  maxBadges = 3,
  maxDrivers = 2,
  maxAnomalies = 2,
}: RecipeTreeProps) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, x: -20, scale: 0.95 },
    show: { 
      opacity: 1, 
      x: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24,
      }
    },
  } as any;

  // Combine badges and drivers into a single list for the tree, or keep them separate?
  // The user asked for "recipe for success tiles".
  // Let's render badges first, then drivers, all connected to the same tree.

  return (
    <div className={cn("relative pl-6 py-2", className)}>
      {/* Main Tree Trunk */}
      <motion.div 
        initial={{ height: 0 }}
        animate={{ height: "100%" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="absolute left-0 top-0 w-0.5 bg-emerald-500 dark:bg-emerald-400 rounded-full"
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* Badges Section */}
        {analysis.badges.slice(0, maxBadges).map((badge, idx) => (
          <motion.div 
            key={`badge-${idx}`} 
            variants={item} 
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            className="relative"
          >
            {/* Branch */}
            <div className="absolute left-[-24px] top-6 w-6 h-0.5 bg-emerald-500 dark:bg-emerald-400" />
            
            {/* Tile */}
            <div className="bg-emerald-50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-500/50 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-semibold text-sm text-primary">{badge.label}</h3>
                <Badge variant="secondary" className="text-[10px] h-5">
                  {(badge.confidence * 100).toFixed(0)}% conf.
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                {badge.description}
              </p>
              
              {/* Representatives */}
              {badge.representatives.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-dashed">
                  {badge.representatives.slice(0, 3).map((rep, rIdx) => (
                    <span 
                      key={rIdx} 
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/5 text-primary"
                    >
                      {rep.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {/* Drivers Section */}
        {analysis.drivers.slice(0, maxDrivers).map((driver, idx) => (
          <motion.div 
            key={`driver-${idx}`} 
            variants={item} 
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            className="relative"
          >
            {/* Branch */}
            <div className="absolute left-[-24px] top-6 w-6 h-0.5 bg-emerald-500 dark:bg-emerald-400" />
            
            {/* Tile */}
            <div className="bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-200/60 dark:border-emerald-500/30 border-dashed rounded-lg p-3">
              <h3 className="font-medium text-sm mb-1">{driver.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {driver.explanation}
              </p>
              <div className="mt-2 text-[10px] text-muted-foreground/70 italic">
                Evidence: {driver.evidence}
              </div>
            </div>
          </motion.div>
        ))}

        {/* Anomalies Section */}
        {analysis.anomalies && analysis.anomalies.length > 0 && (
          <motion.div 
            variants={item} 
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            className="relative"
          >
            {/* Branch */}
            <div className="absolute left-[-24px] top-6 w-6 h-0.5 bg-amber-500/50 dark:bg-amber-400" />
            
            {/* Tile */}
            <div className="bg-amber-50/50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-500/50 rounded-lg p-3">
              <h3 className="font-medium text-sm text-amber-700 dark:text-amber-400 mb-2">Outliers & Anomalies</h3>
              <ul className="space-y-2">
                {analysis.anomalies.slice(0, maxAnomalies).map((anomaly, idx) => (
                  <li key={idx} className="text-xs text-amber-900/80 dark:text-amber-200/90">
                    <span className="font-semibold text-amber-900 dark:text-amber-300">{anomaly.name}:</span>{" "}
                    {anomaly.note}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}


      </motion.div>
    </div>
  );
}
