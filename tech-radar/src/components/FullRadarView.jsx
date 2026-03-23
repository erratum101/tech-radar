import React, { useState } from 'react';
import { motion } from 'framer-motion';
import RadarGraphic from './RadarGraphic';

const truncate = (str, len) => {
    if (str.length <= len) return str;
    return str.substring(0, len) + '...';
};

const FullRadarView = React.forwardRef(({ items, coordinates, onSelectQuadrant, settings, uiTheme, hoveredQuadrant, setHoveredQuadrant }, ref) => {
    const size = 500;
    const center = size / 2;
    const [hoveredItemName, setHoveredItemName] = useState(null);
    const ringWidth = (settings.rings && settings.rings.length > 0) ? center / settings.rings.length : center;

    const textStyle = {
        fill: uiTheme === 'dark' ? '#cccccc' : settings.colors.text,
        fontSize: '12px',
        fontWeight: 'bold',
        textAnchor: 'middle',
    };

    return (
        <motion.div 
            ref={ref} 
            key="full" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.4 }}
        >
            <svg width={size} height={size}>
                <RadarGraphic 
                    size={size} 
                    items={items} 
                    coordinates={coordinates} 
                    settings={settings} 
                    uiTheme={uiTheme}
                    hoveredItemName={hoveredItemName} 
                    setHoveredItemName={setHoveredItemName}
                    onSelectQuadrant={onSelectQuadrant}
                    hoveredQuadrant={hoveredQuadrant}
                    setHoveredQuadrant={setHoveredQuadrant}
                />
                <g style={{ pointerEvents: 'none' }}>
                    {settings.rings && settings.rings.slice().reverse().map((ring, i_rev) => {
                        const radius = (i_rev + 0.5) * ringWidth;
                        const truncatedRing = truncate(ring, 22);
                        return (
                            <React.Fragment key={ring}>
                                <text x={center + radius} y={center + 5} style={textStyle}>{truncatedRing}</text>
                                <text x={center - radius} y={center + 5} style={textStyle}>{truncatedRing}</text>
                            </React.Fragment>
                        );
                    })}
                </g>
            </svg>
        </motion.div>
    );
});

export default FullRadarView;