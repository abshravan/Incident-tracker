import type { Transition, Variants } from "motion/react";

/** One spring for everything that moves, so the app feels like one product. */
export const spring: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 32,
  mass: 0.8,
};

export const softSpring: Transition = {
  type: "spring",
  stiffness: 220,
  damping: 28,
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

export const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

/** Parent wrapper that staggers its `fadeUp` children in. */
export const stagger = (delayChildren = 0.04, staggerChildren = 0.045): Variants => ({
  hidden: {},
  show: { transition: { delayChildren, staggerChildren } },
});

export const cardHover = {
  rest: { y: 0 },
  hover: { y: -3, transition: spring },
};
