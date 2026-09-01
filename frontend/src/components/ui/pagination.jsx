import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

function pageWindow(current, total) {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages = new Set([1, total, current, current - 1, current + 1]);
    const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

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