import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { X, GripVertical } from 'lucide-react';
import { useDashboardStore } from '../../stores/dashboard';
import { cn } from '../../lib/utils';
import { useRef } from 'react';

/**
 * Props for the DashboardWidget component
 * Includes react-grid-layout specific props that are passed by the grid system
 */
interface DashboardWidgetProps {
    id: string;
    title?: string;
    children: ReactNode;
    className?: string;
    profileId: string;
    style?: React.CSSProperties;
    onMouseDown?: React.MouseEventHandler<HTMLDivElement>;
    onMouseUp?: React.MouseEventHandler<HTMLDivElement>;
    onTouchEnd?: React.TouchEventHandler<HTMLDivElement>;
    // react-grid-layout passes these data attributes
    'data-grid'?: {
        x: number;
        y: number;
        w: number;
        h: number;
        i: string;
        minW?: number;
        minH?: number;
        maxW?: number;
        maxH?: number;
        moved?: boolean;
        static?: boolean;
        isDraggable?: boolean;
        isResizable?: boolean;
    };
}

/**
 * Dashboard Widget Component
 *
 * A container for dashboard widgets that provides:
 * - Drag and drop functionality (via react-grid-layout)
 * - Edit mode with delete button
 * - Resizable layout support
 * - Profile-specific widget management
 */
export function DashboardWidget({
    id,
    title,
    children,
    className,
    profileId,
    style,
    onMouseDown,
    onMouseUp,
    onTouchEnd,
    'data-grid': dataGrid,
}: DashboardWidgetProps) {
    const isEditing = useDashboardStore((state) => state.isEditing);
    const removeWidget = useDashboardStore((state) => state.removeWidget);
    const widgetRef = useRef<HTMLDivElement>(null);

    return (
        <Card
            ref={widgetRef}
            className={cn("relative h-full flex flex-col overflow-hidden transition-all duration-200", className)}
            style={style}
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
            onTouchEnd={onTouchEnd}
            data-grid={dataGrid}
        >
            {isEditing && (
                <div className="absolute top-2 right-2 z-50 flex gap-2">
                    <Button
                        variant="destructive"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent drag start
                            removeWidget(profileId, id);
                        }}
                        onMouseDown={(e) => e.stopPropagation()} // Prevent drag start
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            )}

            {title && (
                <CardHeader className="p-4 pb-2 space-y-0 flex flex-row items-center justify-between drag-handle cursor-move">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 select-none">
                        {isEditing && <GripVertical className="h-4 w-4 text-muted-foreground" />}
                        {title}
                    </CardTitle>
                </CardHeader>
            )}

            <CardContent className="p-0 flex-1 relative">
                {children}
            </CardContent>
        </Card>
    );
}
