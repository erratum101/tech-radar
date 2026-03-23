import React, { useState } from 'react';
import SingleSelectDropdown from './SingleSelectDropdown';
import MultiSelectDropdown from './MultiSelectDropdown';
import '../styles/ElementEditor.css';

const ElementEditor = ({ item, settings, allEmployees, allRadarItems, onSave, onCancel, showAlert }) => {
    const [editedItem, setEditedItem] = useState(item);
    const [error, setError] = useState(null);

    const handleChange = (name, value) => {
        setEditedItem(prev => ({ ...prev, [name]: value }));
        if (name === 'name' && error) {
            setError(null);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const trimmedName = editedItem.name.trim();

        if (!trimmedName) {
            setError("Название технологии не может быть пустым.");
            return;
        }

        const isDuplicate = allRadarItems.some(
            (radarItem, idx) => 
                radarItem.name.toLowerCase() === trimmedName.toLowerCase() &&
                (item.isNew || idx !== item.index)
        );

        if (isDuplicate) {
            setError("Технология с таким названием уже существует.");
            return;
        }

        if (settings.departments.length === 0 || settings.quadrants.length === 0 || settings.rings.length === 0) {
            showAlert("Сначала необходимо задать отделы, квадранты и кольца в настройках.");
            return;
        }
        onSave(editedItem);
    };

    return (
        <div className="editor-container">
            <h3>{item.isNew ? 'Создание элемента' : 'Редактирование элемента'}</h3>
            <form onSubmit={handleSubmit}>
                <div>
                    <label className="editor-form-label">Название технологии</label>
                    <input type="text" value={editedItem.name} onChange={(e) => handleChange('name', e.target.value)} className="editor-form-input" maxLength="22" />
                    {error && <p className="editor-form-error">{error}</p>}
                </div>
                <SingleSelectDropdown label="Департамент" options={settings.departments.map(d => ({ value: d, label: d }))} value={editedItem.department} onChange={(v) => handleChange('department', v)} />
                <SingleSelectDropdown label="Квадрант" options={settings.quadrants.map((q, i) => ({ value: i, label: q }))} value={editedItem.quadrant} onChange={(v) => handleChange('quadrant', v)} />
                <SingleSelectDropdown label="Кольцо" options={settings.rings.map((r, i) => ({ value: i, label: r }))} value={editedItem.ring} onChange={(v) => handleChange('ring', v)} />
                <MultiSelectDropdown label="Используют" options={allEmployees.sort()} selectedOptions={editedItem.owners} onChange={(v) => handleChange('owners', v)} />
                <div className="editor-form-buttons">
                    <button type="submit" className="editor-btn save">Сохранить</button>
                    <button type="button" onClick={onCancel} className="editor-btn cancel">Отмена</button>
                </div>
            </form>
        </div>
    );
};

export default ElementEditor;