import { router } from 'expo-router';
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';

import { loadWebFonts } from '@/lib/webFonts';

// Portada para web: HTML y CSS directos para poder usar animaciones completas.
// La app de teléfono usa Landing.tsx.

const SPECIALISTS = ['tu pediatra', 'tu dentista', 'tu psicóloga', 'tu nutriólogo', 'tu ginecóloga', 'tu dermatólogo'];

const SPECIALTIES_A = ['👶 Pediatría', '🦷 Odontología', '🧠 Psicología', '🥗 Nutrición', '🤰 Ginecología', '🩺 Medicina general'];
const SPECIALTIES_B = ['🧴 Dermatología', '❤️ Cardiología', '👁️ Oftalmología', '🦴 Traumatología', '👂 Otorrinolaringología', '🧘 Fisioterapia'];

const STEPS = [
  { icon: '🔍', title: 'Encuentra a tu doctor', text: 'Busca por nombre, especialidad o ciudad, o usa el código que te compartió.' },
  { icon: '🗓️', title: 'Elige tu horario', text: 'Ve los días y horas libres de las próximas tres semanas y aparta el que te acomode.' },
  { icon: '💳', title: 'Paga y listo', text: 'Pagas en línea con tarjeta y tu cita queda confirmada al momento.' },
];

const AUDIENCES = {
  patient: {
    tab: 'Para pacientes',
    title: 'Deja de llamar al consultorio.',
    cta: 'Crear mi cuenta',
    role: undefined,
    points: [
      ['📅', 'Ve la agenda real de tu doctor y aparta en segundos, a cualquier hora.'],
      ['🔁', 'Cambia o cancela desde la app, con reembolso si lo haces a tiempo.'],
      ['🔔', 'Recibe un recordatorio un día antes de tu cita.'],
      ['📋', 'Todas tus citas, pasadas y próximas, en un solo lugar.'],
    ],
  },
  doctor: {
    tab: 'Para doctores',
    title: 'Llena tu agenda y cobra sin perseguir a nadie.',
    cta: 'Crear mi consultorio',
    role: 'doctor',
    points: [
      ['⏰', 'Publica tus horarios y días libres en minutos.'],
      ['💸', 'Tus pacientes pagan al agendar: menos citas perdidas.'],
      ['🏦', 'El dinero llega directo a tu cuenta bancaria.'],
      ['🔗', 'Comparte tu código y te encuentran al instante.'],
    ],
  },
} as const;

const FAQ = [
  ['¿Cuánto cuesta usar goodates?', 'Para pacientes es gratis: solo pagas el precio de la consulta que fija tu doctor.'],
  [
    '¿Puedo cambiar o cancelar mi cita?',
    'Sí, desde "Mis citas", hasta el límite de horas antes de la cita que marca cada doctor. Si cancelas a tiempo, te devolvemos el pago completo.',
  ],
  ['¿Qué pasa si el doctor cancela?', 'Te reembolsamos el pago completo automáticamente y te avisamos.'],
  [
    '¿Cómo sé que el doctor es real?',
    'Antes de que un doctor aparezca en las búsquedas, revisamos su cédula profesional en el Registro Nacional de Profesionistas.',
  ],
  [
    'Soy doctor, ¿cómo recibo mis pagos?',
    'Das de alta tu cuenta de cobro con Stripe (identificación, RFC y CLABE). Por cada consulta, Stripe deposita el pago en tu cuenta bancaria, menos la comisión de la plataforma.',
  ],
];

const signUp = (role?: string) => router.push({ pathname: '/sign-up', params: role ? { rol: role } : {} });

export function Landing() {
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(loadWebFonts, []);

  // Las secciones aparecen al llegar a ellas con el scroll.
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            observer.unobserve(e.target);
          }
        }),
      { threshold: 0.15 },
    );
    root.querySelectorAll('.gd-reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Barra de progreso de lectura y línea de los pasos.
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const onScroll = () => {
      const max = root.scrollHeight - root.clientHeight;
      root.style.setProperty('--gd-scroll', String(max > 0 ? root.scrollTop / max : 0));
      root.classList.toggle('is-scrolled', root.scrollTop > 12);
      const steps = root.querySelector<HTMLElement>('.gd-steps');
      if (steps) {
        const r = steps.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (window.innerHeight * 0.75 - r.top) / r.height));
        steps.style.setProperty('--gd-line', String(p));
      }
    };
    onScroll();
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => root.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div ref={scroller} className="gd">
      <style>{CSS}</style>
      <div className="gd-progress" />

      <header className="gd-nav">
        <div className="gd-wrap gd-nav-inner">
          <Wordmark />
          <nav className="gd-nav-links">
            <a href="#como-funciona" className="gd-link gd-hide-sm">
              Cómo funciona
            </a>
            <a href="#preguntas" className="gd-link gd-hide-sm">
              Preguntas
            </a>
            <button className="gd-btn gd-btn-ghost gd-btn-sm" onClick={() => router.push('/sign-in')}>
              Iniciar sesión
            </button>
          </nav>
        </div>
      </header>

      <Hero />

      <section className="gd-marquee-section" aria-label="Especialidades">
        <p className="gd-caption gd-reveal">Encuentra especialistas en</p>
        <Marquee items={SPECIALTIES_A} />
        <Marquee items={SPECIALTIES_B} reverse />
      </section>

      <section id="como-funciona" className="gd-section gd-tint">
        <div className="gd-wrap">
          <div className="gd-heading gd-reveal">
            <span className="gd-eyebrow">Cómo funciona</span>
            <h2>
              Tu cita en <em>tres pasos</em>
            </h2>
          </div>
          <ol className="gd-steps">
            <span className="gd-steps-line" aria-hidden />
            {STEPS.map((s, i) => (
              <li key={s.title} className="gd-step gd-reveal" style={{ '--d': `${i * 120}ms` } as CSSProperties}>
                <span className="gd-step-dot">{i + 1}</span>
                <div className="gd-card gd-step-card">
                  <span className="gd-step-icon">{s.icon}</span>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <Audience />

      <section id="preguntas" className="gd-section">
        <div className="gd-wrap gd-faq">
          <div className="gd-heading gd-reveal">
            <span className="gd-eyebrow">Dudas</span>
            <h2>
              Preguntas <em>frecuentes</em>
            </h2>
            <p className="gd-muted">¿No encuentras lo que buscas? Escríbenos desde tu perfil en la app.</p>
          </div>
          <div className="gd-reveal">
            {FAQ.map(([q, a]) => (
              <Faq key={q} q={q} a={a} />
            ))}
          </div>
        </div>
      </section>

      <section className="gd-section">
        <div className="gd-wrap">
          <div className="gd-final gd-reveal">
            <div className="gd-final-glow" aria-hidden />
            <h2>
              Tu próxima consulta, <em>a un clic</em>.
            </h2>
            <p>Crear tu cuenta toma menos de un minuto.</p>
            <div className="gd-cta-row gd-center">
              <button className="gd-btn gd-btn-light" onClick={() => signUp()}>
                Empezar ahora <span className="gd-arrow">→</span>
              </button>
              <button className="gd-btn gd-btn-outline-light" onClick={() => router.push('/sign-in')}>
                Ya tengo cuenta
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer className="gd-wrap gd-footer">
        <Wordmark small />
        <a
          href="/privacy"
          className="gd-link"
          onClick={(e) => {
            e.preventDefault();
            router.push('/privacy');
          }}
        >
          Aviso de privacidad
        </a>
      </footer>
    </div>
  );
}

function Wordmark({ small = false }: { small?: boolean }) {
  return (
    <span className={`gd-wordmark${small ? ' gd-wordmark-sm' : ''}`}>
      <span className="gd-wordmark-dot" aria-hidden />
      good<b>dates</b>
    </span>
  );
}

function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const [word, setWord] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setWord((w) => (w + 1) % SPECIALISTS.length), 2400);
    return () => clearInterval(t);
  }, []);

  // El teléfono se inclina siguiendo al mouse.
  function onMove(e: MouseEvent) {
    const el = heroRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', String((e.clientX - r.left) / r.width - 0.5));
    el.style.setProperty('--my', String((e.clientY - r.top) / r.height - 0.5));
  }

  return (
    <section ref={heroRef} className="gd-hero" onMouseMove={onMove}>
      <div className="gd-blobs" aria-hidden>
        <span className="gd-blob gd-blob-1" />
        <span className="gd-blob gd-blob-2" />
        <span className="gd-blob gd-blob-3" />
      </div>
      <div className="gd-grain" aria-hidden />

      <div className="gd-wrap gd-hero-grid">
        <div className="gd-hero-copy">
          <span className="gd-pill gd-in" style={{ '--d': '0ms' } as CSSProperties}>
            <span className="gd-live" /> Citas médicas en línea, confirmadas al momento
          </span>
          <h1>
            <span className="gd-line gd-in" style={{ '--d': '80ms' } as CSSProperties}>
              Agenda con
            </span>
            <span className="gd-line gd-rotator gd-in" style={{ '--d': '160ms' } as CSSProperties}>
              <span key={word} className="gd-rotator-word">
                {SPECIALISTS[word]}
              </span>
            </span>
            <span className="gd-line gd-in" style={{ '--d': '240ms' } as CSSProperties}>
              en menos de <span className="gd-underline">un minuto.</span>
            </span>
          </h1>
          <p className="gd-lead gd-in" style={{ '--d': '340ms' } as CSSProperties}>
            Encuentra a tu doctor, elige el horario que te acomode y paga en línea. Sin llamadas, sin filas y sin
            esperar a que te devuelvan el mensaje.
          </p>
          <div className="gd-cta-row gd-in" style={{ '--d': '420ms' } as CSSProperties}>
            <button className="gd-btn gd-btn-primary" onClick={() => signUp()}>
              Agendar una cita <span className="gd-arrow">→</span>
            </button>
            <button className="gd-btn gd-btn-outline" onClick={() => signUp('doctor')}>
              Soy doctor
            </button>
          </div>
          <ul className="gd-trust gd-in" style={{ '--d': '500ms' } as CSSProperties}>
            <li>🔒 Pago seguro con Stripe</li>
            <li>🩺 Cédula revisada</li>
            <li>↩️ Reembolso si cancelas a tiempo</li>
          </ul>
        </div>

        <div className="gd-hero-visual gd-in" style={{ '--d': '300ms' } as CSSProperties}>
          <div className="gd-orbit" aria-hidden>
            <span className="gd-float gd-float-1">✓ Cita confirmada</span>
            <span className="gd-float gd-float-2">🔔 Mañana, 10:30</span>
            <span className="gd-float gd-float-3">💳 Pago recibido</span>
          </div>
          <Phone />
        </div>
      </div>

      <a href="#como-funciona" className="gd-scroll-hint" aria-label="Ver más">
        <span />
      </a>
    </section>
  );
}

const SLOTS = [
  ['9:00', '9:30', '11:00', '12:30'],
  ['10:00', '10:30', '13:00', '16:30'],
  ['9:30', '12:00', '17:00', '18:30'],
];

function nextDays() {
  const days: Date[] = [];
  const d = new Date();
  while (days.length < 3) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) days.push(new Date(d));
  }
  return days;
}

const weekday = new Intl.DateTimeFormat('es-MX', { weekday: 'short' });
const dayLong = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

/** Teléfono con una demostración de agendar (no crea citas reales). */
function Phone() {
  const [days] = useState(nextDays);
  const [day, setDay] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'paying' | 'done'>('idle');

  function pay() {
    setState('paying');
    setTimeout(() => setState('done'), 1000);
  }

  return (
    <div className="gd-phone">
      <div className="gd-phone-notch" />
      <div className="gd-phone-screen">
        <div className="gd-phone-bar">
          <Wordmark small />
          <span className="gd-demo-tag">Demo · pruébala</span>
        </div>

        <div className="gd-doc">
          <span className="gd-avatar">👩‍⚕️</span>
          <div>
            <strong>Dra. Ana Pérez</strong>
            <small>Pediatría · Guadalajara</small>
          </div>
          <span className="gd-price">$600</span>
        </div>

        {state === 'done' ? (
          <div className="gd-success">
            <svg viewBox="0 0 52 52" className="gd-check" aria-hidden>
              <circle cx="26" cy="26" r="24" />
              <path d="M15 27 l7 7 l15 -16" />
            </svg>
            <strong>¡Cita confirmada!</strong>
            <small>
              {dayLong.format(days[day])} a las {slot}
            </small>
            <div className="gd-confetti" aria-hidden>
              {Array.from({ length: 14 }, (_, i) => (
                <i key={i} style={{ '--i': i } as CSSProperties} />
              ))}
            </div>
            <button
              className="gd-textbtn"
              onClick={() => {
                setSlot(null);
                setState('idle');
              }}
            >
              Probar otra vez
            </button>
          </div>
        ) : (
          <>
            <p className="gd-phone-label">Elige un día</p>
            <div className="gd-days">
              {days.map((d, i) => (
                <button
                  key={d.toISOString()}
                  className={`gd-day${i === day ? ' is-on' : ''}`}
                  onClick={() => {
                    setDay(i);
                    setSlot(null);
                  }}
                >
                  <small>{weekday.format(d).replace('.', '')}</small>
                  <b>{d.getDate()}</b>
                </button>
              ))}
            </div>
            <p className="gd-phone-label">Horarios libres</p>
            <div key={day} className="gd-slots">
              {SLOTS[day].map((s, i) => (
                <button
                  key={s}
                  className={`gd-slot${s === slot ? ' is-on' : ''}`}
                  style={{ '--d': `${i * 60}ms` } as CSSProperties}
                  onClick={() => setSlot(s)}
                >
                  {s}
                </button>
              ))}
            </div>
            <button className="gd-pay" disabled={!slot || state === 'paying'} onClick={pay}>
              {state === 'paying' ? <span className="gd-spinner" /> : slot ? `Pagar y agendar ${slot}` : 'Elige un horario'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Marquee({ items, reverse = false }: { items: readonly string[]; reverse?: boolean }) {
  const row = [...items, ...items];
  return (
    <div className="gd-marquee">
      <div className={`gd-marquee-track${reverse ? ' is-reverse' : ''}`}>
        {row.map((item, i) => (
          <span key={i} className="gd-chip" aria-hidden={i >= items.length}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function Audience() {
  const [key, setKey] = useState<keyof typeof AUDIENCES>('patient');
  const current = AUDIENCES[key];
  return (
    <section className="gd-section">
      <div className="gd-wrap">
        <div className="gd-segment gd-reveal" data-on={key}>
          <span className="gd-segment-pill" aria-hidden />
          {(Object.keys(AUDIENCES) as (keyof typeof AUDIENCES)[]).map((k) => (
            <button key={k} className={k === key ? 'is-on' : ''} onClick={() => setKey(k)}>
              {AUDIENCES[k].tab}
            </button>
          ))}
        </div>
        <div className="gd-audience gd-reveal">
          <div className="gd-audience-shine" aria-hidden />
          <div key={key} className="gd-audience-grid">
            <div className="gd-audience-copy">
              <h2>{current.title}</h2>
              <button className="gd-btn gd-btn-light" onClick={() => signUp(current.role)}>
                {current.cta} <span className="gd-arrow">→</span>
              </button>
            </div>
            <ul className="gd-points">
              {current.points.map(([icon, text], i) => (
                <li key={text} style={{ '--d': `${i * 80}ms` } as CSSProperties}>
                  <span>{icon}</span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`gd-faq-item${open ? ' is-open' : ''}`}>
      <button aria-expanded={open} onClick={() => setOpen(!open)}>
        {q}
        <span className="gd-faq-icon" aria-hidden />
      </button>
      <div className="gd-faq-body">
        <p>{a}</p>
      </div>
    </div>
  );
}

const CSS = `
.gd {
  --primary: #B4532A; --primary-dark: #8E3E1D; --primary-light: #FBE6DA;
  --sun: #F6C453; --sage: #9DB89A; --blush: #F4B6A0;
  --text: #2B1D16; --muted: #76625A; --border: #EFE1D6; --bg: #FFF9F4; --card: #fff;
  --serif: 'Fraunces', Georgia, serif; --sans: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  position: absolute; inset: 0; overflow-y: auto; overflow-x: hidden; scroll-behavior: smooth;
  background: var(--bg); color: var(--text); font-family: var(--sans); -webkit-font-smoothing: antialiased;
}
.gd *, .gd *::before, .gd *::after { box-sizing: border-box; }
.gd h1, .gd h2, .gd h3, .gd p, .gd ul, .gd ol { margin: 0; padding: 0; }
.gd ul, .gd ol { list-style: none; }
/* :where() deja estos reinicios sin peso para que las clases de abajo ganen. */
:where(.gd) :where(button) { font: inherit; cursor: pointer; border: 0; background: none; color: inherit; padding: 0; }
:where(.gd) :where(a) { color: inherit; text-decoration: none; }
.gd em { font-style: italic; color: var(--primary); }
.gd-wrap { width: 100%; max-width: 1160px; margin: 0 auto; padding: 0 20px; }
.gd-center { justify-content: center; }
.gd-muted { color: var(--muted); font-size: 16px; line-height: 1.6; }

/* Progreso */
.gd-progress { position: sticky; top: 0; height: 3px; z-index: 30; background: linear-gradient(90deg, var(--sun), var(--primary));
  transform-origin: left; transform: scaleX(var(--gd-scroll, 0)); }

/* Barra superior */
.gd-nav { position: sticky; top: 3px; z-index: 20; transition: background .3s, box-shadow .3s, backdrop-filter .3s; }
.gd.is-scrolled .gd-nav { background: rgba(255,249,244,.75); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); box-shadow: 0 1px 0 var(--border); }
.gd-nav-inner { display: flex; align-items: center; justify-content: space-between; height: 72px; }
.gd-nav-links { display: flex; align-items: center; gap: 24px; }
.gd-link { font-weight: 600; font-size: 15px; color: var(--muted); position: relative; transition: color .2s; }
.gd-link::after { content: ''; position: absolute; left: 0; right: 0; bottom: -4px; height: 2px; background: var(--primary); transform: scaleX(0); transform-origin: right; transition: transform .3s; }
.gd-link:hover { color: var(--text); }
.gd-link:hover::after { transform: scaleX(1); transform-origin: left; }
.gd-wordmark { display: inline-flex; align-items: center; font-family: var(--serif); font-size: 26px; font-weight: 700; letter-spacing: -.5px; }
.gd-wordmark b { color: var(--primary); font-weight: 700; }
.gd-wordmark-sm { font-size: 18px; }
.gd-wordmark-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--primary); margin-right: 8px; box-shadow: 10px -6px 0 -2px var(--sun); animation: gd-bob 3s ease-in-out infinite; }
.gd-wordmark-sm .gd-wordmark-dot { width: 7px; height: 7px; margin-right: 6px; box-shadow: 7px -4px 0 -1.5px var(--sun); }

/* Botones */
.gd-btn { position: relative; overflow: hidden; display: inline-flex; align-items: center; gap: 8px; border-radius: 999px; padding: 16px 28px; font-weight: 700; font-size: 16px; transition: transform .2s, box-shadow .2s, background .2s; }
.gd-btn::before { content: ''; position: absolute; top: 0; left: -120%; width: 60%; height: 100%; background: linear-gradient(100deg, transparent, rgba(255,255,255,.45), transparent); transform: skewX(-20deg); transition: left .6s; }
.gd-btn:hover { transform: translateY(-2px); }
.gd-btn:hover::before { left: 140%; }
.gd-btn:active { transform: scale(.97); }
.gd-btn-sm { padding: 10px 20px; font-size: 15px; }
.gd-btn-primary { background: var(--primary); color: #fff; box-shadow: 0 10px 30px -10px rgba(180,83,42,.7); }
.gd-btn-primary:hover { background: var(--primary-dark); box-shadow: 0 16px 36px -12px rgba(180,83,42,.8); }
.gd-btn-outline { border: 1.5px solid var(--primary); color: var(--primary); }
.gd-btn-outline:hover { background: var(--primary-light); }
.gd-btn-ghost { background: var(--card); border: 1px solid var(--border); color: var(--primary); }
.gd-btn-light { background: #fff; color: var(--primary); }
.gd-btn-outline-light { border: 1.5px solid rgba(255,255,255,.7); color: #fff; }
.gd-btn-outline-light:hover { background: rgba(255,255,255,.12); }
.gd-arrow { display: inline-block; transition: transform .25s; }
.gd-btn:hover .gd-arrow { transform: translateX(4px); }
.gd-cta-row { display: flex; flex-wrap: wrap; gap: 12px; }

/* Portada */
.gd-hero { position: relative; padding: 40px 0 96px; overflow: hidden; --mx: 0; --my: 0; }
.gd-blobs { position: absolute; inset: 0; filter: blur(60px); opacity: .9; pointer-events: none; }
.gd-blob { position: absolute; border-radius: 50%; }
.gd-blob-1 { width: 560px; height: 560px; right: -120px; top: -160px; background: var(--primary-light); animation: gd-drift1 18s ease-in-out infinite alternate; }
.gd-blob-2 { width: 380px; height: 380px; left: -120px; top: 280px; background: #FDEBB8; animation: gd-drift2 22s ease-in-out infinite alternate; }
.gd-blob-3 { width: 320px; height: 320px; right: 30%; bottom: -120px; background: #DDEBD9; animation: gd-drift3 20s ease-in-out infinite alternate; }
.gd-grain { position: absolute; inset: 0; pointer-events: none; opacity: .35; mix-blend-mode: multiply;
  background-image: radial-gradient(rgba(43,29,22,.08) 1px, transparent 1px); background-size: 4px 4px; }
.gd-hero-grid { position: relative; display: grid; grid-template-columns: 1.1fr 1fr; gap: 48px; align-items: center; }
.gd-hero-copy { display: flex; flex-direction: column; gap: 24px; }
.gd-pill { align-self: flex-start; display: inline-flex; align-items: center; gap: 10px; background: rgba(255,255,255,.8); border: 1px solid var(--border); border-radius: 999px; padding: 8px 14px; font-size: 13px; font-weight: 600; backdrop-filter: blur(6px); }
.gd-live { width: 8px; height: 8px; border-radius: 50%; background: #2F855A; box-shadow: 0 0 0 0 rgba(47,133,90,.6); animation: gd-ping 1.8s infinite; }
.gd h1 { font-family: var(--serif); font-weight: 700; font-size: clamp(44px, 6.4vw, 78px); line-height: 1.02; letter-spacing: -2px; display: flex; flex-direction: column; }
.gd-line { display: block; }
.gd-rotator { position: relative; height: 1.08em; overflow: hidden; color: var(--primary); font-style: italic; font-weight: 500; }
.gd-rotator-word { display: inline-block; animation: gd-word 2.4s cubic-bezier(.2,.8,.2,1) both; }
.gd-underline { position: relative; white-space: nowrap; }
.gd-underline::after { content: ''; position: absolute; left: 0; right: 0; bottom: .05em; height: .14em; border-radius: 99px; background: var(--sun); z-index: -1; transform-origin: left; animation: gd-draw 1s .9s cubic-bezier(.2,.8,.2,1) both; }
.gd-lead { font-size: 19px; line-height: 1.65; color: var(--muted); max-width: 540px; }
.gd-trust { display: flex; flex-wrap: wrap; gap: 8px 20px; font-size: 14px; font-weight: 500; color: var(--muted); }

.gd-in { opacity: 0; animation: gd-rise .9s cubic-bezier(.2,.8,.2,1) var(--d, 0ms) both; }

.gd-hero-visual { position: relative; display: flex; justify-content: center; perspective: 1200px; }
.gd-phone { position: relative; width: 320px; border-radius: 44px; padding: 12px; background: #1E1512;
  box-shadow: 0 50px 100px -30px rgba(122,58,28,.55), 0 0 0 1px rgba(255,255,255,.06) inset;
  transform: rotateY(calc(var(--mx) * 14deg)) rotateX(calc(var(--my) * -10deg)); transition: transform .3s ease-out;
  animation: gd-float 6s ease-in-out infinite; }
.gd-phone-notch { position: absolute; top: 20px; left: 50%; width: 90px; height: 24px; margin-left: -45px; border-radius: 99px; background: #1E1512; z-index: 2; }
.gd-phone-screen { background: var(--bg); border-radius: 34px; padding: 52px 18px 22px; min-height: 520px; display: flex; flex-direction: column; gap: 14px; overflow: hidden; position: relative; }
.gd-phone-bar { display: flex; align-items: center; justify-content: space-between; }
.gd-demo-tag { font-size: 11px; font-weight: 700; color: var(--primary); background: var(--primary-light); border-radius: 99px; padding: 4px 8px; }
.gd-doc { display: flex; align-items: center; gap: 12px; background: #fff; border-radius: 20px; padding: 12px; border: 1px solid var(--border); }
.gd-doc strong { display: block; font-size: 15px; }
.gd-doc small { color: var(--muted); font-size: 12px; }
.gd-doc > div { flex: 1; }
.gd-avatar { width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center; font-size: 22px; background: linear-gradient(135deg, var(--primary-light), #FDEBB8); }
.gd-price { font-weight: 800; color: var(--primary); }
.gd-phone-label { font-size: 12px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .8px; }
.gd-days { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.gd-day { display: flex; flex-direction: column; align-items: center; padding: 10px 0; border-radius: 16px; border: 1px solid var(--border); background: #fff; transition: all .25s; }
.gd-day small { font-size: 12px; color: var(--muted); text-transform: capitalize; }
.gd-day b { font-size: 20px; }
.gd-day:hover { border-color: var(--primary); }
.gd-day.is-on { background: var(--text); border-color: var(--text); color: #fff; transform: translateY(-2px); }
.gd-day.is-on small { color: var(--primary-light); }
.gd-slots { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.gd-slot { padding: 11px 0; border-radius: 14px; border: 1.5px solid var(--primary); color: var(--primary); font-weight: 700; background: #fff;
  transition: all .2s; animation: gd-pop .45s cubic-bezier(.2,.8,.2,1) var(--d) both; }
.gd-slot:hover { background: var(--primary-light); }
.gd-slot.is-on { background: var(--primary); color: #fff; transform: scale(1.04); box-shadow: 0 8px 20px -8px rgba(180,83,42,.8); }
.gd-pay { margin-top: auto; height: 52px; border-radius: 999px; background: var(--primary); color: #fff; font-weight: 700; font-size: 15px; display: grid; place-items: center; transition: opacity .2s, transform .2s; }
.gd-pay:disabled { opacity: .45; cursor: default; }
.gd-pay:not(:disabled):hover { transform: translateY(-1px); }
.gd-spinner { width: 20px; height: 20px; border-radius: 50%; border: 2.5px solid rgba(255,255,255,.4); border-top-color: #fff; animation: gd-spin .7s linear infinite; }
.gd-success { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; text-align: center; position: relative; animation: gd-pop .5s both; }
.gd-success strong { font-family: var(--serif); font-size: 24px; }
.gd-success small { color: var(--muted); font-size: 14px; }
.gd-check { width: 76px; height: 76px; }
.gd-check circle { fill: #2F855A; transform-origin: center; animation: gd-pop .5s cubic-bezier(.2,1.4,.4,1) both; }
.gd-check path { fill: none; stroke: #fff; stroke-width: 4.5; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 40; stroke-dashoffset: 40; animation: gd-stroke .45s .35s ease-out forwards; }
.gd-textbtn { color: var(--primary); font-weight: 700; padding: 8px; margin-top: 6px; }
.gd-confetti { position: absolute; top: 30%; left: 50%; pointer-events: none; }
.gd-confetti i { position: absolute; width: 8px; height: 12px; border-radius: 2px; background: var(--primary);
  --a: calc(var(--i) * 25.7deg); animation: gd-burst 1.1s cubic-bezier(.2,.8,.2,1) forwards; opacity: 0; }
.gd-confetti i:nth-child(3n) { background: var(--sun); }
.gd-confetti i:nth-child(3n+1) { background: var(--sage); }

.gd-orbit { position: absolute; inset: 0; pointer-events: none; z-index: 3; }
.gd-float { position: absolute; background: #fff; border: 1px solid var(--border); border-radius: 16px; padding: 10px 14px; font-weight: 700; font-size: 14px; white-space: nowrap;
  box-shadow: 0 20px 40px -18px rgba(122,58,28,.45);
  transform: translate(calc(var(--mx) * -30px), calc(var(--my) * -30px)); transition: transform .3s ease-out; }
.gd-float-1 { top: 18%; left: -2%; color: #2F855A; animation: gd-float 5s ease-in-out infinite; }
.gd-float-2 { top: 48%; right: -4%; animation: gd-float 6s .8s ease-in-out infinite; }
.gd-float-3 { bottom: 10%; left: 2%; animation: gd-float 5.5s 1.4s ease-in-out infinite; }

.gd-scroll-hint { position: absolute; left: 50%; bottom: 24px; width: 26px; height: 42px; margin-left: -13px; border: 2px solid rgba(43,29,22,.25); border-radius: 99px; }
.gd-scroll-hint span { position: absolute; left: 50%; top: 8px; width: 4px; height: 8px; margin-left: -2px; border-radius: 2px; background: var(--primary); animation: gd-wheel 1.6s infinite; }

/* Especialidades */
.gd-marquee-section { padding: 16px 0 56px; display: flex; flex-direction: column; gap: 14px; }
.gd-caption { text-align: center; color: var(--muted); font-weight: 600; margin-bottom: 8px !important; }
.gd-marquee { overflow: hidden; -webkit-mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent); mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent); }
.gd-marquee-track { display: flex; gap: 12px; width: max-content; animation: gd-marquee 40s linear infinite; }
.gd-marquee-track.is-reverse { animation-direction: reverse; animation-duration: 46s; }
.gd-marquee:hover .gd-marquee-track { animation-play-state: paused; }
.gd-chip { background: #fff; border: 1px solid var(--border); border-radius: 999px; padding: 12px 20px; font-weight: 600; white-space: nowrap; transition: transform .2s, border-color .2s; }
.gd-chip:hover { transform: translateY(-3px); border-color: var(--primary); }

/* Secciones */
.gd-section { padding: 96px 0; }
.gd-tint { background: linear-gradient(180deg, var(--primary-light), #FFF1E7); }
.gd-heading { display: flex; flex-direction: column; gap: 12px; margin-bottom: 48px; }
.gd-eyebrow { color: var(--primary); font-weight: 800; font-size: 13px; letter-spacing: 1.6px; text-transform: uppercase; }
.gd h2 { font-family: var(--serif); font-weight: 700; font-size: clamp(34px, 4.4vw, 52px); line-height: 1.08; letter-spacing: -1px; }
.gd h3 { font-size: 20px; font-weight: 700; }
.gd-card { background: #fff; border-radius: 28px; padding: 32px; border: 1px solid rgba(239,225,214,.8); transition: transform .3s, box-shadow .3s; }
.gd-card:hover { transform: translateY(-8px) rotate(-.4deg); box-shadow: 0 30px 60px -30px rgba(122,58,28,.4); }

.gd-reveal { opacity: 0; transform: translateY(40px); transition: opacity .9s cubic-bezier(.2,.8,.2,1) var(--d, 0ms), transform .9s cubic-bezier(.2,.8,.2,1) var(--d, 0ms); }
.gd-reveal.is-in { opacity: 1; transform: none; }

/* Pasos */
.gd-steps { position: relative; display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; padding-top: 44px; }
.gd-steps-line { position: absolute; top: 18px; left: 16%; right: 16%; height: 3px; border-radius: 99px; background: rgba(180,83,42,.15); overflow: hidden; }
.gd-steps-line::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, var(--sun), var(--primary)); transform-origin: left; transform: scaleX(var(--gd-line, 0)); transition: transform .15s linear; }
.gd-step { position: relative; display: flex; flex-direction: column; align-items: center; }
.gd-step-dot { position: absolute; top: -44px; width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; font-weight: 800; color: #fff; background: var(--primary); box-shadow: 0 0 0 6px var(--primary-light); }
.gd-step-card { display: flex; flex-direction: column; gap: 12px; width: 100%; }
.gd-step-card p { color: var(--muted); line-height: 1.6; }
.gd-step-icon { width: 60px; height: 60px; border-radius: 20px; display: grid; place-items: center; font-size: 28px; background: var(--bg); transition: transform .4s cubic-bezier(.2,1.4,.4,1); }
.gd-card:hover .gd-step-icon { transform: rotate(-8deg) scale(1.12); }

/* Pacientes / doctores */
.gd-segment { position: relative; display: flex; width: max-content; margin: 0 auto 28px; padding: 5px; background: #fff; border: 1px solid var(--border); border-radius: 999px; }
.gd-segment button { position: relative; z-index: 1; padding: 12px 24px; border-radius: 999px; font-weight: 700; transition: color .3s; }
.gd-segment button.is-on { color: #fff; }
.gd-segment-pill { position: absolute; top: 5px; bottom: 5px; left: 5px; width: calc(50% - 5px); border-radius: 999px; background: var(--text); transition: transform .45s cubic-bezier(.2,.9,.2,1.1); }
.gd-segment[data-on="doctor"] .gd-segment-pill { transform: translateX(100%); }
.gd-audience { position: relative; overflow: hidden; border-radius: 40px; padding: 56px; color: #fff;
  background: radial-gradient(circle at 15% 20%, #D06A3C, transparent 50%), radial-gradient(circle at 85% 90%, #8E3E1D, transparent 55%), var(--primary); }
.gd-audience-shine { position: absolute; inset: -50%; background: conic-gradient(from 0deg, transparent, rgba(255,255,255,.12), transparent 30%); animation: gd-spin 14s linear infinite; }
.gd-audience-grid { position: relative; display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; animation: gd-fade .6s both; }
.gd-audience-copy { display: flex; flex-direction: column; align-items: flex-start; gap: 28px; }
.gd-points { display: flex; flex-direction: column; gap: 12px; }
.gd-points li { display: flex; align-items: center; gap: 14px; padding: 16px 18px; border-radius: 20px; background: rgba(255,255,255,.12); backdrop-filter: blur(4px); font-weight: 500; line-height: 1.5;
  animation: gd-slide .6s cubic-bezier(.2,.8,.2,1) var(--d) both; transition: background .2s, transform .2s; }
.gd-points li:hover { background: rgba(255,255,255,.2); transform: translateX(6px); }
.gd-points li span { font-size: 22px; }

/* Preguntas */
.gd-faq { display: grid; grid-template-columns: .8fr 1.2fr; gap: 64px; }
.gd-faq-item { border-bottom: 1px solid var(--border); }
.gd-faq-item button { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 24px 0; text-align: left; font-size: 18px; font-weight: 700; transition: color .2s; }
.gd-faq-item button:hover { color: var(--primary); }
.gd-faq-icon { position: relative; flex: none; width: 32px; height: 32px; border-radius: 50%; background: var(--primary-light); transition: transform .35s, background .3s; }
.gd-faq-icon::before, .gd-faq-icon::after { content: ''; position: absolute; left: 50%; top: 50%; width: 12px; height: 2px; margin: -1px 0 0 -6px; background: var(--primary); border-radius: 2px; transition: transform .35s; }
.gd-faq-icon::after { transform: rotate(90deg); }
.gd-faq-item.is-open .gd-faq-icon { transform: rotate(180deg); background: var(--primary); }
.gd-faq-item.is-open .gd-faq-icon::before, .gd-faq-item.is-open .gd-faq-icon::after { background: #fff; }
.gd-faq-item.is-open .gd-faq-icon::after { transform: rotate(0); }
.gd-faq-body { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .4s cubic-bezier(.2,.8,.2,1); }
.gd-faq-body p { overflow: hidden; color: var(--muted); line-height: 1.7; font-size: 16px; }
.gd-faq-item.is-open .gd-faq-body { grid-template-rows: 1fr; }
.gd-faq-item.is-open .gd-faq-body p { padding-bottom: 24px; }

/* Llamado final */
.gd-final { position: relative; overflow: hidden; text-align: center; border-radius: 40px; padding: 80px 24px; color: #fff; background: var(--text); display: flex; flex-direction: column; align-items: center; gap: 16px; }
.gd-final h2 { position: relative; }
.gd-final h2 em { color: var(--sun); }
.gd-final p { position: relative; color: rgba(255,255,255,.7); font-size: 18px; margin-bottom: 12px; }
.gd-final .gd-cta-row { position: relative; }
.gd-final-glow { position: absolute; width: 600px; height: 600px; left: 50%; top: 50%; margin: -300px 0 0 -300px; border-radius: 50%;
  background: radial-gradient(circle, rgba(180,83,42,.55), transparent 60%); animation: gd-breathe 6s ease-in-out infinite; }

.gd-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 24px; padding-bottom: 40px; border-top: 1px solid var(--border); }

/* Animaciones */
@keyframes gd-rise { from { opacity: 0; transform: translateY(30px); filter: blur(6px); } to { opacity: 1; transform: none; filter: none; } }
@keyframes gd-word { 0% { transform: translateY(100%); opacity: 0; } 15%, 85% { transform: none; opacity: 1; } 100% { transform: translateY(-100%); opacity: 0; } }
@keyframes gd-draw { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes gd-float { 0%, 100% { translate: 0 0; } 50% { translate: 0 -14px; } }
@keyframes gd-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
@keyframes gd-ping { 0% { box-shadow: 0 0 0 0 rgba(47,133,90,.6); } 100% { box-shadow: 0 0 0 10px rgba(47,133,90,0); } }
@keyframes gd-drift1 { to { transform: translate(-120px, 80px) scale(1.15); } }
@keyframes gd-drift2 { to { transform: translate(140px, -60px) scale(.9); } }
@keyframes gd-drift3 { to { transform: translate(-160px, -80px) scale(1.2); } }
@keyframes gd-marquee { to { transform: translateX(calc(-50% - 6px)); } }
@keyframes gd-pop { from { opacity: 0; transform: scale(.8); } to { opacity: 1; transform: scale(1); } }
@keyframes gd-stroke { to { stroke-dashoffset: 0; } }
@keyframes gd-spin { to { transform: rotate(360deg); } }
@keyframes gd-burst { 0% { opacity: 1; transform: rotate(var(--a)) translateY(0) rotate(0); } 100% { opacity: 0; transform: rotate(var(--a)) translateY(-120px) rotate(540deg); } }
@keyframes gd-wheel { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(14px); } }
@keyframes gd-fade { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes gd-slide { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: none; } }
@keyframes gd-breathe { 0%, 100% { transform: scale(1); opacity: .8; } 50% { transform: scale(1.25); opacity: 1; } }

/* Celular */
@media (max-width: 900px) {
  .gd-hero { padding-bottom: 72px; }
  .gd-hero-grid, .gd-audience-grid, .gd-faq { grid-template-columns: 1fr; gap: 40px; }
  .gd-hero-visual { margin-top: 12px; }
  .gd-steps { grid-template-columns: 1fr; gap: 56px; padding-top: 44px; }
  .gd-steps-line { display: none; }
  .gd-audience { padding: 36px 24px; border-radius: 32px; }
  .gd-section { padding: 72px 0; }
  .gd-hide-sm { display: none; }
  .gd-float-2 { display: none; }
  .gd-scroll-hint { display: none; }
}
@media (max-width: 420px) {
  .gd-phone { width: 290px; }
  .gd-float { font-size: 12px; padding: 8px 10px; }
}
@media (prefers-reduced-motion: reduce) {
  .gd *, .gd *::before, .gd *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
  .gd-reveal, .gd-in { opacity: 1; transform: none; }
}
`;
