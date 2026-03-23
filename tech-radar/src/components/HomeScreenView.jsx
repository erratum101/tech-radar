import React from 'react';
import { motion } from 'framer-motion';
import '../styles/App.css';

const HomeScreenView = ({ settings, isInitialEmpty }) => (
    <motion.div 
        key="home" 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="home-view"
    >
        {isInitialEmpty ? (
            <div className="home-view-card">
                <h2 className="home-view-title">
                    Добро пожаловать в {settings.radarTitle || 'конструктор радаров'}!
                </h2>
                <p className="home-view-text">
                    Для начала работы вы можете:
                    <br/>- Нажать <strong>"Тестовые данные"</strong>, чтобы загрузить пример.
                    <br/>- Открыть <strong>настройки (⚙️)</strong>, чтобы создать свой радар с нуля.
                </p>
            </div>
        ) : (
            <div className="home-view-hint">
                 Выберите отдел
            </div>
        )}
    </motion.div>
);

export default HomeScreenView;