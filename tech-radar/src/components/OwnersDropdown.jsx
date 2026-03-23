import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/Dropdowns.css';

const OwnersDropdown = ({ owners, uiTheme = 'light' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef(null);
    const listRef = useRef(null);
    const [listStyle, setListStyle] = useState({});


    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const estimatedWidth = Math.max(rect.width, 120);
            const maxLeft = window.innerWidth - estimatedWidth - 8;
            const clampedLeft = Math.max(8, Math.min(rect.left - 70, maxLeft));

            setListStyle({
                position: 'fixed',
                zIndex: 10001,
                top: `${rect.bottom + 4}px`,
                left: `${clampedLeft}px`,
                minWidth: `${rect.width}px`,
                right: 'auto',
            });
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isOpen &&
                buttonRef.current && !buttonRef.current.contains(event.target) &&
                listRef.current && !listRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    if (!owners || owners.length === 0) {
        return <div style={{ width: '65px' }}></div>;
    }
    
    return (
        <>
            <button ref={buttonRef} onClick={() => setIsOpen(!isOpen)} className="owners-dropdown-button">
                {owners.length} чел.
                <img src='/assets/arrow.svg' alt="toggle" className={`owners-dropdown-arrow dropdown-arrow ${isOpen ? 'open' : ''}`} />
            </button>
            
            {createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <motion.div 
                            ref={listRef}
                            style={listStyle}
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            transition={{ duration: 0.15, ease: "easeInOut" }}
                            className={`owners-dropdown-list${uiTheme === 'dark' ? ' owners-dropdown-list--dark' : ''}`}
                        >
                            <ul style={{ listStyleType: 'none', margin: 0, padding: 0 }}>
                                {owners.sort().map((owner, index) => (
                                    <li key={index} style={{ padding: '6px 12px' }}>{owner}</li>
                                ))}
                            </ul>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
};

export default OwnersDropdown;