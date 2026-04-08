import { useState } from 'react';

export const useModal = () => {
    const [modalConfig, setModalConfig] = useState({ isOpen: false });

    const showModal = (config) => setModalConfig({ isOpen: true, ...config });
    const hideModal = () => setModalConfig({ isOpen: false });

    const showError = (title, content) => showModal({
        type: 'danger',
        title,
        content,
        onConfirm: hideModal,
        confirmText: '關閉',
        onCancel: null
    });

    const showSuccess = (title, content) => showModal({
        type: 'confirm',
        title,
        content,
        onConfirm: hideModal,
        confirmText: '好',
        onCancel: null
    });

    const showConfirm = (title, content, onConfirm) => showModal({
        type: 'danger',
        title,
        content,
        onConfirm: () => { hideModal(); onConfirm(); },
        onCancel: hideModal
    });

    return { modalConfig, showModal, hideModal, showError, showSuccess, showConfirm };
};
