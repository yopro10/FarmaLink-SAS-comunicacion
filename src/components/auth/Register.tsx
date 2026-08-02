import { useState, type FormEvent } from 'react';
import { useToast } from '../../hooks/useToast';
// @ts-ignore
import './Login.css';

interface RegisterProps {
  onRegisterSuccess: () => void;
  onNavigateToLogin: () => void;
}

const API_URL = (import.meta as any).env?.VITE_API_URL || '';

function esEmailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function Register({ onRegisterSuccess, onNavigateToLogin }: RegisterProps) {
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [loading,  setLoading]  = useState(false);

  const [nameError,     setNameError]     = useState('');
  const [emailError,    setEmailError]    = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError,  setConfirmError]  = useState('');

  const { addToast } = useToast();

  const handleNameChange = (val: string) => {
    setName(val);
    setNameError(val.trim().length < 2 && val ? 'Nombre: mínimo 2 caracteres.' : '');
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    setEmailError(val && !esEmailValido(val) ? 'Ingresa un correo electrónico válido.' : '');
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    setPasswordError(val && val.length < 4 ? 'Mínimo 4 caracteres.' : '');
    if (confirm && val !== confirm) setConfirmError('Las contraseñas no coinciden.');
    else setConfirmError('');
  };

  const handleConfirmChange = (val: string) => {
    setConfirm(val);
    setConfirmError(val && val !== password ? 'Las contraseñas no coinciden.' : '');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validar todos los campos
    let valid = true;
    if (!name.trim() || name.trim().length < 2) { setNameError('Nombre: mínimo 2 caracteres.'); valid = false; }
    if (!email || !esEmailValido(email)) { setEmailError('Correo inválido.'); valid = false; }
    if (!password || password.length < 4) { setPasswordError('Mínimo 4 caracteres.'); valid = false; }
    if (!confirm || confirm !== password) { setConfirmError('Las contraseñas no coinciden.'); valid = false; }
    if (!valid) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();

      if (!res.ok) {
        const msg = data.errors?.[0] || data.message || 'Error al registrar';
        addToast(msg, 'error');
        if (msg.toLowerCase().includes('email')) setEmailError(msg);
        return;
      }

      // 2. Hacer login automático
      const loginRes = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const loginData = await loginRes.json();

      if (loginRes.ok) {
        localStorage.setItem('token', loginData.token);
        localStorage.setItem('user', JSON.stringify(loginData.user));
        addToast(`¡Bienvenido a FarmaLink, ${name}!`, 'success');
        onRegisterSuccess();
      } else {
        addToast('Cuenta creada. Inicia sesión.', 'success');
        onNavigateToLogin();
      }
    } catch {
      addToast('Error de conexión. Verifica tu red.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const hayErrores = !!nameError || !!emailError || !!passwordError || !!confirmError;

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Crear Cuenta</h2>
        <p className="login-subtitle">Únete a FarmaLink</p>

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          <div className="form-group">
            <label htmlFor="reg-name">Nombre completo</label>
            <input
              id="reg-name"
              type="text"
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="Ej: Juan Pérez"
              className={nameError ? 'input-error' : ''}
              autoComplete="name"
            />
            {nameError && <span className="field-error" role="alert">{nameError}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="reg-email">Correo electrónico</label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={e => handleEmailChange(e.target.value)}
              placeholder="tu@email.com"
              className={emailError ? 'input-error' : ''}
              autoComplete="email"
            />
            {emailError && <span className="field-error" role="alert">{emailError}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="reg-password">Contraseña</label>
            <input
              id="reg-password"
              type="password"
              value={password}
              onChange={e => handlePasswordChange(e.target.value)}
              placeholder="Mínimo 4 caracteres"
              className={passwordError ? 'input-error' : ''}
              autoComplete="new-password"
            />
            {passwordError && <span className="field-error" role="alert">{passwordError}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="reg-confirm">Confirmar contraseña</label>
            <input
              id="reg-confirm"
              type="password"
              value={confirm}
              onChange={e => handleConfirmChange(e.target.value)}
              placeholder="Repite tu contraseña"
              className={confirmError ? 'input-error' : ''}
              autoComplete="new-password"
            />
            {confirmError && <span className="field-error" role="alert">{confirmError}</span>}
          </div>

          <button type="submit" className="login-btn" disabled={loading || hayErrores}>
            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </button>
        </form>

        <p className="login-footer">
          ¿Ya tienes cuenta?{' '}
          <button type="button" className="link-btn" onClick={onNavigateToLogin}>
            Inicia Sesión
          </button>
        </p>
      </div>
    </div>
  );
}
