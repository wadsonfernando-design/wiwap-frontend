import React from "react";

// Versões oficiais (arquivos em /public/brand). Regras da marca:
// original em fundo claro; negativa em navy #003060 ou ink #141D2E; nunca distorcer, recolorir ou girar.
// Tamanho mínimo: logo horizontal 120px de largura; símbolo 24px de altura. Respeitar a área de proteção (altura do "W").
const ARQUIVOS = {
  horizontal: "/brand/wiwap-horizontal.png",
  "horizontal-negativo": "/brand/wiwap-horizontal-negativo.png",
  vertical: "/brand/wiwap-vertical.png",
  simbolo: "/brand/wiwap-simbolo.png",
  "simbolo-negativo": "/brand/wiwap-simbolo-negativo.png",
};

export default function BrandLogo({ variante = "horizontal", altura, className = "" }) {
  const minimo = variante.startsWith("simbolo") ? 24 : 30;
  const h = Math.max(altura || minimo, minimo);
  return <img src={ARQUIVOS[variante]} alt="Wiwap" height={h} style={{ height: h, width: "auto", display: "block" }} className={className} draggable={false} />;
}
