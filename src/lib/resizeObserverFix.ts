// Patch ResizeObserver to reduce noisy "ResizeObserver loop completed with undelivered notifications." warnings
// This file is imported early in the app (main.tsx) to run in browser env

if (typeof window !== "undefined" && (window as any).ResizeObserver) {
  try {
    const OriginalRO: any = (window as any).ResizeObserver;

    // Wrap the constructor so callbacks provided by libraries are executed inside a try/catch
    const PatchedRO = function (this: any, callback: Function) {
      if (!(this instanceof PatchedRO)) return new (PatchedRO as any)(callback);
      const safeCb = function (entries: any, observer: any) {
        try {
          // call user callback
          return callback && callback(entries, observer);
        } catch (err: any) {
          try {
            const msg = err && (err.message || String(err));
            if (typeof msg === 'string' && msg.includes('ResizeObserver loop completed')) {
              console.debug('Filtered ResizeObserver loop completed error from callback');
              return;
            }
          } catch (e) {}
          // rethrow other errors
          throw err;
        }
      };

      // create internal native observer
      const ro = new OriginalRO(safeCb as any);
      // copy instance fields
      (this as any).__ro = ro;
    } as any;

    // copy prototype methods (observe, unobserve, disconnect, takeRecords)
    PatchedRO.prototype.observe = function (target: Element, options?: any) {
      try {
        return (this.__ro as any).observe(target, options);
      } catch (err: any) {
        console.debug('Suppressing ResizeObserver.observe error:', err?.message || err);
        return undefined;
      }
    };
    PatchedRO.prototype.unobserve = function (target: Element) {
      try {
        return (this.__ro as any).unobserve(target);
      } catch (err: any) {
        console.debug('Suppressing ResizeObserver.unobserve error:', err?.message || err);
        return undefined;
      }
    };
    PatchedRO.prototype.disconnect = function () {
      try {
        return (this.__ro as any).disconnect();
      } catch (err: any) {
        console.debug('Suppressing ResizeObserver.disconnect error:', err?.message || err);
        return undefined;
      }
    };
    PatchedRO.prototype.takeRecords = function () {
      try {
        return (this.__ro as any).takeRecords();
      } catch (err: any) {
        console.debug('Suppressing ResizeObserver.takeRecords error:', err?.message || err);
        return [];
      }
    };

    // replace global
    try { (window as any).ResizeObserver = PatchedRO; } catch (e) {}

    // Add a global error listener to prevent the specific non-actionable warning from bubbling
    window.addEventListener(
      "error",
      (event: ErrorEvent) => {
        try {
          const msg = (event && (event.message || (event.error && event.error.message))) as string | undefined;
          if (msg && msg.includes("ResizeObserver loop completed")) {
            event.stopImmediatePropagation();
            event.preventDefault();
            console.debug("Filtered ResizeObserver loop completed warning");
          }
        } catch (e) {
          // ignore
        }
      },
      true
    );
  } catch (e) {
    // ignore if patching fails
  }
}
