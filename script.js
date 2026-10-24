// --- CONFIGURACIÓN DE IA Y ESTADO GLOBAL ---
// ¡ATENCIÓN!: Reemplaza esto con tu clave de OpenAI o configúralo en un entorno seguro
const OPENAI_API_KEY = "TU_CLAVE_API_AQUI"; 
let penalizacionAtencion = 0; 

// --- CONFIGURACIÓN DE FIREBASE FIRESTORE ---
const firebaseConfig = {
    apiKey: "AIzaSyDemoKey_ReplaceWithYourKey",
    authDomain: "interviewsim-ai.firebaseapp.com",
    projectId: "interviewsim-ai",
    storageBucket: "interviewsim-ai.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef123456"
};

// Inicializar Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// --- RUTAS Y PERFILES DE ENTREVISTADORAS ---
const entrevistasConfig = {
    1: { nombre: 'Sofia', avatar: 'img/avatar1.png', rol: 'Filtro Inicial' },
    2: { nombre: 'Elena', avatar: 'img/avatar2.png', rol: 'Especialista Situacional' },
    3: { nombre: 'Valeria', avatar: 'img/avatar3.png', rol: 'Líder de Selección' }
};

const mapaCarrerasPuestos = {
    "Administración de Empresas": ["Asistente de Gestión Humana", "Coordinador de Operaciones", "Analista de Procesos", "Supervisora de Servicio"],
    "Contaduría Pública": ["Auxiliar Contable", "Analista de Impuestos", "Asistente de Auditoría", "Contador Junior"],
    "Administración Financiera": ["Analista de Crédito y Riesgo", "Asistente de Tesorería", "Analista Financiero Junior"],
    "Negocios Internacionales": ["Analista de Compras Int.", "Coordinador de Logística", "Ejecutivo de Comex"],
    "Ingeniería de Software": ["Junior Frontend Developer", "Junior Backend Developer", "QA Software Tester"],
    "Ingeniería de Sistemas": ["Administrador DBA", "Ingeniero Cloud Junior", "Soporte Técnico Especializado"],
    "Ciencia de Datos e IA": ["Junior Data Analyst", "Data Engineer Trainee", "Especialista BI"],
    "Ciberseguridad y Redes": ["Analista SOC Nivel 1", "Auditor de Seguridad", "Ethical Hacker Junior"],
    "Diseño UX/UI y Producto": ["UX/UI Designer Junior", "UX Researcher Trainee", "Diseñador Web"]
};

// --- SECUENCIAS CONVERSACIONALES BASE ---
const secuenciasPreguntas = {
    1: [
        "Para comenzar, cuéntame un poco cómo aplicarías tus conocimientos en {concepto} para el puesto de {puesto}.",
        "Interesante. Tomando en cuenta eso que mencionas, si mañana te asignan evaluar un proceso usando {tecnologia}, ¿por dónde empezarías?",
        "Entiendo. Ahora imagina que en ese mismo proceso surge un problema relacionado con {concepto2}, ¿cómo lo solucionarías?",
        "Claro, tiene sentido. ¿Y qué controles específicos usarías en ese caso para asegurar que el problema no vuelva a pasar?",
        "Muy bien. Para cerrar este tema, ¿cómo garantizarías que tu trabajo mantenga un alto nivel de calidad a largo plazo?"
    ],
    2: [
        "Para empezar, cuéntame sobre alguna experiencia donde hayas tenido que coordinar tareas de {carrera} bajo presión.",
        "Ya veo. Y si en un escenario similar surge un desacuerdo con tu equipo sobre el uso de {tecnologia}, ¿cómo lo manejas?",
        "Entiendo tu punto. Supongamos ahora que, además de ese desacuerdo, te cambian las prioridades de un día para otro. ¿Cómo reorganizas tu trabajo?",
        "Vale, perfecto. ¿Y de qué manera verificas que no se te escape ningún detalle importante al hacer esos cambios rápidos?",
        "Excelente. Por último, ¿cómo mides que esas decisiones rápidas realmente fueron efectivas para el área?"
    ],
    3: [
        "Empecemos hablando de estrategia. Frente a un problema grave que compromete los objetivos de {carrera}, ¿cuál es tu plan de acción inicial como {puesto}?",
        "Me gusta ese enfoque. Si para ejecutar ese plan necesitaras implementar una mejora en {tecnologia}, ¿cómo convencerías a la gerencia?",
        "Comprendo. Ahora, si durante esa implementación identificas ineficiencias graves o resistencia al cambio, ¿qué harías?",
        "Tiene lógica. En medio de toda esa gestión, ¿cómo garantizas la confidencialidad y el control de la información?",
        "Muy clara tu postura. Para finalizar, si los recursos para este proyecto se reducen a la mitad de repente, ¿qué priorizarías y por qué?"
    ]
};

const conceptos = ["Planificación Estratégica", "Gestión de Indicadores", "Auditoría de Calidad"];
const conceptos2 = ["Enfoque Reactivo", "Sistemas Centralizados", "Gestión Operativa"];
const tecnologias = ["Herramientas de Análisis", "Sistemas ERP/CRM", "Tableros de Control"];

function generarHiloDeConversacion(nivel, puesto, carrera) {
    const hiloBase = secuenciasPreguntas[nivel];
    const c1 = conceptos[Math.floor(Math.random() * conceptos.length)];
    const c2 = conceptos2[Math.floor(Math.random() * conceptos2.length)];
    const tec = tecnologias[Math.floor(Math.random() * tecnologias.length)];

    let preguntasGeneradas = [];
    for(let i = 0; i < hiloBase.length; i++) {
        let preguntaLimpia = hiloBase[i]
            .replace(/{puesto}/g, puesto)
            .replace(/{carrera}/g, carrera)
            .replace(/{concepto}/g, c1)
            .replace(/{concepto2}/g, c2)
            .replace(/{tecnologia}/g, tec);
            
        preguntasGeneradas.push(preguntaLimpia);
    }
    return preguntasGeneradas;
}

// ESTADO GLOBAL
const CANTIDAD_PREGUNTAS_POR_RONDA = 5;
let usuario = { nombre: '', carrera: '', cargo: '', nivel: 1, sesionId: null };
let indicePreguntaActual = -1; 
let preguntasSimulacion = [];
let respuestasUsuario = [];
let temporizador;
let segundosRestantes = 120;
let reconocedor;
let estaGrabando = false;
let streamCamara = null;

function actualizarPuestos() {
    const carreraSelect = document.getElementById('carrera').value;
    const cargoSelect = document.getElementById('cargo');
    cargoSelect.innerHTML = '';

    const listaPuestos = mapaCarrerasPuestos[carreraSelect] || [];
    listaPuestos.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.innerText = p;
        cargoSelect.appendChild(opt);
    });
}
actualizarPuestos();

// RECONOCIMIENTO DE VOZ
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    reconocedor = new SpeechRecognition();
    reconocedor.continuous = true;
    reconocedor.interimResults = true;
    reconocedor.lang = 'es-ES';

    reconocedor.onresult = function(event) {
        let transcripcionTemporal = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            transcripcionTemporal += event.results[i][0].transcript;
        }
        document.getElementById('respuesta').value = transcripcionTemporal;
    };

    reconocedor.onerror = function() {
        detenerGrabacionAudio();
        document.getElementById('mic-status').innerText = "Error en micrófono. Puedes escribir tu respuesta.";
    };

    reconocedor.onend = function() {
        if (estaGrabando) detenerGrabacionAudio();
    };
}

function alternarGrabacionAudio() {
    if (!reconocedor) {
        alert("Tu navegador no soporta captura de micrófono. Puedes escribir.");
        return;
    }
    if (!estaGrabando) iniciarGrabacionAudio();
    else detenerGrabacionAudio();
}

function iniciarGrabacionAudio() {
    try {
        reconocedor.start();
        estaGrabando = true;
        const btn = document.getElementById('btn-mic');
        btn.classList.add('recording');
        document.getElementById('mic-icon').className = 'fa-solid fa-microphone-slash';
        document.getElementById('mic-btn-text').innerText = 'Detener Grabación';
        document.getElementById('mic-status').innerText = 'Escuchando tu respuesta...';
        document.getElementById('mic-status').style.color = 'var(--color-riesgo)';
    } catch (e) { console.error(e); }
}

function detenerGrabacionAudio() {
    if (reconocedor && estaGrabando) reconocedor.stop();
    estaGrabando = false;
    const btn = document.getElementById('btn-mic');
    btn.classList.remove('recording');
    document.getElementById('mic-icon').className = 'fa-solid fa-microphone';
    document.getElementById('mic-btn-text').innerText = 'Responder por Audio';
    document.getElementById('mic-status').innerText = 'Audio transcrito. Puedes continuar.';
    document.getElementById('mic-status').style.color = 'var(--color-acento-1)';
}

async function activarCamaraWeb() {
    try {
        streamCamara = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        document.getElementById('webcam-feed').srcObject = streamCamara;
    } catch (error) {
        console.warn("No se otorgó permiso para la cámara web:", error);
    }
}

function desactivarCamaraWeb() {
    if (streamCamara) {
        streamCamara.getTracks().forEach(track => track.stop());
        streamCamara = null;
    }
}

function mostrarSeccion(idSeccion) {
    document.querySelectorAll('.section-view').forEach(s => s.classList.remove('active'));
    document.getElementById(idSeccion).classList.add('active');
}

async function guardarEnBaseDeDatos(coleccion, datos) {
    try {
        await db.collection(coleccion).doc(datos.id || undefined).set(datos, { merge: true });
    } catch (e) {
        console.error("Error al guardar en BD:", e);
    }
}

// --- INICIAR SIMULACIÓN ---
function iniciarSimulacion() {
    const nombre = document.getElementById('nombre').value.trim();
    if (!nombre) {
        alert("Por favor, ingresa tu nombre completo.");
        return;
    }

    usuario.nombre = nombre;
    usuario.carrera = document.getElementById('carrera').value;
    usuario.cargo = document.getElementById('cargo').value;
    usuario.nivel = parseInt(document.getElementById('nivel').value);
    usuario.sesionId = "sesion_" + Date.now();
    penalizacionAtencion = 0; // Reiniciar penalización

    guardarEnBaseDeDatos("sesiones_entrevista", {
        id: usuario.sesionId,
        candidato: usuario.nombre,
        carrera: usuario.carrera,
        cargo: usuario.cargo,
        nivel: usuario.nivel,
        fechaInicio: new Date().toISOString(),
        estado: 'Iniciada'
    });

    // Cargar preguntas base (la 1ra siempre se usará, las demás serán sobrescritas por IA)
    preguntasSimulacion = generarHiloDeConversacion(usuario.nivel, usuario.cargo, usuario.carrera);

    indicePreguntaActual = -1;
    respuestasUsuario = [];

    document.getElementById('display-nivel').innerText = `Nivel ${usuario.nivel}`;
    document.getElementById('display-cargo').innerText = `${usuario.cargo} (${usuario.carrera})`;

    const configEntrevistadora = entrevistasConfig[usuario.nivel] || entrevistasConfig[1];
    document.getElementById('avatar-img').src = configEntrevistadora.avatar;

    mostrarSeccion('sec-simulador');
    activarCamaraWeb();

    lanzarSaludoFormal(configEntrevistadora);
}

// --- SALUDO INICIAL FLUIDO ---
function lanzarSaludoFormal(config) {
    document.getElementById('pregunta-titulo').innerText = `Entrevista en Vivo`;
    
    let nombreLimpio = usuario.nombre.replace(/([a-z])([A-Z])/g, '$1 $2');
    const textoSaludo = `¡Hola, ${nombreLimpio}! Qué gusto tenerte por acá. Soy ${config.nombre} y voy a acompañarte en esta entrevista para el puesto de ${usuario.cargo}. La idea es conversar de forma tranquila sobre tu experiencia en ${usuario.carrera}. Cuando quieras empezamos, ¡mucho éxito!`;
    
    document.getElementById('pregunta-texto').innerText = textoSaludo;
    document.getElementById('respuesta').value = '';
    document.getElementById('progreso-preguntas').innerText = `Presentación Inicial`;
    document.getElementById('btn-siguiente').innerHTML = `Comenzar Pregunta #1 <i class="fa-solid fa-arrow-right"></i>`;
    document.getElementById('btn-repetir').style.display = 'none';

    leerPreguntaEnVozAlta();
}

// --- CARGAR PREGUNTA EN PANTALLA ---
function cargarPregunta() {
    detenerGrabacionAudio();
    document.getElementById('pregunta-titulo').innerText = `Pregunta #${indicePreguntaActual + 1}`;
    
    let textoCompleto = preguntasSimulacion[indicePreguntaActual];

    if (indicePreguntaActual > 0) {
        const ultimaRespuesta = respuestasUsuario[indicePreguntaActual - 1];
        if (ultimaRespuesta.trim().length < 20) {
            textoCompleto = `Vale, me habría gustado un poco más de detalle ahí, pero sigamos. ${textoCompleto}`;
        }
    }

    document.getElementById('pregunta-texto').innerText = textoCompleto;
    document.getElementById('respuesta').value = '';
    document.getElementById('progreso-preguntas').innerText = `Pregunta ${indicePreguntaActual + 1} de ${CANTIDAD_PREGUNTAS_POR_RONDA}`;
    document.getElementById('btn-siguiente').innerHTML = `Responder y Continuar <i class="fa-solid fa-arrow-right"></i>`;

    leerPreguntaEnVozAlta();
    iniciarTemporizador(120);
}

// --- BOTÓN REPETIR PREGUNTA (NUEVO) ---
function repetirPregunta() {
    penalizacionAtencion += 5; // Resta puntos por distracción
    leerPreguntaEnVozAlta();
}

function leerPreguntaEnVozAlta() {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const texto = document.getElementById('pregunta-texto').innerText;
        const locucion = new SpeechSynthesisUtterance(texto);
        locucion.lang = 'es-ES';
        locucion.rate = 1.0;
        window.speechSynthesis.speak(locucion);
    }
}

function iniciarTemporizador(segundos) {
    clearInterval(temporizador);
    segundosRestantes = segundos;
    actualizarReloj();

    temporizador = setInterval(() => {
        segundosRestantes--;
        actualizarReloj();
        if (segundosRestantes <= 0) {
            clearInterval(temporizador);
            siguientePregunta();
        }
    }, 1000);
}

function actualizarReloj() {
    const mins = Math.floor(segundosRestantes / 60);
    const segs = segundosRestantes % 60;
    document.getElementById('tiempo').innerText = 
        `${mins.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
}

// --- LÓGICA DE SIGUIENTE PREGUNTA CON IA (MODIFICADA) ---
async function siguientePregunta() {
    detenerGrabacionAudio();
    const btnSiguiente = document.getElementById('btn-siguiente');
    const resp = document.getElementById('respuesta').value.trim();

    // Guardar respuesta del usuario
    if (indicePreguntaActual >= 0) {
        respuestasUsuario.push(resp);
        guardarEnBaseDeDatos(`sesiones_entrevista/${usuario.sesionId}/respuestas`, {
            id: `pregunta_${indicePreguntaActual + 1}`,
            pregunta: preguntasSimulacion[indicePreguntaActual],
            respuesta: resp,
            tiempoRestante: segundosRestantes
        });
    }

    indicePreguntaActual++;

    if (indicePreguntaActual < CANTIDAD_PREGUNTAS_POR_RONDA) {
        // Mostrar animación de Pensando...
        document.getElementById('pregunta-texto').style.display = 'none';
        document.getElementById('thinking-indicator').style.display = 'block';
        btnSiguiente.disabled = true;
        document.getElementById('btn-repetir').style.display = 'none';

        // Integración Real de la IA basada en la respuesta anterior (si no es la primera)
        if (indicePreguntaActual > 0) {
            const nuevaPreguntaIA = await generarPreguntaConIA(resp);
            // Sobrescribimos la pregunta predefinida con la nueva generada
            preguntasSimulacion[indicePreguntaActual] = nuevaPreguntaIA;
        }

        // Retraso artificial para simular realismo humano procesando
        setTimeout(() => {
            document.getElementById('thinking-indicator').style.display = 'none';
            document.getElementById('pregunta-texto').style.display = 'block';
            btnSiguiente.disabled = false;
            document.getElementById('btn-repetir').style.display = 'inline-block'; // Activar botón de repetir
            cargarPregunta();
        }, 2500);

    } else {
        clearInterval(temporizador);
        window.speechSynthesis.cancel();
        generarValoracion();
    }
}

// --- CONEXIÓN CON OPENAI (NUEVO) ---
async function generarPreguntaConIA(respuestaPrevia) {
    if(!OPENAI_API_KEY || OPENAI_API_KEY === "TU_CLAVE_API_AQUI") {
        // Fallback en caso de que no haya API Key configurada (sigue usando la pregunta base de la lista)
        console.warn("No hay API Key configurada. Usando pregunta base...");
        return preguntasSimulacion[indicePreguntaActual]; 
    }

    const prompt = `Eres un entrevistador corporativo evaluando a un candidato para el puesto de ${usuario.cargo} enfocado en el área de ${usuario.carrera}. 
    El candidato acaba de responder a tu última pregunta diciendo: "${respuestaPrevia}". 
    Genera UNA sola pregunta de seguimiento que sea breve, conversacional y directa (máximo 2 oraciones) basada estrictamente en lo que acaba de decir para profundizar en su respuesta, evaluar su nivel técnico o retar su lógica.`;

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{ role: "system", content: "Eres un entrevistador estricto pero natural." }, { role: "user", content: prompt }],
                max_tokens: 150,
                temperature: 0.7
            })
        });
        const data = await response.json();
        return data.choices[0].message.content.trim();
    } catch (error) {
        console.error("Error conectando a la IA:", error);
        return preguntasSimulacion[indicePreguntaActual]; // Fallback de seguridad
    }
}

// --- EVALUACIÓN FINAL Y NERVIOSISMO ---
function analizarNerviosismo(respuestas) {
    let contadorMuletillas = 0;
    const patronMuletillas = /\b(eh|este|mmm|o sea|bueno|pues|sabes|tipo)\b/gi;

    respuestas.forEach(r => {
        const coincidencias = r.match(patronMuletillas);
        if (coincidencias) contadorMuletillas += coincidencias.length;
    });

    let totalCaracteres = respuestas.reduce((acc, r) => acc + r.length, 0);

    if (totalCaracteres < 20) {
        return {
            nivel: "Riesgo Alto",
            mensaje: "Respuestas extremadamente breves o silencios prolongados. Se percibe inseguridad o falta de preparación en los contenidos."
        };
    } else if (contadorMuletillas > 4) {
        return {
            nivel: "Nerviosismo Moderado",
            mensaje: `Se detectaron ${contadorMuletillas} muletillas ("eh", "este", "o sea"). Haz pausas conscientes para estructurar mejor tu idea.`
        };
    } else {
        return {
            nivel: "Seguridad Alta",
            mensaje: "Excelente ritmo verbal, pausas adecuadas y un discurso con mucha firmeza."
        };
    }
}

function generarValoracion() {
    desactivarCamaraWeb();
    mostrarSeccion('sec-resultados');

    let totalCaracteres = respuestasUsuario.reduce((acc, r) => acc + r.length, 0);

    let puntajeTecnico = 0;
    let puntajeComunicacion = 0;
    let puntajeResolucion = 0;

    if (totalCaracteres >= 15) {
        puntajeTecnico = Math.min(100, Math.floor((totalCaracteres / 250) * 80) + (usuario.nivel * 4));
        puntajeComunicacion = Math.min(100, Math.floor((totalCaracteres / 200) * 85));
        puntajeResolucion = Math.min(100, Math.floor((totalCaracteres / 220) * 80));
    }

    // Calcular índice general y restar penalización por botón repetir
    let indiceGeneral = Math.round((puntajeTecnico * 0.4) + (puntajeComunicacion * 0.3) + (puntajeResolucion * 0.3));
    indiceGeneral = Math.max(0, indiceGeneral - penalizacionAtencion); // Evita números negativos

    document.getElementById('candidate-name').innerText = `Candidato: ${usuario.nombre} | ${usuario.cargo}`;
    document.getElementById('score-valor').innerText = `${indiceGeneral}%`;

    const circle = document.getElementById('score-circle');
    circle.className = 'score-circle ';
    
    if (indiceGeneral >= 80) {
        circle.classList.add('score-high');
        document.getElementById('score-status').innerText = "¡Preparación Alta!";
        document.getElementById('score-status').style.color = "var(--color-acento-1)";
    } else if (indiceGeneral >= 60) {
        circle.classList.add('score-mid');
        document.getElementById('score-status').innerText = "Preparación Media";
        document.getElementById('score-status').style.color = "var(--color-alerta)";
    } else {
        circle.classList.add('score-low');
        document.getElementById('score-status').innerText = "Riesgo / Requiere Práctica";
        document.getElementById('score-status').style.color = "var(--color-riesgo)";
    }

    document.getElementById('score-tecnico').innerText = `${puntajeTecnico}%`;
    document.getElementById('bar-tecnico').style.width = `${puntajeTecnico}%`;

    document.getElementById('score-comunicacion').innerText = `${puntajeComunicacion}%`;
    document.getElementById('bar-comunicacion').style.width = `${puntajeComunicacion}%`;

    document.getElementById('score-resolucion').innerText = `${puntajeResolucion}%`;
    document.getElementById('bar-resolucion').style.width = `${puntajeResolucion}%`;

    const evaluacionNervios = analizarNerviosismo(respuestasUsuario);
    document.getElementById('feedback-nervios').innerText = `[${evaluacionNervios.nivel}]: ${evaluacionNervios.mensaje}`;

    let feedback = "";
    if (totalCaracteres < 15) {
        feedback = `No se registraron respuestas durante la entrevista. Te sugerimos participar activamente.`;
    } else if (indiceGeneral >= 80) {
        feedback = `Excelente desempeño para ${usuario.cargo}. Demostraste fluidez y dominio técnico en ${usuario.carrera}.`;
    } else if (indiceGeneral >= 60) {
        feedback = `Buen intento, ${usuario.nombre}. Conceptos base claros, te recomendamos la estructura STAR para fundamentar tus respuestas.`;
    } else {
        feedback = `Se identificaron brechas en tus argumentos. Procura aportar más ejemplos prácticos de trabajo.`;
    }

    // Agregar aviso si hubo penalizaciones
    let textoPenalizacion = penalizacionAtencion > 0 ? `\n\n(Nota: Tuviste una penalización de -${penalizacionAtencion}% por pedir que te repitieran preguntas. Intenta mejorar tu escucha activa).` : "";
    document.getElementById('feedback-texto').innerText = feedback + textoPenalizacion;

    guardarEnBaseDeDatos("sesiones_entrevista", {
        id: usuario.sesionId,
        estado: 'Finalizada',
        puntajeGeneral: indiceGeneral,
        puntajeTecnico: puntajeTecnico,
        puntajeComunicacion: puntajeComunicacion,
        puntajeResolucion: puntajeResolucion,
        nerviosismo: evaluacionNervios.nivel,
        penalizacion: penalizacionAtencion,
        fechaFin: new Date().toISOString()
    });
}

function reiniciar() {
    desactivarCamaraWeb();
    mostrarSeccion('sec-inicio');
}

// --- DESCARGA DE REPORTE EN TXT (NUEVO) ---
function descargarReporteTXT() {
    let contenido = `=========================================\n`;
    contenido += `REPORTE DE SIMULACIÓN DE ENTREVISTA (InterviewSim AI)\n`;
    contenido += `=========================================\n`;
    contenido += `Candidato: ${usuario.nombre}\n`;
    contenido += `Carrera: ${usuario.carrera}\n`;
    contenido += `Cargo al que aspira: ${usuario.cargo}\n`;
    contenido += `Puntaje Final Obtenido: ${document.getElementById('score-valor').innerText}\n\n`;

    contenido += `--- DETALLE DE PREGUNTAS Y RESPUESTAS ---\n\n`;
    for(let i = 0; i < respuestasUsuario.length; i++) {
        contenido += `Entrevistadora (Pregunta #${i + 1}):\n${preguntasSimulacion[i]}\n\n`;
        contenido += `Tú (Respuesta #${i + 1}):\n${respuestasUsuario[i] || "[Sin respuesta registrada]"}\n`;
        contenido += `-----------------------------------------\n`;
    }

    contenido += `\n--- RETROALIMENTACIÓN DE LA IA ---\n`;
    contenido += `${document.getElementById('feedback-nervios').innerText}\n\n`;
    contenido += `${document.getElementById('feedback-texto').innerText}\n`;

    // Crear y descargar archivo
    const blob = new Blob([contenido], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Reporte_Entrevista_${usuario.nombre.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}