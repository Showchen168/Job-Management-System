/**
 * Modal Component
 * 通用彈窗元件，支援多種尺寸和樣式
 */

const Modal = ({
  isOpen,
  onClose,
  title,
  icon: Icon,
  iconColor = 'text-blue-600',
  children,
  footer,
  size = 'md',
  closeOnOverlay = true,
  showCloseButton = true,
}) => {
  if (!isOpen) return null;

  // 尺寸映射
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-3xl',
    full: 'max-w-none mx-4',
  };

  const handleOverlayClick = (e) => {
    if (closeOnOverlay && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleOverlayClick}
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      <div
        className={`bg-white rounded-xl shadow-2xl w-full ${sizes[size]} overflow-hidden`}
        style={{ animation: 'slideIn 0.2s ease-out' }}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              {Icon && <Icon className={iconColor} size={24} />}
              {title && (
                <h3 className="text-lg font-bold text-slate-800">{title}</h3>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex justify-end gap-2 p-4 border-t border-slate-100 bg-slate-50">
            {footer}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: scale(0.95) translateY(-10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
};

// Confirm Modal - 確認對話框
const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = '確認',
  message,
  confirmText = '確認',
  cancelText = '取消',
  variant = 'primary', // 'primary' | 'danger'
  loading = false,
}) => {
  const confirmButtonStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700',
    danger: 'bg-red-600 hover:bg-red-700',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-white text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-white rounded-lg transition disabled:opacity-50 ${confirmButtonStyles[variant]}`}
          >
            {loading ? '處理中...' : confirmText}
          </button>
        </>
      }
    >
      <p className="text-slate-600">{message}</p>
    </Modal>
  );
};

// 使用範例
/*
<Modal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  title="編輯任務"
  icon={Edit}
  size="lg"
  footer={
    <>
      <Button variant="secondary" onClick={handleCancel}>取消</Button>
      <Button variant="primary" onClick={handleSave}>儲存</Button>
    </>
  }
>
  <form>...</form>
</Modal>

<ConfirmModal
  isOpen={isDeleteOpen}
  onClose={() => setIsDeleteOpen(false)}
  onConfirm={handleDelete}
  title="確認刪除"
  message="確定要刪除此項目嗎？此操作無法復原。"
  variant="danger"
  confirmText="刪除"
/>
*/

export { Modal, ConfirmModal };
export default Modal;
