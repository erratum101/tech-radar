import React, { useState, useEffect, useRef, useCallback } from "react";
import * as XLSX from 'xlsx';
import LZString from 'lz-string';
import pako from 'pako';
import { encode as encodeMsgPack, decode as decodeMsgPack } from '@msgpack/msgpack';
import { AnimatePresence } from "framer-motion";

import './styles/App.css';

import NotificationPopup from "./components/NotificationPopup";
import SettingsOverlay from "./components/SettingsOverlay";
import HomeScreenView from "./components/HomeScreenView";
import FullRadarView from "./components/FullRadarView";
import QuadrantDetailView from "./components/QuadrantDetailView";

const SHARE_QUERY_PARAM = 'radar';

/** Короткая ссылка: радар хранится на сервере, в URL только id после префикса */
const SHARE_SRV_PREFIX = 'srv:';

/** Префикс для gzip+msgpack (символ не из base64url) */
const SHARE_MSGPACK_PREFIX = '!';

/** База URL для API шаринга: пусто = тот же origin (прокси Vite в dev, nginx в prod) */
const shareApiBase = () => (import.meta.env.VITE_SHARE_API_BASE ?? '').replace(/\/$/, '');

/** База деплоя Vite (`/` или `/my-app/`) — чтобы логотип и ассеты работали на хостинге и по подпути */
const BASE_PATH = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

/** В ссылке храним путь от корня сайта без префикса деплоя — коллега откроет на том же хосте с любым base */
const logoPathForShare = (settingsLogo) => {
    let logo =
        typeof settingsLogo === 'string' && settingsLogo.startsWith('data:')
            ? '/assets/logo.svg'
            : settingsLogo;
    if (typeof logo !== 'string') return '/assets/logo.svg';
    if (logo.startsWith('http://') || logo.startsWith('https://')) {
        try {
            const u = new URL(logo);
            logo = u.pathname + (u.search || '');
        } catch {
            return '/assets/logo.svg';
        }
    }
    if (BASE_PATH && logo.startsWith(BASE_PATH)) {
        logo = logo.slice(BASE_PATH.length) || '/assets/logo.svg';
    }
    return logo.startsWith('/') ? logo : `/${logo}`;
};

/** После открытия ссылки подставляем base текущего деплоя (GitHub Pages / подпапка и т.д.) */
const normalizeLogoForDeployment = (logo) => {
    if (typeof logo !== 'string' || logo.startsWith('data:')) return logo;
    if (logo.startsWith('http://') || logo.startsWith('https://')) {
        try {
            const u = new URL(logo);
            if (u.origin === window.location.origin) {
                return normalizeLogoForDeployment(u.pathname + (u.search || ''));
            }
            return logo;
        } catch {
            return logo;
        }
    }
    let path = logo.startsWith('/') ? logo : `/${logo}`;
    if (BASE_PATH && BASE_PATH !== '/' && !path.startsWith(BASE_PATH)) {
        return `${BASE_PATH}${path}`;
    }
    return path;
};

const toBase64Url = (bytes) => {
    let binary = '';
    bytes.forEach((b) => { binary += String.fromCharCode(b); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const fromBase64Url = (encoded) => {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`;
    const binary = atob(padded);
    return Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
};

const isGzipBytes = (bytes) => bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;

/** v5: индекс отдела + словарь владельцев (без повторения имён); без длинного data:logo */
const buildSharePayload = (settings, allRadarItems, uiTheme) => {
    const s = { ...settings, logo: logoPathForShare(settings.logo) };
    const people = [];
    const peopleIndex = new Map();
    const addPerson = (name) => {
        const n = String(name).trim();
        if (!n) return;
        if (!peopleIndex.has(n)) {
            peopleIndex.set(n, people.length);
            people.push(n);
        }
    };
    allRadarItems.forEach((i) => (i.owners || []).forEach(addPerson));
    const t = allRadarItems.map((i) => {
        const deptIdx = settings.departments.indexOf(i.department);
        const ownerIds = (i.owners || [])
            .map((o) => peopleIndex.get(String(o).trim()))
            .filter((x) => x !== undefined);
        return [i.name, deptIdx >= 0 ? deptIdx : i.department, i.quadrant, i.ring, ownerIds];
    });
    return { v: 5, s, u: uiTheme, p: people, t };
};

const parseSharedPayload = (data) => {
    if (data && data.v === 5 && data.s && Array.isArray(data.p) && Array.isArray(data.t)) {
        const depts = data.s.departments || [];
        const people = data.p;
        return {
            settings: data.s,
            allRadarItems: data.t.map((row) => {
                const [name, deptOrIdx, quadrant, ring, ownerIds] = row;
                const department =
                    typeof deptOrIdx === 'number' && depts[deptOrIdx] !== undefined
                        ? depts[deptOrIdx]
                        : String(deptOrIdx);
                const owners = (ownerIds || [])
                    .map((id) => people[id])
                    .filter((n) => n != null && String(n).trim() !== '');
                return { name, department, quadrant, ring, owners };
            }),
            uiTheme: data.u,
        };
    }
    if (data && (data.v === 3 || data.v === 4) && data.s && Array.isArray(data.t)) {
        const depts = data.s.departments || [];
        return {
            settings: data.s,
            allRadarItems: data.t.map((row) => {
                const [name, deptOrIdx, quadrant, ring, owners] = row;
                const department =
                    typeof deptOrIdx === 'number' && depts[deptOrIdx] !== undefined
                        ? depts[deptOrIdx]
                        : String(deptOrIdx);
                return {
                    name,
                    department,
                    quadrant,
                    ring,
                    owners: owners || [],
                };
            }),
            uiTheme: data.u,
        };
    }
    return data;
};

const pickShortest = (candidates) => candidates.reduce((a, b) => (b.length < a.length ? b : a));

/** gzip + msgpack обычно заметно короче gzip+json; сравниваем с LZ. */
const encodeSharePayload = (settings, allRadarItems, uiTheme) => {
    const payload = buildSharePayload(settings, allRadarItems, uiTheme);
    const json = JSON.stringify(payload);
    const utf8 = new TextEncoder().encode(json);
    const gzJson = pako.gzip(utf8, { level: 9 });
    const gzipJsonB64 = toBase64Url(gzJson);

    const mp = encodeMsgPack(payload);
    const gzMp = pako.gzip(mp, { level: 9 });
    const gzipMpB64 = `${SHARE_MSGPACK_PREFIX}${toBase64Url(gzMp)}`;

    const lzEncoded = `lz${LZString.compressToEncodedURIComponent(json)}`;

    return pickShortest([gzipJsonB64, gzipMpB64, lzEncoded]);
};

const decodeSharePayload = (encoded) => {
    if (!encoded) return null;
    if (encoded.startsWith('lz')) {
        const json = LZString.decompressFromEncodedURIComponent(encoded.slice(2));
        if (!json) throw new Error('Не удалось распаковать ссылку (LZ)');
        const data = JSON.parse(json);
        return parseSharedPayload(data);
    }
    if (encoded.startsWith(SHARE_MSGPACK_PREFIX)) {
        const bytes = fromBase64Url(encoded.slice(SHARE_MSGPACK_PREFIX.length));
        const rawBytes = isGzipBytes(bytes) ? pako.ungzip(bytes) : bytes;
        const data = decodeMsgPack(rawBytes);
        return parseSharedPayload(data);
    }
    const bytes = fromBase64Url(encoded);
    let rawBytes = bytes;
    if (isGzipBytes(bytes)) {
        try {
            rawBytes = pako.ungzip(bytes);
        } catch (e) {
            console.warn('Ошибка pako.ungzip, пробуем как сырой текст', e);
            rawBytes = bytes;
        }
    }
    const json = new TextDecoder().decode(rawBytes);
    const data = JSON.parse(json);
    return parseSharedPayload(data);
};

const getRadarParamFromLocation = () => {
    const hash = window.location.hash?.replace(/^#/, '') || '';
    const fromHash = new URLSearchParams(hash).get(SHARE_QUERY_PARAM);
    if (fromHash) return fromHash;
    return new URLSearchParams(window.location.search).get(SHARE_QUERY_PARAM);
};

/** Полный URL страницы с `#radar=…` — корректный origin/path для продакшена и подпути */
const buildShareUrlWithPayload = (encoded) => {
    const { origin, pathname, search } = window.location;
    const params = new URLSearchParams(search);
    params.delete(SHARE_QUERY_PARAM);
    const qs = params.toString();
    const basePage = `${origin}${pathname}${qs ? `?${qs}` : ''}`;
    const hashParams = new URLSearchParams();
    hashParams.set(SHARE_QUERY_PARAM, encoded);
    return `${basePage}#${hashParams.toString()}`;
};

const App = () => {
    const emptySettings = {
        radarTitle: "Конструктор тех радаров",
        logo: '/assets/logo.svg',
        departments: [],
        quadrants: ["Квадрант 1", "Квадрант 2", "Квадрант 3", "Квадрант 4"],
        rings: ["Кольцо 1", "Кольцо 2", "Кольцо 3", "Кольцо 4"],
        colors: {
            background: "#f7f8fa",
            text: "#1f2329",
            rings: ["#ffe18a", "#ffd45a", "#ffc42b", "#ffb400"],
            quadrants: ["#ffd37a", "#c0c0c0", "#9fe5b0", "#ffc89f"],
            departments: [],
        },
    };
    const testDataSettings = {
        radarTitle: "Конструктор тех радаров",
        logo: '/assets/logo.svg',
        departments: ["Android", "IOS", "Frontend", "Backend", "PBI", "OKO"],
        quadrants: ["Инфраструктура и платформы", "Языки и Фреймворки", "Технологии и инструменты", "Управление данными"],
        rings: ["HOLD", "ASSESS", "TRIAL", "ADOPT"],
        colors: {
            background: "#f7f8fa",
            text: "#1f2329",
            rings: ["#ffe18a", "#ffd45a", "#ffc42b", "#ffb400"],
            quadrants: ["#ffd37a", "#c0c0c0", "#9fe5b0", "#ffc89f"],
            departments: ["#ffbe2e", "#ffd060", "#a0a0a0", "#b8b8b8", "#86dba0", "#ffaf80"],
        },
    };
    const [hoveredQuadrant, setHoveredQuadrant] = useState(null);
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
    const [copyToast, setCopyToast] = useState(null);
    const [copyToastLeaving, setCopyToastLeaving] = useState(false);
    const toastTimerRef = useRef(null);
    const [uiTheme, setUiTheme] = useState(() => localStorage.getItem('techRadarUiTheme') || 'light');
    const showAlert = (message) => setNotification({ type: 'alert', message });
    const showCopyToast = (message) => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setCopyToastLeaving(false);
        setCopyToast(message);
        toastTimerRef.current = setTimeout(() => {
            setCopyToastLeaving(true);
            toastTimerRef.current = null;
        }, 1200);
    };

    const handleCopyToastAnimationEnd = (e) => {
        if (e.animationName !== 'app-toast-out') return;
        setCopyToast(null);
        setCopyToastLeaving(false);
    };
    const showConfirm = (message, onConfirm) => setNotification({ type: 'confirm', message, onConfirm });
    const hasRadarData = settings.departments.length > 0 || allRadarItems.length > 0;
    const fetchAndProcessTestData = async (targetSettings) => {
        try {
            const response = await fetch('/assets/radar_data.xlsx');
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
        localStorage.setItem('techRadarUiTheme', uiTheme);
    }, [uiTheme]);
    useEffect(() => () => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    }, []);

    const applySharedState = useCallback((sharedState) => {
        if (!sharedState?.settings) return false;
        setSettings({
            ...sharedState.settings,
            logo: normalizeLogoForDeployment(sharedState.settings.logo),
        });
        const parsedItems = Array.isArray(sharedState.allRadarItems) ? sharedState.allRadarItems : [];
        setAllRadarItems(parsedItems);
        const uniqueEmployees = new Set();
        parsedItems.forEach((item) => (item.owners || []).forEach((owner) => uniqueEmployees.add(owner)));
        setAllEmployees(Array.from(uniqueEmployees).sort());
        if (sharedState.uiTheme === 'dark' || sharedState.uiTheme === 'light') {
            setUiTheme(sharedState.uiTheme);
        }
        setSelectedDepartment(null);
        setSelectedQuadrant(null);
        setNotification({ type: 'alert', message: 'Радар загружен по ссылке.' });
        return true;
    }, []);

    const loadSharedRadarFromUrl = useCallback(async () => {
        const sharedValue = getRadarParamFromLocation();
        if (!sharedValue) return;

        if (sharedValue.startsWith(SHARE_SRV_PREFIX)) {
            const id = sharedValue.slice(SHARE_SRV_PREFIX.length).trim();
            if (!id) return;
            try {
                const base = shareApiBase();
                const res = await fetch(`${base}/api/radars/${encodeURIComponent(id)}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                const sharedState = parseSharedPayload(data);
                applySharedState(sharedState);
            } catch (error) {
                console.error('Ошибка загрузки радара с сервера:', error);
                setNotification({
                    type: 'alert',
                    message: 'Не удалось загрузить радар по ссылке (сервер недоступен или ссылка устарела).',
                });
            }
            return;
        }

        try {
            const sharedState = decodeSharePayload(sharedValue);
            applySharedState(sharedState);
        } catch (error) {
            console.error('Ошибка чтения shared-ссылки:', error);
            setNotification({ type: 'alert', message: 'Не удалось загрузить радар из ссылки.' });
        }
    }, [applySharedState]);

    useEffect(() => {
        void loadSharedRadarFromUrl();
        const onHashChange = () => {
            void loadSharedRadarFromUrl();
        };
        window.addEventListener('hashchange', onHashChange);
        return () => window.removeEventListener('hashchange', onHashChange);
    }, [loadSharedRadarFromUrl]);
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
        const axisMargin = blipRadius + 5; 
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
                let attempts = 0; let newCoord; let isTooClose; let isTooCloseToAxis;
                do {
                    const minRadiusForRing = ringIndex * ringWidth;
                    const radiusPadding = blipRadius + 8;
                    const angleRanges = [
                        { start: 1.5 * Math.PI, end: 2 * Math.PI }, 
                        { start: Math.PI, end: 1.5 * Math.PI },    
                        { start: 0.5 * Math.PI, end: Math.PI },   
                        { start: 0, end: 0.5 * Math.PI },        
                    ];
                    if (quadrant >= angleRanges.length) continue;
                    const { start, end } = angleRanges[quadrant];
                    const angle = start + Math.random() * (end - start);
                    const minRadius = minRadiusForRing + radiusPadding;
                    const maxRadius = (ringIndex + 1) * ringWidth - radiusPadding;
                    const radius = minRadius + Math.random() * Math.max(0, maxRadius - minRadius);
                    newCoord = { x: center + radius * Math.cos(angle), y: center + radius * Math.sin(angle) };
                    isTooClose = sectorPlacedCoords.some((placed) => getDistanceSq(newCoord, placed) < minCenterDistanceSq);
                    isTooCloseToAxis = Math.abs(newCoord.x - center) < axisMargin || Math.abs(newCoord.y - center) < axisMargin;
                    attempts++;
                } while ((isTooClose || isTooCloseToAxis) && attempts < 200);
                coords[item.name] = newCoord;
                sectorPlacedCoords.push(newCoord);
            });
        }
        setCoordinates(coords);
    }, [currentItems, settings.rings, settings.quadrants]);

    const copyTextToClipboard = async (text) => {
        if (window.isSecureContext && navigator.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (e) {
                console.warn('navigator.clipboard.writeText:', e);
            }
        }
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.setAttribute('readonly', '');
        textArea.style.position = 'fixed';
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.width = '1px';
        textArea.style.height = '1px';
        textArea.style.padding = '0';
        textArea.style.border = 'none';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        textArea.setSelectionRange(0, text.value.length);
        try {
            const ok = document.execCommand('copy');
            document.body.removeChild(textArea);
            return ok;
        } catch (e) {
            document.body.removeChild(textArea);
            console.warn('execCommand copy:', e);
            return false;
        }
    };

    const handleShareRadar = async () => {
        try {
            const payload = buildSharePayload(settings, allRadarItems, uiTheme);
            const base = shareApiBase();
            let shareUrl;

            try {
                const res = await fetch(`${base}/api/radars`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ payload }),
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data?.id) {
                        shareUrl = buildShareUrlWithPayload(`${SHARE_SRV_PREFIX}${data.id}`);
                    }
                }
            } catch (apiErr) {
                console.warn('Share API недоступен, используется длинная ссылка в URL', apiErr);
            }

            if (!shareUrl) {
                const encoded = encodeSharePayload(settings, allRadarItems, uiTheme);
                shareUrl = buildShareUrlWithPayload(encoded);
            }

            let copied = false;
            try {
                copied = await copyTextToClipboard(shareUrl);
            } catch (clipErr) {
                console.warn('Буфер обмена:', clipErr);
            }
            if (!copied) {
                window.prompt('Скопируйте ссылку (Ctrl+C и OK):', shareUrl);
                showAlert('Ссылка показана в окне — скопируйте её вручную.');
                return;
            }
            showCopyToast('Ссылка скопирована в буфер обмена');
        } catch (error) {
            console.error('Ошибка создания ссылки:', error);
            showAlert(`Не удалось создать ссылку: ${error?.message || 'ошибка'}`);
        }
    };
    

    return (
        <div className={`app-container theme-${uiTheme}`}>
            {copyToast && (
                <div
                    className={`app-copy-toast${copyToastLeaving ? ' app-copy-toast--leaving' : ''}`}
                    role="status"
                    aria-live="polite"
                    onAnimationEnd={handleCopyToastAnimationEnd}
                >
                    {copyToast}
                </div>
            )}
            <NotificationPopup notification={notification} clearNotification={() => setNotification(null)} />
            <header className="app-header">
                <div className="header-title">
                    <img src={settings.logo} alt="Logo" className="header-logo" />
                    <span className="header-title-text">{settings.radarTitle || 'Конструктор радаров'}</span>
                </div>
                <div className="header-controls">
                    <button type="button" onClick={loadTestData} className="header-btn">
                        Тестовые данные
                    </button>
                    {hasRadarData && (
                        <button
                            type="button"
                            onClick={handleShareRadar}
                            className="settings-gear-btn share-radar-btn"
                            title="Поделиться текущим радаром"
                            aria-label="Поделиться текущим радаром"
                        >
                            <svg className="share-radar-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M14 5H19V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M10 14L19 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M20 14V18C20 19.1 19.1 20 18 20H6C4.9 20 4 19.1 4 18V6C4 4.9 4.9 4 6 4H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    )}
                    <button type="button" onClick={() => setIsSettingsOpen(true)} className="settings-gear-btn">
                        <img src='/assets/Settings.svg' alt="Settings" className="settings-gear-icon" />
                    </button>
                </div>
            </header>
            <div className="department-buttons-container">
                {settings.departments.map((q, i) => (
                    <button 
                        key={i} 
                        onClick={() => setSelectedDepartment(selectedDepartment === i ? null : i)}
                        className="filter-button"
                        style={{
                            backgroundColor: selectedDepartment === i
                                ? settings.colors.departments[i]
                                : (uiTheme === 'dark' ? '#111111' : '#ffffff'),
                            color: selectedDepartment === i
                                ? '#111111'
                                : (uiTheme === 'dark' ? '#cccccc' : '#1f2329'),
                        }}
                    >
                        {q}
                    </button>
                ))}
            </div>
            {selectedDepartment !== null && (
                <div className="quadrant-buttons-container">
                    {settings.quadrants.map((q, i) => {
                        const isButtonActive = selectedQuadrant === i || hoveredQuadrant === i;
                        return (
                            <button 
                                key={i} 
                                onClick={() => setSelectedQuadrant(selectedQuadrant === i ? null : i)}
                                onMouseEnter={() => setHoveredQuadrant(i)}
                                onMouseLeave={() => setHoveredQuadrant(null)}
                                className="filter-button quadrant-btn"
                                style={{
                                    backgroundColor: isButtonActive
                                        ? settings.colors.quadrants[i]
                                        : (uiTheme === 'dark' ? '#111111' : '#ffffff'),
                                    color: isButtonActive
                                        ? '#111111'
                                        : (uiTheme === 'dark' ? '#cccccc' : '#1f2329'),
                                }}
                            >
                                {q}
                            </button>
                        );
                    })}
                </div>
            )}
            <main ref={mainContentRef} className="main-content">
                <AnimatePresence mode="wait">
                    {selectedDepartment === null 
                        ? <HomeScreenView key="home" settings={settings} isInitialEmpty={allRadarItems.length === 0 && settings.departments.length === 0} />
                        : selectedQuadrant === null 
                            ? <FullRadarView 
                                key="full" 
                                items={currentItems} 
                                coordinates={coordinates} 
                                onSelectQuadrant={(i) => setSelectedQuadrant(i)} 
                                settings={settings}
                                uiTheme={uiTheme}
                                hoveredQuadrant={hoveredQuadrant}
                                setHoveredQuadrant={setHoveredQuadrant}
                              />
                            : <QuadrantDetailView key="detail" quadrantIndex={selectedQuadrant} items={currentItems} coordinates={coordinates} settings={settings} uiTheme={uiTheme} />}
                </AnimatePresence>
            </main>
            <SettingsOverlay 
                isOpen={isSettingsOpen} 
                onClose={() => setIsSettingsOpen(false)} 
                uiTheme={uiTheme}
                setUiTheme={setUiTheme}
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

export default App;