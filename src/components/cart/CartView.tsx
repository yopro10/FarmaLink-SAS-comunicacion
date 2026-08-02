import { useEffect, useState } from 'react';
import { useCart } from '../../hooks/useCart';
import { useToast } from '../../hooks/useToast';
import type { View } from '../../types';
import './CartView.css';

interface CartViewProps {
  onGoHome: () => void;
  onGoSearch: () => void;
  onGoCheckout: () => void;
}

export function CartView({ onGoHome, onGoSearch, onGoCheckout }: CartViewProps) {
  const { items, addToCart, updateQuantity, removeFromCart, cartTotal } = useCart();
  const { addToast } = useToast();
  const [pendingRemoval, setPendingRemoval] = useState<{ item: CartItem; timeoutId: number } | null>(null);

  useEffect(() => {
    return () => {
      if (pendingRemoval) {
        window.clearTimeout(pendingRemoval.timeoutId);
      }
    };
  }, [pendingRemoval]);

  const scheduleRemoval = (item: CartItem) => {
    if (pendingRemoval) {
      window.clearTimeout(pendingRemoval.timeoutId);
    }

    removeFromCart(item.id);
    const timeoutId = window.setTimeout(() => {
      setPendingRemoval(null);
    }, 5000);

    setPendingRemoval({ item, timeoutId });
    addToast(`"${item.medicamento.name}" eliminado del carrito`, 'warning', 2600);
  };

  const undoRemoval = () => {
    if (!pendingRemoval) return;
    window.clearTimeout(pendingRemoval.timeoutId);
    addToCart({ ...pendingRemoval.item, cantidad: pendingRemoval.item.cantidad });
    setPendingRemoval(null);
    addToast('Producto restaurado en el carrito', 'success', 2200);
  };

  const undoBar = pendingRemoval ? (
    <div className="cart-undo" role="status" aria-live="polite">
      <span>
        Se eliminó <strong>{pendingRemoval.item.medicamento.name}</strong>.
      </span>
      <button type="button" className="cart-undo-btn" onClick={undoRemoval}>
        Deshacer
      </button>
    </div>
  ) : null;

  if (items.length === 0) {
    return (
      <div className="cart-view container view active">
        {undoBar}
        <div className="cart-empty">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="cart-empty-icon">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
          <h2>Tu carrito está vacío</h2>
          <p>Aún no has añadido ningún medicamento a tu carrito.</p>
          <button className="btn-primary" onClick={onGoSearch}>
            Buscar Medicamentos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-view container view active">
      <h1 className="cart-title">Carrito de Compras</h1>
      {undoBar}
      
      <div className="cart-content">
        <div className="cart-items">
          {items.map((item) => (
            <div key={item.id} className="cart-item">
              <div className="cart-item-img-wrap">
                <img 
                  src={`/medicamentos/${item.medicamento._id}.png`} 
                  alt={item.medicamento.name}
                  className="cart-item-img"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = '/medicamentos/placeholder.svg';
                  }}
                />
              </div>
              <div className="cart-item-details">
                <h3 className="cart-item-name">{item.medicamento.name}</h3>
                <p className="cart-item-lab">{item.medicamento.lab}</p>
                <div className="cart-item-farmacia">
                  <span className="farmacia-badge">{item.farmaciaNombre}</span>
                </div>
              </div>
              <div className="cart-item-actions">
                <div className="quantity-control">
                  <button onClick={() => item.cantidad === 1 ? scheduleRemoval(item) : updateQuantity(item.id, item.cantidad - 1)}>-</button>
                  <span>{item.cantidad}</span>
                  <button onClick={() => updateQuantity(item.id, item.cantidad + 1)}>+</button>
                </div>
                <button className="cart-item-remove" onClick={() => scheduleRemoval(item)}>
                  Eliminar
                </button>
              </div>
              <div className="cart-item-price">
                <div className="price-unit">
                  {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(item.precioUnidad)} c/u
                </div>
                <div className="price-subtotal">
                  {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(item.precioUnidad * item.cantidad)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="cart-summary">
          <h2>Resumen del pedido</h2>
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(cartTotal)}</span>
          </div>
          <div className="summary-row">
            <span>Envío estimado</span>
            <span>Gratis</span>
          </div>
          <div className="summary-row summary-total">
            <span>Total</span>
            <span>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(cartTotal)}</span>
          </div>
          
          <button className="btn-primary checkout-btn" onClick={onGoCheckout}>
            Proceder al Pago
          </button>
          <button className="btn-secondary continue-shopping-btn" onClick={onGoSearch}>
            Seguir Comprando
          </button>
        </div>
      </div>
    </div>
  );
}
