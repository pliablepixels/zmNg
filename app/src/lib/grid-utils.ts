/**
 * Grid Utility Functions
 *
 * Helper functions for calculating grid layouts
 */

/**
 * Calculates optimal grid dimensions for displaying multiple items
 * @param itemCount - Number of items to display in the grid
 * @returns Object containing columns and rows
 *
 * @example
 * calculateGridDimensions(4) // { cols: 2, rows: 2 }
 * calculateGridDimensions(6) // { cols: 3, rows: 2 }
 */
export function calculateGridDimensions(itemCount: number): { cols: number; rows: number } {
    if (itemCount === 0) {
        return { cols: 0, rows: 0 };
    }

    if (itemCount === 1) {
        return { cols: 1, rows: 1 };
    }

    // For 2-4 items, use 2 columns
    // For 5+ items, use 3 columns
    const cols = itemCount <= 4 ? 2 : 3;
    const rows = Math.ceil(itemCount / cols);

    return { cols, rows };
}

/**
 * Generates CSS grid template style for a given number of columns and rows
 * @param cols - Number of columns
 * @param rows - Number of rows
 * @returns CSS style object for grid-template-columns and grid-template-rows
 *
 * @example
 * getGridTemplateStyle(2, 2)
 * // Returns: { gridTemplateColumns: 'repeat(2, 1fr)', gridTemplateRows: 'repeat(2, 1fr)' }
 */
export function getGridTemplateStyle(cols: number, rows: number): React.CSSProperties {
    return {
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
    };
}
