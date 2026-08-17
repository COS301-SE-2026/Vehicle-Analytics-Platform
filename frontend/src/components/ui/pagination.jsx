import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Page controls, extracted from the pattern already used in
 * ZoneActivityDrawer so paged lists look the same everywhere.
 *
 * ONE CHANGE from that original: page numbers are WINDOWED.
 *
 * The drawer renders Array.from({ length: totalPages }) — every page as its
 * own button. That is fine at 3 pages and breaks at 15: a hotspot backfill
 * creates 130+ zones, so the button row grows wider than the card and
 * pushes the layout out of bounds. Windowing keeps the control a fixed
 * width no matter how many pages exist.
 *
 * Shows: first, last, current ±1, with ellipsis for the gaps. Ellipses are
 * spans, not buttons — they aren't clickable and shouldn't be focusable.
 */
function pageWindow(current, total) {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages = new Set([1, total, current, current - 1, current + 1]);
    const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

    // Insert an ellipsis marker wherever the sequence jumps.
    const out = [];
    let previous = 0;
    for (const page of sorted) {
        if (page - previous > 1) out.push("…");
        out.push(page);
        previous = page;
    }
    return out;
}

export function Pagination({ page, totalPages, onPageChange, className = "" }) {
    // A single page needs no control at all — rendering a disabled one is
    // just noise in an already-dense card.
    if (totalPages <= 1) return null;

    const pages = pageWindow(page, totalPages);

    return (
        <div className={`flex items-center justify-center gap-1 ${className}`}>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={page === 1}
                onClick={() => onPageChange(page - 1)}
                aria-label="Previous page"
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>

            {pages.map((entry, index) =>
                entry === "…" ? (
                    <span
                        // Index in the key because two ellipses can appear and
                        // "…" alone would collide.
                        key={`gap-${index}`}
                        className="px-1 text-xs text-fleet-secondary select-none"
                        aria-hidden="true"
                    >
                        …
                    </span>
                ) : (
                    <Button
                        key={entry}
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 ${
                            entry === page
                                ? "bg-fleet-blue text-white hover:bg-fleet-blue/90"
                                : "text-fleet-secondary"
                        }`}
                        onClick={() => onPageChange(entry)}
                        aria-label={`Page ${entry}`}
                        aria-current={entry === page ? "page" : undefined}
                    >
                        {entry}
                    </Button>
                )
            )}

            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={page === totalPages}
                onClick={() => onPageChange(page + 1)}
                aria-label="Next page"
            >
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
    );
}