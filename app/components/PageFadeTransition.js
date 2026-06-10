"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function PageFadeTransition({ children }) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(false);
    const frame = window.requestAnimationFrame(() => {
      setIsVisible(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  return (
    <div className={isVisible ? "page-transition-enter" : "page-transition-pre-enter"}>
      {children}
    </div>
  );
}
