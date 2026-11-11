import DashboardComercial from "./DashboardComercial";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import BrandLogo from "./brand/BrandLogo";
import Papa from "papaparse";
import {
  LayoutGrid, Users, Store, ShoppingCart, FileSliders, Calculator,
  Target, Wallet, ClipboardCheck, CheckSquare, Banknote, BarChart3,
  Settings, ShieldCheck, Search, ChevronDown, ChevronRight, X, Plus,
  ArrowRightLeft, AlertTriangle, Clock, Building2, MapPin, Phone,
  Mail, CreditCard, FileText, Lock, LogOut, Filter, ArrowUpRight,
  TrendingUp, CircleDot, Percent, Layers, Trash2, PlusCircle, Info,
  Gauge, Sparkles, Check, XCircle, PenLine, ChevronLeft,
  Copy, Printer, Save, Scale, Award, Minus, Upload, FileUp,
  MessageSquareWarning, CircleCheck, Paperclip, RotateCcw, Download, History,
  UserPlus, SlidersHorizontal, ShieldQuestion,
} from "lucide-react";

/* ============================================================================
   CLIENTE DE API
   Troque API_BASE_URL pela URL do seu backend, se for diferente da que foi
   implantada durante esta conversa. Todo o resto do app fala com o backend
   exclusivamente por aqui — nenhuma tela guarda dados "de verdade" sozinha.
============================================================================ */

const API_BASE_URL = import.meta.env.VITE_DASHBOARD_PREVIEW_API || "/api";

async function apiFetch(path, { method = "GET", body, token } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const erro = await res.json().catch(() => ({}));
    throw new Error(erro.erro || `Erro ${res.status} ao acessar ${path}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function apiUpload(path, file, token) {
  const form = new FormData();
  form.append("arquivo", file);
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    const erro = await res.json().catch(() => ({}));
    throw new Error(erro.erro || `Erro ${res.status} ao enviar arquivo`);
  }
  return res.json();
}

function criarApi(token) {
  return {
    login: (email, senha) => apiFetch("/auth/login", { method: "POST", body: { email, senha } }),

    getRepresentantes: () => apiFetch("/representantes", { token }),
    criarRepresentante: (dados) => apiFetch("/representantes", { method: "POST", body: dados, token }),
    atualizarRepresentante: (id, dados) => apiFetch(`/representantes/${id}`, { method: "PATCH", body: dados, token }),
    anexarDocumento: (representanteId, documentoId) => apiFetch(`/representantes/${representanteId}/documentos/${documentoId}`, { method: "PATCH", token }),

    getLojas: () => apiFetch("/lojas", { token }),
    criarLoja: (dados) => apiFetch("/lojas", { method: "POST", body: dados, token }),
    transferirLoja: (id, dados) => apiFetch(`/lojas/${id}/transferir`, { method: "POST", body: dados, token }),
    getHistoricoLoja: (id) => apiFetch(`/lojas/${id}/historico`, { token }),

    getCondicoes: () => apiFetch("/condicoes", { token }),
    criarCondicao: (dados) => apiFetch("/condicoes", { method: "POST", body: dados, token }),
    atualizarCondicao: (id, dados) => apiFetch(`/condicoes/${id}`, { method: "PATCH", body: dados, token }),
    salvarRegras: (id, regras) => apiFetch(`/condicoes/${id}/regras`, { method: "PUT", body: { regras }, token }),
    mudarStatusCondicao: (id, status) => apiFetch(`/condicoes/${id}/status`, { method: "PATCH", body: { status }, token }),

    getVendas: () => apiFetch("/vendas", { token }),
    importarVendas: (file) => apiUpload("/vendas/importar", file, token),

    getFechamentos: () => apiFetch("/fechamentos", { token }),
    avancarFechamento: (id, extra) => apiFetch(`/fechamentos/${id}/avancar`, { method: "PATCH", body: extra || {}, token }),
    contestarFechamento: (id, dados) => apiFetch(`/fechamentos/${id}/contestar`, { method: "POST", body: dados, token }),

    simular: (condicaoIds, cenario) => apiFetch("/simulador", { method: "POST", body: { condicaoIds, cenario }, token }),

    getAuditoria: () => apiFetch("/auditoria", { token }),

    getMetas: () => apiFetch("/metas", { token }),
    criarMeta: (dados) => apiFetch("/metas", { method: "POST", body: dados, token }),
    atualizarMeta: (id, dados) => apiFetch(`/metas/${id}`, { method: "PATCH", body: dados, token }),
    getCampanhas: () => apiFetch("/campanhas", { token }),
    criarCampanha: (dados) => apiFetch("/campanhas", { method: "POST", body: dados, token }),

    getUsuarios: () => apiFetch("/usuarios", { token }),
    criarUsuario: (dados) => apiFetch("/usuarios", { method: "POST", body: dados, token }),

    getGestores: () => apiFetch("/gestores", { token }),
    getRedes: () => apiFetch("/redes", { token }),
    getParametros: () => apiFetch("/parametros", { token }),
    salvarParametros: (params) => apiFetch("/parametros", { method: "PUT", body: params, token }),
  };
}

/* ============================================================================
   MODELO DE DADOS
   GESTORES e REDES chegam do backend (getGestores/getRedes) e são
   preenchidos em tempo de execução — ficam como arrays vazios aqui só para
   o resto do arquivo continuar lendo GESTORES.find(...)/REDES.map(...) sem
   precisar receber essas listas por prop em cada componente.
============================================================================ */

const GESTORES = [];
const REDES = [];
const REGIOES = ["Sudeste", "Sul", "Nordeste"];
const ESTADOS_POR_REGIAO = {
  Sudeste: ["SP", "RJ", "MG", "ES"],
  Sul: ["PR", "SC", "RS"],
  Nordeste: ["BA", "PE", "CE"],
};
const CIDADES = {
  SP: ["São Paulo", "Campinas", "Sorocaba"],
  RJ: ["Rio de Janeiro", "Niterói"],
  MG: ["Belo Horizonte", "Itabira", "Uberlândia"],
  ES: ["Vitória"],
  PR: ["Curitiba", "Londrina"],
  SC: ["Florianópolis", "Joinville"],
  RS: ["Porto Alegre"],
  BA: ["Salvador", "Feira de Santana"],
  PE: ["Recife"],
  CE: ["Fortaleza"],
};

const STATUS_REPRESENTANTE = ["em_analise", "ativo", "suspenso", "encerrado"];
const STATUS_LOJA = [
  "prospect", "credenciada", "em_implantacao", "ativa", "inativa",
  "suspensa", "encerrada",
];

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}
const rnd = seededRandom(42);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const nomes = [
  "Bruno Castilho", "Camila Fregonesi", "Diego Aranha", "Helena Bitencourt",
  "Marcelo Quintal",
];
const sobrenomesEmpresa = ["Comercial", "Representações", "Negócios"];

function gerarRepresentantes() {
  return nomes.map((nome, i) => {
    const regiao = REGIOES[i % REGIOES.length];
    const estado = pick(ESTADOS_POR_REGIAO[regiao]);
    const cidade = pick(CIDADES[estado]);
    const status = i === 4 ? "em_analise" : i === 3 ? "suspenso" : "ativo";
    return {
      id: `rep${i + 1}`,
      nomeCompleto: nome,
      nomeEmpresarial: `${nome.split(" ")[0]} ${pick(sobrenomesEmpresa)} LTDA`,
      cpf: `${100 + i}.${234 + i}.${567 + i}-0${i}`,
      cnpj: `1${i}.345.678/0001-0${i}`,
      tipoPessoa: i % 2 === 0 ? "PJ" : "PF",
      email: `${nome.split(" ")[0].toLowerCase()}@parceiros.wiwap.com`,
      telefone: `(31) 9${8000 + i}-${1000 + i}00`,
      dataNascimento: `1${5 + i}/0${(i % 9) + 1}/198${i}`,
      endereco: `Rua das ${pick(["Acácias", "Palmeiras", "Orquídeas", "Magnólias", "Tulipas"])}, ${100 + i * 12}`,
      cidade, estado, regiao,
      gestorId: i % 2 === 0 ? "g1" : "g2",
      dataInicio: `0${(i % 9) + 1}/0${(i % 9) + 1}/2024`,
      dataEncerramento: null,
      status,
      dadosFinanceiros: {
        banco: pick(["Itaú", "Bradesco", "Nubank", "Banco do Brasil", "Santander"]),
        agencia: `00${i + 1}`,
        conta: `1234${i}-${i}`,
        pix: `${nome.split(" ")[0].toLowerCase()}.rep@pix.com`,
        formaPagamento: "Transferência (PIX)",
        diaPagamento: 10,
        notaFiscal: i % 2 === 0,
      },
      documentos: [
        { tipo: "Contrato", status: "válido", validade: "31/12/2026" },
        { tipo: "Cartão CNPJ", status: i === 4 ? "pendente" : "válido", validade: "-" },
        { tipo: "Comprovante bancário", status: i === 3 ? "vencido" : "válido", validade: "01/06/2026" },
      ],
    };
  });
}
const REPRESENTANTES = gerarRepresentantes();

function gerarLojas(qtd = 30) {
  const lojas = [];
  for (let i = 0; i < qtd; i++) {
    const rep = REPRESENTANTES[i % REPRESENTANTES.length];
    const regiao = rep.regiao;
    const estado = pick(ESTADOS_POR_REGIAO[regiao]);
    const cidade = pick(CIDADES[estado]);
    const status = pick(["ativa", "ativa", "ativa", "em_implantacao", "inativa", "credenciada"]);
    const qtdVendas = status === "ativa" ? Math.floor(rnd() * 40) + 3 : status === "inativa" ? 0 : Math.floor(rnd() * 5);
    const diasSemVender = status === "inativa" ? 30 + Math.floor(rnd() * 90) : status === "ativa" ? Math.floor(rnd() * 20) : null;
    lojas.push({
      id: `loja${i + 1}`,
      codigo: `WW-${String(1000 + i)}`,
      nomeFantasia: `${pick(["Loja", "Mercantil", "Magazine", "Bazar", "Varejão"])} ${pick(["Central", "Popular", "Bom Preço", "Estrela", "Ideal", "Família"])}`,
      razaoSocial: `${pick(["Comércio", "Distribuidora", "Varejo"])} ${String.fromCharCode(65 + i)} LTDA`,
      cnpj: `2${i}.456.789/000${i % 9}-0${i % 9}`,
      redeId: i % 4 === 0 ? "r1" : i % 5 === 0 ? "r2" : "r3",
      cidade, estado, regiao,
      dataCredenciamento: `1${(i % 9)}/0${(i % 9) + 1}/2025`,
      dataAtivacao: status !== "prospect" && status !== "credenciada" ? `2${(i % 8)}/0${(i % 9) + 1}/2025` : null,
      representanteAtualId: rep.id,
      representanteProspeccaoId: rep.id,
      gestorId: rep.gestorId,
      status,
      dataPrimeiraVenda: qtdVendas > 0 ? `0${(i % 9) + 1}/0${(i % 9) + 1}/2025` : null,
      dataUltimaVenda: qtdVendas > 0 ? `1${(i % 9)}/0${(((i + 3) % 9)) + 1}/2026` : null,
      qtdVendas,
      volumeOriginado: qtdVendas * (800 + Math.floor(rnd() * 1500)),
      receitaGerada: qtdVendas * (60 + Math.floor(rnd() * 120)),
      diasSemVender,
      motivoInatividade: status === "inativa" ? pick(["Sazonalidade", "Concorrência local", "Fechamento temporário"]) : null,
    });
  }
  return lojas;
}
const LOJAS_INICIAIS = gerarLojas(30);

// Histórico de vínculo loja x representante (nunca é sobrescrito, só recebe novos registros)
function gerarHistoricoInicial(lojas) {
  return lojas.map((l, i) => ({
    id: `vinc${i + 1}`,
    lojaId: l.id,
    representanteId: l.representanteAtualId,
    dataInicio: l.dataCredenciamento,
    dataFim: null,
    motivo: "Credenciamento inicial",
  }));
}

/* ---------- Vendas ---------- */

const PRODUTOS = ["Crédito Pessoal", "Cartão Wiwap", "Parcelamento Loja", "Clube Wiwap"];
const STATUS_VENDA = ["Simulada", "Aprovada", "Formalizada", "Liquidada", "Em pagamento", "Quitada", "Inadimplente", "Cancelada", "Estornada"];
const MESES = ["Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro"];
const COMPETENCIAS = MESES.map((m) => `${m}/2026`);

function gerarVendas(qtd = 200) {
  const lojasAtivaveis = LOJAS_INICIAIS.filter((l) => l.status === "ativa" || l.status === "em_implantacao");
  const vendas = [];
  for (let i = 0; i < qtd; i++) {
    const loja = pick(lojasAtivaveis.length ? lojasAtivaveis : LOJAS_INICIAIS);
    const mesIdx = i % MESES.length;
    const competencia = COMPETENCIAS[mesIdx];
    const dia = String(1 + Math.floor(rnd() * 27)).padStart(2, "0");
    const data = `${dia}/0${mesIdx + 4}/2026`;
    const valorCompra = 600 + Math.floor(rnd() * 6000);
    const entrada = Math.round(valorCompra * (rnd() * 0.2));
    const valorFinanciado = valorCompra - entrada;
    const qtdParcelas = pick([3, 6, 10, 12, 18]);
    const statusPeso = pick(["Quitada", "Quitada", "Liquidada", "Em pagamento", "Formalizada", "Aprovada", "Inadimplente", "Cancelada", "Estornada", "Simulada"]);
    const cancelamento = statusPeso === "Cancelada";
    const estorno = statusPeso === "Estornada";
    const inadimplencia = statusPeso === "Inadimplente";
    const elegivel = !cancelamento && !estorno && statusPeso !== "Simulada";
    const receitaGerada = Math.round(valorFinanciado * (0.06 + rnd() * 0.03));
    const percentualRecebido = statusPeso === "Quitada" ? 1 : statusPeso === "Inadimplente" ? 0.3 + rnd() * 0.3 : statusPeso === "Cancelada" || statusPeso === "Estornada" ? 0 : 0.5 + rnd() * 0.4;
    vendas.push({
      id: `venda${i + 1}`,
      codigo: `VD-${String(20260 + i)}`,
      data, competencia,
      lojaId: loja.id,
      redeId: loja.redeId,
      representanteId: loja.representanteAtualId,
      clienteAnonimizado: `Cliente ****${1000 + i}`,
      produto: pick(PRODUTOS),
      valorCompra, entrada, valorFinanciado, qtdParcelas,
      status: statusPeso,
      receitaGerada,
      valorRecebido: Math.round(receitaGerada * percentualRecebido),
      inadimplencia, cancelamento, estorno,
      elegivelComissao: elegivel,
      motivoInelegibilidade: cancelamento ? "Venda cancelada" : estorno ? "Venda estornada" : statusPeso === "Simulada" ? "Ainda não formalizada" : null,
    });
  }
  return vendas;
}
const VENDAS_INICIAIS = gerarVendas(200);



const TIPO_CONDICAO = ["Plano padrão", "Plano individual", "Plano regional", "Plano por rede", "Plano temporário", "Campanha", "Condição excepcional"];

const STATUS_CONDICAO_STYLES = {
  rascunho: { bg: "#F4F5F7", fg: "#5B6472", label: "Rascunho" },
  aguardando_aprovacao: { bg: "#FEF3C7", fg: "#B45309", label: "Aguardando aprovação" },
  aprovado: { bg: "#E7EEFB", fg: "#00223F", label: "Aprovado" },
  vigente: { bg: "#E9F7EF", fg: "#15803D", label: "Vigente" },
  suspenso: { bg: "#FDECEC", fg: "#B91C1C", label: "Suspenso" },
  encerrado: { bg: "#F4F5F7", fg: "#69707D", label: "Encerrado" },
};

// Catálogo fixo dos 21 componentes de comissão configuráveis (item 7 do escopo).
// "categoria" define qual conjunto de campos primários o construtor mostra.
const REGRA_TIPOS = [
  { id: "valor_fixo_credenciamento", label: "Valor fixo por nova loja credenciada", categoria: "fixo" },
  { id: "valor_fixo_ativacao", label: "Valor fixo por loja ativada", categoria: "fixo" },
  { id: "comissao_setup", label: "Comissão sobre setup recebido", categoria: "percentual" },
  { id: "comissao_mensalidade", label: "Comissão sobre mensalidade recebida", categoria: "percentual" },
  { id: "comissao_contrato", label: "Comissão por contrato originado", categoria: "fixo" },
  { id: "comissao_venda_aprovada", label: "Comissão por venda aprovada", categoria: "fixo" },
  { id: "percentual_volume", label: "Percentual sobre o volume originado", categoria: "percentual" },
  { id: "percentual_financiado", label: "Percentual sobre o valor financiado", categoria: "percentual" },
  { id: "percentual_receita", label: "Percentual sobre a receita gerada", categoria: "percentual" },
  { id: "percentual_receita_recebida", label: "Percentual sobre a receita efetivamente recebida", categoria: "percentual" },
  { id: "faixa_producao", label: "Comissão por faixa de produção", categoria: "faixa" },
  { id: "bonus_meta", label: "Bônus por atingimento de meta", categoria: "meta" },
  { id: "acelerador_meta", label: "Acelerador por superação de meta", categoria: "meta" },
  { id: "comissao_recorrente", label: "Comissão recorrente por loja ativa", categoria: "fixo" },
  { id: "bonus_reativacao", label: "Bônus por reativação de loja", categoria: "meta" },
  { id: "bonus_campanha", label: "Bônus por campanha", categoria: "meta" },
  { id: "garantia_minima", label: "Garantia mínima mensal", categoria: "limite" },
  { id: "teto_maximo", label: "Teto máximo de comissão", categoria: "limite" },
  { id: "ajuda_custo_fixa", label: "Ajuda de custo fixa", categoria: "ajuda" },
  { id: "ajuda_custo_variavel", label: "Ajuda de custo variável", categoria: "ajuda" },
  { id: "estorno_desconto", label: "Estorno ou desconto", categoria: "estorno" },
];
const regraTipo = (id) => REGRA_TIPOS.find((t) => t.id === id);

const BASES_CALCULO = [
  "Volume originado", "Valor financiado", "Receita gerada", "Receita efetivamente recebida",
  "Setup recebido", "Mensalidades recebidas",
];

function novaRegraVazia() {
  return {
    id: `regra_${Math.random().toString(36).slice(2, 9)}`,
    tipoId: "percentual_volume",
    baseCalculo: "Volume originado",
    percentual: "",
    valorFixo: "",
    multiplicador: "",
    metaVinculada: "",
    periodicidade: "Mensal",
    carencia: "",
    quantidadeMinima: "",
    valorMinimo: "",
    limiteMaximo: "",
    produtosElegiveis: "Todos os produtos",
    lojasElegiveis: "Todas as lojas da carteira",
    estadosElegiveis: "Todos os estados",
    periodoValidadeInicio: "",
    periodoValidadeFim: "",
    regraEstorno: "Proporcional ao valor cancelado",
    regraArredondamento: "Duas casas decimais",
    acumulativa: true,
    incidencia: "liquido",
    dependePagamento: true,
    dependeNF: false,
    modeloFaixa: "progressivo",
    faixas: [{ de: 0, ate: 100000, percentual: 0.5 }, { de: 100000, ate: null, percentual: 0.75 }],
    observacao: "",
  };
}

const CONDICOES_INICIAIS = [
  {
    id: "cond1",
    nome: "Plano Expansão",
    tipo: "Plano padrão",
    descricao: "Remunera a prospecção e a ativação inicial de novas lojas, com bônus por volume de credenciamento no mês.",
    elegibilidade: "Todos os representantes",
    dataInicio: "01/01/2026",
    dataFim: null,
    status: "vigente",
    responsavelCriacao: "Renata Salgado",
    responsavelAprovacao: "Marcos Teixeira",
    dataAprovacao: "15/12/2025",
    observacoes: "Plano de entrada, indicado para representantes em fase de expansão de carteira.",
    regras: [
      { ...novaRegraVazia(), id: "r1", tipoId: "valor_fixo_credenciamento", valorFixo: 150, periodicidade: "Por evento", observacao: "Pago no credenciamento da loja." },
      { ...novaRegraVazia(), id: "r2", tipoId: "comissao_venda_aprovada", valorFixo: 200, periodicidade: "Por evento", observacao: "Adicional pago quando a loja realiza a primeira venda." },
      { ...novaRegraVazia(), id: "r3", tipoId: "percentual_volume", percentual: 0.5, baseCalculo: "Volume originado", incidencia: "liquido" },
      { ...novaRegraVazia(), id: "r4", tipoId: "bonus_meta", valorFixo: 1000, metaVinculada: "20 lojas ativas no mês" },
    ],
  },
  {
    id: "cond2",
    nome: "Plano Performance",
    tipo: "Plano padrão",
    descricao: "Foco em volume originado, com faixas progressivas e acelerador por superação de meta.",
    elegibilidade: "Todos os representantes",
    dataInicio: "01/01/2026",
    dataFim: null,
    status: "vigente",
    responsavelCriacao: "Otávio Marins",
    responsavelAprovacao: "Marcos Teixeira",
    dataAprovacao: "15/12/2025",
    observacoes: "Sem remuneração por credenciamento — indicado para representantes com carteira já madura.",
    regras: [
      {
        ...novaRegraVazia(), id: "r5", tipoId: "faixa_producao", baseCalculo: "Volume originado", modeloFaixa: "progressivo",
        faixas: [{ de: 0, ate: 200000, percentual: 0.75 }, { de: 200000, ate: null, percentual: 1.0 }],
      },
      { ...novaRegraVazia(), id: "r6", tipoId: "acelerador_meta", multiplicador: 1.2, metaVinculada: "110% da meta mensal de volume" },
      { ...novaRegraVazia(), id: "r7", tipoId: "teto_maximo", valorFixo: 15000, periodicidade: "Mensal" },
    ],
  },
  {
    id: "cond3",
    nome: "Plano Recorrência",
    tipo: "Plano padrão",
    descricao: "Prioriza a manutenção da carteira ativa e a recorrência de mensalidades do Clube Wiwap.",
    elegibilidade: "Todos os representantes",
    dataInicio: "01/01/2026",
    dataFim: null,
    status: "vigente",
    responsavelCriacao: "Renata Salgado",
    responsavelAprovacao: "Marcos Teixeira",
    dataAprovacao: "15/12/2025",
    observacoes: "Indicado para representantes focados em retenção e produtividade da base já ativa.",
    regras: [
      { ...novaRegraVazia(), id: "r8", tipoId: "comissao_recorrente", valorFixo: 50, periodicidade: "Mensal", observacao: "Por loja produtiva no mês." },
      { ...novaRegraVazia(), id: "r9", tipoId: "comissao_mensalidade", percentual: 10, baseCalculo: "Mensalidades recebidas" },
      { ...novaRegraVazia(), id: "r10", tipoId: "percentual_volume", percentual: 0.3, baseCalculo: "Volume originado" },
      { ...novaRegraVazia(), id: "r11", tipoId: "estorno_desconto", regraEstorno: "Proporcional ao valor cancelado", observacao: "Estorno proporcional em caso de cancelamento." },
    ],
  },
  {
    id: "cond4",
    nome: "Condição excepcional — Bruno Castilho",
    tipo: "Condição excepcional",
    descricao: "Ajuste pontual solicitado para viabilizar a migração da rede Vitrine Mix para a carteira do representante.",
    elegibilidade: "Bruno Castilho",
    dataInicio: "01/10/2026",
    dataFim: "31/12/2026",
    status: "aguardando_aprovacao",
    responsavelCriacao: "Renata Salgado",
    responsavelAprovacao: null,
    dataAprovacao: null,
    observacoes: "Excepcionalidade sujeita à aprovação da diretoria por se tratar de condição fora da política padrão.",
    regras: [
      { ...novaRegraVazia(), id: "r12", tipoId: "percentual_volume", percentual: 1.1, baseCalculo: "Volume originado", observacao: "Percentual acima do padrão para compensar a transição da rede." },
      { ...novaRegraVazia(), id: "r13", tipoId: "ajuda_custo_fixa", valorFixo: 800, periodicidade: "Mensal", observacao: "Durante o período de transição da rede." },
    ],
  },
];

const USUARIOS_DEMO = [
  { id: "u1", nome: "Fernanda Lopes", perfil: "administrador", cargo: "Administradora da plataforma" },
  { id: "u2", nome: "Marcos Teixeira", perfil: "diretoria", cargo: "Diretor Comercial" },
  { id: "u3", nome: "Renata Salgado", perfil: "gestor", cargo: "Gestora Comercial", gestorId: "g1" },
  { id: "u4", nome: "Paula Menezes", perfil: "financeiro", cargo: "Analista Financeira" },
  { id: "u5", nome: "Bruno Castilho", perfil: "representante", cargo: "Representante Comercial", representanteId: "rep1" },
];

const PERFIL_LABEL = {
  administrador: "Administrador",
  diretoria: "Diretoria",
  gestor: "Gestor comercial",
  financeiro: "Financeiro",
  representante: "Representante",
};

/* ============================================================================
   TOKENS VISUAIS
============================================================================ */

const COLORS = {
  ink: "#141D2E",
  inkSoft: "#00223F",
  bg: "#F4F5F7",
  surface: "#FFFFFF",
  primary: "#003060",
  primaryDeep: "#00223F",
  border: "#DADADA",
  text: "#1F2733",
  muted: "#5B6472",
  emerald: "#15803D",
  amber: "#B45309",
  rose: "#B91C1C",
};

const STATUS_STYLES = {
  ativo: { bg: "#E9F7EF", fg: COLORS.emerald, label: "Ativo" },
  ativa: { bg: "#E9F7EF", fg: COLORS.emerald, label: "Ativa" },
  em_analise: { bg: "#FEF3C7", fg: COLORS.amber, label: "Em análise" },
  credenciada: { bg: "#FEF3C7", fg: COLORS.amber, label: "Credenciada" },
  em_implantacao: { bg: "#E7EEFB", fg: COLORS.primaryDeep, label: "Em implantação" },
  prospect: { bg: "#F4F5F7", fg: COLORS.muted, label: "Prospect" },
  suspenso: { bg: "#FDECEC", fg: COLORS.rose, label: "Suspenso" },
  suspensa: { bg: "#FDECEC", fg: COLORS.rose, label: "Suspensa" },
  inativa: { bg: "#F4F5F7", fg: "#69707D", label: "Inativa" },
  encerrado: { bg: "#F4F5F7", fg: "#69707D", label: "Encerrado" },
  encerrada: { bg: "#F4F5F7", fg: "#69707D", label: "Encerrada" },
};

function StatusBadge({ status, styles }) {
  const map = styles || STATUS_STYLES;
  const s = map[status] || { bg: "var(--wiwap-bg-rebaixado)", fg: "var(--wiwap-texto-2)", label: status };
  return (
    <span
      style={{ background: s.bg, color: s.fg }}
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-medium"
    >
      <CircleDot size={9} strokeWidth={3} />
      {s.label}
    </span>
  );
}

function fmtBRL(v) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

/* ============================================================================
   LOGIN (MOCK)
============================================================================ */

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [entrando, setEntrando] = useState(false);

  const entrar = async (e) => {
    e.preventDefault();
    setErro("");
    setEntrando(true);
    try {
      const api = criarApi(null);
      const { token, usuario } = await api.login(email.trim(), senha);
      onLogin({ ...usuario, token });
    } catch (err) {
      setErro(err.message === "Failed to fetch"
        ? "Não foi possível conectar ao servidor. Confira se o backend está no ar."
        : err.message || "Não foi possível entrar.");
    } finally {
      setEntrando(false);
    }
  };

  return (
    <div style={{ background: COLORS.ink }} className="min-h-screen w-full flex items-center justify-center px-4 py-4">
      <div className="w-full max-w-[920px] grid md:grid-cols-[1.1fr_1fr] rounded-2xl overflow-hidden shadow-2xl">
        <div style={{ background: `linear-gradient(155deg, ${COLORS.ink}, #0A3A6B)` }} className="p-6 sm:p-10 flex flex-col justify-between text-white md:min-h-[420px]">
          <div>
            <div className="flex items-center gap-2 mb-8 md:mb-14">
              <BrandLogo variante="horizontal-negativo" altura={32} />
              <span className="sr-only">Wiwap Parceiros</span>
            </div>
            <h1 className="text-[32px] leading-[1.15] font-semibold tracking-tight max-w-[340px]">
              Gestão comercial e comissionamento da rede de representantes
            </h1>
            <p className="text-white/60 text-[14.5px] mt-4 max-w-[320px] leading-relaxed">
              Condições comerciais, carteiras de lojas, simulação de comissão e fechamento mensal em um único lugar.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:gap-6 mt-6 text-[13px] text-white/70">
            <span>Dados reais, persistidos</span>
            <span>PostgreSQL</span>
          </div>
        </div>
        <div style={{ background: COLORS.surface }} className="p-6 sm:p-10 flex flex-col justify-center">
          <h2 style={{ color: COLORS.text }} className="text-[19px] font-semibold mb-1">Entrar</h2>
          <p style={{ color: COLORS.muted }} className="text-[13.5px] mb-6">Use seu e-mail e senha cadastrados na plataforma.</p>
          <form onSubmit={entrar} className="flex flex-col gap-3.5">
            <div>
              <label style={{ color: COLORS.muted }} className="text-[11.5px] font-medium">E-mail</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@wiwap.com"
                style={{ borderColor: COLORS.border }}
                className="w-full border rounded-lg px-3 py-2.5 text-[13.5px] outline-none mt-1"
              />
            </div>
            <div>
              <label style={{ color: COLORS.muted }} className="text-[11.5px] font-medium">Senha</label>
              <input
                type="password" required value={senha} onChange={(e) => setSenha(e.target.value)}
                style={{ borderColor: COLORS.border }}
                className="w-full border rounded-lg px-3 py-2.5 text-[13.5px] outline-none mt-1"
              />
            </div>
            {erro && (
              <div style={{ background: "#FDECEC", color: COLORS.rose }} className="text-[12.5px] rounded-lg px-3 py-2.5">{erro}</div>
            )}
            <button
              type="submit" disabled={entrando}
              style={{ background: entrando ? "#7BA0CF" : COLORS.primary }}
              className="text-white text-[13.5px] font-semibold px-4 py-2.5 rounded-lg mt-1"
            >
              {entrando ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   SHELL: SIDEBAR + TOPBAR
============================================================================ */

const MENU = [
  { key: "dashboard_comercial", label: "Dashboard comercial", icon: LayoutGrid, perfis: "all" },
  { key: "visao_geral", label: "Visão geral", icon: LayoutGrid, perfis: "all" },
  { key: "representantes", label: "Representantes", icon: Users, perfis: ["administrador", "diretoria", "gestor", "financeiro"] },
  { key: "carteira", label: "Carteira de lojas", icon: Store, perfis: ["administrador", "diretoria", "gestor", "financeiro"] },
  { key: "vendas", label: "Vendas", icon: ShoppingCart, perfis: "all" },
  { key: "condicoes", label: "Condições comerciais", icon: FileSliders, perfis: ["administrador", "diretoria", "gestor", "financeiro"] },
  { key: "simulador", label: "Simulador", icon: Calculator, perfis: ["administrador", "diretoria", "gestor", "financeiro"] },
  { key: "metas", label: "Metas e campanhas", icon: Target, perfis: "all" },
  { key: "comissoes", label: "Comissões", icon: Wallet, perfis: "all" },
  { key: "fechamentos", label: "Fechamentos", icon: ClipboardCheck, perfis: "all" },
  { key: "aprovacoes", label: "Aprovações", icon: CheckSquare, perfis: ["administrador", "diretoria", "gestor", "financeiro"] },
  { key: "pagamentos", label: "Pagamentos", icon: Banknote, perfis: ["administrador", "diretoria", "financeiro"] },
  { key: "relatorios", label: "Relatórios", icon: BarChart3, perfis: ["administrador", "diretoria", "gestor", "financeiro"] },
  { key: "configuracoes", label: "Configurações", icon: Settings, perfis: ["administrador", "diretoria"] },
  { key: "auditoria", label: "Auditoria", icon: ShieldCheck, perfis: ["administrador", "diretoria"] },
];

function Sidebar({ current, setCurrent, user, onLogout }) {
  const items = MENU.filter((m) => m.perfis === "all" || !m.perfis || m.perfis.includes(user.perfil));
  return (
    <aside style={{ background: COLORS.ink }} className="w-[240px] shrink-0 hidden lg:flex flex-col h-screen sticky top-0 text-white">
      <div className="flex items-center gap-2 px-5 h-16 shrink-0">
        <BrandLogo variante="horizontal-negativo" altura={30} />
        <span className="sr-only">Wiwap Parceiros</span>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-0.5">
        {items.map((m) => {
          const Icon = m.icon;
          const active = current === m.key;
          return (
            <button
              key={m.key}
              disabled={m.soon}
              onClick={() => setCurrent(m.key)}
              style={active ? { background: COLORS.primary } : {}}
              className={`flex items-center justify-between gap-2.5 rounded-lg px-3 py-2.5 text-[13.5px] transition-colors ${
                active ? "text-white" : m.soon ? "text-white/25 cursor-not-allowed" : "text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon size={16.5} strokeWidth={2} />
                {m.label}
              </span>
              {m.soon && <span className="text-[10px] border border-white/15 rounded px-1.5 py-0.5">em breve</span>}
            </button>
          );
        })}
      </nav>
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div style={{ background: COLORS.primaryDeep }} className="h-8 w-8 rounded-full flex items-center justify-center text-[12px] font-semibold">
            {user.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium truncate">{user.nome}</div>
            <div className="text-[11.5px] text-white/45 truncate">{PERFIL_LABEL[user.perfil]}</div>
          </div>
          <button onClick={onLogout} title="Sair" className="text-white/40 hover:text-white p-1.5 rounded-md hover:bg-white/10">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ title, subtitle, user, representantes, lojas, onAbrirRepresentante, onAbrirLoja }) {
  const [busca, setBusca] = useState("");
  const termo = busca.trim().toLowerCase();
  const repsEncontrados = termo ? representantes.filter((r) => r.nomeCompleto.toLowerCase().includes(termo) || r.nomeEmpresarial.toLowerCase().includes(termo)).slice(0, 4) : [];
  const lojasEncontradas = termo ? lojas.filter((l) => l.nomeFantasia.toLowerCase().includes(termo) || l.codigo.toLowerCase().includes(termo)).slice(0, 4) : [];
  const mostrarResultados = termo.length > 0 && (repsEncontrados.length > 0 || lojasEncontradas.length > 0);
  const semResultado = termo.length > 0 && repsEncontrados.length === 0 && lojasEncontradas.length === 0;

  return (
    <header style={{ borderColor: COLORS.border }} className="min-h-16 shrink-0 border-b flex items-center justify-between gap-6 px-4 sm:px-6 py-3 bg-white/70 backdrop-blur sticky top-0 z-10">
      <div className="lg:hidden shrink-0">
        <BrandLogo variante="simbolo" />
      </div>
      <div className="flex-1 min-w-0">
        <h1 style={{ color: COLORS.text }} className="text-[17px] font-semibold leading-none">{title}</h1>
        {subtitle && <p style={{ color: COLORS.muted }} className="text-[12.5px] mt-1">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <div style={{ borderColor: COLORS.border, background: COLORS.bg }} className="flex items-center gap-2 border rounded-lg px-3 py-2 w-[240px]">
            <Search size={15} style={{ color: COLORS.muted }} />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar representante, loja..."
              className="bg-transparent outline-none text-[13px] w-full placeholder:text-[#69707D]"
            />
            {busca && <button onClick={() => setBusca("")} style={{ color: COLORS.muted }}><X size={13} /></button>}
          </div>
          {(mostrarResultados || semResultado) && (
            <div style={{ borderColor: COLORS.border, background: COLORS.surface }} className="absolute right-0 top-[calc(100%+6px)] w-[300px] border rounded-xl shadow-xl overflow-hidden z-20">
              {repsEncontrados.length > 0 && (
                <div>
                  <div style={{ color: COLORS.muted }} className="text-[10.5px] font-medium px-3 pt-2.5">REPRESENTANTES</div>
                  {repsEncontrados.map((r) => (
                    <button key={r.id} onClick={() => { onAbrirRepresentante(r); setBusca(""); }} className="w-full text-left px-3 py-2 hover:bg-[#FCFCFC] flex items-center gap-2">
                      <Users size={13} style={{ color: COLORS.muted }} />
                      <span style={{ color: COLORS.text }} className="text-[12.5px]">{r.nomeCompleto}</span>
                    </button>
                  ))}
                </div>
              )}
              {lojasEncontradas.length > 0 && (
                <div>
                  <div style={{ color: COLORS.muted }} className="text-[10.5px] font-medium px-3 pt-2.5">LOJAS</div>
                  {lojasEncontradas.map((l) => (
                    <button key={l.id} onClick={() => { onAbrirLoja(l); setBusca(""); }} className="w-full text-left px-3 py-2 hover:bg-[#FCFCFC] flex items-center gap-2">
                      <Store size={13} style={{ color: COLORS.muted }} />
                      <span style={{ color: COLORS.text }} className="text-[12.5px]">{l.nomeFantasia}</span>
                      <span style={{ color: COLORS.muted }} className="text-[11px]">{l.codigo}</span>
                    </button>
                  ))}
                </div>
              )}
              {semResultado && <div style={{ color: COLORS.muted }} className="text-[12px] px-3 py-3">Nenhum resultado para "{busca}".</div>}
            </div>
          )}
        </div>
        <div style={{ background: "#E7EEFB", color: COLORS.primaryDeep }} className="text-[12px] font-medium px-2.5 py-1.5 rounded-md hidden sm:block">
          {PERFIL_LABEL[user.perfil]}
        </div>
      </div>
    </header>
  );
}

/* ============================================================================
   VISÃO GERAL
============================================================================ */

function KpiCard({ label, value, delta, deltaGood = true, icon: Icon }) {
  return (
    <div style={{ borderColor: COLORS.border, background: COLORS.surface }} className="border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2.5">
        <span style={{ color: COLORS.muted }} className="text-[12.5px]">{label}</span>
        {Icon && <Icon size={15} style={{ color: COLORS.muted }} />}
      </div>
      <div style={{ color: COLORS.text }} className="text-[22px] font-semibold tracking-tight">{value}</div>
      {delta && (
        <div style={{ color: deltaGood ? COLORS.emerald : COLORS.rose }} className="flex items-center gap-1 text-[12px] mt-1.5 font-medium">
          <ArrowUpRight size={13} />
          {delta}
        </div>
      )}
    </div>
  );
}

function VisaoGeralView({ representantes, lojas, user }) {
  const isRep = user.perfil === "representante";
  const meusDados = isRep
    ? { representantes: representantes.filter((r) => r.id === user.representanteId), lojas: lojas.filter((l) => l.representanteAtualId === user.representanteId) }
    : { representantes, lojas };

  const ativos = meusDados.representantes.filter((r) => r.status === "ativo").length;
  const lojasAtivas = meusDados.lojas.filter((l) => l.status === "ativa").length;
  const ranking = [...representantes]
    .map((r) => {
      const ls = lojas.filter((l) => l.representanteAtualId === r.id);
      return { ...r, receita: ls.reduce((a, l) => a + l.receitaGerada, 0), lojasAtivas: ls.filter((l) => l.status === "ativa").length };
    })
    .sort((a, b) => b.receita - a.receita);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label={isRep ? "Minhas lojas ativas" : "Representantes ativos"} value={isRep ? lojasAtivas : ativos} icon={isRep ? Store : Users} />
        {!isRep && <KpiCard label="Lojas ativas" value={lojasAtivas} icon={Store} />}
        <KpiCard label="Volume originado" value="Importação pendente" icon={TrendingUp} />
        <KpiCard label="Comissão projetada" value="Apuração pendente" icon={Wallet} />
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        <div style={{ borderColor: COLORS.border, background: COLORS.surface }} className="border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ color: COLORS.text }} className="text-[14px] font-semibold">Evolução do volume originado</h3>
            <span style={{ color: COLORS.muted }} className="text-[12px]">Últimos 6 meses</span>
          </div>
          <p style={{ color: COLORS.muted }} className="text-[13px]">
            Importação pendente. Consulte o Dashboard comercial para acompanhar a disponibilidade dos dados.
          </p>
        </div>

        {!isRep && (
          <div style={{ borderColor: COLORS.border, background: COLORS.surface }} className="border rounded-xl p-5">
            <h3 style={{ color: COLORS.text }} className="text-[14px] font-semibold mb-4">Ranking de representantes</h3>
            <div className="flex flex-col gap-3">
              {ranking.map((r, i) => (
                <div key={r.id} className="flex items-center gap-3">
                  <span style={{ color: COLORS.muted }} className="text-[12px] w-4">{i + 1}</span>
                  <div style={{ background: "#E7EEFB", color: COLORS.primaryDeep }} className="h-8 w-8 rounded-full flex items-center justify-center text-[11.5px] font-semibold shrink-0">
                    {r.nomeCompleto.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div style={{ color: COLORS.text }} className="text-[13px] font-medium truncate">{r.nomeCompleto}</div>
                    <div style={{ color: COLORS.muted }} className="text-[11.5px]">{r.lojasAtivas} lojas ativas</div>
                  </div>
                  <div style={{ color: COLORS.text }} className="text-[12.5px] font-semibold">{fmtBRL(r.receita)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
   REPRESENTANTES
============================================================================ */

function NovoRepresentanteModal({ parametros, onClose, onCriar }) {
  const [dados, setDados] = useState({
    nomeCompleto: "", nomeEmpresarial: "", tipoPessoa: "PJ", cpf: "", cnpj: "",
    email: "", telefone: "", endereco: "", cidade: "", estado: "SP", regiao: "Sudeste",
    gestorId: GESTORES[0]?.id || "",
  });
  const set = (campo) => (valor) => setDados((d) => ({ ...d, [campo]: valor }));
  const estadosDisponiveis = Object.entries(ESTADOS_POR_REGIAO).flatMap(([regiao, estados]) => estados.map((e) => ({ e, regiao })));
  const podeSalvar = dados.nomeCompleto && dados.email && dados.cidade;

  const salvar = () => {
    onCriar({
      nomeCompleto: dados.nomeCompleto,
      nomeEmpresarial: dados.nomeEmpresarial || dados.nomeCompleto,
      cpf: dados.cpf, cnpj: dados.cnpj, tipoPessoa: dados.tipoPessoa,
      email: dados.email, telefone: dados.telefone,
      endereco: dados.endereco, cidade: dados.cidade, estado: dados.estado, regiao: dados.regiao,
      gestorId: dados.gestorId, diaPagamento: parametros?.diaPagamentoPadrao ?? 10,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[#141D2E]/40" onClick={onClose} />
      <div style={{ background: COLORS.surface }} className="relative w-full max-w-[480px] max-h-[88vh] overflow-y-auto rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ color: COLORS.text }} className="text-[16px] font-semibold">Novo representante</h3>
          <button onClick={onClose} style={{ color: COLORS.muted }}><X size={18} /></button>
        </div>
        <div className="flex flex-col gap-3.5">
          <CampoTexto label="Nome completo" value={dados.nomeCompleto} onChange={set("nomeCompleto")} placeholder="Ex.: Ana Beatriz Ramos" />
          <CampoTexto label="Nome empresarial" value={dados.nomeEmpresarial} onChange={set("nomeEmpresarial")} placeholder="Se pessoa jurídica" />
          <div className="grid grid-cols-2 gap-3">
            <CampoSelect label="Tipo de pessoa" value={dados.tipoPessoa} onChange={set("tipoPessoa")} options={["PJ", "PF"]} />
            <CampoTexto label={dados.tipoPessoa === "PJ" ? "CNPJ" : "CPF"} value={dados.tipoPessoa === "PJ" ? dados.cnpj : dados.cpf} onChange={set(dados.tipoPessoa === "PJ" ? "cnpj" : "cpf")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <CampoTexto label="E-mail" type="email" value={dados.email} onChange={set("email")} />
            <CampoTexto label="Telefone" value={dados.telefone} onChange={set("telefone")} placeholder="(00) 00000-0000" />
          </div>
          <CampoTexto label="Endereço" value={dados.endereco} onChange={set("endereco")} />
          <div className="grid grid-cols-2 gap-3">
            <CampoTexto label="Cidade" value={dados.cidade} onChange={set("cidade")} />
            <div>
              <label style={{ color: COLORS.muted }} className="text-[11.5px] font-medium">Estado</label>
              <select
                value={dados.estado}
                onChange={(e) => {
                  const uf = e.target.value;
                  const regiao = estadosDisponiveis.find((x) => x.e === uf)?.regiao || dados.regiao;
                  setDados((d) => ({ ...d, estado: uf, regiao }));
                }}
                style={{ borderColor: COLORS.border }}
                className="w-full border rounded-lg px-3 py-2 text-[13px] outline-none mt-1"
              >
                {estadosDisponiveis.map(({ e }) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ color: COLORS.muted }} className="text-[11.5px] font-medium">Gestor responsável</label>
            <select value={dados.gestorId} onChange={(e) => set("gestorId")(e.target.value)} style={{ borderColor: COLORS.border }} className="w-full border rounded-lg px-3 py-2 text-[13px] outline-none mt-1">
              {GESTORES.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} style={{ color: COLORS.text }} className="text-[13px] font-medium px-3.5 py-2">Cancelar</button>
          <button disabled={!podeSalvar} onClick={salvar} style={{ background: podeSalvar ? COLORS.primary : "#ADC6E7" }} className="text-white text-[13px] font-medium px-4 py-2 rounded-lg">Cadastrar representante</button>
        </div>
      </div>
    </div>
  );
}

function RepresentantesView({ representantes, lojas, onSelect, onCriar, parametros }) {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [criando, setCriando] = useState(false);

  const filtrados = representantes.filter((r) => {
    const okBusca = r.nomeCompleto.toLowerCase().includes(busca.toLowerCase()) || r.nomeEmpresarial.toLowerCase().includes(busca.toLowerCase());
    const okStatus = filtroStatus === "todos" || r.status === filtroStatus;
    return okBusca && okStatus;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div style={{ borderColor: COLORS.border, background: COLORS.surface }} className="flex items-center gap-2 border rounded-lg px-3 py-2 w-[260px] max-w-full">
            <Search size={14} style={{ color: COLORS.muted }} />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome" className="bg-transparent outline-none text-[13px] w-full" />
          </div>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            style={{ borderColor: COLORS.border, background: COLORS.surface, color: COLORS.text }}
            className="border rounded-lg px-3 py-2 text-[13px] outline-none"
          >
            <option value="todos">Todos os status</option>
            {STATUS_REPRESENTANTE.map((s) => <option key={s} value={s}>{STATUS_STYLES[s]?.label || s}</option>)}
          </select>
        </div>
        <button onClick={() => setCriando(true)} style={{ background: COLORS.primary }} className="flex items-center gap-1.5 text-white text-[13px] font-medium px-3.5 py-2 rounded-lg hover:opacity-90">
          <Plus size={15} /> Novo representante
        </button>
      </div>

      <div style={{ borderColor: COLORS.border, background: COLORS.surface }} className="border rounded-xl overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ borderColor: COLORS.border, color: COLORS.muted }} className="border-b text-left">
              <th className="font-medium px-4 py-3">Representante</th>
              <th className="font-medium px-4 py-3">Região</th>
              <th className="font-medium px-4 py-3">Gestor</th>
              <th className="font-medium px-4 py-3">Lojas</th>
              <th className="font-medium px-4 py-3">Status</th>
              <th className="font-medium px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((r) => {
              const qtdLojas = lojas.filter((l) => l.representanteAtualId === r.id).length;
              const gestor = GESTORES.find((g) => g.id === r.gestorId);
              return (
                <tr key={r.id} style={{ borderColor: COLORS.border }} className="border-b last:border-0 hover:bg-[#FCFCFC] cursor-pointer" onClick={() => onSelect(r)}>
                  <td className="px-4 py-3">
                    <div style={{ color: COLORS.text }} className="font-medium">{r.nomeCompleto}</div>
                    <div style={{ color: COLORS.muted }} className="text-[12px]">{r.nomeEmpresarial}</div>
                  </td>
                  <td className="px-4 py-3" style={{ color: COLORS.text }}>{r.cidade}/{r.estado}</td>
                  <td className="px-4 py-3" style={{ color: COLORS.text }}>{gestor?.nome}</td>
                  <td className="px-4 py-3" style={{ color: COLORS.text }}>{qtdLojas}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-right"><ChevronRight size={16} style={{ color: COLORS.muted }} /></td>
                </tr>
              );
            })}
            {filtrados.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center" style={{ color: COLORS.muted }}>Nenhum representante encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {criando && <NovoRepresentanteModal parametros={parametros} onClose={() => setCriando(false)} onCriar={(dados) => onCriar?.(dados)} />}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5 py-2">
      <Icon size={15} style={{ color: COLORS.muted }} className="mt-0.5 shrink-0" />
      <div>
        <div style={{ color: COLORS.muted }} className="text-[11.5px]">{label}</div>
        <div style={{ color: COLORS.text }} className="text-[13.5px] font-medium">{value || "—"}</div>
      </div>
    </div>
  );
}

function CampoInfoEditavel({ icon: Icon, label, value, editando, onChange, tipo = "text" }) {
  return (
    <div className="flex items-start gap-2.5 py-2">
      <Icon size={15} style={{ color: COLORS.muted }} className="mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div style={{ color: COLORS.muted }} className="text-[11.5px]">{label}</div>
        {editando ? (
          <input
            type={tipo}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            style={{ borderColor: COLORS.border }}
            className="w-full border rounded-md px-2 py-1 text-[13px] mt-0.5 outline-none"
          />
        ) : (
          <div style={{ color: COLORS.text }} className="text-[13.5px] font-medium">{value || "—"}</div>
        )}
      </div>
    </div>
  );
}

const PROXIMO_STATUS_REPRESENTANTE = {
  em_analise: [{ status: "ativo", label: "Aprovar representante", cor: "emerald" }],
  ativo: [{ status: "suspenso", label: "Suspender", cor: "amber" }, { status: "encerrado", label: "Encerrar", cor: "rose" }],
  suspenso: [{ status: "ativo", label: "Reativar", cor: "emerald" }, { status: "encerrado", label: "Encerrar", cor: "rose" }],
  encerrado: [],
};

function RepresentanteDrawer({ representante, lojas, onClose, onAtualizar, api, recarregar, user, registrarLog }) {
  const [tab, setTab] = useState("cadastro");
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState(representante);
  if (!representante) return null;
  const podeEditar = ["administrador", "gestor"].includes(user.perfil);
  const gestor = GESTORES.find((g) => g.id === rascunho.gestorId);
  const minhasLojas = lojas.filter((l) => l.representanteAtualId === representante.id);
  const tabs = [
    { key: "cadastro", label: "Dados cadastrais" },
    { key: "financeiro", label: "Dados financeiros" },
    { key: "documentos", label: "Documentação" },
    { key: "carteira", label: `Carteira (${minhasLojas.length})` },
  ];

  const iniciarEdicao = () => { setRascunho(representante); setEditando(true); };
  const cancelarEdicao = () => { setRascunho(representante); setEditando(false); };
  const salvarEdicao = async () => {
    await onAtualizar({
      id: representante.id,
      cpf: rascunho.cpf, cnpj: rascunho.cnpj, email: rascunho.email, telefone: rascunho.telefone,
      endereco: rascunho.endereco, cidade: rascunho.cidade,
      banco: rascunho.banco, agencia: rascunho.agencia, conta: rascunho.conta, pix: rascunho.pix,
      diaPagamento: rascunho.diaPagamento ? Number(rascunho.diaPagamento) : undefined,
    });
    registrarLog?.("Edição", representante.nomeCompleto, "Dados cadastrais ou financeiros atualizados");
    setEditando(false);
  };
  const set = (campo) => (valor) => setRascunho((r) => ({ ...r, [campo]: valor }));

  const mudarStatus = async (novoStatus) => {
    await onAtualizar({ id: representante.id, status: novoStatus });
    setRascunho((r) => ({ ...r, status: novoStatus }));
    registrarLog?.("Mudança de status", representante.nomeCompleto, `${STATUS_STYLES[representante.status]?.label} → ${STATUS_STYLES[novoStatus]?.label}`);
  };

  const anexarDocumento = async (idx) => {
    const documento = representante.documentos[idx];
    await api.anexarDocumento(representante.id, documento.id);
    registrarLog?.("Envio de documento", representante.nomeCompleto, `${documento.tipo} anexado`);
    await recarregar();
  };

  return (
    <div className="fixed inset-0 z-30 flex justify-end">
      <div className="absolute inset-0 bg-[#141D2E]/30" onClick={onClose} />
      <div style={{ background: COLORS.surface }} className="relative w-full max-w-[480px] h-full overflow-y-auto shadow-2xl flex flex-col">
        <div style={{ borderColor: COLORS.border }} className="border-b px-6 py-5 flex items-start justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 style={{ color: COLORS.text }} className="text-[17px] font-semibold">{representante.nomeCompleto}</h2>
            <p style={{ color: COLORS.muted }} className="text-[12.5px] mt-0.5">{representante.nomeEmpresarial}</p>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <StatusBadge status={representante.status} />
              {podeEditar && PROXIMO_STATUS_REPRESENTANTE[representante.status]?.map((op) => (
                <button
                  key={op.status}
                  onClick={() => mudarStatus(op.status)}
                  style={{ borderColor: COLORS.border, color: op.cor === "emerald" ? COLORS.emerald : op.cor === "rose" ? COLORS.rose : COLORS.amber }}
                  className="border text-[11px] font-medium px-2 py-1 rounded-md"
                >
                  {op.label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={onClose} style={{ color: COLORS.muted }} className="p-1.5 hover:bg-[#141D2E]/5 rounded-md"><X size={18} /></button>
        </div>

        <div style={{ borderColor: COLORS.border }} className="border-b flex items-center justify-between px-6">
          <div className="flex gap-4">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={tab === t.key ? { borderColor: COLORS.primary, color: COLORS.primaryDeep } : { borderColor: "transparent", color: COLORS.muted }}
                className="text-[12.5px] font-medium py-3 border-b-2"
              >
                {t.label}
              </button>
            ))}
          </div>
          {podeEditar && (tab === "cadastro" || tab === "financeiro") && (
            editando ? (
              <div className="flex items-center gap-2 py-2">
                <button onClick={cancelarEdicao} style={{ color: COLORS.muted }} className="text-[12px] font-medium">Cancelar</button>
                <button onClick={salvarEdicao} style={{ background: COLORS.primary }} className="text-white text-[12px] font-medium px-3 py-1.5 rounded-md">Salvar</button>
              </div>
            ) : (
              <button onClick={iniciarEdicao} style={{ color: COLORS.primaryDeep }} className="flex items-center gap-1 text-[12px] font-medium py-2"><PenLine size={13} /> Editar</button>
            )
          )}
        </div>

        <div className="p-6">
          {tab === "cadastro" && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              <InfoRow icon={Users} label="Tipo de pessoa" value={representante.tipoPessoa} />
              <CampoInfoEditavel icon={FileText} label={representante.tipoPessoa === "PJ" ? "CNPJ" : "CPF"} value={representante.tipoPessoa === "PJ" ? rascunho.cnpj : rascunho.cpf} editando={editando} onChange={set(representante.tipoPessoa === "PJ" ? "cnpj" : "cpf")} />
              <CampoInfoEditavel icon={Mail} label="E-mail" value={rascunho.email} editando={editando} onChange={set("email")} tipo="email" />
              <CampoInfoEditavel icon={Phone} label="Telefone" value={rascunho.telefone} editando={editando} onChange={set("telefone")} />
              <CampoInfoEditavel icon={MapPin} label="Endereço" value={rascunho.endereco} editando={editando} onChange={set("endereco")} />
              <CampoInfoEditavel icon={MapPin} label="Cidade" value={rascunho.cidade} editando={editando} onChange={set("cidade")} />
              <InfoRow icon={MapPin} label="Estado" value={representante.estado} />
              <InfoRow icon={MapPin} label="Região de atuação" value={representante.regiao} />
              <InfoRow icon={Users} label="Gestor responsável" value={gestor?.nome} />
              <InfoRow icon={Clock} label="Data de início" value={representante.dataInicio} />
              <InfoRow icon={Clock} label="Data de encerramento" value={representante.dataEncerramento} />
            </div>
          )}
          {tab === "financeiro" && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              <CampoInfoEditavel icon={Banknote} label="Banco" value={rascunho.banco} editando={editando} onChange={set("banco")} />
              <CampoInfoEditavel icon={CreditCard} label="Agência" value={rascunho.agencia} editando={editando} onChange={set("agencia")} />
              <CampoInfoEditavel icon={CreditCard} label="Conta" value={rascunho.conta} editando={editando} onChange={set("conta")} />
              <CampoInfoEditavel icon={CreditCard} label="Chave Pix" value={rascunho.pix} editando={editando} onChange={set("pix")} />
              <InfoRow icon={Wallet} label="Forma de pagamento" value={representante.formaPagamento} />
              <CampoInfoEditavel icon={Clock} label="Dia previsto de pagamento" tipo="number" value={rascunho.diaPagamento} editando={editando} onChange={set("diaPagamento")} />
              <InfoRow icon={FileText} label="Emissão de nota fiscal" value={representante.notaFiscal ? "Necessária" : "Não necessária"} />
            </div>
          )}
          {tab === "documentos" && (
            <div className="flex flex-col gap-2">
              {representante.documentos.map((d, i) => (
                <div key={i} style={{ borderColor: COLORS.border }} className="flex items-center justify-between border rounded-lg px-3.5 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <FileText size={16} style={{ color: COLORS.muted }} />
                    <div>
                      <div style={{ color: COLORS.text }} className="text-[13px] font-medium">{d.tipo}</div>
                      <div style={{ color: COLORS.muted }} className="text-[11.5px]">Validade: {d.validade}</div>
                    </div>
                  </div>
                  {d.status === "válido" ? (
                    <span style={{ color: COLORS.emerald }} className="text-[12px] font-medium">Válido</span>
                  ) : podeEditar ? (
                    <label style={{ borderColor: COLORS.border, color: COLORS.primaryDeep }} className="border text-[11.5px] font-medium px-2.5 py-1.5 rounded-md cursor-pointer flex items-center gap-1.5">
                      <Paperclip size={12} /> Anexar
                      <input type="file" className="hidden" onChange={() => anexarDocumento(i)} />
                    </label>
                  ) : (
                    <span style={{ color: COLORS.rose }} className="flex items-center gap-1 text-[12px] font-medium">
                      <AlertTriangle size={13} /> {d.status === "pendente" ? "Pendente" : "Vencido"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          {tab === "carteira" && (
            <div className="flex flex-col gap-2">
              {minhasLojas.map((l) => (
                <div key={l.id} style={{ borderColor: COLORS.border }} className="flex items-center justify-between border rounded-lg px-3.5 py-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Building2 size={16} style={{ color: COLORS.muted }} className="shrink-0" />
                    <div className="min-w-0">
                      <div style={{ color: COLORS.text }} className="text-[13px] font-medium truncate">{l.nomeFantasia}</div>
                      <div style={{ color: COLORS.muted }} className="text-[11.5px]">{l.codigo} · {l.cidade}/{l.estado}</div>
                    </div>
                  </div>
                  <StatusBadge status={l.status} />
                </div>
              ))}
              {minhasLojas.length === 0 && <p style={{ color: COLORS.muted }} className="text-[13px]">Nenhuma loja vinculada.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   CARTEIRA DE LOJAS
============================================================================ */

function TransferirLojaModal({ loja, representantes, onClose, onConfirm }) {
  const [novoRepId, setNovoRepId] = useState("");
  const [dataEfetiva, setDataEfetiva] = useState("");
  const [motivo, setMotivo] = useState("");
  const atual = representantes.find((r) => r.id === loja.representanteAtualId);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[#141D2E]/40" onClick={onClose} />
      <div style={{ background: COLORS.surface }} className="relative w-full max-w-[440px] rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 style={{ color: COLORS.text }} className="text-[16px] font-semibold flex items-center gap-2">
            <ArrowRightLeft size={17} /> Transferir loja
          </h3>
          <button onClick={onClose} style={{ color: COLORS.muted }}><X size={18} /></button>
        </div>
        <p style={{ color: COLORS.muted }} className="text-[12.5px] mb-5">{loja.nomeFantasia} · atualmente com {atual?.nomeCompleto}</p>

        <label style={{ color: COLORS.muted }} className="text-[12px] font-medium">Novo representante</label>
        <select
          value={novoRepId}
          onChange={(e) => setNovoRepId(e.target.value)}
          style={{ borderColor: COLORS.border }}
          className="w-full border rounded-lg px-3 py-2 text-[13px] mt-1 mb-3 outline-none"
        >
          <option value="">Selecione...</option>
          {representantes.filter((r) => r.id !== loja.representanteAtualId).map((r) => (
            <option key={r.id} value={r.id}>{r.nomeCompleto}</option>
          ))}
        </select>

        <label style={{ color: COLORS.muted }} className="text-[12px] font-medium">Comissão pertence ao novo representante a partir de</label>
        <input
          type="date"
          value={dataEfetiva}
          onChange={(e) => setDataEfetiva(e.target.value)}
          style={{ borderColor: COLORS.border }}
          className="w-full border rounded-lg px-3 py-2 text-[13px] mt-1 mb-3 outline-none"
        />

        <label style={{ color: COLORS.muted }} className="text-[12px] font-medium">Motivo da transferência</label>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={2}
          style={{ borderColor: COLORS.border }}
          className="w-full border rounded-lg px-3 py-2 text-[13px] mt-1 mb-4 outline-none resize-none"
          placeholder="Ex.: reorganização de carteira por região"
        />

        <div style={{ background: "#F4F5F7", color: COLORS.muted }} className="text-[11.5px] rounded-lg px-3 py-2.5 mb-5">
          O histórico anterior é mantido — esta ação cria um novo registro de vínculo, sem apagar os anteriores.
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} style={{ color: COLORS.text }} className="text-[13px] font-medium px-3.5 py-2">Cancelar</button>
          <button
            disabled={!novoRepId || !dataEfetiva}
            onClick={() => onConfirm({ novoRepId, dataEfetiva, motivo })}
            style={{ background: novoRepId && dataEfetiva ? COLORS.primary : "#ADC6E7" }}
            className="text-white text-[13px] font-medium px-4 py-2 rounded-lg"
          >
            Confirmar transferência
          </button>
        </div>
      </div>
    </div>
  );
}

function NovaLojaModal({ representantes, onClose, onCriar }) {
  const [dados, setDados] = useState({
    nomeFantasia: "", razaoSocial: "", cnpj: "", redeId: REDES[0]?.id || "",
    cidade: "", estado: "SP", representanteAtualId: representantes[0]?.id || "",
    status: "credenciada",
  });
  const set = (campo) => (valor) => setDados((d) => ({ ...d, [campo]: valor }));
  const estadosDisponiveis = Object.entries(ESTADOS_POR_REGIAO).flatMap(([regiao, estados]) => estados.map((e) => ({ e, regiao })));
  const podeSalvar = dados.nomeFantasia && dados.cidade && dados.representanteAtualId;

  const salvar = () => {
    const regiao = estadosDisponiveis.find((x) => x.e === dados.estado)?.regiao || "Sudeste";
    onCriar({
      nomeFantasia: dados.nomeFantasia, razaoSocial: dados.razaoSocial || dados.nomeFantasia,
      cnpj: dados.cnpj, redeId: dados.redeId,
      cidade: dados.cidade, estado: dados.estado, regiao,
      representanteAtualId: dados.representanteAtualId,
      status: dados.status,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[#141D2E]/40" onClick={onClose} />
      <div style={{ background: COLORS.surface }} className="relative w-full max-w-[440px] rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ color: COLORS.text }} className="text-[16px] font-semibold">Nova loja</h3>
          <button onClick={onClose} style={{ color: COLORS.muted }}><X size={18} /></button>
        </div>
        <div className="flex flex-col gap-3.5">
          <CampoTexto label="Nome fantasia" value={dados.nomeFantasia} onChange={set("nomeFantasia")} />
          <CampoTexto label="Razão social" value={dados.razaoSocial} onChange={set("razaoSocial")} />
          <div className="grid grid-cols-2 gap-3">
            <CampoTexto label="CNPJ" value={dados.cnpj} onChange={set("cnpj")} />
            <div>
              <label style={{ color: COLORS.muted }} className="text-[11.5px] font-medium">Rede</label>
              <select value={dados.redeId} onChange={(e) => set("redeId")(e.target.value)} style={{ borderColor: COLORS.border }} className="w-full border rounded-lg px-3 py-2 text-[13px] outline-none mt-1">
                {REDES.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <CampoTexto label="Cidade" value={dados.cidade} onChange={set("cidade")} />
            <div>
              <label style={{ color: COLORS.muted }} className="text-[11.5px] font-medium">Estado</label>
              <select value={dados.estado} onChange={(e) => set("estado")(e.target.value)} style={{ borderColor: COLORS.border }} className="w-full border rounded-lg px-3 py-2 text-[13px] outline-none mt-1">
                {estadosDisponiveis.map(({ e }) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ color: COLORS.muted }} className="text-[11.5px] font-medium">Representante responsável</label>
            <select value={dados.representanteAtualId} onChange={(e) => set("representanteAtualId")(e.target.value)} style={{ borderColor: COLORS.border }} className="w-full border rounded-lg px-3 py-2 text-[13px] outline-none mt-1">
              {representantes.map((r) => <option key={r.id} value={r.id}>{r.nomeCompleto}</option>)}
            </select>
          </div>
          <CampoSelect label="Status inicial" value={dados.status} onChange={set("status")} options={["prospect", "credenciada"]} />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} style={{ color: COLORS.text }} className="text-[13px] font-medium px-3.5 py-2">Cancelar</button>
          <button disabled={!podeSalvar} onClick={salvar} style={{ background: podeSalvar ? COLORS.primary : "#ADC6E7" }} className="text-white text-[13px] font-medium px-4 py-2 rounded-lg">Cadastrar loja</button>
        </div>
      </div>
    </div>
  );
}

function CarteiraLojasView({ lojas, representantes, api, onTransferir, onCriarLoja, user, buscaInicial }) {
  const isRep = user.perfil === "representante";
  const [filtroRep, setFiltroRep] = useState(isRep ? user.representanteId : "todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [busca, setBusca] = useState(buscaInicial || "");
  const [transferindo, setTransferindo] = useState(null);
  const [historicoDe, setHistoricoDe] = useState(null);
  const [historicoCarregado, setHistoricoCarregado] = useState(null);
  const [criandoLoja, setCriandoLoja] = useState(false);

  useEffect(() => {
    if (!historicoDe) { setHistoricoCarregado(null); return; }
    api.getHistoricoLoja(historicoDe.id).then(setHistoricoCarregado).catch(() => setHistoricoCarregado([]));
  }, [historicoDe]);

  const filtradas = lojas.filter((l) => {
    const okRep = filtroRep === "todos" || l.representanteAtualId === filtroRep;
    const okStatus = filtroStatus === "todos" || l.status === filtroStatus;
    const okBusca = !busca || l.nomeFantasia.toLowerCase().includes(busca.toLowerCase()) || l.codigo.toLowerCase().includes(busca.toLowerCase());
    return okRep && okStatus && okBusca;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div style={{ borderColor: COLORS.border, background: COLORS.surface }} className="flex items-center gap-2 border rounded-lg px-3 py-2 w-[200px]">
            <Search size={14} style={{ color: COLORS.muted }} />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome ou código" className="bg-transparent outline-none text-[13px] w-full" />
          </div>
          {!isRep && (
            <select value={filtroRep} onChange={(e) => setFiltroRep(e.target.value)} style={{ borderColor: COLORS.border, color: COLORS.text }} className="border rounded-lg px-3 py-2 text-[13px] outline-none">
              <option value="todos">Todos os representantes</option>
              {representantes.map((r) => <option key={r.id} value={r.id}>{r.nomeCompleto}</option>)}
            </select>
          )}
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} style={{ borderColor: COLORS.border, color: COLORS.text }} className="border rounded-lg px-3 py-2 text-[13px] outline-none">
            <option value="todos">Todos os status</option>
            {STATUS_LOJA.map((s) => <option key={s} value={s}>{STATUS_STYLES[s]?.label || s}</option>)}
          </select>
        </div>
        {!isRep && (
          <button onClick={() => setCriandoLoja(true)} style={{ background: COLORS.primary }} className="flex items-center gap-1.5 text-white text-[13px] font-medium px-3.5 py-2 rounded-lg hover:opacity-90">
            <Plus size={15} /> Nova loja
          </button>
        )}
      </div>

      <div style={{ borderColor: COLORS.border, background: COLORS.surface }} className="border rounded-xl overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ borderColor: COLORS.border, color: COLORS.muted }} className="border-b text-left">
              <th className="font-medium px-4 py-3">Loja</th>
              <th className="font-medium px-4 py-3">Cidade/UF</th>
              {!isRep && <th className="font-medium px-4 py-3">Representante</th>}
              <th className="font-medium px-4 py-3">Vendas</th>
              <th className="font-medium px-4 py-3">Volume originado</th>
              <th className="font-medium px-4 py-3">Status</th>
              <th className="font-medium px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((l) => {
              const rep = representantes.find((r) => r.id === l.representanteAtualId);
              const alerta = l.status === "ativa" && l.diasSemVender > 30;
              return (
                <tr key={l.id} style={{ borderColor: COLORS.border }} className="border-b last:border-0 hover:bg-[#FCFCFC]">
                  <td className="px-4 py-3">
                    <div style={{ color: COLORS.text }} className="font-medium flex items-center gap-1.5">
                      {l.nomeFantasia}
                      {alerta && <AlertTriangle size={13} style={{ color: COLORS.amber }} />}
                    </div>
                    <div style={{ color: COLORS.muted }} className="text-[12px]">{l.codigo}</div>
                  </td>
                  <td className="px-4 py-3" style={{ color: COLORS.text }}>{l.cidade}/{l.estado}</td>
                  {!isRep && <td className="px-4 py-3" style={{ color: COLORS.text }}>{rep?.nomeCompleto}</td>}
                  <td className="px-4 py-3" style={{ color: COLORS.text }}>{l.qtdVendas}</td>
                  <td className="px-4 py-3" style={{ color: COLORS.text }}>{fmtBRL(l.volumeOriginado)}</td>
                  <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => setHistoricoDe(l)} title="Ver histórico" style={{ color: COLORS.muted }} className="hover:text-[color:var(--wiwap-ink)]"><Clock size={15} /></button>
                      {!isRep && (
                        <button onClick={() => setTransferindo(l)} title="Transferir loja" style={{ color: COLORS.primaryDeep }} className="hover:opacity-70"><ArrowRightLeft size={15} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtradas.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center" style={{ color: COLORS.muted }}>Nenhuma loja encontrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {transferindo && (
        <TransferirLojaModal
          loja={transferindo}
          representantes={representantes}
          onClose={() => setTransferindo(null)}
          onConfirm={(dados) => { onTransferir(transferindo, dados); setTransferindo(null); }}
        />
      )}

      {historicoDe && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-[#141D2E]/40" onClick={() => setHistoricoDe(null)} />
          <div style={{ background: COLORS.surface }} className="relative w-full max-w-[440px] rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ color: COLORS.text }} className="text-[16px] font-semibold">Histórico de vínculo · {historicoDe.nomeFantasia}</h3>
              <button onClick={() => setHistoricoDe(null)} style={{ color: COLORS.muted }}><X size={18} /></button>
            </div>
            <div className="flex flex-col gap-3">
              {historicoCarregado == null ? (
                <p style={{ color: COLORS.muted }} className="text-[13px]">Carregando...</p>
              ) : historicoCarregado.slice().reverse().map((h) => {
                const rep = h.representante || representantes.find((r) => r.id === h.representanteId);
                return (
                  <div key={h.id} style={{ borderColor: COLORS.border }} className="border rounded-lg px-3.5 py-2.5">
                    <div className="flex items-center justify-between">
                      <span style={{ color: COLORS.text }} className="text-[13px] font-medium">{rep?.nomeCompleto}</span>
                      {!h.dataFim && <span style={{ color: COLORS.emerald }} className="text-[11.5px] font-medium">Vigente</span>}
                    </div>
                    <div style={{ color: COLORS.muted }} className="text-[12px] mt-0.5">
                      {new Date(h.dataInicio).toLocaleDateString("pt-BR")} {h.dataFim ? `→ ${new Date(h.dataFim).toLocaleDateString("pt-BR")}` : "→ atual"} · {h.motivo}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {criandoLoja && (
        <NovaLojaModal representantes={representantes} onClose={() => setCriandoLoja(false)} onCriar={(dados) => onCriarLoja?.(dados)} />
      )}
    </div>
  );
}

/* ============================================================================
   VENDAS
============================================================================ */

const STATUS_VENDA_STYLES = {
  Simulada: { bg: "#F4F5F7", fg: "#5B6472", label: "Simulada" },
  Aprovada: { bg: "#E7EEFB", fg: "#00223F", label: "Aprovada" },
  Formalizada: { bg: "#E7EEFB", fg: "#00223F", label: "Formalizada" },
  Liquidada: { bg: "#E9F7EF", fg: "#15803D", label: "Liquidada" },
  "Em pagamento": { bg: "#FEF3C7", fg: "#B45309", label: "Em pagamento" },
  Quitada: { bg: "#E9F7EF", fg: "#15803D", label: "Quitada" },
  Inadimplente: { bg: "#FDECEC", fg: "#B91C1C", label: "Inadimplente" },
  Cancelada: { bg: "#F4F5F7", fg: "#69707D", label: "Cancelada" },
  Estornada: { bg: "#F4F5F7", fg: "#69707D", label: "Estornada" },
};

function ImportarVendasModal({ api, onClose, onImportado }) {
  const [relatorio, setRelatorio] = useState(null);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState("");

  const processarArquivo = async (file) => {
    setProcessando(true);
    setErro("");
    try {
      const rel = await api.importarVendas(file);
      setRelatorio({ ...rel, data: new Date(rel.data).toLocaleString("pt-BR") });
      if (rel.processados > 0) onImportado();
    } catch (e) {
      setErro(e.message || "Falha ao importar o arquivo.");
    } finally {
      setProcessando(false);
    }
  };

  const baixarModelo = () => {
    const csv = "codigo,data,competencia,loja,cliente,produto,valorCompra,entrada,parcelas\nVD-99001,05/09/2026,Setembro/2026,WW-1000,Cliente ****9001,Crédito Pessoal,3200,200,12\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "modelo_importacao_vendas.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[#141D2E]/40" onClick={onClose} />
      <div style={{ background: COLORS.surface }} className="relative w-full max-w-[480px] rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 style={{ color: COLORS.text }} className="text-[16px] font-semibold flex items-center gap-2"><FileUp size={17} /> Importar vendas</h3>
          <button onClick={onClose} style={{ color: COLORS.muted }}><X size={18} /></button>
        </div>
        <p style={{ color: COLORS.muted }} className="text-[12.5px] mb-4">Arquivo CSV com colunas: codigo, data, competencia, loja (código), cliente, produto, valorCompra, entrada, parcelas.</p>

        <button onClick={baixarModelo} style={{ color: COLORS.primaryDeep }} className="text-[12.5px] font-medium mb-4">Baixar modelo CSV</button>

        <label style={{ borderColor: COLORS.border }} className="border border-dashed rounded-xl flex flex-col items-center justify-center gap-2 py-8 cursor-pointer hover:bg-[#FCFCFC]">
          <Upload size={20} style={{ color: COLORS.muted }} />
          <span style={{ color: COLORS.text }} className="text-[12.5px] font-medium">{processando ? "Processando..." : "Clique para selecionar o arquivo .csv"}</span>
          <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files[0] && processarArquivo(e.target.files[0])} />
        </label>

        {erro && <div style={{ background: "#FDECEC", color: COLORS.rose }} className="text-[12.5px] rounded-lg px-3 py-2.5 mt-3">{erro}</div>}

        {relatorio && (
          <div style={{ borderColor: COLORS.border, background: "#FCFCFC" }} className="border rounded-lg p-3.5 mt-4">
            <div style={{ color: COLORS.text }} className="text-[12.5px] font-semibold mb-2">Relatório de importação</div>
            <div className="grid grid-cols-2 gap-y-1.5 text-[12px]">
              <span style={{ color: COLORS.muted }}>Registros recebidos</span><span style={{ color: COLORS.text }}>{relatorio.recebidos}</span>
              <span style={{ color: COLORS.muted }}>Registros válidos</span><span style={{ color: COLORS.emerald }}>{relatorio.validos}</span>
              <span style={{ color: COLORS.muted }}>Registros com erro</span><span style={{ color: COLORS.rose }}>{relatorio.comErro}</span>
              <span style={{ color: COLORS.muted }}>Duplicidades</span><span style={{ color: COLORS.amber }}>{relatorio.duplicados}</span>
              <span style={{ color: COLORS.muted }}>Processados</span><span style={{ color: COLORS.text }}>{relatorio.processados}</span>
              <span style={{ color: COLORS.muted }}>Data/hora</span><span style={{ color: COLORS.text }}>{relatorio.data}</span>
            </div>
          </div>
        )}

        <div className="flex justify-end mt-5">
          <button onClick={onClose} style={{ background: COLORS.primary }} className="text-white text-[13px] font-medium px-4 py-2 rounded-lg">Concluir</button>
        </div>
      </div>
    </div>
  );
}

function VendaDetalhe({ venda, loja, representante, onClose }) {
  return (
    <div className="fixed inset-0 z-30 flex justify-end">
      <div className="absolute inset-0 bg-[#141D2E]/30" onClick={onClose} />
      <div style={{ background: COLORS.surface }} className="relative w-full max-w-[440px] h-full overflow-y-auto shadow-2xl">
        <div style={{ borderColor: COLORS.border }} className="border-b px-6 py-5 flex items-start justify-between sticky top-0 bg-white">
          <div>
            <h2 style={{ color: COLORS.text }} className="text-[17px] font-semibold">{venda.codigo}</h2>
            <p style={{ color: COLORS.muted }} className="text-[12.5px] mt-0.5">{venda.data} · {venda.produto}</p>
            <div className="mt-2"><StatusBadge status={venda.status} styles={STATUS_VENDA_STYLES} /></div>
          </div>
          <button onClick={onClose} style={{ color: COLORS.muted }} className="p-1.5 hover:bg-[#141D2E]/5 rounded-md"><X size={18} /></button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-x-4 gap-y-0.5">
          <InfoRow icon={Building2} label="Loja" value={loja?.nomeFantasia} />
          <InfoRow icon={Users} label="Representante" value={representante?.nomeCompleto} />
          <InfoRow icon={Wallet} label="Valor da compra" value={fmtBRL(venda.valorCompra)} />
          <InfoRow icon={Wallet} label="Entrada" value={fmtBRL(venda.entrada)} />
          <InfoRow icon={Wallet} label="Valor financiado" value={fmtBRL(venda.valorFinanciado)} />
          <InfoRow icon={Clock} label="Parcelas" value={`${venda.qtdParcelas}x`} />
          <InfoRow icon={Wallet} label="Receita gerada" value={fmtBRL(venda.receitaGerada)} />
          <InfoRow icon={Wallet} label="Valor recebido" value={fmtBRL(venda.valorRecebido)} />
          <InfoRow icon={Clock} label="Competência" value={venda.competencia} />
          <InfoRow icon={Check} label="Elegível para comissão" value={venda.elegivelComissao ? "Sim" : `Não — ${venda.motivoInelegibilidade}`} />
        </div>
      </div>
    </div>
  );
}

function VendasView({ vendas, lojas, representantes, user, api, onImportado }) {
  const isRep = user.perfil === "representante";
  const [busca, setBusca] = useState("");
  const [filtroCompetencia, setFiltroCompetencia] = useState("todas");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroRep, setFiltroRep] = useState(isRep ? user.representanteId : "todos");
  const [importando, setImportando] = useState(false);
  const [detalhe, setDetalhe] = useState(null);
  const [pagina, setPagina] = useState(1);
  const porPagina = 12;

  const filtradas = vendas.filter((v) => {
    const loja = lojas.find((l) => l.id === v.lojaId);
    const okBusca = !busca || v.codigo.toLowerCase().includes(busca.toLowerCase()) || loja?.nomeFantasia.toLowerCase().includes(busca.toLowerCase());
    const okCompetencia = filtroCompetencia === "todas" || v.competencia === filtroCompetencia;
    const okStatus = filtroStatus === "todos" || v.status === filtroStatus;
    const okRep = filtroRep === "todos" || v.representanteId === filtroRep;
    return okBusca && okCompetencia && okStatus && okRep;
  });
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / porPagina));
  const pagina_ = Math.min(pagina, totalPaginas);
  const visiveis = filtradas.slice((pagina_ - 1) * porPagina, pagina_ * porPagina);

  const totalVolume = filtradas.reduce((a, v) => a + v.valorFinanciado, 0);
  const totalReceita = filtradas.reduce((a, v) => a + v.receitaGerada, 0);
  const elegiveis = filtradas.filter((v) => v.elegivelComissao).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Vendas no filtro" value={filtradas.length} icon={ShoppingCart} />
        <KpiCard label="Elegíveis para comissão" value={elegiveis} icon={Check} />
        <KpiCard label="Volume financiado" value={fmtBRL(totalVolume)} icon={TrendingUp} />
        <KpiCard label="Receita gerada" value={fmtBRL(totalReceita)} icon={Wallet} />
      </div>

      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div style={{ borderColor: COLORS.border, background: COLORS.surface }} className="flex items-center gap-2 border rounded-lg px-3 py-2 w-[210px]">
            <Search size={14} style={{ color: COLORS.muted }} />
            <input value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(1); }} placeholder="Código ou loja" className="bg-transparent outline-none text-[13px] w-full" />
          </div>
          <select value={filtroCompetencia} onChange={(e) => { setFiltroCompetencia(e.target.value); setPagina(1); }} style={{ borderColor: COLORS.border, color: COLORS.text }} className="border rounded-lg px-3 py-2 text-[13px] outline-none">
            <option value="todas">Todas as competências</option>
            {COMPETENCIAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filtroStatus} onChange={(e) => { setFiltroStatus(e.target.value); setPagina(1); }} style={{ borderColor: COLORS.border, color: COLORS.text }} className="border rounded-lg px-3 py-2 text-[13px] outline-none">
            <option value="todos">Todos os status</option>
            {STATUS_VENDA.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {!isRep && (
            <select value={filtroRep} onChange={(e) => { setFiltroRep(e.target.value); setPagina(1); }} style={{ borderColor: COLORS.border, color: COLORS.text }} className="border rounded-lg px-3 py-2 text-[13px] outline-none">
              <option value="todos">Todos os representantes</option>
              {representantes.map((r) => <option key={r.id} value={r.id}>{r.nomeCompleto}</option>)}
            </select>
          )}
        </div>
        {!isRep && (
          <button onClick={() => setImportando(true)} style={{ background: COLORS.primary }} className="flex items-center gap-1.5 text-white text-[13px] font-medium px-3.5 py-2 rounded-lg hover:opacity-90">
            <FileUp size={15} /> Importar vendas
          </button>
        )}
      </div>

      <div style={{ borderColor: COLORS.border, background: COLORS.surface }} className="border rounded-xl overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ borderColor: COLORS.border, color: COLORS.muted }} className="border-b text-left">
              <th className="font-medium px-4 py-3">Venda</th>
              <th className="font-medium px-4 py-3">Loja</th>
              {!isRep && <th className="font-medium px-4 py-3">Representante</th>}
              <th className="font-medium px-4 py-3">Valor financiado</th>
              <th className="font-medium px-4 py-3">Competência</th>
              <th className="font-medium px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((v) => {
              const loja = lojas.find((l) => l.id === v.lojaId);
              const rep = representantes.find((r) => r.id === v.representanteId);
              return (
                <tr key={v.id} style={{ borderColor: COLORS.border }} className="border-b last:border-0 hover:bg-[#FCFCFC] cursor-pointer" onClick={() => setDetalhe(v)}>
                  <td className="px-4 py-3">
                    <div style={{ color: COLORS.text }} className="font-medium">{v.codigo}</div>
                    <div style={{ color: COLORS.muted }} className="text-[12px]">{v.produto}</div>
                  </td>
                  <td className="px-4 py-3" style={{ color: COLORS.text }}>{loja?.nomeFantasia}</td>
                  {!isRep && <td className="px-4 py-3" style={{ color: COLORS.text }}>{rep?.nomeCompleto}</td>}
                  <td className="px-4 py-3" style={{ color: COLORS.text }}>{fmtBRL(v.valorFinanciado)}</td>
                  <td className="px-4 py-3" style={{ color: COLORS.text }}>{v.competencia}</td>
                  <td className="px-4 py-3"><StatusBadge status={v.status} styles={STATUS_VENDA_STYLES} /></td>
                </tr>
              );
            })}
            {visiveis.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center" style={{ color: COLORS.muted }}>Nenhuma venda encontrada.</td></tr>
            )}
          </tbody>
        </table>
        {totalPaginas > 1 && (
          <div style={{ borderColor: COLORS.border }} className="border-t flex items-center justify-between px-4 py-2.5">
            <span style={{ color: COLORS.muted }} className="text-[12px]">Página {pagina_} de {totalPaginas} · {filtradas.length} vendas</span>
            <div className="flex items-center gap-1.5">
              <button disabled={pagina_ === 1} onClick={() => setPagina((p) => p - 1)} style={{ color: pagina_ === 1 ? "#DADADA" : COLORS.text }}><ChevronLeft size={16} /></button>
              <button disabled={pagina_ === totalPaginas} onClick={() => setPagina((p) => p + 1)} style={{ color: pagina_ === totalPaginas ? "#DADADA" : COLORS.text }}><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {importando && (
        <ImportarVendasModal api={api} onClose={() => setImportando(false)} onImportado={onImportado} />
      )}
      {detalhe && (
        <VendaDetalhe venda={detalhe} loja={lojas.find((l) => l.id === detalhe.lojaId)} representante={representantes.find((r) => r.id === detalhe.representanteId)} onClose={() => setDetalhe(null)} />
      )}
    </div>
  );
}

/* ============================================================================
   CONDIÇÕES COMERCIAIS
============================================================================ */

function fmtPct(v) {
  const n = Number(v);
  return Number.isFinite(n) ? `${n.toString().replace(".", ",")}%` : "—";
}

function resumoRegra(regra) {
  const tipo = regraTipo(regra.tipoId);
  switch (tipo.categoria) {
    case "fixo":
      return `${fmtBRL(Number(regra.valorFixo) || 0)} · ${regra.periodicidade.toLowerCase()}`;
    case "percentual":
      return `${fmtPct(regra.percentual)} sobre ${regra.baseCalculo.toLowerCase()}`;
    case "faixa": {
      const n = regra.faixas.length;
      return `${n} faixas · modelo ${regra.modeloFaixa} · ${regra.baseCalculo.toLowerCase()}`;
    }
    case "meta":
      return regra.multiplicador ? `Multiplicador ${regra.multiplicador}x · ${regra.metaVinculada || "meta não definida"}` : `${fmtBRL(Number(regra.valorFixo) || 0)} · ${regra.metaVinculada || "meta não definida"}`;
    case "limite":
      return `${fmtBRL(Number(regra.valorFixo) || 0)} · ${regra.periodicidade.toLowerCase()}`;
    case "ajuda":
      return `${fmtBRL(Number(regra.valorFixo) || 0)} · ${regra.periodicidade.toLowerCase()}`;
    case "estorno":
      return regra.regraEstorno;
    default:
      return "—";
  }
}

// Calcula, para um valor-base hipotético, o resultado nos dois modelos de faixa —
// usada tanto na memória de cálculo do construtor quanto (depois) no simulador.
function calcularFaixas(faixas, base, modelo) {
  const linhas = [];
  let total = 0;
  if (modelo === "retroativo") {
    const faixaAtingida = [...faixas].reverse().find((f) => base >= f.de) || faixas[0];
    total = base * (faixaAtingida.percentual / 100);
    linhas.push({
      texto: `Faixa atingida: ${fmtBRL(faixaAtingida.de)} ${faixaAtingida.ate ? `– ${fmtBRL(faixaAtingida.ate)}` : "ou mais"} → ${fmtPct(faixaAtingida.percentual)} sobre o total`,
      valor: total,
    });
    linhas.push({ texto: `${fmtBRL(base)} × ${fmtPct(faixaAtingida.percentual)}`, valor: total });
  } else {
    faixas.forEach((f) => {
      const teto = f.ate == null ? base : Math.min(f.ate, base);
      const piso = f.de;
      const valorNaFaixa = Math.max(0, teto - piso);
      if (base > piso) {
        const comissao = valorNaFaixa * (f.percentual / 100);
        total += comissao;
        linhas.push({
          texto: `${fmtBRL(piso)} ${f.ate ? `– ${fmtBRL(f.ate)}` : "ou mais"}: ${fmtBRL(valorNaFaixa)} × ${fmtPct(f.percentual)}`,
          valor: comissao,
        });
      }
    });
  }
  return { total, linhas };
}

function FaixasEditor({ faixas, modelo, onChangeFaixas, onChangeModelo }) {
  const [baseExemplo, setBaseExemplo] = useState(250000);
  const resultado = useMemo(() => calcularFaixas(faixas, Number(baseExemplo) || 0, modelo), [faixas, baseExemplo, modelo]);
  const resultadoAlternativo = useMemo(
    () => calcularFaixas(faixas, Number(baseExemplo) || 0, modelo === "progressivo" ? "retroativo" : "progressivo"),
    [faixas, baseExemplo, modelo]
  );

  const atualizarFaixa = (i, campo, valor) => {
    const novas = faixas.map((f, idx) => (idx === i ? { ...f, [campo]: valor === "" ? (campo === "ate" ? null : 0) : Number(valor) } : f));
    onChangeFaixas(novas);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        {["progressivo", "retroativo"].map((m) => (
          <button
            key={m}
            onClick={() => onChangeModelo(m)}
            style={modelo === m ? { background: COLORS.primary, color: "white" } : { borderColor: COLORS.border, color: COLORS.text }}
            className={`text-[12.5px] font-medium px-3 py-1.5 rounded-lg ${modelo === m ? "" : "border"}`}
          >
            Modelo {m === "progressivo" ? "progressivo" : "retroativo"}
          </button>
        ))}
        <span style={{ color: COLORS.muted }} className="text-[12px] ml-1">
          {modelo === "progressivo" ? "cada percentual incide só sobre o valor dentro da faixa" : "ao atingir a faixa, o percentual vale sobre toda a base"}
        </span>
      </div>

      <div style={{ borderColor: COLORS.border }} className="border rounded-lg overflow-hidden">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr style={{ borderColor: COLORS.border, color: COLORS.muted }} className="border-b text-left">
              <th className="font-medium px-3 py-2">De (R$)</th>
              <th className="font-medium px-3 py-2">Até (R$)</th>
              <th className="font-medium px-3 py-2">Percentual</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {faixas.map((f, i) => (
              <tr key={i} style={{ borderColor: COLORS.border }} className="border-b last:border-0">
                <td className="px-3 py-1.5">
                  <input type="number" value={f.de} onChange={(e) => atualizarFaixa(i, "de", e.target.value)} className="w-24 outline-none bg-transparent" />
                </td>
                <td className="px-3 py-1.5">
                  <input type="number" placeholder="sem teto" value={f.ate ?? ""} onChange={(e) => atualizarFaixa(i, "ate", e.target.value)} className="w-24 outline-none bg-transparent placeholder:text-[#B4BAC4]" />
                </td>
                <td className="px-3 py-1.5">
                  <input type="number" step="0.01" value={f.percentual} onChange={(e) => atualizarFaixa(i, "percentual", e.target.value)} className="w-16 outline-none bg-transparent" />%
                </td>
                <td className="px-3 py-1.5 text-right">
                  {faixas.length > 1 && (
                    <button onClick={() => onChangeFaixas(faixas.filter((_, idx) => idx !== i))} style={{ color: COLORS.rose }}><Trash2 size={13} /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          onClick={() => onChangeFaixas([...faixas, { de: faixas[faixas.length - 1]?.ate ?? 0, ate: null, percentual: 1 }])}
          style={{ color: COLORS.primaryDeep }}
          className="flex items-center gap-1.5 text-[12.5px] font-medium px-3 py-2"
        >
          <PlusCircle size={14} /> Adicionar faixa
        </button>
      </div>

      <div style={{ borderColor: COLORS.border, background: "#FCFCFC" }} className="border rounded-lg p-3.5">
        <div className="flex items-center justify-between mb-2.5">
          <span style={{ color: COLORS.muted }} className="text-[12px]">Memória de cálculo — simulação de exemplo sobre</span>
          <div className="flex items-center gap-1.5">
            <span style={{ color: COLORS.muted }} className="text-[12px]">R$</span>
            <input type="number" value={baseExemplo} onChange={(e) => setBaseExemplo(e.target.value)} style={{ borderColor: COLORS.border }} className="w-28 border rounded-md px-2 py-1 text-[12.5px] outline-none" />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <div style={{ color: COLORS.text }} className="text-[12px] font-semibold mb-1">Neste modelo ({modelo})</div>
            {resultado.linhas.map((l, i) => (
              <div key={i} style={{ color: COLORS.muted }} className="text-[11.5px] leading-relaxed">{l.texto}</div>
            ))}
            <div style={{ color: COLORS.emerald }} className="text-[13.5px] font-semibold mt-1.5">{fmtBRL(resultado.total)}</div>
          </div>
          <div>
            <div style={{ color: COLORS.text }} className="text-[12px] font-semibold mb-1">No outro modelo ({modelo === "progressivo" ? "retroativo" : "progressivo"})</div>
            {resultadoAlternativo.linhas.map((l, i) => (
              <div key={i} style={{ color: COLORS.muted }} className="text-[11.5px] leading-relaxed">{l.texto}</div>
            ))}
            <div style={{ color: COLORS.text }} className="text-[13.5px] font-semibold mt-1.5">{fmtBRL(resultadoAlternativo.total)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CampoTexto({ label, value, onChange, type = "text", suffix, placeholder }) {
  return (
    <div>
      <label style={{ color: COLORS.muted }} className="text-[11.5px] font-medium">{label}</label>
      <div className="flex items-center gap-1.5 mt-1">
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          style={{ borderColor: COLORS.border }}
          className="w-full border rounded-lg px-3 py-2 text-[13px] outline-none"
        />
        {suffix && <span style={{ color: COLORS.muted }} className="text-[12.5px]">{suffix}</span>}
      </div>
    </div>
  );
}

function CampoSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label style={{ color: COLORS.muted }} className="text-[11.5px] font-medium">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ borderColor: COLORS.border }} className="w-full border rounded-lg px-3 py-2 text-[13px] outline-none mt-1">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function CampoToggle({ label, value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} className="flex items-center justify-between w-full py-1.5">
      <span style={{ color: COLORS.text }} className="text-[12.5px]">{label}</span>
      <span style={{ background: value ? COLORS.primary : "#DADADA" }} className="w-9 h-5 rounded-full relative transition-colors shrink-0">
        <span style={{ transform: value ? "translateX(16px)" : "translateX(2px)" }} className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform" />
      </span>
    </button>
  );
}

function RegraEditorModal({ regraInicial, onClose, onSalvar }) {
  const [regra, setRegra] = useState(regraInicial);
  const [avancado, setAvancado] = useState(false);
  const tipo = regraTipo(regra.tipoId);
  const set = (campo) => (valor) => setRegra((r) => ({ ...r, [campo]: valor }));

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[#141D2E]/40" onClick={onClose} />
      <div style={{ background: COLORS.surface }} className="relative w-full max-w-[560px] max-h-[88vh] overflow-y-auto rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ color: COLORS.text }} className="text-[16px] font-semibold">{regraInicial.__novo ? "Adicionar regra" : "Editar regra"}</h3>
          <button onClick={onClose} style={{ color: COLORS.muted }}><X size={18} /></button>
        </div>

        <div className="flex flex-col gap-3.5">
          <div>
            <label style={{ color: COLORS.muted }} className="text-[11.5px] font-medium">Tipo de regra</label>
            <select
              value={regra.tipoId}
              onChange={(e) => setRegra((r) => ({ ...r, tipoId: e.target.value }))}
              style={{ borderColor: COLORS.border }}
              className="w-full border rounded-lg px-3 py-2 text-[13px] outline-none mt-1"
            >
              {REGRA_TIPOS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>

          {tipo.categoria === "fixo" && (
            <div className="grid grid-cols-2 gap-3">
              <CampoTexto label="Valor fixo" type="number" value={regra.valorFixo} onChange={set("valorFixo")} suffix="R$" />
              <CampoSelect label="Periodicidade" value={regra.periodicidade} onChange={set("periodicidade")} options={["Por evento", "Mensal", "Trimestral", "Anual"]} />
            </div>
          )}

          {tipo.categoria === "percentual" && (
            <div className="grid grid-cols-2 gap-3">
              <CampoTexto label="Percentual" type="number" value={regra.percentual} onChange={set("percentual")} suffix="%" />
              <CampoSelect label="Base de cálculo" value={regra.baseCalculo} onChange={set("baseCalculo")} options={BASES_CALCULO} />
            </div>
          )}

          {tipo.categoria === "faixa" && (
            <>
              <CampoSelect label="Base de cálculo" value={regra.baseCalculo} onChange={set("baseCalculo")} options={BASES_CALCULO} />
              <FaixasEditor faixas={regra.faixas} modelo={regra.modeloFaixa} onChangeFaixas={set("faixas")} onChangeModelo={set("modeloFaixa")} />
            </>
          )}

          {tipo.categoria === "meta" && (
            <div className="grid grid-cols-2 gap-3">
              <CampoTexto label="Multiplicador (deixe em branco se for valor fixo)" type="number" value={regra.multiplicador} onChange={set("multiplicador")} suffix="x" />
              <CampoTexto label="Valor fixo (se não houver multiplicador)" type="number" value={regra.valorFixo} onChange={set("valorFixo")} suffix="R$" />
              <div className="col-span-2">
                <CampoTexto label="Meta vinculada" value={regra.metaVinculada} onChange={set("metaVinculada")} placeholder="Ex.: 20 lojas ativas no mês" />
              </div>
            </div>
          )}

          {tipo.categoria === "limite" && (
            <div className="grid grid-cols-2 gap-3">
              <CampoTexto label="Valor" type="number" value={regra.valorFixo} onChange={set("valorFixo")} suffix="R$" />
              <CampoSelect label="Periodicidade" value={regra.periodicidade} onChange={set("periodicidade")} options={["Mensal", "Trimestral", "Anual"]} />
            </div>
          )}

          {tipo.categoria === "ajuda" && (
            <div className="grid grid-cols-2 gap-3">
              <CampoTexto label="Valor" type="number" value={regra.valorFixo} onChange={set("valorFixo")} suffix="R$" />
              <CampoSelect label="Periodicidade" value={regra.periodicidade} onChange={set("periodicidade")} options={["Mensal", "Por evento"]} />
            </div>
          )}

          {tipo.categoria === "estorno" && (
            <CampoSelect label="Regra de estorno" value={regra.regraEstorno} onChange={set("regraEstorno")} options={["Proporcional ao valor cancelado", "Integral do valor pago", "Sem estorno automático"]} />
          )}

          <button onClick={() => setAvancado((v) => !v)} style={{ color: COLORS.primaryDeep }} className="flex items-center gap-1.5 text-[12.5px] font-medium mt-1">
            <ChevronDown size={14} style={{ transform: avancado ? "rotate(180deg)" : "none" }} />
            Parâmetros avançados
          </button>

          {avancado && (
            <div style={{ borderColor: COLORS.border }} className="border rounded-lg p-3.5 flex flex-col gap-3.5">
              <div className="grid grid-cols-2 gap-3">
                <CampoTexto label="Carência" value={regra.carencia} onChange={set("carencia")} placeholder="Ex.: 30 dias" />
                <CampoTexto label="Quantidade mínima" type="number" value={regra.quantidadeMinima} onChange={set("quantidadeMinima")} />
                <CampoTexto label="Valor mínimo" type="number" value={regra.valorMinimo} onChange={set("valorMinimo")} suffix="R$" />
                <CampoTexto label="Limite máximo" type="number" value={regra.limiteMaximo} onChange={set("limiteMaximo")} suffix="R$" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <CampoTexto label="Produtos elegíveis" value={regra.produtosElegiveis} onChange={set("produtosElegiveis")} />
                <CampoTexto label="Lojas elegíveis" value={regra.lojasElegiveis} onChange={set("lojasElegiveis")} />
                <CampoTexto label="Estados elegíveis" value={regra.estadosElegiveis} onChange={set("estadosElegiveis")} />
                <CampoSelect label="Arredondamento" value={regra.regraArredondamento} onChange={set("regraArredondamento")} options={["Duas casas decimais", "Arredondar para cima", "Arredondar para baixo"]} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <CampoTexto label="Início da validade" type="date" value={regra.periodoValidadeInicio} onChange={set("periodoValidadeInicio")} />
                <CampoTexto label="Fim da validade" type="date" value={regra.periodoValidadeFim} onChange={set("periodoValidadeFim")} />
              </div>
              <div className="grid grid-cols-2 gap-x-6">
                <CampoToggle label="Regra acumulativa" value={regra.acumulativa} onChange={set("acumulativa")} />
                <CampoToggle label="Incide sobre valor líquido" value={regra.incidencia === "liquido"} onChange={(v) => set("incidencia")(v ? "liquido" : "bruto")} />
                <CampoToggle label="Depende de pagamento" value={regra.dependePagamento} onChange={set("dependePagamento")} />
                <CampoToggle label="Depende de nota fiscal" value={regra.dependeNF} onChange={set("dependeNF")} />
              </div>
              <div>
                <label style={{ color: COLORS.muted }} className="text-[11.5px] font-medium">Observação explicativa</label>
                <textarea value={regra.observacao} onChange={(e) => set("observacao")(e.target.value)} rows={2} style={{ borderColor: COLORS.border }} className="w-full border rounded-lg px-3 py-2 text-[13px] outline-none mt-1 resize-none" />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} style={{ color: COLORS.text }} className="text-[13px] font-medium px-3.5 py-2">Cancelar</button>
          <button onClick={() => onSalvar(regra)} style={{ background: COLORS.primary }} className="text-white text-[13px] font-medium px-4 py-2 rounded-lg">Salvar regra</button>
        </div>
      </div>
    </div>
  );
}

function AprovacaoBox({ condicao, onAprovar, onReprovar, user }) {
  const podeAprovar = ["diretoria", "administrador"].includes(user.perfil);
  return (
    <div style={{ borderColor: "#E8730A", background: "#FEF3C7" }} className="border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Gauge size={16} style={{ color: COLORS.amber }} />
        <h4 style={{ color: COLORS.text }} className="text-[13.5px] font-semibold">Aguardando aprovação da diretoria</h4>
      </div>
      <div className="grid grid-cols-2 gap-y-2 text-[12.5px] mb-4">
        <span style={{ color: COLORS.muted }}>Solicitante</span><span style={{ color: COLORS.text }}>{condicao.responsavelCriacao}</span>
        <span style={{ color: COLORS.muted }}>Elegibilidade proposta</span><span style={{ color: COLORS.text }}>{condicao.elegibilidade}</span>
        <span style={{ color: COLORS.muted }}>Vigência proposta</span><span style={{ color: COLORS.text }}>{condicao.dataInicio} – {condicao.dataFim || "indeterminado"}</span>
        <span style={{ color: COLORS.muted }}>Justificativa</span><span style={{ color: COLORS.text }}>{condicao.observacoes}</span>
      </div>
      {podeAprovar ? (
        <div className="flex gap-2">
          <button onClick={onAprovar} style={{ background: COLORS.emerald }} className="flex items-center gap-1.5 text-white text-[12.5px] font-medium px-3 py-1.5 rounded-lg">
            <Check size={14} /> Aprovar
          </button>
          <button onClick={onReprovar} style={{ borderColor: COLORS.rose, color: COLORS.rose }} className="flex items-center gap-1.5 border text-[12.5px] font-medium px-3 py-1.5 rounded-lg">
            <XCircle size={14} /> Reprovar
          </button>
        </div>
      ) : (
        <p style={{ color: COLORS.muted }} className="text-[12px]">Somente a diretoria ou a administração podem aprovar esta condição.</p>
      )}
    </div>
  );
}

function CondicaoDrawer({ condicao, onClose, onSalvar, user, registrarLog }) {
  const [dados, setDados] = useState(condicao);
  const [editandoRegra, setEditandoRegra] = useState(null);
  const podeEditar = ["administrador", "gestor"].includes(user.perfil) && ["rascunho", "aguardando_aprovacao"].includes(dados.status);

  const salvarRegra = (regra) => {
    setDados((d) => {
      const existe = d.regras.some((r) => r.id === regra.id);
      const regras = existe ? d.regras.map((r) => (r.id === regra.id ? regra : r)) : [...d.regras, regra];
      return { ...d, regras };
    });
    registrarLog?.(regra.__novo ? "Adição de regra" : "Edição de regra", dados.nome, regraTipo(regra.tipoId)?.label);
    setEditandoRegra(null);
  };
  const removerRegra = (id) => {
    const regra = dados.regras.find((r) => r.id === id);
    setDados((d) => ({ ...d, regras: d.regras.filter((r) => r.id !== id) }));
    registrarLog?.("Remoção de regra", dados.nome, regra ? regraTipo(regra.tipoId)?.label : id);
  };

  const enviarParaAprovacao = () => setDados((d) => ({ ...d, status: "aguardando_aprovacao" }));
  const aprovar = () => {
    setDados((d) => ({ ...d, status: "vigente", responsavelAprovacao: user.nome, dataAprovacao: new Date().toLocaleDateString("pt-BR") }));
    registrarLog?.("Aprovação", dados.nome, "Condição comercial aprovada e vigente");
  };
  const reprovar = () => {
    setDados((d) => ({ ...d, status: "rascunho" }));
    registrarLog?.("Reprovação", dados.nome, "Condição devolvida para rascunho");
  };

  return (
    <div className="fixed inset-0 z-30 flex justify-end">
      <div className="absolute inset-0 bg-[#141D2E]/30" onClick={onClose} />
      <div style={{ background: COLORS.surface }} className="relative w-full max-w-[600px] h-full overflow-y-auto shadow-2xl flex flex-col">
        <div style={{ borderColor: COLORS.border }} className="border-b px-6 py-5 sticky top-0 bg-white z-10">
          <div className="flex items-start justify-between">
            <div>
              {podeEditar ? (
                <input value={dados.nome} onChange={(e) => setDados((d) => ({ ...d, nome: e.target.value }))} style={{ color: COLORS.text }} className="text-[17px] font-semibold outline-none bg-transparent w-full" />
              ) : (
                <h2 style={{ color: COLORS.text }} className="text-[17px] font-semibold">{dados.nome}</h2>
              )}
              <p style={{ color: COLORS.muted }} className="text-[12.5px] mt-0.5">{dados.tipo} · {dados.elegibilidade}</p>
              <div className="mt-2"><StatusBadge status={dados.status} styles={STATUS_CONDICAO_STYLES} /></div>
            </div>
            <button onClick={onClose} style={{ color: COLORS.muted }} className="p-1.5 hover:bg-[#141D2E]/5 rounded-md"><X size={18} /></button>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {dados.status === "aguardando_aprovacao" && (
            <AprovacaoBox condicao={dados} user={user} onAprovar={aprovar} onReprovar={reprovar} />
          )}

          <div>
            <h4 style={{ color: COLORS.text }} className="text-[13.5px] font-semibold mb-2">Sobre esta condição</h4>
            {podeEditar ? (
              <textarea value={dados.descricao} onChange={(e) => setDados((d) => ({ ...d, descricao: e.target.value }))} rows={2} style={{ borderColor: COLORS.border }} className="w-full border rounded-lg px-3 py-2 text-[13px] outline-none resize-none" />
            ) : (
              <p style={{ color: COLORS.muted }} className="text-[13px] leading-relaxed">{dados.descricao}</p>
            )}
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-3">
              <InfoRow icon={Clock} label="Início da vigência" value={dados.dataInicio} />
              <InfoRow icon={Clock} label="Fim da vigência" value={dados.dataFim || "Indeterminado"} />
              <InfoRow icon={Users} label="Criado por" value={dados.responsavelCriacao} />
              <InfoRow icon={Check} label="Aprovado por" value={dados.responsavelAprovacao} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 style={{ color: COLORS.text }} className="text-[13.5px] font-semibold">Regras de comissão ({dados.regras.length})</h4>
              {podeEditar && (
                <button onClick={() => setEditandoRegra({ ...novaRegraVazia(), __novo: true })} style={{ color: COLORS.primaryDeep }} className="flex items-center gap-1.5 text-[12.5px] font-medium">
                  <PlusCircle size={14} /> Adicionar regra
                </button>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {dados.regras.map((r) => (
                <div key={r.id} style={{ borderColor: COLORS.border }} className="border rounded-lg px-3.5 py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div style={{ color: COLORS.text }} className="text-[13px] font-medium">{regraTipo(r.tipoId).label}</div>
                    <div style={{ color: COLORS.muted }} className="text-[12px] truncate">{resumoRegra(r)}</div>
                  </div>
                  {podeEditar && (
                    <div className="flex items-center gap-2.5 shrink-0">
                      <button onClick={() => setEditandoRegra(r)} style={{ color: COLORS.primaryDeep }}><PenLine size={14} /></button>
                      <button onClick={() => removerRegra(r.id)} style={{ color: COLORS.rose }}><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {dados.observacoes && (
            <div style={{ background: "#F4F5F7" }} className="rounded-lg p-3.5">
              <div style={{ color: COLORS.muted }} className="text-[11.5px] font-medium mb-1">Observações</div>
              <p style={{ color: COLORS.text }} className="text-[12.5px] leading-relaxed">{dados.observacoes}</p>
            </div>
          )}
        </div>

        {podeEditar && (
          <div style={{ borderColor: COLORS.border }} className="border-t px-6 py-4 sticky bottom-0 bg-white flex justify-end gap-2">
            <button onClick={() => onSalvar(dados)} style={{ borderColor: COLORS.border, color: COLORS.text }} className="border text-[13px] font-medium px-3.5 py-2 rounded-lg">Salvar rascunho</button>
            {dados.status === "rascunho" && (
              <button onClick={() => { onSalvar({ ...dados, status: "aguardando_aprovacao" }); }} style={{ background: COLORS.primary }} className="text-white text-[13px] font-medium px-4 py-2 rounded-lg">Enviar para aprovação</button>
            )}
          </div>
        )}
        {!podeEditar && dados.status !== "aguardando_aprovacao" && (
          <div style={{ borderColor: COLORS.border }} className="border-t px-6 py-4 sticky bottom-0 bg-white flex justify-end">
            <button onClick={() => onSalvar(dados)} style={{ background: COLORS.primary }} className="text-white text-[13px] font-medium px-4 py-2 rounded-lg">Fechar</button>
          </div>
        )}

        {editandoRegra && (
          <RegraEditorModal regraInicial={editandoRegra} onClose={() => setEditandoRegra(null)} onSalvar={salvarRegra} />
        )}
      </div>
    </div>
  );
}

function CondicoesComerciaisView({ condicoes, api, recarregar, representantes, user, registrarLog }) {
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [selecionada, setSelecionada] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const podeCriar = ["administrador", "gestor"].includes(user.perfil);

  const filtradas = condicoes.filter((c) => filtroStatus === "todos" || c.status === filtroStatus);
  const pendentes = condicoes.filter((c) => c.status === "aguardando_aprovacao").length;

  const criarNova = async () => {
    try {
      const nova = await api.criarCondicao({ nome: "Nova condição comercial", tipo: "Plano individual" });
      registrarLog?.("Criação", nova.nome, "Condição comercial criada como rascunho");
      await recarregar();
      setSelecionada({ ...nova, regras: [] });
    } catch (e) {
      setErro(e.message);
    }
  };

  const salvar = async (dados) => {
    const anterior = condicoes.find((c) => c.id === dados.id);
    setSalvando(true);
    setErro("");
    try {
      await api.atualizarCondicao(dados.id, {
        nome: dados.nome, descricao: dados.descricao, elegibilidade: dados.elegibilidade,
        observacoes: dados.observacoes, dataFim: dados.dataFim,
      });
      await api.salvarRegras(dados.id, dados.regras);
      if (anterior && anterior.status !== dados.status) {
        await api.mudarStatusCondicao(dados.id, dados.status);
        registrarLog?.("Mudança de status", dados.nome, `${STATUS_CONDICAO_STYLES[anterior.status]?.label} → ${STATUS_CONDICAO_STYLES[dados.status]?.label}`);
      }
      await recarregar();
      setSelecionada(null);
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {erro && <div style={{ background: "#FDECEC", color: COLORS.rose }} className="text-[12.5px] rounded-lg px-4 py-2.5">{erro}</div>}
      {pendentes > 0 && (
        <div style={{ background: "#FEF3C7", borderColor: "#E8730A", color: "#B45309" }} className="border rounded-xl px-4 py-3 text-[13px] flex items-center gap-2">
          <Gauge size={15} />
          {pendentes} condição{pendentes > 1 ? "ões" : ""} comercial{pendentes > 1 ? "is" : ""} aguardando aprovação da diretoria.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 justify-between">
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} style={{ borderColor: COLORS.border, color: COLORS.text }} className="border rounded-lg px-3 py-2 text-[13px] outline-none">
          <option value="todos">Todos os status</option>
          {Object.keys(STATUS_CONDICAO_STYLES).map((s) => <option key={s} value={s}>{STATUS_CONDICAO_STYLES[s].label}</option>)}
        </select>
        {podeCriar && (
          <button onClick={criarNova} style={{ background: COLORS.primary }} className="flex items-center gap-1.5 text-white text-[13px] font-medium px-3.5 py-2 rounded-lg hover:opacity-90">
            <Plus size={15} /> Nova condição comercial
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {filtradas.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelecionada(c)}
            style={{ borderColor: COLORS.border, background: COLORS.surface }}
            className="text-left border rounded-xl p-4 hover:border-[#ADC6E7] transition-colors"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <div style={{ color: COLORS.text }} className="text-[14.5px] font-semibold">{c.nome}</div>
                <div style={{ color: COLORS.muted }} className="text-[12px] mt-0.5">{c.tipo} · {c.elegibilidade}</div>
              </div>
              <StatusBadge status={c.status} styles={STATUS_CONDICAO_STYLES} />
            </div>
            <p style={{ color: COLORS.muted }} className="text-[12.5px] leading-relaxed line-clamp-2 mb-3">{c.descricao}</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {c.regras.slice(0, 3).map((r) => (
                <span key={r.id} style={{ background: "#F4F5F7", color: COLORS.text }} className="text-[11px] px-2 py-1 rounded-md">{regraTipo(r.tipoId).label}</span>
              ))}
              {c.regras.length > 3 && <span style={{ color: COLORS.muted }} className="text-[11px]">+{c.regras.length - 3}</span>}
              {c.regras.length === 0 && <span style={{ color: COLORS.muted }} className="text-[11px]">Nenhuma regra configurada ainda</span>}
            </div>
          </button>
        ))}
        {filtradas.length === 0 && (
          <div style={{ color: COLORS.muted }} className="col-span-2 text-center py-16 text-[13px]">Nenhuma condição encontrada para este filtro.</div>
        )}
      </div>

      {selecionada && (
        <CondicaoDrawer condicao={selecionada} onClose={() => setSelecionada(null)} onSalvar={salvar} user={user} registrarLog={registrarLog} />
      )}
    </div>
  );
}

/* ============================================================================
   MOTOR DE CÁLCULO
   Função pura: recebe uma condição comercial (com suas regras) e um cenário
   (dados reais de vendas em produção, ou os campos preenchidos no simulador)
   e devolve o resultado com memória de cálculo linha a linha. É a mesma
   função que, no fechamento mensal, rodará sobre vendas reais em vez de um
   cenário simulado — por isso vive isolada de qualquer tela.
============================================================================ */

function calcularComissao(condicao, cenario) {
  const linhas = [];
  let fixa = 0, variavel = 0, recorrente = 0, bonus = 0, acelerador = 0, ajudaCusto = 0, estornos = 0;
  let piso = null, teto = null;

  const receitaGerada = (Number(cenario.receitaSetup) || 0) + (Number(cenario.receitaMensalidades) || 0) + (Number(cenario.outrasReceitas) || 0);
  const metaRealizadaPct = Number(cenario.metaPrevista) > 0 ? (Number(cenario.volumeTotal) / Number(cenario.metaPrevista)) * 100 : 0;

  (condicao.regras || []).forEach((r) => {
    const tipo = regraTipo(r.tipoId);
    if (!tipo) return;
    let valor = 0, desc = "";

    switch (r.tipoId) {
      case "valor_fixo_credenciamento":
        valor = (Number(r.valorFixo) || 0) * (Number(cenario.novasLojas) || 0);
        desc = `${fmtBRL(Number(r.valorFixo) || 0)} × ${cenario.novasLojas} novas lojas credenciadas`;
        fixa += valor;
        break;
      case "valor_fixo_ativacao":
        valor = (Number(r.valorFixo) || 0) * (Number(cenario.lojasAtivadas) || 0);
        desc = `${fmtBRL(Number(r.valorFixo) || 0)} × ${cenario.lojasAtivadas} lojas ativadas`;
        fixa += valor;
        break;
      case "comissao_contrato":
      case "comissao_venda_aprovada":
        valor = (Number(r.valorFixo) || 0) * (Number(cenario.qtdVendas) || 0);
        desc = `${fmtBRL(Number(r.valorFixo) || 0)} × ${cenario.qtdVendas} vendas`;
        fixa += valor;
        break;
      case "comissao_recorrente":
        valor = (Number(r.valorFixo) || 0) * (Number(cenario.lojasProdutivas) || 0);
        desc = `${fmtBRL(Number(r.valorFixo) || 0)} × ${cenario.lojasProdutivas} lojas produtivas`;
        recorrente += valor;
        break;
      case "comissao_setup":
        valor = (Number(cenario.receitaSetup) || 0) * (Number(r.percentual) || 0) / 100;
        desc = `${fmtPct(r.percentual)} sobre ${fmtBRL(Number(cenario.receitaSetup) || 0)} de setup recebido`;
        variavel += valor;
        break;
      case "comissao_mensalidade":
        valor = (Number(cenario.receitaMensalidades) || 0) * (Number(r.percentual) || 0) / 100;
        desc = `${fmtPct(r.percentual)} sobre ${fmtBRL(Number(cenario.receitaMensalidades) || 0)} de mensalidades recebidas`;
        variavel += valor;
        break;
      case "percentual_volume":
      case "percentual_financiado":
        valor = (Number(cenario.volumeTotal) || 0) * (Number(r.percentual) || 0) / 100;
        desc = `${fmtPct(r.percentual)} sobre ${fmtBRL(Number(cenario.volumeTotal) || 0)} de volume originado`;
        variavel += valor;
        break;
      case "percentual_receita":
        valor = receitaGerada * (Number(r.percentual) || 0) / 100;
        desc = `${fmtPct(r.percentual)} sobre ${fmtBRL(receitaGerada)} de receita gerada`;
        variavel += valor;
        break;
      case "percentual_receita_recebida": {
        const receitaRecebida = receitaGerada * ((Number(cenario.percentualRecebimento) || 0) / 100);
        valor = receitaRecebida * (Number(r.percentual) || 0) / 100;
        desc = `${fmtPct(r.percentual)} sobre ${fmtBRL(receitaRecebida)} efetivamente recebidos`;
        variavel += valor;
        break;
      }
      case "faixa_producao": {
        const { total, linhas: linhasFaixa } = calcularFaixas(r.faixas, Number(cenario.volumeTotal) || 0, r.modeloFaixa);
        valor = total;
        variavel += valor;
        linhas.push({ categoria: "variavel", regraLabel: tipo.label, descricao: `Modelo ${r.modeloFaixa} sobre ${(r.baseCalculo || "base configurada").toLowerCase()}`, valor: null, cabecalho: true });
        linhasFaixa.forEach((l) => linhas.push({ categoria: "variavel", regraLabel: tipo.label, descricao: `　${l.texto}`, valor: l.valor }));
        return;
      }
      case "bonus_meta":
        if (metaRealizadaPct >= 100) {
          valor = Number(r.valorFixo) || 0;
          desc = `Meta atingida (${metaRealizadaPct.toFixed(0)}% de ${fmtBRL(Number(cenario.metaPrevista) || 0)}) → bônus liberado`;
          bonus += valor;
        } else {
          desc = `Meta em ${metaRealizadaPct.toFixed(0)}% (abaixo de 100%) → bônus não liberado`;
        }
        break;
      case "acelerador_meta":
        if (metaRealizadaPct >= 110 && Number(r.multiplicador) > 1) {
          const incremento = variavel * (Number(r.multiplicador) - 1);
          valor = incremento;
          desc = `Meta em ${metaRealizadaPct.toFixed(0)}% → comissão variável × ${r.multiplicador} (ganho adicional)`;
          acelerador += incremento;
        } else {
          desc = `Meta em ${metaRealizadaPct.toFixed(0)}% → acelerador exige 110% (não disparado)`;
        }
        break;
      case "bonus_reativacao":
        valor = (Number(r.valorFixo) || 0) * (Number(cenario.lojasReativadas) || 0);
        desc = `${fmtBRL(Number(r.valorFixo) || 0)} × ${cenario.lojasReativadas || 0} lojas reativadas`;
        bonus += valor;
        break;
      case "bonus_campanha":
        valor = Number(r.valorFixo) || 0;
        desc = `Bônus fixo de campanha (${r.metaVinculada || "sem condição adicional"})`;
        bonus += valor;
        break;
      case "ajuda_custo_fixa":
      case "ajuda_custo_variavel":
        valor = Number(r.valorFixo) || 0;
        desc = `Ajuda de custo · ${(r.periodicidade || "mensal").toLowerCase()}`;
        ajudaCusto += valor;
        break;
      case "estorno_desconto": {
        const subtotalAntes = fixa + variavel + recorrente + bonus + acelerador + ajudaCusto;
        valor = subtotalAntes * ((Number(cenario.cancelamentosPct) || 0) / 100);
        desc = `${cenario.cancelamentosPct || 0}% de cancelamentos sobre ${fmtBRL(subtotalAntes)} apurados`;
        estornos += valor;
        break;
      }
      case "garantia_minima":
        piso = Number(r.valorFixo) || 0;
        desc = `Piso de ${fmtBRL(piso)} ${(r.periodicidade || "mensal").toLowerCase()}`;
        break;
      case "teto_maximo":
        teto = Number(r.valorFixo) || 0;
        desc = `Teto de ${fmtBRL(teto)} ${(r.periodicidade || "mensal").toLowerCase()}`;
        break;
      default:
        break;
    }
    linhas.push({ categoria: tipo.categoria, regraLabel: tipo.label, descricao: desc, valor: r.tipoId === "garantia_minima" || r.tipoId === "teto_maximo" ? null : valor });
  });

  const bruta = fixa + variavel + recorrente + bonus + acelerador + ajudaCusto;
  const ajuste = Number(cenario.ajustesAdicionais) || 0;
  let liquida = bruta - estornos + ajuste;
  let pisoAplicado = false, tetoAplicado = false;
  if (piso != null && liquida < piso) { liquida = piso; pisoAplicado = true; }
  if (teto != null && liquida > teto) { liquida = teto; tetoAplicado = true; }

  const receitaRecebida = receitaGerada * ((Number(cenario.percentualRecebimento) || 0) / 100) * (1 - (Number(cenario.percentualInadimplencia) || 0) / 100);
  const margem = receitaRecebida - liquida;
  const comissaoPctReceita = receitaGerada > 0 ? (liquida / receitaGerada) * 100 : 0;
  const custoPorLoja = Number(cenario.qtdLojasCarteira) > 0 ? liquida / Number(cenario.qtdLojasCarteira) : 0;
  const custoPorVenda = Number(cenario.qtdVendas) > 0 ? liquida / Number(cenario.qtdVendas) : 0;
  const retornoEstimado = liquida !== 0 ? (margem / liquida) * 100 : 0;

  return {
    linhas, fixa, variavel, recorrente, bonus, acelerador, ajudaCusto, estornos, bruta, ajuste, liquida,
    pisoAplicado, tetoAplicado, piso, teto, receitaGerada, receitaRecebida, margem, comissaoPctReceita,
    custoPorLoja, custoPorVenda, retornoEstimado, metaRealizadaPct,
  };
}

/* ============================================================================
   SIMULADOR
============================================================================ */

function cenarioPadrao(parametros, representantes) {
  return {
    representanteId: representantes?.[0]?.id || "",
    periodo: "Setembro/2026",
    qtdLojasCarteira: 8,
    novasLojas: 2,
    lojasAtivadas: 3,
    lojasProdutivas: 6,
    lojasReativadas: 1,
    qtdVendas: 45,
    volumeTotal: 180000,
    ticketMedio: 4000,
    receitaSetup: 3000,
    receitaMensalidades: 5400,
    outrasReceitas: 800,
    percentualRecebimento: parametros?.percentualRecebimentoPadrao ?? 92,
    percentualInadimplencia: 4,
    cancelamentosPct: 3,
    metaPrevista: 200000,
    ajustesAdicionais: 0,
  };
}

const CAMPOS_CENARIO = [
  { grupo: "Carteira e período", campos: [
    { key: "qtdLojasCarteira", label: "Lojas na carteira" },
    { key: "novasLojas", label: "Novas lojas credenciadas" },
    { key: "lojasAtivadas", label: "Lojas ativadas no mês" },
    { key: "lojasProdutivas", label: "Lojas produtivas no mês" },
    { key: "lojasReativadas", label: "Lojas reativadas" },
  ]},
  { grupo: "Vendas e volume", campos: [
    { key: "qtdVendas", label: "Quantidade de vendas" },
    { key: "volumeTotal", label: "Volume total originado", sufixo: "R$" },
    { key: "ticketMedio", label: "Ticket médio", sufixo: "R$" },
    { key: "metaPrevista", label: "Meta prevista de volume", sufixo: "R$" },
  ]},
  { grupo: "Receita", campos: [
    { key: "receitaSetup", label: "Receita de setup", sufixo: "R$" },
    { key: "receitaMensalidades", label: "Receita de mensalidades", sufixo: "R$" },
    { key: "outrasReceitas", label: "Outras receitas", sufixo: "R$" },
    { key: "percentualRecebimento", label: "% de recebimento", sufixo: "%" },
    { key: "percentualInadimplencia", label: "% de inadimplência", sufixo: "%" },
    { key: "cancelamentosPct", label: "% de cancelamentos", sufixo: "%" },
  ]},
  { grupo: "Ajustes", campos: [
    { key: "ajustesAdicionais", label: "Ajustes adicionais (+/-)", sufixo: "R$" },
  ]},
];

function CenarioForm({ cenario, setCenario, representantes }) {
  const set = (campo) => (valor) => setCenario((c) => ({ ...c, [campo]: valor }));
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label style={{ color: COLORS.muted }} className="text-[11.5px] font-medium">Representante</label>
          <select
            value={cenario.representanteId}
            onChange={(e) => set("representanteId")(e.target.value)}
            style={{ borderColor: COLORS.border }}
            className="w-full border rounded-lg px-3 py-2 text-[13px] outline-none mt-1"
          >
            {representantes.map((r) => <option key={r.id} value={r.id}>{r.nomeCompleto}</option>)}
          </select>
        </div>
        <CampoTexto label="Período" value={cenario.periodo} onChange={set("periodo")} placeholder="Ex.: Setembro/2026" />
      </div>
      {CAMPOS_CENARIO.map((g) => (
        <div key={g.grupo}>
          <h4 style={{ color: COLORS.text }} className="text-[12.5px] font-semibold mb-2">{g.grupo}</h4>
          <div className="grid grid-cols-2 gap-3">
            {g.campos.map((c) => (
              <CampoTexto key={c.key} label={c.label} type="number" value={cenario[c.key]} onChange={set(c.key)} suffix={c.sufixo} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MetricaResultado({ label, value, muted }) {
  return (
    <div>
      <div style={{ color: COLORS.muted }} className="text-[11px]">{label}</div>
      <div style={{ color: muted ? COLORS.muted : COLORS.text }} className="text-[13.5px] font-semibold">{value}</div>
    </div>
  );
}

function MemoriaCalculo({ resultado }) {
  return (
    <div className="flex flex-col gap-1.5">
      {resultado.linhas.map((l, i) => (
        <div key={i} className={`flex items-center justify-between gap-3 ${l.cabecalho ? "mt-1" : ""}`}>
          <span style={{ color: l.cabecalho ? COLORS.text : COLORS.muted }} className={`text-[12px] ${l.cabecalho ? "font-semibold" : ""}`}>
            {l.regraLabel && !l.cabecalho && !l.descricao.startsWith("　") ? `${l.regraLabel} — ` : ""}{l.descricao}
          </span>
          {l.valor != null && <span style={{ color: COLORS.text }} className="text-[12px] font-medium shrink-0">{fmtBRL(l.valor)}</span>}
        </div>
      ))}
      {resultado.pisoAplicado && (
        <div className="flex items-center gap-1.5 mt-1" style={{ color: COLORS.amber }}>
          <Info size={12} /><span className="text-[12px]">Garantia mínima aplicada — valor elevado até o piso configurado.</span>
        </div>
      )}
      {resultado.tetoAplicado && (
        <div className="flex items-center gap-1.5 mt-1" style={{ color: COLORS.amber }}>
          <Info size={12} /><span className="text-[12px]">Teto máximo aplicado — valor limitado ao teto configurado.</span>
        </div>
      )}
    </div>
  );
}

function ResultadoCondicao({ condicao, resultado, destaque }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div style={{ borderColor: destaque ? COLORS.primary : COLORS.border, background: COLORS.surface }} className={`border rounded-xl p-4 ${destaque ? "ring-1 ring-[#003060]" : ""}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div style={{ color: COLORS.text }} className="text-[14px] font-semibold">{condicao.nome}</div>
          <StatusBadge status={condicao.status} styles={STATUS_CONDICAO_STYLES} />
        </div>
        {destaque && <span style={{ background: "#E7EEFB", color: COLORS.primaryDeep }} className="text-[11px] font-medium px-2 py-1 rounded-md flex items-center gap-1"><Award size={12} /> {destaque}</span>}
      </div>

      <div style={{ color: COLORS.muted }} className="text-[11.5px]">Comissão líquida do representante</div>
      <div style={{ color: COLORS.emerald }} className="text-[24px] font-semibold tracking-tight mb-3">{fmtBRL(resultado.liquida)}</div>

      <div className="grid grid-cols-3 gap-y-2.5 mb-3">
        <MetricaResultado label="Fixa" value={fmtBRL(resultado.fixa)} />
        <MetricaResultado label="Variável" value={fmtBRL(resultado.variavel)} />
        <MetricaResultado label="Recorrente" value={fmtBRL(resultado.recorrente)} />
        <MetricaResultado label="Bônus" value={fmtBRL(resultado.bonus)} />
        <MetricaResultado label="Acelerador" value={fmtBRL(resultado.acelerador)} />
        <MetricaResultado label="Ajuda de custo" value={fmtBRL(resultado.ajudaCusto)} />
        <MetricaResultado label="Comissão bruta" value={fmtBRL(resultado.bruta)} />
        <MetricaResultado label="Estornos" value={`− ${fmtBRL(resultado.estornos)}`} />
        <MetricaResultado label="Ajustes" value={fmtBRL(resultado.ajuste)} />
      </div>

      <div style={{ borderColor: COLORS.border }} className="border-t pt-3 grid grid-cols-2 gap-y-2.5">
        <MetricaResultado label="Receita estimada Wiwap" value={fmtBRL(resultado.receitaRecebida)} muted />
        <MetricaResultado label="Margem após comissão" value={fmtBRL(resultado.margem)} muted />
        <MetricaResultado label="Comissão / receita" value={fmtPct(resultado.comissaoPctReceita.toFixed(1))} muted />
        <MetricaResultado label="Retorno estimado" value={fmtPct(resultado.retornoEstimado.toFixed(0))} muted />
        <MetricaResultado label="Custo por loja" value={fmtBRL(resultado.custoPorLoja)} muted />
        <MetricaResultado label="Custo por venda" value={fmtBRL(resultado.custoPorVenda)} muted />
      </div>

      <button onClick={() => setAberto((v) => !v)} style={{ color: COLORS.primaryDeep }} className="flex items-center gap-1.5 text-[12px] font-medium mt-3">
        <ChevronDown size={13} style={{ transform: aberto ? "rotate(180deg)" : "none" }} />
        Memória de cálculo
      </button>
      {aberto && (
        <div style={{ background: "#FCFCFC", borderColor: COLORS.border }} className="border rounded-lg p-3 mt-2">
          <MemoriaCalculo resultado={resultado} />
        </div>
      )}
    </div>
  );
}

function SimuladorView({ condicoes, representantes, parametros }) {
  const [cenario, setCenario] = useState(() => cenarioPadrao(parametros, representantes));
  const [selecionadas, setSelecionadas] = useState([condicoes[0]?.id, condicoes[1]?.id].filter(Boolean));
  const [salvas, setSalvas] = useState([]);

  const toggleCondicao = (id) => {
    setSelecionadas((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const resultados = useMemo(
    () => selecionadas.map((id) => {
      const condicao = condicoes.find((c) => c.id === id);
      return { condicao, resultado: calcularComissao(condicao, cenario) };
    }),
    [selecionadas, condicoes, cenario]
  );

  const destaques = useMemo(() => {
    if (resultados.length < 2) return {};
    const maiorRemuneracao = resultados.reduce((a, b) => (b.resultado.liquida > a.resultado.liquida ? b : a));
    const menorCusto = resultados.reduce((a, b) => (b.resultado.liquida < a.resultado.liquida ? b : a));
    const maxLiquida = Math.max(...resultados.map((r) => r.resultado.liquida)) || 1;
    const maxMargem = Math.max(...resultados.map((r) => r.resultado.margem)) || 1;
    let melhorEquilibrio = resultados[0], melhorScore = -Infinity;
    resultados.forEach((r) => {
      const score = (r.resultado.liquida / maxLiquida) * 0.5 + (r.resultado.margem / maxMargem) * 0.5;
      if (score > melhorScore) { melhorScore = score; melhorEquilibrio = r; }
    });
    return {
      [maiorRemuneracao.condicao.id]: "Maior remuneração",
      [menorCusto.condicao.id]: "Menor custo p/ Wiwap",
      [melhorEquilibrio.condicao.id]: "Melhor equilíbrio",
    };
  }, [resultados]);

  const salvarSimulacao = () => {
    setSalvas((prev) => [
      { id: `sim_${Date.now()}`, nome: `Simulação · ${cenario.periodo}`, cenario: { ...cenario }, selecionadas: [...selecionadas], criadaEm: new Date().toLocaleString("pt-BR") },
      ...prev,
    ]);
  };
  const carregarSimulacao = (s) => { setCenario(s.cenario); setSelecionadas(s.selecionadas); };
  const duplicarSimulacao = (s) => {
    setSalvas((prev) => [{ ...s, id: `sim_${Date.now()}`, nome: `${s.nome} (cópia)`, criadaEm: new Date().toLocaleString("pt-BR") }, ...prev]);
  };

  return (
    <div className="flex flex-col gap-5">
      <div style={{ borderColor: COLORS.border, background: "#F4F5F7" }} className="border rounded-xl px-4 py-3 flex items-start gap-2.5">
        <Sparkles size={16} style={{ color: COLORS.primaryDeep }} className="mt-0.5 shrink-0" />
        <p style={{ color: COLORS.text }} className="text-[12.5px] leading-relaxed">
          O simulador roda o mesmo motor de cálculo que processará as vendas reais no fechamento mensal — aqui, os números do cenário
          são digitados manualmente para testar uma condição antes de aprová-la. Selecione até três condições para comparar lado a lado.
        </p>
      </div>

      <div className="grid lg:grid-cols-[340px_1fr] gap-5 items-start">
        <div style={{ borderColor: COLORS.border, background: COLORS.surface }} className="border rounded-xl p-5">
          <h3 style={{ color: COLORS.text }} className="text-[14px] font-semibold mb-4">Cenário</h3>
          <CenarioForm cenario={cenario} setCenario={setCenario} representantes={representantes} />
          <div className="flex gap-2 mt-5 print:hidden">
            <button onClick={salvarSimulacao} style={{ background: COLORS.primary }} className="flex-1 flex items-center justify-center gap-1.5 text-white text-[12.5px] font-medium px-3 py-2 rounded-lg">
              <Save size={14} /> Salvar simulação
            </button>
            <button onClick={() => window.print()} title="Imprimir / exportar em PDF pela caixa de impressão do navegador" style={{ borderColor: COLORS.border, color: COLORS.text }} className="border px-3 py-2 rounded-lg">
              <Printer size={14} />
            </button>
          </div>

          {salvas.length > 0 && (
            <div className="mt-5 print:hidden">
              <h4 style={{ color: COLORS.text }} className="text-[12.5px] font-semibold mb-2">Simulações salvas</h4>
              <div className="flex flex-col gap-1.5">
                {salvas.map((s) => (
                  <div key={s.id} style={{ borderColor: COLORS.border }} className="border rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                    <button onClick={() => carregarSimulacao(s)} className="text-left min-w-0">
                      <div style={{ color: COLORS.text }} className="text-[12px] font-medium truncate">{s.nome}</div>
                      <div style={{ color: COLORS.muted }} className="text-[10.5px]">{s.criadaEm}</div>
                    </button>
                    <button onClick={() => duplicarSimulacao(s)} title="Duplicar" style={{ color: COLORS.muted }} className="shrink-0"><Copy size={13} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <span style={{ color: COLORS.muted }} className="text-[12px]">Comparar:</span>
            {condicoes.map((c) => (
              <button
                key={c.id}
                onClick={() => toggleCondicao(c.id)}
                style={selecionadas.includes(c.id) ? { background: COLORS.primary, color: "white" } : { borderColor: COLORS.border, color: COLORS.text }}
                className={`text-[12px] font-medium px-2.5 py-1.5 rounded-lg ${selecionadas.includes(c.id) ? "" : "border"}`}
              >
                {c.nome}
              </button>
            ))}
          </div>

          {resultados.length > 1 && (
            <div className="grid sm:grid-cols-3 gap-3 print:hidden">
              <div style={{ borderColor: COLORS.border, background: COLORS.surface }} className="border rounded-lg p-3 flex items-center gap-2.5">
                <Award size={15} style={{ color: COLORS.emerald }} />
                <div>
                  <div style={{ color: COLORS.muted }} className="text-[10.5px]">Maior remuneração</div>
                  <div style={{ color: COLORS.text }} className="text-[12.5px] font-medium">{resultados.find((r) => destaques[r.condicao.id] === "Maior remuneração")?.condicao.nome}</div>
                </div>
              </div>
              <div style={{ borderColor: COLORS.border, background: COLORS.surface }} className="border rounded-lg p-3 flex items-center gap-2.5">
                <Scale size={15} style={{ color: COLORS.primaryDeep }} />
                <div>
                  <div style={{ color: COLORS.muted }} className="text-[10.5px]">Menor custo p/ Wiwap</div>
                  <div style={{ color: COLORS.text }} className="text-[12.5px] font-medium">{resultados.find((r) => destaques[r.condicao.id] === "Menor custo p/ Wiwap")?.condicao.nome}</div>
                </div>
              </div>
              <div style={{ borderColor: COLORS.border, background: COLORS.surface }} className="border rounded-lg p-3 flex items-center gap-2.5">
                <Layers size={15} style={{ color: COLORS.amber }} />
                <div>
                  <div style={{ color: COLORS.muted }} className="text-[10.5px]">Melhor equilíbrio</div>
                  <div style={{ color: COLORS.text }} className="text-[12.5px] font-medium">{resultados.find((r) => destaques[r.condicao.id] === "Melhor equilíbrio")?.condicao.nome}</div>
                </div>
              </div>
            </div>
          )}

          <div className={`grid gap-4 ${resultados.length > 1 ? "sm:grid-cols-2" : ""}`}>
            {resultados.map(({ condicao, resultado }) => (
              <ResultadoCondicao key={condicao.id} condicao={condicao} resultado={resultado} destaque={destaques[condicao.id]} />
            ))}
            {resultados.length === 0 && (
              <div style={{ color: COLORS.muted }} className="text-[13px] py-16 text-center border rounded-xl" >Selecione ao menos uma condição comercial para simular.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   FECHAMENTO MENSAL
   Cada fechamento agrega as vendas elegíveis de um representante numa
   competência, monta um "cenário" a partir de dados reais (em vez de
   digitados) e roda o mesmo motor de cálculo do simulador. O resultado
   percorre o workflow de status do item 13 do escopo.
============================================================================ */

const STATUS_FECHAMENTO_ORDER = [
  "em_processamento", "em_conferencia", "aguardando_representante", "em_contestacao",
  "aguardando_aprovacao", "aguardando_nota_fiscal", "programado", "pago", "encerrado",
];
const STATUS_FECHAMENTO_STYLES = {
  em_processamento: { bg: "#F4F5F7", fg: "#5B6472", label: "Em processamento" },
  em_conferencia: { bg: "#E7EEFB", fg: "#00223F", label: "Em conferência" },
  aguardando_representante: { bg: "#FEF3C7", fg: "#B45309", label: "Aguardando representante" },
  em_contestacao: { bg: "#FDECEC", fg: "#B91C1C", label: "Em contestação" },
  aguardando_aprovacao: { bg: "#FEF3C7", fg: "#B45309", label: "Aguardando aprovação" },
  aguardando_nota_fiscal: { bg: "#E7EEFB", fg: "#00223F", label: "Aguardando nota fiscal" },
  programado: { bg: "#E7EEFB", fg: "#00223F", label: "Programado" },
  pago: { bg: "#E9F7EF", fg: "#15803D", label: "Pago" },
  encerrado: { bg: "#F4F5F7", fg: "#69707D", label: "Encerrado" },
};

// Simplificação assumida para a demonstração: como o cadastro de vendas não
// registra data de credenciamento/ativação por competência, novasLojas e
// lojasAtivadas entram como parâmetros configuráveis (zerados aqui) em vez
// de serem derivados — no motor real, viriam da tabela de histórico de lojas.
function agregarCenarioDeVendas(representanteId, competencia, vendas, lojas) {
  const vendasRep = vendas.filter((v) => v.representanteId === representanteId && v.competencia === competencia);
  const elegiveis = vendasRep.filter((v) => v.elegivelComissao);
  const volumeTotal = elegiveis.reduce((a, v) => a + v.valorFinanciado, 0);
  const receitaGerada = elegiveis.reduce((a, v) => a + v.receitaGerada, 0);
  const valorRecebido = elegiveis.reduce((a, v) => a + v.valorRecebido, 0);
  const lojasProdutivas = new Set(elegiveis.map((v) => v.lojaId)).size;
  const comProblema = vendasRep.filter((v) => v.cancelamento || v.estorno).length;
  const inadimplentes = vendasRep.filter((v) => v.inadimplencia).length;

  return {
    representanteId, periodo: competencia,
    qtdLojasCarteira: lojas.filter((l) => l.representanteAtualId === representanteId).length,
    novasLojas: 0, lojasAtivadas: 0, lojasReativadas: 0,
    lojasProdutivas, qtdVendas: elegiveis.length, volumeTotal,
    ticketMedio: elegiveis.length ? volumeTotal / elegiveis.length : 0,
    receitaSetup: 0, receitaMensalidades: 0, outrasReceitas: receitaGerada,
    percentualRecebimento: receitaGerada > 0 ? (valorRecebido / receitaGerada) * 100 : 0,
    percentualInadimplencia: vendasRep.length ? (inadimplentes / vendasRep.length) * 100 : 0,
    cancelamentosPct: vendasRep.length ? (comProblema / vendasRep.length) * 100 : 0,
    metaPrevista: 150000, ajustesAdicionais: 0,
    vendasRelacionadas: vendasRep,
  };
}

function gerarFechamentosIniciais() {
  const competencia = "Agosto/2026";
  const atribuicaoCondicao = { rep1: "cond1", rep2: "cond2", rep3: "cond3", rep4: "cond2", rep5: "cond1" };
  const statusDemo = { rep1: "pago", rep2: "aguardando_nota_fiscal", rep3: "em_contestacao", rep4: "aguardando_representante", rep5: "em_conferencia" };

  return REPRESENTANTES.map((rep) => {
    const status = statusDemo[rep.id] || "em_processamento";
    const condicaoId = atribuicaoCondicao[rep.id];
    const idxAlvo = STATUS_FECHAMENTO_ORDER.indexOf(status);
    const historicoStatus = STATUS_FECHAMENTO_ORDER.slice(0, idxAlvo + 1).map((s, i) => ({
      status: s, data: `0${i + 1}/09/2026`, usuario: i < 2 ? "Sistema" : i === 2 ? "Renata Salgado" : "Marcos Teixeira",
    }));
    const contestacoes = status === "em_contestacao" ? [{
      id: "cont1", competencia, motivo: "Venda não considerada na apuração",
      lojaOuVenda: "VD-20003", valorQuestionado: 480, descricao: "A venda VD-20003 foi formalizada dentro da competência mas não apareceu na apuração.",
      anexo: "comprovante_venda.pdf", status: "aberta",
    }] : [];
    return {
      id: `fech_${rep.id}_${competencia.replace("/", "")}`,
      competencia, representanteId: rep.id, condicaoId, status, historicoStatus, contestacoes,
      numeroNF: status === "pago" ? "NF-000482" : null,
      dataPagamento: status === "pago" ? "10/09/2026" : null,
    };
  });
}

function TimelineFechamento({ status }) {
  const idxAtual = STATUS_FECHAMENTO_ORDER.indexOf(status);
  return (
    <div className="flex items-center overflow-x-auto pb-1">
      {STATUS_FECHAMENTO_ORDER.map((s, i) => {
        const concluido = i < idxAtual;
        const atual = i === idxAtual;
        return (
          <div key={s} className="flex items-center shrink-0">
            <div className="flex flex-col items-center gap-1">
              <div
                style={{
                  background: concluido ? COLORS.emerald : atual ? COLORS.primary : "#DADADA",
                  color: concluido || atual ? "white" : COLORS.muted,
                }}
                className="h-6 w-6 rounded-full flex items-center justify-center text-[10.5px] font-semibold"
              >
                {concluido ? <Check size={12} /> : i + 1}
              </div>
              <span style={{ color: atual ? COLORS.text : COLORS.muted }} className={`text-[9.5px] text-center w-[76px] ${atual ? "font-semibold" : ""}`}>
                {STATUS_FECHAMENTO_STYLES[s].label}
              </span>
            </div>
            {i < STATUS_FECHAMENTO_ORDER.length - 1 && (
              <div style={{ background: concluido ? COLORS.emerald : "#DADADA" }} className="h-[2px] w-6 mb-4" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ContestacaoModal({ vendasRelacionadas, onClose, onEnviar }) {
  const [lojaOuVenda, setLojaOuVenda] = useState(vendasRelacionadas[0]?.codigo || "");
  const [motivo, setMotivo] = useState("");
  const [valorQuestionado, setValorQuestionado] = useState("");
  const [descricao, setDescricao] = useState("");
  const [anexo, setAnexo] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[#141D2E]/40" onClick={onClose} />
      <div style={{ background: COLORS.surface }} className="relative w-full max-w-[440px] rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ color: COLORS.text }} className="text-[16px] font-semibold flex items-center gap-2"><MessageSquareWarning size={17} /> Abrir contestação</h3>
          <button onClick={onClose} style={{ color: COLORS.muted }}><X size={18} /></button>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label style={{ color: COLORS.muted }} className="text-[11.5px] font-medium">Loja ou venda relacionada</label>
            <select value={lojaOuVenda} onChange={(e) => setLojaOuVenda(e.target.value)} style={{ borderColor: COLORS.border }} className="w-full border rounded-lg px-3 py-2 text-[13px] outline-none mt-1">
              {vendasRelacionadas.map((v) => <option key={v.id} value={v.codigo}>{v.codigo} · {fmtBRL(v.valorFinanciado)}</option>)}
              {vendasRelacionadas.length === 0 && <option value="">Nenhuma venda na competência</option>}
            </select>
          </div>
          <CampoTexto label="Motivo" value={motivo} onChange={setMotivo} placeholder="Ex.: venda não considerada na apuração" />
          <CampoTexto label="Valor questionado" type="number" value={valorQuestionado} onChange={setValorQuestionado} suffix="R$" />
          <div>
            <label style={{ color: COLORS.muted }} className="text-[11.5px] font-medium">Descrição</label>
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} style={{ borderColor: COLORS.border }} className="w-full border rounded-lg px-3 py-2 text-[13px] outline-none mt-1 resize-none" />
          </div>
          <label style={{ borderColor: COLORS.border }} className="border border-dashed rounded-lg flex items-center justify-center gap-2 py-3 cursor-pointer">
            <Paperclip size={14} style={{ color: COLORS.muted }} />
            <span style={{ color: COLORS.muted }} className="text-[12px]">{anexo || "Anexar comprovante"}</span>
            <input type="file" className="hidden" onChange={(e) => setAnexo(e.target.files[0]?.name || "")} />
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} style={{ color: COLORS.text }} className="text-[13px] font-medium px-3.5 py-2">Cancelar</button>
          <button
            disabled={!motivo}
            onClick={() => onEnviar({ id: `cont_${Date.now()}`, motivo, lojaOuVenda, valorQuestionado, descricao, anexo, status: "aberta" })}
            style={{ background: motivo ? COLORS.primary : "#ADC6E7" }}
            className="text-white text-[13px] font-medium px-4 py-2 rounded-lg"
          >
            Enviar contestação
          </button>
        </div>
      </div>
    </div>
  );
}

function FechamentoDetalhe({ fechamento, api, recarregar, representante, user, registrarLog, onClose }) {
  const [contestando, setContestando] = useState(false);
  const [erro, setErro] = useState("");
  const resultado = fechamento.resultado;
  const vendasNaCompetencia = fechamento.vendasNaCompetencia || [];
  const qtdVendasElegiveis = vendasNaCompetencia.filter((v) => v.elegivelComissao).length;

  const avancar = async (novoStatusEsperado, extra = {}) => {
    setErro("");
    try {
      await api.avancarFechamento(fechamento.id, extra);
      registrarLog?.("Mudança de status", `Fechamento · ${representante?.nomeCompleto}`, `${STATUS_FECHAMENTO_STYLES[fechamento.status]?.label} → ${STATUS_FECHAMENTO_STYLES[novoStatusEsperado]?.label}`);
      await recarregar();
    } catch (e) {
      setErro(e.message);
    }
  };

  const podeGestor = ["administrador", "gestor"].includes(user.perfil);
  const podeFinanceiro = ["administrador", "financeiro"].includes(user.perfil);
  const podeDiretoria = ["administrador", "diretoria"].includes(user.perfil);
  const podeRepresentante = user.perfil === "representante" && user.representanteId === fechamento.representanteId;
  const [numeroNF, setNumeroNF] = useState("");

  return (
    <div className="fixed inset-0 z-30 flex justify-end">
      <div className="absolute inset-0 bg-[#141D2E]/30" onClick={onClose} />
      <div style={{ background: COLORS.surface }} className="relative w-full max-w-[560px] h-full overflow-y-auto shadow-2xl">
        <div style={{ borderColor: COLORS.border }} className="border-b px-6 py-5 sticky top-0 bg-white z-10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 style={{ color: COLORS.text }} className="text-[17px] font-semibold">{representante?.nomeCompleto}</h2>
              <p style={{ color: COLORS.muted }} className="text-[12.5px] mt-0.5">{fechamento.competencia} · {fechamento.condicao?.nome}</p>
            </div>
            <button onClick={onClose} style={{ color: COLORS.muted }} className="p-1.5 hover:bg-[#141D2E]/5 rounded-md"><X size={18} /></button>
          </div>
          <TimelineFechamento status={fechamento.status} />
        </div>

        <div className="p-6 flex flex-col gap-5">
          {erro && <div style={{ background: "#FDECEC", color: COLORS.rose }} className="text-[12.5px] rounded-lg px-3 py-2.5">{erro}</div>}
          {resultado && (
            <div style={{ borderColor: COLORS.border, background: COLORS.surface }} className="border rounded-xl p-4">
              <div style={{ color: COLORS.muted }} className="text-[11.5px]">Comissão apurada</div>
              <div style={{ color: COLORS.emerald }} className="text-[24px] font-semibold tracking-tight mb-3">{fmtBRL(resultado.liquida)}</div>
              <div className="grid grid-cols-3 gap-y-2.5 mb-1">
                <MetricaResultado label="Fixa" value={fmtBRL(resultado.fixa)} />
                <MetricaResultado label="Variável" value={fmtBRL(resultado.variavel)} />
                <MetricaResultado label="Recorrente" value={fmtBRL(resultado.recorrente)} />
                <MetricaResultado label="Bônus" value={fmtBRL(resultado.bonus)} />
                <MetricaResultado label="Estornos" value={`− ${fmtBRL(resultado.estornos)}`} />
                <MetricaResultado label="Vendas elegíveis" value={qtdVendasElegiveis} />
              </div>
              <details className="mt-2">
                <summary style={{ color: COLORS.primaryDeep }} className="text-[12px] font-medium cursor-pointer">Memória de cálculo</summary>
                <div className="mt-2"><MemoriaCalculo resultado={resultado} /></div>
              </details>
            </div>
          )}

          {fechamento.contestacoes.length > 0 && (
            <div>
              <h4 style={{ color: COLORS.text }} className="text-[13.5px] font-semibold mb-2">Contestações</h4>
              {fechamento.contestacoes.map((c) => (
                <div key={c.id} style={{ borderColor: "#E8730A", background: "#FEF3C7" }} className="border rounded-lg p-3.5">
                  <div style={{ color: COLORS.text }} className="text-[13px] font-medium">{c.motivo}</div>
                  <div style={{ color: COLORS.muted }} className="text-[12px] mt-1">{c.lojaOuVenda} · {c.valorQuestionado ? fmtBRL(Number(c.valorQuestionado)) : "—"}</div>
                  <p style={{ color: COLORS.text }} className="text-[12.5px] mt-1.5 leading-relaxed">{c.descricao}</p>
                  {c.anexo && <div style={{ color: COLORS.muted }} className="text-[11.5px] mt-1.5 flex items-center gap-1"><Paperclip size={11} /> {c.anexo}</div>}
                </div>
              ))}
            </div>
          )}

          <div>
            <h4 style={{ color: COLORS.text }} className="text-[13.5px] font-semibold mb-2">Ações</h4>
            <div className="flex flex-wrap gap-2">
              {fechamento.status === "em_processamento" && podeGestor && (
                <button onClick={() => avancar("em_conferencia")} style={{ background: COLORS.primary }} className="text-white text-[12.5px] font-medium px-3.5 py-2 rounded-lg">Concluir apuração</button>
              )}
              {fechamento.status === "em_conferencia" && podeGestor && (
                <button onClick={() => avancar("aguardando_representante")} style={{ background: COLORS.primary }} className="text-white text-[12.5px] font-medium px-3.5 py-2 rounded-lg">Disponibilizar para o representante</button>
              )}
              {fechamento.status === "aguardando_representante" && (podeRepresentante || podeGestor) && (
                <>
                  <button onClick={() => avancar("aguardando_aprovacao")} style={{ background: COLORS.emerald }} className="text-white text-[12.5px] font-medium px-3.5 py-2 rounded-lg">
                    {podeRepresentante ? "Aprovar meu fechamento" : "Registrar aprovação do representante"}
                  </button>
                  <button onClick={() => setContestando(true)} style={{ borderColor: COLORS.rose, color: COLORS.rose }} className="border text-[12.5px] font-medium px-3.5 py-2 rounded-lg flex items-center gap-1.5">
                    <MessageSquareWarning size={14} /> Contestar
                  </button>
                </>
              )}
              {fechamento.status === "em_contestacao" && (podeGestor || podeFinanceiro) && (
                <button onClick={() => avancar("aguardando_aprovacao")} style={{ background: COLORS.primary }} className="text-white text-[12.5px] font-medium px-3.5 py-2 rounded-lg">Concluir análise da contestação</button>
              )}
              {fechamento.status === "aguardando_aprovacao" && (podeDiretoria || podeFinanceiro) && (
                <button onClick={() => avancar("aguardando_nota_fiscal")} style={{ background: COLORS.emerald }} className="text-white text-[12.5px] font-medium px-3.5 py-2 rounded-lg flex items-center gap-1.5"><Check size={14} /> Aprovar fechamento</button>
              )}
              {fechamento.status === "aguardando_nota_fiscal" && podeFinanceiro && (
                <div className="flex items-center gap-2">
                  <input value={numeroNF} onChange={(e) => setNumeroNF(e.target.value)} placeholder="Número da NF" style={{ borderColor: COLORS.border }} className="border rounded-lg px-3 py-2 text-[12.5px] outline-none w-[140px]" />
                  <button disabled={!numeroNF} onClick={() => avancar("programado", { numeroNF })} style={{ background: numeroNF ? COLORS.primary : "#ADC6E7" }} className="text-white text-[12.5px] font-medium px-3.5 py-2 rounded-lg">Registrar nota fiscal</button>
                </div>
              )}
              {fechamento.status === "programado" && podeFinanceiro && (
                <button onClick={() => avancar("pago", { dataPagamento: new Date().toLocaleDateString("pt-BR") })} style={{ background: COLORS.emerald }} className="text-white text-[12.5px] font-medium px-3.5 py-2 rounded-lg">Confirmar pagamento</button>
              )}
              {fechamento.status === "pago" && (podeFinanceiro || user.perfil === "administrador") && (
                <button onClick={() => avancar("encerrado")} style={{ borderColor: COLORS.border, color: COLORS.text }} className="border text-[12.5px] font-medium px-3.5 py-2 rounded-lg">Encerrar competência</button>
              )}
              {fechamento.status === "encerrado" && (
                <p style={{ color: COLORS.muted }} className="text-[12.5px] flex items-center gap-1.5"><Lock size={13} /> Competência encerrada — alterações exigem reabertura formal e registro em auditoria.</p>
              )}
              {!podeGestor && !podeFinanceiro && !podeDiretoria && !podeRepresentante && (
                <p style={{ color: COLORS.muted }} className="text-[12.5px]">Seu perfil não tem ações disponíveis nesta etapa.</p>
              )}
            </div>
          </div>

          <div>
            <h4 style={{ color: COLORS.text }} className="text-[13.5px] font-semibold mb-2">Histórico</h4>
            <div className="flex flex-col gap-1.5">
              {fechamento.historico.slice().reverse().map((h, i) => (
                <div key={h.id || i} className="flex items-center justify-between text-[12px]">
                  <span style={{ color: COLORS.text }}>{STATUS_FECHAMENTO_STYLES[h.status].label}</span>
                  <span style={{ color: COLORS.muted }}>{new Date(h.data).toLocaleString("pt-BR")} · {h.usuario}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {contestando && (
          <ContestacaoModal
            vendasRelacionadas={vendasNaCompetencia}
            onClose={() => setContestando(false)}
            onEnviar={async (c) => {
              setErro("");
              try {
                await api.contestarFechamento(fechamento.id, c);
                registrarLog?.("Contestação aberta", `Fechamento · ${representante?.nomeCompleto}`, c.motivo);
                await recarregar();
              } catch (e) {
                setErro(e.message);
              }
              setContestando(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

function FechamentosView({ fechamentos, api, recarregar, representantes, user, registrarLog }) {
  const isRep = user.perfil === "representante";
  const [aberto, setAberto] = useState(null);
  const visiveis = isRep ? fechamentos.filter((f) => f.representanteId === user.representanteId) : fechamentos;

  return (
    <div className="flex flex-col gap-4">
      <div style={{ borderColor: COLORS.border, background: "#F4F5F7", color: COLORS.text }} className="border rounded-xl px-4 py-3 text-[12.5px]">
        Competência de referência: <strong>Agosto/2026</strong>. Cada card agrega as vendas elegíveis do representante no período e aplica a condição comercial vigente — o mesmo motor usado no simulador.
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {visiveis.map((f) => {
          const rep = f.representante || representantes.find((r) => r.id === f.representanteId);
          const qtdElegiveis = (f.vendasNaCompetencia || []).filter((v) => v.elegivelComissao).length;
          return (
            <button key={f.id} onClick={() => setAberto(f)} style={{ borderColor: COLORS.border, background: COLORS.surface }} className="text-left border rounded-xl p-4 hover:border-[#ADC6E7] transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div style={{ color: COLORS.text }} className="text-[14px] font-semibold">{rep?.nomeCompleto}</div>
                  <div style={{ color: COLORS.muted }} className="text-[12px]">{f.condicao?.nome} · {qtdElegiveis} vendas elegíveis</div>
                </div>
                <StatusBadge status={f.status} styles={STATUS_FECHAMENTO_STYLES} />
              </div>
              {f.resultado && <div style={{ color: COLORS.emerald }} className="text-[19px] font-semibold tracking-tight">{fmtBRL(f.resultado.liquida)}</div>}
              {f.contestacoes.length > 0 && (
                <div style={{ color: COLORS.rose }} className="flex items-center gap-1.5 text-[11.5px] mt-2"><MessageSquareWarning size={12} /> {f.contestacoes.length} contestação(ões)</div>
              )}
            </button>
          );
        })}
        {visiveis.length === 0 && (
          <div style={{ color: COLORS.muted }} className="col-span-2 text-center py-16 text-[13px]">Nenhum fechamento nesta competência.</div>
        )}
      </div>

      {aberto && (
        <FechamentoDetalhe
          fechamento={fechamentos.find((f) => f.id === aberto.id) || aberto}
          api={api} recarregar={recarregar}
          representante={representantes.find((r) => r.id === aberto.representanteId)}
          user={user}
          registrarLog={registrarLog}
          onClose={() => setAberto(null)}
        />
      )}
    </div>
  );
}

/* ============================================================================
   METAS E CAMPANHAS
   Sempre que possível, o "realizado" é lido dos mesmos dados de vendas/lojas
   usados no motor de cálculo (reaproveitando agregarCenarioDeVendas) — só os
   tipos sem correspondência direta no cadastro atual (credenciamento,
   ativação, retenção) ficam com apuração manual, sinalizada no cadastro.
============================================================================ */

const METAS_TIPOS = [
  { id: "novas_lojas", label: "Novas lojas credenciadas", unidade: "lojas", manual: true },
  { id: "lojas_ativadas", label: "Lojas ativadas", unidade: "lojas", manual: true },
  { id: "lojas_produtivas", label: "Lojas produtivas", unidade: "lojas" },
  { id: "qtd_contratos", label: "Quantidade de contratos", unidade: "contratos" },
  { id: "volume_originado", label: "Volume originado", unidade: "R$" },
  { id: "receita", label: "Receita", unidade: "R$" },
  { id: "ticket_medio", label: "Ticket médio", unidade: "R$" },
  { id: "taxa_ativacao", label: "Taxa de ativação", unidade: "%" },
  { id: "retencao", label: "Retenção da carteira", unidade: "%", manual: true },
  { id: "inadimplencia", label: "Inadimplência da carteira", unidade: "%", invertido: true },
  { id: "mix_produtos", label: "Mix de produtos", unidade: "produtos distintos" },
];
const metaTipo = (id) => METAS_TIPOS.find((t) => t.id === id);

function valorRealizadoMeta(tipoId, cenario) {
  switch (tipoId) {
    case "lojas_produtivas": return cenario.lojasProdutivas;
    case "qtd_contratos": return cenario.qtdVendas;
    case "volume_originado": return Math.round(cenario.volumeTotal);
    case "receita": return Math.round(cenario.outrasReceitas);
    case "ticket_medio": return Math.round(cenario.ticketMedio);
    case "taxa_ativacao": return cenario.qtdLojasCarteira > 0 ? Math.round((cenario.lojasProdutivas / cenario.qtdLojasCarteira) * 100) : 0;
    case "inadimplencia": return Math.round(cenario.percentualInadimplencia);
    case "mix_produtos": return new Set(cenario.vendasRelacionadas.filter((v) => v.elegivelComissao).map((v) => v.produto)).size;
    default: return null;
  }
}

function gerarMetasIniciais() {
  const competencia = "Agosto/2026";
  const combos = [{ tipoId: "volume_originado", fator: 0.9 }, { tipoId: "lojas_produtivas", fator: 1.15 }, { tipoId: "receita", fator: 0.85 }];
  let idc = 1;
  const metas = [];
  REPRESENTANTES.forEach((rep) => {
    const cenario = agregarCenarioDeVendas(rep.id, competencia, VENDAS_INICIAIS, LOJAS_INICIAIS);
    combos.forEach(({ tipoId, fator }) => {
      const realizado = valorRealizadoMeta(tipoId, cenario) || 0;
      const valorMeta = Math.max(1, Math.round(realizado / fator)) || (tipoId === "lojas_produtivas" ? 6 : 100000);
      metas.push({ id: `meta${idc++}`, representanteId: rep.id, tipoId, periodicidade: "Mensal", competencia, valorMeta, valorRealizadoManual: null });
    });
  });
  return metas;
}

const CAMPANHAS_INICIAIS = [
  {
    id: "camp1", nome: "Campanha Virada de Semestre",
    descricao: "Bônus extra por loja ativada acima da meta no trimestre.",
    tipoBonus: "Valor fixo", valor: 500, elegibilidade: "Todos os representantes",
    dataInicio: "01/07/2026", dataFim: "30/09/2026", status: "ativa",
  },
  {
    id: "camp2", nome: "Campanha Clube Wiwap 3x",
    descricao: "Triplica a comissão recorrente na primeira mensalidade de cada loja que ativar o Clube Wiwap.",
    tipoBonus: "Multiplicador", valor: 3, elegibilidade: "Todos os representantes",
    dataInicio: "01/08/2026", dataFim: "31/10/2026", status: "ativa",
  },
];

function BarraProgresso({ pct }) {
  const cor = pct >= 100 ? COLORS.emerald : pct >= 80 ? COLORS.amber : COLORS.rose;
  return (
    <div style={{ background: "#F4F5F7" }} className="h-1.5 rounded-full overflow-hidden">
      <div style={{ width: `${Math.min(100, pct)}%`, background: cor }} className="h-full rounded-full" />
    </div>
  );
}

function NovaMetaModal({ representantes, competenciaPadrao, onClose, onCriar }) {
  const [dados, setDados] = useState({ representanteId: representantes[0]?.id || "", tipoId: "volume_originado", periodicidade: "Mensal", competencia: competenciaPadrao, valorMeta: "" });
  const set = (campo) => (valor) => setDados((d) => ({ ...d, [campo]: valor }));
  const podeSalvar = dados.representanteId && dados.valorMeta;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[#141D2E]/40" onClick={onClose} />
      <div style={{ background: COLORS.surface }} className="relative w-full max-w-[420px] rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ color: COLORS.text }} className="text-[16px] font-semibold flex items-center gap-2"><Target size={17} /> Nova meta</h3>
          <button onClick={onClose} style={{ color: COLORS.muted }}><X size={18} /></button>
        </div>
        <div className="flex flex-col gap-3.5">
          <div>
            <label style={{ color: COLORS.muted }} className="text-[11.5px] font-medium">Representante</label>
            <select value={dados.representanteId} onChange={(e) => set("representanteId")(e.target.value)} style={{ borderColor: COLORS.border }} className="w-full border rounded-lg px-3 py-2 text-[13px] outline-none mt-1">
              {representantes.map((r) => <option key={r.id} value={r.id}>{r.nomeCompleto}</option>)}
            </select>
          </div>
          <div>
            <label style={{ color: COLORS.muted }} className="text-[11.5px] font-medium">Indicador</label>
            <select value={dados.tipoId} onChange={(e) => set("tipoId")(e.target.value)} style={{ borderColor: COLORS.border }} className="w-full border rounded-lg px-3 py-2 text-[13px] outline-none mt-1">
              {METAS_TIPOS.map((t) => <option key={t.id} value={t.id}>{t.label}{t.manual ? " (apuração manual)" : ""}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <CampoSelect label="Periodicidade" value={dados.periodicidade} onChange={set("periodicidade")} options={["Mensal", "Trimestral", "Anual"]} />
            <CampoTexto label="Competência" value={dados.competencia} onChange={set("competencia")} placeholder="Ex.: Agosto/2026" />
          </div>
          <CampoTexto label={`Valor da meta (${metaTipo(dados.tipoId).unidade})`} type="number" value={dados.valorMeta} onChange={set("valorMeta")} />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} style={{ color: COLORS.text }} className="text-[13px] font-medium px-3.5 py-2">Cancelar</button>
          <button
            disabled={!podeSalvar}
            onClick={() => onCriar({ id: `meta_${Math.random().toString(36).slice(2, 8)}`, ...dados, valorMeta: Number(dados.valorMeta), valorRealizadoManual: null })}
            style={{ background: podeSalvar ? COLORS.primary : "#ADC6E7" }}
            className="text-white text-[13px] font-medium px-4 py-2 rounded-lg"
          >
            Criar meta
          </button>
        </div>
      </div>
    </div>
  );
}

function NovaCampanhaModal({ onClose, onCriar }) {
  const [dados, setDados] = useState({ nome: "", descricao: "", tipoBonus: "Valor fixo", valor: "", elegibilidade: "Todos os representantes", dataInicio: "", dataFim: "" });
  const set = (campo) => (valor) => setDados((d) => ({ ...d, [campo]: valor }));
  const podeSalvar = dados.nome && dados.valor && dados.dataInicio;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[#141D2E]/40" onClick={onClose} />
      <div style={{ background: COLORS.surface }} className="relative w-full max-w-[420px] rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ color: COLORS.text }} className="text-[16px] font-semibold flex items-center gap-2"><Sparkles size={17} /> Nova campanha</h3>
          <button onClick={onClose} style={{ color: COLORS.muted }}><X size={18} /></button>
        </div>
        <div className="flex flex-col gap-3.5">
          <CampoTexto label="Nome da campanha" value={dados.nome} onChange={set("nome")} />
          <div>
            <label style={{ color: COLORS.muted }} className="text-[11.5px] font-medium">Descrição</label>
            <textarea value={dados.descricao} onChange={(e) => set("descricao")(e.target.value)} rows={2} style={{ borderColor: COLORS.border }} className="w-full border rounded-lg px-3 py-2 text-[13px] outline-none mt-1 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <CampoSelect label="Tipo de bônus" value={dados.tipoBonus} onChange={set("tipoBonus")} options={["Valor fixo", "Percentual", "Multiplicador"]} />
            <CampoTexto label="Valor" type="number" value={dados.valor} onChange={set("valor")} suffix={dados.tipoBonus === "Multiplicador" ? "x" : dados.tipoBonus === "Percentual" ? "%" : "R$"} />
          </div>
          <CampoTexto label="Elegibilidade" value={dados.elegibilidade} onChange={set("elegibilidade")} />
          <div className="grid grid-cols-2 gap-3">
            <CampoTexto label="Início" type="date" value={dados.dataInicio} onChange={set("dataInicio")} />
            <CampoTexto label="Fim" type="date" value={dados.dataFim} onChange={set("dataFim")} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} style={{ color: COLORS.text }} className="text-[13px] font-medium px-3.5 py-2">Cancelar</button>
          <button
            disabled={!podeSalvar}
            onClick={() => onCriar({ id: `camp_${Math.random().toString(36).slice(2, 8)}`, ...dados, valor: Number(dados.valor), status: "ativa" })}
            style={{ background: podeSalvar ? COLORS.primary : "#ADC6E7" }}
            className="text-white text-[13px] font-medium px-4 py-2 rounded-lg"
          >
            Criar campanha
          </button>
        </div>
      </div>
    </div>
  );
}

function MetaCard({ meta, representante, vendas, lojas, podeEditar, onAtualizarRealizado }) {
  const tipo = metaTipo(meta.tipoId);
  const cenario = useMemo(() => agregarCenarioDeVendas(meta.representanteId, meta.competencia, vendas, lojas), [meta, vendas, lojas]);
  const automatico = valorRealizadoMeta(meta.tipoId, cenario);
  const realizado = tipo.manual ? (meta.valorRealizadoManual ?? 0) : automatico;
  const pct = meta.valorMeta > 0 ? (tipo.invertido ? (meta.valorMeta / Math.max(realizado, 1)) * 100 : (realizado / meta.valorMeta) * 100) : 0;
  const fmt = (v) => (tipo.unidade === "R$" ? fmtBRL(v) : tipo.unidade === "%" ? `${v}%` : `${v} ${tipo.unidade}`);

  return (
    <div style={{ borderColor: COLORS.border, background: COLORS.surface }} className="border rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div style={{ color: COLORS.text }} className="text-[13.5px] font-semibold">{tipo.label}</div>
          <div style={{ color: COLORS.muted }} className="text-[12px]">{representante?.nomeCompleto} · {meta.competencia}</div>
        </div>
        <span style={{ background: pct >= 100 ? "#E9F7EF" : pct >= 80 ? "#FEF3C7" : "#FDECEC", color: pct >= 100 ? COLORS.emerald : pct >= 80 ? COLORS.amber : COLORS.rose }} className="text-[11px] font-medium px-2 py-1 rounded-md shrink-0">
          {pct.toFixed(0)}%
        </span>
      </div>
      <BarraProgresso pct={pct} />
      <div className="flex items-center justify-between mt-2">
        <span style={{ color: COLORS.muted }} className="text-[12px]">
          {tipo.manual && podeEditar ? (
            <span className="flex items-center gap-1.5">
              Realizado:
              <input type="number" value={meta.valorRealizadoManual ?? ""} onChange={(e) => onAtualizarRealizado(meta.id, Number(e.target.value) || 0)} style={{ borderColor: COLORS.border }} className="w-16 border rounded px-1.5 py-0.5 text-[12px] outline-none" />
            </span>
          ) : (
            `Realizado: ${fmt(realizado)}`
          )}
        </span>
        <span style={{ color: COLORS.text }} className="text-[12px] font-medium">Meta: {fmt(meta.valorMeta)}</span>
      </div>
    </div>
  );
}

function MetasCampanhasView({ metas, campanhas, api, recarregar, representantes, vendas, lojas, user, registrarLog }) {
  const isRep = user.perfil === "representante";
  const podeEditar = ["administrador", "gestor"].includes(user.perfil);
  const [aba, setAba] = useState("metas");
  const [filtroRep, setFiltroRep] = useState(isRep ? user.representanteId : "todos");
  const [criandoMeta, setCriandoMeta] = useState(false);
  const [criandoCampanha, setCriandoCampanha] = useState(false);

  const metasVisiveis = metas.filter((m) => filtroRep === "todos" || m.representanteId === filtroRep);

  const atualizarRealizado = async (id, valor) => {
    await api.atualizarMeta(id, { valorRealizadoManual: valor });
    await recarregar();
  };
  const criarMeta = async (dados) => {
    await api.criarMeta(dados);
    registrarLog?.("Criação", `Meta · ${metaTipo(dados.tipoId).label}`, `${representantes.find((r) => r.id === dados.representanteId)?.nomeCompleto} · ${dados.competencia}`);
    await recarregar();
    setCriandoMeta(false);
  };
  const criarCampanha = async (dados) => {
    await api.criarCampanha(dados);
    registrarLog?.("Criação", `Campanha · ${dados.nome}`, `${dados.dataInicio} – ${dados.dataFim}`);
    await recarregar();
    setCriandoCampanha(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        {[["metas", "Metas"], ["campanhas", "Campanhas"]].map(([k, label]) => (
          <button key={k} onClick={() => setAba(k)} style={aba === k ? { background: COLORS.primary, color: "white" } : { borderColor: COLORS.border, color: COLORS.text }} className={`text-[12.5px] font-medium px-3 py-1.5 rounded-lg ${aba === k ? "" : "border"}`}>
            {label}
          </button>
        ))}
      </div>

      {aba === "metas" && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2">
            {!isRep ? (
              <select value={filtroRep} onChange={(e) => setFiltroRep(e.target.value)} style={{ borderColor: COLORS.border, color: COLORS.text }} className="border rounded-lg px-3 py-2 text-[13px] outline-none">
                <option value="todos">Todos os representantes</option>
                {representantes.map((r) => <option key={r.id} value={r.id}>{r.nomeCompleto}</option>)}
              </select>
            ) : <span />}
            {podeEditar && (
              <button onClick={() => setCriandoMeta(true)} style={{ background: COLORS.primary }} className="flex items-center gap-1.5 text-white text-[13px] font-medium px-3.5 py-2 rounded-lg">
                <Plus size={15} /> Nova meta
              </button>
            )}
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {metasVisiveis.map((m) => (
              <MetaCard key={m.id} meta={m} representante={representantes.find((r) => r.id === m.representanteId)} vendas={vendas} lojas={lojas} podeEditar={podeEditar} onAtualizarRealizado={atualizarRealizado} />
            ))}
            {metasVisiveis.length === 0 && <div style={{ color: COLORS.muted }} className="col-span-full text-center py-16 text-[13px]">Nenhuma meta cadastrada para este filtro.</div>}
          </div>
        </>
      )}

      {aba === "campanhas" && (
        <>
          <div className="flex justify-end">
            {podeEditar && (
              <button onClick={() => setCriandoCampanha(true)} style={{ background: COLORS.primary }} className="flex items-center gap-1.5 text-white text-[13px] font-medium px-3.5 py-2 rounded-lg">
                <Plus size={15} /> Nova campanha
              </button>
            )}
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {campanhas.map((c) => (
              <div key={c.id} style={{ borderColor: COLORS.border, background: COLORS.surface }} className="border rounded-xl p-4">
                <div className="flex items-start justify-between mb-1.5">
                  <div style={{ color: COLORS.text }} className="text-[13.5px] font-semibold">{c.nome}</div>
                  <span style={{ background: c.status === "ativa" ? "#E9F7EF" : "#F4F5F7", color: c.status === "ativa" ? COLORS.emerald : COLORS.muted }} className="text-[11px] font-medium px-2 py-1 rounded-md">{c.status === "ativa" ? "Ativa" : "Encerrada"}</span>
                </div>
                <p style={{ color: COLORS.muted }} className="text-[12.5px] leading-relaxed mb-2.5">{c.descricao}</p>
                <div className="flex items-center justify-between text-[12px]">
                  <span style={{ color: COLORS.text }} className="font-medium">
                    {c.tipoBonus === "Valor fixo" ? fmtBRL(c.valor) : c.tipoBonus === "Percentual" ? `${c.valor}%` : `${c.valor}x`} · {c.tipoBonus.toLowerCase()}
                  </span>
                  <span style={{ color: COLORS.muted }}>{c.dataInicio} – {c.dataFim}</span>
                </div>
                <div style={{ color: COLORS.muted }} className="text-[11.5px] mt-1.5">{c.elegibilidade}</div>
              </div>
            ))}
            {campanhas.length === 0 && <div style={{ color: COLORS.muted }} className="col-span-full text-center py-16 text-[13px]">Nenhuma campanha cadastrada.</div>}
          </div>
        </>
      )}

      {criandoMeta && <NovaMetaModal representantes={representantes} competenciaPadrao="Agosto/2026" onClose={() => setCriandoMeta(false)} onCriar={criarMeta} />}
      {criandoCampanha && <NovaCampanhaModal onClose={() => setCriandoCampanha(false)} onCriar={criarCampanha} />}
    </div>
  );
}

/* ============================================================================
   COMISSÕES · APROVAÇÕES · PAGAMENTOS · RELATÓRIOS · AUDITORIA
============================================================================ */

function baixarCSV(nomeArquivo, headers, linhas) {
  const csv = [headers, ...linhas]
    .map((linha) => linha.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nomeArquivo; a.click();
  URL.revokeObjectURL(url);
}

function ComissoesView({ fechamentos, representantes, user }) {
  const isRep = user.perfil === "representante";
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const linhas = fechamentos
    .filter((f) => !isRep || f.representanteId === user.representanteId)
    .filter((f) => filtroStatus === "todos" || f.status === filtroStatus)
    .map((f) => ({
      f, rep: f.representante || representantes.find((r) => r.id === f.representanteId),
      condicao: f.condicao, resultado: f.resultado,
    }));

  const totalApurada = linhas.reduce((a, l) => a + (l.resultado?.liquida || 0), 0);
  const totalPaga = linhas.filter((l) => ["pago", "encerrado"].includes(l.f.status)).reduce((a, l) => a + (l.resultado?.liquida || 0), 0);
  const totalPendente = totalApurada - totalPaga;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Comissão apurada" value={fmtBRL(totalApurada)} icon={Wallet} />
        <KpiCard label="Comissão paga" value={fmtBRL(totalPaga)} icon={CircleCheck} />
        <KpiCard label="Ainda em aberto" value={fmtBRL(totalPendente)} icon={Clock} />
      </div>

      <div className="flex items-center gap-2">
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} style={{ borderColor: COLORS.border, color: COLORS.text }} className="border rounded-lg px-3 py-2 text-[13px] outline-none">
          <option value="todos">Todos os status</option>
          {STATUS_FECHAMENTO_ORDER.map((s) => <option key={s} value={s}>{STATUS_FECHAMENTO_STYLES[s].label}</option>)}
        </select>
      </div>

      <div style={{ borderColor: COLORS.border, background: COLORS.surface }} className="border rounded-xl overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ borderColor: COLORS.border, color: COLORS.muted }} className="border-b text-left">
              {!isRep && <th className="font-medium px-4 py-3">Representante</th>}
              <th className="font-medium px-4 py-3">Competência</th>
              <th className="font-medium px-4 py-3">Condição</th>
              <th className="font-medium px-4 py-3">Comissão bruta</th>
              <th className="font-medium px-4 py-3">Comissão líquida</th>
              <th className="font-medium px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map(({ f, rep, condicao, resultado }) => (
              <tr key={f.id} style={{ borderColor: COLORS.border }} className="border-b last:border-0">
                {!isRep && <td className="px-4 py-3" style={{ color: COLORS.text }}>{rep?.nomeCompleto}</td>}
                <td className="px-4 py-3" style={{ color: COLORS.text }}>{f.competencia}</td>
                <td className="px-4 py-3" style={{ color: COLORS.text }}>{condicao?.nome}</td>
                <td className="px-4 py-3" style={{ color: COLORS.text }}>{fmtBRL(resultado?.bruta || 0)}</td>
                <td className="px-4 py-3 font-medium" style={{ color: COLORS.emerald }}>{fmtBRL(resultado?.liquida || 0)}</td>
                <td className="px-4 py-3"><StatusBadge status={f.status} styles={STATUS_FECHAMENTO_STYLES} /></td>
              </tr>
            ))}
            {linhas.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center" style={{ color: COLORS.muted }}>Nenhum registro para este filtro.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AprovacoesView({ condicoes, fechamentos, api, recarregar, representantes, user, registrarLog }) {
  const [condicaoAberta, setCondicaoAberta] = useState(null);
  const [fechamentoAberto, setFechamentoAberto] = useState(null);
  const condicoesPendentes = condicoes.filter((c) => c.status === "aguardando_aprovacao");
  const fechamentosPendentes = fechamentos.filter((f) => f.status === "aguardando_aprovacao");
  const semPendencias = condicoesPendentes.length === 0 && fechamentosPendentes.length === 0;

  const salvarCondicao = async (dados) => {
    const anterior = condicoes.find((c) => c.id === dados.id);
    await api.atualizarCondicao(dados.id, {
      nome: dados.nome, descricao: dados.descricao, elegibilidade: dados.elegibilidade,
      observacoes: dados.observacoes, dataFim: dados.dataFim,
    });
    await api.salvarRegras(dados.id, dados.regras);
    if (anterior && anterior.status !== dados.status) {
      await api.mudarStatusCondicao(dados.id, dados.status);
      registrarLog?.("Mudança de status", dados.nome, `${STATUS_CONDICAO_STYLES[anterior.status]?.label} → ${STATUS_CONDICAO_STYLES[dados.status]?.label}`);
    }
    await recarregar();
    setCondicaoAberta(null);
  };

  return (
    <div className="flex flex-col gap-6">
      {condicoesPendentes.length > 0 && (
        <div>
          <h3 style={{ color: COLORS.text }} className="text-[13.5px] font-semibold mb-2.5 flex items-center gap-1.5"><FileSliders size={15} /> Condições comerciais ({condicoesPendentes.length})</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {condicoesPendentes.map((c) => (
              <button key={c.id} onClick={() => setCondicaoAberta(c)} style={{ borderColor: COLORS.border, background: COLORS.surface }} className="text-left border rounded-xl p-3.5 hover:border-[#ADC6E7]">
                <div style={{ color: COLORS.text }} className="text-[13.5px] font-medium">{c.nome}</div>
                <div style={{ color: COLORS.muted }} className="text-[12px] mt-0.5">Solicitado por {c.responsavelCriacao} · {c.elegibilidade}</div>
              </button>
            ))}
          </div>
        </div>
      )}
      {fechamentosPendentes.length > 0 && (
        <div>
          <h3 style={{ color: COLORS.text }} className="text-[13.5px] font-semibold mb-2.5 flex items-center gap-1.5"><ClipboardCheck size={15} /> Fechamentos mensais ({fechamentosPendentes.length})</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {fechamentosPendentes.map((f) => {
              const rep = representantes.find((r) => r.id === f.representanteId);
              return (
                <button key={f.id} onClick={() => setFechamentoAberto(f)} style={{ borderColor: COLORS.border, background: COLORS.surface }} className="text-left border rounded-xl p-3.5 hover:border-[#ADC6E7]">
                  <div style={{ color: COLORS.text }} className="text-[13.5px] font-medium">{rep?.nomeCompleto}</div>
                  <div style={{ color: COLORS.muted }} className="text-[12px] mt-0.5">{f.competencia} · {f.contestacoes.length > 0 ? `${f.contestacoes.length} contestação(ões) analisada(s)` : "sem contestações"}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}
      {semPendencias && (
        <div style={{ borderColor: COLORS.border, background: COLORS.surface }} className="border rounded-xl flex flex-col items-center justify-center py-20 text-center">
          <CircleCheck size={22} style={{ color: COLORS.emerald }} className="mb-2" />
          <p style={{ color: COLORS.text }} className="text-[13.5px] font-medium">Nenhuma pendência de aprovação no momento.</p>
        </div>
      )}

      {condicaoAberta && (
        <CondicaoDrawer condicao={condicaoAberta} onClose={() => setCondicaoAberta(null)} onSalvar={salvarCondicao} user={user} registrarLog={registrarLog} />
      )}
      {fechamentoAberto && (
        <FechamentoDetalhe
          fechamento={fechamentos.find((f) => f.id === fechamentoAberto.id) || fechamentoAberto}
          api={api} recarregar={recarregar}
          representante={representantes.find((r) => r.id === fechamentoAberto.representanteId)}
          user={user} registrarLog={registrarLog} onClose={() => setFechamentoAberto(null)}
        />
      )}
    </div>
  );
}

function PagamentosView({ fechamentos, representantes }) {
  const pagaveis = fechamentos.filter((f) => ["aguardando_nota_fiscal", "programado", "pago", "encerrado"].includes(f.status));
  return (
    <div style={{ borderColor: COLORS.border, background: COLORS.surface }} className="border rounded-xl overflow-hidden">
      <table className="w-full text-[13px]">
        <thead>
          <tr style={{ borderColor: COLORS.border, color: COLORS.muted }} className="border-b text-left">
            <th className="font-medium px-4 py-3">Representante</th>
            <th className="font-medium px-4 py-3">Competência</th>
            <th className="font-medium px-4 py-3">Valor líquido</th>
            <th className="font-medium px-4 py-3">Nota fiscal</th>
            <th className="font-medium px-4 py-3">Data de pagamento</th>
            <th className="font-medium px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {pagaveis.map((f) => {
            const rep = f.representante || representantes.find((r) => r.id === f.representanteId);
            return (
              <tr key={f.id} style={{ borderColor: COLORS.border }} className="border-b last:border-0">
                <td className="px-4 py-3" style={{ color: COLORS.text }}>{rep?.nomeCompleto}</td>
                <td className="px-4 py-3" style={{ color: COLORS.text }}>{f.competencia}</td>
                <td className="px-4 py-3 font-medium" style={{ color: COLORS.text }}>{fmtBRL(f.resultado?.liquida || 0)}</td>
                <td className="px-4 py-3" style={{ color: COLORS.text }}>{f.numeroNF || "—"}</td>
                <td className="px-4 py-3" style={{ color: COLORS.text }}>{f.dataPagamento ? new Date(f.dataPagamento).toLocaleDateString("pt-BR") : "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={f.status} styles={STATUS_FECHAMENTO_STYLES} /></td>
              </tr>
            );
          })}
          {pagaveis.length === 0 && (
            <tr><td colSpan={6} className="px-4 py-10 text-center" style={{ color: COLORS.muted }}>Nenhum pagamento programado ainda.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function RelatorioCard({ titulo, descricao, onExportar }) {
  return (
    <div style={{ borderColor: COLORS.border, background: COLORS.surface }} className="border rounded-xl p-4 flex flex-col justify-between">
      <div>
        <div style={{ color: COLORS.text }} className="text-[13.5px] font-semibold">{titulo}</div>
        <p style={{ color: COLORS.muted }} className="text-[12px] mt-1 leading-relaxed">{descricao}</p>
      </div>
      <button onClick={onExportar} style={{ color: COLORS.primaryDeep }} className="flex items-center gap-1.5 text-[12.5px] font-medium mt-3 self-start">
        <Download size={14} /> Exportar CSV
      </button>
    </div>
  );
}

function RelatoriosView({ fechamentos, vendas, lojas, representantes }) {
  const exportarComissaoPorRepresentante = () => {
    const linhas = fechamentos.map((f) => {
      const rep = f.representante || representantes.find((r) => r.id === f.representanteId);
      return [rep?.nomeCompleto, f.competencia, f.condicao?.nome, (f.resultado?.bruta || 0).toFixed(2), (f.resultado?.liquida || 0).toFixed(2), STATUS_FECHAMENTO_STYLES[f.status]?.label];
    });
    baixarCSV("comissao_por_representante.csv", ["Representante", "Competência", "Condição", "Comissão bruta", "Comissão líquida", "Status"], linhas);
  };
  const exportarVendasPorRepresentante = () => {
    const linhas = vendas.map((v) => {
      const loja = lojas.find((l) => l.id === v.lojaId);
      const rep = representantes.find((r) => r.id === v.representanteId);
      return [v.codigo, v.data, v.competencia, loja?.nomeFantasia, rep?.nomeCompleto, v.produto, v.valorFinanciado.toFixed(2), v.status];
    });
    baixarCSV("vendas_por_representante.csv", ["Código", "Data", "Competência", "Loja", "Representante", "Produto", "Valor financiado", "Status"], linhas);
  };
  const exportarLojasCredenciadas = () => {
    const linhas = lojas.map((l) => {
      const rep = representantes.find((r) => r.id === l.representanteAtualId);
      return [l.codigo, l.nomeFantasia, l.cidade, l.estado, rep?.nomeCompleto, STATUS_STYLES[l.status]?.label, l.dataCredenciamento];
    });
    baixarCSV("lojas_credenciadas.csv", ["Código", "Nome fantasia", "Cidade", "UF", "Representante", "Status", "Data de credenciamento"], linhas);
  };
  const exportarRanking = () => {
    const linhas = representantes.map((r) => {
      const ls = lojas.filter((l) => l.representanteAtualId === r.id);
      const receita = ls.reduce((a, l) => a + l.receitaGerada, 0);
      return [r.nomeCompleto, ls.length, ls.filter((l) => l.status === "ativa").length, receita.toFixed(2)];
    });
    baixarCSV("ranking_comercial.csv", ["Representante", "Lojas na carteira", "Lojas ativas", "Receita gerada"], linhas);
  };

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <RelatorioCard titulo="Comissão por representante" descricao="Comissão bruta e líquida apurada em cada fechamento, por representante e competência." onExportar={exportarComissaoPorRepresentante} />
      <RelatorioCard titulo="Vendas por representante" descricao="Todas as vendas importadas, com loja, representante, valor financiado e status." onExportar={exportarVendasPorRepresentante} />
      <RelatorioCard titulo="Lojas credenciadas" descricao="Carteira completa de lojas com status, representante responsável e data de credenciamento." onExportar={exportarLojasCredenciadas} />
      <RelatorioCard titulo="Ranking comercial" descricao="Lojas na carteira, lojas ativas e receita gerada por representante." onExportar={exportarRanking} />
    </div>
  );
}

function AuditoriaView({ logs }) {
  const [busca, setBusca] = useState("");
  const filtrados = logs.filter((l) =>
    !busca || l.acao.toLowerCase().includes(busca.toLowerCase()) || l.entidade.toLowerCase().includes(busca.toLowerCase()) || l.usuario.toLowerCase().includes(busca.toLowerCase())
  );
  return (
    <div className="flex flex-col gap-4">
      <div style={{ borderColor: COLORS.border, background: COLORS.surface }} className="flex items-center gap-2 border rounded-lg px-3 py-2 w-[280px]">
        <Search size={14} style={{ color: COLORS.muted }} />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por ação, entidade ou usuário" className="bg-transparent outline-none text-[13px] w-full" />
      </div>
      <div style={{ borderColor: COLORS.border, background: COLORS.surface }} className="border rounded-xl overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ borderColor: COLORS.border, color: COLORS.muted }} className="border-b text-left">
              <th className="font-medium px-4 py-3">Data/hora</th>
              <th className="font-medium px-4 py-3">Usuário</th>
              <th className="font-medium px-4 py-3">Ação</th>
              <th className="font-medium px-4 py-3">Entidade</th>
              <th className="font-medium px-4 py-3">Detalhe</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((l) => (
              <tr key={l.id} style={{ borderColor: COLORS.border }} className="border-b last:border-0">
                <td className="px-4 py-3" style={{ color: COLORS.muted }}>{l.data}</td>
                <td className="px-4 py-3" style={{ color: COLORS.text }}>{l.usuario}</td>
                <td className="px-4 py-3" style={{ color: COLORS.text }}>{l.acao}</td>
                <td className="px-4 py-3" style={{ color: COLORS.text }}>{l.entidade}</td>
                <td className="px-4 py-3" style={{ color: COLORS.muted }}>{l.detalhe}</td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center" style={{ color: COLORS.muted }}>Nenhum evento registrado ainda — as ações realizadas nesta sessão aparecem aqui.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================================
   CONFIGURAÇÕES
============================================================================ */

const PERFIS_INFO = [
  { perfil: "administrador", label: "Administrador", pode: "Acessa e altera toda a plataforma, usuários, parâmetros e integrações." },
  { perfil: "diretoria", label: "Diretoria", pode: "Visualiza todos os indicadores, simula condições, aprova propostas e acompanha resultados." },
  { perfil: "gestor", label: "Gestor comercial", pode: "Cadastra representantes, vincula lojas, propõe condições comerciais, acompanha metas e valida fechamentos." },
  { perfil: "financeiro", label: "Financeiro", pode: "Revisa cálculos, lança ajustes, aprova fechamentos, registra notas fiscais e pagamentos." },
  { perfil: "representante", label: "Representante", pode: "Visualiza exclusivamente suas condições, carteira, metas, vendas, comissões e pagamentos — sem alterar regras ou dados de terceiros." },
];

function NovoUsuarioModal({ representantes, onClose, onCriar }) {
  const [dados, setDados] = useState({ nome: "", cargo: "", perfil: "gestor", representanteId: "" });
  const set = (campo) => (valor) => setDados((d) => ({ ...d, [campo]: valor }));
  const podeSalvar = dados.nome && dados.cargo && (dados.perfil !== "representante" || dados.representanteId);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[#141D2E]/40" onClick={onClose} />
      <div style={{ background: COLORS.surface }} className="relative w-full max-w-[400px] rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ color: COLORS.text }} className="text-[16px] font-semibold flex items-center gap-2"><UserPlus size={17} /> Novo usuário</h3>
          <button onClick={onClose} style={{ color: COLORS.muted }}><X size={18} /></button>
        </div>
        <div className="flex flex-col gap-3.5">
          <CampoTexto label="Nome" value={dados.nome} onChange={set("nome")} />
          <CampoTexto label="Cargo" value={dados.cargo} onChange={set("cargo")} />
          <CampoSelect label="Perfil de acesso" value={dados.perfil} onChange={set("perfil")} options={["administrador", "diretoria", "gestor", "financeiro", "representante"]} />
          {dados.perfil === "representante" && (
            <div>
              <label style={{ color: COLORS.muted }} className="text-[11.5px] font-medium">Vincular ao representante</label>
              <select value={dados.representanteId} onChange={(e) => set("representanteId")(e.target.value)} style={{ borderColor: COLORS.border }} className="w-full border rounded-lg px-3 py-2 text-[13px] outline-none mt-1">
                <option value="">Selecione...</option>
                {representantes.map((r) => <option key={r.id} value={r.id}>{r.nomeCompleto}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} style={{ color: COLORS.text }} className="text-[13px] font-medium px-3.5 py-2">Cancelar</button>
          <button
            disabled={!podeSalvar}
            onClick={() => onCriar({ id: `u_${Math.random().toString(36).slice(2, 8)}`, nome: dados.nome, cargo: dados.cargo, perfil: dados.perfil, ...(dados.perfil === "representante" ? { representanteId: dados.representanteId } : {}) })}
            style={{ background: podeSalvar ? COLORS.primary : "#ADC6E7" }}
            className="text-white text-[13px] font-medium px-4 py-2 rounded-lg"
          >
            Cadastrar usuário
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfiguracoesView({ usuarios, parametros, api, recarregar, representantes, user, registrarLog }) {
  const [aba, setAba] = useState("usuarios");
  const [criandoUsuario, setCriandoUsuario] = useState(false);
  const [rascunhoParams, setRascunhoParams] = useState(parametros);
  const podeAdministrar = user.perfil === "administrador";

  const criarUsuario = async (novo) => {
    await api.criarUsuario(novo);
    registrarLog?.("Criação", "Usuário", `${novo.nome} · perfil ${PERFIL_LABEL[novo.perfil]}`);
    await recarregar();
    setCriandoUsuario(false);
  };

  const salvarParametros = async () => {
    await api.salvarParametros(rascunhoParams);
    registrarLog?.("Alteração", "Parâmetros gerais", `Dia de pagamento: ${rascunhoParams.diaPagamentoPadrao} · Recebimento padrão: ${rascunhoParams.percentualRecebimentoPadrao}% · Arredondamento: ${rascunhoParams.arredondamentoPadrao}`);
    await recarregar();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        {[["usuarios", "Usuários"], ["perfis", "Perfis e permissões"], ["parametros", "Parâmetros gerais"]].map(([k, label]) => (
          <button key={k} onClick={() => setAba(k)} style={aba === k ? { background: COLORS.primary, color: "white" } : { borderColor: COLORS.border, color: COLORS.text }} className={`text-[12.5px] font-medium px-3 py-1.5 rounded-lg ${aba === k ? "" : "border"}`}>
            {label}
          </button>
        ))}
      </div>

      {aba === "usuarios" && (
        <div className="flex flex-col gap-3">
          {podeAdministrar && (
            <button onClick={() => setCriandoUsuario(true)} style={{ background: COLORS.primary }} className="self-end flex items-center gap-1.5 text-white text-[13px] font-medium px-3.5 py-2 rounded-lg">
              <UserPlus size={15} /> Novo usuário
            </button>
          )}
          <div style={{ borderColor: COLORS.border, background: COLORS.surface }} className="border rounded-xl overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ borderColor: COLORS.border, color: COLORS.muted }} className="border-b text-left">
                  <th className="font-medium px-4 py-3">Nome</th>
                  <th className="font-medium px-4 py-3">Cargo</th>
                  <th className="font-medium px-4 py-3">Perfil</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} style={{ borderColor: COLORS.border }} className="border-b last:border-0">
                    <td className="px-4 py-3" style={{ color: COLORS.text }}>{u.nome}</td>
                    <td className="px-4 py-3" style={{ color: COLORS.text }}>{u.cargo}</td>
                    <td className="px-4 py-3"><span style={{ background: "#E7EEFB", color: COLORS.primaryDeep }} className="text-[11.5px] font-medium px-2 py-1 rounded-md">{PERFIL_LABEL[u.perfil]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {aba === "perfis" && (
        <div className="flex flex-col gap-2.5">
          {PERFIS_INFO.map((p) => (
            <div key={p.perfil} style={{ borderColor: COLORS.border, background: COLORS.surface }} className="border rounded-xl p-4">
              <div style={{ color: COLORS.text }} className="text-[13.5px] font-semibold mb-1">{p.label}</div>
              <p style={{ color: COLORS.muted }} className="text-[12.5px] leading-relaxed">{p.pode}</p>
            </div>
          ))}
        </div>
      )}

      {aba === "parametros" && (
        <div style={{ borderColor: COLORS.border, background: COLORS.surface }} className="border rounded-xl p-5 max-w-[440px]">
          <div className="flex flex-col gap-3.5">
            <CampoTexto label="Dia padrão de pagamento" type="number" value={rascunhoParams.diaPagamentoPadrao} onChange={(v) => setRascunhoParams((p) => ({ ...p, diaPagamentoPadrao: Number(v) }))} suffix="dia do mês" />
            <CampoTexto label="Percentual de recebimento padrão" type="number" value={rascunhoParams.percentualRecebimentoPadrao} onChange={(v) => setRascunhoParams((p) => ({ ...p, percentualRecebimentoPadrao: Number(v) }))} suffix="%" />
            <CampoSelect label="Regra de arredondamento padrão" value={rascunhoParams.arredondamentoPadrao} onChange={(v) => setRascunhoParams((p) => ({ ...p, arredondamentoPadrao: v }))} options={["Duas casas decimais", "Arredondar para cima", "Arredondar para baixo"]} />
          </div>
          <p style={{ color: COLORS.muted }} className="text-[11.5px] mt-3 leading-relaxed">
            Esses valores viram o padrão sugerido ao cadastrar um novo representante e ao abrir uma nova simulação de comissão.
          </p>
          {podeAdministrar ? (
            <button onClick={salvarParametros} style={{ background: COLORS.primary }} className="text-white text-[12.5px] font-medium px-3.5 py-2 rounded-lg mt-4">Salvar parâmetros</button>
          ) : (
            <p style={{ color: COLORS.muted }} className="text-[12px] mt-4">Somente a administração pode alterar estes parâmetros.</p>
          )}
        </div>
      )}

      {criandoUsuario && <NovoUsuarioModal representantes={representantes} onClose={() => setCriandoUsuario(false)} onCriar={criarUsuario} />}
    </div>
  );
}

/* ============================================================================
   EM CONSTRUÇÃO (placeholder para módulos futuros)
============================================================================ */

function EmConstrucaoView({ titulo }) {
  return (
    <div style={{ borderColor: COLORS.border, background: COLORS.surface }} className="border rounded-xl flex flex-col items-center justify-center py-24 text-center">
      <div style={{ background: "#E7EEFB", color: COLORS.primaryDeep }} className="h-11 w-11 rounded-full flex items-center justify-center mb-4">
        <Lock size={18} />
      </div>
      <h3 style={{ color: COLORS.text }} className="text-[15px] font-semibold mb-1">{titulo} — próximo módulo</h3>
      <p style={{ color: COLORS.muted }} className="text-[13px] max-w-[360px]">
        Este módulo entra na construção em seguida: condições comerciais, motor de cálculo, simulador, vendas e fechamento mensal.
      </p>
    </div>
  );
}

/* ============================================================================
   APP
============================================================================ */

const TITLES = {
  dashboard_comercial: ["Dashboard comercial", "Funil de crédito, setup e inadimplência"],
  visao_geral: ["Visão geral", "Indicadores consolidados da operação comercial"],
  representantes: ["Representantes", "Cadastro, dados financeiros e documentação"],
  carteira: ["Carteira de lojas", "Vínculos, transferências e histórico por representante"],
  condicoes: ["Condições comerciais", "Construtor de regras, faixas e fluxo de aprovação"],
  simulador: ["Simulador de comissão", "Motor de cálculo aplicado a um cenário, com memória linha a linha"],
  vendas: ["Vendas", "Vendas das lojas vinculadas, com importação por planilha"],
  fechamentos: ["Fechamentos", "Apuração, aprovação, nota fiscal e pagamento por competência"],
  comissoes: ["Comissões", "Comissão bruta e líquida apurada em cada fechamento"],
  aprovacoes: ["Aprovações", "Fila única de condições comerciais e fechamentos pendentes"],
  pagamentos: ["Pagamentos", "Nota fiscal, data e valor de cada pagamento programado"],
  relatorios: ["Relatórios", "Exportações em CSV prontas para Excel"],
  auditoria: ["Auditoria", "Histórico de ações realizadas na plataforma"],
  metas: ["Metas e campanhas", "Metas por indicador com apuração automática e campanhas comerciais"],
  configuracoes: ["Configurações", "Usuários, perfis de acesso e parâmetros gerais da plataforma"],
};

export default function App() {
  const [user, setUser] = useState(null);
  const [current, setCurrent] = useState("visao_geral");
  const [representantes, setRepresentantes] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [condicoes, setCondicoes] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [fechamentos, setFechamentos] = useState([]);
  const [metas, setMetas] = useState([]);
  const [campanhas, setCampanhas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [parametros, setParametros] = useState({ diaPagamentoPadrao: 10, percentualRecebimentoPadrao: 92, arredondamentoPadrao: "Duas casas decimais" });
  const [selecionado, setSelecionado] = useState(null);
  const [logs, setLogs] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState("");

  const api = useMemo(() => criarApi(user?.token), [user?.token]);

  const registrarLog = useCallback((acao, entidade, detalhe) => {
    if (!user) return;
    setLogs((prev) => [
      { id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, data: new Date().toLocaleString("pt-BR"), usuario: user.nome, acao, entidade, detalhe },
      ...prev,
    ].slice(0, 300));
  }, [user]);

  // Busca tudo de novo na API — chamada depois de qualquer criação, edição
  // ou mudança de status, em vez de manter réplicas locais divergentes.
  const recarregarTudo = useCallback(async () => {
    const apiAtual = criarApi(user?.token);
    const [reps, lj, cond, vd, fech, mt, camp, gest, red, params, ...resto] = await Promise.all([
      apiAtual.getRepresentantes(), apiAtual.getLojas(), apiAtual.getCondicoes(), apiAtual.getVendas(),
      apiAtual.getFechamentos(), apiAtual.getMetas(), apiAtual.getCampanhas(), apiAtual.getGestores(), apiAtual.getRedes(),
      apiAtual.getParametros(),
      user?.perfil === "administrador" || user?.perfil === "diretoria" ? apiAtual.getAuditoria() : Promise.resolve(null),
      user?.perfil === "administrador" || user?.perfil === "diretoria" ? apiAtual.getUsuarios() : Promise.resolve(null),
    ]);
    GESTORES.length = 0; GESTORES.push(...gest);
    REDES.length = 0; REDES.push(...red);
    setRepresentantes(reps); setLojas(lj); setCondicoes(cond); setVendas(vd); setFechamentos(fech);
    setMetas(mt); setCampanhas(camp);
    setParametros((p) => ({ ...p, ...params, diaPagamentoPadrao: Number(params.diaPagamentoPadrao) || p.diaPagamentoPadrao, percentualRecebimentoPadrao: Number(params.percentualRecebimentoPadrao) || p.percentualRecebimentoPadrao }));
    const [logsApi, usuariosApi] = resto;
    if (logsApi) setLogs(logsApi.map((l) => ({ ...l, data: new Date(l.data).toLocaleString("pt-BR") })));
    if (usuariosApi) setUsuarios(usuariosApi);
  }, [user?.token, user?.perfil]);

  useEffect(() => {
    if (!user) return;
    let ativo = true;
    setCarregando(true);
    setErroCarga("");
    recarregarTudo()
      .catch((e) => { if (ativo) setErroCarga(e.message || "Não foi possível carregar os dados."); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [user?.token]);

  const handleLogin = (u) => {
    setCurrent(u.perfil === "representante" ? "dashboard_comercial" : "visao_geral");
    setUser(u);
  };

  const handleTransferir = useCallback(async (loja, { novoRepId, dataEfetiva, motivo }) => {
    const repAntigo = representantes.find((r) => r.id === loja.representanteAtualId);
    const repNovo = representantes.find((r) => r.id === novoRepId);
    await api.transferirLoja(loja.id, { novoRepresentanteId: novoRepId, dataEfetiva, motivo });
    registrarLog("Transferência de loja", loja.nomeFantasia, `De ${repAntigo?.nomeCompleto} para ${repNovo?.nomeCompleto} a partir de ${dataEfetiva}`);
    await recarregarTudo();
  }, [representantes, registrarLog, api, recarregarTudo]);

  const handleCriarRepresentante = useCallback(async (dados) => {
    await api.criarRepresentante(dados);
    registrarLog("Criação", dados.nomeCompleto, "Representante cadastrado como 'em análise'");
    await recarregarTudo();
  }, [registrarLog, api, recarregarTudo]);

  const handleCriarLoja = useCallback(async (dados) => {
    await api.criarLoja(dados);
    registrarLog("Criação", dados.nomeFantasia, `Loja cadastrada e vinculada a ${representantes.find((r) => r.id === dados.representanteAtualId)?.nomeCompleto}`);
    await recarregarTudo();
  }, [registrarLog, representantes, api, recarregarTudo]);

  const handleAtualizarRepresentante = useCallback(async (atualizado) => {
    const { id, ...dados } = atualizado;
    await api.atualizarRepresentante(id, dados);
    await recarregarTudo();
  }, [api, recarregarTudo]);

  const [buscaLojaKey, setBuscaLojaKey] = useState(0);
  const [buscaLojaInicial, setBuscaLojaInicial] = useState("");
  const handleAbrirLojaNaBusca = useCallback((loja) => {
    setCurrent("carteira");
    setBuscaLojaInicial(loja.codigo);
    setBuscaLojaKey((k) => k + 1);
  }, []);

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  if (carregando) {
    return (
      <div style={{ background: COLORS.bg }} className="min-h-screen w-full flex items-center justify-center">
        <p style={{ color: COLORS.muted }} className="text-[14px]">Carregando dados do servidor...</p>
      </div>
    );
  }

  if (erroCarga) {
    return (
      <div style={{ background: COLORS.bg }} className="min-h-screen w-full flex items-center justify-center px-6">
        <div style={{ borderColor: COLORS.border, background: COLORS.surface }} className="border rounded-xl p-6 max-w-[440px] text-center">
          <AlertTriangle size={22} style={{ color: COLORS.rose }} className="mx-auto mb-3" />
          <p style={{ color: COLORS.text }} className="text-[14px] font-medium mb-1">Não foi possível carregar os dados</p>
          <p style={{ color: COLORS.muted }} className="text-[12.5px] mb-4">{erroCarga}</p>
          <button onClick={() => setUser(null)} style={{ background: COLORS.primary }} className="text-white text-[13px] font-medium px-4 py-2 rounded-lg">Voltar ao login</button>
        </div>
      </div>
    );
  }

  const lojasVisiveis = user.perfil === "representante" ? lojas.filter((l) => l.representanteAtualId === user.representanteId) : lojas;
  const repsVisiveis = user.perfil === "representante" ? representantes.filter((r) => r.id === user.representanteId) : representantes;
  const vendasVisiveis = user.perfil === "representante" ? vendas.filter((v) => v.representanteId === user.representanteId) : vendas;

  const rotasConhecidas = ["dashboard_comercial", "visao_geral", "representantes", "carteira", "condicoes", "simulador", "vendas", "fechamentos", "metas", "comissoes", "aprovacoes", "pagamentos", "relatorios", "configuracoes", "auditoria"];

  return (
    <div style={{ background: COLORS.bg }} className="min-h-screen w-full flex font-sans" >
      <style>{`
        .font-sans { font-family: Inter, Arial, sans-serif; }
        * { box-sizing: border-box; }
        table { font-variant-numeric: tabular-nums; }
      `}</style>
      <Sidebar current={current} setCurrent={setCurrent} user={user} onLogout={() => setUser(null)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar
          title={TITLES[current]?.[0] || "Wiwap Parceiros"} subtitle={TITLES[current]?.[1]} user={user}
          representantes={representantes} lojas={lojas}
          onAbrirRepresentante={(r) => setSelecionado(r)}
          onAbrirLoja={handleAbrirLojaNaBusca}
        />
        <main className="p-3 sm:p-6 flex-1 min-w-0">
          {current === "dashboard_comercial" && <DashboardComercial apiBase={API_BASE_URL} token={user.token} usuario={user} />}
          {current === "visao_geral" && <VisaoGeralView representantes={repsVisiveis} lojas={lojasVisiveis} user={user} />}
          {current === "representantes" && user.perfil !== "representante" && (
            <RepresentantesView representantes={representantes} lojas={lojas} onSelect={setSelecionado} onCriar={handleCriarRepresentante} parametros={parametros} />
          )}
          {current === "carteira" && (
            <CarteiraLojasView key={buscaLojaKey} lojas={lojasVisiveis} representantes={representantes} api={api} onTransferir={handleTransferir} onCriarLoja={handleCriarLoja} user={user} buscaInicial={buscaLojaInicial} />
          )}
          {current === "condicoes" && (
            <CondicoesComerciaisView condicoes={condicoes} api={api} recarregar={recarregarTudo} representantes={representantes} user={user} registrarLog={registrarLog} />
          )}
          {current === "simulador" && (
            <SimuladorView condicoes={condicoes} representantes={representantes} parametros={parametros} />
          )}
          {current === "vendas" && (
            <VendasView vendas={vendasVisiveis} lojas={lojas} representantes={representantes} user={user} api={api} onImportado={recarregarTudo} />
          )}
          {current === "fechamentos" && (
            <FechamentosView fechamentos={fechamentos} api={api} recarregar={recarregarTudo} representantes={representantes} user={user} registrarLog={registrarLog} />
          )}
          {current === "comissoes" && (
            <ComissoesView fechamentos={fechamentos} representantes={representantes} user={user} />
          )}
          {current === "aprovacoes" && (
            <AprovacoesView condicoes={condicoes} fechamentos={fechamentos} api={api} recarregar={recarregarTudo} representantes={representantes} user={user} registrarLog={registrarLog} />
          )}
          {current === "pagamentos" && (
            <PagamentosView fechamentos={fechamentos} representantes={representantes} />
          )}
          {current === "relatorios" && (
            <RelatoriosView fechamentos={fechamentos} vendas={vendas} lojas={lojas} representantes={representantes} />
          )}
          {current === "auditoria" && <AuditoriaView logs={logs} />}
          {current === "metas" && (
            <MetasCampanhasView metas={metas} campanhas={campanhas} api={api} recarregar={recarregarTudo} representantes={representantes} vendas={vendas} lojas={lojas} user={user} registrarLog={registrarLog} />
          )}
          {current === "configuracoes" && (
            <ConfiguracoesView usuarios={usuarios} parametros={parametros} api={api} recarregar={recarregarTudo} representantes={representantes} user={user} registrarLog={registrarLog} />
          )}
          {!rotasConhecidas.includes(current) && (
            <EmConstrucaoView titulo={TITLES[current]?.[0] || current} />
          )}
        </main>
      </div>
      {selecionado && <RepresentanteDrawer representante={representantes.find((r) => r.id === selecionado.id) || selecionado} lojas={lojas} onClose={() => setSelecionado(null)} onAtualizar={handleAtualizarRepresentante} api={api} recarregar={recarregarTudo} user={user} registrarLog={registrarLog} />}
    </div>
  );
}

