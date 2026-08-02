import { useState, type FormEvent } from 'react';
import { useToast } from '../../hooks/useToast';

// @ts-ignore: Vite CSS side-effect import declaration
import './Login.css';

interface LoginProps {
  onLoginSuccess: () => void;
  onNavigateToRegister: () => void;
}

const API_URL = (import.meta as any).env?.VITE_API_URL || '';

// ── Helper: validar formato de email ─────────────────────────────────────────
function esEmailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function Login({ onLoginSuccess, onNavigateToRegister }: LoginProps) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  // PUNTO 4: errores de validación inline por campo
  const [emailError,    setEmailError]    = useState('');
  const [passwordError, setPasswordError] = useState('');

  const { addToast } = useToast();

  // ── Validación en tiempo real ─────────────────────────────────────────────
  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (val && !esEmailValido(val)) {
      setEmailError('Ingresa un correo electrónico válido (ej: nombre@dominio.com).');
    } else {
      setEmailError('');
    }
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (val && val.length < 4) {
      setPasswordError('La contraseña debe tener al menos 4 caracteres.');
    } else {
      setPasswordError('');
    }
  };

  // ── Bloquear números puros en el email ────────────────────────────────────
  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Permitir: todo excepto espacios al inicio
    if (e.key === ' ' && email.length === 0) e.preventDefault();
  };

  const doLogin = async (emailVal: string, passVal: string) => {
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailVal, password: passVal }),
      });
      const data = await response.json();
      if (!response.ok) {
        const msg = data.message || 'Correo o contraseña incorrectos.';
        setError(msg);
        // PUNTO 4: toast de error de login
        addToast(msg, 'error');
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      // PUNTO 4: toast de bienvenida
      addToast(`Bienvenido, ${data.user?.name || data.user?.email || ''}`, 'success');
      onLoginSuccess();
    } catch {
      const msg = 'Error de conexión. Verifica tu red.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // PUNTO 4: validación final antes de enviar
    if (!email.trim()) { setEmailError('El correo es obligatorio.'); return; }
    if (!esEmailValido(email)) { setEmailError('Ingresa un correo electrónico válido.'); return; }
    if (!password) { setPasswordError('La contraseña es obligatoria.'); return; }
    if (emailError || passwordError) return;
    await doLogin(email, password);
  };

  const handleDemoLogin = async (role: 'user' | 'admin') => {
    const credentials = role === 'admin'
      ? { email: 'admin@farmalink.com', password: '1234' }
      : { email: 'user@farmalink.com',  password: '1234' };
    await doLogin(credentials.email, credentials.password);
  };

  const hayErrores = !!emailError || !!passwordError;

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Iniciar Sesión</h2>
        <p className="login-subtitle">Bienvenido a FarmaLink</p>

        {error && <div className="login-error">{error}</div>}

        <div className="demo-buttons">
          <button type="button" className="demo-btn demo-btn-user"
            onClick={() => handleDemoLogin('user')} disabled={loading}>
            Demo Usuario
          </button>
          <button type="button" className="demo-btn demo-btn-admin"
            onClick={() => handleDemoLogin('admin')} disabled={loading}>
            Demo Admin
          </button>
        </div>

        <div className="login-divider">
          <span>o inicia con tu cuenta</span>
        </div>

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          <div className="form-group">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => handleEmailChange(e.target.value)}
              onKeyDown={handleEmailKeyDown}
              placeholder="tu@email.com"
              className={emailError ? 'input-error' : ''}
              autoComplete="email"
            />
            {/* PUNTO 4: error inline bajo el campo */}
            {emailError && <span className="field-error" role="alert">{emailError}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => handlePasswordChange(e.target.value)}
              placeholder="••••••••"
              className={passwordError ? 'input-error' : ''}
              autoComplete="current-password"
            />
            {passwordError && <span className="field-error" role="alert">{passwordError}</span>}
          </div>

          <button type="submit" className="login-btn" disabled={loading || hayErrores}>
            {loading ? 'Iniciando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <p className="login-footer">
          ¿No tienes cuenta?{' '}
          <button type="button" className="link-btn" onClick={onNavigateToRegister}>
            Regístrate
          </button>
        </p>
      </div>
    </div>
  );
}
