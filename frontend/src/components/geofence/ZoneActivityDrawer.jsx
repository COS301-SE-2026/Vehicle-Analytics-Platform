import { useState } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    AlertTriangle,
    Bell,
    CheckCircle2,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Gauge,
    Zap,
    RotateCw,
    CornerUpRight,
    AlertCircle,
} from "lucide-react";

const mockActivityLog = [
    {
        id: 1,
        type: "alert",
        message: "TRK-2024-X1 entered Pretoria Depot",
        time: "14:22:05",
        acknowledged: false,
    },
    {
        id: 2,
        type: "notification",
        message: "TRK-552-Z exit Durban Depot",
        time: "11:45:05",
        acknowledged: true,
    },
    {
        id: 3,
        type: "exit-acknowledged",
        message: "TRK-881-A entered Durban Depot",
        time: "11:45:12",
        acknowledged: true,
    },
    {
        id: 4,
        type: "exit",
        message: "TRK-881-A exit Johannesburg Depot",
        time: "08:05:00",
        acknowledged: false,
    },
];

const mockSafetData = [
    { zone: "Pretoria Depot", speeding: 8, braking: 4, accel: 8, corner:4, crash: 0 },
    { zone: "Durban Depot", speeding: 2, braking: 1, accel: 0, corner:0, crash: 0 }, 
    { zone: "Johannesburg Depot", speeding: 4, braking: 2, accel: 9, corner:1, crash: 1 },   
];

const activityIconStyles = {
    alert: { icon: AlertTriangle, bg: "bg-fleet-alert/10", color: "text-fleet-alert" },
    entry: { icon: Bell, bg: "bg-fleet-green/10", color: "text-fleet-green" },
    notification: { icon: Bell, bg: "bg-fleet-idle/20", color: "text-fleet-secondary"},
    "exit-acknowledged": { icon: CheckCircle2, bg: "bg-fleet-idle/20", color: "text-fleet-secondary" },
    exit: { icon: LogOut, bg: "bg-fleet-warning/10", color: "text-fleet-warning"},
};

export function ZoneActivityDrawer({ open, onOpenChange }) {
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = 3;

    return (
        <Sheet open={open} onOpenChange={onOpenChange} className="sm:max-w-2xl">
            <SheetContent className="bg-fleet-bg w-lg sm:max-w-2xl overflow-y-auto">
                <SheetHeader className="text-left">
                    <SheetTitle className="text-fleet-text">All Zone Activity</SheetTitle>
                    <SheetDescription className="text-fleet-secondary">
                        Historical and real-time geofencing event log
                    </SheetDescription>
                </SheetHeader>

                {/* filters */}
                <div className="grid grid-cols-2 gap-2 mt-6">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium tracking-wide text-fleet-secondary uppercase">
                            By Zone
                        </label>
                        <Select defaultValue="all">
                            <SelectTrigger className="border-fleet-border bg-fleet-surface text-fleet-text">
                                <SelectValue/>
                            </SelectTrigger>
                            <SelectContent className="bg-fleet-surface">
                                <SelectItem value="all">All Zones</SelectItem>
                                <SelectItem value="pretoria">Pretoria</SelectItem>
                                <SelectItem value="durban">Durban Port</SelectItem>
                                <SelectItem value="johannesburg">Johanneburg</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Activity log */}
                <div className="mt-8">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-semibold tracking-wide text-fleet-secondary uppercase">
                            Activity Log
                        </h3>
                        <Badge className="bg-fleet-blue/10 text-fleet-blue border-0 rounded-lg">
                            Showing 4 of 10
                        </Badge>
                    </div>

                    <div className="border border-fleet-border w-full rounded-lg bg-fleet-surface divide-y divide-fleet-border">
                        {mockActivityLog.map((entry) => {
                            const style = activityIconStyles[entry.type];
                            const Icon = style.icon;

                            return (
                                <div 
                                    key={entry.id}
                                    className="flex items-center justify-between gap-4 p-4"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${style.bg}`}>
                                            <Icon className={`h-4 w-4 ${style.color}`}/>
                                        </div>
                                        <div>
                                            <p
                                                className={`text-sm font-medium ${
                                                    entry.acknowledged ? "text-fleet-secondary" : "text-fleet-text"
                                                }`}
                                            >
                                                {entry.message}
                                            </p>
                                            <div className="flex items-center gap-1 mt-1">
                                                <p className="text-xs text-flex-secondary">{entry.time}</p>
                                                {entry.acknowledged && (
                                                    <Badge className="bg-fleet-green/30 text-fleet border-0 rounded-lg text-[9px] px-1.5 py-0">
                                                        ACKNOWLEDGED
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        className="h-8 w-8 rounded-full border border-fleet-border flex items-center justify-center shrink-0 hover:bg-fleet-panel"
                                    >
                                        <CheckCircle2
                                            className={`h-4 w-4 ${
                                                entry.acknowledged ? "text-fleet-green" : "text-fleet-secondary"
                                            }`}
                                        />
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* pagination */}
                    <div className="flex items-center justify-center gap-1 mt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((p) => p - 1)}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                           <Button
                                key={page}
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 ${
                                    page === currentPage 
                                    ? "bg-fleet-blue text-white hover:bg-fleet-blue/90"
                                    : "text-fleet-secondary"
                                }`}
                                onClick={() => setCurrentPage(page)}
                           >
                            {page}
                           </Button> 
                        ))}

                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage((p) => p + 1)}
                        >
                            <ChevronRight className="h-4 w-4"/>
                        </Button>
                    </div>
                </div>

                {/* Safety breakdown */}
                <div className="space-y-3">
                    <h3 className="text-xs font-semibold tracking-wide text-fleet-secondary uppercase">
                        Zone Activity breakdown
                    </h3>
                    {mockSafetData.map((zone) => (
                        <div
                            key={zone.zone}
                            className="border border-fleet-boreder bg-fleet-surface rounded-lg p-4"
                        >
                            <p className="text-sm font-medium text-fleet-text mb-3">
                                {zone.zone}
                            </p>
                            <div className="grid grid-cols-5 gap-2 text-center">
                                <SafetyStat icon={Gauge} value={zone.speeding} label="Speeding" />
                                <SafetyStat icon={Zap} value={zone.braking} label="Braking" />
                                <SafetyStat icon={RotateCw} value={zone.accel} label="Accel" />
                                <SafetyStat icon={CornerUpRight} value={zone.corner} label="Corner" />
                                <SafetyStat icon={AlertCircle} value={zone.crash} label="Crash" />
                            </div>
                        </div>
                        )
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}

function SafetyStat({ icon: Icon, value, label}) {
    return (
        <div>
            <Icon className="h-3.5 w-3.5 text-fleet-secondary mx-auto mb-1" />
            <p className="text-sm font-semibold text-fleet-text">{value}</p>
            <p className="text-[9px] tracking-wide text-fleet-secondary uppercase">{label}</p>
        </div>
    );
}