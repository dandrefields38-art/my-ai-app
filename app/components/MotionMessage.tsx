"use client";

import type React from "react";

import {
  motion,
} from "framer-motion";

export default function MotionMessage({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      transition={{
        duration: 0.15,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
