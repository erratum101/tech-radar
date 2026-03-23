import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { importStyleFromXLSX, exportRadarDataToXLSX } from '../utils/xlsxUtils';
import { getRadarRingColor } from '../utils/radarRingColors';
import ElementEditor from './ElementEditor';
import InlineForm from './InlineForm';

import '../styles/SettingsOverlay.css';

const SettingsOverlay = ({
    isOpen, onClose, settings, setSettings,
    uiTheme, setUiTheme,
    allEmployees, setAllEmployees, allRadarItems, setAllRadarItems,
    resetSettingsToEmpty, showAlert, showConfirm,
    savedStyles, setSavedStyles
}) => {
    const [activeTab, setActiveTab] = useState('colors');
    const [editingItem, setEditingItem] = useState(null);
    const [editingKey, setEditingKey] = useState(null);
    const [isAdding, setIsAdding] = useState({ department: false, employee: false });
    const [isAddingStyle, setIsAddingStyle] = useState(false);
    const fileInputRef = useRef(null);
    const logoInputRef = useRef(null);
    
    const tabs = [
        { id: 'colors', label: 'Цвета и Иконки', iconSrc: '/assets/Colors.svg' },
        { id: 'names', label: 'Названия', iconSrc: '/assets/Name.svg' },
        { id: 'employees', label: 'Сотрудники', iconSrc: '/assets/Person.svg' },
        { id: 'elements', label: 'Элементы', iconSrc: '/assets/Elements.svg' },
        { id: 'styles', label: 'Радары', iconSrc: '/assets/upload.svg' }
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
        const newList = [...list];
        newList[index] = newName;
        setSettings(prev => ({ ...prev, [key]: newList }));
        if (key === 'departments') {
            setAllRadarItems(prevItems => prevItems.map(item => item.department === oldName ? { ...item, department: newName } : item));
        }
        setEditingKey(null);
    };

    const handleEmployeeUpdate = (index, newName) => {
        const oldName = allEmployees[index];
        setAllEmployees(prev => prev.map((item, i) => (i === index ? newName : item)).sort());
        setAllRadarItems(prevItems => prevItems.map(item => ({ ...item, owners: item.owners.map(owner => owner === oldName ? newName : owner) })));
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
            if (settings.departments.length >= 10) {
                showAlert("Можно добавить не более 10 отделов.");
                setIsAdding({ ...isAdding, department: false });
                return;
            }
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
        } catch (error){
            showAlert(String(error));
        }
        e.target.value = null;
    };


    const renderContent = () => {
        switch (activeTab) {
            case 'colors':
                return (
                    <div>
                        <h3>Настройки Цвета и Иконок</h3>
                        <div className="settings-section colors-grid">
                            <div className="color-picker-group logo-upload-row">
                                <div className="logo-upload-control">
                                    <button type="button" className="logo-upload-btn" onClick={() => logoInputRef.current?.click()} title="Выбрать логотип">
                                        <img src="/assets/upload.svg" alt="Upload logo" className="logo-upload-icon" />
                                        <span className="logo-upload-plus">+</span>
                                    </button>
                                    <input ref={logoInputRef} type="file" accept="image/*" onChange={handleIconUpload} style={{ display: 'none' }} />
                                </div>
                                <span className="color-picker-name">Логотип</span>
                            </div>
                            <div className="color-picker-group theme-toggle-row">
                                <button
                                    type="button"
                                    className={`theme-switch ${uiTheme === 'dark' ? 'dark' : ''}`}
                                    onClick={() => setUiTheme(uiTheme === 'dark' ? 'light' : 'dark')}
                                    aria-label="Переключить тему"
                                >
                                    <span className="theme-switch-thumb" />
                                </button>
                                <span className="color-picker-name">
                                    {uiTheme === 'dark' ? 'Темная тема' : 'Светлая тема'}
                                </span>
                            </div>
                            <div className="color-picker-group primary-color-picker">
                                <input
                                    type="color"
                                    className="settings-color-input"
                                    value={settings.colors.background}
                                    onChange={(e) => handleSettingChange('colors', { ...settings.colors, background: e.target.value })}
                                />
                                <span className="color-picker-name">Цвет фона</span>
                            </div>
                            <div className="color-picker-group primary-color-picker">
                                <input
                                    type="color"
                                    className="settings-color-input"
                                    value={settings.colors.text}
                                    onChange={(e) => handleSettingChange('colors', { ...settings.colors, text: e.target.value })}
                                />
                                <span className="color-picker-name">Основной цвет шрифта</span>
                            </div>
                        </div>
                        {['rings', 'quadrants', 'departments'].map(type => (
                            <div key={type} className="settings-section">
                                <h4>Цвета {type === 'rings' ? 'колец' : type === 'quadrants' ? 'квадрантов' : 'отделов'}</h4>
                                <div className={`color-picker-grid ${type === 'rings' ? 'rings-color-grid' : ''}`}>
                                    {settings[type]?.map((name, index) => (
                                        <div key={index} className="color-picker-group">
                                            <input
                                                type="color"
                                                className="settings-color-input"
                                                value={settings.colors[type]?.[index] || '#cccccc'}
                                                onChange={(e) => handleColorChange(type, index, e.target.value)}
                                            />
                                            <span className="color-picker-name">{name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                );
            case 'names':
                return (
                    <>
                        <div className="settings-section">
                            <h4 style={{marginBottom: '10px'}}>Заголовок Радара</h4>
                            <div className="settings-list-item">
                                {editingKey === 'radarTitle' ?
                                    <InlineForm
                                        initialValue={settings.radarTitle || ''}
                                        onConfirm={(newValue) => { handleSettingChange('radarTitle', newValue); setEditingKey(null); }}
                                        onCancel={() => setEditingKey(null)}
                                        placeholder="Введите заголовок"
                                    /> :
                                    <>
                                        <span>{settings.radarTitle || 'Название радара не задано'}</span>
                                        <button onClick={() => setEditingKey('radarTitle')} className="settings-icon-btn"><img src='/assets/Edit.svg' alt="Edit" /></button>
                                    </>
                                }
                            </div>
                        </div>

                        {['departments', 'quadrants', 'rings'].map(key => (
                            <div key={key} className="settings-section">
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: '10px' }}>
                                    <h4>{key === 'departments' ? 'Отделы' : key === 'quadrants' ? 'Квадранты' : 'Кольца'}</h4>
                                    {key === 'departments' && 
                                        <button 
                                            onClick={() => setIsAdding({ ...isAdding, department: true })} 
                                            className="settings-add-btn" 
                                            disabled={isAdding.department || settings.departments.length >= 10}>
                                            Добавить
                                        </button>
                                    }
                                </div>
                                {isAdding.department && key === 'departments' && <div className="settings-list-item"><InlineForm onConfirm={(name) => handleAddItem('departments', name)} onCancel={() => setIsAdding({ ...isAdding, department: false })} placeholder="Новый отдел" listToCheck={settings.departments} /></div>}
                                {settings[key]?.map((name, index) => (
                                    <div key={index} className="settings-list-item">
                                        {editingKey === `${key}-${index}` ?
                                            <InlineForm initialValue={name} onConfirm={(newName) => handleListUpdate(key, index, newName)} onCancel={() => setEditingKey(null)} listToCheck={settings[key]} /> :
                                            <>
                                                <span>{name}</span>
                                                <div>
                                                    <button onClick={() => setEditingKey(`${key}-${index}`)} className="settings-icon-btn"><img src='/assets/Edit.svg' alt="Edit" /></button>
                                                    {key === 'departments' && <button onClick={() => handleListRemove(key, index, name)} className="settings-icon-btn"><img src='/assets/X.svg' alt="Delete" /></button>}
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
                    <div className="settings-section">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: '10px' }}>
                            <h3>Управление сотрудниками</h3>
                            <button onClick={() => setIsAdding({ ...isAdding, employee: true })} className="settings-add-btn" disabled={isAdding.employee}>Добавить</button>
                        </div>
                        {isAdding.employee && <div className="settings-list-item"><InlineForm onConfirm={(name) => handleAddItem('employees', name)} onCancel={() => setIsAdding({ ...isAdding, employee: false })} placeholder="Новый сотрудник" listToCheck={allEmployees} /></div>}
                        {allEmployees.map((emp, index) => (
                            <div key={emp} className="settings-list-item">
                                {editingKey === `employee-${index}` ?
                                    <InlineForm initialValue={emp} onConfirm={(newName) => handleEmployeeUpdate(index, newName)} onCancel={() => setEditingKey(null)} listToCheck={allEmployees} /> :
                                    <>
                                        <span>{emp}</span>
                                        <div>
                                            <button onClick={() => setEditingKey(`employee-${index}`)} className="settings-icon-btn"><img src='/assets/Edit.svg' alt="Edit" /></button>
                                            <button onClick={() => handleListRemove('employees', index, emp)} className="settings-icon-btn"><img src='/assets/X.svg' alt="Delete" /></button>
                                        </div>
                                    </>
                                }
                            </div>
                        ))}
                    </div>
                 );
            case 'elements':
                if (editingItem) return <ElementEditor item={editingItem} settings={settings} allEmployees={allEmployees} allRadarItems={allRadarItems} onSave={handleSaveRadarItem} onCancel={() => setEditingItem(null)} showAlert={showAlert} />;
                return (
                    <div className="settings-section settings-section--radar-elements">
                        <div className="settings-section-head">
                            <div>
                                <h3 className="settings-section-head__title">Управление элементами радара</h3>
                                <p className="settings-section-head__hint">Технологии на диаграмме: отдел, зона и кольцо</p>
                            </div>
                            <button type="button" onClick={handleAddRadarItem} className="settings-add-btn">Добавить</button>
                        </div>
                        <div className="settings-radar-list">
                            {allRadarItems.map((item, index) => {
                                const deptIdx = settings.departments.indexOf(item.department);
                                const deptColor = deptIdx >= 0 ? settings.colors.departments[deptIdx] : settings.colors.text;
                                const quadColor = settings.colors.quadrants[item.quadrant] ?? settings.colors.text;
                                const ringColor = getRadarRingColor(uiTheme, item.ring);
                                return (
                                    <article key={`${item.name}-${index}`} className="settings-radar-card">
                                        <header className="settings-radar-card__header">
                                            <h4 className="settings-radar-card__title">{item.name}</h4>
                                            <div className="settings-radar-card__actions">
                                                <button type="button" onClick={() => setEditingItem({ ...item, index, isNew: false })} className="settings-icon-btn settings-icon-btn--card" title="Изменить">
                                                    <img src="/assets/Edit.svg" alt="" />
                                                </button>
                                                <button type="button" onClick={() => handleDeleteRadarItem(index)} className="settings-icon-btn settings-icon-btn--card settings-icon-btn--danger" title="Удалить">
                                                    <img src="/assets/X.svg" alt="" />
                                                </button>
                                            </div>
                                        </header>
                                        <div className="settings-radar-card__badges">
                                            <span
                                                className="settings-badge settings-badge--tint"
                                                style={{ '--badge-color': deptColor }}
                                            >
                                                {item.department}
                                            </span>
                                            <span
                                                className="settings-badge settings-badge--tint"
                                                style={{ '--badge-color': quadColor }}
                                            >
                                                {settings.quadrants[item.quadrant]}
                                            </span>
                                            <span
                                                className="settings-badge settings-badge--ring"
                                                style={{
                                                    '--badge-color': ringColor,
                                                    '--app-bg': settings.colors.background,
                                                    color: settings.colors.text,
                                                }}
                                            >
                                                {settings.rings[item.ring]}
                                            </span>
                                        </div>
                                        {item.owners?.length > 0 && (
                                            <footer className="settings-radar-card__owners">
                                                <span className="settings-radar-card__owners-label">Используют</span>
                                                <p className="settings-radar-card__owners-text">{item.owners.join(', ')}</p>
                                            </footer>
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                );
            case 'styles':
                 return (
                    <div className="settings-section">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: '10px' }}>
                            <h3>Управление радарами</h3>
                            <button onClick={() => fileInputRef.current?.click()} className="settings-add-btn">Загрузить из файла</button>
                            <input type="file" ref={fileInputRef} onChange={handleUploadStyleFile} accept=".xlsx" style={{ display: 'none' }} />
                        </div>
                        {isAddingStyle && (
                            <div className="settings-list-item" style={{ marginTop: '10px' }}>
                                <InlineForm placeholder="Название нового радара" listToCheck={savedStyles.map(s => s.name)} onConfirm={confirmSaveNewStyle} onCancel={() => setIsAddingStyle(false)} />
                            </div>
                        )}
                        {savedStyles.map((style) => (
                            <div key={style.id} className="settings-list-item">
                                {editingKey === style.id ? (
                                    <InlineForm initialValue={style.name} onConfirm={(newName) => handleRenameStyle(style.id, newName)} onCancel={() => setEditingKey(null)} listToCheck={savedStyles.map(s => s.name)} />
                                ) : (
                                    <>
                                        <span style={{ fontWeight: style.isDefault ? 'bold' : 'normal' }}>{style.name}</span>
                                        <div className="style-list-buttons">
                                            <button onClick={() => handleApplyStyle(style)} className="settings-add-btn style-list-btn apply">Применить</button>
                                            <button onClick={() => exportRadarDataToXLSX(style, allRadarItems, allEmployees)} className="settings-add-btn style-list-btn download">Скачать</button>
                                            {!style.isDefault && (
                                                <>
                                                    <button onClick={() => setEditingKey(style.id)} className="settings-icon-btn"><img src='/assets/Edit.svg' alt="Rename" /></button>
                                                    <button onClick={() => handleDeleteStyle(style)} className="settings-icon-btn"><img src='/assets/X.svg' alt="Delete" /></button>
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
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="settings-overlay" onClick={onClose}>
                    <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="settings-container" onClick={e => e.stopPropagation()}>
                        <nav className="settings-nav">
                            <div className="settings-nav-scroll">
                                <h2 className="settings-nav-title">Настройки</h2>
                                {tabs.map(tab => (
                                    <button 
                                        key={tab.id} 
                                        onClick={() => { setActiveTab(tab.id); setEditingItem(null); setEditingKey(null); setIsAddingStyle(false); }} 
                                        className={`settings-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                                    >
                                        <span className="settings-tab-icon-wrapper">
                                            <img src={tab.iconSrc} alt="" className="settings-tab-icon" />
                                        </span>
                                        <span>{tab.label}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="settings-nav-footer">
                                <button onClick={handleSaveCurrentStyle} className="settings-footer-btn">Сохранить текущий</button>
                                <button onClick={resetSettingsToEmpty} className="settings-footer-btn">Сбросить всё</button>
                            </div>
                        </nav>
                        <div className="settings-content-wrapper">
                            <button onClick={onClose} className="settings-close-btn">×</button>
                            <div className="settings-content-scroll">{renderContent()}</div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SettingsOverlay;