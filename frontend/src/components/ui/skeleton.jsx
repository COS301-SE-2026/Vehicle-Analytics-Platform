import { cn } from "@/lib/utils"
import PropTypes from "prop-types"

function Skeleton({
  className,
  ...props
}) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props} />
  );
}

Skeleton.propTypes = {
  className: PropTypes.string,
}

export { Skeleton }
