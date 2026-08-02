import { useState } from 'react';
import { useCart } from '../../hooks/useCart';
import { useToast } from '../../hooks/useToast';
import './CheckoutView.css';

interface CheckoutViewProps {
  onGoHome: () => void;
  onGoCart: () => void;
}

export function CheckoutView({ onGoHome, onGoCart }: CheckoutViewProps) {
  const { items, cartTotal, cartCount, clearCart } = useCart();
  const { addToast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '',
    direccion: '',
    ciudad: 'Bogotá',
    tarjeta: '',
    vencimiento: '',
    cvv: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    // Guardar copia de los items y datos para la factura antes de limpiar el carrito
    const invoiceItems = [...items];
    const invoiceData = { ...formData };
    const total = cartTotal;

    // Simulate API call for payment processing
    setTimeout(() => {
      setIsProcessing(false);
      setSuccess(true);
      
      generateInvoice(invoiceData, invoiceItems, total);
      
      clearCart();
      addToast('¡Pago procesado exitosamente! Descargando facturas...', 'success');
      
      setTimeout(() => {
        onGoHome();
      }, 4000); // Dar un poco más de tiempo para ver el mensaje y descargas
    }, 2000);
  };

  const generateInvoice = (data: any, cartItems: any[], total: number) => {
    const date = new Date().toLocaleDateString();
    const invoiceId = Math.floor(Math.random() * 1000000);

    // 1. JSON Invoice
    const jsonInvoice = {
      invoiceId,
      date,
      customer: {
        name: data.nombre,
        address: data.direccion,
        city: data.ciudad,
      },
      items: cartItems.map(i => ({
        product: i.medicamento?.name || 'Producto Desconocido',
        pharmacy: i.farmaciaNombre,
        quantity: i.cantidad,
        unitPrice: i.precioUnidad,
        subtotal: i.precioUnidad * i.cantidad
      })),
      total
    };

    const jsonBlob = new Blob([JSON.stringify(jsonInvoice, null, 2)], { type: 'application/json' });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const jsonLink = document.createElement('a');
    jsonLink.href = jsonUrl;
    jsonLink.download = `factura_${invoiceId}.json`;
    document.body.appendChild(jsonLink);
    jsonLink.click();
    document.body.removeChild(jsonLink);
    URL.revokeObjectURL(jsonUrl);

    // 2. HTML Invoice
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Factura #${invoiceId}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; max-width: 800px; margin: auto; color: #333; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0056b3; padding-bottom: 20px; margin-bottom: 30px; }
          .logo-area h2 { color: #0056b3; margin: 0 0 10px 0; }
          .details h3 { color: #555; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #f8f9fa; color: #333; font-weight: 600; }
          .total-row { background-color: #f8f9fa; font-weight: bold; font-size: 1.2em; }
          .footer { margin-top: 40px; text-align: center; color: #777; font-size: 0.9em; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-area">
            <h2>Farmalink SAS</h2>
            <p><strong>Factura #:</strong> ${invoiceId}</p>
            <p><strong>Fecha:</strong> ${date}</p>
          </div>
          <div class="details">
            <h3>Facturado a:</h3>
            <p><strong>Nombre:</strong> ${data.nombre}</p>
            <p><strong>Dirección:</strong> ${data.direccion}</p>
            <p><strong>Ciudad:</strong> ${data.ciudad}</p>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Precio Unitario</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${cartItems.map(item => `
              <tr>
                <td>
                  <strong>${item.medicamento?.name || 'Producto Desconocido'}</strong><br/>
                  <small style="color: #666;">Farmacia: ${item.farmaciaNombre}</small>
                </td>
                <td>${item.cantidad}</td>
                <td>$${item.precioUnidad.toLocaleString('es-CO')}</td>
                <td>$${(item.precioUnidad * item.cantidad).toLocaleString('es-CO')}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="3" style="text-align: right;">Total:</td>
              <td>$${total.toLocaleString('es-CO')}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="footer">
          <p>¡Gracias por su compra en Farmalink!</p>
          <p>Para dudas o soporte, contáctenos en soporte@farmalink.com</p>
        </div>
      </body>
      </html>
    `;

    const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
    const htmlUrl = URL.createObjectURL(htmlBlob);
    const htmlLink = document.createElement('a');
    htmlLink.href = htmlUrl;
    htmlLink.download = `factura_${invoiceId}.html`;
    document.body.appendChild(htmlLink);
    htmlLink.click();
    document.body.removeChild(htmlLink);
    URL.revokeObjectURL(htmlUrl);
  };

  if (success) {
    return (
      <div className="checkout-view container view active">
        <div className="checkout-success">
          <div className="success-icon">✓</div>
          <h2>¡Pedido Confirmado!</h2>
          <p>Tu pago ha sido procesado exitosamente y tus medicamentos están en camino.</p>
          <p className="redirect-msg">Serás redirigido al inicio en unos segundos...</p>
          <button className="btn-primary mt-4" onClick={onGoHome}>
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  if (cartCount === 0) {
    return (
      <div className="checkout-view container view active">
        <div className="checkout-empty">
          <h2>No hay nada que pagar</h2>
          <button className="btn-primary mt-4" onClick={onGoCart}>
            Volver al Carrito
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-view container view active">
      <div className="checkout-header">
        <button className="back-btn" onClick={onGoCart}>← Volver al carrito</button>
        <h1 className="checkout-title">Finalizar Compra</h1>
      </div>

      <div className="checkout-content">
        <form className="checkout-form" onSubmit={handleSubmit}>
          
          <section className="form-section">
            <h2>Datos de Entrega</h2>
            <div className="form-group">
              <label htmlFor="nombre">Nombre Completo</label>
              <input type="text" id="nombre" name="nombre" required value={formData.nombre} onChange={handleChange} placeholder="Ej. Juan Pérez" />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="direccion">Dirección</label>
                <input type="text" id="direccion" name="direccion" required value={formData.direccion} onChange={handleChange} placeholder="Calle 123 # 45-67" />
              </div>
              <div className="form-group">
                <label htmlFor="ciudad">Ciudad</label>
                <select id="ciudad" name="ciudad" value={formData.ciudad} onChange={handleChange}>
                  <option value="Bogotá">Bogotá</option>
                  <option value="Medellín">Medellín</option>
                  <option value="Cali">Cali</option>
                  <option value="Barranquilla">Barranquilla</option>
                </select>
              </div>
            </div>
          </section>

          <section className="form-section">
            <h2>Método de Pago (Ficticio)</h2>
            <div className="payment-cards">
              <div className="payment-card active">
                <span className="card-dot"></span> Tarjeta de Crédito
              </div>
            </div>
            
            <div className="form-group mt-3">
              <label htmlFor="tarjeta">Número de Tarjeta</label>
              <input type="text" id="tarjeta" name="tarjeta" required value={formData.tarjeta} onChange={handleChange} placeholder="0000 0000 0000 0000" maxLength={19} pattern="\d{16}|\d{4} \d{4} \d{4} \d{4}" />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="vencimiento">Vencimiento</label>
                <input type="text" id="vencimiento" name="vencimiento" required value={formData.vencimiento} onChange={handleChange} placeholder="MM/AA" maxLength={5} />
              </div>
              <div className="form-group">
                <label htmlFor="cvv">CVV</label>
                <input type="text" id="cvv" name="cvv" required value={formData.cvv} onChange={handleChange} placeholder="123" maxLength={4} />
              </div>
            </div>
          </section>

          <button 
            type="submit" 
            className="btn-primary pay-btn" 
            disabled={isProcessing}
          >
            {isProcessing ? 'Procesando...' : `Pagar ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(cartTotal)}`}
          </button>
        </form>

        <div className="checkout-summary">
          <div className="summary-box">
            <h2>Resumen</h2>
            <div className="summary-details">
              <span>{cartCount} artículos</span>
            </div>
            <div className="summary-row">
              <span>Subtotal</span>
              <span>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(cartTotal)}</span>
            </div>
            <div className="summary-row">
              <span>Envío</span>
              <span className="free-shipping">Gratis</span>
            </div>
            <div className="summary-row summary-total">
              <span>Total a Pagar</span>
              <span>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(cartTotal)}</span>
            </div>
            <div className="secure-badge">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              Pago 100% Seguro
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
