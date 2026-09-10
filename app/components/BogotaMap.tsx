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
   Datos provenientes de COMEDORES_CON_COORDENADAS.xlsx
========================================================= */

const comedores = [
  {
    "id": 1,
    "localidad": "Antonio Nariño",
    "address": "CRA 10 BIS nO. 3-58 SUR",
    "name": "POLICARPA",
    "lat": 4.586020299999999,
    "lng": -74.08794309999999
  },
  {
    "id": 2,
    "localidad": "Barrios Unidos",
    "address": "CALLE 70 D No 59A 14",
    "name": "DOCE DE OCTUBRE",
    "lat": 4.672171,
    "lng": -74.080395
  },
  {
    "id": 3,
    "localidad": "Bosa",
    "address": "CALLE 88 H # 74A - 21",
    "name": "POTRERITOS",
    "lat": 4.622997,
    "lng": -74.20284199999999
  },
  {
    "id": 4,
    "localidad": "Bosa",
    "address": "CALLE 63 SUR No 77G-27",
    "name": "BOSA",
    "lat": 4.597683,
    "lng": -74.179436
  },
  {
    "id": 5,
    "localidad": "Bosa",
    "address": "CRA 87 B # 66 C -08 SUR",
    "name": "SAN PEDRO",
    "lat": 4.621007000000001,
    "lng": -74.192685
  },
  {
    "id": 6,
    "localidad": "Bosa",
    "address": "CRA 89A # 49D 01 SUR",
    "name": "COMUNEROS",
    "lat": 4.629442,
    "lng": -74.1915997
  },
  {
    "id": 7,
    "localidad": "Bosa",
    "address": "CALLE 74 B # 80 P - 91",
    "name": "BOSQUES DE MARYLAND",
    "lat": 4.610804000000001,
    "lng": -74.2014295
  },
  {
    "id": 8,
    "localidad": "Bosa",
    "address": "CRA 87 BIS # 59C -20 SUR",
    "name": "BOSANOVA",
    "lat": 4.621709699999999,
    "lng": -74.1886765
  },
  {
    "id": 9,
    "localidad": "Bosa",
    "address": "CRA 79 BIS N 73 D -07 SUR",
    "name": "MANZANARES",
    "lat": 4.606940499999999,
    "lng": -74.20176099999999
  },
  {
    "id": 10,
    "localidad": "Bosa",
    "address": "CALLE 74 B SUR # 87 i - 97",
    "name": "SAN BERNARDINO",
    "lat": 4.620616399999999,
    "lng": -74.2020184
  },
  {
    "id": 11,
    "localidad": "Bosa",
    "address": "CALLE 71D 56D 15 SUR",
    "name": "NUEVO CHILE",
    "lat": 4.6042426,
    "lng": -74.1961912
  },
  {
    "id": 12,
    "localidad": "Bosa",
    "address": "CLLE 58 # 91A -14 SUR",
    "name": "CENTAUROS",
    "lat": 4.63121,
    "lng": -74.191592
  },
  {
    "id": 13,
    "localidad": "Bosa",
    "address": "CALLE 51 # 87D - 50 SUR",
    "name": "BRASILIA",
    "lat": 4.6289845,
    "lng": -74.1802111
  },
  {
    "id": 14,
    "localidad": "Bosa",
    "address": "CRA 100 # 52- 74 SUR",
    "name": "PORVENIR",
    "lat": 4.6428001,
    "lng": -74.1881715
  },
  {
    "id": 15,
    "localidad": "Bosa",
    "address": "CALL 85ASUR#77G15H4 INT 1",
    "name": "SAN EUGENIO",
    "lat": 4.610759499999999,
    "lng": -74.2122201
  },
  {
    "id": 16,
    "localidad": "Chapinero",
    "address": "Diagonal 4B #2a-40 Este",
    "name": "PARDO RUBIO",
    "lat": 4.5847112,
    "lng": -74.0665048
  },
  {
    "id": 17,
    "localidad": "Chapinero",
    "address": "Calle 98 #5-78 Este",
    "name": "MORACI",
    "lat": 4.6696941,
    "lng": -74.02253139999999
  },
  {
    "id": 18,
    "localidad": "Chapinero",
    "address": "av caracas 56-32",
    "name": "LOURDES",
    "lat": 4.643659299999999,
    "lng": -74.0655171
  },
  {
    "id": 19,
    "localidad": "Chapinero",
    "address": "Transv 2a este #97-61 San Isidro",
    "name": "SAN ISIDRO",
    "lat": 4.6422666,
    "lng": -74.06450439999999
  },
  {
    "id": 20,
    "localidad": "Ciudad Bolívar",
    "address": "CALLE 81SUR # 42-09",
    "name": "POTOSI",
    "lat": 4.5681609,
    "lng": -74.1711557
  },
  {
    "id": 21,
    "localidad": "Ciudad Bolívar",
    "address": "CARRERA 17 No. 39A-29SUR",
    "name": "PARAISO",
    "lat": 4.5350217,
    "lng": -74.1406925
  },
  {
    "id": 22,
    "localidad": "Ciudad Bolívar",
    "address": "CRA 40 No. 63I-25 SUR",
    "name": "ARBORIZADORA",
    "lat": 4.615289,
    "lng": -74.1064263
  },
  {
    "id": 23,
    "localidad": "Ciudad Bolívar",
    "address": "AV VILLAVICENCIO No. 60B-05 SUR",
    "name": "PERDOMO",
    "lat": 4.5667572,
    "lng": -74.14265259999999
  },
  {
    "id": 24,
    "localidad": "Ciudad Bolívar",
    "address": "CRA 75K No. 62D-18 SUR",
    "name": "HUERTAS",
    "lat": 4.5899006,
    "lng": -74.17807239999999
  },
  {
    "id": 25,
    "localidad": "Ciudad Bolívar",
    "address": "CALLE 75D SUR No. 75C-03 SUR",
    "name": "SANTA VIVIANA",
    "lat": 4.576425,
    "lng": -74.175136
  },
  {
    "id": 26,
    "localidad": "Ciudad Bolívar",
    "address": "CARRERA 27 BIS N.73C-45SUR",
    "name": "BELLA FLOR - SECTOR D",
    "lat": 4.5455888,
    "lng": -74.1616787
  },
  {
    "id": 27,
    "localidad": "Ciudad Bolívar",
    "address": "CARRERA 47D # 68G-08SUR",
    "name": "JERUSALEN CANTERAS",
    "lat": 4.5717684,
    "lng": -74.1550819
  },
  {
    "id": 28,
    "localidad": "Ciudad Bolívar",
    "address": "CRA 24B No. 76-41 SUR",
    "name": "LOS ALPES",
    "lat": 4.540797299999999,
    "lng": -74.1549222
  },
  {
    "id": 29,
    "localidad": "Ciudad Bolívar",
    "address": "CLL 74 No. 18 BIS-18",
    "name": "ESTRELLA DEL SUR",
    "lat": 4.5437517,
    "lng": -74.15283269999999
  },
  {
    "id": 30,
    "localidad": "Ciudad Bolívar",
    "address": "DIAGONAL 64 B SUR",
    "name": "SAN FERNANDO",
    "lat": 4.5597989,
    "lng": -74.1456302
  },
  {
    "id": 31,
    "localidad": "Ciudad Bolívar",
    "address": "CALLE 78D SUR No. 15-24",
    "name": "DIVINO NIÑO",
    "lat": 4.5367594,
    "lng": -74.13681050000001
  },
  {
    "id": 32,
    "localidad": "Ciudad Bolívar",
    "address": "CARRERA 18 N. 74ASUR-87",
    "name": "LA ESTRELLA",
    "lat": 4.5430077,
    "lng": -74.1422388
  },
  {
    "id": 33,
    "localidad": "Ciudad Bolívar",
    "address": "CRA 18D No. 81 SUR - 28",
    "name": "LIMONAR",
    "lat": 4.5423231,
    "lng": -74.1453875
  },
  {
    "id": 34,
    "localidad": "Ciudad Bolívar",
    "address": "CALLE 73SUR No. 20-06",
    "name": "VILLAS DEL PROGRESO",
    "lat": 4.5440277,
    "lng": -74.1526286
  },
  {
    "id": 35,
    "localidad": "Ciudad Bolívar",
    "address": "TV 22 No. 69K-19 SUR",
    "name": "ALTOS DE LA CRUZ",
    "lat": 4.5652417,
    "lng": -74.1558845
  },
  {
    "id": 36,
    "localidad": "Ciudad Bolívar",
    "address": "CARRERA 27 # 75A -50 SUR",
    "name": "BELLA FLOR -SECTOR LA TORRE (LA CABAÑA)",
    "lat": 4.542026,
    "lng": -74.1626185
  },
  {
    "id": 37,
    "localidad": "Ciudad Bolívar",
    "address": "CALLE 76A SUR #74B - 05",
    "name": "CARACOLI",
    "lat": 4.573633,
    "lng": -74.173399
  },
  {
    "id": 38,
    "localidad": "Ciudad Bolívar",
    "address": "DIAGONAL 68B SUR 18P-40",
    "name": "JUAN PABLO II",
    "lat": 4.5543989,
    "lng": -74.1483621
  },
  {
    "id": 39,
    "localidad": "Ciudad Bolívar",
    "address": "CARRERA 18R # 77ASUR-27",
    "name": "NACIONES UNIDAS",
    "lat": 4.557634999999999,
    "lng": -74.144105
  },
  {
    "id": 40,
    "localidad": "Engativa",
    "address": "CARRERA 89 No 68A-08",
    "name": "LA FLORIDA",
    "lat": 4.6927509,
    "lng": -74.1107313
  },
  {
    "id": 41,
    "localidad": "Engativa",
    "address": "CALLE 79 No 69G-55",
    "name": "LAS FERIAS",
    "lat": 4.6868788,
    "lng": -74.08339219999999
  },
  {
    "id": 42,
    "localidad": "Engativá",
    "address": "CALLE 76 A No 104-18",
    "name": "GARCES NAVAS",
    "lat": 4.709991,
    "lng": -74.117012
  },
  {
    "id": 43,
    "localidad": "Engativá",
    "address": "CARRERA 94 G No 93-10",
    "name": "LUIS CARLOS GALAN",
    "lat": 4.7157101,
    "lng": -74.09734030000001
  },
  {
    "id": 44,
    "localidad": "Engativá",
    "address": "CARRERA 74 A No 68A- 15",
    "name": "BOYACA REAL",
    "lat": 4.684957799999999,
    "lng": -74.1004356
  },
  {
    "id": 45,
    "localidad": "Engativá",
    "address": "CALLE 63 F No 113A- 16",
    "name": "LAURELES",
    "lat": 4.7070645,
    "lng": -74.1392908
  },
  {
    "id": 46,
    "localidad": "Engativá",
    "address": "DIAGONAL 47 No 75-08",
    "name": "SAN IGNACIO",
    "lat": 4.6723644,
    "lng": -74.11311119999999
  },
  {
    "id": 47,
    "localidad": "Engativá",
    "address": "CARRERA 69 C No 69-75",
    "name": "LA ESTRADA",
    "lat": 4.679517,
    "lng": -74.091208
  },
  {
    "id": 48,
    "localidad": "Fontibón",
    "address": "CALLE 23 No. 109 A 15",
    "name": "LA GIRALDA",
    "lat": 4.6513086,
    "lng": -74.1109821
  },
  {
    "id": 49,
    "localidad": "Fontibón",
    "address": "CRA 137 No. 17 A 59",
    "name": "PRADOS DE ALAMEDA",
    "lat": 4.6939017,
    "lng": -74.17036949999999
  },
  {
    "id": 50,
    "localidad": "Fontibón",
    "address": "CALLE 22 K No. 123-03",
    "name": "SELVA DORADA",
    "lat": 4.6935376,
    "lng": -74.15190419999999
  },
  {
    "id": 51,
    "localidad": "Fontibón",
    "address": "CRA 111 No. 17 A 14",
    "name": "FLANDES",
    "lat": 4.6821227,
    "lng": -74.1492605
  },
  {
    "id": 52,
    "localidad": "Fontibón",
    "address": "CALLE 14B #119A - 71 ZONA FRANCA",
    "name": "ZONA FRANCA LA ESTANCIA",
    "lat": 4.680903199999999,
    "lng": -74.16650480000001
  },
  {
    "id": 53,
    "localidad": "Kennedy",
    "address": "CRA 82C # 5A 20 SUR",
    "name": "MI SEGUNDO HOGAR",
    "lat": 4.638408399999999,
    "lng": -74.1568315
  },
  {
    "id": 54,
    "localidad": "Kennedy",
    "address": "CRA 68I 39-61 SUR",
    "name": "NUEVA YORK",
    "lat": 4.604404,
    "lng": -74.1403048
  },
  {
    "id": 55,
    "localidad": "Kennedy",
    "address": "CRA 78A # 43 37",
    "name": "TIMIZA",
    "lat": 4.6419063,
    "lng": -74.1402739
  },
  {
    "id": 56,
    "localidad": "Kennedy",
    "address": "CLLE 41 S # 80I 07",
    "name": "AMPARO CAÑIZALEZ",
    "lat": 4.627080299999999,
    "lng": -74.1626242
  },
  {
    "id": 57,
    "localidad": "Kennedy",
    "address": "CRA 68 No. 33F 20 SUR",
    "name": "ALQUERIA LA FRAGUA",
    "lat": 4.627949099999999,
    "lng": -74.12282379999999
  },
  {
    "id": 58,
    "localidad": "Kennedy",
    "address": "CRA 74 No. 42 G 52 SUR",
    "name": "LAGOS DE TIMIZA",
    "lat": 4.636682,
    "lng": -74.14049829999999
  },
  {
    "id": 59,
    "localidad": "Kennedy",
    "address": "CALLE 16 B No. 81 g 45 sur",
    "name": "VILLA LILIANA",
    "lat": 4.6565303,
    "lng": -74.13648979999999
  },
  {
    "id": 60,
    "localidad": "Kennedy",
    "address": "CRA 81 F No. 42-37 SUR",
    "name": "EL AMPARO",
    "lat": 4.6267159,
    "lng": -74.16584449999999
  },
  {
    "id": 61,
    "localidad": "Kennedy",
    "address": "CALLE 38 C # 94C 29 SUR",
    "name": "BELLA VISTA",
    "lat": 4.6455912,
    "lng": -74.1716538
  },
  {
    "id": 62,
    "localidad": "Kennedy",
    "address": "CRA81G #42D 05 SUR",
    "name": "VILLAS DE LA LOMA",
    "lat": 4.6257152,
    "lng": -74.1681357
  },
  {
    "id": 63,
    "localidad": "Kennedy",
    "address": "DIAGONAL 54 A No. 81 G 92 SUR",
    "name": "VILLAS DE KENNEDY",
    "lat": 4.6196738,
    "lng": -74.1781227
  },
  {
    "id": 64,
    "localidad": "Kennedy",
    "address": "CRA 82 # 39D 21 SUR",
    "name": "SAUCEDAL",
    "lat": 4.632069,
    "lng": -74.16315999999999
  },
  {
    "id": 65,
    "localidad": "Kennedy",
    "address": "CRA 78D 47B 66 SUR",
    "name": "PERPETUO SOCORRO",
    "lat": 4.612342,
    "lng": -74.16544999999999
  },
  {
    "id": 66,
    "localidad": "La Candelaria",
    "address": "Calle 6 c 7A 03",
    "name": "SANTA BARBARA",
    "lat": 4.5934461,
    "lng": -74.0785767
  },
  {
    "id": 67,
    "localidad": "La Candelaria",
    "address": "calle 12 b 1-32",
    "name": "LA CONCORDIA",
    "lat": 4.596806,
    "lng": -74.06949879999999
  },
  {
    "id": 68,
    "localidad": "Los Mártires",
    "address": "Cl. 4 #1414, Bogotá",
    "name": "RIOJA",
    "lat": 4595863.0,
    "lng": -74086134.0
  },
  {
    "id": 69,
    "localidad": "Los Mártires",
    "address": "KRA 15A No. 14A-09",
    "name": "SAN VICTORINO - LA FAVORITA",
    "lat": 4.606070799999999,
    "lng": -74.08030049999999
  },
  {
    "id": 70,
    "localidad": "Los Mártires",
    "address": "KRA 15 No. 23-27",
    "name": "SANTA FE",
    "lat": 4.6123725,
    "lng": -74.0751506
  },
  {
    "id": 71,
    "localidad": "Los Mártires",
    "address": "CLL 15 No. 15-29",
    "name": "VOTO NACIONAL",
    "lat": 4.605876299999999,
    "lng": -74.0797662
  },
  {
    "id": 72,
    "localidad": "Puente Aranda",
    "address": "KRA 56 No. 15-34",
    "name": "PUENTE ARANDA",
    "lat": 4.6318861,
    "lng": -74.10869749999999
  },
  {
    "id": 73,
    "localidad": "Puente Aranda",
    "address": "CRA 51A No. 31-70 SUR",
    "name": "MUZU (TEJAR)",
    "lat": 4.6018491,
    "lng": -74.1253724
  },
  {
    "id": 74,
    "localidad": "Puente Aranda",
    "address": "KRA 58 No. 4B-31",
    "name": "COLON",
    "lat": 4.6229827,
    "lng": -74.1187886
  },
  {
    "id": 75,
    "localidad": "Rafael Uribe",
    "address": "Cra. 14 #40 Sur9, Bogotá",
    "name": "GRANJAS DE SAN PABLO",
    "lat": 4.5792993,
    "lng": -74.1054539
  },
  {
    "id": 76,
    "localidad": "Rafael Uribe",
    "address": "CARRERA 5 A # 48 N 06 SUR",
    "name": "BOCHICA SUR",
    "lat": 4.509316999999999,
    "lng": -74.10352
  },
  {
    "id": 77,
    "localidad": "Rafael Uribe",
    "address": "DIAGONAL 32 C SUR # 12 D 34",
    "name": "RESURRECCION",
    "lat": 4.5700717,
    "lng": -74.1109966
  },
  {
    "id": 78,
    "localidad": "Rafael Uribe",
    "address": "CALLE 48R BIS #1G - 27 SUR",
    "name": "DIANA TURBAY SECTOR LANCEROS",
    "lat": 4.547423,
    "lng": -74.105959
  },
  {
    "id": 79,
    "localidad": "Rafael Uribe",
    "address": "CALLE 48P BIS #1D - 36 SUR",
    "name": "LOS PUENTES",
    "lat": 4.5480033,
    "lng": -74.1041882
  },
  {
    "id": 80,
    "localidad": "Rafael Uribe",
    "address": "CARRERA 1 #48Q - 30 SUR",
    "name": "DIANA TURBAY SECTOR VALLE",
    "lat": 4.545546799999999,
    "lng": -74.1065179
  },
  {
    "id": 81,
    "localidad": "Rafael Uribe",
    "address": "CARRERA 1 ESTE # 50-08 SUR",
    "name": "PALERMO SUR",
    "lat": 4.542515,
    "lng": -74.1095107
  },
  {
    "id": 82,
    "localidad": "Rafael Uribe",
    "address": "CALLE 41 SUR # 26-87",
    "name": "INGLES",
    "lat": 4.5831519,
    "lng": -74.1236017
  },
  {
    "id": 83,
    "localidad": "Rafael Uribe",
    "address": "TV 5 J # 48 J 01",
    "name": "CHIRCALES",
    "lat": 4.5556256,
    "lng": -74.1127932
  },
  {
    "id": 84,
    "localidad": "Rafael Uribe",
    "address": "CARRERA 7 # 49 F 14 SUR",
    "name": "GOVAROVA",
    "lat": 4.5574173,
    "lng": -74.1195465
  },
  {
    "id": 85,
    "localidad": "Rafael Uribe",
    "address": "CALLE 35 SUR # 25 A 24",
    "name": "TAZA Y PAN (LIBERTADOR)",
    "lat": 4.583756,
    "lng": -74.118161
  },
  {
    "id": 86,
    "localidad": "Rafael Uribe",
    "address": "CALLE 48Z SUR #5D-79",
    "name": "DIANA TURBAY SECTOR PLAN ESPECIAL",
    "lat": 4.549952999999999,
    "lng": -74.112329
  },
  {
    "id": 87,
    "localidad": "Rafael Uribe",
    "address": "CALLE 48Z #2C - 16",
    "name": "DIANA TURBAY SECTOR COMUNEROS",
    "lat": 4.546109899999999,
    "lng": -74.1081275
  },
  {
    "id": 88,
    "localidad": "Rafael Uribe",
    "address": "CALLE 59C SUR # 4C - 34 ESTE",
    "name": "SAN MARTIN LA FISCALA ALTA",
    "lat": 4.575657,
    "lng": -74.1532022
  },
  {
    "id": 89,
    "localidad": "Rafael Uribe",
    "address": "CALLE 48C SUR #10D - 58",
    "name": "VILLAS DEL SOL",
    "lat": 4.564562899999999,
    "lng": -74.11496
  },
  {
    "id": 90,
    "localidad": "Rafael Uribe",
    "address": "DIAGONAL 49B BIS 11D - 14",
    "name": "LA MERCED",
    "lat": 4.5617933,
    "lng": -74.1208546
  },
  {
    "id": 91,
    "localidad": "Rafael Uribe",
    "address": "DIAGONAL 32 H SUR #12J-40",
    "name": "COLINAS",
    "lat": 4.5718165,
    "lng": -74.1133866
  },
  {
    "id": 92,
    "localidad": "Rafael Uribe",
    "address": "CALLE 49 I BIS SUR # 10 C 40",
    "name": "PROVIDENCIA ALTA",
    "lat": 4.562107300000001,
    "lng": -74.1214755
  },
  {
    "id": 93,
    "localidad": "San Cristobal",
    "address": "TRANS. 14 ESTE No 64 a 84 SUR",
    "name": "JUAN REY",
    "lat": 4.5318896,
    "lng": -74.0882921
  },
  {
    "id": 94,
    "localidad": "San Cristóbal",
    "address": "CRA 3 ESTE No. 18-51 SUR",
    "name": "SAN BLAS",
    "lat": 4.5715799,
    "lng": -74.0856601
  },
  {
    "id": 95,
    "localidad": "San Cristóbal",
    "address": "CRA 16 B 5 surNo 42 c",
    "name": "PUENTE COLORADO",
    "lat": 4.610247,
    "lng": -74.07734599999999
  },
  {
    "id": 96,
    "localidad": "San Cristóbal",
    "address": "TRANS. 6No 49 - 02 SUR ESTE",
    "name": "ANTIOQUIA",
    "lat": 4.508808999999999,
    "lng": -74.10439
  },
  {
    "id": 97,
    "localidad": "San Cristóbal",
    "address": "CRA 1 No 32 - 74 SUR",
    "name": "LA JOYITA",
    "lat": 4.5466393,
    "lng": -74.0981919
  },
  {
    "id": 98,
    "localidad": "San Cristóbal",
    "address": "CRA 2 No 36 F - 26 SUR",
    "name": "ATENAS",
    "lat": 4.5574344,
    "lng": -74.0938352
  },
  {
    "id": 99,
    "localidad": "San Cristóbal",
    "address": "KRA 5 29-22 DUR",
    "name": "VEINTE DE JULIO",
    "lat": 4.572509,
    "lng": -74.089941
  },
  {
    "id": 100,
    "localidad": "San Cristóbal",
    "address": "CL 40 SUR No 11-00",
    "name": "ALTOS DEL POBLADO",
    "lat": 4.5506787,
    "lng": -74.0918241
  },
  {
    "id": 101,
    "localidad": "San Cristóbal",
    "address": "CRA 5 ESTE No 29 A - 70 SUR",
    "name": "SANTA INES",
    "lat": 4.5578649,
    "lng": -74.0900226
  },
  {
    "id": 102,
    "localidad": "San Cristóbal",
    "address": "CLL 46 A No 3 D - 40 ESTE",
    "name": "LA GLORIA",
    "lat": 4.5437846,
    "lng": -74.0890029
  },
  {
    "id": 103,
    "localidad": "San Cristóbal",
    "address": "CRA12C ESTE No 28h -13 SUR",
    "name": "AMAPOLAS",
    "lat": 4.5613279,
    "lng": -74.080512
  },
  {
    "id": 104,
    "localidad": "San Cristóbal",
    "address": "CR 3 ESTE # 50A-43 SUR",
    "name": "EL TRIUNFO",
    "lat": 4.5402821,
    "lng": -74.0983858
  },
  {
    "id": 105,
    "localidad": "San Cristóbal",
    "address": "DG 41 SUR # 24-17",
    "name": "SAN MARTIN DE LOBA",
    "lat": 4.553236099999999,
    "lng": -74.099749
  },
  {
    "id": 106,
    "localidad": "San Cristóbal",
    "address": "CL 5 ESTE No 8-70 SUR",
    "name": "BUENOS AIRES",
    "lat": 4.574989,
    "lng": -74.0784214
  },
  {
    "id": 107,
    "localidad": "Santa Fe",
    "address": "CARRERA 12 No. 20 77",
    "name": "VERACRUZ",
    "lat": 4.6088988,
    "lng": -74.0734682
  },
  {
    "id": 108,
    "localidad": "Santa Fe",
    "address": "AV CALLE 1 12 24",
    "name": "SAN BERNARDO",
    "lat": 4.5929576,
    "lng": -74.09183039999999
  },
  {
    "id": 109,
    "localidad": "Santa Fe",
    "address": "Calle 23 No. 12 75",
    "name": "ALAMEDA",
    "lat": 4.577631999999999,
    "lng": -74.100064
  },
  {
    "id": 110,
    "localidad": "Santa Fe",
    "address": "CARRERA 8 1F 13",
    "name": "CRUCES II",
    "lat": 4.589324899999999,
    "lng": -74.08179559999999
  },
  {
    "id": 111,
    "localidad": "Santa Fe",
    "address": "CALLE 23B 2 06 ESTE",
    "name": "LA PAZ",
    "lat": 4.607108,
    "lng": -74.06520499999999
  },
  {
    "id": 112,
    "localidad": "Santa Fe",
    "address": "calle 31 No. 4 55",
    "name": "PERSEVERANCIA",
    "lat": 4.6164148,
    "lng": -74.06538859999999
  },
  {
    "id": 113,
    "localidad": "Santa Fe",
    "address": "CARRERA 1 2B 21",
    "name": "RAMIREZ",
    "lat": 4.5529134,
    "lng": -74.09794629999999
  },
  {
    "id": 114,
    "localidad": "Santa Fe",
    "address": "Calle 22 No 0 24 Este",
    "name": "AGUAS I Y AGUAS II",
    "lat": 4.608565599999999,
    "lng": -74.0714505
  },
  {
    "id": 115,
    "localidad": "Suba",
    "address": "CALLE 128 N. 86C - 38",
    "name": "LA AGUADITA",
    "lat": 4.719256,
    "lng": -74.0866415
  },
  {
    "id": 116,
    "localidad": "Suba",
    "address": "CALLE 136 N. 154 - 10",
    "name": "LISBOA",
    "lat": 4.7435081,
    "lng": -74.1249998
  },
  {
    "id": 117,
    "localidad": "Suba",
    "address": "CALLE 128A BIS N. 121B 20",
    "name": "CAÑIZA",
    "lat": 4.7320384,
    "lng": -74.1070067
  },
  {
    "id": 118,
    "localidad": "Suba",
    "address": "CALLE 142 BIS N. 140 - 17",
    "name": "SAN CARLOS DE TIBABUYES",
    "lat": 4.747928,
    "lng": -74.11492199999999
  },
  {
    "id": 119,
    "localidad": "Suba",
    "address": "CALLE 129 F N 87 - 18",
    "name": "TABERIN",
    "lat": 4.7248118,
    "lng": -74.085193
  },
  {
    "id": 120,
    "localidad": "Suba",
    "address": "CARRERA 108A N. 140 - 45",
    "name": "LAS FLORES",
    "lat": 4.7438215,
    "lng": -74.0999525
  },
  {
    "id": 121,
    "localidad": "Suba",
    "address": "CALLE 131A N. 100 - 24",
    "name": "NUEVO CORINTO",
    "lat": 4.7331192,
    "lng": -74.0954112
  },
  {
    "id": 122,
    "localidad": "Suba",
    "address": "CARRERA 96 N. 128C 50",
    "name": "RINCON RUBI",
    "lat": 4.726229,
    "lng": -74.096001
  },
  {
    "id": 123,
    "localidad": "Suba",
    "address": "CARRERA 141A BIS # 143B - 51",
    "name": "FONTANAR DEL RIO",
    "lat": 4.751878899999999,
    "lng": -74.1134632
  },
  {
    "id": 124,
    "localidad": "Suba",
    "address": "CALLE 163 N. 96 A - 16",
    "name": "CAMINOS DE LA ESPERANZA",
    "lat": 4.7576279,
    "lng": -74.0805616
  },
  {
    "id": 125,
    "localidad": "Tunjuelito",
    "address": "CR 9 # 52-48 SUR",
    "name": "ABRAHAM LINCOLN",
    "lat": 4.5570845,
    "lng": -74.1232729
  },
  {
    "id": 126,
    "localidad": "Tunjuelito",
    "address": "CL 47 SUR # 18A-72",
    "name": "SANTA LUCIA SUR",
    "lat": 4.5710535,
    "lng": -74.1258343
  },
  {
    "id": 127,
    "localidad": "Tunjuelito",
    "address": "CL 47B # 28-62 SUR",
    "name": "EL CARMEN II",
    "lat": 4.583624299999999,
    "lng": -74.1306496
  },
  {
    "id": 128,
    "localidad": "Tunjuelito",
    "address": "CL 55A SUR # 33A-33",
    "name": "SAN VICENTE FERRER",
    "lat": 4.5826252,
    "lng": -74.1421139
  },
  {
    "id": 129,
    "localidad": "Tunjuelito",
    "address": "CL 66 SUR # 65A-08",
    "name": "ISLA DEL SOL",
    "lat": 4.588753,
    "lng": -74.15514499999999
  },
  {
    "id": 130,
    "localidad": "Usaquén",
    "address": "Transv 18 #187-43",
    "name": "VERBENAL",
    "lat": 4.765747300000001,
    "lng": -74.039248
  },
  {
    "id": 131,
    "localidad": "Usaquén",
    "address": "Calle 189 b 3a-25",
    "name": "ESTRELLITA",
    "lat": 4.7665179,
    "lng": -74.02396499999999
  },
  {
    "id": 132,
    "localidad": "Usaquén",
    "address": "calle 163 #3a-15",
    "name": "SANTA CECILIA",
    "lat": 4.742945,
    "lng": -74.0442065
  },
  {
    "id": 133,
    "localidad": "Usaquén",
    "address": "Calle 192 No. 5c-24",
    "name": "BUENAVISTA",
    "lat": 4.7685677,
    "lng": -74.0263392
  },
  {
    "id": 134,
    "localidad": "Usaquén",
    "address": "calle167 2a 07",
    "name": "SORATAMA",
    "lat": 4.7435328,
    "lng": -74.01796259999999
  },
  {
    "id": 135,
    "localidad": "Usme",
    "address": "K 5B # 102A - 18 SUR",
    "name": "LORENZO ALCANTUZ",
    "lat": 4.495438,
    "lng": -74.114952
  },
  {
    "id": 136,
    "localidad": "Usme",
    "address": "CRA 3 C ESTE No 91-29 SUR",
    "name": "USME",
    "lat": 4.501893,
    "lng": -74.1101056
  },
  {
    "id": 137,
    "localidad": "Usme",
    "address": "CLL73 D No 14L - 25",
    "name": "SAN LUIS (TENERIFE)",
    "lat": 4.5161685,
    "lng": -74.1212777
  },
  {
    "id": 138,
    "localidad": "Usme",
    "address": "DG 65 SUR # 2 B - 31 ESTE",
    "name": "LA FISCALA",
    "lat": 4.5350925,
    "lng": -74.1151326
  },
  {
    "id": 139,
    "localidad": "Usme",
    "address": "CRA 14 ESTE No. 76D23 SUR",
    "name": "SEMILLAS DE ANTAÑO",
    "lat": 4.512236000000001,
    "lng": -74.090935
  },
  {
    "id": 140,
    "localidad": "Usme",
    "address": "K 14 ESTE # 76 - 79 SUR",
    "name": "NUTRIENDO HOY COMO FUTURO",
    "lat": 4.512578,
    "lng": -74.111497
  },
  {
    "id": 141,
    "localidad": "Usme",
    "address": "CLL 69D SUR # 3 -15",
    "name": "BARRANQUILLITA",
    "lat": 4.5237057,
    "lng": -74.1204832
  },
  {
    "id": 142,
    "localidad": "Usme",
    "address": "CLL90 SUR # 14 A ESTE - 21",
    "name": "JUAN JOSE RONDON",
    "lat": 4.498629999999999,
    "lng": -74.10163399999999
  },
  {
    "id": 143,
    "localidad": "Usme",
    "address": "TRV 7 ESTE # 82 - 21",
    "name": "EL BOSQUE",
    "lat": 4.5054322,
    "lng": -74.10079759999999
  },
  {
    "id": 144,
    "localidad": "Usme",
    "address": "TRV 3G ESTE # 87 A - 12 SUR",
    "name": "EL LIBANO",
    "lat": 4.5315669,
    "lng": -74.1194398
  },
  {
    "id": 145,
    "localidad": "Usme",
    "address": "K 87A SUR # 22 - 58 ESTE",
    "name": "VILLA ROSITA",
    "lat": 4.501962900000001,
    "lng": -74.0819992
  },
  {
    "id": 146,
    "localidad": "Usme",
    "address": "AV CLL 91 SUR # 3 C - 34 ESTE.",
    "name": "VIRREY CHUNIZA",
    "lat": 4.5008921,
    "lng": -74.108931
  },
  {
    "id": 147,
    "localidad": "Usme",
    "address": "CLL 111 A SUR # 2 - 07 ESTE",
    "name": "VILLA ALEMANIA",
    "lat": 4.4901514,
    "lng": -74.1117175
  },
  {
    "id": 148,
    "localidad": "KENNEDY",
    "address": "KR 88 D 0 96",
    "name": "MI SEGUNDO HOGAR",
    "lat": 4.6428269,
    "lng": -74.161616
  },
  {
    "id": 149,
    "localidad": "PUENTE ARANDA",
    "address": "CL 19C 34 48",
    "name": "CUNDINAMARCA",
    "lat": 4.6234375,
    "lng": -74.0904363
  },
  {
    "id": 150,
    "localidad": "CIUDAD BOLIVAR",
    "address": "KR 17 F 69 A 32 SUR",
    "name": "LOS LUCEROS",
    "lat": 4.5485674,
    "lng": -74.13998409999999
  },
  {
    "id": 151,
    "localidad": "BOSA",
    "address": "KR 88I 69A 07 SUR",
    "name": "SAN ANTONIO",
    "lat": 4.6259998,
    "lng": -74.19639959999999
  },
  {
    "id": 152,
    "localidad": "BOSA",
    "address": "CL 58 SUR 106 21",
    "name": "CANAVERALEJO",
    "lat": 4.642377199999999,
    "lng": -74.1982402
  },
  {
    "id": 153,
    "localidad": "CIUDAD BOLIVAR",
    "address": "KR 76A 63A 42 SUR",
    "name": "MIRADOR DE LA ESTANCIA",
    "lat": 4.5683371,
    "lng": -74.1594928
  },
  {
    "id": 154,
    "localidad": "CIUDAD BOLIVAR",
    "address": "CL 71P SUR 27A 91 MJ 231",
    "name": "EL MIRADOR II",
    "lat": 4.548366,
    "lng": -74.160572
  },
  {
    "id": 155,
    "localidad": "RAFAEL URIBE URIBE",
    "address": "CL 48 P BIS D SUR  5 A 44",
    "name": "SAN AGUSTÍN",
    "lat": 4.5509606,
    "lng": -74.10845379999999
  },
  {
    "id": 156,
    "localidad": "RAFAEL URIBE URIBE",
    "address": "CL 48 Q SUR 5J 86",
    "name": "MARRUECOS",
    "lat": 4.5543897,
    "lng": -74.1125055
  },
  {
    "id": 157,
    "localidad": "SAN CRISTOBAL",
    "address": "CL41 BIS SUR 1B 81 ESTE",
    "name": "SAN MARTÍN SUR",
    "lat": 4.550758,
    "lng": -74.09700699999999
  },
  {
    "id": 158,
    "localidad": "SUBA",
    "address": "KR 111 135 25 MJ",
    "name": "VILLA MARÍA",
    "lat": 4.7405178,
    "lng": -74.10370329999999
  },
  {
    "id": 159,
    "localidad": "KENNEDY",
    "address": "KR 98A 42 G 25",
    "name": "EL JAZMIN",
    "lat": 4.6455157,
    "lng": -74.1792237
  },
  {
    "id": 160,
    "localidad": "USME",
    "address": "KR 2 A 90 31 SUR",
    "name": "CHARALÁ",
    "lat": 4.4909089,
    "lng": -74.1121013
  },
  {
    "id": 161,
    "localidad": "USME",
    "address": "CL 81C SUR 6C 4 ESTE",
    "name": "BOLONIA",
    "lat": 4.50059,
    "lng": -74.10874059999999
  },
  {
    "id": 162,
    "localidad": "LOS MARTIRES",
    "address": "CL 23 18 86",
    "name": "SANTA FE",
    "lat": 4.589585899999999,
    "lng": -74.1098988
  },
  {
    "id": 163,
    "localidad": "BOSA",
    "address": "KR 93D 69 SUR 40",
    "name": "CIUDADELA EL RECREO",
    "lat": 4.630178,
    "lng": -74.198667
  },
  {
    "id": 164,
    "localidad": "CIUDAD BOLÍVAR",
    "address": "CL 81A BIS SUR 17D 45",
    "name": "QUIBA",
    "lat": 4.5349809,
    "lng": -74.142668
  },
  {
    "id": 165,
    "localidad": "RAFAEL URIBE URIBE",
    "address": "KR 13C 50B 06 SUR",
    "name": "MARCO FIDEL SUAREZ",
    "lat": 4.575643299999999,
    "lng": -74.1118031
  },
  {
    "id": 166,
    "localidad": "USME",
    "address": "KR 5A 67A 29 SUR",
    "name": "ALASKA",
    "lat": 4.503255,
    "lng": -74.1057919
  },
  {
    "id": 167,
    "localidad": "SANTA FE",
    "address": "CL 1F 5 7",
    "name": "LAS CRUCES",
    "lat": 4.587337,
    "lng": -74.0786478
  },
  {
    "id": 168,
    "localidad": "SAN CRISTOBAL",
    "address": "CL 6B BIS S 5 29 E",
    "name": "VITELMA",
    "lat": 4.523192799999999,
    "lng": -74.08926319999999
  },
  {
    "id": 169,
    "localidad": "SUBA",
    "address": "CL 6B BIS S 5 29 E",
    "name": "TIBABUYES *",
    "lat": 4.523192799999999,
    "lng": -74.08926319999999
  },
  {
    "id": 170,
    "localidad": "BOSA",
    "address": "CL 58 SUR 106 21",
    "name": "CAÑAVERALEJO",
    "lat": 4.642377199999999,
    "lng": -74.1982402
  },
  {
    "id": 171,
    "localidad": "BOSA",
    "address": "KR 93D 69 SUR 40",
    "name": "EL RECREO",
    "lat": 4.630178,
    "lng": -74.198667
  },
  {
    "id": 172,
    "localidad": "BOSA",
    "address": "KR 88I 69A 07 SUR",
    "name": "SAN ANTONIO",
    "lat": 4.6259998,
    "lng": -74.19639959999999
  },
  {
    "id": 173,
    "localidad": "CIUDAD BOLÍVAR",
    "address": "CL 71Q 27ª30 SUR",
    "name": "MIRADOR DEL PARAISO",
    "lat": 4.5479668,
    "lng": -74.1602802
  },
  {
    "id": 174,
    "localidad": "CIUDAD BOLÍVAR",
    "address": "KR 17 F 69 A 32 SUR",
    "name": "LOS LUCEROS",
    "lat": 4.5485674,
    "lng": -74.13998409999999
  },
  {
    "id": 175,
    "localidad": "CIUDAD BOLÍVAR",
    "address": "KR 76A 63A 42 SUR",
    "name": "MIRADOR DE LA ESTANCIA",
    "lat": 4.5683371,
    "lng": -74.1594928
  },
  {
    "id": 176,
    "localidad": "CIUDAD BOLÍVAR",
    "address": "CL 81A BIS SUR 17D 45",
    "name": "SAN JOAQUIN",
    "lat": 4.5349809,
    "lng": -74.142668
  },
  {
    "id": 177,
    "localidad": "KENNEDY",
    "address": "KR 88 D 0 96",
    "name": "MI SEGUNDO HOGAR",
    "lat": 4.6428269,
    "lng": -74.161616
  },
  {
    "id": 178,
    "localidad": "LOS MÁRTIRES",
    "address": "CL 23 18 86",
    "name": "SANTA FE",
    "lat": 4.589585899999999,
    "lng": -74.1098988
  },
  {
    "id": 179,
    "localidad": "PUENTE ARANDA",
    "address": "CL 19C 34 48",
    "name": "CUNDINAMARCA",
    "lat": 4.6234375,
    "lng": -74.0904363
  },
  {
    "id": 180,
    "localidad": "RAFAEL URIBE URIBE",
    "address": "KR 13C 50B 06 SUR",
    "name": "SOCORRO",
    "lat": 4.575643299999999,
    "lng": -74.1118031
  },
  {
    "id": 181,
    "localidad": "RAFAEL URIBE URIBE",
    "address": "CL 48 Q SUR 5J 86",
    "name": "MARRUECOS",
    "lat": 4.5543897,
    "lng": -74.1125055
  },
  {
    "id": 182,
    "localidad": "RAFAEL URIBE URIBE",
    "address": "CL 48 P BIS D SUR  5 A 44",
    "name": "SAN AGUSTIN",
    "lat": 4.5509606,
    "lng": -74.10845379999999
  },
  {
    "id": 183,
    "localidad": "SAN CRISTÓBAL",
    "address": "CL41 BIS SUR 1B 81 ESTE",
    "name": "SAN MARTIN SUR",
    "lat": 4.550758,
    "lng": -74.09700699999999
  },
  {
    "id": 184,
    "localidad": "SAN CRISTÓBAL",
    "address": "CL 6B BIS S 5 29 E",
    "name": "LA ROCA",
    "lat": 4.523192799999999,
    "lng": -74.08926319999999
  },
  {
    "id": 185,
    "localidad": "SANTA FE",
    "address": "CL 1F 5 7",
    "name": "LAS CRUCES",
    "lat": 4.587337,
    "lng": -74.0786478
  },
  {
    "id": 186,
    "localidad": "SUBA",
    "address": "KR 111 135 25 MJ",
    "name": "VILLA MARIA",
    "lat": 4.7405178,
    "lng": -74.10370329999999
  },
  {
    "id": 187,
    "localidad": "USME",
    "address": "KR 5A 67A 29 SUR",
    "name": "ALASKA",
    "lat": 4.503255,
    "lng": -74.1057919
  },
  {
    "id": 188,
    "localidad": "USME",
    "address": "CL 81C SUR 6C 4 ESTE",
    "name": "COMPOSTELA",
    "lat": 4.50059,
    "lng": -74.10874059999999
  },
  {
    "id": 189,
    "localidad": "USME",
    "address": "KR 2 A 90 31 SUR",
    "name": "CHARALA",
    "lat": 4.4909089,
    "lng": -74.1121013
  },
  {
    "id": 190,
    "localidad": "SUBA",
    "address": "CL 144 136A 65",
    "name": "TIBABUYES",
    "lat": 4.751946,
    "lng": -74.11250199999999
  },
  {
    "id": 191,
    "localidad": "CIUDAD BOLÍVAR",
    "address": "KR 73H BIS 69C 18 SUR",
    "name": "SIERRA MORENA",
    "lat": 4.5739339,
    "lng": -74.1722075
  },
  {
    "id": 192,
    "localidad": "CIUDAD BOLÍVAR",
    "address": "CL 60 D SUR 18 B 11",
    "name": "MEISSEN",
    "lat": 4.5605959,
    "lng": -74.137812
  },
  {
    "id": 193,
    "localidad": "RAFAEL URIBE URIBE",
    "address": "CL 26 SUR 25 21",
    "name": "CENTENARIO",
    "lat": 4.586757299999999,
    "lng": -74.1099557
  },
  {
    "id": 194,
    "localidad": "SAN CRISTÓBAL",
    "address": "KR 6 3 53 SUR",
    "name": "LAS BRISAS",
    "lat": 4.5768892,
    "lng": -74.0885953
  },
  {
    "id": 195,
    "localidad": "USME",
    "address": "CL 111 A SUR 2 07",
    "name": "VILLA ALEMANIA",
    "lat": 4.4901514,
    "lng": -74.1117175
  },
  {
    "id": 196,
    "localidad": "KENNEDY",
    "address": "KR 98 A 42 G 25 SUR",
    "name": "EL JAZMÍN",
    "lat": 4.6455157,
    "lng": -74.1792237
  }
];

/* =========================================================
   CENTRO DE LOCALIDAD PARA ETIQUETAS
========================================================= */

function getFeatureCenter(feature: any): [number, number] | null {
  const coords = feature?.geometry?.coordinates;

  if (!coords) return null;

  const points: number[][] = [];

  const collect = (value: any) => {
    if (
      Array.isArray(value) &&
      value.length >= 2 &&
      typeof value[0] === "number" &&
      typeof value[1] === "number"
    ) {
      points.push(value);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(collect);
    }
  };

  collect(coords);

  if (!points.length) return null;

  const lng =
    points.reduce((sum, point) => sum + point[0], 0) / points.length;

  const lat =
    points.reduce((sum, point) => sum + point[1], 0) / points.length;

  return [lat, lng];
}

/* =========================================================
   SERVICIO OFICIAL TRANSMILENIO
========================================================= */

const TRANSMILENIO_URL =
  "https://gis.transmilenio.gov.co/arcgis/rest/services/ConsultaSubgerenciaPlanificacionSITP/Consulta_Planificacion_SITP/FeatureServer";

/* =========================================================
   LOCALIDADES OFICIALES DE BOGOTÁ
   Fuente: Datos Abiertos Bogotá / Secretaría Distrital de Planeación
========================================================= */

const LOCALIDADES_URL =
  "https://serviciosgis.catastrobogota.gov.co/arcgis/rest/services/ordenamientoterritorial/localidad/MapServer/0/query" +
  "?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&f=geojson";

/* =========================================================
   CONSULTAR TRANSMILENIO
========================================================= */

async function getTransmilenioData() {
  const routesUrl =
    `${TRANSMILENIO_URL}/5/query` +
    `?where=1%3D1` +
    `&outFields=*` +
    `&returnGeometry=true` +
    `&outSR=4326` +
    `&f=geojson`;

  const stationsUrl =
    `${TRANSMILENIO_URL}/2/query` +
    `?where=1%3D1` +
    `&outFields=*` +
    `&returnGeometry=true` +
    `&outSR=4326` +
    `&f=geojson`;

  const [
    routesResponse,
    stationsResponse,
  ] = await Promise.all([
    fetch(routesUrl),
    fetch(stationsUrl),
  ]);

  if (
    !routesResponse.ok ||
    !stationsResponse.ok
  ) {
    throw new Error(
      "No fue posible cargar TransMilenio."
    );
  }

  const routes =
    await routesResponse.json();

  const stations =
    await stationsResponse.json();

  return {
    routes,
    stations,
  };
}

/* =========================================================
   REDIMENSIONAR MAPA
========================================================= */

function MapResize() {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [map]);

  return null;
}

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

    return () => map.off("zoomend", handler);
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
