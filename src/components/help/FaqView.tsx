import { useState } from 'react';
// @ts-ignore: Vite CSS side-effect import declaration
import './FaqView.css';

type FaqItem = {
  question: string;
  answer: string;
};

const FAQ_ITEMS: FaqItem[] = [
  {
    question: '¿Como busco un medicamento y comparo precios?',
    answer:
      'Ve a la seccion Buscar, escribe al menos 2 caracteres y selecciona un resultado. Luego podras revisar precios por farmacia y elegir la mejor opcion.',
  },
  {
    question: '¿Necesito iniciar sesion para usar FarmaLink?',
    answer:
      'Puedes explorar informacion general sin sesion, pero para comparar precios, acceder al dashboard y finalizar compras debes iniciar sesion.',
  },
  {
    question: '¿Como funciona el carrito de compras?',
    answer:
      'Desde el detalle del producto puedes agregar medicamentos. En el carrito puedes aumentar o disminuir cantidades, eliminar items y continuar al checkout.',
  },
  {
    question: '¿Los precios se actualizan en tiempo real?',
    answer:
      'FarmaLink muestra los precios mas recientes registrados por farmacia. Si ves diferencias, usa la busqueda de nuevo para refrescar la comparacion.',
  },
  {
    question: '¿Que hago si no encuentro un medicamento?',
    answer:
      'Intenta por nombre generico, marca comercial o laboratorio. Tambien puedes revisar por categorias para descubrir alternativas similares.',
  },
  {
    question: '¿Como se protegen mis datos personales?',
    answer:
      'La aplicacion incluye configuracion de privacidad y tratamiento de datos. Puedes ajustar preferencias desde el banner de privacidad y revisar la politica.',
  },
];

export function FaqView() {
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <section className="faq-view view active" aria-labelledby="faq-title">
      <div className="container faq-container">
        <span className="faq-kicker">Centro de ayuda</span>
        <h1 id="faq-title">Preguntas Frecuentes</h1>
        <p className="faq-intro">
          Respuestas rapidas sobre busqueda, carrito, pagos y privacidad para usar FarmaLink con confianza.
        </p>

        <div className="faq-list" role="list">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;
            const panelId = `faq-panel-${index}`;
            const buttonId = `faq-button-${index}`;

            return (
              <article
                className={`faq-item ${isOpen ? 'open' : ''}`}
                key={item.question}
                role="listitem"
                style={{ animationDelay: `${index * 45}ms` }}
              >
                <h2 className="faq-question-wrap">
                  <button
                    id={buttonId}
                    className="faq-question"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? -1 : index)}
                    type="button"
                  >
                    <span>{item.question}</span>
                    <span className="faq-chevron" aria-hidden="true">
                      ▾
                    </span>
                  </button>
                </h2>

                <div
                  id={panelId}
                  className={`faq-answer ${isOpen ? 'open' : ''}`}
                  role="region"
                  aria-labelledby={buttonId}
                  aria-hidden={!isOpen}
                >
                  <div className="faq-answer-inner">
                    <p>{item.answer}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
