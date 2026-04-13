import React, { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  TrendingUp, TrendingDown, Download, Upload, Plus, Trash2,
  Briefcase, Plane, User, X, Menu, Award
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

  // --- ESTADO DEL PROYECTO ACTUAL ---
  const [mesActual, setMesActual] = useState(new Date().toLocaleDateString('en-CA').slice(0, 7));
  const [datosMensuales, setDatosMensuales] = useState({});
  const [showAddGasto, setShowAddGasto] = useState(false);
  const [showAddIngreso, setShowAddIngreso] = useState(false);
  const [vistaActual, setVistaActual] = useState('actual');

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

  useEffect(() => {
    const datosGuardados = localStorage.getItem(`budgetData_${proyectoActual}`);
    if (datosGuardados) {
      setDatosMensuales(JSON.parse(datosGuardados));
    } else {
      setDatosMensuales({});
    }
    setMesActual(new Date().toLocaleDateString('en-CA').slice(0, 7));
  }, [proyectoActual]);

  useEffect(() => {
    if (proyectoActual) {
      localStorage.setItem(`budgetData_${proyectoActual}`, JSON.stringify(datosMensuales));
    }
  }, [datosMensuales, proyectoActual]);

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
    value: datosDelMes.gastos.filter(g => g.categoria === cat).reduce((sum, g) => sum + g.monto, 0)
  })).filter(item => item.value > 0);

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

  // --- NUEVAS FUNCIONES PARA HISTÓRICO MEJORADO ---
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
              </div>
              <div className="flex bg-white p-1 rounded-xl shadow-sm">
                <button onClick={() => fileInputRef.current.click()} className="px-2 sm:px-3 py-2 text-gray-500 hover:text-blue-600" title="Importar"><Upload size={16} className="sm:w-[18px] sm:h-[18px]" /></button>
                <button onClick={exportarAExcel} className="px-2 sm:px-3 py-2 text-gray-500 hover:text-green-600" title="Exportar"><Download size={16} className="sm:w-[18px] sm:h-[18px]" /></button>
              </div>
            </div>
          </div>

          {vistaActual === 'actual' ? (
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
                            <Tooltip formatter={(value) => `${value.toLocaleString()}`} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }} />
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
          ) : (
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

              {/* GRÁFICA BARRAS: Ingresos vs Gastos */}
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
                {/* GRÁFICA LÍNEA: Tendencia Balance */}
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
        </div>
      </div>
    </div>
  );
};

export default BudgetTracker;