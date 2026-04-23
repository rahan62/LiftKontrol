"use client";

import { useEffect, useRef } from "react";

/** iyzico dönen HTML içindeki script'leri çalıştırmak için (React innerHTML script çalıştırmaz). */
export function IyzicoFormMount({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !html) {
      return;
    }

    el.innerHTML = html;
    el.querySelectorAll("script").forEach((oldScript) => {
      const s = document.createElement("script");
      for (const attr of oldScript.attributes) {
        s.setAttribute(attr.name, attr.value);
      }
      s.textContent = oldScript.textContent;
      oldScript.replaceWith(s);
    });
  }, [html]);

  return <div ref={ref} className="iyzico-checkout min-h-[520px] w-full" />;
}
