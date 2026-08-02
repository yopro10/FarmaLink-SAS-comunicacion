import { useState, useEffect, useCallback } from 'react';
import type { PerfilDesarrollador } from '../../types';
import './DevelopersView.css';

const API_BASE = ((import.meta as any).env?.VITE_API_URL || '').trim();

async function parseApiResponse(res: Response) {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const body = await res.text();
    const preview = body.slice(0, 120).replace(/\s+/g, ' ').trim();
    throw new Error(
      `Respuesta invalida del servidor (${res.status}). Se esperaba JSON. ${preview ? `Inicio: ${preview}` : ''}`
    );
  }
  return res.json();
}

const ROLE_LABEL: Record<string, string> = {
  admin:        'Administrador',
  farmaceutico: 'Farmacéutico',
  cliente:      'Cliente',
  developer:    'Desarrollador',
};

function roleBadgeClass(role: string): string {
  const map: Record<string, string> = {
    admin:        'dev-role-admin',
    farmaceutico: 'dev-role-farmaceutico',
    cliente:      'dev-role-cliente',
    developer:    'dev-role-developer',
  };
  return map[role] ?? 'dev-role-default';
}

/* ── Tipo extendido para el panel de admin ── */
interface UsuarioAdmin extends PerfilDesarrollador {
  email?: string;
  is_team_member?: boolean;
}

interface DevelopersViewProps {
  isAuthenticated: boolean;
  userRole: string;
  onGoSettings: () => void;
  onGoValidator: () => void;
}

export function DevelopersView({ isAuthenticated, userRole, onGoSettings, onGoValidator }: DevelopersViewProps) {
  const isAdmin = userRole === 'admin';

  /* ── Estado: lista pública ── */
  const [developers, setDevelopers] = useState<PerfilDesarrollador[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ── Estado: panel admin ── */
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminTab, setAdminTab] = useState<'equipo' | 'usuarios'>('equipo');
  const [editTarget, setEditTarget] = useState<UsuarioAdmin | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', bio: '', profile_picture: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg, setEditMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [toggleBusy, setToggleBusy] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UsuarioAdmin | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  /* ── Carga pública del equipo ── */
  const fetchTeam = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/usuarios/public/equipo`);
      const data = await parseApiResponse(res);
      if (!res.ok || !data.success) throw new Error(data.message || 'Error al cargar el equipo');
      setDevelopers(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  /* ── Carga admin: todos los usuarios ── */
  const fetchUsuarios = useCallback(async () => {
    if (!isAdmin) return;
    setAdminLoading(true);
    setAdminError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/usuarios`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await parseApiResponse(res);
      if (!res.ok || !data.success) throw new Error(data.message || 'Error al cargar usuarios');
      setUsuarios(data.data);
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setAdminLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { if (isAdmin) fetchUsuarios(); }, [isAdmin, fetchUsuarios]);

  /* ── Toggle is_team_member ── */
  const handleToggleTeam = async (user: UsuarioAdmin) => {
    setToggleBusy(user.id);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/usuarios/${user.id}/team-member`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_team_member: !user.is_team_member }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok || !data.success) throw new Error(data.message || 'Error');
      setUsuarios(prev => prev.map(u => u.id === user.id ? { ...u, is_team_member: data.data.is_team_member } : u));
      fetchTeam(); // refresca la vista pública
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al actualizar');
    } finally {
      setToggleBusy(null);
    }
  };

  /* ── Abrir modal de edición ── */
  const openEdit = (user: UsuarioAdmin) => {
    setEditTarget(user);
    setEditForm({
      name: user.name || '',
      phone: user.phone || '',
      bio: user.bio || '',
      profile_picture: user.profile_picture || '',
    });
    setEditMsg(null);
  };

  /* ── Guardar edición ── */
  const handleSaveEdit = async () => {
    if (!editTarget) return;
    setEditSaving(true);
    setEditMsg(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/usuarios/${editTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: editForm.name.trim(),
          phone: editForm.phone.trim() || null,
          bio: editForm.bio.trim() || null,
          profile_picture: editForm.profile_picture.trim() || null,
        }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok || !data.success) throw new Error(data.message || (data.errors?.join(', ')) || 'Error');
      setUsuarios(prev => prev.map(u => u.id === editTarget.id ? { ...u, ...data.data } : u));
      setEditMsg({ type: 'ok', text: '✅ Perfil actualizado correctamente' });
      fetchTeam();
    } catch (err) {
      setEditMsg({ type: 'err', text: `❌ ${err instanceof Error ? err.message : 'Error'}` });
    } finally {
      setEditSaving(false);
    }
  };

  /* ── Eliminar usuario ── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/usuarios/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await parseApiResponse(res);
      if (!res.ok || !data.success) throw new Error(data.message || 'Error');
      setUsuarios(prev => prev.filter(u => u.id !== deleteTarget.id));
      setDeleteTarget(null);
      fetchTeam();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setDeleteBusy(false);
    }
  };

  const teamMembers = usuarios.filter(u => u.is_team_member);
  const nonTeamMembers = usuarios.filter(u => !u.is_team_member);

  return (
    <div className="dev-container">

      {/* ── Header ── */}
      <div className="dev-header">
        <div className="container">
          <span className="dev-header-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Equipo FarmaLink
          </span>
          <h1 className="dev-header-title">Nuestros Desarrolladores</h1>
          <p className="dev-header-subtitle">
            Conoce al equipo de ingenieros que construyó y mantiene la plataforma FarmaLink SAS.
          </p>
          <div className="dev-header-actions">
            <button className="dev-btn-validator" onClick={onGoValidator} id="btn-abrir-validador">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6"/>
                <polyline points="8 6 2 12 8 18"/>
              </svg>
              Validador HTML &amp; CSS
            </button>
          </div>
        </div>
      </div>

      <div className="container">

        {/* ── Tarjetas públicas del equipo ── */}
        {loading && (
          <div className="dev-spinner" role="status" aria-live="polite">Cargando equipo...</div>
        )}

        {!loading && error && (
          <div className="dev-status" role="alert">
            <span className="dev-status-icon">⚠️</span>
            <h2>No se pudo cargar el equipo</h2>
            <p>{error}</p>
            <button className="dev-status-btn" onClick={fetchTeam} id="btn-reintentar-equipo">Reintentar</button>
          </div>
        )}

        {!loading && !error && (
          <>
            {developers.length === 0 ? (
              <div className="dev-grid">
                <div className="dev-empty">
                  <span className="dev-empty-icon">👥</span>
                  <h3>Sin datos de equipo</h3>
                  <p>
                    {isAdmin
                      ? 'Activa miembros del equipo desde el panel de administración abajo.'
                      : 'Aún no hay desarrolladores marcados como miembros del equipo.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="dev-grid" role="list">
                {developers.map((dev) => (
                  <DeveloperCard key={dev.id} dev={dev} />
                ))}
              </div>
            )}

            {isAuthenticated && !isAdmin && (
              <div className="dev-profile-note">
                <p>¿Eres parte del equipo? <strong>Actualiza tu foto, bio y número de contacto</strong> desde tu perfil.</p>
                <button className="dev-profile-note-btn" onClick={onGoSettings} id="btn-ir-mi-cuenta">
                  Editar mi perfil
                </button>
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════
            PANEL DE ADMINISTRACIÓN — solo admins
            ════════════════════════════════════════════ */}
        {isAdmin && (
          <section className="dev-admin-panel" id="admin-developers-panel" aria-label="Panel administración de desarrolladores">
            <div className="dev-admin-header">
              <div className="dev-admin-title-row">
                <span className="dev-admin-badge">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  Panel Admin
                </span>
                <h2 className="dev-admin-title">Gestión de Desarrolladores</h2>
              </div>
              <p className="dev-admin-subtitle">
                Activa o desactiva quién aparece en la sección pública, y edita sus perfiles.
              </p>

              {/* Tabs */}
              <div className="dev-admin-tabs" role="tablist">
                <button
                  className={`dev-admin-tab ${adminTab === 'equipo' ? 'active' : ''}`}
                  onClick={() => setAdminTab('equipo')}
                  role="tab"
                  aria-selected={adminTab === 'equipo'}
                  id="tab-equipo"
                >
                  👥 En el equipo ({teamMembers.length})
                </button>
                <button
                  className={`dev-admin-tab ${adminTab === 'usuarios' ? 'active' : ''}`}
                  onClick={() => setAdminTab('usuarios')}
                  role="tab"
                  aria-selected={adminTab === 'usuarios'}
                  id="tab-todos-usuarios"
                >
                  🧑‍💼 Todos los usuarios ({nonTeamMembers.length})
                </button>
              </div>
            </div>

            {adminLoading && <div className="dev-spinner">Cargando usuarios...</div>}

            {!adminLoading && adminError && (
              <div className="dev-status" role="alert">
                <span className="dev-status-icon">⚠️</span>
                <h2>Error al cargar usuarios</h2>
                <p>{adminError}</p>
                <button className="dev-status-btn" onClick={fetchUsuarios} id="btn-reintentar-admin">Reintentar</button>
              </div>
            )}

            {!adminLoading && !adminError && (
              <div className="dev-admin-table-wrap">
                {adminTab === 'equipo' && (
                  <>
                    {teamMembers.length === 0 ? (
                      <p className="dev-admin-empty">No hay miembros del equipo activos. Agrégalos desde la pestaña "Todos los usuarios".</p>
                    ) : (
                      <table className="dev-admin-table" id="tabla-equipo-desarrolladores">
                        <thead>
                          <tr>
                            <th>Foto</th>
                            <th>Nombre</th>
                            <th>Rol</th>
                            <th>Teléfono</th>
                            <th>Bio</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teamMembers.map(u => (
                            <tr key={u.id}>
                              <td>
                                <div className="dev-admin-avatar">
                                  {u.profile_picture
                                    ? <img src={u.profile_picture} alt={u.name} />
                                    : <span>{u.name.charAt(0).toUpperCase()}</span>}
                                </div>
                              </td>
                              <td>
                                <strong>{u.name}</strong>
                                <br/>
                                <small className="dev-admin-email">{u.email}</small>
                              </td>
                              <td>
                                <span className={`dev-role-badge ${roleBadgeClass(u.role)}`}>
                                  {ROLE_LABEL[u.role] ?? u.role}
                                </span>
                              </td>
                              <td>{u.phone || <span className="dev-admin-muted">—</span>}</td>
                              <td className="dev-admin-bio-cell">{u.bio || <span className="dev-admin-muted">—</span>}</td>
                              <td>
                                <div className="dev-admin-actions">
                                  <button
                                    className="dev-admin-btn dev-admin-btn--edit"
                                    onClick={() => openEdit(u)}
                                    title="Editar perfil"
                                    id={`btn-editar-dev-${u.id}`}
                                  >
                                    ✏️ Editar
                                  </button>
                                  <button
                                    className="dev-admin-btn dev-admin-btn--remove"
                                    onClick={() => handleToggleTeam(u)}
                                    disabled={toggleBusy === u.id}
                                    title="Quitar del equipo"
                                    id={`btn-quitar-dev-${u.id}`}
                                  >
                                    {toggleBusy === u.id ? '...' : '➖ Quitar'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </>
                )}

                {adminTab === 'usuarios' && (
                  <>
                    {nonTeamMembers.length === 0 ? (
                      <p className="dev-admin-empty">Todos los usuarios ya están en el equipo.</p>
                    ) : (
                      <table className="dev-admin-table" id="tabla-todos-usuarios">
                        <thead>
                          <tr>
                            <th>Foto</th>
                            <th>Nombre / Email</th>
                            <th>Rol</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {nonTeamMembers.map(u => (
                            <tr key={u.id}>
                              <td>
                                <div className="dev-admin-avatar">
                                  {u.profile_picture
                                    ? <img src={u.profile_picture} alt={u.name} />
                                    : <span>{u.name.charAt(0).toUpperCase()}</span>}
                                </div>
                              </td>
                              <td>
                                <strong>{u.name}</strong>
                                <br/>
                                <small className="dev-admin-email">{u.email}</small>
                              </td>
                              <td>
                                <span className={`dev-role-badge ${roleBadgeClass(u.role)}`}>
                                  {ROLE_LABEL[u.role] ?? u.role}
                                </span>
                              </td>
                              <td>
                                <div className="dev-admin-actions">
                                  <button
                                    className="dev-admin-btn dev-admin-btn--edit"
                                    onClick={() => openEdit(u)}
                                    title="Editar perfil"
                                    id={`btn-editar-usr-${u.id}`}
                                  >
                                    ✏️ Editar
                                  </button>
                                  <button
                                    className="dev-admin-btn dev-admin-btn--add"
                                    onClick={() => handleToggleTeam(u)}
                                    disabled={toggleBusy === u.id}
                                    title="Agregar al equipo"
                                    id={`btn-agregar-dev-${u.id}`}
                                  >
                                    {toggleBusy === u.id ? '...' : '➕ Al equipo'}
                                  </button>
                                  <button
                                    className="dev-admin-btn dev-admin-btn--delete"
                                    onClick={() => setDeleteTarget(u)}
                                    title="Eliminar usuario"
                                    id={`btn-eliminar-usr-${u.id}`}
                                  >
                                    🗑️ Eliminar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </>
                )}
              </div>
            )}
          </section>
        )}
      </div>

      {/* ── Modal de edición ── */}
      {editTarget && (
        <div className="dev-modal-overlay" role="dialog" aria-modal="true" aria-label="Editar perfil de desarrollador" onClick={(e) => { if (e.target === e.currentTarget) setEditTarget(null); }}>
          <div className="dev-modal">
            <div className="dev-modal-header">
              <h2>Editar perfil de <em>{editTarget.name}</em></h2>
              <button className="dev-modal-close" onClick={() => setEditTarget(null)} aria-label="Cerrar" id="btn-cerrar-modal-dev">✕</button>
            </div>

            <div className="dev-modal-body">
              <div className="dev-modal-field">
                <label htmlFor="edit-name">Nombre completo</label>
                <input
                  id="edit-name"
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Nombre del desarrollador"
                />
              </div>

              <div className="dev-modal-field">
                <label htmlFor="edit-phone">Teléfono / celular</label>
                <input
                  id="edit-phone"
                  type="tel"
                  value={editForm.phone}
                  onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+57 300 000 0000"
                />
              </div>

              <div className="dev-modal-field">
                <label htmlFor="edit-photo">URL de foto de perfil</label>
                <input
                  id="edit-photo"
                  type="url"
                  value={editForm.profile_picture}
                  onChange={e => setEditForm(f => ({ ...f, profile_picture: e.target.value }))}
                  placeholder="https://ejemplo.com/foto.jpg"
                />
                {editForm.profile_picture && (
                  <img
                    src={editForm.profile_picture}
                    alt="Vista previa"
                    className="dev-modal-preview"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
              </div>

              <div className="dev-modal-field">
                <label htmlFor="edit-bio">Descripción / Bio</label>
                <textarea
                  id="edit-bio"
                  rows={3}
                  value={editForm.bio}
                  onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
                  placeholder="Describe el rol y experiencia del desarrollador..."
                />
              </div>

              {editMsg && (
                <p className={`dev-modal-msg ${editMsg.type === 'ok' ? 'dev-modal-msg--ok' : 'dev-modal-msg--err'}`}>
                  {editMsg.text}
                </p>
              )}
            </div>

            <div className="dev-modal-footer">
              <button className="dev-modal-cancel" onClick={() => setEditTarget(null)} id="btn-cancelar-edicion-dev">
                Cancelar
              </button>
              <button
                className="dev-modal-save"
                onClick={handleSaveEdit}
                disabled={editSaving}
                id="btn-guardar-edicion-dev"
              >
                {editSaving ? 'Guardando...' : '💾 Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="dev-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Confirmar eliminación de usuario"
          onClick={(e) => { if (e.target === e.currentTarget && !deleteBusy) setDeleteTarget(null); }}
        >
          <div className="dev-modal dev-modal--danger">
            <div className="dev-modal-header">
              <h2>Confirmar eliminación</h2>
              <button
                className="dev-modal-close"
                onClick={() => setDeleteTarget(null)}
                aria-label="Cerrar"
                id="btn-cerrar-modal-delete-dev"
                disabled={deleteBusy}
              >
                ✕
              </button>
            </div>

            <div className="dev-modal-body">
              <p className="dev-delete-copy">
                Vas a eliminar a <strong>{deleteTarget.name}</strong> ({deleteTarget.email}). Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="dev-modal-footer">
              <button
                className="dev-modal-cancel"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteBusy}
                id="btn-cancelar-delete-dev"
              >
                Cancelar
              </button>
              <button
                className="dev-modal-danger"
                onClick={handleDelete}
                disabled={deleteBusy}
                id="btn-confirmar-delete-dev"
              >
                {deleteBusy ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Tarjeta individual de desarrollador
   ───────────────────────────────────────────── */
function DeveloperCard({ dev }: { dev: PerfilDesarrollador }) {
  const inicial = dev.name.trim().charAt(0).toUpperCase();

  return (
    <article className="dev-card" role="listitem">
      <div className="dev-card-accent" aria-hidden="true" />

      <div className="dev-card-body">
        <div className="dev-avatar-wrap">
          {/* Avatar */}
          <div className="dev-avatar" aria-hidden="true">
            {dev.profile_picture ? (
              <img
                src={dev.profile_picture}
                alt={`Foto de ${dev.name}`}
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  const sibling = target.nextElementSibling as HTMLElement | null;
                  if (sibling) sibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className="dev-avatar-letter"
              style={{ display: dev.profile_picture ? 'none' : 'flex' }}
              aria-hidden="true"
            >
              {inicial}
            </div>
          </div>

          {/* Nombre y rol */}
          <div className="dev-info">
            <h2 className="dev-name">{dev.name}</h2>
            <span className={`dev-role-badge ${roleBadgeClass(dev.role)}`}>
              {ROLE_LABEL[dev.role] ?? dev.role}
            </span>
          </div>
        </div>

        {/* Bio */}
        {dev.bio && (
          <p className="dev-bio">{dev.bio}</p>
        )}
        {!dev.bio && (
          <p className="dev-bio" style={{ fontStyle: 'italic', opacity: 0.6 }}>
            Sin descripción disponible.
          </p>
        )}
      </div>

      <hr className="dev-card-sep" aria-hidden="true" />

      {/* Footer: datos de contacto */}
      <div className="dev-card-footer">
        {dev.phone ? (
          <div className="dev-contact-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.06 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z"/>
            </svg>
            <a href={`tel:${dev.phone}`}>{dev.phone}</a>
          </div>
        ) : (
          <div className="dev-contact-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.06 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z"/>
            </svg>
            <span style={{ opacity: 0.55, fontStyle: 'italic' }}>Sin número registrado</span>
          </div>
        )}

        <div className="dev-contact-item">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span>
            Desde{' '}
            {new Date(dev.created_at).toLocaleDateString('es-CO', {
              year: 'numeric', month: 'long',
            })}
          </span>
        </div>
      </div>
    </article>
  );
}
