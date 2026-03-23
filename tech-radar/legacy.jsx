import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from 'xlsx';
const NotificationPopup = ({ notification, clearNotification }) => {
    if (!notification) return null;

    const { message, type, onConfirm } = notification;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex',
                justifyContent: 'center', alignItems: 'center', zIndex: 2000,
                fontFamily: "sans-serif"
            }}
        >
            <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                style={{
                    background: '#3a3a3a', color: '#eee', borderRadius: '8px',
                    padding: '25px 30px', width: '90%', maxWidth: '400px',
                    boxShadow: '0 5px 15px rgba(0,0,0,0.5)', textAlign: 'center'
                }}
            >
                <p style={{ margin: '0 0 20px 0', fontSize: '16px' }}>{message}</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                    {type === 'confirm' && (
                        <button
                            onClick={() => {
                                onConfirm();
                                clearNotification();
                            }}
                            style={{ padding: '10px 20px', background: '#4CAF50', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            Да
                        </button>
                    )}
                    <button
                        onClick={clearNotification}
                        style={{ padding: '10px 20px', background: type === 'confirm' ? '#f44336' : '#007bff', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        {type === 'confirm' ? 'Нет' : 'OK'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

const exportRadarDataToXLSX = (style, allRadarItems, allEmployees) => {
    try {
        const { name, settings } = style;
        const wb = XLSX.utils.book_new();

        const metaData = [{ type: 'techRadarData', version: '1.0', name: name }];
        const ws_meta = XLSX.utils.json_to_sheet(metaData);
        XLSX.utils.book_append_sheet(wb, ws_meta, 'meta');

        const generalData = [
            { key: 'Название радара', value: settings.title },
            { key: 'Цвет фона', value: settings.colors.background },
            { key: 'Цвет текста', value: settings.colors.text }
        ];
        const ws_general = XLSX.utils.json_to_sheet(generalData, { skipHeader: true });
        XLSX.utils.book_append_sheet(wb, ws_general, 'Основные настройки');

        const ringsData = settings.rings.map((ringName, i) => ({ 'Название кольца': ringName, 'Цвет': settings.colors.rings[i] }));
        const ws_rings = XLSX.utils.json_to_sheet(ringsData);
        XLSX.utils.book_append_sheet(wb, ws_rings, 'Кольца');

        const quadrantsData = settings.quadrants.map((quadrantName, i) => ({ 'Название квадранта': quadrantName, 'Цвет': settings.colors.quadrants[i] }));
        const ws_quadrants = XLSX.utils.json_to_sheet(quadrantsData);
        XLSX.utils.book_append_sheet(wb, ws_quadrants, 'Квадранты');
        
        const departmentsData = settings.departments.map((depName, i) => ({ 'Название отдела': depName, 'Цвет': settings.colors.departments[i] }));
        const ws_departments = XLSX.utils.json_to_sheet(departmentsData);
        XLSX.utils.book_append_sheet(wb, ws_departments, 'Отделы');

        const itemsData = allRadarItems.map(item => ({
            'Название': item.name,
            'Отдел': item.department,
            'Квадрант': settings.quadrants[item.quadrant],
            'Кольцо': settings.rings[item.ring],
            'Владельцы': item.owners.join(', ')
        }));
        const ws_items = XLSX.utils.json_to_sheet(itemsData);
        XLSX.utils.book_append_sheet(wb, ws_items, 'Элементы');

        const employeesData = allEmployees.map(emp => ({ 'Имя сотрудника': emp }));
        const ws_employees = XLSX.utils.json_to_sheet(employeesData);
        XLSX.utils.book_append_sheet(wb, ws_employees, 'Сотрудники');

        XLSX.writeFile(wb, `Радар_${name.replace(/ /g, '_')}.xlsx`);
    } catch (error) {
        console.error("Ошибка при экспорте данных радара:", error);
        alert("Не удалось экспортировать данные. См. консоль для подробностей.");
    }
};


const importStyleFromXLSX = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target.result;
                const wb = XLSX.read(data, { type: 'array' });

                if (!wb.SheetNames.includes('meta')) return reject('Неверный формат файла: отсутствует лист "meta".');
                const meta = XLSX.utils.sheet_to_json(wb.Sheets['meta'])[0];
                if (meta.type !== 'techRadarData' && meta.type !== 'techRadarStyle') return reject('Файл не является файлом стиля для Тех. Радара.');

                const newSettings = { colors: {} };
                const sheetName = wb.SheetNames.includes('Основные настройки') ? 'Основные настройки' : 'Основные';

                const generalData = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });
                const generalMap = new Map(generalData);
                newSettings.title = generalMap.get('Название радара');
                newSettings.colors.background = generalMap.get('Цвет фона');
                newSettings.colors.text = generalMap.get('Цвет текста');

                const ringsData = XLSX.utils.sheet_to_json(wb.Sheets['Кольца']);
                newSettings.rings = ringsData.map(r => r['Название кольца']);
                newSettings.colors.rings = ringsData.map(r => r['Цвет']);

                const quadrantsData = XLSX.utils.sheet_to_json(wb.Sheets['Квадранты']);
                newSettings.quadrants = quadrantsData.map(r => r['Название квадранта']);
                newSettings.colors.quadrants = quadrantsData.map(r => r['Цвет']);

                const departmentsData = XLSX.utils.sheet_to_json(wb.Sheets['Отделы']);
                newSettings.departments = departmentsData.map(r => r['Название отдела']);
                newSettings.colors.departments = departmentsData.map(r => r['Цвет']);
                
                if (!newSettings.title || !newSettings.rings || !newSettings.quadrants || !newSettings.departments) {
                    return reject('Файл поврежден или имеет неверную структуру.');
                }
                
                resolve({ name: meta.name || 'Импортированный радар', settings: newSettings });
            } catch (err) {
                console.error("Ошибка парсинга файла стиля:", err);
                reject('Ошибка при обработке файла. Убедитесь, что структура верна.');
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
};

const SingleSelectDropdown = ({ label, options, value, onChange, placeholder = 'Выберите...' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
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
    const listItemStyle = { padding: '10px', cursor: 'pointer', color: '#ddd', transition: 'background-color 0.2s, color 0.2s' };
    const selectedLabel = options.find(opt => opt.value === value)?.label || placeholder;

    const containerStyle = { position: 'relative', marginBottom: '15px' };
    const labelStyle = { display: 'block', marginBottom: '5px', color: '#ccc' };
    const dropdownButtonStyle = {
        width: '100%', boxSizing: 'border-box', padding: '8px', background: '#555',
        border: '1px solid #777', color: isHovered ? '#fff' : '#ddd', borderRadius: '4px', textAlign: 'left',
        cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        outline: 'none', transition: 'all 0.2s ease-in-out',
        transform: isHovered ? 'scale(1.02)' : 'scale(1)',
    };
    const dropdownListStyle = {
        position: 'absolute', width: '100%', background: '#4a4a4a', border: '1px solid #777',
        borderRadius: '4px', marginTop: '5px', zIndex: 10, maxHeight: '200px',
        overflowY: 'auto', listStyle: 'none', padding: 0, margin: 0
    };

    return (
        <div style={containerStyle} ref={dropdownRef}>
            {label && <label style={labelStyle}>{label}</label>}
            <button type="button" onClick={() => setIsOpen(!isOpen)} style={dropdownButtonStyle} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
                <span>{selectedLabel}</span>
                <img src='./src/assets/arrow.svg' alt="toggle" style={{ width: 14, height: 7, transform: isOpen ? 'rotate(180deg)' : 'none', filter: isHovered ? 'brightness(1)' : 'brightness(0.9)', transition: 'filter 0.2s ease-in-out' }} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.ul
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={dropdownListStyle}
                    >
                        {options.map(option => (
                            <li
                                key={option.value}
                                style={listItemStyle}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#555'; e.currentTarget.style.color = '#fff';}}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#ddd';}}
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

const MultiSelectDropdown = ({ label, options, selectedOptions, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
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
    const listItemStyle = { padding: '10px', cursor: 'pointer', color: '#ddd', transition: 'background-color 0.2s, color 0.2s', display: 'flex', alignItems: 'center', gap: '8px' };
    const containerStyle = { position: 'relative', marginBottom: '15px' };
    const labelStyle = { display: 'block', marginBottom: '5px', color: '#ccc' };
    const dropdownButtonStyle = {
        width: '100%', boxSizing: 'border-box', padding: '8px', background: '#555',
        border: '1px solid #777', color: isHovered ? '#fff' : '#ddd', borderRadius: '4px', textAlign: 'left',
        cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        outline: 'none', transition: 'all 0.2s ease-in-out',
        transform: isHovered ? 'scale(1.02)' : 'scale(1)',
    };
    const dropdownListStyle = {
        position: 'absolute', width: '100%', background: '#4a4a4a', border: '1px solid #777',
        borderRadius: '4px', marginTop: '5px', zIndex: 10, maxHeight: '200px',
        overflowY: 'auto', listStyle: 'none', padding: 0, margin: 0
    };

    return (
        <div style={containerStyle} ref={dropdownRef}>
            <label style={labelStyle}>{label}</label>
            <button type="button" onClick={() => setIsOpen(!isOpen)} style={dropdownButtonStyle} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
                <span>{selectedOptions.length > 0 ? `Выбрано: ${selectedOptions.length}` : 'Выберите сотрудников'}</span>
                <img src='./src/assets/arrow.svg' alt="toggle" style={{ width: 14, height: 7, transform: isOpen ? 'rotate(180deg)' : 'none', filter: isHovered ? 'brightness(1)' : 'brightness(0.9)', transition: 'filter 0.2s ease-in-out' }} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={dropdownListStyle}>
                        {options.map(option => (
                            <li key={option} style={listItemStyle} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#555'; e.currentTarget.style.color = '#fff'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#ddd'; }} onClick={() => handleCheckboxChange(option)}>
                                <input type="checkbox" checked={selectedOptions.includes(option)} readOnly style={{ pointerEvents: 'none' }} />
                                <span>{option}</span>
                            </li>
                        ))}
                    </motion.ul>
                )}
            </AnimatePresence>
        </div>
    );
};

const ElementEditor = ({ item, settings, allEmployees, onSave, onCancel, showAlert }) => {
    const [editedItem, setEditedItem] = useState(item);
    const [hover, setHover] = useState({});

    const handleChange = (name, value) => {
        setEditedItem(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!editedItem.name.trim()) {
            showAlert("Название технологии не может быть пустым.");
            return;
        }
        if (settings.departments.length === 0 || settings.quadrants.length === 0 || settings.rings.length === 0) {
            showAlert("Сначала необходимо задать отделы, квадранты и кольца в настройках.");
            return;
        }
        onSave(editedItem);
    };

    const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '8px', background: '#555', border: '1px solid #777', color: '#ddd', borderRadius: '4px', marginTop: '5px', marginBottom: '15px', outline: 'none' };
    const labelStyle = { display: 'block', marginBottom: '5px', color: '#ccc' };
    const btnStyle = (isHovered) => ({ 
        padding: '10px 15px', 
        border: 'none', 
        borderRadius: '4px', 
        cursor: 'pointer', 
        marginRight: '10px',
        transition: 'all 0.2s ease',
        transform: isHovered ? 'scale(1.05)' : 'scale(1)',
        filter: isHovered ? 'brightness(1.1)' : 'brightness(1)',
    });

    return (
        <div style={{ background: '#3a3a3a', padding: '20px', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0 }}>{item.isNew ? 'Создание элемента' : 'Редактирование элемента'}</h3>
            <form onSubmit={handleSubmit}>
                <div>
                    <label style={labelStyle}>Название технологии</label>
                    <input type="text" value={editedItem.name} onChange={(e) => handleChange('name', e.target.value)} style={inputStyle} required maxLength="22" />
                </div>
                <SingleSelectDropdown label="Департамент" options={settings.departments.map(d => ({ value: d, label: d }))} value={editedItem.department} onChange={(v) => handleChange('department', v)} />
                <SingleSelectDropdown label="Квадрант" options={settings.quadrants.map((q, i) => ({ value: i, label: q }))} value={editedItem.quadrant} onChange={(v) => handleChange('quadrant', v)} />
                <SingleSelectDropdown label="Кольцо" options={settings.rings.map((r, i) => ({ value: i, label: r }))} value={editedItem.ring} onChange={(v) => handleChange('ring', v)} />
                <MultiSelectDropdown label="Используют" options={allEmployees.sort()} selectedOptions={editedItem.owners} onChange={(v) => handleChange('owners', v)} />
                <div>
                    <button type="submit" style={{ ...btnStyle(hover.save), background: '#4CAF50', color: '#fff' }} onMouseEnter={()=>setHover({save: true})} onMouseLeave={()=>setHover({})}>Сохранить</button>
                    <button type="button" onClick={onCancel} style={{ ...btnStyle(hover.cancel), background: '#666', color: '#ddd' }} onMouseEnter={()=>setHover({cancel: true})} onMouseLeave={()=>setHover({})}>Отмена</button>
                </div>
            </form>
        </div>
    );
};

const InlineForm = ({ onConfirm, onCancel, placeholder, listToCheck, initialValue = '' }) => {
    const [value, setValue] = useState(initialValue);
    const [hover, setHover] = useState({});
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

    const formStyle = { display: 'flex', gap: '5px', alignItems: 'center', flexGrow: 1 };
    const inputStyle = { flexGrow: 1, padding: '6px', background: '#555', border: '1px solid #999', color: '#ddd', borderRadius: '4px', outline: 'none' };
    const btnIconStyle = (isHovered) => ({ 
        background: 'none', 
        border: 'none', 
        cursor: 'pointer', 
        padding: '5px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background-color 0.2s ease',
        backgroundColor: isHovered ? 'rgba(255,255,255,0.1)' : 'transparent',
    });

    return (
        <div style={formStyle}>
            <input ref={inputRef} type="text" value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={handleKeyDown} placeholder={placeholder} style={inputStyle} />
            <button onClick={handleConfirmClick} style={btnIconStyle(hover.confirm)} onMouseEnter={()=>setHover({confirm: true})} onMouseLeave={()=>setHover({})}><img src='./src/assets/Confirm.svg' alt="Confirm" style={{ width: 14, height: 14, filter: hover.confirm ? 'brightness(1.2)' : 'brightness(0.9)' }} /></button>
            <button onClick={onCancel} style={btnIconStyle(hover.cancel)} onMouseEnter={()=>setHover({cancel: true})} onMouseLeave={()=>setHover({})}><img src='./src/assets/X.svg' alt="Cancel" style={{ width: 14, height: 14, filter: hover.cancel ? 'brightness(1.2)' : 'brightness(0.9)' }} /></button>
        </div>
    );
};

const SettingsOverlay = ({
    isOpen, onClose, settings, setSettings,
    allEmployees, setAllEmployees, allRadarItems, setAllRadarItems,
    resetSettingsToEmpty, showAlert, showConfirm,
    savedStyles, setSavedStyles
}) => {
    const [activeTab, setActiveTab] = useState('colors');
    const [editingItem, setEditingItem] = useState(null);
    const [editingKey, setEditingKey] = useState(null);
    const [isAdding, setIsAdding] = useState({ department: false, employee: false });
    const [isAddingStyle, setIsAddingStyle] = useState(false);
    const [hoverState, setHoverState] = useState({});
    const [buttonHover, setButtonHover] = useState({});
    const fileInputRef = useRef(null);
    
    const tabs = [
        { id: 'colors', label: 'Цвета и Иконки', iconSrc: './src/assets/Colors.svg' },
        { id: 'names', label: 'Названия', iconSrc: './src/assets/Name.svg' },
        { id: 'employees', label: 'Сотрудники', iconSrc: './src/assets/Person.svg' },
        { id: 'elements', label: 'Элементы', iconSrc: './src/assets/Elements.svg' },
        { id: 'styles', label: 'Радары', iconSrc: './src/assets/upload.svg' }
    ];

    if (!isOpen) return null;

    const handleSettingChange = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));
    const handleColorChange = (type, index, value) => {
        setSettings(prev => {
            const newColors = { ...prev.colors, [type]: [...prev.colors[type]] };
            newColors[type][index] = value;
            return { ...prev, colors: newColors };
        });
    };

    const handleListUpdate = (key, index, newName) => {
        const list = settings[key];
        const oldName = list[index];
        if (newName && newName !== oldName && !list.includes(newName)) {
            const newList = [...list];
            newList[index] = newName;
            setSettings(prev => ({ ...prev, [key]: newList }));
            if (key === 'departments') {
                setAllRadarItems(prevItems => prevItems.map(item => item.department === oldName ? { ...item, department: newName } : item));
            }
        } else if (newName && newName !== oldName) {
            showAlert("Такой элемент уже существует.");
        }
        setEditingKey(null);
    };

    const handleEmployeeUpdate = (index, newName) => {
        const oldName = allEmployees[index];
        if (newName && newName !== oldName && !allEmployees.includes(newName)) {
            setAllEmployees(prev => prev.map((item, i) => (i === index ? newName : item)).sort());
            setAllRadarItems(prevItems => prevItems.map(item => ({ ...item, owners: item.owners.map(owner => owner === oldName ? newName : owner) })));
        } else if (newName && newName !== oldName) {
            showAlert("Такой элемент уже существует.");
        }
        setEditingKey(null);
    };

    const handleListRemove = (key, index, name) => {
        showConfirm(`Удалить "${name}"? Это действие нельзя будет отменить.`, () => {
            if (key === 'departments') {
                const newDepartments = settings.departments.filter((_, i) => i !== index);
                const newColors = settings.colors.departments.filter((_, i) => i !== index);
                setSettings(prev => ({ ...prev, departments: newDepartments, colors: { ...prev.colors, departments: newColors } }));
                setAllRadarItems(prev => prev.filter(item => item.department !== name));
            } else if (key === 'employees') {
                setAllEmployees(allEmployees.filter((_, i) => i !== index));
                setAllRadarItems(prevItems => prevItems.map(item => ({ ...item, owners: item.owners.filter(owner => owner !== name) })));
            }
        });
    };
    
    const handleAddItem = (key, name) => {
        if (key === 'departments') {
            setSettings(prev => ({ ...prev, departments: [name, ...prev.departments], colors: { ...prev.colors, departments: ['#cccccc', ...prev.colors.departments] } }));
            setIsAdding({ ...isAdding, department: false });
        } else if (key === 'employees') {
            setAllEmployees(prev => [name, ...prev].sort());
            setIsAdding({ ...isAdding, employee: false });
        }
    };
    
    const handleAddRadarItem = () => {
         if (settings.departments.length === 0) {
            showAlert("Сначала добавьте хотя бы один отдел в настройках 'Названия'.");
            setActiveTab('names');
            return;
        }
        setEditingItem({ name: '', department: settings.departments[0] || '', quadrant: 0, ring: 0, owners: [], isNew: true });
    }
    const handleSaveRadarItem = (itemToSave) => {
        const { index, isNew, ...newItemData } = itemToSave;
        setAllRadarItems(prev => isNew ? [newItemData, ...prev] : prev.map((item, i) => i === index ? newItemData : item));
        setEditingItem(null);
    };
    const handleDeleteRadarItem = (index) => showConfirm("Вы уверены, что хотите удалить эту технологию?", () => setAllRadarItems(prev => prev.filter((_, i) => i !== index)));
    
    const handleIconUpload = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => setSettings(prev => ({ ...prev, logo: reader.result }));
            reader.readAsDataURL(file);
        } else if (file) {
            showAlert("Пожалуйста, выберите файл изображения.");
        }
    };
    
    const handleSaveCurrentStyle = () => {
        setActiveTab('styles');
        setIsAddingStyle(true);
    };

    const confirmSaveNewStyle = (name) => {
        if (!name) {
            setIsAddingStyle(false);
            return;
        }
        if (savedStyles.some(style => style.name.toLowerCase() === name.toLowerCase())) {
            showAlert('Радар с таким названием уже существует.');
            return;
        }
        const newStyle = { id: Date.now(), name, settings: JSON.parse(JSON.stringify(settings)) };
        setSavedStyles(prev => [...prev, newStyle]);
        setIsAddingStyle(false);
        showAlert(`Радар "${name}" сохранен.`);
    };

    const handleApplyStyle = (styleToApply) => {
        setSettings(styleToApply.settings);
        showAlert(`Радар "${styleToApply.name}" применен.`);
        onClose();
    };

    const handleRenameStyle = (styleId, newName) => {
        if (savedStyles.some(s => s.name.toLowerCase() === newName.toLowerCase() && s.id !== styleId)) {
            showAlert('Радар с таким названием уже существует.');
            return;
        }
        setSavedStyles(prev => prev.map(s => s.id === styleId ? { ...s, name: newName } : s));
        setEditingKey(null);
    };

    const handleDeleteStyle = (styleToDelete) => {
        showConfirm(`Вы уверены, что хотите удалить радар "${styleToDelete.name}"?`, () => {
            setSavedStyles(prev => prev.filter(s => s.id !== styleToDelete.id));
            showAlert(`Радар "${styleToDelete.name}" удален.`);
        });
    };

    const handleUploadStyleFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const newStyle = await importStyleFromXLSX(file);
            if (savedStyles.some(s => s.name.toLowerCase() === newStyle.name.toLowerCase())) {
                showConfirm(`Радар "${newStyle.name}" уже существует. Заменить его?`, () => {
                     setSavedStyles(prev => {
                        const updated = prev.map(s => s.name.toLowerCase() === newStyle.name.toLowerCase() ? {...newStyle, id: s.id} : s);
                        return updated;
                     });
                     showAlert(`Радар "${newStyle.name}" обновлен.`);
                });
            } else {
                setSavedStyles(prev => [...prev, { ...newStyle, id: Date.now() }]);
                showAlert(`Радар "${newStyle.name}" успешно загружен.`);
            }
        } catch (error) {
            showAlert(String(error));
        }
        e.target.value = null;
    };


    const sectionStyle = { borderBottom: '1px solid #555', paddingBottom: '20px', marginBottom: '20px' };
    const listItemStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#4a4a4a', padding: '8px', borderRadius: '4px', marginBottom: '5px', minHeight: '25px', color: '#ddd' };
    const addBtnStyle = (isHovered) => ({ 
        padding: '8px 12px', 
        border: 'none', 
        color: '#fff', 
        borderRadius: '4px', 
        cursor: 'pointer', 
        background: '#4CAF50',
        transition: 'all 0.2s ease',
        transform: isHovered ? 'scale(1.05)' : 'scale(1)',
        filter: isHovered ? 'brightness(1.1)' : 'brightness(1)'
    });
    const btnIconStyle = (isHovered) => ({ 
        background: isHovered ? 'rgba(255,255,255,0.1)' : 'transparent',
        border: 'none', 
        cursor: 'pointer', 
        padding: '5px', 
        display: 'inline-flex', 
        alignItems: 'center',
        borderRadius: '50%',
        transition: 'all 0.2s ease',
    });
    const styleButton = (isHovered) => ({ 
        padding: '8px 12px',
        border: 'none',
        width: '100%',
        color: '#ddd', 
        borderRadius: '4px', 
        cursor: 'pointer', 
        background: isHovered ? '#555' : '#444',
        transition: 'all 0.2s ease',
        transform: isHovered ? 'scale(1.03)' : 'scale(1)',
    });

    const renderContent = () => {
        switch (activeTab) {
            case 'colors':
                return (
                    <div>
                        <h3>Настройки Цвета и Иконок</h3>
                        <div style={{ ...sectionStyle, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                             <div>
                                <label>Логотип</label>
                                <input type="file" accept="image/*" onChange={handleIconUpload} style={{ display: 'block', marginTop: '5px', color: '#ddd' }} />
                            </div>
                            <div>
                                <label>Цвет фона: </label>
                                <input type="color" value={settings.colors.background} onChange={(e) => handleSettingChange('colors', { ...settings.colors, background: e.target.value })} />
                            </div>
                            <div>
                                <label>Основной цвет шрифта: </label>
                                <input type="color" value={settings.colors.text} onChange={(e) => handleSettingChange('colors', { ...settings.colors, text: e.target.value })} />
                            </div>
                        </div>
                        {[ 'rings', 'quadrants', 'departments'].map(type => (
                            <div key={type} style={{ ...sectionStyle, ...(type === 'departments' && {borderBottom: 'none'})}}>
                                <h4>Цвета {type === 'rings' ? 'колец' : type === 'quadrants' ? 'квадрантов' : 'отделов'}</h4>
                                {settings[type] && settings[type].map((name, index) => (
                                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                                        <input type="color" value={(settings.colors[type] && settings.colors[type][index]) || '#cccccc'} onChange={(e) => handleColorChange(type, index, e.target.value)} />
                                        <span>{name}</span>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                );
            case 'names':
                return (
                    <>
                        {['departments', 'quadrants', 'rings'].map(key => (
                            <div key={key} style={{ ...sectionStyle, ...(key === 'rings' && {borderBottom: 'none'}) }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <h4>{key === 'departments' ? 'Отделы' : key === 'quadrants' ? 'Квадранты' : 'Кольца'}</h4>
                                    {key === 'departments' && <button onClick={() => setIsAdding({ ...isAdding, department: true })} style={addBtnStyle(buttonHover.addDepartment)} onMouseEnter={() => setButtonHover({addDepartment: true})} onMouseLeave={() => setButtonHover({})} disabled={isAdding.department}>Добавить</button>}
                                </div>
                                {isAdding.department && key === 'departments' && <div style={listItemStyle}><InlineForm required maxLength="22" onConfirm={(name) => handleAddItem('departments', name)} onCancel={() => setIsAdding({ ...isAdding, department: false })} placeholder="Новый отдел" listToCheck={settings.departments} /></div>}
                                {settings[key] && settings[key].map((name, index) => (
                                    <div key={index} style={listItemStyle}>
                                        {editingKey === `${key}-${index}` ?
                                            <InlineForm initialValue={name} onConfirm={(newName) => handleListUpdate(key, index, newName)} onCancel={() => setEditingKey(null)} listToCheck={settings[key]} /> :
                                            <>
                                                <span>{name}</span>
                                                <div>
                                                    <button onClick={() => setEditingKey(`${key}-${index}`)} style={btnIconStyle(buttonHover[`edit-${key}-${index}`])} onMouseEnter={()=>setButtonHover({[`edit-${key}-${index}`]: true})} onMouseLeave={()=>setButtonHover({})}><img src='./src/assets/Edit.svg' alt="Edit" style={{ width: 16, height: 16 }} /></button>
                                                    {key === 'departments' && <button onClick={() => handleListRemove(key, index, name)} style={btnIconStyle(buttonHover[`delete-${key}-${index}`])} onMouseEnter={()=>setButtonHover({[`delete-${key}-${index}`]: true})} onMouseLeave={()=>setButtonHover({})}><img src='./src/assets/X.svg' alt="Delete" style={{ width: 16, height: 16 }} /></button>}
                                                </div>
                                            </>
                                        }
                                    </div>
                                ))}
                            </div>
                        ))}
                    </>
                );
            case 'employees':
                 return (
                    <div style={{ ...sectionStyle, borderBottom: 'none' }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h3>Управление сотрудниками</h3>
                            <button onClick={() => setIsAdding({ ...isAdding, employee: true })} style={addBtnStyle(buttonHover.addEmployee)} onMouseEnter={() => setButtonHover({addEmployee: true})} onMouseLeave={() => setButtonHover({})} disabled={isAdding.employee}>Добавить</button>
                        </div>
                        {isAdding.employee && <div style={listItemStyle}><InlineForm onConfirm={(name) => handleAddItem('employees', name)} onCancel={() => setIsAdding({ ...isAdding, employee: false })} placeholder="Новый сотрудник" listToCheck={allEmployees} /></div>}
                        {allEmployees.map((emp, index) => (
                            <div key={emp} style={listItemStyle}>
                                {editingKey === `employee-${index}` ?
                                    <InlineForm initialValue={emp} onConfirm={(newName) => handleEmployeeUpdate(index, newName)} onCancel={() => setEditingKey(null)} listToCheck={allEmployees} /> :
                                    <>
                                        <span>{emp}</span>
                                        <div>
                                            <button onClick={() => setEditingKey(`employee-${index}`)} style={btnIconStyle(buttonHover[`edit-emp-${index}`])} onMouseEnter={()=>setButtonHover({[`edit-emp-${index}`]: true})} onMouseLeave={()=>setButtonHover({})}><img src='./src/assets/Edit.svg' alt="Edit" style={{ width: 16, height: 16 }} /></button>
                                            <button onClick={() => handleListRemove('employees', index, emp)} style={btnIconStyle(buttonHover[`delete-emp-${index}`])} onMouseEnter={()=>setButtonHover({[`delete-emp-${index}`]: true})} onMouseLeave={()=>setButtonHover({})}><img src='./src/assets/X.svg' alt="Delete" style={{ width: 16, height: 16 }} /></button>
                                        </div>
                                    </>
                                }
                            </div>
                        ))}
                    </div>
                 );
            case 'elements':
                if (editingItem) return <ElementEditor item={editingItem} settings={settings} allEmployees={allEmployees} onSave={handleSaveRadarItem} onCancel={() => setEditingItem(null)} showAlert={showAlert} />;
                return (
                    <div style={{ ...sectionStyle, borderBottom: 'none' }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h3>Управление элементами радара</h3>
                            <button onClick={handleAddRadarItem} style={addBtnStyle(buttonHover.addElement)} onMouseEnter={() => setButtonHover({addElement: true})} onMouseLeave={() => setButtonHover({})}>Добавить</button>
                        </div>
                        {allRadarItems.map((item, index) => (
                            <div key={`${item.name}-${index}`} style={{ ...listItemStyle, flexDirection: 'column', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                    <strong style={{ fontSize: '16px' }}>{item.name}</strong>
                                    <div>
                                        <button onClick={() => setEditingItem({ ...item, index, isNew: false })} style={btnIconStyle(buttonHover[`edit-item-${index}`])} onMouseEnter={()=>setButtonHover({[`edit-item-${index}`]: true})} onMouseLeave={()=>setButtonHover({})}><img src='./src/assets/Edit.svg' alt="Edit" style={{ width: 16, height: 16 }} /></button>
                                        <button onClick={() => handleDeleteRadarItem(index)} style={btnIconStyle(buttonHover[`delete-item-${index}`])} onMouseEnter={()=>setButtonHover({[`delete-item-${index}`]: true})} onMouseLeave={()=>setButtonHover({})}><img src='./src/assets/X.svg' alt="Delete" style={{ width: 16, height: 16 }} /></button>
                                    </div>
                                </div>
                                <div style={{ fontSize: '12px', color: '#ccc', marginTop: '8px' }}>
                                    <span style={{ color: settings.colors.departments[settings.departments.indexOf(item.department)], fontWeight: 'bold' }}>{item.department}</span>{' ● '}
                                    <span style={{ color: settings.colors.quadrants[item.quadrant], fontWeight: 'bold' }}>{settings.quadrants[item.quadrant]}</span>{' ● '}
                                    <span style={{ color: settings.colors.text, fontWeight: 'bold' }}>{settings.rings[item.ring]}</span>
                                </div>
                                {item.owners && item.owners.length > 0 && <div style={{ fontSize: '12px', color: '#aaa', marginTop: '6px', fontStyle: 'italic' }}>Используют: {item.owners.join(', ')}</div>}
                            </div>
                        ))}
                    </div>
                );
            case 'styles':
                 return (
                    <div style={{ ...sectionStyle, borderBottom: 'none' }}>
                        
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h3>Управление радарами</h3>
                            <button onClick={() => fileInputRef.current && fileInputRef.current.click()} style={addBtnStyle(hoverState.upload)} onMouseEnter={()=>setHoverState({upload:true})} onMouseLeave={()=>setHoverState({})}>Загрузить из файла</button>
                            <input type="file" ref={fileInputRef} onChange={handleUploadStyleFile} accept=".xlsx" style={{ display: 'none' }} />
                        </div>
                        
                        {isAddingStyle && (
                            <div style={{...listItemStyle, marginTop: '10px'}}>
                                <InlineForm
                                    placeholder="Название нового радара"
                                    listToCheck={savedStyles.map(s => s.name)}
                                    onConfirm={confirmSaveNewStyle}
                                    onCancel={() => setIsAddingStyle(false)}
                                />
                            </div>
                        )}
                        {savedStyles.map((style) => (
                            <div key={style.id} style={{...listItemStyle, marginTop: isAddingStyle ? 0 : '5px'}}>
                                {editingKey === style.id ? (
                                    <InlineForm 
                                        initialValue={style.name} 
                                        onConfirm={(newName) => handleRenameStyle(style.id, newName)}
                                        onCancel={() => setEditingKey(null)}
                                        listToCheck={savedStyles.map(s => s.name)}
                                    />
                                ) : (
                                    <>
                                        <span style={{ fontWeight: style.isDefault ? 'bold' : 'normal' }}>{style.name}</span>
                                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                            <button onClick={() => handleApplyStyle(style)} style={{...addBtnStyle(buttonHover[`apply-${style.id}`]), padding: '5px 10px', fontSize: '12px', background: '#28a745'}} onMouseEnter={()=>setButtonHover({[`apply-${style.id}`]:true})} onMouseLeave={()=>setButtonHover({})}>Применить</button>
                                            <button onClick={() => exportRadarDataToXLSX(style, allRadarItems, allEmployees)} style={{...addBtnStyle(buttonHover[`download-${style.id}`]), padding: '5px 10px', fontSize: '12px', background: '#6c757d'}} onMouseEnter={()=>setButtonHover({[`download-${style.id}`]:true})} onMouseLeave={()=>setButtonHover({})}>Скачать</button>
                                            {!style.isDefault && (
                                                <>
                                                    <button onClick={() => setEditingKey(style.id)} style={btnIconStyle(buttonHover[`edit-style-${style.id}`])} onMouseEnter={()=>setButtonHover({[`edit-style-${style.id}`]:true})} onMouseLeave={()=>setButtonHover({})}><img src='./src/assets/Edit.svg' alt="Rename" style={{ width: 16, height: 16 }} /></button>
                                                    <button onClick={() => handleDeleteStyle(style)} style={btnIconStyle(buttonHover[`delete-style-${style.id}`])} onMouseEnter={()=>setButtonHover({[`delete-style-${style.id}`]:true})} onMouseLeave={()=>setButtonHover({})}><img src='./src/assets/X.svg' alt="Delete" style={{ width: 16, height: 16 }} /></button>
                                                </>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                );
            default: return null;
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, fontFamily: "sans-serif" }} onClick={onClose}>
                    <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} style={{ background: '#3a3a3a', color: '#eee', borderRadius: '8px', width: '60%', height: '80%', display: 'flex', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                        <div style={{ background: '#2c2c2c', padding: '10px 0', minWidth: '220px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                            <div style={{ flexGrow: 1, overflowY: 'auto' }}>
                                <h2 style={{ padding: '10px 20px', margin: '0 0 20px 0' }}>Настройки</h2>
                                {tabs.map(tab => (
                                    <button key={tab.id} onClick={() => { setActiveTab(tab.id); setEditingItem(null); setEditingKey(null); setIsAddingStyle(false); }} style={{ display: 'flex', alignItems: 'center', gap: '15px', width: '100%', padding: '15px 20px', background: activeTab === tab.id ? '#3a3a3a' : 'none', border: 'none', color: buttonHover[tab.id] || activeTab === tab.id ? '#fff' : '#ddd', fontSize: '16px', textAlign: 'left', cursor: 'pointer', transition: 'background-color 0.2s ease, color 0.2s ease' }} onMouseEnter={()=>setButtonHover({[tab.id]: true})} onMouseLeave={()=>setButtonHover({})}>
                                        <span style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><img src={tab.iconSrc} alt="" style={{ width: '100%', height: '100%', filter: buttonHover[tab.id] || activeTab === tab.id ? 'brightness(1.2)' : 'brightness(0.9)', transition: 'filter 0.2s ease-in-out' }} /></span>
                                        <span>{tab.label}</span>
                                    </button>
                                ))}
                            </div>
                            <div style={{ padding: '10px 20px', background: '#2c2c2c', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <button onClick={handleSaveCurrentStyle} style={styleButton(hoverState.save)} onMouseEnter={()=>setHoverState({save: true})} onMouseLeave={()=>setHoverState({})}>Сохранить текущий</button>
                                <button onMouseEnter={() => setHoverState({ reset: true })} onMouseLeave={() => setHoverState({})} onClick={resetSettingsToEmpty} style={styleButton(hoverState.reset)}>Сбросить всё</button>
                            </div>
                        </div>
                        <div style={{ flex: '1 1 auto', position: 'relative' }}>
                            <style>{`.settings-content-scroll::-webkit-scrollbar {width:8px;} .settings-content-scroll::-webkit-scrollbar-track {background:#3a3a3a;} .settings-content-scroll::-webkit-scrollbar-thumb {background-color:#555; border-radius:4px;}`}</style>
                            <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '20px', background: 'none', border: 'none', color: '#aaa', fontSize: '24px', cursor: 'pointer', zIndex: 10 }}>×</button>
                            <div className="settings-content-scroll" style={{ height: '100%', overflowY: 'auto', padding: '25px 40px' }}>{renderContent()}</div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const OwnersDropdown = ({ owners }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false); };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!owners || owners.length === 0) return <div style={{ width: '65px' }}></div>;
    
    return (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)} style={{ background: '#444', color: isHovered ? '#fff' : '#ddd', border: '1px solid #555', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onMouseEnter={()=>setIsHovered(true)} onMouseLeave={()=>setIsHovered(false)}>
                {owners.length} чел.
                <img src='./src/assets/arrow.svg' alt="toggle" style={{ marginLeft: '4px', width: 14, height: 7, transform: isOpen ? 'rotate(180deg)' : 'none', filter: isHovered ? 'brightness(1)' : 'brightness(0.9)' }} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ position: 'absolute', top: '100%', right: 0, marginTop: '5px', background: '#3a3a3a', border: '1px solid #555', borderRadius: '4px', padding: '8px', zIndex: 10, minWidth: '150px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#ddd' }}>
                            {owners.sort().map((owner, index) => (<li key={index} style={{ padding: '4px 8px', whiteSpace: 'nowrap' }}>{owner}</li>))}
                        </ul>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const RadarGraphic = ({ size, items, coordinates, settings, hoveredItemName, setHoveredItemName }) => {
    const center = size / 2;
    const ringWidth = (settings.rings && settings.rings.length > 0) ? center / settings.rings.length : center;
    const blipRadius = 7;

    return (
        <g>
            {settings.rings && settings.rings.slice().reverse().map((_, i_rev) => {
                const i = settings.rings.length - 1 - i_rev;
                return (<circle key={i} cx={center} cy={center} r={(i + 1) * ringWidth} fill={settings.colors.rings[i]} stroke="#333" strokeWidth={1} />)
            })}

            {items.map((item) => {
                if (!coordinates[item.name] || settings.quadrants.length === 0) return null;
                const { x, y } = coordinates[item.name];
                const isHovered = hoveredItemName === item.name;
                return (
                    <g key={item.name} onMouseEnter={() => setHoveredItemName(item.name)} onMouseLeave={() => setHoveredItemName(null)}>
                        <motion.circle data-quadrant={item.quadrant} cx={x} cy={y} r={blipRadius} fill={settings.colors.quadrants[item.quadrant]} stroke="#fff" strokeWidth={1.5} animate={{ scale: isHovered ? 1.5 : 1, zIndex: isHovered ? 100 : 1 }} transition={{ duration: 0.2 }} />
                        {item.number && (<text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="9px" fontWeight="bold" style={{ pointerEvents: 'none' }}>{item.number}</text>)}
                    </g>
                );
            })}
        </g>
    );
};

const HomeScreenView = ({ settings, isInitialEmpty }) => (
    <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ color: settings.colors.text, textAlign: 'center', padding: "0 0 100px" }}>
        {isInitialEmpty ? (
            <div style={{ opacity: 0.6, maxWidth: '600px' }}>
                <h2 style={{ fontSize: '28px', fontWeight: "600", marginBottom: '20px' }}>Добро пожаловать в конструктор радаров!</h2>
                <p style={{ fontSize: '18px', lineHeight: '1.6' }}>
                    Для начала работы вы можете:
                    <br/>- Нажать <strong>"Тестовые данные"</strong>, чтобы загрузить пример.
                    <br/>- Открыть <strong>настройки (⚙️)</strong>, чтобы создать свой радар с нуля.
                </p>
            </div>
        ) : (
            <div style={{ opacity: 0.3, fontSize: '32px', fontWeight: "600" }}>
                 Выберите отдел
            </div>
        )}
    </motion.div>
);

const QuadrantDetailView = React.forwardRef(({ quadrantIndex, items, coordinates, settings }, ref) => {
    const fullRadarSize = 500;
    const viewSize = 400;
    const scale = viewSize / (fullRadarSize / 2);
    const offsets = [
        { x: 0, y: 0 },
        { x: -250, y: 0 },
        { x: -250, y: -250 },
        { x: 0, y: -250 }
    ];
    if (quadrantIndex >= settings.quadrants.length) return null;

    const transform = `scale(${scale}) translate(${offsets[quadrantIndex].x}, ${offsets[quadrantIndex].y})`;
    const selectedQuadrantData = settings.quadrants[quadrantIndex];
    const selectedColor = settings.colors.quadrants[quadrantIndex];
    const [hoveredItemName, setHoveredItemName] = useState(null);
    const numberedQuadrantItems = items.filter(item => item.quadrant === quadrantIndex).map((item, index) => ({ ...item, number: index + 1 }));

    return (
        <motion.div ref={ref} key="detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '80px', width: '100%', padding: '0 5%' }}>
            <div style={{ width: viewSize, height: viewSize, flexShrink: 0 }}>
                <svg width={viewSize} height={viewSize}>
                    <g transform={transform}>
                        <RadarGraphic size={fullRadarSize} items={numberedQuadrantItems} coordinates={coordinates} settings={settings} hoveredItemName={hoveredItemName} setHoveredItemName={setHoveredItemName} />
                    </g>
                </svg>
            </div>
            <div style={{ color: settings.colors.text, minWidth: "350px", maxWidth: '500px', maxHeight: '60vh', overflowY: 'auto' }}>
                <h2 style={{ color: selectedColor, marginTop: 0, marginBottom: '30px', fontSize: '24px' }}>{selectedQuadrantData}</h2>
                {settings.rings.slice().reverse().map((ringName, ringIdxRev) => {
                    const ringIdx = settings.rings.length - 1 - ringIdxRev;
                    const itemsInRing = numberedQuadrantItems.filter(item => item.ring === ringIdx);
                    if (itemsInRing.length === 0) return null;
                    return (
                        <div key={ringName} style={{ marginBottom: "20px" }}>
                            <h3 style={{ borderBottom: "1px solid #555", paddingBottom: "8px", marginBottom: "12px" }}>{ringName}</h3>
                            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                                {itemsInRing.sort((a, b) => a.name.localeCompare(b.name)).map((item) => {
                                    const isHovered = item.name === hoveredItemName;
                                    const liStyle = { marginBottom: "10px", display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', borderRadius: '4px', transition: 'background-color 0.2s ease', backgroundColor: isHovered ? `${selectedColor}40` : 'transparent', color: '#ddd' };
                                    return (
                                        <li key={item.name} style={liStyle} onMouseEnter={() => setHoveredItemName(item.name)} onMouseLeave={() => setHoveredItemName(null)}>
                                            <span>{item.number}. {item.name}</span>
                                            <OwnersDropdown owners={item.owners} />
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
});

const FullRadarView = React.forwardRef(({ items, coordinates, onSelectQuadrant, settings }, ref) => {
    const size = 500;
    const center = size / 2;
    const [hoveredItemName, setHoveredItemName] = useState(null);
    const ringWidth = (settings.rings && settings.rings.length > 0) ? center / settings.rings.length : center;

    return (
        <motion.div ref={ref} key="full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <svg width={size} height={size}>
                <g onClick={(e) => { const circle = e.target.closest('g > g > g > circle'); if (circle && circle.dataset.quadrant) onSelectQuadrant(parseInt(circle.dataset.quadrant, 10)); }} style={{ cursor: 'pointer' }}>
                    <RadarGraphic size={size} items={items} coordinates={coordinates} settings={settings} hoveredItemName={hoveredItemName} setHoveredItemName={setHoveredItemName} />
                </g>
                <g style={{ pointerEvents: 'none' }}>
                    <line x1={0} y1={center} x2={size} y2={center} stroke={settings.colors.background} strokeWidth={10} />
                    <line x1={center} y1={0} x2={center} y2={size} stroke={settings.colors.background} strokeWidth={10} />
                    {settings.rings && settings.rings.slice().reverse().map((ring, i_rev) => {
                        const radius = (i_rev + 0.5) * ringWidth;
                        const textStyle = { fill: settings.colors.text, fontSize: "12px", fontWeight: "bold", textAnchor: "middle" };
                        return (
                            <React.Fragment key={ring}>
                                <text x={center + radius} y={center+5} style={textStyle}>{ring}</text>
                                <text x={center - radius} y={center+5} style={textStyle}>{ring}</text>
                            </React.Fragment>
                        );
                    })}
                </g>
            </svg>
        </motion.div>
    );
});

const Radar = () => {
    // Начальное "пустое" состояние
    const emptySettings = {
        title: "Конструктор тех радаров",
        logo: './src/assets/logo.svg',
        departments: [],
        quadrants: ["Квадрант 1", "Квадрант 2", "Квадрант 3", "Квадрант 4"],
        rings: ["Кольцо 1", "Кольцо 2", "Кольцо 3", "Кольцо 4"],
        colors: { background: "#2d2d2d", text: "#ffffff", rings: ["#4d4d4d", "#5b5b5b", "#696969", "#757575"], quadrants: ["#f48fb1", "#ffcc80", "#2979ff", "#b388ff"], departments: [], },
    };

    const testDataSettings = {
        title: "Конструктор тех радаров",
        logo: './src/assets/logo.svg',
        departments: ["Android", "IOS", "Frontend", "Backend", "PBI", "OKO"],
        quadrants: ["Инфраструктура и платформы", "Языки и Фреймворки", "Технологии и инструменты", "Управление данными"],
        rings: ["HOLD", "ASSESS", "TRIAL", "ADOPT"],
        colors: { background: "#2d2d2d", text: "#ffffff", rings: ["#4d4d4d", "#5b5b5b", "#696969", "#757575"], quadrants: ["#f48fb1", "#ffcc80", "#2979ff", "#b388ff"], departments: ["#f48fb1", "#ffcc80", "#2979ff", "#b388ff", "#0097a7", "#77FFA5"], },
    };

    const [settings, setSettings] = useState(emptySettings);
    const [savedStyles, setSavedStyles] = useState([{ id: 'test-data-default', name: 'Тестовый', settings: testDataSettings, isDefault: true }]);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [allRadarItems, setAllRadarItems] = useState([]);
    const [allEmployees, setAllEmployees] = useState([]);
    const [currentItems, setCurrentItems] = useState([]);
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [selectedQuadrant, setSelectedQuadrant] = useState(null);
    const [coordinates, setCoordinates] = useState({});
    const mainContentRef = useRef(null);
    const [notification, setNotification] = useState(null);
    const [hoverStates, setHoverStates] = useState({});

    const showAlert = (message) => setNotification({ type: 'alert', message });
    const showConfirm = (message, onConfirm) => setNotification({ type: 'confirm', message, onConfirm });

    const fetchAndProcessTestData = async (targetSettings) => {
        try {
            const response = await fetch('./src/assets/radar_data.xlsx');
            if (!response.ok) throw new Error("Could not fetch radar_data.xlsx");
            const arrayBuffer = await response.arrayBuffer();
            
            const wb = XLSX.read(arrayBuffer, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws);
            const loadedItems = rows.map(row => ({
                department: row.Department, name: row.Name,
                quadrant: targetSettings.quadrants.indexOf(row.Quadrant),
                ring: targetSettings.rings.indexOf(row.Ring),
                owners: row.Owners ? String(row.Owners).split(',').map(name => name.trim()) : []
            })).filter(item => item.name && item.department && item.quadrant !== -1 && item.ring !== -1);
            
            setAllRadarItems(loadedItems);
            
            const uniqueEmployees = new Set();
            loadedItems.forEach(item => item.owners.forEach(owner => uniqueEmployees.add(owner)));
            setAllEmployees(Array.from(uniqueEmployees).sort());
            showAlert("Тестовые данные загружены.");
        } catch (error) {
            console.error("Ошибка обработки XLSX файла:", error);
            showAlert("Ошибка при обработке файла XLSX. Проверьте структуру файла.");
        }
    };

    const loadTestData = () => {
        setSettings(testDataSettings);
        fetchAndProcessTestData(testDataSettings);
        setSelectedDepartment(null);
        setSelectedQuadrant(null);
    };

    const handleReset = () => {
        showConfirm(
            "Сбросить все настройки и данные (кроме сохраненных радаров)? Это действие вернет радар в исходное пустое состояние.",
            () => {
                setSettings(emptySettings);
                setAllRadarItems([]);
                setAllEmployees([]);
                setSelectedDepartment(null);
                setSelectedQuadrant(null);
                showAlert("Радар сброшен в исходное состояние.");
            }
        );
    };

    useEffect(() => {
        try {
            const storedStyles = localStorage.getItem('techRadarStyles');
            if (storedStyles) {
                const parsedStyles = JSON.parse(storedStyles);
                setSavedStyles(parsedStyles);
            }
        } catch (e) { console.error("Ошибка загрузки стилей из localStorage", e); }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('techRadarStyles', JSON.stringify(savedStyles));
        } catch (e) { console.error("Ошибка сохранения стилей в localStorage", e); }
    }, [savedStyles]);

    useEffect(() => {
        if (selectedDepartment !== null && settings.departments.length > 0) {
            setCurrentItems(allRadarItems.filter(item => item.department === settings.departments[selectedDepartment]));
        } else {
            setCurrentItems([]);
        }
        setSelectedQuadrant(null);
    }, [selectedDepartment, allRadarItems, settings.departments]);

    useEffect(() => {
        const fullRadarSize = 500;
        const center = fullRadarSize / 2;
        const ringWidth = (settings.rings && settings.rings.length > 0) ? center / settings.rings.length : center;
        const blipRadius = 7;
        const minCenterDistanceSq = (blipRadius * 2.5) ** 2;

        const getDistanceSq = (p1, p2) => (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;

        const coords = {};
        const itemsBySector = currentItems.reduce((acc, item) => {
            const key = `${item.quadrant}-${item.ring}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(item);
            return acc;
        }, {});

        for (const sectorKey in itemsBySector) {
            const itemsInSector = itemsBySector[sectorKey];
            const [quadrant, ring] = sectorKey.split('-').map(Number);
            const ringIndex = settings.rings.length - 1 - ring;
            const sectorPlacedCoords = [];

            itemsInSector.forEach(item => {
                let attempts = 0; let newCoord; let isTooClose;
                do {
                    const minRadiusForRing = ringIndex * ringWidth;
                    const radiusPadding = blipRadius + 8;
                    const angleRanges = [
                        { start: Math.PI, end: (3 * Math.PI) / 2 },
                        { start: (3 * Math.PI) / 2, end: 2 * Math.PI },
                        { start: 0, end: Math.PI / 2 },
                        { start: Math.PI / 2, end: Math.PI },
                    ];
                    if (quadrant >= angleRanges.length) continue;
                    const { start, end } = angleRanges[quadrant];
                    const anglePadding = 7 * (Math.PI / 180);
                    const angleRange = (end - start) - 2 * anglePadding;
                    const angle = start + anglePadding + Math.random() * Math.max(0, angleRange);
                    
                    const minRadius = minRadiusForRing + radiusPadding;
                    const maxRadius = (ringIndex + 1) * ringWidth - radiusPadding;
                    const radius = minRadius + Math.random() * Math.max(0, maxRadius - minRadius);

                    newCoord = { x: center + radius * Math.cos(angle), y: center + radius * Math.sin(angle) };
                    isTooClose = sectorPlacedCoords.some((placed) => getDistanceSq(newCoord, placed) < minCenterDistanceSq);
                    attempts++;
                } while (isTooClose && attempts < 200);
                coords[item.name] = newCoord;
                sectorPlacedCoords.push(newCoord);
            });
        }
        setCoordinates(coords);
    }, [currentItems, settings.rings, settings.quadrants]);


    return (
        <div style={{ minHeight: "100vh", backgroundColor: settings.colors.background, color: settings.colors.text, display: "flex", flexDirection: "column", fontFamily: "sans-serif" }}>
            <style>{`
                input, select, button { outline: none; }
                input::placeholder { color: #ddd; opacity: 0.7; }
                .header-btn {
                    background: #444;
                    color: #ddd;
                    border: none;
                    border-radius: 4px;
                    padding: 8px 16px;
                    cursor: pointer;
                    font-weight: bold;
                    transition: all 0.2s ease-in-out;
                }
                .header-btn:hover {
                    background-color: #555;
                    color: #fff;
                    transform: scale(1.05);
                }
                .settings-gear-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease-in-out;
                }
                .settings-gear-btn:hover {
                    background-color: rgba(255,255,255,0.1);
                    transform: scale(1.1) rotate(15deg);
                }
            `}</style>
            <NotificationPopup notification={notification} clearNotification={() => setNotification(null)} />

            <header style={{ backgroundColor: "#333333", color: "white", padding: "0 5%", display: "flex", justifyContent: "space-between", alignItems: "center", height: "60px", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <img src={settings.logo} alt="Logo" style={{ width: "24px", height: "24px" }} />
                    <span style={{ fontSize: "20px", fontWeight: "bold" }}>{settings.title}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <button onClick={loadTestData} className="header-btn">
                        Тестовые данные
                    </button>
                    <button onClick={() => setIsSettingsOpen(true)} className="settings-gear-btn">
                        <img src='./src/assets/Settings.svg' alt="Settings" style={{ width: 24, height: 24 }} />
                    </button>
                </div>
            </header>

            <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "16px", padding: "30px 30px 15px" }}>
                {settings.departments.map((q, i) => (<button key={i} onClick={() => setSelectedDepartment(selectedDepartment === i ? null : i)} style={{ backgroundColor: selectedDepartment === i ? settings.colors.departments[i] : "#333333", color: selectedDepartment === i ? '#333' : (hoverStates[`dep-${i}`] ? '#fff' : '#ddd'), border: "none", padding: "10px 20px", fontWeight: "600", maxWidth: "220px", fontSize: "14px", cursor: "pointer", transition: "all 0.3s ease", borderRadius: "4px", transform: hoverStates[`dep-${i}`] ? 'scale(1.05)' : 'scale(1)' }} onMouseEnter={()=>setHoverStates({[`dep-${i}`]: true})} onMouseLeave={()=>setHoverStates({})}>{q}</button>))}
            </div>

            {selectedDepartment !== null && (
                <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "16px", padding: "15px 30px 30px" }}>
                    {settings.quadrants.map((q, i) => (<button key={i} onClick={() => setSelectedQuadrant(selectedQuadrant === i ? null : i)} style={{ backgroundColor: selectedQuadrant === i ? settings.colors.quadrants[i] : "#333333", color: selectedQuadrant === i ? '#333' : (hoverStates[`quad-${i}`] ? '#fff' : '#ddd'), border: "none", padding: "10px 20px", fontWeight: "600", minWidth: "240px", fontSize: "14px", cursor: "pointer", transition: "all 0.3s ease", borderRadius: "4px", transform: hoverStates[`quad-${i}`] ? 'scale(1.05)' : 'scale(1)' }} onMouseEnter={()=>setHoverStates({[`quad-${i}`]: true})} onMouseLeave={()=>setHoverStates({})}>{q}</button>))}
                </div>
            )}

            <main ref={mainContentRef} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1, padding: '10px', overflow: 'hidden' }}>
                <AnimatePresence mode="wait">
                    {selectedDepartment === null ? <HomeScreenView key="home" settings={settings} isInitialEmpty={allRadarItems.length === 0 && settings.departments.length === 0} />
                        : selectedQuadrant === null ? <FullRadarView key="full" items={currentItems} coordinates={coordinates} onSelectQuadrant={(i) => setSelectedQuadrant(i)} settings={settings} />
                            : <QuadrantDetailView key="detail" quadrantIndex={selectedQuadrant} items={currentItems} coordinates={coordinates} settings={settings} />}
                </AnimatePresence>
            </main>

            <SettingsOverlay 
                isOpen={isSettingsOpen} 
                onClose={() => setIsSettingsOpen(false)} 
                settings={settings} 
                setSettings={setSettings} 
                allEmployees={allEmployees} 
                setAllEmployees={setAllEmployees} 
                allRadarItems={allRadarItems} 
                setAllRadarItems={setAllRadarItems} 
                resetSettingsToEmpty={handleReset} 
                showAlert={showAlert} 
                showConfirm={showConfirm} 
                savedStyles={savedStyles}
                setSavedStyles={setSavedStyles}
            />
        </div>
    );
};

export default Radar;