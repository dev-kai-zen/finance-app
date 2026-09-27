import { createElement, type ComponentType } from "react";

type AnyFunction = (...args: any[]) => any;

/**
 * Keeps a public function export lightweight until it is actually invoked.
 *
 * Feature entry points use this to avoid evaluating their screens, hooks, and
 * workflows when another feature imports one narrow public capability.
 */
export function deferFunction<T extends AnyFunction>(load: () => T): T {
  return ((...args: Parameters<T>): ReturnType<T> =>
    load()(...args)) as T;
}

/**
 * Defers resolving a component implementation until React renders it.
 * Calling the loader on every render keeps Fast Refresh behavior intact; the
 * module system itself still caches normal production loads.
 */
export function deferComponent<Props extends object>(
  load: () => ComponentType<Props>,
  displayName: string,
): ComponentType<Props> {
  function DeferredComponent(props: Props) {
    return createElement(load(), props);
  }

  DeferredComponent.displayName = `Deferred(${displayName})`;
  return DeferredComponent;
}
