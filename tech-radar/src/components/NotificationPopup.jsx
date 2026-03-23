import React from 'react';
import { motion } from 'framer-motion';
import '../styles/NotificationPopup.css';

const NotificationPopup = ({ notification, clearNotification }) => {
    if (!notification) return null;

    const { message, type, onConfirm } = notification;

    return (
        <motion.div
            className="notification-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="notification-content"
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
            >
                <p className="notification-message">{message}</p>
                <div className="notification-buttons">
                    {type === 'confirm' && (
                        <button
                            onClick={() => {
                                onConfirm();
                                clearNotification();
                            }}
                            className="notification-btn confirm"
                        >
                            Да
                        </button>
                    )}
                    <button
                        onClick={clearNotification}
                        className={`notification-btn ${type === 'confirm' ? 'cancel' : 'ok'}`}
                    >
                        {type === 'confirm' ? 'Нет' : 'OK'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default NotificationPopup;