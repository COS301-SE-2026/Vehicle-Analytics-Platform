import * as React from "react"
import { Separator as SeparatorPrimitive } from "radix-ui"
import PropTypes from "prop-types"

import { cn } from "@/lib/utils"

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
        className
      )}
      {...props} />
  );
}

Separator.propTypes = { className: PropTypes.string, orientation: PropTypes.oneOf(['horizontal','vertical']), decorative: PropTypes.bool }

export { Separator }
