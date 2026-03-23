import React, { useState, useRef, useEffect } from 'react';
import '../styles/InlineForm.css';

const InlineForm = ({ onConfirm, onCancel, placeholder, listToCheck, initialValue = '' }) => {
    const [value, setValue] = useState(initialValue);
    const inputRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    const handleConfirmClick = () => {
        const trimmedValue = value.trim();
        if (!trimmedValue) return;
        if (listToCheck && listToCheck.includes(trimmedValue) && trimmedValue !== initialValue) {
            alert("Такой элемент уже существует.");
        } else {
            onConfirm(trimmedValue);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); handleConfirmClick(); }
        if (e.key === 'Escape') onCancel();
    };

    return (
        <div className="inline-form-container">
            <input 
                ref={inputRef} 
                type="text" 
                value={value} 
                onChange={(e) => setValue(e.target.value)} 
                onKeyDown={handleKeyDown} 
                placeholder={placeholder} 
                className="inline-form-input"
                maxLength="22" 
            />
            <button onClick={handleConfirmClick} className="inline-form-btn">
                <img src='/assets/Confirm.svg' alt="Confirm" />
            </button>
            <button onClick={onCancel} className="inline-form-btn">
                <img src='/assets/X.svg' alt="Cancel" />
            </button>
        </div>
    );
};

export default InlineForm;