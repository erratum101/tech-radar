import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import '../styles/Dropdowns.css';

const MultiSelectDropdown = ({ label, options, selectedOptions, onChange }) => {
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

    const handleCheckboxChange = (option) => {
        const newSelectedOptions = selectedOptions.includes(option)
            ? selectedOptions.filter(item => item !== option)
            : [...selectedOptions, option];
        onChange(newSelectedOptions);
    };

    return (
        <div className="dropdown-container" ref={dropdownRef}>
            <label className="dropdown-label">{label}</label>
            <button type="button" onClick={() => setIsOpen(!isOpen)} className="dropdown-button">
                <span>{selectedOptions.length > 0 ? `Выбрано: ${selectedOptions.length}` : 'Выберите сотрудников'}</span>
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
                                key={option} 
                                className="dropdown-list-item multi-select-item" 
                                onClick={() => handleCheckboxChange(option)}
                            >
                                <input 
                                    type="checkbox" 
                                    checked={selectedOptions.includes(option)} 
                                    readOnly 
                                />
                                <span>{option}</span>
                            </li>
                        ))}
                    </motion.ul>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MultiSelectDropdown;