import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import RadarGraphic from './RadarGraphic'; 
import OwnersDropdown from './OwnersDropdown';
import '../styles/QuadrantDetailView.css';

const RingGroup = ({
    ringName, items, quadrantColor,
    isHovered, isExpanded, onToggle,
    onMouseEnter, onMouseLeave,
    hoveredItemName, setHoveredItemName,
    isFocused,
    uiTheme
}) => {
   
    return (
        <div
            className="detail-view-ring-group"
            style={{
                backgroundColor: (isHovered || isFocused)
                    ? `${quadrantColor}55`
                    : (uiTheme === 'dark' ? '#212326' : '#fafbfc'),
                transition: 'background-color 0.2s ease-in-out',
                borderRadius: '14px',
                padding: '0 10px',
                marginBottom: '10px'
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <h3
                className={`detail-view-ring-title${isExpanded ? ' detail-view-ring-title--expanded' : ''}`}
                onClick={onToggle}
                style={{ cursor: 'pointer', padding: '8px 0' }}
            >
                {ringName}
                <span className={`accordion-arrow ${isExpanded ? 'open' : ''}`}>›</span>
            </h3>
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <ul className="detail-list" style={{ paddingBottom: '8px' }}>
                            {items.length > 0 ? (
                                items.sort((a, b) => a.name.localeCompare(b.name)).map((item) => {
                                    const isItemHovered = item.name === hoveredItemName;
                                    return (
                                        <li
                                            key={item.name}
                                            className="detail-list-item"
                                            style={{ backgroundColor: isItemHovered ? `${quadrantColor}30` : undefined }}
                                            onMouseEnter={() => setHoveredItemName(item.name)}
                                            onMouseLeave={() => setHoveredItemName(null)}
                                        >
                                            <span>{item.number}. {item.name}</span>
                                            <OwnersDropdown owners={item.owners} uiTheme={uiTheme} />
                                        </li>
                                    );
                                })
                            ) : (
                                <li className="detail-list-item-empty">Нет данных</li>
                            )}
                        </ul>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};


const QuadrantDetailView = React.forwardRef(({ quadrantIndex, items, coordinates, settings, uiTheme }, ref) => {
    const fullRadarSize = 500;
    const viewSize = 400;
    const scale = viewSize / (fullRadarSize / 2);

    const [hoveredItemName, setHoveredItemName] = useState(null);
    const [hoveredRingIndex, setHoveredRingIndex] = useState(null);
    const [focusedRingIndex, setFocusedRingIndex] = useState(null);

    const handleToggleRing = (ringIndex) => {
        setFocusedRingIndex(prev => {
           
            if (prev === ringIndex) {
                return null;
            }
          
            return ringIndex;
        });
    };

    const offsets = [
        { x: -250, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: -250 },
        { x: -250, y: -250 }
    ];

    if (quadrantIndex === null || quadrantIndex >= settings.quadrants.length || quadrantIndex >= offsets.length) {
        return null;
    }

    const transform = `scale(${scale}) translate(${offsets[quadrantIndex].x}, ${offsets[quadrantIndex].y})`;
    const selectedQuadrantData = settings.quadrants[quadrantIndex];
    const selectedColor = settings.colors.quadrants[quadrantIndex];
    const numberedQuadrantItems = items.filter(item => item.quadrant === quadrantIndex).map((item, index) => ({ ...item, number: index + 1 }));

    const ringsReversed = [...settings.rings].reverse();
    const columnSplitIndex = Math.ceil(ringsReversed.length / 2);
    const column1Rings = ringsReversed.slice(0, columnSplitIndex);
    const column2Rings = ringsReversed.slice(columnSplitIndex);
    
    const renderRingColumn = (ringNames) => {
       return ringNames.map(ringName => {
            const ringIdx = settings.rings.indexOf(ringName);
            const itemsInRing = numberedQuadrantItems.filter(item => item.ring === ringIdx);
       
            const isExpanded = focusedRingIndex === null || focusedRingIndex === ringIdx;
            const isFocused = focusedRingIndex === ringIdx;

            return (
                <RingGroup
                    key={ringName}
                    ringName={ringName}
                    items={itemsInRing}
                    quadrantColor={selectedColor}
                    isHovered={hoveredRingIndex === ringIdx}
                    isExpanded={isExpanded}
                    isFocused={isFocused}
                    uiTheme={uiTheme}
                 
                    onToggle={() => handleToggleRing(ringIdx)}
                    onMouseEnter={() => setHoveredRingIndex(ringIdx)}
                    onMouseLeave={() => setHoveredRingIndex(null)}
                    hoveredItemName={hoveredItemName}
                    setHoveredItemName={setHoveredItemName}
                />
            );
        });
    }

    return (
        <motion.div ref={ref} key="detail" className="detail-view-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="detail-view-graphic">
                <svg width={viewSize} height={viewSize} style={{ overflow: 'hidden' }}>
                    <g transform={transform}>
                        <RadarGraphic
                            size={fullRadarSize}
                            items={numberedQuadrantItems}
                            coordinates={coordinates}
                            settings={settings}
                            uiTheme={uiTheme}
                            hoveredItemName={hoveredItemName}
                            setHoveredItemName={setHoveredItemName}
                            isDetailView={true}
                            quadrantForDetail={quadrantIndex}
                            hoveredRingIndex={hoveredRingIndex}
                            setHoveredRingIndex={setHoveredRingIndex}
                            onRingClick={handleToggleRing}
                            focusedRingIndex={focusedRingIndex} 
                        />
                    </g>
                </svg>
            </div>
            <div className="detail-view-list" style={{ color: uiTheme === 'dark' ? '#cccccc' : '#1f2329' }}>
                <h2 className="detail-view-list-title" style={{ color: selectedColor }}>{selectedQuadrantData}</h2>
                <div className="detail-view-columns">
                    <div className="detail-view-column">
                        {renderRingColumn(column1Rings)}
                    </div>
                     <div className="detail-view-column">
                        {renderRingColumn(column2Rings)}
                    </div>
                </div>
            </div>
        </motion.div>
    );
});

export default QuadrantDetailView;