/**
 * Палитра заливки колец на радаре (RadarGraphic). Не путать с colors.rings в настройках —
 * на диаграмме кольца всегда эти нейтральные серые.
 */
export const getRadarRingPalette = (uiTheme) =>
    uiTheme === 'dark'
        ? ['#3a3a3a', '#444444', '#4e4e4e', '#585858']
        : ['#d8d8d8', '#cccccc', '#c0c0c0', '#b4b4b4'];

export function getRadarRingColor(uiTheme, ringIndex) {
    const palette = getRadarRingPalette(uiTheme);
    return palette[ringIndex % palette.length];
}
