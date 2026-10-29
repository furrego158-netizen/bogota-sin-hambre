"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const BogotaMap = dynamic(() => import("./components/BogotaMap"), {
  ssr: false,
});

const API_URL = "/api/reportes";

function getDriveImageUrls(value: string = "") {
  const raw = String(value).trim();
  if (!raw) return [];

  // Google Forms puede entregar distintos formatos de enlace de Drive.
  // Conservamos también el resourcekey cuando existe, porque algunos
  // archivos compartidos por enlace lo necesitan para poder mostrarse.
  let url: URL | null = null;
  try {
    url = new URL(raw);
  } catch {
    url = null;
  }

  const fileId =
    raw.match(/\/file\/d\/([^/?#]+)/)?.[1] ||
    raw.match(/[?&]id=([^&#]+)/)?.[1] ||
    raw.match(/\/d\/([^/?#]+)/)?.[1] ||
    "";

  if (!fileId) return [raw];

  const resourceKey = url?.searchParams.get("resourcekey") || "";
  const resourceParam = resourceKey
    ? `&resourcekey=${encodeURIComponent(resourceKey)}`
    : "";

  return [
    `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1200${resourceParam}`,
    `https://drive.google.com/uc?export=view&id=${encodeURIComponent(fileId)}${resourceParam}`,
    `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}${resourceParam}`,
    `https://lh3.googleusercontent.com/d/${encodeURIComponent(fileId)}=w1200`,
  ];
}

/* =========================================================
   PÁGINA
========================================================= */

export default function Home() {
  const [reportsData, setReportsData] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);

  const [guardandoEstado, setGuardandoEstado] = useState(false);
  const [cargandoReportes, setCargandoReportes] = useState(true);

  const cambiarEstadoReporte = async (nuevoEstado: string) => {
    if (!selectedReport?.id) return;

    try {
      setGuardandoEstado(true);

      const url =
        `${API_URL}?accion=actualizarEstado&id=${encodeURIComponent(
          selectedReport.id
        )}&estado=${encodeURIComponent(nuevoEstado)}&t=${Date.now()}`;

      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("No fue posible actualizar el estado.");
      }

      const data = await response.json();

      if (!data.ok) {
        throw new Error(
          data.error || "No fue posible actualizar el estado."
        );
      }

      setReportsData((actuales: any[]) =>
        actuales.map((report) =>
          report.id === selectedReport.id
            ? { ...report, status: nuevoEstado }
            : report
        )
      );

      setSelectedReport((actual: any) =>
        actual
          ? {
              ...actual,
              status: nuevoEstado,
            }
          : actual
      );
    } catch (error) {
      console.error("ERROR ACTUALIZANDO ESTADO:", error);
      alert("No fue posible actualizar el estado del reporte.");
    } finally {
      setGuardandoEstado(false);
    }
  };

  useEffect(() => {
    const cargarReportes = async () => {
      try {
        setCargandoReportes(true);

        const response = await fetch(`${API_URL}?t=${Date.now()}`, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("No fue posible cargar los reportes.");
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("La respuesta de Google Sheets no es válida.");
        }

        const reportesConvertidos = data.map((item: any) => ({
          id: item.id,
          title: item.reporte || "Reporte ciudadano",
          location: item.localidad || "Sin localidad",
          address: item.direccion || "Sin dirección",
          date: item.fecha
            ? new Date(item.fecha).toLocaleDateString("es-CO", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })
            : "Sin fecha",
          category: item.reporte || "Sin categoría",
          status: item.estado || "Pendiente",
          description:
            item.descripcion ||
            "Reporte recibido por medio del formulario ciudadano de Bogotá Sin Hambre.",
          barrio: item.barrio || "",
          hayNinos: item.hayNinos || "",
          fotografia: item.fotografia || "",
          latitud: item.latitud,
          longitud: item.longitud,
        }));

        setReportsData(reportesConvertidos);

        setSelectedReport((actual: any) => {
          if (!reportesConvertidos.length) return null;

          const mismoReporte = reportesConvertidos.find(
            (report: any) => report.id === actual?.id
          );

          return mismoReporte || reportesConvertidos[0];
        });

        console.log(
          "REPORTES GOOGLE SHEETS CARGADOS:",
          reportesConvertidos
        );
      } catch (error) {
        console.error("ERROR REPORTES GOOGLE SHEETS:", error);
        setReportsData([]);
        setSelectedReport(null);
      } finally {
        setCargandoReportes(false);
      }
    };

    cargarReportes();
  }, []);

  const [selectedComedor, setSelectedComedor] = useState<any>(null);

  const handleComedorSelect = (comedor: any) => {
    setSelectedComedor(comedor);
  };

  const handleReportSelect = (report: any) => {
    setSelectedComedor(null);
    setSelectedReport(report);
  };

  const [showReports, setShowReports] = useState(false);

  const [showTransmi, setShowTransmi] = useState(false);

  const [showComedores, setShowComedores] = useState(false);

  const [showLimites, setShowLimites] = useState(false);

  const [showNombres, setShowNombres] = useState(false);

  const [mostrarAviso, setMostrarAviso] = useState(true);

  /* =========================================================
     FILTROS DEL EXPLORADOR DE INFORMES
  ========================================================= */

  const [filtroLocalidad, setFiltroLocalidad] = useState(
    "Todas las localidades"
  );

  const [filtroEstado, setFiltroEstado] = useState(
    "Todos los estados"
  );

  const [filtroCategoria, setFiltroCategoria] = useState(
    "Todas las categorías"
  );

  const reportesFiltrados = reportsData.filter((report: any) => {
    const coincideLocalidad =
      filtroLocalidad === "Todas las localidades" ||
      String(report.location || "").trim().toLowerCase() ===
        filtroLocalidad.trim().toLowerCase();

    const coincideEstado =
      filtroEstado === "Todos los estados" ||
      String(report.status || "").trim().toLowerCase() ===
        filtroEstado.trim().toLowerCase();

    const coincideCategoria =
      filtroCategoria === "Todas las categorías" ||
      String(report.category || "").trim().toLowerCase() ===
        filtroCategoria.trim().toLowerCase();

    return (
      coincideLocalidad &&
      coincideEstado &&
      coincideCategoria
    );
  });

  useEffect(() => {
    if (!reportesFiltrados.length) return;

    const sigueVisible = reportesFiltrados.some(
      (report: any) => report.id === selectedReport?.id
    );

    if (!sigueVisible) {
      setSelectedReport(reportesFiltrados[0]);
      setSelectedComedor(null);
    }
  }, [
    filtroLocalidad,
    filtroEstado,
    filtroCategoria,
    reportsData,
  ]);

  const totalReportes = reportesFiltrados.length;

  const casosPrioritarios = reportesFiltrados.filter((report: any) =>
    String(report.status || "").toLowerCase().includes("priorit")
  ).length;

  const casosAtendidos = reportesFiltrados.filter((report: any) =>
    String(report.status || "").toLowerCase() === "atendida"
  ).length;

  const localidadesActivas = new Set(
    reportesFiltrados
      .map((report: any) => String(report.location || "").trim())
      .filter(Boolean)
  ).size;

  const casosPendientes = reportesFiltrados.filter((report: any) => {
    const estado = String(report.status || "pendiente").trim().toLowerCase();
    return estado === "pendiente" || estado === "en revisión" || estado === "en revision";
  }).length;
  const porcentajeAtencion = totalReportes
    ? Math.round((casosAtendidos / totalReportes) * 100)
    : 0;

  // Resumen territorial: mantiene todos los estados y categorías de la localidad elegida.
  const reportesDeLocalidad = reportsData.filter((report: any) => {
    if (filtroLocalidad === "Todas las localidades") return true;
    return String(report.location || "").trim().toLowerCase() ===
      filtroLocalidad.trim().toLowerCase();
  });
  const recibidosLocalidad = reportesDeLocalidad.length;
  const atendidosLocalidad = reportesDeLocalidad.filter((report: any) =>
    String(report.status || "").trim().toLowerCase() === "atendida"
  ).length;
  const prioritariosLocalidad = reportesDeLocalidad.filter((report: any) =>
    String(report.status || "").trim().toLowerCase().includes("priorit")
  ).length;
  const pendientesLocalidad = reportesDeLocalidad.filter((report: any) => {
    const estado = String(report.status || "pendiente").trim().toLowerCase();
    return estado === "pendiente" || estado === "en revisión" || estado === "en revision";
  }).length;

  return (
    <main className="min-h-screen bg-[#fff0a8] text-[#171717]">

      {mostrarAviso && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#8f001c]/75 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-[#ffd400] bg-[#fff6cf] text-black shadow-2xl">
            <div className="flex items-center justify-between bg-[#c8102e] px-6 py-5 text-white">
              <div>
                <p className="text-lg font-extrabold tracking-tight">
                  SAAVEDRA
                </p>
                <p className="text-[11px] font-semibold tracking-[0.18em] text-white/90">
                  CONCEJAL DE BOGOTÁ
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/70 text-2xl font-bold">
                !
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-6 sm:px-8">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#c8102e] text-xl font-bold text-white">
                  !
                </div>
                <h2 className="text-xl font-extrabold uppercase tracking-tight text-[#c8102e] sm:text-2xl">
                  AVISO IMPORTANTE
                </h2>
              </div>

              <div className="space-y-4 text-sm leading-6 text-black/75">
                <p>
                  Este aplicativo es exclusivamente informativo.
                </p>

                <p>
                  La información publicada no gestiona ni garantiza cupos en los
                  comedores, ni representa a las entidades prestadoras del servicio.
                </p>

                <p>
                  Los datos registrados no serán utilizados con fines políticos,
                  electorales o proselitistas.
                </p>

                <p>
                  Esta información será usada por el equipo del concejal David
                  Saavedra para confirmar la veracidad de las denuncias y de ser el
                  caso orientar a las personas en situación de riesgo para acceder a
                  los servicios.
                </p>

                <p>
                  Al continuar usted acepta que ha entendido toda esta información
                  que se ve en este formulario, y entiende el uso que se le dará a
                  estos datos por el equipo del concejal y las correspondientes
                  actividades que hará la oficina del concejal David Saavedra.
                </p>
              </div>
            </div>

            <div className="flex justify-end bg-[#c8102e] px-6 py-4">
              <button
                type="button"
                onClick={() => setMostrarAviso(false)}
                className="rounded-xl bg-[#fff6cf] px-7 py-3 text-sm font-extrabold text-[#c8102e] transition hover:bg-[#fff6cf]/90"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="border-b-4 border-[#ffd400] bg-[#c8102e] text-white shadow-lg">

        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8 lg:py-5">

          <div className="flex items-center gap-3">

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#ffd400] text-[#c8102e] text-3xl shadow-inner" aria-label="Símbolo Sombrilla">
              ☂
            </div>

            <div>

              <h1 className="text-xl font-bold tracking-tight">
                DAVID SAAVEDRA
              </h1>

              <p className="text-xs font-bold tracking-wide text-[#ffd400]">
                REPORTES DE CIUDADANOS
              </p>

            </div>

          </div>

          <div className="flex items-center gap-3">

            <div className="rounded-full border border-[#e5b800]/50 bg-[#fff1b8] px-4 py-2 text-xs text-[#4b5563]">
              ● Sistema activo
            </div>

            <button className="rounded-xl bg-[#fff6cf] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#fff6cf]/90">
              Nuevo reporte
            </button>

          </div>

        </div>

      </header>

      {/* PANORÁMICA REAL DE BOGOTÁ */}
      <section className="relative isolate h-[190px] overflow-hidden border-b-4 border-[#ffd400] sm:h-[230px] lg:h-[260px]">
        <img
          src="https://thumb.wikimedia.org/wikipedia/commons/thumb/1/11/Bogot%C3%A1_Colombia_panorama.jpg/1280px-Bogot%C3%A1_Colombia_panorama.jpg"
          alt="Panorámica de Bogotá desde Monserrate"
          className="absolute inset-0 h-full w-full object-cover object-center"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
        <div className="absolute inset-0 -z-0 bg-gradient-to-r from-[#8f001c]/95 via-[#8f001c]/55 to-transparent" />
        <div className="relative z-10 flex h-full max-w-5xl flex-col justify-center px-6 py-6 text-white sm:px-10 lg:px-12">
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.24em] text-[#ffd400]">Bogotá · territorio que cuidamos</p>
          <h2 className="max-w-2xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">Reportes de ciudadanos</h2>
          <p className="mt-3 max-w-xl text-sm font-medium text-white sm:text-base">Un mapa para escuchar a la ciudadanía, identificar situaciones y hacer seguimiento territorial.</p>
        </div>
        <div className="absolute bottom-2 right-3 z-10 rounded-md bg-[#fff6cf]/95 px-2 py-1 text-[10px] font-semibold text-[#5d2430]">
          Foto: Dori · Wikimedia Commons · CC BY-SA 3.0
        </div>
      </section>

      {/* ===================================================
          CONTENIDO
      =================================================== */}

      <section className="px-4 py-5 sm:px-6 lg:px-8 lg:py-7">

        <div className="mb-6">

          <h2 className="text-2xl font-black tracking-tight text-[#a60024] sm:text-3xl">
            Reportes ciudadanos
          </h2>

          <p className="mt-1 text-sm text-[#666666]">
            Mapa interactivo de reportes ciudadanos en Bogotá.
          </p>

        </div>

        {/* =================================================
            KPIs
        ================================================= */}

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">

          <Kpi
            title="Reportes recibidos"
            value={totalReportes.toLocaleString("es-CO")}
            change="Datos actuales"
            icon="📍"
          />

          <Kpi
            title="Casos prioritarios"
            value={casosPrioritarios.toLocaleString("es-CO")}
            change="Estado actual"
            icon="⚠️"
          />

          <Kpi
            title="Casos atendidos"
            value={casosAtendidos.toLocaleString("es-CO")}
            change="Estado actual"
            icon="✓"
          />

          <Kpi
            title="Casos pendientes"
            value={casosPendientes.toLocaleString("es-CO")}
            change="Por gestionar"
            icon="⌛"
          />

          <Kpi
            title="Porcentaje de atención"
            value={`${porcentajeAtencion}%`}
            change="De los reportes filtrados"
            icon="📊"
          />

          <Kpi
            title="Localidades activas"
            value={localidadesActivas.toLocaleString("es-CO")}
            change="Con reportes"
            icon="🏙️"
          />

        </div>

        {/* RESUMEN TERRITORIAL POR LOCALIDAD */}
        <section className="mb-6 overflow-hidden rounded-2xl border border-[#e5b800] bg-[#fff9e8] shadow-sm">
          <div className="flex flex-col gap-1 border-b border-[#f0d66a] bg-[#c8102e] px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-base font-extrabold">Balance territorial de reportes</h3>
            <p className="text-xs font-semibold text-white/90">
              {filtroLocalidad === "Todas las localidades" ? "Bogotá · todas las localidades" : `Localidad: ${filtroLocalidad}`}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
            <div className="rounded-xl border border-[#f0d66a] bg-white p-4">
              <p className="text-xs font-semibold text-[#666]">Recibidos</p>
              <p className="mt-1 text-2xl font-black text-[#c8102e]">{recibidosLocalidad.toLocaleString("es-CO")}</p>
            </div>
            <div className="rounded-xl border border-[#f0d66a] bg-white p-4">
              <p className="text-xs font-semibold text-[#666]">Atendidos</p>
              <p className="mt-1 text-2xl font-black text-[#287a3d]">{atendidosLocalidad.toLocaleString("es-CO")}</p>
            </div>
            <div className="rounded-xl border border-[#f0d66a] bg-white p-4">
              <p className="text-xs font-semibold text-[#666]">Pendientes / en revisión</p>
              <p className="mt-1 text-2xl font-black text-[#a65b00]">{pendientesLocalidad.toLocaleString("es-CO")}</p>
            </div>
            <div className="rounded-xl border border-[#f0d66a] bg-white p-4">
              <p className="text-xs font-semibold text-[#666]">Prioritarios</p>
              <p className="mt-1 text-2xl font-black text-[#7d1730]">{prioritariosLocalidad.toLocaleString("es-CO")}</p>
            </div>
          </div>
        </section>

        {/* =================================================
            DASHBOARD
        ================================================= */}

        <div className="grid min-h-[650px] grid-cols-1 gap-4 xl:grid-cols-[260px_minmax(0,1fr)_330px] 2xl:gap-5">

          {/* =================================================
              FILTROS
          ================================================= */}

          <aside className="rounded-2xl border border-[#e5b800] bg-[#fffdf5] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">

            <div className="mb-6">

              <p className="text-xs font-semibold uppercase tracking-widest text-[#666666]">
                Filtros
              </p>

              <h3 className="mt-2 text-lg font-semibold">
                Explorador informes
              </h3>

            </div>

            <div className="space-y-5">

              {/* LOCALIDAD */}

              <div>

                <label className="mb-2 block text-xs text-[#666666]">
                  Localidad
                </label>

                <select
                  value={filtroLocalidad}
                  onChange={(event) =>
                    setFiltroLocalidad(event.target.value)
                  }
                  className="w-full rounded-xl border border-[#e5b800]/50 bg-[#fff6cf] px-3 py-3 text-sm outline-none"
                >

                  <option>
                    Todas las localidades
                  </option>

                  <option>Usaquén</option>
                  <option>Chapinero</option>
                  <option>Santa Fe</option>
                  <option>San Cristóbal</option>
                  <option>Usme</option>
                  <option>Tunjuelito</option>
                  <option>Bosa</option>
                  <option>Kennedy</option>
                  <option>Fontibón</option>
                  <option>Engativá</option>
                  <option>Suba</option>
                  <option>Barrios Unidos</option>
                  <option>Teusaquillo</option>
                  <option>Los Mártires</option>
                  <option>Antonio Nariño</option>
                  <option>Puente Aranda</option>
                  <option>La Candelaria</option>
                  <option>Rafael Uribe Uribe</option>
                  <option>Ciudad Bolívar</option>
                  <option>Sumapaz</option>

                </select>

              </div>

              {/* ESTADO */}

              <div>

                <label className="mb-2 block text-xs text-[#666666]">
                  Estado
                </label>

                <select
                  value={filtroEstado}
                  onChange={(event) =>
                    setFiltroEstado(event.target.value)
                  }
                  className="w-full rounded-xl border border-[#e5b800]/50 bg-[#fff6cf] px-3 py-3 text-sm outline-none"
                >

                  <option>
                    Todos los estados
                  </option>

                  <option>Pendiente</option>
                  <option>En revisión</option>
                  <option>Atendida</option>
                  <option>Prioritaria</option>

                </select>

              </div>

              {/* CATEGORÍA */}

              <div>

                <label className="mb-2 block text-xs text-[#666666]">
                  Categoría
                </label>

                <select
                  value={filtroCategoria}
                  onChange={(event) =>
                    setFiltroCategoria(event.target.value)
                  }
                  className="w-full rounded-xl border border-[#e5b800]/50 bg-[#fff6cf] px-3 py-3 text-sm outline-none"
                >

                  <option>
                    Todas las categorías
                  </option>

                  <option>Alimentación</option>
                  <option>Comedor comunitario</option>
                  <option>Hambre</option>
                  <option>PAE</option>
                  <option>Seguridad alimentaria</option>

                </select>

              </div>

              {/* CAPAS */}

              <div className="border-t border-[#e5b800]/50 pt-5">

                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#666666]">
                  Capas
                </p>

                <div className="space-y-3">

                  <LayerToggle
                    label="Informes ciudadanos"
                    active={showReports}
                    onClick={() =>
                      setShowReports(!showReports)
                    }
                  />

                  <LayerToggle
                    label="TransMilenio"
                    active={showTransmi}
                    onClick={() =>
                      setShowTransmi(!showTransmi)
                    }
                  />

                  <LayerToggle
                    label="🍽️ Comedores comunitarios"
                    active={showComedores}
                    onClick={() =>
                      setShowComedores(!showComedores)
                    }
                  />

                  <div className="border-t border-[#e5b800]/50 pt-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#666666]">
                      Opciones del mapa
                    </p>

                    <div className="space-y-3">
                      <LayerToggle
                        label="🗺️ Límites de localidades"
                        active={showLimites}
                        onClick={() =>
                          setShowLimites(!showLimites)
                        }
                      />

                      <LayerToggle
                        label="🏷️ Nombres de localidades"
                        active={showNombres}
                        onClick={() =>
                          setShowNombres(!showNombres)
                        }
                      />
                    </div>
                  </div>

                </div>

              </div>

            </div>

          </aside>

          {/* =================================================
              MAPA
          ================================================= */}

          <section className="relative min-h-[650px] overflow-hidden rounded-2xl border border-[#e5b800]/50 bg-[#fff9e8]">

            <BogotaMap
              showReports={showReports}
              showTransmi={showTransmi}
              showComedores={showComedores}
              showLimites={showLimites}
              showNombres={showNombres}
              reports={reportesFiltrados}
              onComedorSelect={handleComedorSelect}
              onReportSelect={handleReportSelect}
            />

            {/* TITULO MAPA */}

            <div className="pointer-events-none absolute left-5 top-5 z-[1000] rounded-xl border border-[#e5b800]/50 bg-[#fff6cf]/90 px-4 py-3 shadow-xl backdrop-blur">

              <p className="text-xs font-semibold uppercase tracking-widest text-[#666666]">
                Mapa de Bogotá
              </p>

              <p className="mt-1 text-sm font-medium">
                Informes ciudadanos
              </p>

            </div>

            {/* LEYENDA */}

            <div className="absolute bottom-5 left-5 z-[1000] rounded-xl border border-black/10 bg-[#fff6cf]/95 p-4 text-black shadow-xl">

              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-black/50">
                Leyenda
              </p>

              {showReports && (

                <div className="flex items-center gap-2 text-xs">

                  <span className="text-lg">
                    🥄
                  </span>

                  <span>
                    Informe ciudadano
                  </span>

                </div>

              )}

              {showTransmi && (

                <div className="mt-2 flex items-center gap-2 text-xs">

                  <span
                    className="h-1 w-6 rounded-full"
                    style={{
                      background: "#C8102E",
                    }}
                  />

                  <span>
                    TransMilenio
                  </span>

                </div>

              )}

              {showComedores && (
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="text-lg">🍽️</span>
                  <span>Comedor comunitario</span>
                </div>
              )}

              {showLimites && (
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="text-lg">🗺️</span>
                  <span>Límites de localidades</span>
                </div>
              )}

              {showNombres && (
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="text-lg">🏷️</span>
                  <span>Nombres de localidades</span>
                </div>
              )}

            </div>

          </section>

          {/* =================================================
              PANEL DERECHO
          ================================================= */}

          <aside className="rounded-2xl border border-[#e5b800]/50 bg-[#fff6cf] p-5">

            <div className="mb-5 flex items-start justify-between gap-3">

              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#666666]">
                  {selectedComedor ? "Comedor seleccionado" : "Informe seleccionado"}
                </p>

                <h3 className="mt-2 text-xl font-bold">
                  {selectedComedor
                    ? selectedComedor.name
                    : selectedReport?.title ||
                      (cargandoReportes
                        ? "Cargando informes..."
                        : "No hay informes disponibles")}
                </h3>
              </div>

              {selectedComedor && (
                <button
                  type="button"
                  onClick={() => setSelectedComedor(null)}
                  className="rounded-lg border border-[#e5b800]/50 px-3 py-2 text-xs text-[#555555] transition hover:bg-[#fff1b8] hover:text-[#c8102e]"
                >
                  Ver informe
                </button>
              )}

            </div>

            {/* FOTO */}

            <div className="mb-5 flex h-44 items-center justify-center overflow-hidden rounded-xl border border-[#f0d66a] bg-gradient-to-br from-[#fff6cf] via-[#ffe36e] to-[#c8102e]">

              {selectedComedor ? (
                <div className="text-center">
                  <div className="mb-2 text-5xl">🍽️</div>
                  <p className="text-xs text-[#666666]">Fotografía del comedor</p>
                  <p className="mt-1 text-[10px] text-[#777777]">
                    La fotografía se vinculará en la siguiente etapa.
                  </p>
                </div>
              ) : selectedReport?.fotografia ? (
                <img
                  src={getDriveImageUrls(selectedReport?.fotografia || "")[0] || ""}
                  alt="Fotografía del informe ciudadano"
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    const image = event.currentTarget;
                    const urls = getDriveImageUrls(selectedReport?.fotografia || "");
                    const currentIndex = Number(image.dataset.driveAttempt || "0");
                    const nextIndex = currentIndex + 1;

                    if (nextIndex < urls.length) {
                      image.dataset.driveAttempt = String(nextIndex);
                      image.src = urls[nextIndex];
                    } else {
                      image.style.display = "none";
                      image.parentElement?.classList.add("photo-error");
                    }
                  }}
                />
              ) : (
                <div className="text-center">
                  <div className="mb-2 text-5xl text-[#c8102e]">📍</div>
                  <p className="text-xs text-[#666666]">Sin fotografía</p>
                </div>
              )}

            </div>

            {/* DATOS */}

            {selectedComedor ? (
              <div className="space-y-4">
                <InfoRow
                  label="Localidad"
                  value={selectedComedor.localidad}
                />

                <InfoRow
                  label="Dirección"
                  value={selectedComedor.address}
                />

                <InfoRow
                  label="Tipo"
                  value="Comedor comunitario"
                />

                <InfoRow
                  label="Coordenadas"
                  value={`${selectedComedor.lat.toFixed(6)}, ${selectedComedor.lng.toFixed(6)}`}
                />
              </div>
            ) : selectedReport ? (
              <div className="space-y-4">
                <InfoRow
                  label="Ubicación"
                  value={selectedReport.location}
                />

                <InfoRow
                  label="Dirección"
                  value={selectedReport.address}
                />

                <InfoRow
                  label="Fecha"
                  value={selectedReport.date}
                />

                <InfoRow
                  label="Categoría"
                  value={selectedReport.category}
                />

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#777777]">
                    Estado
                  </p>

                  <select
                    value={selectedReport.status || "Pendiente"}
                    onChange={(event) =>
                      cambiarEstadoReporte(event.target.value)
                    }
                    disabled={guardandoEstado || !selectedReport.id}
                    className="mt-2 w-full rounded-xl border border-[#d8b84d] bg-white px-3 py-3 text-sm font-semibold text-[#7d1730] outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="En revisión">En revisión</option>
                    <option value="Atendida">Atendida</option>
                    <option value="Prioritaria">Prioritaria</option>
                  </select>

                  {guardandoEstado && (
                    <p className="mt-2 text-xs text-[#666666]">
                      Guardando estado...
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-[#e5b800]/50 bg-[#fff6cf] p-4">
                <p className="text-sm text-[#555555]">
                  {cargandoReportes
                    ? "Cargando reportes desde Google Sheets..."
                    : "No hay reportes disponibles."}
                </p>
              </div>
            )}

            <div className="my-5 border-t border-[#e5b800]/50"></div>

            <div>

              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#666666]">
                {selectedComedor ? "Información" : "Descripción"}
              </p>

              <p className="text-sm leading-6 text-[#4b5563]">
                {selectedComedor
                  ? "Este comedor hace parte de la red georreferenciada de Bogotá Sin Hambre."
                  : selectedReport?.description || "Sin descripción disponible."}
              </p>

            </div>

            {/* SEGUIMIENTO */}

            {selectedComedor ? (
              <div className="mt-6">
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#666666]">
                  Estado del punto
                </p>

                <div className="rounded-xl border border-[#e5b800]/50 bg-[#fff6cf] p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/15 text-green-400">
                      ✓
                    </span>

                    <div>
                      <p className="text-sm font-semibold text-[#222222]">
                        Comedor georreferenciado
                      </p>

                      <p className="mt-0.5 text-xs text-[#666666]">
                        Punto disponible en el mapa
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6">

                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#666666]">
                  Seguimiento
                </p>

                <div className="space-y-4">

                  <StatusStep
                    title="Informe recibido"
                    description="Información registrada"
                    active
                  />

                  <StatusStep
                    title="En revisión"
                    description="Validación del informe"
                    active={
                      selectedReport?.status !== "Pendiente"
                    }
                  />

                  <StatusStep
                    title="Atención"
                    description="Gestión del caso"
                    active={
                      selectedReport?.status === "Atendida"
                    }
                  />

                </div>

              </div>
            )}

          </aside>

        </div>

        {/* =================================================
            INFORMES RECIENTES
        ================================================= */}

        <div className="mt-6 rounded-2xl border border-[#e5b800]/50 bg-[#fff6cf] p-5">

          <div className="mb-5 flex items-center justify-between">

            <div>

              <p className="text-xs font-semibold uppercase tracking-widest text-[#666666]">
                Actividad
              </p>

              <h3 className="mt-1 text-lg font-semibold">
                Informes recientes
              </h3>

            </div>

            <button className="text-xs text-[#666666] transition hover:text-[#c8102e]">
              Ver todos →
            </button>

          </div>

          <div className="grid gap-3 md:grid-cols-3">

            {reportesFiltrados.map((report) => (

              <button
                key={report.id}
                onClick={() =>
                  handleReportSelect(report)
                }
                className={`rounded-xl border p-4 text-left transition ${
                  selectedReport?.id === report.id
                    ? "border-[#c8102e] bg-[#fff1b8] text-[#222222]"
                    : "border-[#e5b800]/50 bg-[#fff6cf] hover:bg-[#fff1b8]"
                }`}
              >

                <div className="mb-3 flex items-start justify-between">

                  <span className="text-xl">
                    🥄
                  </span>

                  <span className="rounded-full bg-[#fff1b8] px-2 py-1 text-[10px] text-[#555555]">
                    {report.status}
                  </span>

                </div>

                <p className="text-sm font-semibold">
                  {report.location}
                </p>

                <p className="mt-1 text-xs text-[#666666]">
                  {report.address}
                </p>

                <p className="mt-3 text-xs text-[#666666]">
                  {report.date}
                </p>

              </button>

            ))}

          </div>

        </div>

        {/* FRANJA PANORÁMICA DE CIERRE */}
        <section className="relative mt-6 h-36 overflow-hidden rounded-2xl border-2 border-[#c8102e] bg-[#fff6cf] sm:h-44">
          <img
            src="https://thumb.wikimedia.org/wikipedia/commons/thumb/1/11/Bogot%C3%A1_Colombia_panorama.jpg/1280px-Bogot%C3%A1_Colombia_panorama.jpg"
            alt="Vista panorámica de Bogotá y sus cerros orientales"
            className="h-full w-full object-cover object-center"
            loading="lazy"
          />
          <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-[#8f001c]/85 via-transparent to-transparent px-4 pb-3 sm:px-6">
            <p className="text-sm font-extrabold text-white sm:text-base">Bogotá, territorio que cuidamos</p>
            <p className="text-xs font-bold text-[#ffd400] sm:text-sm">David Saavedra · Concejal de Bogotá</p>
          </div>
        </section>
        <p className="mt-2 text-center text-[10px] text-[#6b4b00]">
          Panorámica: Dori / Wikimedia Commons, licencia CC BY-SA 3.0.
        </p>

      </section>

    </main>
  );
}

/* =========================================================
   KPI
========================================================= */

function Kpi({
  title,
  value,
  change,
  icon,
}: {
  title: string;
  value: string;
  change: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-[#e5b800]/50 bg-[#fff6cf] p-5">

      <div className="flex items-center justify-between">

        <p className="text-xs font-bold text-[#5b2430]">
          {title}
        </p>

        <span className="text-lg">
          {icon}
        </span>

      </div>

      <div className="mt-3 flex items-end justify-between gap-2">

        <p className="text-3xl font-bold tracking-tight">
          {value}
        </p>

        <span className="text-right text-[10px] font-semibold text-[#6b4b00] sm:text-xs">
          {change}
        </span>

      </div>

    </div>
  );
}

/* =========================================================
   INTERRUPTOR
========================================================= */

function LayerToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-xl border border-[#e5b800]/50 bg-[#fff6cf] px-3 py-3 text-left transition hover:bg-[#fff1b8]"
    >

      <span className="text-sm text-[#374151]">
        {label}
      </span>

      <span
        className={`flex h-5 w-9 items-center rounded-full p-1 transition ${
          active
            ? "bg-[#ffd400] text-[#c8102e]"
            : "bg-[#fff6cf]/10"
        }`}
      >

        <span
          className={`h-3 w-3 rounded-full bg-[#fff6cf] transition ${
            active
              ? "translate-x-4"
              : "translate-x-0"
          }`}
        />

      </span>

    </button>
  );
}

/* =========================================================
   INFO ROW
========================================================= */

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>

      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#777777]">
        {label}
      </p>

      <p className="mt-1 text-sm text-[#374151]">
        {value}
      </p>

    </div>
  );
}

/* =========================================================
   ESTADO
========================================================= */

function StatusStep({
  title,
  description,
  active,
}: {
  title: string;
  description: string;
  active: boolean;
}) {
  return (
    <div className="flex items-start gap-3">

      <div
        className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
          active
            ? "bg-[#ffd400] text-[#c8102e]"
            : "bg-[#fff1b8] text-[#8a6d00]"
        }`}
      >
        {active ? "✓" : "•"}
      </div>

      <div>

        <p
          className={`text-sm ${
            active
              ? "text-[#222222]"
              : "text-[#666666]"
          }`}
        >
          {title}
        </p>

        <p className="mt-0.5 text-xs text-[#777777]">
          {description}
        </p>

      </div>

    </div>
  );
}
