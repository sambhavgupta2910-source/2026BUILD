import { useEffect, useState } from 'react';

export default function Toast({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastItem({ toast }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(id);
  }, []);

  if (!visible) return null;

  const icons = { success: '✓', error: '✕', info: 'ℹ' };

  return (
    <div className={`toast ${toast.type || 'info'}`}>
      <span className="toast-icon">{icons[toast.type] || icons.info}</span>
      <span>{toast.text}</span>
    </div>
  );
}
