import React from 'react';
import { motion } from 'framer-motion';

import { getRadarRingPalette } from '../utils/radarRingColors';


const getFullQuadrantPath = (index, radius, center) => {
    const angleMap = [
        { start: 1.5 * Math.PI, end: 2 * Math.PI },
        { start: Math.PI, end: 1.5 * Math.PI },
        { start: 0.5 * Math.PI, end: Math.PI },
        { start: 0, end: 0.5 * Math.PI },
    ];
    const getCoords = (angle) => ({
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle),
    });
    const { start, end } = angleMap[index];
    const startPoint = getCoords(start);
    const endPoint = getCoords(end);
    return `M ${center},${center} L ${startPoint.x},${startPoint.y} A ${radius},${radius} 0 0 1 ${endPoint.x},${endPoint.y} Z`;
};

const getRingSegmentPath = (qIndex, innerRadius, outerRadius, center) => {
    const angleMap = [
        { start: 1.5 * Math.PI, end: 2 * Math.PI },
        { start: Math.PI, end: 1.5 * Math.PI },
        { start: 0.5 * Math.PI, end: Math.PI },
        { start: 0, end: 0.5 * Math.PI },
    ];
    const { start, end } = angleMap[qIndex];

    const getCoords = (angle, radius) => ({
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle),
    });

    const startOuter = getCoords(start, outerRadius);
    const endOuter = getCoords(end, outerRadius);
    const startInner = getCoords(start, innerRadius);
    const endInner = getCoords(end, innerRadius);

    return `M ${startOuter.x},${startOuter.y} A ${outerRadius},${outerRadius} 0 0 1 ${endOuter.x},${endOuter.y} L ${endInner.x},${endInner.y} A ${innerRadius},${innerRadius} 0 0 0 ${startInner.x},${startInner.y} Z`;
};


const RadarGraphic = ({
    size, items, coordinates, settings,
    uiTheme,
    hoveredItemName, setHoveredItemName,
    onSelectQuadrant, hoveredQuadrant, setHoveredQuadrant,
    isDetailView = false,
    quadrantForDetail,
    hoveredRingIndex, setHoveredRingIndex,
    onRingClick,
    focusedRingIndex, 
}) => {
    const center = size / 2;
    const ringWidth = (settings.rings && settings.rings.length > 0) ? center / settings.rings.length : center;
    const blipRadius = 7;
    /* Нейтральные серые — кольца перекрывают квадранты (палитра в radarRingColors.js) */
    const ringPalette = getRadarRingPalette(uiTheme);

    /** Как в общем виде: цвет фона приложения / настройки, чтобы крест «срезал» радар */
    const axisStrokeColor =
        uiTheme === 'dark'
            ? '#212326'
            : (settings.colors?.background ?? '#f7f8fa');

    const ringStrokeColor =
        uiTheme === 'dark' ? 'rgba(204, 204, 204, 0.14)' : 'rgba(30, 36, 46, 0.2)';

    const renderFullRadar = () => (
        <>
            {settings.quadrants.map((_, index) => (
                <path
                    key={`quadrant-${index}`}
                    d={getFullQuadrantPath(index, center, center)}
                    fill={settings.colors.quadrants[index]}
                    style={{ cursor: 'pointer', transition: 'opacity 0.2s ease' }}
                    onClick={() => onSelectQuadrant && onSelectQuadrant(index)}
                    onMouseEnter={() => setHoveredQuadrant && setHoveredQuadrant(index)}
                    onMouseLeave={() => setHoveredQuadrant && setHoveredQuadrant(null)}
                />
            ))}
            {settings.rings && settings.rings.slice().reverse().map((_, i_rev) => {
                const i = settings.rings.length - 1 - i_rev;
                return <circle key={`ring-${i}`} cx={center} cy={center} r={(i + 1) * ringWidth} fill={ringPalette[i % ringPalette.length]} stroke={ringStrokeColor} strokeWidth={1} style={{ pointerEvents: 'none' }} />;
            })}
            {hoveredQuadrant !== null && settings.quadrants[hoveredQuadrant] && (
                <path key="hover-overlay" d={getFullQuadrantPath(hoveredQuadrant, center, center)} fill={settings.colors.quadrants[hoveredQuadrant]} style={{ opacity: 0.3, pointerEvents: 'none' }} />
            )}
        </>
    );

    const renderDetailRadar = () => (
        <g>
            {/* Тот же квадрантный цвет, что и в общем виде (под кольцами) */}
            <path
                d={getFullQuadrantPath(quadrantForDetail, center, center)}
                fill={settings.colors.quadrants[quadrantForDetail]}
                style={{ pointerEvents: 'none' }}
            />
            {settings.rings.map((_, logicalRingIndex) => {
                const visualIndex = settings.rings.length - 1 - logicalRingIndex;

                const outerRadius = (visualIndex + 1) * ringWidth;
                const innerRadius = visualIndex * ringWidth;
                
                const path = getRingSegmentPath(quadrantForDetail, innerRadius, outerRadius, center);
                const baseFill = ringPalette[logicalRingIndex % ringPalette.length];
                const quadrantColor = settings.colors.quadrants[quadrantForDetail];
                /** Наведение важнее фокуса: подсвечивается только одно кольцо, остальные без затемнения */
                const activeRing = hoveredRingIndex !== null && hoveredRingIndex !== undefined
                    ? hoveredRingIndex
                    : focusedRingIndex;
                const isRingHighlighted = activeRing !== null && activeRing !== undefined && activeRing === logicalRingIndex;
                const fill = isRingHighlighted
                    ? `color-mix(in srgb, ${quadrantColor} 52%, ${baseFill})`
                    : baseFill;

                return (
                    <path
                        key={`segment-${quadrantForDetail}-${logicalRingIndex}`}
                        d={path}
                        fill={fill}
                        stroke={ringStrokeColor}
                        strokeWidth={1}
                        style={{
                            transition: 'fill 0.2s ease',
                            cursor: 'pointer',
                        }}
                        onMouseEnter={() => setHoveredRingIndex && setHoveredRingIndex(logicalRingIndex)}
                        onMouseLeave={() => setHoveredRingIndex && setHoveredRingIndex(null)}
                        onClick={() => onRingClick && onRingClick(logicalRingIndex)}
                    />
                );
            })}
        </g>
    );
    return (
        <g>
            {isDetailView ? renderDetailRadar() : renderFullRadar()}

            {items.map((item) => {
                const point = coordinates ? coordinates[item.name] : undefined;
                if (!point) return null;
                const { x, y } = point;
                const isHovered = hoveredItemName === item.name;

                return (
                    <g key={item.name}
                        style={{ pointerEvents: isDetailView ? 'all' : 'none' }}
                    >
                        <motion.circle
                            data-quadrant={item.quadrant}
                            cx={x} cy={y} r={blipRadius}
                            fill={settings.colors.quadrants[item.quadrant]}
                            stroke={uiTheme === 'dark' ? '#cccccc' : '#1f2329'} strokeWidth={1.2}
                            animate={{ scale: isHovered ? 1.5 : 1, zIndex: isHovered ? 100 : 1 }}
                            transition={{ duration: 0.2 }}
                            onMouseEnter={() => {
                                setHoveredItemName(item.name);
                                if (isDetailView && setHoveredRingIndex) setHoveredRingIndex(item.ring);
                            }}
                            onMouseLeave={() => {
                                setHoveredItemName(null);
                                if (isDetailView && setHoveredRingIndex) setHoveredRingIndex(null);
                            }}
                            style={{ cursor: 'pointer' }}
                        />
                        {item.number && (<text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="#ffffff" fontSize="9px" fontWeight="bold" style={{ pointerEvents: 'none' }}>{item.number}</text>)}
                    </g>
                    
                );
            })}
            <line x1={0} y1={center} x2={size} y2={center} stroke={axisStrokeColor} strokeWidth={10} style={{ pointerEvents: 'none' }} />
            <line x1={center} y1={0} x2={center} y2={size} stroke={axisStrokeColor} strokeWidth={10} style={{ pointerEvents: 'none' }} />
        </g>
    );
};
export default RadarGraphic;