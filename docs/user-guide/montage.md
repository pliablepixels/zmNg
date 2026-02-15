# Montage

The Montage view displays multiple camera feeds simultaneously in a grid layout, similar to a traditional security monitoring setup.

## Layout

Cameras are arranged in a responsive grid that adapts to your screen size:

- **Desktop**: Multiple columns based on window width
- **Tablet (landscape)**: 2-3 columns
- **Phone (portrait)**: 1-2 columns

## Viewing Options

- **Tap a camera** to open its {doc}`Monitor Detail <monitors>` view
- **Swipe** (on mobile) to navigate if there are more cameras than fit on screen

## Filtering

Use the same group and status filters as the Monitors screen to control which cameras appear in the montage. This is useful if you have many cameras and want to focus on a specific area or group.

## Performance

The montage view loads snapshot images rather than full video streams to keep bandwidth usage manageable when viewing many cameras at once. The refresh interval follows your {doc}`bandwidth settings <settings>`.

:::{tip}
If you have many cameras, use **Low bandwidth mode** in Settings to reduce data usage in montage view. You can also filter to show only the cameras you need.
:::

## Screen Size Warning

On very small screens (e.g., phones in portrait mode), the montage view may show a warning if the screen is too narrow to display cameras usefully. Rotating to landscape mode or using a larger device provides a better experience.
