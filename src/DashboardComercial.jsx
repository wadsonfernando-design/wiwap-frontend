// Dashboard comercial do representante. Componente autônomo: recebe a URL da API e o token do login.
// Uso no App: <DashboardComercial apiBase={API_BASE_URL} token={token} usuario={usuario} />
import React, { useCallback, useEffect, useMemo, useState } from "react";

const C = { ink: "#0C1222", text: "#111528", muted: "#6B7185", faint: "#9AA0B1", border: "#E3E5EC", bg: "#FAFAFB", surface: "#FFFFFF", primary: "#4B4FE0", navy: "#12284C", teal: "#3A9C9E", green: "#2E9E57", rose: "#C4275D", amber: "#B8720A", roseBg: "#FBE7EE", greenBg: "#E7F6EF", grayBg: "#EEF0F4" };
const brl = (v) => (v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
const pct = (v, d = 1) => (v == null ? "—" : `${(v * 100).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d })}%`);
const num = (v) => (v == null ? "—" : v.toLocaleString("pt-BR"));
const dd = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const hora = (iso) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const rotuloMes = (ym) => `${MESES[Number(ym.slice(5, 7)) - 1]}/${ym.slice(0, 4)}`;
const ROTULO_IND = { originacao: "Originação (R$)", setupFaturado: "Setup faturado (R$)", consultas: "Consultas únicas", aprovadas: "Propostas aprovadas", contratos: "Contratos liberados", fpd: "FPD (%, 0–1)" };
const ROTULO_PARAM = { fpdDias: "Dias para medir o FPD", diasSemConsulta: "Dias sem consultas (alerta)", diasSemVenda: "Dias sem contrato liberado (alerta)", diasAprovacaoSemContrato: "Dias de aprovação sem contrato (alerta)", diasSetupPendente: "Dias de setup pendente (alerta)", concentracaoMaxPct: "% máximo de concentração por loja", deterioracaoPontos: "Pontos de piora do atraso (alerta)", diasSemPrimeiraVenda: "Dias sem primeira venda (loja ativa)" };

async function api(apiBase, token, caminho, opcoes = {}) {
  const r = await fetch(apiBase + caminho, { ...opcoes, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opcoes.headers || {}) } });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(dados.erro || `Erro ${r.status}`);
  return dados;
}
const mesAtual = () => new Date().toISOString().slice(0, 7);
function intervaloDoMes(ym) { const [a, m] = ym.split("-").map(Number); return { de: `${ym}-01`, ate: new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10) }; }
function ultimosMeses(n = 12) { const o = []; const d = new Date(); for (let i = 0; i < n; i++) { o.push(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1)).toISOString().slice(0, 7)); } return o; }

const Caixa = ({ children, style }) => <section style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, ...style }}>{children}</section>;
const Rotulo = ({ children, cor = C.muted }) => <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: cor }}>{children}</div>;
const Chip = ({ children, bg = C.grayBg, fg = C.muted }) => <span style={{ display: "inline-block", background: bg, color: fg, borderRadius: 999, padding: "5px 12px", fontSize: 13, whiteSpace: "nowrap" }}>{children}</span>;
const Botao = ({ children, onClick, leve, disabled }) => <button onClick={onClick} disabled={disabled} style={{ border: `1px solid ${leve ? C.border : C.primary}`, background: leve ? C.surface : C.primary, color: leve ? C.text : "#fff", borderRadius: 10, padding: "8px 14px", fontSize: 14, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.6 : 1 }}>{children}</button>;
const Vazio = ({ children }) => <div style={{ background: C.grayBg, color: C.muted, borderRadius: 12, padding: "14px 16px", fontSize: 14 }}>{children}</div>;

function Variacao({ valor, inverso }) {
  if (valor == null) return <Chip>Sem base de comparação</Chip>;
  const sobe = valor >= 0, bom = inverso ? !sobe : sobe;
  return <Chip bg={bom ? C.greenBg : C.roseBg} fg={bom ? C.green : C.rose}>{sobe ? "↑" : "↓"} {Math.abs(valor * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% vs. período anterior</Chip>;
}

function Spark({ pontos, cor, rotulos = true }) {
  const W = 600, H = 120, P = 6;
  const v = pontos.map((p) => p.valor);
  const validos = v.filter((x) => x != null);
  if (!pontos.length || !validos.length) return <div style={{ height: 150, display: "flex", alignItems: "center", color: C.faint, fontSize: 13 }}>Sem pontos no período.</div>;
  const max = Math.max(...validos, 0.0001), min = Math.min(0, ...validos);
  const x = (i) => P + (i * (W - 2 * P)) / Math.max(1, pontos.length - 1);
  const y = (val) => H - P - ((val - min) / (max - min || 1)) * (H - 2 * P);
  const seg = []; let atual = [];
  pontos.forEach((p, i) => { if (p.valor == null) { if (atual.length) seg.push(atual); atual = []; } else atual.push([x(i), y(p.valor)]); }); if (atual.length) seg.push(atual);
  const caminho = (s) => s.map(([a, b], i) => { if (i === 0) return `M${a},${b}`; const [pa, pb] = s[i - 1]; const cx = (pa + a) / 2; return `C${cx},${pb} ${cx},${b} ${a},${b}`; }).join(" ");
  const passo = Math.max(1, Math.ceil(pontos.length / 8));
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="120" role="img" aria-label="Evolução no período" preserveAspectRatio="none">
        {seg.map((s, i) => (s.length === 1 ? <circle key={i} cx={s[0][0]} cy={s[0][1]} r="3" fill={cor} /> : <path key={i} d={caminho(s)} fill="none" stroke={cor} strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />))}
      </svg>
      {rotulos && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, marginTop: 4 }}>{pontos.filter((_, i) => i % passo === 0).map((p) => <span key={p.data}>{dd(p.data)}</span>)}</div>}
    </div>
  );
}

function CartaoIndicador({ titulo, cor, hojeRotulo, hojeValor, valorGrande, onValor, meta, variacao, inverso, serie, rodape, children }) {
  return (
    <Caixa>
      <Rotulo cor={C.text}>{titulo}</Rotulo>
      <div style={{ marginTop: 6, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
        <Rotulo>{hojeRotulo}</Rotulo>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>{hojeValor}</div>
      </div>
      <div style={{ marginTop: 10 }}><Rotulo>{rodape}</Rotulo></div>
      <button onClick={onValor} disabled={!onValor} title={onValor ? "Ver composição por loja" : undefined} style={{ all: "unset", cursor: onValor ? "pointer" : "default", display: "block", fontSize: 38, fontWeight: 800, color: C.text, margin: "2px 0 10px", letterSpacing: -0.5 }}>{valorGrande}</button>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>{meta}<Variacao valor={variacao} inverso={inverso} /></div>
      {children}
      <Spark pontos={serie} cor={cor} />
    </Caixa>
  );
}

function Performance({ titulo, d, meta, podeDefinir, onDefinir }) {
  const pctMeta = d.percentualMeta;
  return (
    <Caixa>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0, fontSize: 20, color: C.text }}>{titulo}</h3>
        <div style={{ textAlign: "right", fontSize: 14, color: C.muted }}>
          <div style={{ fontWeight: 700, color: C.text }}>{pctMeta == null ? "—" : pct(pctMeta, 0)}</div>
          <div>{brl(d.realizado)} de {meta == null ? "—" : brl(meta)}</div>
        </div>
      </div>
      <div style={{ height: 14, background: "#E0E2E8", borderRadius: 999, margin: "14px 0 8px", overflow: "hidden" }} role="progressbar" aria-valuenow={Math.round((pctMeta || 0) * 100)} aria-valuemin="0" aria-valuemax="100">
        <div style={{ width: `${Math.min(100, (pctMeta || 0) * 100)}%`, height: "100%", background: C.primary }} />
      </div>
      <div style={{ fontSize: 13, color: C.muted, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        {meta == null ? <>Sem meta cadastrada para este mês. {podeDefinir && <Botao leve onClick={onDefinir}>Definir meta</Botao>}</> : <span>{pct(pctMeta, 0)} da meta</span>}
      </div>
      <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 14, paddingTop: 12, display: "flex", gap: 22, flexWrap: "wrap", fontSize: 14, color: C.muted }}>
        <span>Dias úteis <b style={{ color: C.text }}>{d.diasUteis.decorridos.toLocaleString("pt-BR")} de {d.diasUteis.total}</b></span>
        <span>Ritmo atual <b style={{ color: C.text }}>{d.ritmoAtual == null ? "—" : `${brl(d.ritmoAtual)}/dia útil`}</b></span>
        <span>Ritmo necessário <b style={{ color: C.text }}>{d.ritmoNecessario == null ? "—" : `${brl(d.ritmoNecessario)}/dia útil`}</b></span>
      </div>
    </Caixa>
  );
}

function Modal({ titulo, onClose, children, largo }) {
  useEffect(() => { const f = (e) => e.key === "Escape" && onClose(); window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f); }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label={titulo} onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(12,18,34,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.surface, borderRadius: 16, padding: 22, width: "100%", maxWidth: largo ? 860 : 560, maxHeight: "88vh", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}><h3 style={{ margin: 0, color: C.text }}>{titulo}</h3><Botao leve onClick={onClose}>Fechar</Botao></div>
        {children}
      </div>
    </div>
  );
}

function ModalMetas({ apiBase, token, periodo, onClose, onSalvo }) {
  const [dados, setDados] = useState(null), [erro, setErro] = useState(""), [status, setStatus] = useState({});
  useEffect(() => { api(apiBase, token, `/dashboard/metas?periodo=${periodo}`).then(setDados).catch((e) => setErro(e.message)); }, [apiBase, token, periodo]);
  const valorDe = (repId, ind) => { const m = dados.metas.find((x) => x.representanteId === repId && x.indicador === ind); return m ? m.valor : ""; };
  async function salvar(repId, ind, bruto) {
    const k = `${repId}|${ind}`; setStatus((s) => ({ ...s, [k]: "salvando" }));
    try { await api(apiBase, token, "/dashboard/metas", { method: "PUT", body: JSON.stringify({ representanteId: repId, indicador: ind, periodo, valor: bruto === "" ? null : Number(String(bruto).replace(",", ".")) }) }); setStatus((s) => ({ ...s, [k]: "ok" })); onSalvo(); }
    catch (e) { setStatus((s) => ({ ...s, [k]: e.message })); }
  }
  return (
    <Modal titulo={`Metas — ${rotuloMes(periodo)}`} onClose={onClose} largo>
      <p style={{ marginTop: 0, color: C.muted, fontSize: 14 }}>A gestão da Wiwap define as metas junto com cada representante. Campo vazio = sem meta. Salva ao sair do campo.</p>
      {erro && <Vazio>{erro}</Vazio>}
      {!dados && !erro && <Vazio>Carregando…</Vazio>}
      {dados && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
            <thead><tr><th style={{ textAlign: "left", padding: 8 }}>Representante</th>{dados.indicadores.map((i) => <th key={i} style={{ textAlign: "left", padding: 8, fontSize: 12, color: C.muted }}>{ROTULO_IND[i]}</th>)}</tr></thead>
            <tbody>{dados.representantes.map((r) => (
              <tr key={r.id} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ padding: 8 }}>{r.nomeCompleto}</td>
                {dados.indicadores.map((i) => { const k = `${r.id}|${i}`; return (
                  <td key={i} style={{ padding: 6 }}>
                    <input aria-label={`${ROTULO_IND[i]} de ${r.nomeCompleto}`} defaultValue={valorDe(r.id, i)} inputMode="decimal" onBlur={(e) => { if (String(e.target.value) !== String(valorDe(r.id, i))) salvar(r.id, i, e.target.value); }} style={{ width: 110, padding: "6px 8px", border: `1px solid ${status[k] && status[k] !== "ok" && status[k] !== "salvando" ? C.rose : C.border}`, borderRadius: 8 }} />
                    {status[k] === "ok" && <span style={{ color: C.green, fontSize: 12 }}> ✓</span>}
                    {status[k] && !["ok", "salvando"].includes(status[k]) && <div style={{ color: C.rose, fontSize: 12 }}>{status[k]}</div>}
                  </td>); })}
              </tr>))}</tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

function ModalParametros({ apiBase, token, onClose, onSalvo }) {
  const [p, setP] = useState(null), [erro, setErro] = useState("");
  useEffect(() => { api(apiBase, token, "/dashboard/parametros").then(setP).catch((e) => setErro(e.message)); }, [apiBase, token]);
  async function salvar(chave, valor) { try { await api(apiBase, token, "/dashboard/parametros", { method: "PUT", body: JSON.stringify({ chave, valor: valor === "" ? null : valor }) }); setErro(""); onSalvo(); } catch (e) { setErro(e.message); } }
  return (
    <Modal titulo="Limiares e parâmetros" onClose={onClose}>
      <p style={{ marginTop: 0, color: C.muted, fontSize: 14 }}>Sem valor padrão: o indicador ou alerta fica como pendente até a gestão definir.</p>
      {erro && <Vazio>{erro}</Vazio>}
      {p && Object.keys(ROTULO_PARAM).map((k) => (
        <label key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "8px 0", borderTop: `1px solid ${C.border}`, fontSize: 14 }}>
          <span>{ROTULO_PARAM[k]}</span>
          <input defaultValue={p[k] ?? ""} inputMode="decimal" placeholder="Pendente" onBlur={(e) => String(e.target.value) !== String(p[k] ?? "") && salvar(k, e.target.value)} style={{ width: 110, padding: "6px 8px", border: `1px solid ${C.border}`, borderRadius: 8 }} />
        </label>
      ))}
      {p && <label style={{ display: "block", paddingTop: 10, borderTop: `1px solid ${C.border}`, fontSize: 14 }}>Feriados (AAAA-MM-DD, separados por vírgula)
        <input defaultValue={(p.feriados || []).join(",")} onBlur={(e) => salvar("feriados", e.target.value)} placeholder="Pendente: sem feriados, só sáb. e dom. são excluídos" style={{ width: "100%", marginTop: 6, padding: "6px 8px", border: `1px solid ${C.border}`, borderRadius: 8 }} /></label>}
    </Modal>
  );
}

function ModalComposicao({ apiBase, token, indicador, titulo, consulta, onClose }) {
  const [c, setC] = useState(null), [erro, setErro] = useState("");
  useEffect(() => { api(apiBase, token, `/dashboard/composicao?${consulta}&indicador=${indicador}`).then(setC).catch((e) => setErro(e.message)); }, [apiBase, token, indicador, consulta]);
  const fmt = ["originacaoEfetiva", "setupFaturado", "setupRecebido", "setupPendente", "vencidoAberto"].includes(indicador) ? brl : num;
  return (
    <Modal titulo={`Composição — ${titulo}`} onClose={onClose}>
      {erro && <Vazio>{erro}</Vazio>}
      {!c && !erro && <Vazio>Carregando…</Vazio>}
      {c && <>
        <div style={{ marginBottom: 10 }}><Chip bg={c.reconciliado ? C.greenBg : C.roseBg} fg={c.reconciliado ? C.green : C.rose}>{c.reconciliado ? "Reconciliado" : "Diferença encontrada"}: soma das lojas {fmt(c.soma)} · total {fmt(c.total)}</Chip></div>
        {c.linhas.length === 0 ? <Vazio>Nenhuma loja contribuiu neste período.</Vazio> :
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}><tbody>{c.linhas.map((l) => <tr key={l.lojaId} style={{ borderTop: `1px solid ${C.border}` }}><td style={{ padding: 8 }}>{l.nome} <span style={{ color: C.faint }}>{l.codigo}</span></td><td style={{ padding: 8, textAlign: "right", fontWeight: 600 }}>{fmt(l.valor)}</td></tr>)}</tbody></table>}
      </>}
    </Modal>
  );
}

function Funil({ f, ant }) {
  const etapas = [
    { rot: "Consultas únicas", v: f.consultasUnicas, fmt: num },
    { rot: "Propostas aprovadas", v: f.propostasAprovadas, fmt: num, conv: f.conversao.consultaParaAprovada },
    { rot: "Contratos liberados", v: f.contratosLiberados, fmt: num, conv: f.conversao.aprovadaParaContrato },
    { rot: "Originação efetiva", v: f.originacaoEfetiva, fmt: brl },
  ];
  const max = Math.max(f.consultasUnicas, f.propostasAprovadas, f.contratosLiberados, 1);
  return (
    <div>
      {etapas.map((e, i) => (
        <div key={e.rot} style={{ marginBottom: 10 }}>
          {e.conv && <div style={{ fontSize: 12, color: C.muted, margin: "2px 0 4px 8px" }}>↳ conversão {pct(e.conv.valor)} <span style={{ color: C.faint }}>({e.conv.numerador} de {e.conv.denominador})</span></div>}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}><span>{e.rot}</span><b>{e.fmt(e.v)}</b></div>
          {i < 3 && <div style={{ height: 10, background: "#E8EAF0", borderRadius: 999 }}><div style={{ height: "100%", width: `${(e.v / max) * 100}%`, background: C.primary, borderRadius: 999 }} /></div>}
        </div>
      ))}
      <div style={{ fontSize: 13, color: C.muted, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
        Taxa de aprovação <b style={{ color: C.text }}>{pct(f.taxaAprovacao.valor)}</b> = {f.taxaAprovacao.numerador} aprovadas ÷ {f.taxaAprovacao.denominador} decididas (aprovadas + recusadas). Pendentes: {f.propostasPendentes}.
        <br />Valor aprovado <b style={{ color: C.text }}>{brl(f.valorAprovado)}</b> é diferente da originação efetiva (contratos liberados).
      </div>
    </div>
  );
}

export default function DashboardComercial({ apiBase, token, usuario }) {
  const [mes, setMes] = useState(mesAtual());
  const [redeId, setRedeId] = useState(""), [lojaId, setLojaId] = useState(""), [repId, setRepId] = useState("");
  const [d, setD] = useState(null), [erro, setErro] = useState(""), [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState(null);
  const consulta = useMemo(() => { const { de, ate } = intervaloDoMes(mes); const q = new URLSearchParams({ de, ate }); if (redeId) q.set("redeId", redeId); if (lojaId) q.set("lojaId", lojaId); if (repId) q.set("representanteId", repId); return q.toString(); }, [mes, redeId, lojaId, repId]);

  const carregar = useCallback(async () => {
    setCarregando(true); setErro("");
    try { setD(await api(apiBase, token, `/dashboard?${consulta}`)); } catch (e) { setErro(e.message); } finally { setCarregando(false); }
  }, [apiBase, token, consulta]);
  useEffect(() => { carregar(); }, [carregar]);

  const nome = (usuario?.nome || "").split(" ")[0];
  const h = new Date().getHours();
  const saudacao = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  const sub = usuario?.perfil === "representante" ? "Aqui está a sua carteira hoje." : "Aqui está o pulso da Wiwap hoje.";
  const lojasVisiveis = d ? d.lojasFiltro.filter((l) => !redeId || l.redeId === redeId) : [];
  const sem = (e) => !d || d.cobertura[e].registros === 0;
  const nomeLoja = (id) => (d?.lojasFiltro.find((l) => l.id === id)?.nome) || id;

  const select = { padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: 10, background: C.surface, fontSize: 14, color: C.text, minWidth: 150 };
  const metaChip = (m) => (m == null ? <Chip>Sem meta cadastrada</Chip> : <Chip bg="#EAEAFB" fg={C.primary}>Meta {m <= 1 && m > 0 ? pct(m, 1) : brl(m)}</Chip>);

  return (
    <div style={{ background: C.bg, minHeight: "100%", padding: "20px 16px 40px", maxWidth: 1280, margin: "0 auto", fontFamily: "inherit", color: C.text }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div><h1 style={{ margin: 0, fontSize: 30 }}>{saudacao}{nome ? `, ${nome}` : ""}</h1><div style={{ color: C.muted, marginTop: 2 }}>{sub}</div></div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: C.muted, fontSize: 14 }}>
          {d && <span>Atualizado às {hora(d.geradoEm)}</span>}
          <Botao leve onClick={carregar} disabled={carregando}>{carregando ? "Atualizando…" : "Atualizar"}</Botao>
        </div>
      </header>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", margin: "22px 0" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, color: C.muted }}>Período
          <select value={mes} onChange={(e) => setMes(e.target.value)} style={select}>{ultimosMeses().map((m) => <option key={m} value={m}>{rotuloMes(m)}</option>)}</select></label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, color: C.muted }}>Rede
          <select value={redeId} onChange={(e) => { setRedeId(e.target.value); setLojaId(""); }} style={select}><option value="">Todas as redes</option>{(d?.redes || []).map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}</select></label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, color: C.muted }}>Loja
          <select value={lojaId} onChange={(e) => setLojaId(e.target.value)} style={select}><option value="">Todas as lojas</option>{lojasVisiveis.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}</select></label>
        {d && d.representantes.length > 1 && <label style={{ display: "flex", alignItems: "center", gap: 8, color: C.muted }}>Representante
          <select value={repId} onChange={(e) => setRepId(e.target.value)} style={select}><option value="">Todos</option>{d.representantes.map((r) => <option key={r.id} value={r.id}>{r.nomeCompleto}</option>)}</select></label>}
        {d?.permissoes.editarMetas && <Botao leve onClick={() => setModal({ t: "metas" })}>Metas</Botao>}
        {d?.permissoes.editarParametros && <Botao leve onClick={() => setModal({ t: "params" })}>Limiares</Botao>}
      </div>

      {erro && <Vazio>Não foi possível carregar o painel: {erro}</Vazio>}
      {!d && carregando && <Vazio>Carregando painel…</Vazio>}

      {d && <>
        {d.lojasFiltro.length === 0 && <div style={{ marginBottom: 16 }}><Vazio>Nenhuma loja no escopo selecionado. Cadastre lojas e vincule-as a um representante para começar.</Vazio></div>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          <CartaoIndicador titulo="Originação" cor={C.navy} hojeRotulo="Hoje" hojeValor={sem("contratos") ? "Importação pendente" : brl(d.blocos.originacao.hoje)}
            rodape={rotuloMes(mes)} valorGrande={sem("contratos") ? "—" : brl(d.blocos.originacao.periodo)} onValor={sem("contratos") ? null : () => setModal({ t: "comp", ind: "originacaoEfetiva", titulo: "Originação efetiva" })}
            meta={metaChip(d.blocos.originacao.meta)} variacao={sem("contratos") ? null : d.blocos.originacao.variacao} serie={d.blocos.originacao.serie}>
            {sem("contratos") && <div style={{ marginBottom: 10 }}><Vazio>Integração com o sistema da Wiwap pendente: sem contratos importados.</Vazio></div>}
          </CartaoIndicador>

          <CartaoIndicador titulo="Setup" cor={C.teal} hojeRotulo="Hoje" hojeValor={sem("setups") ? "Nenhum setup" : brl(d.blocos.setup.hoje)}
            rodape={rotuloMes(mes)} valorGrande={brl(d.blocos.setup.periodo)} onValor={() => setModal({ t: "comp", ind: "setupFaturado", titulo: "Setup faturado" })}
            meta={metaChip(d.blocos.setup.meta)} variacao={d.blocos.setup.variacao} serie={d.blocos.setup.serie}>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>{d.setup.lojasContratadas} loja(s) contratada(s) · recebido {brl(d.setup.setupRecebido)} · pendente <b style={{ color: C.text }}>{brl(d.setup.setupPendente)}</b>{d.setup.estornos > 0 && <> · estornos {brl(d.setup.estornos)}</>}</div>
          </CartaoIndicador>

          <CartaoIndicador titulo="FPD da carteira" cor={C.rose} hojeRotulo="Inadimplência da carteira" hojeValor={sem("parcelas") ? "Importação pendente" : pct(d.blocos.fpd.inadimplencia.valor)}
            rodape={d.blocos.fpd.pendente ? "FPD" : `FPD · atraso > ${d.blocos.fpd.limiarDias} dias`} valorGrande={sem("parcelas") ? "—" : d.blocos.fpd.pendente ? "Pendente" : d.blocos.fpd.valor == null ? "Sem base" : pct(d.blocos.fpd.valor)}
            onValor={sem("parcelas") ? null : () => setModal({ t: "comp", ind: "vencidoAberto", titulo: "Vencido em aberto" })}
            meta={metaChip(d.blocos.fpd.meta)} variacao={d.blocos.fpd.valor != null && d.blocos.fpd.anterior ? (d.blocos.fpd.valor - d.blocos.fpd.anterior) / d.blocos.fpd.anterior : null} inverso serie={(d.blocos.fpd.serie || []).map((p) => ({ data: p.data, valor: p.valor }))}>
            {d.blocos.fpd.pendente && <div style={{ marginBottom: 10 }}><Vazio>{d.blocos.fpd.motivo}. {d.permissoes.editarParametros ? "Defina em Limiares." : "A gestão precisa definir."}</Vazio></div>}
            {!d.blocos.fpd.pendente && d.blocos.fpd.denominador != null && <div style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>{d.blocos.fpd.numerador} de {d.blocos.fpd.denominador} contratos com 1ª parcela já observável. Inadimplência = vencido {brl(d.inadimplencia.vencidoAberto)} ÷ saldo em aberto {brl(d.inadimplencia.saldoAbertoTotal)}.</div>}
          </CartaoIndicador>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16, marginTop: 16 }}>
          <Performance titulo="Performance do mês — Originação" d={d.blocos.originacao.desempenho} meta={d.blocos.originacao.meta} podeDefinir={d.permissoes.editarMetas} onDefinir={() => setModal({ t: "metas" })} />
          <Performance titulo="Performance do mês — Setup" d={d.blocos.setup.desempenho} meta={d.blocos.setup.meta} podeDefinir={d.permissoes.editarMetas} onDefinir={() => setModal({ t: "metas" })} />
        </div>
        {!d.feriadosDefinidos && <div style={{ fontSize: 12, color: C.faint, marginTop: 8 }}>Dias úteis consideram só sábado e domingo; feriados ainda não foram cadastrados.</div>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16, marginTop: 16 }}>
          <Caixa>
            <h3 style={{ marginTop: 0 }}>Funil de originação</h3>
            {sem("consultas") ? <Vazio>Consultas e recusas vêm do sistema de crédito da Wiwap. Importação pendente: nenhum dado recebido ainda.</Vazio> : <Funil f={d.funil} ant={d.funilAnterior} />}
          </Caixa>
          <Caixa>
            <h3 style={{ marginTop: 0 }}>Inadimplência por faixa de atraso</h3>
            {sem("parcelas") ? <Vazio>Parcelas vêm do sistema da Wiwap. Importação pendente.</Vazio> : <>
              {d.inadimplencia.faixas.map((f) => { const max = Math.max(...d.inadimplencia.faixas.map((x) => x.valor), 1); return (
                <div key={f.faixa} style={{ display: "grid", gridTemplateColumns: "92px 1fr 120px", gap: 10, alignItems: "center", fontSize: 14, marginBottom: 6 }}>
                  <span>{f.faixa} dias</span><div style={{ height: 10, background: "#E8EAF0", borderRadius: 999 }}><div style={{ height: "100%", width: `${(f.valor / max) * 100}%`, background: C.rose, borderRadius: 999 }} /></div><span style={{ textAlign: "right" }}>{brl(f.valor)}</span></div>); })}
              <div style={{ fontSize: 13, color: C.muted, borderTop: `1px solid ${C.border}`, paddingTop: 10, marginTop: 8 }}>
                Novas entradas em atraso no período: <b style={{ color: C.text }}>{d.inadimplencia.novasEntradasEmAtraso.quantidade}</b> ({brl(d.inadimplencia.novasEntradasEmAtraso.valor)}) · Recuperações: <b style={{ color: C.text }}>{d.inadimplencia.recuperacoes.quantidade}</b> ({brl(d.inadimplencia.recuperacoes.valor)})
              </div>
              {d.inadimplencia.safras.length > 0 && <div style={{ overflowX: "auto", marginTop: 12 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead><tr><th style={{ textAlign: "left", padding: 6 }}>Safra</th>{[30, 60, 90].map((i) => <th key={i} style={{ padding: 6, textAlign: "right" }}>{i} dias</th>)}</tr></thead>
                  <tbody>{d.inadimplencia.safras.map((s) => <tr key={s.safra} style={{ borderTop: `1px solid ${C.border}` }}><td style={{ padding: 6 }}>{rotuloMes(s.safra)} <span style={{ color: C.faint }}>({s.contratos})</span></td>{[30, 60, 90].map((i) => <td key={i} style={{ padding: 6, textAlign: "right" }}>{s.idades[i] ? pct(s.idades[i].valor) : "—"}</td>)}</tr>)}</tbody>
                </table>
                <div style={{ fontSize: 12, color: C.faint, marginTop: 4 }}>"—" = safra ainda sem tempo de observação nessa idade.</div>
              </div>}
            </>}
          </Caixa>
        </div>

        <Caixa style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Onde agir na carteira</h3>
          {d.alertas.length === 0 ? <Vazio>{sem("consultas") && sem("contratos") ? "Sem dados para gerar alertas: importação pendente." : "Nenhum alerta com os limiares atuais."}</Vazio> :
            <div style={{ display: "grid", gap: 8 }}>{d.alertas.map((a, i) => (
              <div key={i} style={{ border: `1px solid ${C.border}`, borderLeft: `4px solid ${C.rose}`, borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontWeight: 700 }}>{a.motivo} · {nomeLoja(a.lojaId)}</div><div style={{ fontSize: 14, color: C.muted }}>{a.evidencia}</div></div>))}</div>}
          {d.parametrosPendentes.length > 0 && <div style={{ fontSize: 13, color: C.muted, marginTop: 12 }}>Alertas pendentes de limiar: {d.parametrosPendentes.map((p) => p.rotulo).join("; ")}. {d.permissoes.editarParametros && <button onClick={() => setModal({ t: "params" })} style={{ all: "unset", color: C.primary, cursor: "pointer", textDecoration: "underline" }}>Definir limiares</button>}</div>}
        </Caixa>

        <Caixa style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Carteira por loja</h3>
          {d.carteira.length === 0 ? <Vazio>Sem lojas no escopo.</Vazio> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 820 }}>
                <thead><tr style={{ color: C.muted, fontSize: 12, textAlign: "right" }}>{["Loja", "Consultas", "Aprovação", "Contratos", "Originação", "Setup pendente", "Inadimpl.", "FPD"].map((h, i) => <th key={h} style={{ padding: 8, textAlign: i === 0 ? "left" : "right" }}>{h}</th>)}</tr></thead>
                <tbody>{d.carteira.map((l) => (
                  <tr key={l.lojaId} style={{ borderTop: `1px solid ${C.border}`, textAlign: "right" }}>
                    <td style={{ padding: 8, textAlign: "left" }}><b>{l.nome}</b> <span style={{ color: C.faint }}>{l.codigo}</span></td>
                    <td style={{ padding: 8 }}>{sem("consultas") ? "—" : num(l.consultas)}</td>
                    <td style={{ padding: 8 }}>{l.taxaAprovacao.valor == null ? "—" : `${pct(l.taxaAprovacao.valor, 0)} (${l.taxaAprovacao.numerador}/${l.taxaAprovacao.denominador})`}</td>
                    <td style={{ padding: 8 }}>{sem("contratos") ? "—" : num(l.contratos)}</td>
                    <td style={{ padding: 8 }}>{sem("contratos") ? "—" : brl(l.originacao)}</td>
                    <td style={{ padding: 8 }}>{brl(l.setupPendente)}</td>
                    <td style={{ padding: 8 }}>{sem("parcelas") ? "—" : pct(l.inadimplencia.valor)}</td>
                    <td style={{ padding: 8 }}>{l.fpd.pendente ? "Pendente" : pct(l.fpd.valor)}</td>
                  </tr>))}</tbody>
              </table>
            </div>)}
        </Caixa>

        <Caixa style={{ marginTop: 16, background: "transparent", border: `1px dashed ${C.border}` }}>
          <Rotulo>Cobertura dos dados</Rotulo>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 8, fontSize: 13, color: C.muted }}>
            {[["Consultas", "consultas"], ["Propostas", "propostas"], ["Contratos", "contratos"], ["Parcelas", "parcelas"], ["Setups", "setups"]].map(([r, k]) => (
              <span key={k}><b style={{ color: C.text }}>{r}:</b> {d.cobertura[k].registros === 0 ? "importação pendente" : `${d.cobertura[k].lojasComDado} de ${d.cobertura[k].lojasNoEscopo} lojas · atualizado ${new Date(d.cobertura[k].ultimaAtualizacao).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`}</span>))}
          </div>
        </Caixa>
      </>}

      {modal?.t === "metas" && <ModalMetas apiBase={apiBase} token={token} periodo={mes} onClose={() => setModal(null)} onSalvo={carregar} />}
      {modal?.t === "params" && <ModalParametros apiBase={apiBase} token={token} onClose={() => setModal(null)} onSalvo={carregar} />}
      {modal?.t === "comp" && <ModalComposicao apiBase={apiBase} token={token} indicador={modal.ind} titulo={modal.titulo} consulta={consulta} onClose={() => setModal(null)} />}
    </div>
  );
}
