// Contenido de la pantalla que ve el cliente justo después de firmar su
// contrato de renta. Todo está en ambos idiomas porque esta pantalla debe
// mostrarse en el mismo idioma que el cliente eligió en el formulario.

export const RESENAS = {
  google: "https://g.page/r/CaP-IoMHC_6bEAE/review",
  tripadvisor:
    "https://www.tripadvisor.com/Attraction_Review-g304171-d32697118-Reviews-Flow_Rentals-Bocas_Town_Isla_Colon_Bocas_del_Toro_Province.html",
};

function mapsQuery(nombre) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nombre + ", Bocas del Toro, Panamá")}`;
}

// Ruta recomendada — misma para moto y ebike, en el mismo orden que el
// negocio la recorre con sus clientes.
export const RUTA = {
  es: [
    {
      icono: "🏖️",
      nombre: "Playa Bluff",
      texto:
        "Punto de partida. Dirígete hacia Bombom Beach Rest.",
      mapsNombre: "Playa Bluff",
    },
    {
      icono: "💧",
      nombre: "Blue Lagoon / La Piscina",
      texto:
        "Desde la cerca al final de Bluff, camina aprox. 1 hora.",
      mapsNombre: "Blue Lagoon Bluff Bocas del Toro",
    },
    {
      icono: "🤿",
      nombre: "Playa Paunch (snorkel)",
      texto:
        "Pregunta en el Beach Bar frente al mar cuál es la zona de snorkel, está justo al lado. Luego regresa por la misma ruta — no hay camino que conecte Bluff con Bocas del Drago.",
      mapsNombre: "Paunch Beach Bocas del Toro",
    },
    {
      icono: "♻️",
      nombre: "Castillo de Botellas Plásticas",
      texto:
        "Una parada curiosa sobre cómo el plástico afecta a una pequeña isla turística del Caribe.",
      mapsNombre: "Plastic Bottle Village Bocas del Toro",
    },
    {
      icono: "🕳️",
      nombre: "La Gruta",
      texto:
        "Deja la moto en la entrada, donde está el letrero azul que dice \"La Gruta\". Camina hasta el final de la acera y encontrarás el santuario; baja la pendiente por el camino de tierra y entrarás a la cueva por un pequeño riachuelo. Se cruza en unos 20 minutos (lleva linterna y casco).",
      mapsNombre: "La Gruta Bocas del Toro",
    },
    {
      icono: "🐉",
      nombre: "Bocas del Drago",
      texto:
        "Cuenta la leyenda que los piratas llegaban aquí en sus barcos para escapar de las tormentas, gracias a lo tranquilas de sus aguas — de ahí el nombre \"Boca del Dragón\".",
      mapsNombre: "Boca del Drago",
    },
    {
      icono: "🌅",
      nombre: "Starfish Beach (atardecer)",
      texto:
        "Al final de la calle asfaltada en Bocas del Drago, gira a la izquierda. Deja el vehículo donde veas más motos estacionadas, junto a un restaurante (no se paga por dejarlo ahí). Desde ahí, toma un taxi bote por $2, o camina 15 minutos por un sendero seguro junto al manglar. La caída del sol se ve mejor aquí.",
      mapsNombre: "Starfish Beach Bocas del Toro",
    },
  ],
  en: [
    {
      icono: "🏖️",
      nombre: "Playa Bluff",
      texto: "Starting point. Head toward Bombom Beach Rest.",
      mapsNombre: "Playa Bluff",
    },
    {
      icono: "💧",
      nombre: "Blue Lagoon / La Piscina",
      texto:
        "From the fence at the end of Bluff, walk about 1 hour.",
      mapsNombre: "Blue Lagoon Bluff Bocas del Toro",
    },
    {
      icono: "🤿",
      nombre: "Paunch Beach (snorkeling)",
      texto:
        "Ask at the Beach Bar facing the water where the snorkeling spot is — it's right next door. Head back the same way you came — there's no road connecting Bluff to Bocas del Drago.",
      mapsNombre: "Paunch Beach Bocas del Toro",
    },
    {
      icono: "♻️",
      nombre: "Plastic Bottle Village",
      texto:
        "A curious stop that shows how plastic affects a small Caribbean tourist island.",
      mapsNombre: "Plastic Bottle Village Bocas del Toro",
    },
    {
      icono: "🕳️",
      nombre: "La Gruta (the cave)",
      texto:
        "Leave your vehicle at the entrance, by the blue sign that says \"La Gruta\". Walk to the end of the path and you'll find the shrine; go down the dirt slope and enter the cave through a small stream. It takes about 20 minutes to cross (bring a flashlight and a helmet).",
      mapsNombre: "La Gruta Bocas del Toro",
    },
    {
      icono: "🐉",
      nombre: "Bocas del Drago",
      texto:
        "Legend says pirates used to sail here to escape storms thanks to the calm waters — hence the name \"Dragon's Mouth.\"",
      mapsNombre: "Boca del Drago",
    },
    {
      icono: "🌅",
      nombre: "Starfish Beach (sunset)",
      texto:
        "At the end of the paved road in Bocas del Drago, turn left. Park where you see other bikes parked, next to a restaurant (no charge to leave it there). From there, take a $2 water taxi, or walk 15 minutes along a safe path next to the mangroves. The sunset looks best from here.",
      mapsNombre: "Starfish Beach Bocas del Toro",
    },
  ],
};

RUTA.es.forEach((p) => (p.mapsLink = mapsQuery(p.mapsNombre)));
RUTA.en.forEach((p) => (p.mapsLink = mapsQuery(p.mapsNombre)));

// Consejos de seguridad — comunes a ambos vehículos, más los específicos.
const SEGURIDAD_COMUN = {
  es: [
    "En la ruta hacia Bluff el asfalto se termina y sigue una calle de piedra y arena — ten cuidado, podrías resbalarte o pinchar una llanta si vas muy rápido.",
    "En esa misma ruta hay un pequeño río que la atraviesa. Si la marea está alta, espera a que la ola retroceda antes de cruzar (usualmente después de 5 olas el nivel baja). Si el agua sigue muy alta, apaga el vehículo, busca la zona de piedras y cruza empujándolo a pie.",
    "Al final de Bluff hay una cerca: está prohibido pasar con el vehículo sin autorización del dueño (es propiedad privada, solo se puede cruzar a pie). Ese es el camino hacia la Piscina y Blue Lagoon.",
    "En Bluff está prohibido conducir por la playa — es zona protegida de anidación de tortugas.",
    "En la ruta hacia Bocas del Drago hay muchas curvas y zonas de construcción con tierra suelta — no vayas muy rápido, podrías resbalarte o salirte en una curva.",
    "Nunca dejes el casco sobre el vehículo — llévalo siempre contigo.",
    "Siempre debes conducir con el casco puesto, tú y tu acompañante, sin excepción. Si no lo haces, la policía puede detenerte y quitarte el vehículo.",
    "¿Algún problema en el camino? Contáctanos: +507 6768-5164 o +507 6909-2074.",
  ],
  en: [
    "On the way to Bluff, the pavement ends and turns into a dirt-and-rock road — be careful, you could slip or get a flat tire if you go too fast.",
    "On that same road there's a small stream that crosses it. If the tide is high, wait for the wave to pull back before crossing (the water level usually drops after about 5 waves). If the water stays too high, turn off the vehicle, find the rocky area, and cross while walking it across.",
    "At the end of Bluff there's a fence: it's forbidden to pass through with the vehicle without the owner's permission (it's private property — only foot traffic is allowed). That path leads to La Piscina and Blue Lagoon.",
    "Riding on the beach at Bluff is forbidden — it's a protected sea turtle nesting area.",
    "The road to Bocas del Drago has many curves and construction areas with loose dirt — don't go too fast, you could slip or slide off a curve.",
    "Never leave the helmet on the vehicle — always keep it with you.",
    "You and your passenger must always wear a helmet while riding, no exceptions. If not, police can stop you and impound the vehicle.",
    "Having trouble on the road? Contact us: +507 6768-5164 or +507 6909-2074.",
  ],
};

const SEGURIDAD_MOTO_EXTRA = {
  es: [
    "Arranca la moto solo cuando ya estés sentado en posición de manejo — son motos automáticas y podrías lastimarte si arranca antes de que estés listo.",
  ],
  en: [
    "Only start the moto once you're already seated in riding position — these are automatic mopeds and you could get hurt if it starts moving before you're ready.",
  ],
};

const SEGURIDAD_EBIKE_EXTRA = {
  es: [
    "El acelerador es muy sensible — ten cuidado cuando empujes la ebike a pie de no sujetar el acelerador por accidente, ya que puede salir disparada sin que estés preparado.",
    "La batería no es infinita: pedalea cuando puedas y usa el nivel de asistencia 2 o 3 para rendir más. Mantente atento a tu nivel; no nos hacemos responsables si te quedas sin batería en el camino.",
    "Siempre estaciona la ebike con la cadena puesta.",
  ],
  en: [
    "The throttle is very sensitive — be careful not to accidentally grip it while walking the ebike, since it can shoot forward before you're ready.",
    "The battery isn't unlimited: pedal when you can and use assist level 2 or 3 to make it last longer. Keep an eye on your battery level; we're not responsible if you run out on the road.",
    "Always park the ebike with the lock/chain on.",
  ],
};

export function consejosSeguridad(tipo, idioma) {
  const lang = idioma === "en" ? "en" : "es";
  const extra = tipo === "ebike" ? SEGURIDAD_EBIKE_EXTRA[lang] : SEGURIDAD_MOTO_EXTRA[lang];
  // El consejo del casco (arranque) va antes del teléfono de contacto;
  // insertamos el extra justo antes del último elemento (el teléfono).
  const base = [...SEGURIDAD_COMUN[lang]];
  const telefono = base.pop();
  return [...base, ...extra, telefono];
}

export const TEXTOS_EXITO = {
  es: {
    resenaTitulo: "¿Nos ayudas con una reseña?",
    resenaTexto: "Tu opinión ayuda a que más viajeros nos encuentren. Solo te toma un minuto:",
    resenaGoogle: "⭐ Dejar reseña en Google",
    resenaTripadvisor: "📝 Dejar reseña en TripAdvisor",
    seguridadTitulo: "Antes de salir: consejos de seguridad",
    rutaTitulo: "Nuestra ruta recomendada para hoy",
    verMapa: "Ver en Google Maps",
  },
  en: {
    resenaTitulo: "Could you leave us a review?",
    resenaTexto: "Your feedback helps more travelers find us. It only takes a minute:",
    resenaGoogle: "⭐ Leave a Google review",
    resenaTripadvisor: "📝 Leave a TripAdvisor review",
    seguridadTitulo: "Before you go: safety tips",
    rutaTitulo: "Our recommended route for today",
    verMapa: "View on Google Maps",
  },
};
