import { useState, useEffect } from 'react';
import { useToast } from '../../hooks/useToast';

interface Usuario {
  id: number;
  name: string;
  email: string;
  role: 'cliente' | 'farmaceutico' | 'admin';
  created_at: string;
}

interface FormData {
  name: string;
  email: string;
  password: string;
  role: 'cliente' | 'farmaceutico' | 'admin';
}

const EMPTY_FORM: FormData = { name: '', email: '', password: '', role: 'cliente' };
const GATEWAY = (import.meta as any).env?.VITE_API_URL || '';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  farmaceutico: 'Farmacéutico',
  cliente: 'Cliente',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'badge-admin',
  farmaceutico: 'badge-farm',
  cliente: 'badge-cliente',
};

export function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Usuario | null>(null);
  const { addToast } = useToast();

  useEffect(() => { loadUsuarios(); }, []);

  async function getToken(): Promise<string> {
    return localStorage.getItem('token') || '';
  }

  async function loadUsuarios() {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${GATEWAY}/api/usuarios`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsuarios(data.data);
      } else {
        addToast('Error al cargar usuarios', 'error');
      }
    } catch {
      addToast('Error de conexión', 'error');
    } finally {
      setLoading(false);
    }
  }

  function abrirCrear() {
    setEditando(null);
    setForm(EMPTY_FORM);
    setFormErrors([]);
    setModalOpen(true);
  }

  function abrirEditar(u: Usuario) {
    setEditando(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role });
    setFormErrors([]);
    setModalOpen(true);
  }

  function cerrarModal() {
    setModalOpen(false);
    setEditando(null);
    setForm(EMPTY_FORM);
    setFormErrors([]);
  }

  async function guardar() {
    const errors: string[] = [];
    if (!form.name.trim() || form.name.trim().length < 2) errors.push('Nombre: mínimo 2 caracteres');
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.push('Email inválido');
    if (!editando && (!form.password || form.password.length < 4)) errors.push('Contraseña: mínimo 4 caracteres');
    if (editando && form.password && form.password.length < 4) errors.push('Contraseña: mínimo 4 caracteres');
    if (errors.length > 0) { setFormErrors(errors); return; }

    setSaving(true);
    try {
      const token = await getToken();
      const url = editando ? `${GATEWAY}/api/usuarios/${editando.id}` : `${GATEWAY}/api/usuarios`;
      const method = editando ? 'PUT' : 'POST';
      const payload: any = { name: form.name.trim(), email: form.email.trim(), role: form.role };
      if (!editando || form.password) payload.password = form.password;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403) setFormErrors(['Acceso denegado. Solo administradores.']);
        else setFormErrors(data.errors || [data.message || 'Error al guardar']);
        return;
      }

      cerrarModal();
      await loadUsuarios();
      addToast(editando ? 'Usuario actualizado' : 'Usuario creado', 'success');
    } catch {
      setFormErrors(['Error de conexión']);
    } finally {
      setSaving(false);
    }
  }

  async function eliminar(u: Usuario) {
    try {
      const token = await getToken();
      const res = await fetch(`${GATEWAY}/api/usuarios/${u.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setConfirmDelete(null);
        await loadUsuarios();
        addToast('Usuario eliminado', 'success');
      } else {
        addToast('Error al eliminar usuario', 'error');
      }
    } catch {
      addToast('Error de conexión', 'error');
    }
  }

  const filtrados = usuarios.filter(u => {
    const q = filtro.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  function formatDate(dateStr: string) {
    try {
      return new Date(dateStr).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return dateStr; }
  }

  if (loading) return <div className="admin-loading">Cargando usuarios...</div>;

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <div>
          <h3 className="admin-section-title">Gestión de Usuarios</h3>
          <p className="admin-section-subtitle">{filtrados.length} usuario{filtrados.length !== 1 ? 's' : ''} registrado{filtrados.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-nuevo" onClick={abrirCrear}>+ Nuevo Usuario</button>
      </div>

      <input
        className="admin-filtro"
        placeholder="Filtrar por nombre, email o rol..."
        value={filtro}
        onChange={e => setFiltro(e.target.value)}
      />

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Fecha registro</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan={5} className="admin-empty">No hay usuarios registrados</td></tr>
            ) : filtrados.map(u => (
              <tr key={u.id}>
                <td className="td-name">
                  <div className="user-avatar-name">
                    <div className="user-avatar">{u.name.charAt(0).toUpperCase()}</div>
                    {u.name}
                  </div>
                </td>
                <td>{u.email}</td>
                <td>
                  <span className={`badge ${ROLE_COLORS[u.role] || 'badge-cliente'}`}>
                    {ROLE_LABELS[u.role] || u.role}
                  </span>
                </td>
                <td>{formatDate(u.created_at)}</td>
                <td className="td-actions">
                  <button className="btn-edit" onClick={() => abrirEditar(u)}>Editar</button>
                  <button className="btn-delete" onClick={() => setConfirmDelete(u)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal crear/editar usuario */}
      {modalOpen && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editando ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
              <button className="modal-close" onClick={cerrarModal}>✕</button>
            </div>

            {formErrors.length > 0 && (
              <div className="form-errors">
                {formErrors.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            )}

            <div className="form-grid">
              <div className="form-group">
                <label>Nombre *</label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: Juan Pérez"
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="usuario@email.com"
                />
              </div>
              <div className="form-group">
                <label>{editando ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder={editando ? 'Dejar vacío para mantener' : 'Mínimo 4 caracteres'}
                />
              </div>
              <div className="form-group">
                <label>Rol *</label>
                <select
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value as FormData['role'] })}
                >
                  <option value="cliente">Cliente</option>
                  <option value="farmaceutico">Farmacéutico</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancelar" onClick={cerrarModal}>Cancelar</button>
              <button className="btn-guardar" onClick={guardar} disabled={saving}>
                {saving ? 'Guardando...' : editando ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar eliminar */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal-box modal-confirm" onClick={e => e.stopPropagation()}>
            <h3>Confirmar eliminación</h3>
            <p>¿Estás seguro de que deseas eliminar a <strong>{confirmDelete.name}</strong>?</p>
            <p className="confirm-warning">Esta acción no se puede deshacer.</p>
            <div className="modal-footer">
              <button className="btn-cancelar" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="btn-delete-confirm" onClick={() => eliminar(confirmDelete)}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
