import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(undefined)

  React.useEffect(() => {
    const mql = globalThis.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      queueMicrotask(() => setIsMobile(globalThis.innerWidth < MOBILE_BREAKPOINT))
    }
    mql.addEventListener("change", onChange)
    queueMicrotask(() => setIsMobile(globalThis.innerWidth < MOBILE_BREAKPOINT))
    return () => mql.removeEventListener("change", onChange);
  }, [])

  return !!isMobile
}
