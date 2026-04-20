import React, { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  TrendingUp, TrendingDown, Download, Upload, Plus, Trash2,
  Briefcase, Plane, User, X, Menu, Award, Camera, Check, Loader, Mic, Bell, Calendar, Square
} from 'lucide-react';

const BudgetTracker = () => {
  // --- ESTADO GLOBAL (Proyectos) ---
  const [proyectos, setProyectos] = useState(() => {
    const guardados = localStorage.getItem('micolotones_proyectos');
    return guardados ? JSON.parse(guardados) : [{ id: 'personal', nombre: 'Personal', icono: 'User' }];
  });

  const [proyectoActual, setProyectoActual] = useState(proyectos[0].id);
  const [showMenu, setShowMenu] = useState(false);
  const [nuevoProyectoNombre, setNuevoProyectoNombre] = useState('');
  const [showAddProyecto, setShowAddProyecto] = useState(false);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // --- ESTADO DEL PROYECTO ACTUAL ---
  const [mesActual, setMesActual] = useState(new Date().toLocaleDateString('en-CA').slice(0, 7));
  const [datosMensuales, setDatosMensuales] = useState({});
  const [showAddGasto, setShowAddGasto] = useState(false);
  const [showAddIngreso, setShowAddIngreso] = useState(false);
  const [vistaActual, setVistaActual] = useState('actual'); // 'actual', 'comparacion', 'alertas'

  // --- ESTADO PAGOS RECURRENTES ---
  const [pagosRecurrentes, setPagosRecurrentes] = useState(() => {
    const guardados = localStorage.getItem(`pagosRecurrentes_${proyectoActual}`);
    return guardados ? JSON.parse(guardados) : [];
  });
  const [nuevoPagoRecurrente, setNuevoPagoRecurrente] = useState({
    descripcion: '', monto: '', diaDelMes: 1, categoria: 'Servicios'
  });
  const [showAddPago, setShowAddPago] = useState(false);

  // --- ESTADO NOTAS DE VOZ ---
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [voiceSuccess, setVoiceSuccess] = useState(null); // { descripcion, monto, categoria }
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  // --- ESTADO ESCANEO RECIBO ---
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [itemsEscaneados, setItemsEscaneados] = useState([]);
  const [imagenRecibo, setImagenRecibo] = useState(null);

  const [nuevoGasto, setNuevoGasto] = useState({
    categoria: 'Groceries', monto: '', descripcion: '', fecha: new Date().toLocaleDateString('en-CA')
  });

  const [nuevoIngreso, setNuevoIngreso] = useState({
    descripcion: '', monto: '', fecha: new Date().toLocaleDateString('en-CA')
  });

  const categorias = ['Groceries', 'Servicios', 'Transporte', 'Entretenimiento', 'Salud', 'Educación', 'Gastos Varios', 'Insumos', 'Hospedaje', 'Comida'];
  const colores = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#8E44AD', '#3498DB', '#E67E22'];

  // --- EFECTOS ---
  useEffect(() => {
    localStorage.setItem('micolotones_proyectos', JSON.stringify(proyectos));
  }, [proyectos]);

  // Cargar datos cuando cambia el proyecto activo
  useEffect(() => {
    const datosGuardados = localStorage.getItem(`budgetData_${proyectoActual}`);
    if (datosGuardados) {
      setDatosMensuales(JSON.parse(datosGuardados));
    } else {
      setDatosMensuales({});
    }
    const pagosGuardados = localStorage.getItem(`pagosRecurrentes_${proyectoActual}`);
    if (pagosGuardados) {
      setPagosRecurrentes(JSON.parse(pagosGuardados));
    } else {
      setPagosRecurrentes([]);
    }
    setMesActual(new Date().toLocaleDateString('en-CA').slice(0, 7));
  }, [proyectoActual]);

  // Guardar datos cuando cambian
  useEffect(() => {
    if (proyectoActual) {
      localStorage.setItem(`budgetData_${proyectoActual}`, JSON.stringify(datosMensuales));
      localStorage.setItem(`pagosRecurrentes_${proyectoActual}`, JSON.stringify(pagosRecurrentes));
    }
  }, [datosMensuales, pagosRecurrentes, proyectoActual]);

  // --- DATOS ---
  const datosDelMes = datosMensuales[mesActual] || { ingresos: [], gastos: [] };

  const actualizarDatosMes = (nuevosDatos) => {
    setDatosMensuales({ ...datosMensuales, [mesActual]: nuevosDatos });
  };

  const totalIngresos = (datosDelMes.ingresos || []).reduce((sum, i) => sum + i.monto, 0);
  const totalGastos = (datosDelMes.gastos || []).reduce((sum, g) => sum + g.monto, 0);
  const balance = totalIngresos - totalGastos;

  const gastosPorCategoria = categorias.map(cat => ({
    name: cat,
    value: (datosDelMes.gastos || []).filter(g => g.categoria === cat).reduce((sum, g) => sum + g.monto, 0)
  })).filter(item => item.value > 0);

  // --- ESCANEAR RECIBO CON IA ---
  const procesarImagenRecibo = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setScanLoading(true);
    setShowScanModal(true);

    try {
      // Convertir imagen a base64
      const base64Image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setImagenRecibo(URL.createObjectURL(file));

      // Llamar a Gemini API para analizar el recibo
      const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
      if (!GEMINI_API_KEY) {
        alert("Falta configurar la VITE_GEMINI_API_KEY en tu archivo .env local o en Vercel.");
        setScanLoading(false);
        return;
      }
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Analiza este recibo y extrae la información en formato JSON. Responde SOLO con JSON válido, sin texto adicional ni markdown.

Formato requerido:
{
  "nombreLocal": "nombre del establecimiento",
  "fecha": "YYYY-MM-DD (si está visible, sino usa la fecha de hoy)",
  "items": [
    {
      "descripcion": "nombre del producto",
      "monto": precio_numerico,
      "categoria": "una de estas: Groceries, Comida, Servicios, Transporte, Entretenimiento, Salud, Educación, Gastos Varios, Insumos, Hospedaje"
    }
  ]
}

Si hay un total general, ignóralo y solo extrae los items individuales. Categoriza inteligentemente según el producto.`
                },
                {
                  inlineData: {
                    mimeType: file.type,
                    data: base64Image
                  }
                }
              ]
            }
          ]
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Error en la API de Gemini');
      }

      const textoRespuesta = data.candidates[0]?.content?.parts[0]?.text || '{}';

      // Limpiar posibles backticks de markdown
      const jsonLimpio = textoRespuesta.replace(/```json\n?|\n?```/g, '').trim();
      const resultado = JSON.parse(jsonLimpio);

      if (!resultado.items || resultado.items.length === 0) {
        alert('La IA no detectó items en el recibo. Intenta con una foto más clara y con buena iluminación.');
        setScanLoading(false);
        event.target.value = '';
        return;
      }

      // Agregar IDs temporales a los items
      const itemsConId = resultado.items.map((item, idx) => ({
        ...item,
        id: `temp-${Date.now()}-${idx}`,
        fecha: resultado.fecha || new Date().toLocaleDateString('en-CA'),
        editable: true
      }));

      setItemsEscaneados(itemsConId);
      setScanLoading(false);

    } catch (error) {
      console.error('Error al escanear recibo:', error);
      // Mostrar error real para facilitar diagnóstico
      const mensajeError = error?.message || String(error);
      alert(`Error al procesar el recibo:\n${mensajeError}\n\nVerifica que la API Key esté configurada en Vercel y que la imagen sea clara.`);
      setScanLoading(false);
      // Mantener modal abierto para que el usuario pueda reintentar
    }

    event.target.value = '';
  };

  // --- GRABADORA DE VOZ A GASTOS ---
  const abrirGrabadora = () => {
    setShowVoiceModal(true);
    setRecordingSeconds(0);
    setVoiceLoading(false);
    setVoiceError('');
    setVoiceSuccess(null);
  };

  const cerrarGrabadora = () => {
    if (isRecording) {
      detenerGrabacion(true);
    }
    setShowVoiceModal(false);
    setRecordingSeconds(0);
    setVoiceLoading(false);
    setVoiceError('');
    setVoiceSuccess(null);
  };

  const iniciarGrabacion = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        // El procesamiento se dispara desde detenerGrabacion
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing mic:", error);
      setVoiceError('No se pudo acceder al micrófono. Verifica los permisos del navegador.');
    }
  };

  const detenerGrabacion = (cancelar = false) => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());

      if (!cancelar) {
        setTimeout(() => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          if (audioBlob.size > 0) {
            procesarAudioConGemini(audioBlob);
          } else {
            setVoiceError('No se capturó audio. Intenta de nuevo.');
          }
        }, 300);
      }
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const procesarAudioConGemini = async (audioBlob) => {
    setVoiceLoading(true);
    try {
      const base64Audio = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
      if (!GEMINI_API_KEY) {
        setVoiceError('La API Key de Gemini no está configurada. Contacta al administrador.');
        setVoiceLoading(false);
        return;
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Escucha atentamente este audio. El idioma del audio es español de Latinoamérica (Colombia). La persona está describiendo un gasto o compra que realizó. Interpreta lo que dice aunque la pronunciación no sea perfecta.

Extrae la información del gasto en formato JSON. Responde ÚNICAMENTE con JSON válido, sin texto adicional, sin markdown, sin backticks.

Formato requerido:
{
  "descripcion": "nombre claro del producto o servicio comprado",
  "monto": 4000,
  "categoria": "una de estas exactamente: Groceries, Comida, Servicios, Transporte, Entretenimiento, Salud, Educación, Gastos Varios, Insumos, Hospedaje"
}

Notas:
- "monto" debe ser un número sin formato, sin puntos ni comas (ej: 4000, no "4.000")
- Si la persona dice "mil" o "luca", interpreta como 1000
- Si dice "cuatro mil" es 4000, "diez mil" es 10000, etc.
- Categoriza de forma inteligente según el contexto`
                },
                {
                  inlineData: { mimeType: 'audio/webm', data: base64Audio }
                }
              ]
            }
          ]
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Error AI');
      
      const textoRespuesta = data.candidates[0]?.content?.parts[0]?.text || '{}';
      const jsonLimpio = textoRespuesta.replace(/```json\n?|\n?```/g, '').trim();
      const resultado = JSON.parse(jsonLimpio);

      if (resultado.monto && resultado.descripcion) {
        const nuevo = {
          id: Date.now(),
          categoria: resultado.categoria || 'Gastos Varios',
          descripcion: resultado.descripcion,
          monto: parseFloat(resultado.monto),
          fecha: new Date().toLocaleDateString('en-CA')
        };
        const gastosActualizados = [...datosDelMes.gastos, nuevo];
        actualizarDatosMes({ ...datosDelMes, gastos: gastosActualizados });
        setVoiceSuccess(nuevo); // Mostrar resumen en el modal
      } else {
        setVoiceError('La IA no detectó un gasto claro. Intenta hablar más despacio y claro.');
      }
    } catch (err) {
      console.error(err);
      setVoiceError('Ocurrió un error procesando el audio. Intenta de nuevo.');
    }
    setVoiceLoading(false);
  };

  // --- GUARDAR ITEMS ESCANEADOS ---
  const guardarItemsEscaneados = () => {
    const nuevosGastos = itemsEscaneados.map(item => ({
      id: Date.now() + Math.random(),
      categoria: item.categoria,
      descripcion: item.descripcion,
      monto: parseFloat(item.monto),
      fecha: item.fecha
    }));

    const gastosActualizados = [...datosDelMes.gastos, ...nuevosGastos];
    actualizarDatosMes({ ...datosDelMes, gastos: gastosActualizados });

    setShowScanModal(false);
    setItemsEscaneados([]);
    setImagenRecibo(null);
  };

  // --- EDITAR ITEM ESCANEADO ---
  const editarItemEscaneado = (id, campo, valor) => {
    setItemsEscaneados(itemsEscaneados.map(item =>
      item.id === id ? { ...item, [campo]: valor } : item
    ));
  };

  const eliminarItemEscaneado = (id) => {
    setItemsEscaneados(itemsEscaneados.filter(item => item.id !== id));
  };

  // --- IMPORTAR INTELIGENTE ---
  const importarDesdeCSV = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n');
      const nuevosDatosMensuales = { ...datosMensuales };
      let contador = 0;
      let startIndex = 1;

      if (lines[0] && !lines[0].includes('Tipo')) startIndex = 0;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const columns = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

        if (columns.length >= 5) {
          const fechaRaw = columns[5] ? columns[5].trim() : columns[0].trim() + '-01';
          const mesReal = fechaRaw.slice(0, 7);

          const tipo = columns[1].trim();
          const categoria = columns[2].trim();
          const descripcion = columns[3].trim().replace(/^"|"$/g, '');
          const monto = parseFloat(columns[4]);

          if (!nuevosDatosMensuales[mesReal]) {
            nuevosDatosMensuales[mesReal] = { ingresos: [], gastos: [] };
          }

          const nuevoItem = {
            id: Date.now() + Math.random(),
            categoria: categoria === 'General' ? 'General' : categoria,
            descripcion: descripcion || 'Importado',
            monto: monto || 0,
            fecha: fechaRaw
          };

          if (tipo === 'Ingreso') {
            nuevosDatosMensuales[mesReal].ingresos.push(nuevoItem);
          } else if (tipo === 'Gasto') {
            nuevosDatosMensuales[mesReal].gastos.push(nuevoItem);
          }
          contador++;
        }
      }
      setDatosMensuales(nuevosDatosMensuales);
      alert(`¡Listo! Se importaron ${contador} registros en sus meses correctos.`);
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  // --- EXPORTAR ---
  const exportarAExcel = () => {
    const proyectoNombre = proyectos.find(p => p.id === proyectoActual)?.nombre || 'Proyecto';
    let csv = `Reporte: ${proyectoNombre}\nMes,Tipo,Categoría,Descripción,Monto,Fecha\n`;
    Object.keys(datosMensuales).sort().forEach(mes => {
      const datos = datosMensuales[mes];
      (datos.ingresos || []).forEach(i => csv += `${mes},Ingreso,General,"${i.descripcion}",${i.monto},${i.fecha}\n`);
      (datos.gastos || []).forEach(g => csv += `${mes},Gasto,${g.categoria},"${g.descripcion}",${g.monto},${g.fecha}\n`);
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${proyectoNombre}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // --- FUNCIONES CRUD ---
  const agregarGasto = () => {
    if (nuevoGasto.monto && parseFloat(nuevoGasto.monto) > 0) {
      const nuevosGastos = [...datosDelMes.gastos, { ...nuevoGasto, monto: parseFloat(nuevoGasto.monto), id: Date.now() }];
      actualizarDatosMes({ ...datosDelMes, gastos: nuevosGastos });
      setNuevoGasto({ ...nuevoGasto, monto: '', descripcion: '' });
      setShowAddGasto(false);
    }
  };

  const agregarIngreso = () => {
    if (nuevoIngreso.monto && parseFloat(nuevoIngreso.monto) > 0) {
      const nuevosIngresos = [...(datosDelMes.ingresos || []), { ...nuevoIngreso, monto: parseFloat(nuevoIngreso.monto), id: Date.now() }];
      actualizarDatosMes({ ...datosDelMes, ingresos: nuevosIngresos });
      setNuevoIngreso({ ...nuevoIngreso, monto: '', descripcion: '' });
      setShowAddIngreso(false);
    }
  };

  const eliminarItem = (tipo, id) => {
    const lista = tipo === 'gasto' ? datosDelMes.gastos : datosDelMes.ingresos;
    actualizarDatosMes({ ...datosDelMes, [tipo === 'gasto' ? 'gastos' : 'ingresos']: lista.filter(item => item.id !== id) });
  };

  const agregarProyecto = () => {
    if (nuevoProyectoNombre.trim()) {
      const nuevoId = Date.now().toString();
      const nuevo = { id: nuevoId, nombre: nuevoProyectoNombre, icono: 'Briefcase' };
      setProyectos([...proyectos, nuevo]);
      setProyectoActual(nuevoId);
      setNuevoProyectoNombre('');
      setShowAddProyecto(false);
      setShowMenu(false);
    }
  };

  const eliminarProyecto = (id) => {
    if (proyectos.length === 1) return alert("Debes tener al menos un proyecto.");
    if (window.confirm("¿Borrar proyecto?")) {
      const nuevos = proyectos.filter(p => p.id !== id);
      setProyectos(nuevos);
      localStorage.removeItem(`budgetData_${id}`);
      if (proyectoActual === id) setProyectoActual(nuevos[0].id);
    }
  };

  // --- HELPERS ---
  const cambiarMes = (dir) => {
    const f = new Date(mesActual + '-02');
    f.setMonth(f.getMonth() + dir);
    setMesActual(f.toISOString().slice(0, 7));
  };

  const obtenerComparacionMeses = () => {
    return Object.keys(datosMensuales).sort().slice(-6).map(mes => {
      const d = datosMensuales[mes];
      const i = (d.ingresos || []).reduce((s, x) => s + x.monto, 0);
      const g = (d.gastos || []).reduce((s, x) => s + x.monto, 0);
      return { mes, Ingresos: i, Gastos: g, Balance: i - g };
    });
  };

  const obtenerTendenciaBalance = () => {
    return Object.keys(datosMensuales).sort().slice(-6).map(mes => {
      const d = datosMensuales[mes];
      const i = (d.ingresos || []).reduce((s, x) => s + x.monto, 0);
      const g = (d.gastos || []).reduce((s, x) => s + x.monto, 0);
      return { mes, balance: i - g };
    });
  };

  const obtenerTop5Categorias = () => {
    const todosMeses = Object.keys(datosMensuales).sort().slice(-6);
    const categoriasTotales = {};

    todosMeses.forEach(mes => {
      const gastos = datosMensuales[mes].gastos || [];
      gastos.forEach(g => {
        categoriasTotales[g.categoria] = (categoriasTotales[g.categoria] || 0) + g.monto;
      });
    });

    return Object.entries(categoriasTotales)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  };

  const obtenerEstadisticas = () => {
    const meses = Object.keys(datosMensuales).sort().slice(-6);
    if (meses.length === 0) return { promedio: 0, mejorMes: '-', peorMes: '-' };

    const balances = meses.map(mes => {
      const d = datosMensuales[mes];
      const i = (d.ingresos || []).reduce((s, x) => s + x.monto, 0);
      const g = (d.gastos || []).reduce((s, x) => s + x.monto, 0);
      return { mes, balance: i - g };
    });

    const promedio = balances.reduce((s, x) => s + x.balance, 0) / balances.length;
    const mejor = balances.reduce((max, x) => x.balance > max.balance ? x : max);
    const peor = balances.reduce((min, x) => x.balance < min.balance ? x : min);

    return {
      promedio: Math.round(promedio),
      mejorMes: mejor.mes,
      peorMes: peor.mes
    };
  };

  const stats = obtenerEstadisticas();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      <input type="file" accept=".csv" ref={fileInputRef} onChange={importarDesdeCSV} className="hidden" />
      <input type="file" accept="image/*" ref={imageInputRef} onChange={procesarImagenRecibo} className="hidden" />

      {/* MODAL ESCANEO RECIBO */}
      {showScanModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-pink-500 to-orange-500 p-4 sm:p-6 flex justify-between items-center rounded-t-2xl">
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <Camera size={24} />
                Escaneo de Recibo
              </h2>
              <button onClick={() => { setShowScanModal(false); setItemsEscaneados([]); setImagenRecibo(null); }} className="text-white hover:bg-white/20 p-2 rounded-lg">
                <X size={24} />
              </button>
            </div>

            <div className="p-4 sm:p-6">
              {scanLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader className="animate-spin text-orange-500 mb-4" size={48} />
                  <p className="text-gray-600 text-lg">Analizando recibo con IA...</p>
                  <p className="text-gray-400 text-sm mt-2">Esto puede tomar unos segundos</p>
                </div>
              ) : (
                <>
                  {imagenRecibo && (
                    <div className="mb-6">
                      <img src={imagenRecibo} alt="Recibo" className="max-h-64 mx-auto rounded-lg shadow-md" />
                    </div>
                  )}

                  <div className="space-y-3">
                    {itemsEscaneados.map(item => (
                      <div key={item.id} className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200 hover:border-orange-300 transition-all">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div className="sm:col-span-2">
                            <label className="text-xs text-gray-500 mb-1 block">Descripción</label>
                            <input
                              type="text"
                              value={item.descripcion}
                              onChange={(e) => editarItemEscaneado(item.id, 'descripcion', e.target.value)}
                              className="w-full p-2 rounded border border-gray-300 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Monto</label>
                            <input
                              type="number"
                              value={item.monto}
                              onChange={(e) => editarItemEscaneado(item.id, 'monto', e.target.value)}
                              className="w-full p-2 rounded border border-gray-300 text-sm"
                            />
                          </div>
                          <div className="flex items-end gap-2">
                            <div className="flex-1">
                              <label className="text-xs text-gray-500 mb-1 block">Categoría</label>
                              <select
                                value={item.categoria}
                                onChange={(e) => editarItemEscaneado(item.id, 'categoria', e.target.value)}
                                className="w-full p-2 rounded border border-gray-300 text-sm bg-white"
                              >
                                {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                            <button
                              onClick={() => eliminarItemEscaneado(item.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {itemsEscaneados.length > 0 && (
                    <div className="mt-6 flex gap-3">
                      <button
                        onClick={guardarItemsEscaneados}
                        className="flex-1 bg-gradient-to-r from-pink-500 to-orange-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg transition-all"
                      >
                        <Check size={20} />
                        Guardar {itemsEscaneados.length} item{itemsEscaneados.length > 1 ? 's' : ''}
                      </button>
                      <button
                        onClick={() => { setShowScanModal(false); setItemsEscaneados([]); setImagenRecibo(null); }}
                        className="px-6 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}

                  {itemsEscaneados.length === 0 && !scanLoading && (
                    <div className="text-center py-12 text-gray-400">
                      <Camera size={48} className="mx-auto mb-4 opacity-50" />
                      <p>No se detectaron items</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL GRABADORA DE VOZ */}
      {showVoiceModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-pink-500 p-5 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Mic size={22} /> Gasto por Voz
              </h2>
              <button onClick={cerrarGrabadora} className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg transition-colors">
                <X size={22} />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center">
              {voiceSuccess ? (
                /* --- VISTA ÉXITO --- */
                <div className="flex flex-col items-center w-full py-4">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                    <Check size={32} className="text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4">¡Gasto añadido!</h3>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 w-full space-y-2 mb-6">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Descripción</span>
                      <span className="font-semibold text-gray-800">{voiceSuccess.descripcion}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Monto</span>
                      <span className="font-bold text-emerald-600 text-lg">${voiceSuccess.monto.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Categoría</span>
                      <span className="text-xs font-bold uppercase bg-orange-100 text-orange-600 px-2 py-1 rounded">{voiceSuccess.categoria}</span>
                    </div>
                  </div>
                  <div className="flex gap-3 w-full">
                    <button onClick={abrirGrabadora} className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm hover:shadow-lg transition-all">
                      <Mic size={18} /> Grabar otro
                    </button>
                    <button onClick={cerrarGrabadora} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors text-sm">
                      Cerrar
                    </button>
                  </div>
                </div>
              ) : voiceLoading ? (
                /* --- VISTA CARGANDO --- */
                <div className="flex flex-col items-center py-8">
                  <Loader className="animate-spin text-pink-500 mb-4" size={48} />
                  <p className="text-gray-700 font-semibold text-lg">Analizando audio con IA...</p>
                  <p className="text-gray-400 text-sm mt-1">Procesando tu mensaje de voz</p>
                </div>
              ) : (
                <>
                  {/* --- VISTA ERROR --- */}
                  {voiceError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 w-full text-sm text-center">
                      ⚠️ {voiceError}
                    </div>
                  )}

                  {/* Animación de ondas */}
                  <div className="relative w-32 h-32 mb-6 flex items-center justify-center">
                    {isRecording && (
                      <>
                        <div className="absolute w-32 h-32 rounded-full bg-red-100 animate-ping opacity-30"></div>
                        <div className="absolute w-24 h-24 rounded-full bg-red-200 animate-ping opacity-40" style={{animationDelay: '0.3s'}}></div>
                        <div className="absolute w-16 h-16 rounded-full bg-red-300 animate-ping opacity-50" style={{animationDelay: '0.6s'}}></div>
                      </>
                    )}
                    <div className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${isRecording ? 'bg-red-500 scale-110' : 'bg-gray-200'}`}>
                      {isRecording ? <Mic size={32} className="text-white" /> : <Mic size={32} className="text-gray-500" />}
                    </div>
                  </div>

                  {/* Timer */}
                  {isRecording && (
                    <div className="text-3xl font-mono font-bold text-red-500 mb-2 tabular-nums">
                      {formatTime(recordingSeconds)}
                    </div>
                  )}

                  <p className="text-gray-500 text-sm text-center mb-6 max-w-xs">
                    {isRecording 
                      ? 'Grabando... Habla claro y describe tu gasto. Presiona "Detener" cuando termines.' 
                      : 'Presiona "Grabar" y di algo como: "Compré empanadas por 4 mil pesos"'
                    }
                  </p>

                  {/* Botones */}
                  <div className="flex gap-3 w-full">
                    {!isRecording ? (
                      <button
                        onClick={() => { setVoiceError(''); iniciarGrabacion(); }}
                        className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:scale-[1.02] transition-all text-sm"
                      >
                        <Mic size={20} /> Grabar
                      </button>
                    ) : (
                      <button
                        onClick={() => detenerGrabacion(false)}
                        className="flex-1 bg-gradient-to-r from-slate-700 to-slate-800 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:scale-[1.02] transition-all text-sm"
                      >
                        <Square size={18} /> Detener y Analizar
                      </button>
                    )}
                    <button
                      onClick={cerrarGrabadora}
                      className="px-5 bg-gray-100 text-gray-600 py-3.5 rounded-xl font-bold hover:bg-gray-200 transition-colors text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform ${showMenu ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 shadow-2xl flex flex-col`}>
        <div className="p-4 sm:p-6 flex justify-between items-center bg-slate-800">
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">🍑 Micolotones</h2>
          <button onClick={() => setShowMenu(false)} className="md:hidden"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
          <p className="text-xs text-slate-400 uppercase font-bold mb-2">Mis Proyectos</p>
          {proyectos.map(p => (
            <div key={p.id} className="group flex items-center justify-between">
              <button onClick={() => { setProyectoActual(p.id); setShowMenu(false); }} className={`flex-1 flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-3 rounded-lg transition-all text-sm sm:text-base ${proyectoActual === p.id ? 'bg-gradient-to-r from-pink-500 to-orange-500 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-300'}`}>
                {p.nombre.toLowerCase().includes('viaje') ? <Plane size={16} className="sm:w-[18px] sm:h-[18px]" /> : p.nombre.toLowerCase().includes('negocio') ? <Briefcase size={16} className="sm:w-[18px] sm:h-[18px]" /> : <User size={16} className="sm:w-[18px] sm:h-[18px]" />}
                <span className="truncate">{p.nombre}</span>
              </button>
              {proyectos.length > 1 && <button onClick={() => eliminarProyecto(p.id)} className="p-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>}
            </div>
          ))}
          {showAddProyecto ? (
            <div className="mt-4 bg-slate-800 p-3 rounded-xl border border-slate-700">
              <input autoFocus type="text" placeholder="Nombre" value={nuevoProyectoNombre} onChange={e => setNuevoProyectoNombre(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm mb-2 text-white" />
              <div className="flex gap-2">
                <button onClick={agregarProyecto} className="flex-1 bg-green-600 text-xs py-2 rounded">Crear</button>
                <button onClick={() => setShowAddProyecto(false)} className="flex-1 bg-slate-700 text-xs py-2 rounded">Cancelar</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddProyecto(true)} className="w-full mt-2 flex items-center justify-center gap-2 border border-slate-700 text-slate-400 p-2 sm:p-3 rounded-xl hover:bg-slate-800 border-dashed text-xs sm:text-sm"><Plus size={16} /> Nuevo Proyecto</button>
          )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 md:ml-64 p-3 sm:p-4 md:p-8 min-h-screen bg-gradient-to-br from-pink-50 via-orange-50 to-amber-50">
        <div className="md:hidden flex justify-between items-center mb-4 sm:mb-6">
          <button onClick={() => setShowMenu(true)} className="p-2 bg-white rounded-lg shadow-sm text-slate-700"><Menu size={20} /></button>
          <span className="font-bold text-slate-700 text-sm sm:text-base truncate max-w-[180px]">{proyectos.find(p => p.id === proyectoActual)?.nombre}</span>
          <div className="w-10"></div>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* HEADER DASHBOARD */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">{proyectos.find(p => p.id === proyectoActual)?.nombre}</h1>
              <p className="text-gray-500 text-xs sm:text-sm capitalize">{new Date(mesActual + '-02').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</p>
            </div>
            <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
              <div className="flex bg-white p-1 rounded-xl shadow-sm">
                <button onClick={() => setVistaActual('actual')} className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium ${vistaActual === 'actual' ? 'bg-orange-100 text-orange-700' : 'text-gray-500'}`}>Dashboard</button>
                <button onClick={() => setVistaActual('comparacion')} className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium ${vistaActual === 'comparacion' ? 'bg-orange-100 text-orange-700' : 'text-gray-500'}`}>Histórico</button>
                <button onClick={() => setVistaActual('alertas')} className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium ${vistaActual === 'alertas' ? 'bg-orange-100 text-orange-700' : 'text-gray-500 flex items-center gap-1'} relative`}>
                  Alertas {pagosRecurrentes.length > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>}
                </button>
              </div>
              <div className="flex bg-white p-1 rounded-xl shadow-sm">
                <button 
                  onClick={abrirGrabadora}
                  className="px-2 sm:px-3 py-2 text-gray-500 hover:text-red-500 transition-colors" 
                  title="Grabar gasto con voz"
                >
                  <Mic size={16} className="sm:w-[18px] sm:h-[18px]" />
                </button>
                <button onClick={() => imageInputRef.current.click()} className="px-2 sm:px-3 py-2 text-gray-500 hover:text-purple-600" title="Escanear Recibo"><Camera size={16} className="sm:w-[18px] sm:h-[18px]" /></button>
                <button onClick={() => fileInputRef.current.click()} className="px-2 sm:px-3 py-2 text-gray-500 hover:text-blue-600" title="Importar"><Upload size={16} className="sm:w-[18px] sm:h-[18px]" /></button>
                <button onClick={exportarAExcel} className="px-2 sm:px-3 py-2 text-gray-500 hover:text-green-600" title="Exportar"><Download size={16} className="sm:w-[18px] sm:h-[18px]" /></button>
              </div>
            </div>
          </div>

          {vistaActual === 'actual' && (
            <>
              {/* CONTROL MES */}
              <div className="flex justify-between items-center mb-4 sm:mb-6 bg-white p-2 rounded-2xl shadow-sm max-w-sm mx-auto md:mx-0">
                <button onClick={() => cambiarMes(-1)} className="p-2 hover:bg-gray-100 rounded-lg text-lg">←</button>
                <span className="font-bold text-gray-700 capitalize text-base sm:text-lg">{new Date(mesActual + '-02').toLocaleDateString('es-ES', { month: 'long' })}</span>
                <button onClick={() => cambiarMes(1)} className="p-2 hover:bg-gray-100 rounded-lg text-lg">→</button>
              </div>

              {/* TOTALES CARDS */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div className="bg-emerald-500 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-white shadow-lg shadow-emerald-200 flex flex-col justify-center">
                  <span className="text-[10px] sm:text-xs opacity-80 mb-1">Ingresos</span>
                  <span className="text-sm sm:text-lg md:text-2xl font-bold break-all">${totalIngresos.toLocaleString()}</span>
                </div>
                <div className="bg-rose-500 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-white shadow-lg shadow-rose-200 flex flex-col justify-center">
                  <span className="text-[10px] sm:text-xs opacity-80 mb-1">Gastos</span>
                  <span className="text-sm sm:text-lg md:text-2xl font-bold break-all">${totalGastos.toLocaleString()}</span>
                </div>
                <div className="bg-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-white shadow-lg shadow-slate-300 flex flex-col justify-center">
                  <span className="text-[10px] sm:text-xs opacity-80 mb-1">Balance</span>
                  <span className="text-sm sm:text-lg md:text-2xl font-bold break-all">${balance.toLocaleString()}</span>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
                {/* LISTAS */}
                <div className="md:col-span-2 space-y-4 sm:space-y-6">
                  {/* INGRESOS */}
                  <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-3 sm:mb-4">
                      <h3 className="font-bold text-gray-700 flex items-center gap-2 text-sm sm:text-base"><TrendingUp size={16} className="sm:w-[18px] sm:h-[18px] text-emerald-500" /> Ingresos</h3>
                      <button onClick={() => setShowAddIngreso(!showAddIngreso)} className="bg-emerald-50 text-emerald-600 p-1.5 rounded-lg"><Plus size={16} className="sm:w-[18px] sm:h-[18px]" /></button>
                    </div>
                    {showAddIngreso && (
                      <div className="bg-emerald-50/50 p-3 rounded-xl mb-3 border border-emerald-100">
                        <input type="text" placeholder="Descripción" value={nuevoIngreso.descripcion} onChange={e => setNuevoIngreso({ ...nuevoIngreso, descripcion: e.target.value })} className="w-full p-2 mb-2 rounded border border-emerald-200 text-sm" />
                        <div className="flex gap-2 mb-2">
                          <input type="number" placeholder="Monto" value={nuevoIngreso.monto} onChange={e => setNuevoIngreso({ ...nuevoIngreso, monto: e.target.value })} className="w-2/3 p-2 rounded border border-emerald-200 text-sm" />
                          <input type="date" value={nuevoIngreso.fecha} onChange={e => setNuevoIngreso({ ...nuevoIngreso, fecha: e.target.value })} className="w-1/3 p-2 rounded border border-emerald-200 text-sm" />
                        </div>
                        <button onClick={agregarIngreso} className="w-full bg-emerald-500 text-white py-2 rounded-lg text-sm font-bold">Guardar</button>
                      </div>
                    )}
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {(datosDelMes.ingresos || []).length === 0 && <p className="text-center text-gray-300 text-xs py-2">Sin ingresos</p>}
                      {(datosDelMes.ingresos || []).map(i => (
                        <div key={i.id} className="flex justify-between items-center p-2 sm:p-3 hover:bg-gray-50 rounded-xl border border-transparent hover:border-gray-100 transition-all">
                          <div className="min-w-0 flex-1"><div className="font-medium text-gray-800 text-xs sm:text-sm truncate">{i.descripcion}</div><div className="text-[10px] sm:text-xs text-gray-400">{i.fecha}</div></div>
                          <div className="flex items-center gap-2 ml-2"><span className="font-bold text-emerald-600 text-xs sm:text-sm whitespace-nowrap">+${i.monto.toLocaleString()}</span><button onClick={() => eliminarItem('ingreso', i.id)} className="text-gray-300 hover:text-rose-400 flex-shrink-0"><Trash2 size={14} /></button></div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* GASTOS */}
                  <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-3 sm:mb-4">
                      <h3 className="font-bold text-gray-700 flex items-center gap-2 text-sm sm:text-base"><TrendingDown size={16} className="sm:w-[18px] sm:h-[18px] text-rose-500" /> Gastos</h3>
                      <button onClick={() => setShowAddGasto(!showAddGasto)} className="bg-rose-50 text-rose-600 p-1.5 rounded-lg"><Plus size={16} className="sm:w-[18px] sm:h-[18px]" /></button>
                    </div>
                    {showAddGasto && (
                      <div className="bg-rose-50/50 p-3 rounded-xl mb-3 border border-rose-100">
                        <select value={nuevoGasto.categoria} onChange={e => setNuevoGasto({ ...nuevoGasto, categoria: e.target.value })} className="w-full p-2 mb-2 rounded border border-rose-200 text-sm bg-white">{categorias.map(c => <option key={c} value={c}>{c}</option>)}</select>
                        <input type="text" placeholder="Descripción" value={nuevoGasto.descripcion} onChange={e => setNuevoGasto({ ...nuevoGasto, descripcion: e.target.value })} className="w-full p-2 mb-2 rounded border border-rose-200 text-sm" />
                        <div className="flex gap-2 mb-2">
                          <input type="number" placeholder="Monto" value={nuevoGasto.monto} onChange={e => setNuevoGasto({ ...nuevoGasto, monto: e.target.value })} className="w-2/3 p-2 rounded border border-rose-200 text-sm" />
                          <input type="date" value={nuevoGasto.fecha} onChange={e => setNuevoGasto({ ...nuevoGasto, fecha: e.target.value })} className="w-1/3 p-2 rounded border border-rose-200 text-sm" />
                        </div>
                        <button onClick={agregarGasto} className="w-full bg-rose-500 text-white py-2 rounded-lg text-sm font-bold">Guardar</button>
                      </div>
                    )}
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {(datosDelMes.gastos || []).length === 0 && <p className="text-center text-gray-300 text-xs py-2">Sin gastos</p>}
                      {(datosDelMes.gastos || []).slice().reverse().map(g => (
                        <div key={g.id} className="flex justify-between items-center p-2 sm:p-3 hover:bg-gray-50 rounded-xl border border-transparent hover:border-gray-100 transition-all">
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-bold uppercase bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">{g.categoria}</span>
                            <div className="font-medium text-gray-800 text-xs sm:text-sm mt-1 truncate">{g.descripcion}</div>
                          </div>
                          <div className="flex items-center gap-2 ml-2"><span className="font-bold text-slate-700 text-xs sm:text-sm whitespace-nowrap">-${g.monto.toLocaleString()}</span><button onClick={() => eliminarItem('gasto', g.id)} className="text-gray-300 hover:text-rose-400 flex-shrink-0"><Trash2 size={14} /></button></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* CHART TORTA */}
                <div className="md:col-span-1">
                  <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm border border-orange-100 sticky top-4">
                    <h3 className="font-bold text-gray-700 mb-4 text-center text-sm sm:text-base">Distribución</h3>
                    {gastosPorCategoria.length > 0 ? (
                      <div className="h-56 sm:h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={gastosPorCategoria} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                              {gastosPorCategoria.map((entry, index) => <Cell key={`cell-${index}`} fill={colores[index % colores.length]} />)}
                            </Pie>
                            <Tooltip formatter={(value) => `$${value.toLocaleString()}`} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                            <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-48 flex flex-col items-center justify-center text-gray-300">
                        <span className="text-4xl mb-2">🍑</span>
                        <p className="text-sm">Sin datos aún</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
          
          {vistaActual === 'comparacion' && (
            <div className="space-y-4 sm:space-y-6">
              {/* ESTADÍSTICAS CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Award size={20} />
                    <span className="text-xs sm:text-sm opacity-90">Promedio Mensual</span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold">${stats.promedio.toLocaleString()}</p>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={20} />
                    <span className="text-xs sm:text-sm opacity-90">Mejor Mes</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold">{stats.mejorMes !== '-' ? new Date(stats.mejorMes + '-01').toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }) : '-'}</p>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown size={20} />
                    <span className="text-xs sm:text-sm opacity-90">Peor Mes</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold">{stats.peorMes !== '-' ? new Date(stats.peorMes + '-01').toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }) : '-'}</p>
                </div>
              </div>

              {/* GRÁFICA BARRAS */}
              <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-md">
                <h3 className="font-bold text-gray-700 mb-4 text-sm sm:text-base">Evolución Semestral</h3>
                <div className="h-64 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={obtenerComparacionMeses()}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="mes" axisLine={false} tickLine={false} style={{ fontSize: '11px' }} />
                      <YAxis axisLine={false} tickLine={false} style={{ fontSize: '11px' }} />
                      <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="Ingresos" fill="#10B981" radius={[4, 4, 0, 0]} barSize={30} />
                      <Bar dataKey="Gastos" fill="#F43F5E" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                {/* TENDENCIA BALANCE */}
                <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-md">
                  <h3 className="font-bold text-gray-700 mb-4 text-sm sm:text-base">Tendencia del Balance</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={obtenerTendenciaBalance()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="mes" style={{ fontSize: '11px' }} />
                        <YAxis style={{ fontSize: '11px' }} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                        <Line type="monotone" dataKey="balance" stroke="#8B5CF6" strokeWidth={3} dot={{ fill: '#8B5CF6', r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* TOP 5 CATEGORÍAS */}
                <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-md">
                  <h3 className="font-bold text-gray-700 mb-4 text-sm sm:text-base">Top 5 Categorías (6 meses)</h3>
                  {obtenerTop5Categorias().length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={obtenerTop5Categorias()} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" style={{ fontSize: '11px' }} />
                          <YAxis dataKey="name" type="category" width={80} style={{ fontSize: '10px' }} />
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                          <Bar dataKey="value" fill="#FF6B6B" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-gray-300">
                      <span className="text-4xl mb-2">📊</span>
                      <p className="text-sm">Sin datos suficientes</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {vistaActual === 'alertas' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-3 sm:mb-4">
                  <h3 className="font-bold text-gray-700 flex items-center gap-2 text-sm sm:text-base"><Bell size={18} className="text-orange-500" /> Próximos Pagos & Suscripciones</h3>
                  <button onClick={() => setShowAddPago(!showAddPago)} className="bg-orange-50 text-orange-600 p-1.5 rounded-lg"><Plus size={16} /></button>
                </div>

                {showAddPago && (
                  <div className="bg-orange-50/50 p-3 rounded-xl mb-4 border border-orange-100">
                    <input type="text" placeholder="Descripción (ej. Netflix, Arriendo)" value={nuevoPagoRecurrente.descripcion} onChange={e => setNuevoPagoRecurrente({...nuevoPagoRecurrente, descripcion: e.target.value})} className="w-full p-2 mb-2 rounded border border-orange-200 text-sm" />
                    <div className="flex gap-2 mb-2">
                       <input type="number" placeholder="Monto" value={nuevoPagoRecurrente.monto} onChange={e => setNuevoPagoRecurrente({...nuevoPagoRecurrente, monto: e.target.value})} className="w-1/2 p-2 rounded border border-orange-200 text-sm" />
                       <div className="w-1/2 flex items-center border border-orange-200 rounded px-2 bg-white text-sm">
                         <span className="text-gray-400 mr-2">Día:</span>
                         <input type="number" min="1" max="31" value={nuevoPagoRecurrente.diaDelMes} onChange={e => setNuevoPagoRecurrente({...nuevoPagoRecurrente, diaDelMes: e.target.value})} className="w-full outline-none" />
                       </div>
                    </div>
                    <select value={nuevoPagoRecurrente.categoria} onChange={e => setNuevoPagoRecurrente({ ...nuevoPagoRecurrente, categoria: e.target.value })} className="w-full p-2 mb-2 rounded border border-orange-200 text-sm bg-white">{categorias.map(c => <option key={c} value={c}>{c}</option>)}</select>
                    
                    <button onClick={() => {
                      if (nuevoPagoRecurrente.descripcion && nuevoPagoRecurrente.monto && nuevoPagoRecurrente.diaDelMes) {
                        const nuevoId = Date.now().toString();
                        setPagosRecurrentes([...pagosRecurrentes, { ...nuevoPagoRecurrente, id: nuevoId, monto: parseFloat(nuevoPagoRecurrente.monto), diaDelMes: parseInt(nuevoPagoRecurrente.diaDelMes) }]);
                        setNuevoPagoRecurrente({ descripcion: '', monto: '', diaDelMes: 1, categoria: 'Servicios' });
                        setShowAddPago(false);
                      }
                    }} className="w-full bg-orange-500 text-white py-2 rounded-lg text-sm font-bold">Agregar Alerta</button>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  {pagosRecurrentes.map(pago => {
                    const hoy = new Date().getDate();
                    const faltan = pago.diaDelMes - hoy;
                    const esInminente = faltan >= 0 && faltan <= 5;
                    const yaPaso = faltan < 0;
                    
                    return (
                      <div key={pago.id} className={`p-4 rounded-xl border-l-4 shadow-sm flex flex-col gap-2 relative ${esInminente ? 'bg-red-50 border-red-500' : yaPaso ? 'bg-gray-50 border-gray-300' : 'bg-blue-50 border-blue-400'}`}>
                        <button onClick={() => setPagosRecurrentes(pagosRecurrentes.filter(p => p.id !== pago.id))} className="absolute top-2 right-2 text-gray-400 hover:text-red-500"><X size={14}/></button>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-gray-500 px-2 bg-white rounded-full">{pago.categoria}</span>
                            <h4 className="font-bold text-slate-800 mt-1">{pago.descripcion}</h4>
                          </div>
                          <span className="font-bold text-slate-700">${pago.monto.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-end mt-2">
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar size={14} className="text-gray-500" />
                            <span className={esInminente ? 'text-red-600 font-bold' : 'text-gray-600'}>Día {pago.diaDelMes}</span>
                            {esInminente && <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded animate-pulse">¡Vence pronto!</span>}
                          </div>
                          
                          <button onClick={() => {
                            const gastoAgregado = { id: Date.now(), categoria: pago.categoria, descripcion: pago.descripcion, monto: pago.monto, fecha: new Date().toLocaleDateString('en-CA') };
                            actualizarDatosMes({ ...datosDelMes, gastos: [...datosDelMes.gastos, gastoAgregado] });
                            alert(`Gasto automático de $${pago.monto} añadido hoy.`);
                          }} className="text-xs bg-white border border-gray-200 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-colors px-3 py-1.5 rounded-lg flex items-center gap-1">
                            <Check size={12} /> Marcar Pagado hoy
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  
                  {pagosRecurrentes.length === 0 && (
                    <div className="col-span-2 py-10 text-center text-gray-400">
                      <Bell size={32} className="mx-auto mb-2 opacity-50" />
                      <p>No tienes pagos recurrentes programados.<br/>¡Añade uno para que te avisemos!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BudgetTracker;