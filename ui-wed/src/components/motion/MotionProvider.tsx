import type { ReactNode } from "react";
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";

// LazyMotion + `m.*` components load only the animation features we use
// (fades, springs, in-view and hover), not the whole library. `strict` throws
// if a full `motion.*` component sneaks in and undoes that.
//
// reducedMotion="user": the reduced-motion rule in index.css only stops CSS
// animations. Motion animates from JavaScript, so it needs telling too --
// with this, guests who asked their OS for less motion get plain fades with
// no movement.
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation} strict>
        {children}
      </LazyMotion>
    </MotionConfig>
  );
}
