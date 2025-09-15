import * as React from "react";

export type DeviceKind = "phone" | "tablet" | "desktop";

export function useBreakpoint() {
  const getKind = () => {
    if (typeof window === "undefined") return "desktop" as DeviceKind;
    const w = window.innerWidth;
    if (w < 768) return "phone" as DeviceKind; // < md
    if (w < 1024) return "tablet" as DeviceKind; // md..lg-1
    return "desktop" as DeviceKind; // >= lg
  };
  const [device, setDevice] = React.useState<DeviceKind>(getKind());
  React.useEffect(() => {
    const on = () => setDevice(getKind());
    window.addEventListener("resize", on);
    on();
    return () => window.removeEventListener("resize", on);
  }, []);
  return { device };
}
