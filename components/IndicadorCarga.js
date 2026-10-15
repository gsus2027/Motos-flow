'use client';

import { useEffect } from 'react';

/**
 * Indicador de carga para TODOS los botones (14-oct-2026). Pedido del
 * dueño: "hacemos clic pero como demora en cargar seguimos haciendo clic
 * porque no sabemos si carga o no".
 *
 * Va una sola vez en el layout raíz, sin tocar cada pantalla:
 *   - Cuando un clic (o Enter en un formulario) termina en un pedido al
 *     servidor, ese botón muestra una ruedita y "Guardando…" (o
 *     "Cargando…" si solo se está abriendo algo) y no responde a más clics
 *     hasta que el servidor contesta. Así un cobro o una factura no se
 *     guarda dos veces.
 *   - Arriba de la pantalla aparece una barra que se mueve, también al
 *     pasar de una página a otra.
 *
 * Cómo sabe que "está cargando": envuelve window.fetch (lo usan los Server
 * Actions, la navegación de Next y los fetch propios de cada pantalla). Un
 * pedido que empieza poco después de un clic queda ligado a ese botón; al
 * terminar todos, se quita el indicador. No cambia el texto ni el estado
 * `disabled` del botón (eso lo maneja React): solo agrega un atributo
 * `data-cargando`, que se dibuja con CSS. Los "prefetch" de Next se
 * ignoran.
 */

const VENTANA_MS = 700; // entre el clic y el pedido al servidor
const ESPERA_FIN_MS = 450; // después de la respuesta, mientras se dibuja la pantalla nueva
const MAXIMO_MS = 45000; // por si algo nunca contesta
const MAXIMO_NATIVO_MS = 12000; // formularios sin JavaScript (descargas, etc.)
const ANCHO_MINIMO_TEXTO = 118; // botones más angostos: solo la ruedita

function spinner(color) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><circle cx='12' cy='12' r='9' fill='none' stroke='${color}' stroke-opacity='.3' stroke-width='3'/><path d='M12 3a9 9 0 0 1 9 9' fill='none' stroke='${color}' stroke-width='3' stroke-linecap='round'><animateTransform attributeName='transform' type='rotate' from='0 12 12' to='360 12 12' dur='0.8s' repeatCount='indefinite'/></path></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export default function IndicadorCarga({ color = '#0071e3' }) {
  useEffect(() => {
    if (typeof window === 'undefined' || window.__indicadorCarga) return;
    window.__indicadorCarga = true;

    const barra = document.createElement('div');
    barra.className = 'ic-barra';
    barra.setAttribute('role', 'progressbar');
    barra.setAttribute('aria-label', 'Cargando');
    barra.hidden = true;
    document.body.appendChild(barra);

    let candidato = null; // { el, t }
    let activo = false;
    let enCurso = 0;
    let timerFin;
    let timerMax;
    let timerBarra;

    function limpiar() {
      activo = false;
      candidato = null;
      clearTimeout(timerFin);
      clearTimeout(timerMax);
      clearTimeout(timerBarra);
      barra.hidden = true;
      document.querySelectorAll('[data-cargando]').forEach((el) => {
        el.removeAttribute('data-cargando');
        el.removeAttribute('aria-busy');
        el.style.removeProperty('--ic-color');
        el.style.removeProperty('--ic-spinner');
      });
    }

    function marcarBoton(el, texto) {
      if (!el || !(el instanceof HTMLElement) || !el.matches('button, input[type="submit"], input[type="button"]')) return;
      const estilo = getComputedStyle(el);
      const colorTexto = estilo.color || '#fff';
      el.style.setProperty('--ic-color', colorTexto);
      el.style.setProperty('--ic-spinner', spinner(colorTexto));
      el.setAttribute('data-cargando', el.offsetWidth >= ANCHO_MINIMO_TEXTO ? texto : '');
      el.setAttribute('aria-busy', 'true');
    }

    function activar(el, texto, maximo = MAXIMO_MS) {
      activo = true;
      marcarBoton(el, texto);
      clearTimeout(timerBarra);
      // La barra espera un instante: si la respuesta es inmediata, no parpadea.
      timerBarra = setTimeout(() => {
        if (activo) barra.hidden = false;
      }, 150);
      clearTimeout(timerMax);
      timerMax = setTimeout(limpiar, maximo);
    }

    function quizasTerminar() {
      clearTimeout(timerFin);
      timerFin = setTimeout(() => {
        if (enCurso === 0) limpiar();
      }, ESPERA_FIN_MS);
    }

    // --- Clics: recordar qué botón se tocó; bloquear el que ya está cargando.
    function alClic(e) {
      const el = e.target instanceof Element ? e.target.closest('button, input[type="submit"], input[type="button"], a[href]') : null;
      if (!el || el.closest('[data-sin-carga]')) return;
      if (el.closest('[data-cargando]')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      if (el.tagName === 'A') {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || el.target === '_blank' || el.hasAttribute('download')) return;
      } else if (el.disabled) {
        return;
      }
      candidato = { el, t: performance.now() };
    }

    // --- Formularios: Enter también cuenta; un formulario que ya se está
    // enviando no se vuelve a enviar.
    function alEnviar(e) {
      const form = e.target;
      if (!(form instanceof HTMLFormElement) || form.closest('[data-sin-carga]')) return;
      const boton = e.submitter || form.querySelector('button[type="submit"], button:not([type]), input[type="submit"]');
      if ((boton && boton.hasAttribute('data-cargando')) || form.querySelector('[data-cargando]')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      candidato = { el: boton, t: performance.now() };
      const esGet = (form.getAttribute('method') || 'get').toLowerCase() === 'get';
      // Si nadie lo intercepta (React lo hace con los Server Actions), es un
      // envío normal del navegador: la página se va a ir.
      setTimeout(() => {
        if (!e.defaultPrevented) activar(boton, esGet ? 'Cargando…' : 'Guardando…', MAXIMO_NATIVO_MS);
      }, 0);
    }

    // --- Pedidos al servidor.
    const fetchOriginal = window.fetch;
    function terminoUno() {
      enCurso = Math.max(0, enCurso - 1);
      if (enCurso === 0) quizasTerminar();
    }
    window.fetch = function fetchConIndicador(input, init) {
      let rastrear = false;
      try {
        const cabeceras = new Headers((init && init.headers) || (input instanceof Request ? input.headers : undefined));
        const esPrefetch = cabeceras.has('next-router-prefetch') || cabeceras.get('purpose') === 'prefetch';
        if (!esPrefetch) {
          if (activo) {
            rastrear = true;
          } else if (candidato && performance.now() - candidato.t < VENTANA_MS) {
            const metodo = String((init && init.method) || (input instanceof Request ? input.method : 'GET')).toUpperCase();
            const guarda = metodo !== 'GET' || cabeceras.has('next-action');
            activar(candidato.el, guarda ? 'Guardando…' : 'Cargando…');
            candidato = null;
            rastrear = true;
          }
        }
      } catch {
        rastrear = false;
      }
      // eslint-disable-next-line prefer-rest-params
      const pedido = fetchOriginal.apply(this, arguments);
      if (rastrear) {
        enCurso += 1;
        clearTimeout(timerFin);
        pedido.then(terminoUno, terminoUno);
      }
      return pedido;
    };

    // --- Cambio de página sin pedido (ya estaba en memoria).
    const urlAntes = () => window.location.href;
    for (const metodo of ['pushState', 'replaceState']) {
      const original = window.history[metodo];
      window.history[metodo] = function historialConIndicador(...args) {
        const antes = urlAntes();
        const r = original.apply(this, args);
        if (activo && urlAntes() !== antes && enCurso === 0) quizasTerminar();
        return r;
      };
    }
    const alVolver = (e) => {
      if (e.persisted) limpiar();
    };

    window.addEventListener('click', alClic, true);
    window.addEventListener('submit', alEnviar, true);
    window.addEventListener('popstate', quizasTerminar);
    window.addEventListener('pageshow', alVolver);
  }, []);

  return (
    <style>{`
[data-cargando] {
  pointer-events: none !important;
  cursor: progress !important;
  opacity: 0.8;
}
button[data-cargando] {
  position: relative;
  color: transparent !important;
}
button[data-cargando] > * { visibility: hidden; }
button[data-cargando]::after {
  content: attr(data-cargando);
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  min-height: 16px;
  display: flex;
  align-items: center;
  white-space: nowrap;
  padding-left: 24px;
  color: var(--ic-color, #fff);
  background: var(--ic-spinner) no-repeat left center;
  background-size: 16px 16px;
}
button[data-cargando=""]::after { padding-left: 16px; }
.ic-barra {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  z-index: 2147483647;
  overflow: hidden;
  pointer-events: none;
  background: ${color}22;
}
.ic-barra[hidden] { display: none; }
.ic-barra::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 40%;
  background: ${color};
  border-radius: 3px;
  animation: ic-barra 1.1s ease-in-out infinite;
}
@keyframes ic-barra {
  from { left: -40%; }
  to { left: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .ic-barra::before { animation-duration: 2.5s; }
}
`}</style>
  );
}
