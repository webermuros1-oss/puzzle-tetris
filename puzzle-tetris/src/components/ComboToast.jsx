import { useEffect, useState } from 'react';

// Notificación flotante que aparece cuando se eliminan líneas
const ComboToast = ({ message, onDone }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 1200);
    return () => clearTimeout(timer);
  }, [onDone]);

  if (!visible) return null;

  return (
    <div className="combo-toast">
      {message}
    </div>
  );
};

export default ComboToast;
