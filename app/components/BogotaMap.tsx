"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Tooltip,
  GeoJSON,
  useMap,
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { useEffect, useState } from "react";

/* =========================================================
   PROPIEDADES
========================================================= */

interface BogotaMapProps {
  showReports?: boolean;
  showTransmi?: boolean;
  showComedores?: boolean;
  showLimites?: boolean;
  showNombres?: boolean;
  onComedorSelect?: (comedor: any) => void;
  reports?: any[];
  onReportSelect?: (report: any) => void;
}

/* =========================================================
   CUCHARA
========================================================= */

const spoonIcon = L.divIcon({
  className: "",

  html: `
    <div
      style="
        width:44px;
        height:52px;
        display:flex;
        align-items:center;
        justify-content:center;
        filter:drop-shadow(0px 3px 4px rgba(0,0,0,.45));
      "
    >

      <svg
        width="38"
        height="48"
        viewBox="0 0 38 48"
        xmlns="http://www.w3.org/2000/svg"
      >

        <ellipse
          cx="19"
          cy="11"
          rx="10"
          ry="12"
          fill="#7A4B2A"
        />

        <ellipse
          cx="16"
          cy="7"
          rx="3"
          ry="4"
          fill="#A97850"
          opacity=".75"
        />

        <rect
          x="16"
          y="20"
          width="6"
          height="25"
          rx="3"
          fill="#7A4B2A"
        />

        <circle
          cx="19"
          cy="45"
          r="3"
          fill="#7A4B2A"
        />

      </svg>

    </div>
  `,

  iconSize: [44, 52],

  iconAnchor: [22, 52],

  popupAnchor: [0, -50],
});

/* =========================================================
   COLORES POR LOCALIDAD
========================================================= */

const LOCALIDAD_COLORS: Record<string, string> = {
  "USAQUÉN": "#F4C430",
  "CHAPINERO": "#36B44A",
  "SANTA FE": "#2F80ED",
  "SAN CRISTÓBAL": "#B84DDB",
  "USME": "#FF8A00",
  "TUNJUELITO": "#8B6A2B",
  "BOSA": "#EF3F43",
  "KENNEDY": "#FF8A32",
  "FONTIBÓN": "#27B9D1",
  "ENGATIVÁ": "#3E5BEF",
  "SUBA": "#9C42D6",
  "BARRIOS UNIDOS": "#8D8D8D",
  "TEUSAQUILLO": "#1FA7A9",
  "LOS MÁRTIRES": "#F49A68",
  "ANTONIO NARIÑO": "#D8D8D8",
  "PUENTE ARANDA": "#E84FAE",
  "LA CANDELARIA": "#7E3FB7",
  "RAFAEL URIBE URIBE": "#7356D8",
  "CIUDAD BOLÍVAR": "#4E83E8",
  "SUMAPAZ": "#D5B45B",
};

function normalizeLocalidad(value: string = "") {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function getLocalidadColor(localidad: string) {
  const key = normalizeLocalidad(localidad);

  const match = Object.keys(LOCALIDAD_COLORS).find(
    (name) => normalizeLocalidad(name) === key
  );

  return match ? LOCALIDAD_COLORS[match] : "#7A4B2A";
}

function getLocalidadName(properties: any, fallback = "Localidad") {
  const values = Object.values(properties || {}).filter(
    (value: any) => typeof value === "string"
  );

  const match = values.find((value: any) =>
    Object.keys(LOCALIDAD_COLORS).some(
      (name) => normalizeLocalidad(name) === normalizeLocalidad(String(value))
    )
  );

  if (match) return String(match);

  return String(
    properties?.NOM_LOC ||
      properties?.NOMBRE ||
      properties?.NOMBRE_LOCALIDAD ||
      properties?.LOCALIDAD ||
      properties?.Nombre ||
      fallback
  );
}

/* =========================================================
   COMEDOR COMUNITARIO
========================================================= */

function createComedorIcon(localidad: string) {
  const color = getLocalidadColor(localidad);

  return L.divIcon({
    className: "",
    html: `
      <div
        style="
          width:28px;
          height:28px;
          display:flex;
          align-items:center;
          justify-content:center;
          background:${color};
          border:2px solid white;
          border-radius:50%;
          box-shadow:0 2px 7px rgba(0,0,0,.45);
          font-size:15px;
          line-height:1;
          cursor:pointer;
        "
        title="Comedor comunitario"
      >
        🍽️
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

/* =========================================================
   ESTACIÓN TRANSMILENIO
========================================================= */

const stationIcon = L.divIcon({
  className: "",

  html: `
    <div
      style="
        width:17px;
        height:17px;
        background:#C8102E;
        border:3px solid white;
        border-radius:50%;
        box-shadow:
          0 2px 6px rgba(0,0,0,.45),
          0 0 0 2px rgba(200,16,46,.20);
      "
    ></div>
  `,

  iconSize: [17, 17],

  iconAnchor: [8.5, 8.5],

  popupAnchor: [0, -10],
});

/* =========================================================
   REPORTES DE PRUEBA
========================================================= */

const reports = [
  {
    id: 1,
    lat: 4.6097,
    lng: -74.0817,
    title: "Situación reportada en comedor",
    address: "Carrera 18 # 12-45",
    location: "Los Mártires",
    date: "03 de septiembre de 2026",
    category: "Alimentación",
    status: "Nueva",
    description:
      "La ciudadanía reporta una situación relacionada con la atención alimentaria.",
  },

  {
    id: 2,
    lat: 4.6486,
    lng: -74.0701,
    title: "Reporte ciudadano",
    address: "Calle 45 # 20-18",
    location: "Teusaquillo",
    date: "02 de septiembre de 2026",
    category: "Comedor comunitario",
    status: "En revisión",
    description:
      "Reporte recibido por medio del formulario ciudadano de Bogotá Sin Hambre.",
  },

  {
    id: 3,
    lat: 4.5709,
    lng: -74.0937,
    title: "Situación alimentaria",
    address: "Carrera 50 # 68-32 Sur",
    location: "Ciudad Bolívar",
    date: "01 de septiembre de 2026",
    category: "Hambre",
    status: "Prioritaria",
    description:
      "La comunidad informa sobre una situación que requiere atención prioritaria.",
  },
];

/* =========================================================
   COMEDORES COMUNITARIOS
   Datos cargados desde /public/comedores.json
========================================================= */

/* =========================================================
   CLUSTERING DE COMEDORES
========================================================= */

function getClusterCellSize(zoom: number) {
  if (zoom <= 10) return 0.035;
  if (zoom <= 11) return 0.020;
  if (zoom <= 12) return 0.010;
  if (zoom <= 13) return 0.005;
  return 0.0018;
}

function buildComedorClusters(items: any[], zoom: number) {
  if (zoom >= 14) {
    return items.map((comedor) => ({
      id: `single-${comedor.id}`,
      lat: comedor.lat,
      lng: comedor.lng,
      count: 1,
      items: [comedor],
      locality: comedor.localidad,
    }));
  }

  const cell = getClusterCellSize(zoom);
  const groups = new Map<string, any[]>();

  items.forEach((comedor) => {
    const x = Math.floor(comedor.lng / cell);
    const y = Math.floor(comedor.lat / cell);
    const key = `${x}:${y}`;

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(comedor);
  });

  return Array.from(groups.values()).map((group, index) => {
    const lat =
      group.reduce((sum, item) => sum + item.lat, 0) / group.length;
    const lng =
      group.reduce((sum, item) => sum + item.lng, 0) / group.length;

    const counts = new Map<string, number>();

    group.forEach((item) => {
      counts.set(
        item.localidad,
        (counts.get(item.localidad) || 0) + 1
      );
    });

    const locality =
      Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "Bogotá";

    return {
      id: `cluster-${index}-${group.length}`,
      lat,
      lng,
      count: group.length,
      items: group,
      locality,
    };
  });
}

function ZoomListener({
  onZoom,
}: {
  onZoom: (zoom: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    onZoom(map.getZoom());

    const handler = () => onZoom(map.getZoom());
    map.on("zoomend", handler);

    return () => {
      map.off("zoomend", handler);
    };
  }, [map, onZoom]);

  return null;
}

function createClusterIcon(count: number, locality: string) {
  const color = getLocalidadColor(locality);

  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:44px;
        height:44px;
        display:flex;
        align-items:center;
        justify-content:center;
        background:${color};
        border:3px solid white;
        border-radius:50%;
        box-shadow:0 3px 9px rgba(0,0,0,.40);
        color:white;
        font-family:Arial,sans-serif;
        font-size:14px;
        font-weight:800;
      ">
        ${count}
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
}

function ComedorClusterMarker({
  cluster,
}: {
  cluster: any;
}) {
  const map = useMap();

  return (
    <Marker
      position={[cluster.lat, cluster.lng]}
      icon={createClusterIcon(cluster.count, cluster.locality)}
      eventHandlers={{
        click: () => {
          const nextZoom = Math.min(map.getZoom() + 2, 15);
          map.flyTo([cluster.lat, cluster.lng], nextZoom, {
            duration: 0.6,
          });
        },
      }}
    >
      <Tooltip direction="top" offset={[0, -22]} opacity={1}>
        <span
          style={{
            fontWeight: 700,
            fontSize: "12px",
            color: getLocalidadColor(cluster.locality),
          }}
        >
          {cluster.count} comedores · haz clic para acercar
        </span>
      </Tooltip>
    </Marker>
  );
}

/* =========================================================
   MAPA
========================================================= */

export default function BogotaMap({
  showReports = true,
  showTransmi = true,
  showComedores = true,
  showLimites = true,
  showNombres = true,
  onComedorSelect,
  reports: reportsFromPage = reports,
  onReportSelect,
}: BogotaMapProps) {

  const [
    transmilenio,
    setTransmilenio,
  ] = useState<{
    routes: any;
    stations: any;
  } | null>(null);

  const [
    loadingTransmilenio,
    setLoadingTransmilenio,
  ] = useState(true);

  const [
    errorTransmilenio,
    setErrorTransmilenio,
  ] = useState(false);

  const [localidades, setLocalidades] = useState<any>(null);

  const [mapZoom, setMapZoom] = useState(11.5);

  const [comedores, setComedores] = useState<any[]>([]);


  /* =======================================================
     CARGAR COMEDORES
  ======================================================= */

  useEffect(() => {
    fetch("/comedores.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error("No fue posible cargar los comedores.");
        }
        return response.json();
      })
      .then((data) => {
        console.log("COMEDORES CARGADOS:", data.length);
        setComedores(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        console.error("ERROR COMEDORES:", error);
        setComedores([]);
      });
  }, []);

  /* =======================================================
     CARGAR LOCALIDADES
  ======================================================= */

  useEffect(() => {
    fetch(LOCALIDADES_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error("No fue posible cargar las localidades.");
        }
        return response.json();
      })
      .then((data) => {
        console.log("LOCALIDADES CARGADAS:", data);
        setLocalidades(data);
      })
      .catch((error) => {
        console.error("ERROR LOCALIDADES:", error);
      });
  }, []);

  /* =======================================================
     CARGAR DATOS
  ======================================================= */

  useEffect(() => {
    getTransmilenioData()

      .then((data) => {

        console.log(
          "TRANSMILENIO CARGADO:",
          data
        );

        setTransmilenio(data);

        setLoadingTransmilenio(false);
      })

      .catch((error) => {

        console.error(
          "ERROR TRANSMILENIO:",
          error
        );

        setErrorTransmilenio(true);

        setLoadingTransmilenio(false);
      });

  }, []);

  return (

    <div className="relative h-full w-full overflow-hidden rounded-2xl">

      <MapContainer
        center={[4.6097, -74.0817]}
        zoom={11.5}
        scrollWheelZoom={true}
        className="h-full w-full"
      >

        {/* =================================================
            OPENSTREETMAP
        ================================================= */}

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapResize />
        <ZoomListener onZoom={setMapZoom} />

        {/* =================================================
            LOCALIDADES — COLORES
        ================================================= */}

        {showLimites &&
          localidades?.features?.map((feature: any, index: number) => {
            const localidad = getLocalidadName(
              feature.properties,
              `Localidad ${index + 1}`
            );

            const color = getLocalidadColor(localidad);

            return (
              <GeoJSON
                key={`localidad-${index}`}
                data={feature}
                style={{
                  color,
                  weight: 1.5,
                  opacity: 0.75,
                  fillColor: color,
                  fillOpacity: 0.11,
                }}
              />
            );
          })}

        {/* =================================================
            NOMBRES DE LOCALIDADES
        ================================================= */}

        {showNombres &&
          localidades?.features?.map((feature: any, index: number) => {
            const localidad = getLocalidadName(
              feature.properties,
              `Localidad ${index + 1}`
            );

            const center = getFeatureCenter(feature);

            if (!center) return null;

            return (
              <Marker
                key={`localidad-label-${index}`}
                position={center}
                interactive={false}
                icon={L.divIcon({
                  className: "",
                  html: `
                    <div style="
                      background:rgba(255,255,255,.94);
                      border:1px solid rgba(0,0,0,.15);
                      border-radius:8px;
                      padding:3px 6px;
                      box-shadow:0 1px 4px rgba(0,0,0,.16);
                      color:#222;
                      font-family:Arial,sans-serif;
                      font-size:10px;
                      font-weight:700;
                      white-space:nowrap;
                    ">
                      ${localidad}
                    </div>
                  `,
                  iconSize: [0, 0],
                  iconAnchor: [0, 0],
                })}
              />
            );
          })}

        {/* =================================================
            CUCHARAS / INFORMES
        ================================================= */}

        {showReports &&
          reportsFromPage
            .filter((report: any) => {
              const lat = Number(report.latitud ?? report.lat);
              const lng = Number(report.longitud ?? report.lng);
              return Number.isFinite(lat) && Number.isFinite(lng);
            })
            .map((report: any) => {
              const lat = Number(report.latitud ?? report.lat);
              const lng = Number(report.longitud ?? report.lng);

              return (
                <Marker
                  key={report.id}
                  position={[lat, lng]}
                  icon={spoonIcon}
                  eventHandlers={{
                    click: () => onReportSelect?.(report),
                  }}
                >

              <Popup>

                <div
                  style={{
                    minWidth: "250px",
                    fontFamily:
                      "Arial, sans-serif",
                  }}
                >

                  <h3
                    style={{
                      margin:
                        "0 0 10px",
                      fontSize:
                        "16px",
                      fontWeight: 700,
                      color: "#222",
                    }}
                  >
                    {report.title}
                  </h3>

                  <p
                    style={{
                      margin: "5px 0",
                      fontSize: "13px",
                      color: "#555",
                    }}
                  >
                    📍{" "}
                    <strong>
                      {report.location}
                    </strong>
                  </p>

                  <p
                    style={{
                      margin: "5px 0",
                      fontSize: "13px",
                      color: "#555",
                    }}
                  >
                    🏠 {report.address}
                  </p>

                  <p
                    style={{
                      margin: "5px 0",
                      fontSize: "13px",
                      color: "#555",
                    }}
                  >
                    📅 {report.date}
                  </p>

                  <p
                    style={{
                      margin: "8px 0",
                      padding: "6px 9px",
                      borderRadius: "8px",
                      background: "#F3E8DF",
                      color: "#7A4B2A",
                      fontWeight: 600,
                      fontSize: "12px",
                    }}
                  >
                    {report.status}
                  </p>

                  <p
                    style={{
                      margin:
                        "10px 0 0",
                      fontSize: "13px",
                      lineHeight: 1.5,
                      color: "#444",
                    }}
                  >
                    {report.description}
                  </p>

                </div>

              </Popup>

                </Marker>
              );
            })
        }

        {/* =================================================
            COMEDORES COMUNITARIOS — CLUSTERING
        ================================================= */}

        {showComedores &&
          buildComedorClusters(comedores, mapZoom).map((cluster: any) => {
            const isCluster = cluster.count > 1;

            if (isCluster) {
              return (
                <ComedorClusterMarker
                  key={cluster.id}
                  cluster={cluster}
                />
              );
            }

            const comedor = cluster.items[0];

            return (
              <Marker
                key={`comedor-${comedor.id}`}
                position={[comedor.lat, comedor.lng]}
                icon={createComedorIcon(comedor.localidad)}
                eventHandlers={{
                  click: () => onComedorSelect?.(comedor),
                }}
              >
                <Tooltip
                  direction="top"
                  offset={[0, -14]}
                  opacity={1}
                  sticky={true}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: "12px",
                      color: getLocalidadColor(comedor.localidad),
                      whiteSpace: "nowrap",
                    }}
                  >
                    {comedor.name}
                  </span>
                </Tooltip>

                <Popup>
                  <div
                    style={{
                      minWidth: "240px",
                      fontFamily: "Arial, sans-serif",
                    }}
                  >
                    <div
                      style={{
                        display: "inline-block",
                        padding: "4px 8px",
                        borderRadius: "999px",
                        background: `${getLocalidadColor(comedor.localidad)}22`,
                        color: getLocalidadColor(comedor.localidad),
                        fontSize: "10px",
                        fontWeight: 700,
                        marginBottom: "8px",
                      }}
                    >
                      🍽️ COMEDOR COMUNITARIO
                    </div>

                    <h3
                      style={{
                        margin: "0 0 8px",
                        fontSize: "16px",
                        fontWeight: 700,
                        color: "#222",
                      }}
                    >
                      {comedor.name}
                    </h3>

                    {comedor.foto ? (
                      <img
                        src={comedor.foto}
                        alt={`Fotografía de ${comedor.name}`}
                        style={{
                          width: "100%",
                          height: "145px",
                          objectFit: "cover",
                          borderRadius: "10px",
                          margin: "4px 0 10px",
                          display: "block",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexDirection: "column",
                          gap: "5px",
                          borderRadius: "10px",
                          margin: "4px 0 10px",
                          background: "#F5F5F5",
                          color: "#777",
                        }}
                      >
                        <span style={{ fontSize: "28px" }}>🍽️</span>
                        <span style={{ fontSize: "11px", fontWeight: 700 }}>
                          {comedor.esNuevo ? "NUEVO COMEDOR" : "SIN FOTOGRAFÍA"}
                        </span>
                      </div>
                    )}

                    {comedor.esNuevo && (
                      <div
                        style={{
                          display: "inline-block",
                          padding: "4px 8px",
                          borderRadius: "999px",
                          background: "#EAF7EE",
                          color: "#2E7D32",
                          fontSize: "10px",
                          fontWeight: 700,
                          marginBottom: "6px",
                        }}
                      >
                        🆕 NUEVO COMEDOR
                      </div>
                    )}

                    <p style={{ margin: "5px 0", fontSize: "13px", color: "#555" }}>
                      📍 <strong>{comedor.localidad}</strong>
                    </p>

                    <p style={{ margin: "5px 0", fontSize: "13px", color: "#555" }}>
                      🏠 {comedor.address}
                    </p>

                    <button
                      type="button"
                      onClick={() => onComedorSelect?.(comedor)}
                      style={{
                        width: "100%",
                        marginTop: "12px",
                        padding: "9px 12px",
                        border: "0",
                        borderRadius: "9px",
                        background: getLocalidadColor(comedor.localidad),
                        color: "white",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Ver ficha del comedor →
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* =================================================
            LÍNEAS TRANSMILENIO
        ================================================= */}

        {showTransmi &&
          transmilenio?.routes?.features?.map(
            (
              route: any,
              index: number
            ) => {

              const geometry =
                route.geometry;

              if (!geometry) {
                return null;
              }

              let lines: any[][] = [];

              if (
                geometry.type ===
                "MultiLineString"
              ) {

                lines =
                  geometry.coordinates;

              }

              else if (
                geometry.type ===
                "LineString"
              ) {

                lines = [
                  geometry.coordinates,
                ];

              }

              return lines.map(
                (
                  line: any[],
                  lineIndex: number
                ) => {

                  const positions =
                    line.map(
                      (
                        coord: number[]
                      ) => [
                        coord[1],
                        coord[0],
                      ] as [
                        number,
                        number
                      ]
                    );

                  return (

                    <Polyline
                      key={`route-${index}-${lineIndex}`}
                      positions={positions}
                      pathOptions={{
                        color: "#C8102E",
                        weight: 5,
                        opacity: 0.9,
                      }}
                    />

                  );

                }
              );

            }
          )
        }

        {/* =================================================
            ESTACIONES TRANSMILENIO
        ================================================= */}

        {showTransmi &&
          transmilenio?.stations?.features?.map(
            (
              station: any,
              index: number
            ) => {

              const coordinates =
                station.geometry?.coordinates;

              if (!coordinates) {
                return null;
              }

              const longitude =
                coordinates[0];

              const latitude =
                coordinates[1];

              const name =
                station.properties?.nom_est ||
                station.properties?.NOM_EST ||
                station.properties?.nombre ||
                station.properties?.NOMBRE ||
                "Estación TransMilenio";

              return (

                <Marker
                  key={`station-${index}`}
                  position={[
                    latitude,
                    longitude,
                  ]}
                  icon={stationIcon}
                >

                  {/* =================================================
                      NOMBRE SOLO AL PASAR EL MOUSE
                  ================================================= */}

                  <Tooltip
                    direction="top"
                    offset={[
                      0,
                      -10,
                    ]}
                    opacity={1}
                    sticky={true}
                  >

                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: "12px",
                        color: "#8F1026",
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {name}
                    </span>

                  </Tooltip>

                  {/* =================================================
                      CLICK EN ESTACIÓN
                  ================================================= */}

                  <Popup>

                    <div
                      style={{
                        minWidth:
                          "210px",
                        fontFamily:
                          "Arial, sans-serif",
                      }}
                    >

                      <div
                        style={{
                          display:
                            "inline-block",
                          padding:
                            "4px 8px",
                          borderRadius:
                            "999px",
                          background:
                            "#FBE7EA",
                          color:
                            "#C8102E",
                          fontSize:
                            "10px",
                          fontWeight:
                            700,
                          marginBottom:
                            "8px",
                        }}
                      >
                        TRANSMILENIO
                      </div>

                      <h3
                        style={{
                          margin:
                            "0 0 6px",
                          fontSize:
                            "16px",
                          fontWeight:
                            700,
                          color: "#222",
                        }}
                      >
                        {name}
                      </h3>

                      <p
                        style={{
                          margin: 0,
                          fontSize:
                            "12px",
                          color:
                            "#666",
                        }}
                      >
                        Estación troncal
                        oficial
                      </p>

                    </div>

                  </Popup>

                </Marker>

              );

            }
          )
        }

      </MapContainer>

      {/* =====================================================
          CARGANDO
      ===================================================== */}

      {showTransmi &&
        loadingTransmilenio && (

          <div className="absolute right-4 top-4 z-[1000] rounded-xl border border-white/10 bg-[#111111]/95 px-4 py-3 text-xs text-white shadow-xl">

            <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-red-500"></span>

            Cargando TransMilenio...

          </div>

        )}

      {/* =====================================================
          ERROR
      ===================================================== */}

      {showTransmi &&
        errorTransmilenio && (

          <div className="absolute right-4 top-4 z-[1000] rounded-xl border border-red-500/20 bg-[#111111]/95 px-4 py-3 text-xs text-red-300 shadow-xl">

            No fue posible cargar
            TransMilenio.

          </div>

        )}

      {/* =====================================================
          LEYENDA
      ===================================================== */}

      {(!loadingTransmilenio || !showTransmi) && (


          <div className="absolute bottom-5 right-5 z-[1000] rounded-xl border border-black/10 bg-white/95 px-4 py-3 text-black shadow-xl">

            <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-black/40">
              Localidades por color
            </div>

            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[8px]">
              {Object.entries(LOCALIDAD_COLORS).map(([name, color]) => (
                <div key={name} className="flex items-center gap-1">
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: color,
                      display: "inline-block",
                      flexShrink: 0,
                    }}
                  />
                  <span>{name}</span>
                </div>
              ))}
            </div>

            <div className="my-3 border-t border-black/10" />

            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-black/40">
              Transporte
            </div>

            <div className="flex items-center gap-2 text-xs">

              <span
                style={{
                  display:
                    "inline-block",
                  width: "28px",
                  height: "5px",
                  borderRadius:
                    "999px",
                  background:
                    "#C8102E",
                }}
              />

              <span>
                TransMilenio
              </span>

            </div>

            <div className="mt-2 flex items-center gap-2 text-xs">

              <span
                style={{
                  display:
                    "inline-block",
                  width: "12px",
                  height: "12px",
                  borderRadius:
                    "50%",
                  background:
                    "#C8102E",
                  border:
                    "2px solid white",
                  boxShadow:
                    "0 0 0 1px #C8102E",
                }}
              />

              <span>
                Estación
              </span>

            </div>

            <div className="mt-2 flex items-center gap-2 text-xs">

              <span
                style={{
                  fontSize: "16px",
                }}
              >
                🥄
              </span>

              <span>
                Informe ciudadano
              </span>

            </div>

            {showComedores && (
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span style={{ fontSize: "16px" }}>🍽️</span>
                <span>Comedor comunitario</span>
              </div>
            )}

          </div>

        )}

    </div>
  );
}
