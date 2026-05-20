import React, { useState, useEffect } from 'react';
import { setAlertFunctions } from '../utils/alerts';

export const AlertContainer: React.FC = () => {
  const [alertState, setAlertState] = useState<{ msg: string } | null>(null);
  const [confirmState, setConfirmState] = useState<{ msg: string, resolve: (val: boolean) => void } | null>(null);

  useEffect(() => {
    setAlertFunctions(
      (msg: string) => setAlertState({ msg }),
      (msg: string) => new Promise<boolean>((resolve) => {
        setConfirmState({ msg, resolve });
      })
    );
  }, []);

  const closeAlert = () => setAlertState(null);
  
  const handleConfirm = (val: boolean) => {
    if (confirmState) {
      confirmState.resolve(val);
      setConfirmState(null);
    }
  };

  return (
    <>
      {alertState && (
        <div className="modal-overlay">
          <div className="modal-container animate-fade" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Notificación</h3>
            <p style={{ marginBottom: '24px', color: 'var(--color-text-main)' }}>{alertState.msg}</p>
            <button className="btn btn-primary w-100" onClick={closeAlert}>Aceptar</button>
          </div>
        </div>
      )}
      {confirmState && (
        <div className="modal-overlay">
          <div className="modal-container animate-fade" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Confirmación</h3>
            <p style={{ marginBottom: '24px', color: 'var(--color-text-main)' }}>{confirmState.msg}</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-secondary flex-1" style={{ flex: 1 }} onClick={() => handleConfirm(false)}>Cancelar</button>
              <button className="btn btn-primary flex-1" style={{ flex: 1 }} onClick={() => handleConfirm(true)}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
