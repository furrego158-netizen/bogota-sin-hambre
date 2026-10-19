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
    String(report.status || "").trim().toLowerCase() === "atendida"
  ).length;

  const casosPendientes = reportesFiltrados.filter((report: any) =>
    String(report.status || "").trim().toLowerCase() === "pendiente"
  ).length;

  const porcentajeAtencion = totalReportes > 0
    ? Math.round((casosAtendidos / totalReportes) * 100)
    : 0;

  const localidadesActivas = new Set(
    reportesFiltrados
      .map((report: any) => String(report.location || "").trim())
      .filter(Boolean)
  ).size;

  return (
    <main className="dashboard-root min-h-screen bg-[#ffd63b] text-[#8b0015]">
      <style jsx global>{`
        .dashboard-root { background: linear-gradient(180deg,#ffdc35 0%,#ffe990 45%,#ffcf24 100%) !important; color:#8d0018 !important; }
        .dashboard-root .dashboard-content > div:first-child p { color:#8d0018 !important; }
        .dashboard-root .site-header { background: linear-gradient(100deg,#a9001b 0%,#e60026 54%,#ffcc24 100%) !important; border-bottom:4px solid #ffcf25 !important; }
        .dashboard-root .header-logo { display:block; width:min(340px,48vw); max-height:78px; object-fit:contain; }
        .dashboard-root .kpi-card { background:linear-gradient(135deg,#ffe34b,#ffcf22) !important; border:2px solid #e60026 !important; color:#930018 !important; box-shadow:0 5px 12px rgba(150,0,20,.14); }
        .dashboard-root .kpi-card * { color:#930018 !important; }
        .dashboard-root .filters-panel, .dashboard-root .selected-panel, .dashboard-root .recent-panel { background:linear-gradient(155deg,#d90024 0%,#a9001b 100%) !important; border:2px solid #ffcf25 !important; color:#ffe66b !important; }
        .dashboard-root .filters-panel *, .dashboard-root .selected-panel *, .dashboard-root .recent-panel * { border-color:rgba(255,218,45,.5); }
        .dashboard-root .filters-panel h3, .dashboard-root .filters-panel p, .dashboard-root .filters-panel label, .dashboard-root .filters-panel span,
        .dashboard-root .selected-panel h3, .dashboard-root .selected-panel p, .dashboard-root .selected-panel label, .dashboard-root .selected-panel span,
        .dashboard-root .recent-panel h3, .dashboard-root .recent-panel p, .dashboard-root .recent-panel span { color:#ffe66b !important; }
        .dashboard-root .filters-panel select, .dashboard-root .filters-panel input, .dashboard-root .selected-panel select { background:#ffe36a !important; color:#8d0018 !important; border:1px solid #ffbd16 !important; }
        .dashboard-root .filters-panel option, .dashboard-root .selected-panel option { background:#ffe36a; color:#8d0018; }
        .dashboard-root .layer-toggle { background:#ffdf43 !important; border:1px solid #ffbd16 !important; color:#8d0018 !important; }
        .dashboard-root .layer-toggle > span:first-child { color:#8d0018 !important; }
        .dashboard-root .layer-toggle > span:last-child { background:#b90020 !important; }
        .dashboard-root .layer-toggle > span:last-child > span { background:#ffdf43 !important; }
        .dashboard-root .map-panel { border:3px solid #ffcf25 !important; background:#e8d8a5 !important; }
        .dashboard-root .map-title { background:rgba(180,0,28,.96) !important; border:1px solid #ffcf25 !important; color:#ffe34a !important; }
        .dashboard-root .map-title * { color:#ffe34a !important; }
        .dashboard-root .map-legend { background:#ffdf43 !important; border:2px solid #e60026 !important; color:#8d0018 !important; }
        .dashboard-root .map-legend * { color:#8d0018 !important; }
        .dashboard-root .panorama-footer { border:3px solid #e60026; border-radius:18px; overflow:hidden; background:#ffdc35; box-shadow:0 8px 24px rgba(145,0,20,.18); }
        .dashboard-root .panorama-footer img { display:block; width:100%; height:clamp(145px,18vw,245px); object-fit:cover; object-position:center; }
        .dashboard-root .site-header button { background:#ffdf32 !important; color:#990018 !important; border:2px solid #990018 !important; }
        .dashboard-root .site-header .status-pill { background:#ffdf32 !important; color:#990018 !important; border:1px solid #990018 !important; }
        .dashboard-root .leaflet-bar a { background:#ffdf43 !important; color:#a5001b !important; border-color:#e60026 !important; }
        .dashboard-root .leaflet-control-attribution { background:rgba(255,223,67,.92) !important; color:#8d0018 !important; }
        @media (max-width: 1279px) { .dashboard-root .header-logo { width:min(300px,55vw); } }
      `}</style>

      {mostrarAviso && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#a9001b]/85 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-[#ffcf25] bg-[#ffdf43] text-[#8d0018] shadow-2xl">
            <div className="flex items-center justify-between bg-[#b9001c] px-6 py-5 text-[#ffe66b]">
              <div>
                <p className="text-lg font-extrabold tracking-tight">
                  SAAVEDRA
                </p>
                <p className="text-[11px] font-semibold tracking-[0.18em] text-[#ffe66b]">
                  CONCEJAL DE BOGOTÁ
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#ffcf25] text-2xl font-bold">
                !
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-6 sm:px-8">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#b9001c] text-xl font-bold text-[#ffe66b]">
                  !
                </div>
                <h2 className="text-xl font-extrabold uppercase tracking-tight text-[#b9001c] sm:text-2xl">
                  AVISO IMPORTANTE
                </h2>
              </div>

              <div className="space-y-4 text-sm leading-6 text-[#8d0018]">
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

            <div className="flex justify-end bg-[#b9001c] px-6 py-4">
              <button
                type="button"
                onClick={() => setMostrarAviso(false)}
                className="rounded-xl bg-[#ffdf32] px-7 py-3 text-sm font-extrabold text-[#990018] transition hover:brightness-105"
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

      <header className="site-header">

        <div className="flex items-center justify-between px-8 py-5">

          <div className="flex min-w-0 items-center gap-4">
            <img
              src="/LogoSaavedra-ContraElHambre.png"
              alt="Saavedra. Lucha contra el hambre"
              className="header-logo"
            />
            <p className="hidden border-l-2 border-[#ffdc35] pl-4 text-sm font-semibold text-[#ffe66b] lg:block">
              Sistema ciudadano de alertas alimentarias
            </p>
          </div>

          <div className="flex items-center gap-3">

            <div className="status-pill rounded-full border border-[#ffcf25]/70 bg-[#ffdf43] px-4 py-2 text-xs text-[#ffe66b]">
              ● Sistema activo
            </div>

            <button className="rounded-xl bg-[#ffdf32] px-4 py-2 text-sm font-extrabold text-[#990018] transition hover:brightness-105">
              Nuevo reporte
            </button>

          </div>

        </div>

      </header>

      {/* ===================================================
          CONTENIDO
      =================================================== */}

      <section className="dashboard-content px-4 py-4 sm:px-5 sm:py-5 xl:px-6">

        <div className="mb-5">

          <h2 className="text-3xl font-bold tracking-tight">
            Panorama de Bogotá
          </h2>

          <p className="mt-1 text-sm text-[#ffe66b]">
            Visualización geográfica de reportes ciudadanos relacionados
            con hambre y alimentación.
          </p>

        </div>

        {/* =================================================
            KPIs
        ================================================= */}

        <div className="kpi-grid mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">

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
            icon="⏳"
          />

          <Kpi
            title="Porcentaje de atención"
            value={`${porcentajeAtencion}%`}
            change="Sobre los reportes filtrados"
            icon="📊"
          />

          <Kpi
            title="Localidades activas"
            value={localidadesActivas.toLocaleString("es-CO")}
            change="Con reportes"
            icon="🏙️"
          />

        </div>

        {/* =================================================
            DASHBOARD
        ================================================= */}

        <div className="dashboard-grid grid min-h-[600px] grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)_330px]">

          {/* =================================================
              FILTROS
          ================================================= */}

          <aside className="filters-panel rounded-2xl border border-[#ffcf25]/70 bg-[#b9001c] p-4">

            <div className="mb-6">

              <p className="text-xs font-semibold uppercase tracking-widest text-[#ffe66b]">
                Filtros
              </p>

              <h3 className="mt-2 text-lg font-semibold">
                Explorador informes
              </h3>

            </div>

            <div className="space-y-5">

              {/* LOCALIDAD */}

              <div>

                <label className="mb-2 block text-xs text-[#ffe66b]">
                  Localidad
                </label>

                <select
                  value={filtroLocalidad}
                  onChange={(event) =>
                    setFiltroLocalidad(event.target.value)
                  }
                  className="w-full rounded-xl border border-[#ffcf25]/70 bg-[#ffdf43] px-3 py-3 text-sm outline-none"
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

                <label className="mb-2 block text-xs text-[#ffe66b]">
                  Estado
                </label>

                <select
                  value={filtroEstado}
                  onChange={(event) =>
                    setFiltroEstado(event.target.value)
                  }
                  className="w-full rounded-xl border border-[#ffcf25]/70 bg-[#ffdf43] px-3 py-3 text-sm outline-none"
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

                <label className="mb-2 block text-xs text-[#ffe66b]">
                  Categoría
                </label>

                <select
                  value={filtroCategoria}
                  onChange={(event) =>
                    setFiltroCategoria(event.target.value)
                  }
                  className="w-full rounded-xl border border-[#ffcf25]/70 bg-[#ffdf43] px-3 py-3 text-sm outline-none"
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

              <div className="border-t border-[#ffcf25]/70 pt-5">

                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#ffe66b]">
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

                  <div className="border-t border-[#ffcf25]/70 pt-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#ffe66b]">
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

          <section className="map-panel relative min-h-[600px] overflow-hidden rounded-2xl border border-[#ffcf25]/70 bg-[#f5d15a]">

            <BogotaMap
              showReports={showReports}
              showTransmi={showTransmi}
              showComedores={false}
              showLimites={showLimites}
              showNombres={showNombres}
              reports={reportesFiltrados}
              onComedorSelect={handleComedorSelect}
              onReportSelect={handleReportSelect}
            />

            {/* TITULO MAPA */}

            <div className="map-title pointer-events-none absolute left-4 top-4 z-[1000] rounded-xl border border-[#ffcf25]/70 bg-[#b9001c]/90 px-4 py-3 shadow-xl backdrop-blur">

              <p className="text-xs font-semibold uppercase tracking-widest text-[#ffe66b]">
                Mapa de Bogotá
              </p>

              <p className="mt-1 text-sm font-medium">
                Informes ciudadanos
              </p>

            </div>

            {/* LEYENDA */}

            <div className="map-legend absolute bottom-4 right-4 z-[1000] rounded-xl border border-[#e60026]/60 bg-[#ffdf43] p-3 text-[#8d0018] shadow-xl">

              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#8d0018]">
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

          <aside className="selected-panel rounded-2xl border border-[#ffcf25]/70 bg-[#b9001c] p-4">

            <div className="mb-5 flex items-start justify-between gap-3">

              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#ffe66b]">
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
                  className="rounded-lg border border-[#ffcf25]/70 px-3 py-2 text-xs text-[#ffe66b] transition hover:bg-[#ffdf43] hover:text-[#ffe66b]"
                >
                  Ver informe
                </button>
              )}

            </div>

            {/* FOTO */}

            <div className="mb-5 flex h-44 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#4a2c1b] via-[#2a1a12] to-[#151515]">

              {selectedComedor ? (
                <div className="text-center">
                  <div className="mb-2 text-5xl">🍽️</div>
                  <p className="text-xs text-[#ffe66b]">Fotografía del comedor</p>
                  <p className="mt-1 text-[10px] text-[#ffe66b]">
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
                  <div className="mb-2 text-5xl">🥄</div>
                  <p className="text-xs text-[#ffe66b]">Sin fotografía</p>
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
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ffe66b]">
                    Estado
                  </p>

                  <select
                    value={selectedReport.status || "Pendiente"}
                    onChange={(event) =>
                      cambiarEstadoReporte(event.target.value)
                    }
                    disabled={guardandoEstado || !selectedReport.id}
                    className="mt-2 w-full rounded-xl border border-[#ffcf25]/70 bg-[#ffdf43] px-3 py-3 text-sm text-[#ffe66b] outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="En revisión">En revisión</option>
                    <option value="Atendida">Atendida</option>
                    <option value="Prioritaria">Prioritaria</option>
                  </select>

                  {guardandoEstado && (
                    <p className="mt-2 text-xs text-[#ffe66b]">
                      Guardando estado...
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-[#ffcf25]/70 bg-[#ffdf43] p-4">
                <p className="text-sm text-[#ffe66b]">
                  {cargandoReportes
                    ? "Cargando reportes desde Google Sheets..."
                    : "No hay reportes disponibles."}
                </p>
              </div>
            )}

            <div className="my-5 border-t border-[#ffcf25]/70"></div>

            <div>

              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#ffe66b]">
                {selectedComedor ? "Información" : "Descripción"}
              </p>

              <p className="text-sm leading-6 text-[#ffe66b]">
                {selectedComedor
                  ? "Este comedor hace parte de la red georreferenciada de Bogotá Sin Hambre."
                  : selectedReport?.description || "Sin descripción disponible."}
              </p>

            </div>

            {/* SEGUIMIENTO */}

            {selectedComedor ? (
              <div className="mt-6">
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#ffe66b]">
                  Estado del punto
                </p>

                <div className="rounded-xl border border-[#ffcf25]/70 bg-[#ffdf43] p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ffdf32] text-[#ffdf32]">
                      ✓
                    </span>

                    <div>
                      <p className="text-sm font-semibold text-[#ffe66b]">
                        Comedor georreferenciado
                      </p>

                      <p className="mt-0.5 text-xs text-[#ffe66b]">
                        Punto disponible en el mapa
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6">

                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#ffe66b]">
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

        <div className="recent-panel mt-5 rounded-2xl border border-[#ffcf25]/70 bg-[#b9001c] p-4">

          <div className="mb-5 flex items-center justify-between">

            <div>

              <p className="text-xs font-semibold uppercase tracking-widest text-[#ffe66b]">
                Actividad
              </p>

              <h3 className="mt-1 text-lg font-semibold">
                Informes recientes
              </h3>

            </div>

            <button className="text-xs text-[#ffe66b] transition hover:text-[#ffe66b]">
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
                    ? "border-[#ffcf25] bg-[#ffdf43]"
                    : "border-[#ffcf25]/70 bg-[#ffe875] hover:bg-[#ffcf24]"
                }`}
              >

                <div className="mb-3 flex items-start justify-between">

                  <span className="text-xl">
                    🥄
                  </span>

                  <span className="rounded-full bg-[#ffdf43] px-2 py-1 text-[10px] text-[#ffe66b]">
                    {report.status}
                  </span>

                </div>

                <p className="text-sm font-semibold">
                  {report.location}
                </p>

                <p className="mt-1 text-xs text-[#ffe66b]">
                  {report.address}
                </p>

                <p className="mt-3 text-xs text-[#ffe66b]">
                  {report.date}
                </p>

              </button>

            ))}

          </div>

        </div>

        {/* PANORÁMICA DE BOGOTÁ: franja inferior, debajo del mapa */}
        <div className="panorama-footer mt-5 w-full">
          <img
            src="/panoramica-bogota-sombrilla.png"
            alt="Panorámica de Bogotá y sus cerros orientales"
            loading="lazy"
            onError={(event) => {
              console.error("No se pudo cargar la panorámica. Verifica que public/panoramica-bogota-sombrilla.png exista en esta rama de prueba.");
              event.currentTarget.style.display = "none";
            }}
          />
          <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-[#e60026] via-[#d60020] to-[#ffcf24] px-4 py-2 text-sm font-extrabold text-[#ffe34a] sm:px-6">
            <span>Bogotá, territorio que cuidamos</span>
            <span className="hidden sm:inline">Saavedra · Lucha contra el hambre</span>
          </div>
        </div>

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
    <div className="kpi-card rounded-2xl border border-[#ffcf25]/70 bg-[#b9001c] p-4">

      <div className="flex items-center justify-between">

        <p className="text-xs font-medium text-[#ffe66b]">
          {title}
        </p>

        <span className="text-lg">
          {icon}
        </span>

      </div>

      <div className="mt-4 flex items-end justify-between">

        <p className="text-3xl font-bold tracking-tight">
          {value}
        </p>

        <span className="text-xs text-[#ffdf32]">
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
      className="layer-toggle flex w-full items-center justify-between rounded-xl border border-[#ffcf25]/70 bg-[#ffe875] px-3 py-3 text-left transition hover:bg-[#ffcf24]"
    >

      <span className="text-sm text-[#ffe66b]">
        {label}
      </span>

      <span
        className={`flex h-5 w-9 items-center rounded-full p-1 transition ${
          active
            ? "bg-[#e60026]"
            : "bg-[#ffcf24]"
        }`}
      >

        <span
          className={`h-3 w-3 rounded-full bg-[#ffdf32] transition ${
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

      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ffe66b]">
        {label}
      </p>

      <p className="mt-1 text-sm text-[#ffe66b]">
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
            ? "bg-[#e60026] text-[#ffe66b]"
            : "bg-[#ffdf43] text-[#ffe66b]"
        }`}
      >
        {active ? "✓" : "•"}
      </div>

      <div>

        <p
          className={`text-sm ${
            active
              ? "text-[#ffe66b]"
              : "text-[#ffe66b]"
          }`}
        >
          {title}
        </p>

        <p className="mt-0.5 text-xs text-[#ffe66b]">
          {description}
        </p>

      </div>

    </div>
  );
}
