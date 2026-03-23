import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import '../styles/Dropdowns.css';

const SingleSelectDropdown = ({ label, options, value, onChange, placeholder = 'Выберите...' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (optionValue) => {
        onChange(optionValue);
        setIsOpen(false);
    };
    
    const selectedLabel = options.find(opt => opt.value === value)?.label || placeholder;

    return (
        <div className="dropdown-container" ref={dropdownRef}>
            {label && <label className="dropdown-label">{label}</label>}
            <button type="button" onClick={() => setIsOpen(!isOpen)} className="dropdown-button">
                <span>{selectedLabel}</span>
                <img src='/assets/arrow.svg' alt="toggle" className={`dropdown-arrow ${isOpen ? 'open' : ''}`} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.ul
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="dropdown-list"
                    >
                        {options.map(option => (
                            <li
                                key={option.value}
                                className="dropdown-list-item"
                                onClick={() => handleSelect(option.value)}
                            >
                                {option.label}
                            </li>
                        ))}
                    </motion.ul>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SingleSelectDropdown;