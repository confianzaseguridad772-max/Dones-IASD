// ==========================================
// 1. CONFIGURACIÓN
// ==========================================
const URL_APPS_SCRIPT = "https://script.google.com/macros/s/AKfycbxp4NqfQtutqNT0n5xUT3mMCOyANlAeFhxkAgZnIM2nvlapi6zwbuSMRWYGHCsmjhE-qQ/exec"; 
let padronData = [];
let metodoRegistro = "Manual"; 
const fields = ['nombres', 'apPaterno', 'apMaterno', 'fechaNac', 'sexo', 'celular', 'direccion'];

const manualRef = {
    Salud: { min: "S - SALUD", depto: "Ministerio de Salud" },
    Ensenanza: { min: "E - ENSEÑANZA", depto: "Ministerio de Educación" },
    Relaciones: { min: "R - RELACIONES", depto: "Secretaría / Recepción" },
    Virtual: { min: "V - VIRTUAL", depto: "Comunicaciones" },
    Infra: { min: "I - INFRAESTRUCTURA", depto: "Mayordomía / Diaconado" },
    Recursos: { min: "R - RECURSOS", depto: "Música / Tesorería" }
};

// ==========================================
// 2. DIAGNÓSTICO
// ==========================================
function obtenerCargosSugeridos(registro) {
    let cargos = [];
    const s = (val) => String(val || "");
    if (s(registro.Salud).includes("Nutrición") || s(registro.Salud).includes("Personal de salud")) cargos.push("Enfasis en Salud");
    if (s(registro.Ensenanza).includes("Biblia") || s(registro.Ensenanza).includes("Profecía")) cargos.push("Instructor Bíblico y/o Anciano");
    if (s(registro.Ensenanza).includes("Maestro")) cargos.push("Maestro de Escuela Sabática / Consejero de Aventureros");
    if (s(registro.Relaciones).includes("Visitación") || s(registro.Relaciones).includes("Hospitalidad")) cargos.push("Lider de Grupos Pequeño / Diaconisa");
    if (s(registro.Relaciones).includes("Recepción")) cargos.push("Recepción / Hospitalidad");
    if (s(registro.Virtual).includes("Redes") || s(registro.Virtual).includes("Audio/Video")) cargos.push("Comunicaciones / Publicaciones");
    if (s(registro.Infra).includes("Mantenimiento") || s(registro.Infra).includes("Seguridad")) cargos.push("Diácono / Mayordomía");
    if (s(registro.Recursos).includes("Finanzas") || s(registro.Recursos).includes("Secretaría")) cargos.push("Tesorero / Secretario");
    if (s(registro.Recursos).includes("Música Vocal") || s(registro.Recursos).includes("Instrumental")) cargos.push("Música");
    if (s(registro.Ensenanza).includes("Mentoría")) cargos.push("Director de Jóvenes / Consejero de Conquistadores");
    return cargos.length > 0 ? cargos : ["Colaborador de Ministerio"];
}

// ==========================================
// 3. NAVEGACIÓN, EDAD Y LIMPIEZA
// ==========================================
function nav(id, btn) {
    document.querySelectorAll('.category-rect').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.cat-content').forEach(c => c.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function calcularEdad() {
    const fecha = document.getElementById('fechaNac').value;
    if(!fecha) return;
    const hoy = new Date();
    const cumple = new Date(fecha);
    let edad = hoy.getFullYear() - cumple.getFullYear();
    if (hoy.getMonth() < cumple.getMonth() || (hoy.getMonth() === cumple.getMonth() && hoy.getDate() < cumple.getDate())) edad--;
    document.getElementById('edad').value = edad;
}

function limpiarFormularioCompleto() {
    fields.forEach(f => {
        const el = document.getElementById(f);
        if(el) { el.value = ""; el.readOnly = false; }
    });
    document.getElementById('edad').value = "";
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    metodoRegistro = "Manual"; 
}

// ==========================================
// 4. BÚSQUEDA DNI (CORREGIDO)
// ==========================================
async function buscarDNI() {
    const dniInput = document.getElementById('dni').value.trim();
    const btnBusca = document.querySelector("button[onclick='buscarDNI()']");
    
    if(dniInput.length < 8) return alert("DNI incompleto.");

    limpiarFormularioCompleto();
    if(btnBusca) btnBusca.disabled = true;

    if (padronData.length === 0) {
        await inicializarSistema();
    }
    
    // Mostramos siempre el panel de talentos para que el usuario pueda interactuar
    document.getElementById('panelTalentos').style.display = 'flex';
    const usuario = padronData.find(u => String(u.DNI || u.dni || "").trim() === dniInput);

    if(usuario) {
        metodoRegistro = "Padrón"; 
        
        const areas = ["Salud", "Ensenanza", "Relaciones", "Virtual", "Infra", "Recursos"];
        const tieneTalentos = areas.some(area => usuario[area] && String(usuario[area]).trim().length > 0);

        if(tieneTalentos) {
            setTimeout(() => {
                alert("📢 Este DNI ya está registrado. Puede actualizar sus talentos.");
            }, 150);

            areas.forEach(area => {
                if(usuario[area]) {
                    const seleccionados = String(usuario[area]).split(",");
                    seleccionados.forEach(val => {
                        const cb = document.querySelector(`input[value="${val.trim()}"]`);
                        if(cb) cb.checked = true;
                    });
                }
            });
        }

        // Llenado de campos
        document.getElementById('nombres').value = usuario.Nombres || "";
        document.getElementById('apPaterno').value = usuario["Apellido Paterno"] || usuario.ApPaterno || "";
        document.getElementById('apMaterno').value = usuario["Apellido Materno"] || usuario.ApMaterno || "";
        document.getElementById('celular').value = usuario.Celular || "";
        document.getElementById('direccion').value = usuario.Direccion || "";
        
        const sexoValor = (String(usuario.Sexo || "")).toUpperCase();
        document.getElementById('sexo').value = sexoValor.startsWith("M") ? "MASCULINO" : "FEMENINO";

        // Lógica de fecha
        let fechaBruta = usuario["Fecha Nacimiento"] || usuario["FechaNac"] || usuario["fechaNac"]; 
        if(fechaBruta) {
            let d;
            if(!isNaN(fechaBruta) && typeof fechaBruta !== 'string') {
                d = new Date((fechaBruta - 25569) * 86400 * 1000);
            } else {
                if(typeof fechaBruta === 'string' && fechaBruta.includes('/')) {
                    const partes = fechaBruta.split('/');
                    if(partes[2].length === 4) d = new Date(partes[2], partes[1] - 1, partes[0]);
                } else {
                    d = new Date(fechaBruta);
                }
            }
            if (d && !isNaN(d.getTime())) {
                d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
                document.getElementById('fechaNac').value = d.toISOString().split('T')[0];
                calcularEdad();
            }
        }
        
        // Bloqueo de campos para usuarios del padrón
        fields.forEach(f => { 
            const el = document.getElementById(f);
            if(el) {
                el.disabled = false; 
                el.readOnly = !['celular', 'direccion'].includes(f); 
            }
        });
    } else {
        // --- SECCIÓN CORREGIDA: INGRESO MANUAL ---
        metodoRegistro = "Manual"; 
        alert("DNI no hallado. Proceda con el registro manual.");
        
        // Habilitamos todos los campos y quitamos el ReadOnly
        fields.forEach(f => {
            const el = document.getElementById(f);
            if(el) {
                el.disabled = false;
                el.readOnly = false; // Permite escribir libremente
            }
        });
    }

    if(btnBusca) btnBusca.disabled = false;
}

// ==========================================
// 5. GUARDADO Y GOOGLE SHEETS
// ==========================================
document.getElementById('formRegistro').onsubmit = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btnFinalizar');
    btn.innerText = "GUARDANDO... ⏳";
    btn.disabled = true;

    const getSel = (n) => Array.from(document.querySelectorAll(`input[name="${n}[]"]:checked`)).map(c => c.value).join(", ");

    const reg = {
        DNI: document.getElementById('dni').value,
        Nombres: document.getElementById('nombres').value,
        ApPaterno: document.getElementById('apPaterno').value,
        ApMaterno: document.getElementById('apMaterno').value,
        fechaNac: document.getElementById('fechaNac').value, 
        Edad: document.getElementById('edad').value,
        Sexo: document.getElementById('sexo').value,
        Celular: document.getElementById('celular').value,
        Direccion: document.getElementById('direccion').value,
        Salud: getSel("Salud"),
        Ensenanza: getSel("Ensenanza"),
        Relaciones: getSel("Relaciones"),
        Virtual: getSel("Virtual"),
        Infra: getSel("Infra"),
        Recursos: getSel("Recursos"),
        Registro: metodoRegistro 
    };

    const cargos = obtenerCargosSugeridos(reg);
    reg.cargoSugerido = cargos.join(" / "); 

    try {
        await fetch(URL_APPS_SCRIPT, { method: 'POST', mode: 'no-cors', body: JSON.stringify(reg) });
        mostrarCertificado(reg, cargos);
    } catch (err) {
        alert("Error al guardar.");
    } finally {
        btn.innerText = "GUARDAR Y GENERAR DIAGNÓSTICO⚡";
        btn.disabled = false;
    }
};

function mostrarCertificado(reg, cargos) {
    document.getElementById('diagNombre').innerText = `DIAGNÓSTICO: ${reg.Nombres}`;
    let html = `<p style="text-align:center"><b>DNI:</b> ${reg.DNI} | <b>Edad:</b> ${reg.Edad} años</p><hr>`;
    html += `<div style="text-align:center; margin:15px 0;"><b>CARGOS:</b><br>${cargos.map(c => `<span class="cargo-tag">${c}</span>`).join(" ")}</div>`;
    ["Salud", "Ensenanza", "Relaciones", "Virtual", "Infra", "Recursos"].forEach(area => {
        if(reg[area]) {
            html += `<div class="cert-block"><b>${manualRef[area].min}</b>: ${reg[area]}</div>`;
        }
    });
    document.getElementById('diagContenido').innerHTML = html;
    document.getElementById('modalDiag').style.display = 'flex';
}

async function inicializarSistema() {
    try {
        const respuesta = await fetch(URL_APPS_SCRIPT);
        const datos = await respuesta.json();
        if (datos && !datos.error) {
            padronData = datos;
        }
    } catch (err) {
        console.error("Error de carga:", err);
    }
}

document.addEventListener('DOMContentLoaded', inicializarSistema);
