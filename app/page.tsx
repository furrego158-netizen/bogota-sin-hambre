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

  const [showReports, setShowReports] = useState(true);

  const [showTransmi, setShowTransmi] = useState(true);

  const [showComedores, setShowComedores] = useState(true);

  const [showLimites, setShowLimites] = useState(true);

  const [showNombres, setShowNombres] = useState(true);

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

  return (
    <main className="min-h-screen bg-[#0b0b0b] text-white">

      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="border-b border-white/10 bg-[#111111]">

        <div className="flex items-center justify-between px-8 py-5">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#7a4b2a] text-2xl">
              🥄
            </div>

            <div>

              <h1 className="text-xl font-bold tracking-tight">
                BOGOTÁ SIN HAMBRE
              </h1>

              <p className="text-xs text-white/40">
                Sistema ciudadano de alertas alimentarias
              </p>

            </div>

          </div>

          <div className="flex items-center gap-3">

            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/60">
              ● Sistema activo
            </div>

            <button className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90">
              Nuevo reporte
            </button>

          </div>

        </div>

      </header>

      {/* ===================================================
          CONTENIDO
      =================================================== */}

      <section className="px-8 py-7">

        <div className="mb-6">

          <h2 className="text-3xl font-bold tracking-tight">
            Panorama de Bogotá
          </h2>

          <p className="mt-1 text-sm text-white/40">
            Visualización geográfica de reportes ciudadanos relacionados
            con hambre y alimentación.
          </p>

        </div>

        {/* =================================================
            KPIs
        ================================================= */}

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

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
            title="Localidades activas"
            value={localidadesActivas.toLocaleString("es-CO")}
            change="Con reportes"
            icon="🏙️"
          />

        </div>

        {/* =================================================
            DASHBOARD
        ================================================= */}

        <div className="grid min-h-[650px] grid-cols-1 gap-5 xl:grid-cols-[250px_1fr_330px]">

          {/* =================================================
              FILTROS
          ================================================= */}

          <aside className="rounded-2xl border border-white/10 bg-[#111111] p-5">

            <div className="mb-6">

              <p className="text-xs font-semibold uppercase tracking-widest text-white/30">
                Filtros
              </p>

              <h3 className="mt-2 text-lg font-semibold">
                Explorador informes
              </h3>

            </div>

            <div className="space-y-5">

              {/* LOCALIDAD */}

              <div>

                <label className="mb-2 block text-xs text-white/40">
                  Localidad
                </label>

                <select
                  value={filtroLocalidad}
                  onChange={(event) =>
                    setFiltroLocalidad(event.target.value)
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#191919] px-3 py-3 text-sm outline-none"
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

                <label className="mb-2 block text-xs text-white/40">
                  Estado
                </label>

                <select
                  value={filtroEstado}
                  onChange={(event) =>
                    setFiltroEstado(event.target.value)
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#191919] px-3 py-3 text-sm outline-none"
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

                <label className="mb-2 block text-xs text-white/40">
                  Categoría
                </label>

                <select
                  value={filtroCategoria}
                  onChange={(event) =>
                    setFiltroCategoria(event.target.value)
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#191919] px-3 py-3 text-sm outline-none"
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

              <div className="border-t border-white/10 pt-5">

                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/30">
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

                  <div className="border-t border-white/10 pt-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/30">
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

          <section className="relative min-h-[650px] overflow-hidden rounded-2xl border border-white/10 bg-[#161616]">

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

            <div className="pointer-events-none absolute left-5 top-5 z-[1000] rounded-xl border border-white/10 bg-[#111111]/90 px-4 py-3 shadow-xl backdrop-blur">

              <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
                Mapa de Bogotá
              </p>

              <p className="mt-1 text-sm font-medium">
                Informes ciudadanos
              </p>

            </div>

            {/* LEYENDA */}

            <div className="absolute bottom-5 left-5 z-[1000] rounded-xl border border-black/10 bg-white/95 p-4 text-black shadow-xl">

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

          <aside className="rounded-2xl border border-white/10 bg-[#111111] p-5">

            <div className="mb-5 flex items-start justify-between gap-3">

              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/30">
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
                  className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/50 transition hover:bg-white/5 hover:text-white"
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
                  <p className="text-xs text-white/40">Fotografía del comedor</p>
                  <p className="mt-1 text-[10px] text-white/25">
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
                  <p className="text-xs text-white/40">Sin fotografía</p>
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
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25">
                    Estado
                  </p>

                  <select
                    value={selectedReport.status || "Pendiente"}
                    onChange={(event) =>
                      cambiarEstadoReporte(event.target.value)
                    }
                    disabled={guardandoEstado || !selectedReport.id}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#191919] px-3 py-3 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="En revisión">En revisión</option>
                    <option value="Atendida">Atendida</option>
                    <option value="Prioritaria">Prioritaria</option>
                  </select>

                  {guardandoEstado && (
                    <p className="mt-2 text-xs text-white/40">
                      Guardando estado...
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm text-white/50">
                  {cargandoReportes
                    ? "Cargando reportes desde Google Sheets..."
                    : "No hay reportes disponibles."}
                </p>
              </div>
            )}

            <div className="my-5 border-t border-white/10"></div>

            <div>

              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/30">
                {selectedComedor ? "Información" : "Descripción"}
              </p>

              <p className="text-sm leading-6 text-white/60">
                {selectedComedor
                  ? "Este comedor hace parte de la red georreferenciada de Bogotá Sin Hambre."
                  : selectedReport?.description || "Sin descripción disponible."}
              </p>

            </div>

            {/* SEGUIMIENTO */}

            {selectedComedor ? (
              <div className="mt-6">
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/30">
                  Estado del punto
                </p>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/15 text-green-400">
                      ✓
                    </span>

                    <div>
                      <p className="text-sm font-semibold text-white">
                        Comedor georreferenciado
                      </p>

                      <p className="mt-0.5 text-xs text-white/30">
                        Punto disponible en el mapa
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6">

                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/30">
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

        <div className="mt-6 rounded-2xl border border-white/10 bg-[#111111] p-5">

          <div className="mb-5 flex items-center justify-between">

            <div>

              <p className="text-xs font-semibold uppercase tracking-widest text-white/30">
                Actividad
              </p>

              <h3 className="mt-1 text-lg font-semibold">
                Informes recientes
              </h3>

            </div>

            <button className="text-xs text-white/40 transition hover:text-white">
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
                    ? "border-[#7a4b2a] bg-[#7a4b2a]/10"
                    : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                }`}
              >

                <div className="mb-3 flex items-start justify-between">

                  <span className="text-xl">
                    🥄
                  </span>

                  <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-white/50">
                    {report.status}
                  </span>

                </div>

                <p className="text-sm font-semibold">
                  {report.location}
                </p>

                <p className="mt-1 text-xs text-white/40">
                  {report.address}
                </p>

                <p className="mt-3 text-xs text-white/30">
                  {report.date}
                </p>

              </button>

            ))}

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
    <div className="rounded-2xl border border-white/10 bg-[#111111] p-5">

      <div className="flex items-center justify-between">

        <p className="text-xs font-medium text-white/40">
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

        <span className="text-xs text-green-400">
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
      className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3 text-left transition hover:bg-white/[0.05]"
    >

      <span className="text-sm text-white/70">
        {label}
      </span>

      <span
        className={`flex h-5 w-9 items-center rounded-full p-1 transition ${
          active
            ? "bg-[#7a4b2a]"
            : "bg-white/10"
        }`}
      >

        <span
          className={`h-3 w-3 rounded-full bg-white transition ${
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

      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25">
        {label}
      </p>

      <p className="mt-1 text-sm text-white/70">
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
            ? "bg-[#7a4b2a] text-white"
            : "bg-white/5 text-white/20"
        }`}
      >
        {active ? "✓" : "•"}
      </div>

      <div>

        <p
          className={`text-sm ${
            active
              ? "text-white"
              : "text-white/30"
          }`}
        >
          {title}
        </p>

        <p className="mt-0.5 text-xs text-white/25">
          {description}
        </p>

      </div>

    </div>
  );
}
