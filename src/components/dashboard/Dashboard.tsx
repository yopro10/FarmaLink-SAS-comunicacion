import type { DashboardData, Tab } from '../../types';
import iconDashFarmacias from '../../assets/icon-dash-farmacias.png';
import iconDashMedicamentos from '../../assets/icon-dash-medicamentos.png';
import iconDashPrecios from '../../assets/icon-dash-precios.png';
import { PharmacyMap } from '../common/PharmacyMap';
import './Dashboard.css';

interface DashboardProps {
  data: DashboardData | null;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function Dashboard({ data, activeTab, onTabChange }: DashboardProps) {
  if (!data) return null;

  return (
    <div className="view active dashboard-section">
      <div className="dashboard-header">
        <div className="container">
          <div>
            <h1 className="dashboard-title">Dashboard FarmaLink</h1>
            <p className="dashboard-subtitle">
              {data.farmacias.length} farmacias · {data.medicamentos.length} medicamentos · {data.precios.length} precios
            </p>
          </div>
        </div>
      </div>

      <div className="container">
        <StatsStrip
          farmCount={data.farmacias.length}
          medCount={data.medicamentos.length}
          priceCount={data.precios.length}
        />
        <Tabs activeTab={activeTab} onTabChange={onTabChange} data={data} />
        {activeTab === 'farmacias' && <FarmaciasPanel farmacias={data.farmacias} />}
        {activeTab === 'medicamentos' && <MedicamentosPanel medicamentos={data.medicamentos} />}
        {activeTab === 'precios' && <PreciosPanel precios={data.precios} />}
      </div>
    </div>
  );
}

function StatsStrip({ farmCount, medCount, priceCount }: {
  farmCount: number;
  medCount: number;
  priceCount: number;
}) {
  const stats = [
    { img: iconDashFarmacias, value: farmCount, label: 'Farmacias' },
    { img: iconDashMedicamentos, value: medCount, label: 'Medicamentos' },
    { img: iconDashPrecios, value: priceCount, label: 'Precios' }
  ];

  return (
    <div className="stats-strip">
      {stats.map((stat, index) => (
        <div key={index} className="stat-card">
          <div className="stat-icon">
            <img src={stat.img} alt={stat.label} className="stat-icon-img" />
          </div>
          <div className="stat-val">{stat.value}</div>
          <div className="stat-lbl">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

function Tabs({ activeTab, onTabChange, data }: {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  data: DashboardData;
}) {
  return (
    <div className="tabs">
      <button
        className={`tab-btn ${activeTab === 'farmacias' ? 'active' : ''}`}
        onClick={() => onTabChange('farmacias')}
      >
        <img src={iconDashFarmacias} alt="" className="tab-icon-img" />
        Farmacias <span className="tab-count">{data.farmacias.length}</span>
      </button>
      <button
        className={`tab-btn ${activeTab === 'medicamentos' ? 'active' : ''}`}
        onClick={() => onTabChange('medicamentos')}
      >
        <img src={iconDashMedicamentos} alt="" className="tab-icon-img" />
        Medicamentos <span className="tab-count">{data.medicamentos.length}</span>
      </button>
      <button
        className={`tab-btn ${activeTab === 'precios' ? 'active' : ''}`}
        onClick={() => onTabChange('precios')}
      >
        <img src={iconDashPrecios} alt="" className="tab-icon-img" />
        Precios <span className="tab-count">{data.precios.length}</span>
      </button>
    </div>
  );
}

function FarmaciasPanel({ farmacias }: { farmacias: Array<{ _id: string; name: string; address?: string; phone?: string }> }) {
  return (
    <div id="panel-farmacias" className="tab-panel active">
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#2c3e50', marginBottom: '1rem' }}>
          Encuentra Farmacias Cercanas
        </h2>
        <PharmacyMap />
      </div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#2c3e50', marginBottom: '1rem' }}>
        Todas las Farmacias
      </h2>
      <div className="cards-grid">
        {farmacias.map((farmacia, i) => (
          <div key={farmacia._id} className="farmacia-card">
            <div className="farmacia-num">#{i + 1}</div>
            <div className="farmacia-name">{farmacia.name}</div>
            <div className="farmacia-address">{farmacia.address || 'Sin dirección'}</div>
            <div className="farmacia-phone">{farmacia.phone || 'Sin teléfono'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MedicamentosPanel({ medicamentos }: { medicamentos: Array<{
  _id: string;
  name: string;
  lab: string;
  active: boolean;
  category?: string
}> }) {
  return (
    <div id="panel-medicamentos" className="tab-panel active">
      <div className="cards-grid">
        {medicamentos.map((med) => (
          <div key={med._id} className="med-card">
            <div className="med-card-top">
              <div className="med-name">{med.name}</div>
              <div className={`med-status ${med.active ? 'active' : 'inactive'}`}></div>
            </div>
            <div className="med-lab">{med.lab}</div>
            <div className="med-tags">
              <span className="med-tag cat">{med.category || 'Sin categoría'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreciosPanel({ precios }: { precios: Array<{
  _id: string;
  precio: number;
  fecha: string;
  medicamentoId?: { name: string };
  farmaciaId?: { name: string };
}> }) {
  return (
    <div id="panel-precios" className="tab-panel active">
      <div className="precios-table">
        <div className="precios-table-header">
          <span>Medicamento</span>
          <span>Farmacia</span>
          <span>Precio</span>
          <span>Fecha</span>
        </div>
        <div>
          {precios.slice(0, 20).map((precio) => (
            <div key={precio._id} className="precio-row">
              <div className="precio-med-name">{precio.medicamentoId?.name || 'N/A'}</div>
              <div className="precio-farmacia">{precio.farmaciaId?.name || 'N/A'}</div>
              <div className="precio-val-cell">${precio.precio.toLocaleString()}</div>
              <div className="precio-fecha">{new Date(precio.fecha).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
