import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { PerformanceFailure } from "@/lib/schemas/performance-failure";
import { Badge } from "@/components/ui/badge";

interface FailureTreeProps {
  analysis: PerformanceFailure;
  className?: string;
  align?: "left" | "right";
  maxBadges?: number;
  maxDrivers?: number;
  maxAnomalies?: number;
}

export function FailureTree({
  analysis,
  className,
  align = "left",
  maxBadges = 3,
  maxDrivers = 2,
  maxAnomalies = 2,
}: FailureTreeProps) {
  const isRight = align === "right";
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
    hidden: { opacity: 0, x: 20, scale: 0.95 },
    show: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 280,
        damping: 26,
      },
    },
  } as any;

  return (
    <div
      className={cn(
        "relative py-2",
        isRight ? "pr-6 text-right" : "pl-6",
        className,
      )}
    >
      <motion.div
        initial={{ height: 0 }}
        animate={{ height: "100%" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={cn(
          "absolute top-0 w-0.5 bg-red-500/50 dark:bg-red-400/60 rounded-full",
          isRight ? "right-0" : "left-0",
        )}
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className={cn("space-y-6", isRight ? "items-end" : "items-start")}
      >
        {analysis.badges.slice(0, maxBadges).map((badge, idx) => (
          <motion.div 
            key={`badge-${idx}`} 
            variants={item} 
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            className="relative"
          >
            <div
              className={cn(
                "absolute top-6 w-6 h-0.5 bg-red-500/50 dark:bg-red-400/60",
                isRight ? "right-[-24px]" : "left-[-24px]",
              )}
            />
            <div
              className={cn(
                "bg-red-50/50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow",
                isRight && "ml-auto",
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-semibold text-sm text-red-700 dark:text-red-400">{badge.label}</h3>
                <Badge variant="secondary" className="text-[10px] h-5">
                  {(badge.confidence * 100).toFixed(0)}% conf.
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                {badge.description}
              </p>
              {badge.representatives.length > 0 && (
                <div
                  className={cn(
                    "flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-dashed",
                    isRight && "justify-end",
                  )}
                >
                  {badge.representatives.slice(0, 3).map((rep, rIdx) => (
                    <span
                      key={rIdx}
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                    >
                      {rep.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {analysis.drivers.slice(0, maxDrivers).map((driver, idx) => (
          <motion.div 
            key={`driver-${idx}`} 
            variants={item} 
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            className="relative"
          >
            <div
              className={cn(
                "absolute top-6 w-6 h-0.5 bg-red-500/50 dark:bg-red-400/60",
                isRight ? "right-[-24px]" : "left-[-24px]",
              )}
            />
            <div
              className={cn(
                "bg-red-50/30 dark:bg-red-900/10 border border-red-200/50 dark:border-red-800/50 border-dashed rounded-lg p-3",
                isRight && "ml-auto text-left",
              )}
            >
              <h3 className="font-medium text-sm mb-1">{driver.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{driver.explanation}</p>
              <div className="mt-2 text-[10px] text-muted-foreground/70 italic">Evidence: {driver.evidence}</div>
            </div>
          </motion.div>
        ))}

        {analysis.anomalies && analysis.anomalies.length > 0 && (
          <motion.div 
            variants={item} 
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            className="relative"
          >
            <div
              className={cn(
                "absolute top-6 w-6 h-0.5 bg-amber-500/50 dark:bg-amber-400",
                isRight ? "right-[-24px]" : "left-[-24px]",
              )}
            />
            <div
              className={cn(
                "bg-amber-50/50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-500/50 rounded-lg p-3",
                isRight && "ml-auto text-left",
              )}
            >
              <h3 className="font-medium text-sm text-amber-700 dark:text-amber-400 mb-2">Odd Cases</h3>
              <ul className="space-y-2">
                {analysis.anomalies.slice(0, maxAnomalies).map((anomaly, idx) => (
                  <li key={idx} className="text-xs text-amber-900/80 dark:text-amber-200/90">
                    <span className="font-semibold text-amber-900 dark:text-amber-300">{anomaly.name}:</span> {anomaly.note}
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
