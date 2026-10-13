/* eslint-disable react-refresh/only-export-components -- test-only module mock, never hot-reloaded */
import { createElement, forwardRef, type ReactNode } from 'react';

/**
 * jsdom renders motion's first frame (e.g. opacity: 0) without running the animation.
 * Tests render plain elements instead so assertions see the settled UI.
 */
const MOTION_PROPS = new Set([
  'initial',
  'animate',
  'exit',
  'variants',
  'transition',
  'whileTap',
  'whileHover',
  'whileFocus',
  'whileInView',
  'layout',
  'layoutId',
  'onAnimationComplete',
  'onAnimationStart',
]);

const cache = new Map<string, unknown>();
const element = (tag: string) => {
  if (!cache.has(tag))
    cache.set(
      tag,
      forwardRef<HTMLElement, Record<string, unknown>>((props, ref) => {
        const clean: Record<string, unknown> = { ref };
        for (const [key, value] of Object.entries(props)) if (!MOTION_PROPS.has(key)) clean[key] = value;
        return createElement(tag, clean);
      }),
    );
  return cache.get(tag);
};

export const m = new Proxy({}, { get: (_, tag: string) => element(tag) });
export const motion = m;
export const AnimatePresence = ({ children }: { children?: ReactNode }) => <>{children}</>;
export const LazyMotion = ({ children }: { children?: ReactNode }) => <>{children}</>;
export const MotionConfig = ({ children }: { children?: ReactNode }) => <>{children}</>;
export const domAnimation = {};
export const useReducedMotion = () => true;
export const MotionGlobalConfig = {};
