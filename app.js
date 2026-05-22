/* ============================================================
   app.js — EcoTech Descarte
   Toda a lógica React do protótipo.
   Precisa ser carregado com type="text/babel" para que o Babel
   faça a transpilação do JSX no navegador.
   ============================================================ */

/* ── Hooks do React usados no projeto ───────────────────────
   useState  → gerencia estado local dos componentes
   useMemo   → memoriza cálculos pesados (ex: ranking)
   useEffect → efeitos colaterais (timers, animações)          */
const { useState, useMemo, useEffect } = React;

/* ============================= DADOS MOCK ============================= */
/* Dados simulados em memória. Em produção seriam substituídos por
   chamadas à API REST (Node/FastAPI + PostgreSQL).                      */

/* Perfis de usuário disponíveis no sistema.
   Cada perfil tem: rótulo completo, rótulo curto, cor do anel
   de avatar e cor do chip exibido no header.                            */
const ROLES = {
  aluno:      { label: "Aluno / Funcionário", short: "Aluno",  ring: "ring-emerald-400", chip: "bg-emerald-100 text-emerald-800" },
  professor:  { label: "Professor",           short: "Prof.",  ring: "ring-indigo-400",  chip: "bg-indigo-100 text-indigo-800"  },
  operador:   { label: "Operador do Ponto",   short: "Oper.",  ring: "ring-violet-400",  chip: "bg-violet-100 text-violet-800"  },
  admin:      { label: "Administrador",       short: "Admin",  ring: "ring-slate-400",   chip: "bg-slate-200 text-slate-800"    },
  visitante:  { label: "Visitante",           short: "Visit.", ring: "ring-amber-400",   chip: "bg-amber-100 text-amber-800"    },
};

/* Itens de navegação disponíveis para cada perfil.
   Cada entrada é [chave-da-tela, rótulo-no-menu].
   A tela inicial de cada perfil é sempre o primeiro item da lista.      */
const NAV_BY_ROLE = {
  aluno:     [["descarte","Descarte"],["mural","Mural"],["tickets","Meus tickets"],["certificados","Certificados"],["meus-dados","Meus dados (LGPD)"],["dashboard","Dashboard"]],
  professor: [["descarte","Descarte"],["mural","Mural"],["demandas","Demandas"],["tickets","Meus tickets"],["meus-dados","Meus dados (LGPD)"],["dashboard","Dashboard"]],
  operador:  [["operador","Painel do Operador"],["dashboard","Dashboard"]],
  admin:     [["admin","Administração"],["dashboard","Dashboard"]],
  visitante: [["dashboard","Dashboard público"]],
};

/* Catálogo de itens que podem ser descartados.
   destino define o fluxo: "Reciclagem" (convencional) ou
   "Reciclagem Especial" / "Resíduo Especial" (requer ponto específico). */
const CATALOGO = [
  { id: 1,  nome: "Teclado",          icone: "⌨️",  categoria: "Periférico", destino: "Reciclagem" },
  { id: 2,  nome: "Mouse",            icone: "🖱️",  categoria: "Periférico", destino: "Reciclagem" },
  { id: 3,  nome: "Notebook",         icone: "💻",  categoria: "Computador", destino: "Reciclagem Especial" },
  { id: 4,  nome: "Monitor",          icone: "🖥️",  categoria: "Computador", destino: "Reciclagem Especial" },
  { id: 5,  nome: "Bateria",          icone: "🔋",  categoria: "Bateria",    destino: "Resíduo Especial" },
  { id: 6,  nome: "Pilha",            icone: "⚡",  categoria: "Bateria",    destino: "Resíduo Especial" },
  { id: 7,  nome: "Cabo USB",         icone: "🔌",  categoria: "Cabo",       destino: "Reciclagem" },
  { id: 8,  nome: "HD / SSD",         icone: "💾",  categoria: "Computador", destino: "Reciclagem Especial" },
  { id: 9,  nome: "Celular",          icone: "📱",  categoria: "Computador", destino: "Reciclagem Especial" },
  { id: 10, nome: "Fone de ouvido",   icone: "🎧",  categoria: "Periférico", destino: "Reciclagem" },
  { id: 11, nome: "Carregador",       icone: "🔋",  categoria: "Cabo",       destino: "Reciclagem" },
  { id: 12, nome: "Roteador",         icone: "📶",  categoria: "Computador", destino: "Reciclagem Especial" },
];

/* Pontos de coleta físicos no campus.
   aceita → lista de categorias aceitas naquele ponto.
   qr     → código impresso no QR físico do ponto.                       */
const PONTOS = [
  { id: "P1", nome: "Biblioteca — Térreo",            aceita: ["Periférico","Cabo"],                     qr: "QR-BIB-01" },
  { id: "P2", nome: "Lab. de Hardware — Bloco B",     aceita: ["Computador","Periférico","Cabo"],       qr: "QR-LAB-HW" },
  { id: "P3", nome: "Coordenação ADS — Bloco C",      aceita: ["Periférico","Bateria"],                  qr: "QR-COORD"  },
  { id: "P4", nome: "Ponto de Baterias — Entrada",    aceita: ["Bateria"],                               qr: "QR-BAT-01" },
];

/* Estados do ciclo de vida de um ticket de descarte (índice 0–3).
   Usados na timeline visual e no controle de avanço pelo operador.      */
const ESTADOS = ["Aguardando entrega","Em triagem","Destinado","Concluído"];

/* Tickets de descarte pré-carregados como estado inicial da aplicação.
   aberto: true → visível no painel do operador.
   estado: número que indexa ESTADOS.                                    */
const TICKETS_INICIAIS = [
  { id: "TK-0001", item: "Teclado",   usuario: "Você",          curso: "ADS",  ponto: "Biblioteca — Térreo",         estado: 1, criado: "2026-04-20", aberto: false },
  { id: "TK-0002", item: "Bateria",   usuario: "Você",          curso: "ADS",  ponto: "Ponto de Baterias — Entrada", estado: 3, criado: "2026-04-15", aberto: false, doado: false },
  { id: "TK-0003", item: "Monitor",   usuario: "Maria Silva",   curso: "ADS",  ponto: "Lab. de Hardware — Bloco B",  estado: 0, criado: "2026-04-23", aberto: true  },
  { id: "TK-0004", item: "Notebook",  usuario: "João Santos",   curso: "SI",   ponto: "Lab. de Hardware — Bloco B",  estado: 2, criado: "2026-04-22", aberto: true  },
  { id: "TK-0005", item: "Pilha",     usuario: "Ana Costa",     curso: "ADM",  ponto: "Ponto de Baterias — Entrada", estado: 1, criado: "2026-04-22", aberto: true  },
];

/* Itens do mural de doação pré-carregados.
   tipo: "doacao" → alguém está oferecendo.
   tipo: "demanda" → professor/aluno está pedindo.                       */
const MURAL_INICIAL = [
  { id: "D1", item: "Notebook Dell antigo",  doador: "Pedro Lima",    descricao: "Liga mas bateria fraca. Útil para laboratório.",     estado: "Disponível", tipo: "doacao"  },
  { id: "D2", item: "Teclado mecânico",      doador: "Marta Reis",    descricao: "Uma tecla travando. Perfeito para peças.",            estado: "Reservado",  tipo: "doacao"  },
  { id: "D3", item: "HDs antigos (SATA)",    doador: "Prof. Carlos",  descricao: "Preciso para aula de montagem — qualquer quantidade.", estado: "Demanda",    tipo: "demanda" },
  { id: "D4", item: "Monitor 17\"",           doador: "Lucas Matos",   descricao: "Em pleno funcionamento, troquei por maior.",          estado: "Disponível", tipo: "doacao"  },
];

/* Dados mock de ranking por curso para o Dashboard de Impacto.
   ipa (itens por aluno) é calculado em tempo real no componente.        */
const RANKING = [
  { curso: "ADS",                         total: 140, alunos: 50 },
  { curso: "Sistemas de Informação",      total:  84, alunos: 40 },
  { curso: "Administração",               total: 120, alunos: 80 },
  { curso: "Pedagogia",                   total:  54, alunos: 60 },
  { curso: "Direito",                     total:  63, alunos: 90 },
];

/* ============================= HELPERS ============================= */

/* cls → concatena classes CSS filtrando valores falsy (undefined, false, "").
   Substitui a lib clsx sem dependência extra.                            */
const cls = (...xs) => xs.filter(Boolean).join(" ");

/* Badge → chip de destaque visual (categoria, status, épico).
   tone define o esquema de cores; padrão: "slate".                      */
function Badge({children, tone="slate"}) {
  const map = {
    slate:   "bg-slate-100 text-slate-700 border-slate-200",
    emerald: "bg-emerald-100 text-emerald-800 border-emerald-200",
    amber:   "bg-amber-100 text-amber-800 border-amber-200",
    indigo:  "bg-indigo-100 text-indigo-800 border-indigo-200",
    violet:  "bg-violet-100 text-violet-800 border-violet-200",
    rose:    "bg-rose-100 text-rose-800 border-rose-200",
    blue:    "bg-blue-100 text-blue-800 border-blue-200",
  };
  return <span className={cls("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border", map[tone])}>{children}</span>;
}

/* Card → container branco com borda e sombra suave.
   className permite adicionar classes extras (ex: padding, overflow).   */
function Card({children, className=""}) {
  return <div className={cls("bg-white border border-slate-200 rounded-xl shadow-sm", className)}>{children}</div>;
}

/* Btn → botão reutilizável com variantes visuais e tamanhos.
   variant: primary | ghost | danger | dark | subtle
   size: sm | md | lg
   disabled: aplica opacidade e bloqueia clique.                         */
function Btn({children, onClick, variant="primary", size="md", className="", type="button", disabled}) {
  const base = "inline-flex items-center justify-center gap-2 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = { sm: "px-3 py-1.5 text-sm rounded-md", md: "px-4 py-2 text-sm rounded-lg", lg: "px-5 py-2.5 text-base rounded-lg" };
  const variants = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700",
    ghost:   "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50",
    danger:  "bg-rose-600 text-white hover:bg-rose-700",
    dark:    "bg-slate-900 text-white hover:bg-slate-800",
    subtle:  "bg-slate-100 text-slate-700 hover:bg-slate-200",
  };
  return <button type={type} disabled={disabled} onClick={onClick} className={cls(base, sizes[size], variants[variant], className)}>{children}</button>;
}

/* ============================= HEADER ============================= */
/* Cabeçalho fixo no topo com logo, seletor de perfil e menu de navegação.
   O menu muda dinamicamente conforme o papel selecionado (NAV_BY_ROLE).
   Ao trocar de papel, a tela inicial é redefinida para a primeira
   opção disponível daquele perfil.                                       */
function Header({role, setRole, screen, setScreen}) {
  const nav = NAV_BY_ROLE[role];
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-md bg-emerald-600 text-white grid place-items-center font-bold">E</div>
          <div>
            <div className="text-sm font-bold leading-tight">EcoTech Descarte</div>
            <div className="text-[11px] text-slate-500 leading-tight">Protótipo — Engenharia de Software · ADS</div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1 text-xs text-slate-500">Simular papel:</div>
          <select
            value={role}
            onChange={(e)=>{ setRole(e.target.value); setScreen(NAV_BY_ROLE[e.target.value][0][0]); }}
            className="text-sm border border-slate-300 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {Object.entries(ROLES).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <span className={cls("text-xs px-2 py-1 rounded-md", ROLES[role].chip)}>{ROLES[role].short}</span>
        </div>
      </div>

      {/* Abas de navegação — rolagem horizontal em mobile */}
      <nav className="max-w-7xl mx-auto px-2 flex gap-1 overflow-x-auto">
        {nav.map(([key,label]) => (
          <button
            key={key}
            onClick={()=>setScreen(key)}
            className={cls(
              "px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px",
              screen===key ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-600 hover:text-slate-900"
            )}
          >{label}</button>
        ))}
      </nav>
    </header>
  );
}

/* ============================= ÉPICO A — DESCARTE (catálogo + ticket + QR) ============================= */
/* Tela principal de descarte. Exibe o catálogo de itens eletrônicos
   com filtro por categoria e busca por nome. Ao clicar num item,
   abre o ModalItem que guia o usuário pelo fluxo de descarte.           */
function ScreenDescarte({onGenerateTicket}) {
  const [filtro, setFiltro] = useState("Todos");
  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState(null); // item selecionado para o modal

  const categorias = ["Todos", ...Array.from(new Set(CATALOGO.map(i=>i.categoria)))];
  const itens = CATALOGO.filter(i =>
    (filtro==="Todos" || i.categoria===filtro) &&
    (busca==="" || i.nome.toLowerCase().includes(busca.toLowerCase()))
  );

  return (
    <div className="fade-in space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">O que você quer descartar?</h1>
          <p className="text-slate-600 text-sm">Selecione um item do catálogo. O sistema te orienta sobre o destino correto e gera um ticket de descarte.</p>
        </div>
        <Badge tone="blue">Épico A · UC03 · UC04</Badge>
      </div>

      {/* Barra de busca + filtros de categoria */}
      <Card className="p-4 flex flex-wrap gap-3">
        <input
          value={busca}
          onChange={e=>setBusca(e.target.value)}
          placeholder="Buscar item (ex: teclado, bateria)…"
          className="flex-1 min-w-[220px] border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
        <div className="flex gap-1 flex-wrap">
          {categorias.map(c => (
            <button key={c} onClick={()=>setFiltro(c)}
              className={cls("px-3 py-1.5 text-xs rounded-full border",
                filtro===c ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              )}>{c}</button>
          ))}
        </div>
      </Card>

      {/* Grid de cards de itens do catálogo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {itens.map(i => (
          <button key={i.id} onClick={()=>setModal(i)}
            className="group text-left bg-white border border-slate-200 rounded-xl p-3 hover:border-emerald-400 hover:shadow transition">
            <div className="text-3xl">{i.icone}</div>
            <div className="mt-2 font-semibold text-sm">{i.nome}</div>
            <div className="text-[11px] text-slate-500">{i.categoria}</div>
            <div className="mt-2"><Badge tone={i.destino.includes("Especial")?"rose":"emerald"}>{i.destino}</Badge></div>
          </button>
        ))}
      </div>

      {/* Modal abre ao clicar em um item — guia o descarte em 2 passos */}
      {modal && <ModalItem item={modal} onClose={()=>setModal(null)} onGenerate={(ponto, funciona)=>{ onGenerateTicket(modal, ponto, funciona); setModal(null); }} />}
    </div>
  );
}

/* Modal de item — fluxo em 2 passos:
   Passo 1: o item ainda funciona? (oferta mural ou descarte)
   Passo 2a: item funciona → publicar no Mural de Doação
   Passo 2b: item não funciona → escolher ponto de coleta compatível    */
function ModalItem({item, onClose, onGenerate}) {
  const [step, setStep] = useState(1);
  const [funciona, setFunciona] = useState(null);
  const [ponto, setPonto] = useState(null);
  const pontosCompat = PONTOS.filter(p => p.aceita.includes(item.categoria));

  return (
    <div className="fixed inset-0 bg-slate-900/50 grid place-items-center p-4 z-40">
      <div className="bg-white rounded-xl w-full max-w-xl shadow-xl overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-slate-200">
          <div className="text-3xl">{item.icone}</div>
          <div>
            <div className="font-bold">{item.nome}</div>
            <div className="text-xs text-slate-500">{item.categoria} · destino sugerido: <b>{item.destino}</b></div>
          </div>
          <button className="ml-auto text-slate-400 hover:text-slate-700" onClick={onClose}>✕</button>
        </div>

        {/* Passo 1: pergunta se o item funciona */}
        {step===1 && (
          <div className="p-5 space-y-4">
            <div className="font-semibold">Este item ainda funciona?</div>
            <div className="flex gap-2">
              <Btn variant={funciona===true?"primary":"ghost"} onClick={()=>setFunciona(true)}>Sim — ofertar no mural</Btn>
              <Btn variant={funciona===false?"dark":"ghost"} onClick={()=>setFunciona(false)}>Não — encaminhar para descarte</Btn>
            </div>
            <p className="text-xs text-slate-500">RN-08: doações valem pontuação maior que descarte comum (incentivo ao reuso).</p>
            <div className="flex justify-end">
              <Btn disabled={funciona===null} onClick={()=>setStep(2)}>Continuar</Btn>
            </div>
          </div>
        )}

        {/* Passo 2a: item funciona → encaminha para o Mural */}
        {step===2 && funciona===true && (
          <div className="p-5 space-y-4">
            <div className="font-semibold">Ótimo! Seu item pode virar doação.</div>
            <p className="text-sm text-slate-600">Vamos publicar no Mural de Doação (Épico B). Se em 30 dias ninguém reservar, volta ao descarte (RN-05).</p>
            <div className="flex justify-end gap-2">
              <Btn variant="ghost" onClick={()=>setStep(1)}>Voltar</Btn>
              <Btn onClick={()=>onGenerate(null, true)}>Publicar no Mural</Btn>
            </div>
          </div>
        )}

        {/* Passo 2b: item não funciona → lista pontos compatíveis com a categoria */}
        {step===2 && funciona===false && (
          <div className="p-5 space-y-4">
            <div className="font-semibold">Escolha um ponto de coleta compatível</div>
            <div className="grid gap-2">
              {pontosCompat.map(p => (
                <button key={p.id} onClick={()=>setPonto(p)}
                  className={cls("text-left border rounded-lg p-3", ponto?.id===p.id ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-slate-300")}>
                  <div className="font-semibold text-sm">{p.nome}</div>
                  <div className="text-xs text-slate-500">Aceita: {p.aceita.join(", ")}</div>
                </button>
              ))}
              {pontosCompat.length===0 && <div className="text-sm text-rose-600">Nenhum ponto compatível cadastrado para esta categoria.</div>}
            </div>
            <div className="flex justify-end gap-2">
              <Btn variant="ghost" onClick={()=>setStep(1)}>Voltar</Btn>
              <Btn disabled={!ponto} onClick={()=>onGenerate(ponto, false)}>Gerar ticket</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================= MEUS TICKETS + SIMULAR QR ============================= */
/* Tela de acompanhamento dos tickets do usuário logado ("Você").
   Permite simular o escaneamento do QR Code do ponto para confirmar
   a entrega e avançar o estado do ticket.                               */
function ScreenTickets({tickets, setTickets}) {
  const meus = tickets.filter(t => t.usuario === "Você");
  const [qr, setQR] = useState(null); // ticket selecionado para escanear QR

  /* Avança o estado do ticket em +1 (máx: 3 = Concluído) */
  const avancar = (id) => {
    setTickets(ts => ts.map(t => t.id===id ? {...t, estado: Math.min(t.estado+1, 3)} : t));
  };

  return (
    <div className="fade-in space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Meus tickets de descarte</h1>
          <p className="text-slate-600 text-sm">Acompanhe o ciclo do seu ticket até a confirmação no ponto físico.</p>
        </div>
        <Badge tone="blue">UC05 · UC06</Badge>
      </div>

      <div className="grid gap-4">
        {meus.map(t => <TicketCard key={t.id} t={t} onScan={()=>setQR(t)} />)}
        {meus.length===0 && <Card className="p-6 text-center text-slate-500 text-sm">Você ainda não gerou tickets. Vá para a aba <b>Descarte</b>.</Card>}
      </div>

      {qr && <ModalQR ticket={qr} onClose={()=>setQR(null)} onConfirm={()=>{ avancar(qr.id); setQR(null); }} />}
    </div>
  );
}

/* Card individual de ticket com timeline de estados e botão de scan QR */
function TicketCard({t, onScan}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs text-slate-500 font-mono">{t.id}</div>
          <div className="font-semibold text-lg">{t.item}</div>
          <div className="text-sm text-slate-600">{t.ponto}</div>
          <div className="text-xs text-slate-500 mt-1">Criado em {t.criado}</div>
        </div>
        <div className="flex items-center gap-2">
          {t.estado < 3 && <Btn variant="ghost" size="sm" onClick={onScan}>Escanear QR do ponto</Btn>}
          <Badge tone={t.estado===3?"emerald":"amber"}>{ESTADOS[t.estado]}</Badge>
        </div>
      </div>
      <Timeline estado={t.estado} />
    </Card>
  );
}

/* Linha do tempo visual com 4 etapas numeradas.
   Etapas concluídas ficam em verde; futuras, em cinza.
   A linha conectora também muda de cor conforme o progresso.            */
function Timeline({estado}) {
  return (
    <div className="mt-4 flex items-center gap-0">
      {ESTADOS.map((e, i) => (
        <React.Fragment key={e}>
          <div className="flex flex-col items-center flex-1">
            <div className={cls("w-7 h-7 rounded-full grid place-items-center text-xs font-bold border-2",
              i <= estado ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-400 border-slate-300"
            )}>{i+1}</div>
            <div className={cls("mt-2 text-[11px] text-center", i<=estado?"text-slate-900 font-medium":"text-slate-400")}>{e}</div>
          </div>
          {i<ESTADOS.length-1 && <div className={cls("h-0.5 flex-1 -mt-5", i<estado?"bg-emerald-600":"bg-slate-200")} />}
        </React.Fragment>
      ))}
    </div>
  );
}

/* Modal de simulação de QR Code.
   Após 1,6s simula a leitura do QR e libera o botão de confirmação.
   Ao confirmar, avança o estado do ticket e fecha o modal.              */
function ModalQR({ticket, onClose, onConfirm}) {
  const [scanning, setScanning] = useState(true);
  useEffect(()=>{ const t = setTimeout(()=>setScanning(false), 1600); return ()=>clearTimeout(t); }, []);
  return (
    <div className="fixed inset-0 bg-slate-900/60 grid place-items-center p-4 z-40">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center">
          <div className="font-bold">Escanear QR do ponto</div>
          <button className="ml-auto text-slate-400 hover:text-slate-700" onClick={onClose}>✕</button>
        </div>
        <div className="p-6 flex flex-col items-center">
          {/* Representação visual do QR + linha de scan animada */}
          <div className="w-44 h-44 qr-pattern opacity-90 border-4 border-slate-900 rounded-md relative overflow-hidden">
            {scanning && <div className="absolute left-0 right-0 h-1 bg-emerald-400 animate-pulse" style={{top:"50%"}} />}
          </div>
          <div className="mt-4 text-sm text-center text-slate-600">
            {scanning ? "Lendo QR…" : <span>QR <b>{ticket.ponto}</b> reconhecido.</span>}
          </div>
          <Btn className="mt-5 w-full" disabled={scanning} onClick={onConfirm}>Confirmar entrega</Btn>
        </div>
      </div>
    </div>
  );
}

/* ============================= ÉPICO B — MURAL DE DOAÇÃO ============================= */
/* Tela de mural comunitário. Exibe doações disponíveis e demandas abertas.
   Alunos podem reservar itens; professores criam demandas de equipamentos.
   Filtro por tipo: "todos" | "doacao" | "demanda".                      */
function ScreenMural({role, mural, setMural}) {
  const [filtro, setFiltro] = useState("todos");
  const [novo, setNovo] = useState(false); // controla abertura do modal de nova publicação
  const itens = mural.filter(m => filtro==="todos" || m.tipo===filtro);

  /* Marca item como "Reservado" no estado imutável do mural */
  const reservar = (id) => setMural(ms => ms.map(m => m.id===id ? {...m, estado: "Reservado"} : m));

  return (
    <div className="fade-in space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Mural de Doação</h1>
          <p className="text-slate-600 text-sm">Antes de descartar, ofereça à comunidade. Antes de descartar, ofereça à comunidade. Economia circular dentro da faculdade.</p>
        </div>
        <div className="flex gap-2">
          <Badge tone="emerald">Épico B · UC07 · UC08 · UC10</Badge>
          <Btn onClick={()=>setNovo(true)}>+ Publicar doação</Btn>
        </div>
      </div>

      {/* Filtros de tipo */}
      <div className="flex gap-1">
        {[["todos","Todos"],["doacao","Doações"],["demanda","Demandas"]].map(([k,l]) =>
          <button key={k} onClick={()=>setFiltro(k)}
            className={cls("px-3 py-1.5 text-xs rounded-full border",
              filtro===k ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50")}>{l}</button>)}
      </div>

      {/* Grid de cards do mural */}
      <div className="grid md:grid-cols-2 gap-4">
        {itens.map(m => (
          <Card key={m.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs font-mono text-slate-500">{m.id}</div>
                <div className="font-semibold">{m.item}</div>
                <div className="text-xs text-slate-500">Por {m.doador}</div>
              </div>
              <Badge tone={m.tipo==="demanda"?"indigo":(m.estado==="Reservado"?"amber":"emerald")}>
                {m.tipo==="demanda"?"Demanda":m.estado}
              </Badge>
            </div>
            <p className="mt-3 text-sm text-slate-700">{m.descricao}</p>
            <div className="mt-3 flex gap-2">
              {m.tipo==="doacao" && m.estado==="Disponível" && <Btn size="sm" onClick={()=>reservar(m.id)}>Reservar item</Btn>}
              {m.tipo==="doacao" && m.estado==="Reservado" && <Btn size="sm" variant="ghost">QR de retirada</Btn>}
              {m.tipo==="demanda" && <Btn size="sm" variant="ghost">Tenho esse item</Btn>}
            </div>
          </Card>
        ))}
      </div>

      {novo && <ModalNovaDoacao role={role} onClose={()=>setNovo(false)} onSave={(d)=>{ setMural(ms => [{id:"D"+(ms.length+1), ...d}, ...ms]); setNovo(false); }}/>}
    </div>
  );
}

/* Modal de publicação de nova doação ou demanda.
   O tipo é inferido pelo papel: professor → demanda; demais → doacao.   */
function ModalNovaDoacao({role, onClose, onSave}) {
  const [item, setItem] = useState("");
  const [desc, setDesc] = useState("");
  const tipo = role==="professor" ? "demanda" : "doacao";
  return (
    <div className="fixed inset-0 bg-slate-900/60 grid place-items-center p-4 z-40">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div className="p-4 border-b flex items-center">
          <div className="font-bold">{tipo==="demanda"?"Publicar demanda":"Publicar doação"}</div>
          <button className="ml-auto text-slate-400" onClick={onClose}>✕</button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Item</label>
            <input value={item} onChange={e=>setItem(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Descrição</label>
            <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows="3" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"/>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
            <Btn disabled={!item} onClick={()=>onSave({item, doador: tipo==="demanda"?"Prof. (você)":"Você", descricao: desc || "Sem descrição.", estado: tipo==="demanda"?"Demanda":"Disponível", tipo})}>Publicar</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================= ÉPICO B — DEMANDAS (PROFESSOR) ============================= */
/* Tela exclusiva do papel Professor. Lista apenas as demandas do mural
   e permite criar novas. É uma visão filtrada do mural focada em UC09.  */
function ScreenDemandas({mural, setMural}) {
  const [novo, setNovo] = useState(false);
  const demandas = mural.filter(m=>m.tipo==="demanda");
  return (
    <div className="fade-in space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Minhas demandas</h1>
          <p className="text-slate-600 text-sm">Publique pedidos de equipamento que podem virar doação de alunos (ex: HDs velhos para aula de hardware).</p>
        </div>
        <div className="flex gap-2">
          <Badge tone="indigo">UC09</Badge>
          <Btn onClick={()=>setNovo(true)}>+ Nova demanda</Btn>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {demandas.map(d => (
          <Card key={d.id} className="p-4">
            <div className="font-semibold">{d.item}</div>
            <p className="text-sm text-slate-600 mt-1">{d.descricao}</p>
            <div className="mt-2"><Badge tone="indigo">Demanda ativa</Badge></div>
          </Card>
        ))}
      </div>
      {novo && <ModalNovaDoacao role="professor" onClose={()=>setNovo(false)} onSave={(d)=>{ setMural(ms=>[{id:"D"+(ms.length+1), ...d}, ...ms]); setNovo(false); }}/>}
    </div>
  );
}

/* ============================= ÉPICO D — PAINEL OPERADOR ============================= */
/* Painel exclusivo do Operador do Ponto. Exibe todos os tickets em aberto
   numa tabela com controles de avanço e retrocesso de estado.
   RN-14: só o operador avança de "Em triagem" em diante.
   RN-15: ticket "Concluído" é imutável.
   RN-16: toda transição deve registrar autor + timestamp (mock aqui).   */
function ScreenOperador({tickets, setTickets}) {
  const abertos = tickets.filter(t=>t.aberto || t.estado<3);
  const avancar = (id) => setTickets(ts => ts.map(t => t.id===id ? {...t, estado: Math.min(t.estado+1, 3)} : t));
  const voltar  = (id) => setTickets(ts => ts.map(t => t.id===id ? {...t, estado: Math.max(t.estado-1, 0)} : t));

  return (
    <div className="fade-in space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Painel do Operador</h1>
          <p className="text-slate-600 text-sm">Gestão dos tickets entregues no ponto. Atualize o estado conforme a triagem.</p>
        </div>
        <Badge tone="violet">Épico D · UC11 · UC12</Badge>
      </div>

      {/* Tabela de tickets com ações de avanço/retrocesso */}
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Ticket</th>
              <th className="text-left px-4 py-3">Item</th>
              <th className="text-left px-4 py-3">Usuário</th>
              <th className="text-left px-4 py-3">Ponto</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-right px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {abertos.map(t=>(
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs">{t.id}</td>
                <td className="px-4 py-3 font-medium">{t.item}</td>
                <td className="px-4 py-3 text-slate-600">{t.usuario} <span className="text-slate-400">· {t.curso}</span></td>
                <td className="px-4 py-3 text-slate-600">{t.ponto}</td>
                <td className="px-4 py-3"><Badge tone={t.estado===3?"emerald":"amber"}>{ESTADOS[t.estado]}</Badge></td>
                <td className="px-4 py-3 text-right space-x-1">
                  <Btn size="sm" variant="ghost" onClick={()=>voltar(t.id)} disabled={t.estado===0}>◀</Btn>
                  <Btn size="sm" onClick={()=>avancar(t.id)} disabled={t.estado===3}>Avançar estado</Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Card de destaque das regras de negócio relevantes */}
      <Card className="p-4">
        <div className="text-sm font-semibold mb-2">Regra de negócio destacada</div>
        <p className="text-sm text-slate-600">
          <b>RN-14:</b> Apenas o Operador pode avançar do estado <i>Em triagem</i> para frente. <b>RN-15:</b> Ticket em <i>Concluído</i> é imutável. <b>RN-16:</b> Toda transição registra autor + timestamp (trilha de auditoria RNF-09).
        </p>
      </Card>
    </div>
  );
}

/* ============================= ÉPICO C — DASHBOARD ============================= */
/* Dashboard público de impacto ambiental. Exibe KPIs calculados a partir
   dos tickets + mock acumulado. Otimizado para exibição em TV (UC14).
   Contém ranking por curso (ipa = itens por aluno), gráfico de barras
   por categoria e gráfico de linha dos últimos 6 meses.                 */
function ScreenDashboard({tickets}) {
  const concluidos = tickets.filter(t=>t.estado===3).length + 112; // 112 = dados históricos mock
  const reuso = 38;
  const co2 = (concluidos * 2.3).toFixed(1); // estimativa: 2,3 kg CO₂ por item

  /* useMemo evita recalcular o ranking a cada render sem mudança nos dados */
  const rankingCalc = useMemo(()=> {
    return RANKING.map(r => ({...r, ipa: (r.total/r.alunos).toFixed(2)}))
      .sort((a,b)=> b.ipa - a.ipa);
  },[]);

  return (
    <div className="fade-in space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard de Impacto</h1>
          <p className="text-slate-600 text-sm">Visão pública. Otimizado para exibição em TV no hall da faculdade.</p>
        </div>
        <Badge tone="amber">Épico C · UC13 · UC14 · UC15</Badge>
      </div>

      {/* KPIs em grid de 4 colunas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Itens descartados corretamente" value={concluidos} tone="emerald"/>
        <KPI label="Itens reaproveitados (Mural)"   value={reuso}       tone="indigo"/>
        <KPI label="CO₂ evitado (kg est.)"          value={co2}         tone="amber"/>
        <KPI label="Pontos de coleta ativos"        value={PONTOS.length} tone="slate"/>
      </div>

      {/* Ranking por curso com barra de progresso proporcional ao ipa */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Ranking por curso <span className="text-xs text-slate-500">(itens por aluno — RN-11)</span></div>
          <Btn variant="ghost" size="sm">Exportar PDF</Btn>
        </div>
        <div className="space-y-2">
          {rankingCalc.map((r,idx)=>(
            <div key={r.curso} className="flex items-center gap-3">
              <div className="w-6 text-slate-500 font-mono text-sm">{idx+1}º</div>
              <div className="w-44 font-medium text-sm">{r.curso}</div>
              <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                <div className="bg-emerald-500 h-full" style={{width: Math.min(100, (r.ipa/3)*100) + "%"}}/>
              </div>
              <div className="text-sm font-semibold w-20 text-right">{r.ipa} <span className="text-xs text-slate-500">ipa</span></div>
            </div>
          ))}
        </div>
      </Card>

      {/* Dois gráficos lado a lado: barras por categoria e linha temporal */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="font-semibold mb-2">Distribuição por categoria</div>
          <BarsMock/>
        </Card>
        <Card className="p-5">
          <div className="font-semibold mb-2">Evolução últimos 6 meses</div>
          <LineMock/>
        </Card>
      </div>
    </div>
  );
}

/* Card de KPI individual com gradiente de cor por tone */
function KPI({label, value, tone="emerald"}) {
  const tones = {
    emerald:"from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-900",
    indigo: "from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-900",
    amber:  "from-amber-50 to-amber-100 border-amber-200 text-amber-900",
    slate:  "from-slate-50 to-slate-100 border-slate-200 text-slate-900",
  };
  return (
    <div className={cls("rounded-xl border p-4 bg-gradient-to-br", tones[tone])}>
      <div className="text-3xl font-bold tracking-tight">{value}</div>
      <div className="text-xs mt-1 opacity-80">{label}</div>
    </div>
  );
}

/* Gráfico de barras horizontal mock — distribuição por categoria de item */
function BarsMock(){
  const bars = [["Computador", 68],["Periférico", 44],["Bateria", 28],["Cabo", 22]];
  return (
    <div className="space-y-2 mt-2">
      {bars.map(([l,v])=>(
        <div key={l} className="flex items-center gap-3 text-sm">
          <div className="w-24 text-slate-700">{l}</div>
          <div className="flex-1 bg-slate-100 rounded h-5 overflow-hidden">
            <div className="bg-indigo-500 h-full" style={{width: v+"%"}}/>
          </div>
          <div className="w-10 text-right font-semibold">{v}</div>
        </div>
      ))}
    </div>
  );
}

/* Gráfico de linha SVG mock — evolução mensal dos últimos 6 meses.
   Calcula coordenadas dos pontos proporcionalmente à altura do viewBox. */
function LineMock(){
  const pts = [12, 18, 14, 26, 34, 42];
  const max = Math.max(...pts);
  const w = 380, h = 120, gap = w/(pts.length-1);
  const d = pts.map((p,i)=> `${i===0?"M":"L"} ${i*gap} ${h-(p/max)*h}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h+20}`} className="w-full h-36">
      <path d={d} fill="none" stroke="#10b981" strokeWidth="3"/>
      {pts.map((p,i)=>(<circle key={i} cx={i*gap} cy={h-(p/max)*h} r="4" fill="#10b981"/>))}
      {["nov","dez","jan","fev","mar","abr"].map((m,i)=>(
        <text key={m} x={i*gap} y={h+14} fontSize="10" fill="#64748b" textAnchor="middle">{m}</text>
      ))}
    </svg>
  );
}

/* ============================= CERTIFICADOS ============================= */
/* Tela de certificados digitais. Apenas tickets com estado 3 (Concluído)
   do próprio usuário geram certificado (UC16).                           */
function ScreenCertificados({tickets}) {
  const concluidos = tickets.filter(t=>t.estado===3 && t.usuario==="Você");
  return (
    <div className="fade-in space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Meus certificados</h1>
          <p className="text-slate-600 text-sm">Cada ticket concluído gera um certificado digital de descarte consciente.</p>
        </div>
        <Badge tone="amber">UC16</Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {concluidos.map(t => <Certificado key={t.id} t={t}/>)}
        {concluidos.length===0 && <Card className="p-6 text-center text-slate-500">Nenhum certificado ainda — conclua um ticket para ver.</Card>}
      </div>
    </div>
  );
}

/* Card visual de certificado individual com gradiente verde e botões de
   download (mock) e compartilhamento.                                   */
function Certificado({t}) {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-5 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white">
        <div className="text-xs opacity-80">Certificado digital</div>
        <div className="text-lg font-bold">Descarte Consciente</div>
        <div className="text-xs opacity-80 mt-1">EcoTech Descarte · ADS</div>
      </div>
      <div className="p-5 space-y-1">
        <div className="text-sm text-slate-600">Este certificado reconhece</div>
        <div className="text-lg font-bold">Isabela Meneses</div>
        <div className="text-sm text-slate-600">pelo descarte correto de <b>{t.item}</b> no ponto <b>{t.ponto}</b>.</div>
        <div className="text-xs text-slate-500 mt-2">Ticket {t.id} · {t.criado}</div>
        <div className="mt-3 flex gap-2">
          <Btn size="sm">Baixar PDF</Btn>
          <Btn size="sm" variant="ghost">Compartilhar</Btn>
        </div>
      </div>
    </Card>
  );
}

/* ============================= ADMIN ============================= */
/* Painel de administração com 4 sub-abas internas:
   - Pontos de coleta: tabela com código, nome, categorias aceitas e QR
   - Itens do catálogo: grid visual
   - Gerar QR Codes: preview do QR de cada ponto com botão imprimir
   - Usuários: placeholder (mock de gerenciamento)                       */
function ScreenAdmin() {
  const [tab, setTab] = useState("pontos"); // sub-aba ativa
  return (
    <div className="fade-in space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Administração</h1>
          <p className="text-slate-600 text-sm">Cadastros estruturais do sistema.</p>
        </div>
        <Badge tone="slate">UC17 · UC18 · UC19 · UC20</Badge>
      </div>

      {/* Tabs internas da administração */}
      <div className="flex gap-1 border-b border-slate-200">
        {[["pontos","Pontos de coleta"],["itens","Itens do catálogo"],["qr","Gerar QR Codes"],["usuarios","Usuários"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)}
            className={cls("px-3 py-2 text-sm font-medium border-b-2 -mb-px",
              tab===k?"border-emerald-600 text-emerald-700":"border-transparent text-slate-600 hover:text-slate-900")}>{l}</button>
        ))}
      </div>

      {/* Sub-aba: Pontos de coleta */}
      {tab==="pontos" && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600">
              <tr><th className="text-left px-4 py-3">Código</th><th className="text-left px-4 py-3">Nome</th><th className="text-left px-4 py-3">Aceita</th><th className="text-left px-4 py-3">QR</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {PONTOS.map(p=>(
                <tr key={p.id}><td className="px-4 py-3 font-mono text-xs">{p.id}</td><td className="px-4 py-3 font-medium">{p.nome}</td><td className="px-4 py-3 text-slate-600">{p.aceita.join(", ")}</td><td className="px-4 py-3 font-mono text-xs">{p.qr}</td></tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Sub-aba: Itens do catálogo */}
      {tab==="itens" && (
        <Card className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {CATALOGO.map(i=>(
              <div key={i.id} className="border rounded-lg p-3">
                <div className="text-2xl">{i.icone}</div>
                <div className="text-sm font-semibold">{i.nome}</div>
                <div className="text-xs text-slate-500">{i.categoria}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Sub-aba: Gerar QR Codes — visualização com padrão CSS de QR */}
      {tab==="qr" && (
        <div className="grid md:grid-cols-2 gap-4">
          {PONTOS.map(p=>(
            <Card key={p.id} className="p-5 flex items-center gap-4">
              <div className="w-28 h-28 qr-pattern border-4 border-slate-900 rounded-md"/>
              <div>
                <div className="text-xs text-slate-500 font-mono">{p.qr}</div>
                <div className="font-semibold">{p.nome}</div>
                <Btn size="sm" className="mt-2">Imprimir</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Sub-aba: Usuários — placeholder mock */}
      {tab==="usuarios" && (
        <Card className="p-5 text-sm text-slate-600">Tela de gerenciamento de usuários (mock — inclui papéis e ativação).</Card>
      )}
    </div>
  );
}

/* ============================= LGPD — MEUS DADOS ============================= */
/* Tela de privacidade conforme a LGPD (Lei nº 13.709/2018).
   Permite ao usuário: ver seus dados, exportar em JSON (portabilidade)
   e solicitar exclusão (atendida em até 15 dias úteis — RN-19).
   Dados sensíveis são pseudonimizados após exclusão (RN-20).            */
function ScreenMeusDados() {
  const [confirmExc, setConfirmExc] = useState(false); // abre modal de confirmação
  const [exportado, setExportado] = useState(false);   // feedback pós-exportação

  /* Dados pessoais simulados do usuário atual */
  const dadosUsuario = {
    matricula: "20260001",
    nome: "Isabela Meneses",
    email: "isabela.meneses@anhanguera.edu.br",
    curso: "ADS",
    cadastradoEm: "2026-04-15",
    consentimento: "Aceito em 15/04/2026 às 19:42",
    tickets: 3,
    certificados: 1,
  };

  /* exportarJSON → cria Blob com os dados, dispara download automático */
  const exportarJSON = () => {
    const blob = new Blob([JSON.stringify(dadosUsuario, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "meus-dados-ecotech.json"; a.click();
    URL.revokeObjectURL(url); setExportado(true); setTimeout(()=>setExportado(false), 2500);
  };

  return (
    <div className="fade-in space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Meus dados (LGPD)</h1>
          <p className="text-slate-600 text-sm">Visualize, exporte ou solicite a exclusão dos seus dados pessoais. Lei nº 13.709/2018 — Art. 18.</p>
        </div>
        <Badge tone="indigo">RF-19 · RF-20 · RN-19</Badge>
      </div>

      {/* Tabela de dados pessoais armazenados */}
      <Card className="p-5">
        <div className="font-semibold mb-3">Dados pessoais armazenados</div>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          {Object.entries(dadosUsuario).map(([k,v])=>(
            <div key={k} className="flex justify-between border-b border-slate-100 py-1.5">
              <span className="text-slate-500 capitalize">{k.replace(/([A-Z])/g," $1")}</span>
              <span className="font-medium text-right">{String(v)}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Três ações LGPD: Acessar, Portabilidade, Exclusão */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="font-semibold mb-1">Acessar</div>
          <p className="text-sm text-slate-600 mb-3">Veja todos os dados que o sistema mantém sobre você.</p>
          <Btn variant="ghost" size="sm">Já está exibido acima</Btn>
        </Card>
        <Card className="p-5">
          <div className="font-semibold mb-1">Portabilidade</div>
          <p className="text-sm text-slate-600 mb-3">Exporte em formato JSON legível por outros sistemas.</p>
          <Btn size="sm" onClick={exportarJSON}>Baixar dados (.json)</Btn>
          {exportado && <div className="text-xs text-emerald-700 mt-2">Arquivo gerado.</div>}
        </Card>
        <Card className="p-5">
          <div className="font-semibold mb-1">Exclusão</div>
          <p className="text-sm text-slate-600 mb-3">Solicitação atendida em até 15 dias úteis (RN-19).</p>
          <Btn variant="danger" size="sm" onClick={()=>setConfirmExc(true)}>Solicitar exclusão</Btn>
        </Card>
      </div>

      {/* Informações do DPO (Encarregado pelos Dados) — Art. 41 LGPD */}
      <Card className="p-5">
        <div className="font-semibold mb-2">Encarregado pelos Dados (DPO)</div>
        <div className="text-sm text-slate-700">
          <div><b>Nome:</b> [Nome do DPO da instituição]</div>
          <div><b>E-mail:</b> dpo@instituicao.edu.br</div>
          <div className="text-xs text-slate-500 mt-2">Conforme Art. 41 da LGPD, o titular pode contatar o Encarregado para esclarecimentos sobre o tratamento de seus dados.</div>
        </div>
      </Card>

      {/* Modal de confirmação de exclusão — ação irreversível */}
      {confirmExc && (
        <div className="fixed inset-0 bg-slate-900/60 grid place-items-center p-4 z-40">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="p-4 border-b font-bold text-rose-700">Confirmar solicitação de exclusão</div>
            <div className="p-5 text-sm space-y-3">
              <p>Sua solicitação será processada em até <b>15 dias úteis</b>. Após a exclusão, seus certificados serão pseudonimizados (RN-20) — sua contribuição histórica permanece, mas sem identificá-lo.</p>
              <p className="text-slate-500 text-xs">Esta ação é irreversível.</p>
              <div className="flex justify-end gap-2 pt-2">
                <Btn variant="ghost" onClick={()=>setConfirmExc(false)}>Cancelar</Btn>
                <Btn variant="danger" onClick={()=>{ setConfirmExc(false); alert("Solicitação registrada. Você receberá confirmação por e-mail."); }}>Confirmar exclusão</Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================= LGPD — CONSENT BANNER & POLITICA ============================= */
/* Banner de consentimento fixado na base da tela (bottom-0) na primeira visita.
   Apresenta resumo da política de dados e botões Aceitar / Recusar.
   Ao aceitar, o estado consentido no App é marcado como true e o banner some. */
function ConsentBanner({onAccept, onReject}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4">
      <div className="max-w-3xl mx-auto bg-slate-900 text-white rounded-xl shadow-2xl p-5 flex flex-col md:flex-row gap-4 md:items-center">
        <div className="flex-1 text-sm">
          <div className="font-bold mb-1">Tratamento de dados pessoais (LGPD)</div>
          <p className="text-slate-300">
            Coletamos matrícula, nome, e-mail institucional, curso e histórico de descartes para gerir o sistema e gerar relatórios de impacto. Você pode acessar, exportar ou solicitar a exclusão dos seus dados a qualquer momento na aba <b>Meus dados</b>.
          </p>
        </div>
        <div className="flex gap-2 md:flex-col lg:flex-row">
          <Btn variant="ghost" size="sm" onClick={onReject}>Recusar</Btn>
          <Btn size="sm" onClick={onAccept}>Aceitar e continuar</Btn>
        </div>
      </div>
    </div>
  );
}

/* Modal de Política de Privacidade completa — abre ao clicar no rodapé.
   Contém 8 seções cobrindo dados coletados, finalidade, base legal,
   segurança, direitos do titular e retenção.                            */
function PrivacyModal({onClose}) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 grid place-items-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl max-h-[85vh] overflow-y-auto">
        <div className="p-4 border-b flex items-center sticky top-0 bg-white">
          <div className="font-bold">Política de Privacidade — EcoTech Descarte</div>
          <button className="ml-auto text-slate-400 hover:text-slate-700" onClick={onClose}>✕</button>
        </div>
        <div className="p-5 text-sm space-y-3 text-slate-700">
          <p><b>1. Dados coletados.</b> Matrícula, nome completo, e-mail institucional, curso, histórico de tickets e doações.</p>
          <p><b>2. Finalidade.</b> Gerir o descarte consciente no campus, emitir certificados, alimentar o ranking e o dashboard de impacto.</p>
          <p><b>3. Base legal.</b> Consentimento (Art. 7º, I) para o cadastro; legítimo interesse (Art. 7º, IX) para auditoria ambiental e relatórios institucionais agregados.</p>
          <p><b>4. Compartilhamento.</b> Dados pessoais não são compartilhados com terceiros. Apenas dados <i>anonimizados e agregados</i> compõem o dashboard público.</p>
          <p><b>5. Segurança.</b> Criptografia em repouso (AES-256), HTTPS obrigatório (TLS 1.2+), senhas em bcrypt (custo 12+), trilha de auditoria de 2 anos.</p>
          <p><b>6. Direitos do titular (Art. 18).</b> Você pode, a qualquer momento, em "Meus dados": (i) confirmar o tratamento, (ii) acessar seus dados, (iii) corrigi-los, (iv) solicitar anonimização ou exclusão, (v) exportar em formato JSON, (vi) revogar o consentimento.</p>
          <p><b>7. Retenção.</b> Tickets concluídos são retidos por 2 anos para fins de auditoria; após esse prazo, são anonimizados.</p>
          <p><b>8. Encarregado pelos Dados (DPO).</b> Contato: dpo@instituicao.edu.br (Art. 41).</p>
          <p className="text-xs text-slate-500">Versão 1.0 — abril/2026.</p>
        </div>
      </div>
    </div>
  );
}

/* ============================= APP ============================= */
/* Componente raiz. Gerencia o estado global compartilhado entre telas:
   - role / screen → controle de navegação
   - tickets / mural → dados mutáveis das telas principais
   - toast → notificações temporárias (auto-dismiss em 2,6s)
   - consentido / showPrivacy → fluxo LGPD
   Renderiza Header + main com tela ativa + Footer + overlays.          */
function App() {
  const [role, setRole]         = useState("aluno");
  const [screen, setScreen]     = useState("descarte");
  const [tickets, setTickets]   = useState(TICKETS_INICIAIS);
  const [mural, setMural]       = useState(MURAL_INICIAL);
  const [toast, setToast]       = useState(null);
  const [consentido, setConsentido] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  /* Auto-dismiss do toast após 2,6 segundos */
  useEffect(()=>{ if(toast){ const t=setTimeout(()=>setToast(null), 2600); return ()=>clearTimeout(t);}},[toast]);

  /* novoTicket → chamado pelo ModalItem após confirmação.
     Se funciona=true, publica no mural; se não, gera ticket de descarte. */
  const novoTicket = (item, ponto, funciona) => {
    if (funciona) {
      setMural(ms => [{id:"D"+(ms.length+1), item: item.nome, doador: "Você", descricao:"Item funcional ofertado no mural.", estado:"Disponível", tipo:"doacao"}, ...ms]);
      setToast("Item publicado no Mural de Doação.");
      setScreen("mural");
      return;
    }
    const id = "TK-" + String(1000+tickets.length+1).padStart(4,"0");
    setTickets(ts => [{id, item:item.nome, usuario:"Você", curso:"ADS", ponto: ponto.nome, estado:0, criado:new Date().toISOString().slice(0,10), aberto:true}, ...ts]);
    setToast("Ticket " + id + " gerado. Vá ao ponto e escaneie o QR.");
    setScreen("tickets");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header role={role} setRole={setRole} screen={screen} setScreen={setScreen}/>

      {/* Área principal — renderiza a tela ativa conforme screen */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {screen==="descarte"     && <ScreenDescarte onGenerateTicket={novoTicket}/>}
        {screen==="mural"        && <ScreenMural role={role} mural={mural} setMural={setMural}/>}
        {screen==="demandas"     && <ScreenDemandas mural={mural} setMural={setMural}/>}
        {screen==="tickets"      && <ScreenTickets tickets={tickets} setTickets={setTickets}/>}
        {screen==="operador"     && <ScreenOperador tickets={tickets} setTickets={setTickets}/>}
        {screen==="dashboard"    && <ScreenDashboard tickets={tickets}/>}
        {screen==="certificados" && <ScreenCertificados tickets={tickets}/>}
        {screen==="meus-dados"   && <ScreenMeusDados/>}
        {screen==="admin"        && <ScreenAdmin/>}
      </main>

      {/* Rodapé com link para Política de Privacidade */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-3 text-xs text-slate-500 flex flex-wrap items-center gap-3">
          <span>Protótipo navegável — dados simulados em memória.</span>
          <button onClick={()=>setShowPrivacy(true)} className="text-emerald-700 hover:text-emerald-800 underline">Política de Privacidade</button>
        {/*}  <span className="ml-auto">Stack alvo: React + Node/FastAPI + PostgreSQL · Scrum · 4 sprints · LGPD compliant.</span> */}
          <span className="ml-auto">© 2026 EcoTech Descarte · Todos os direitos reservados.</span>

        </div>
      </footer>

      {/* Banner LGPD — exibido enquanto consentido = false */}
      {!consentido && <ConsentBanner onAccept={()=>{ setConsentido(true); setToast("Consentimento registrado. Você pode revogar em Meus dados."); }} onReject={()=>{ setConsentido(true); setToast("Você poderá rever a decisão na aba Meus dados.");}}/>}

      {/* Modal de política de privacidade */}
      {showPrivacy && <PrivacyModal onClose={()=>setShowPrivacy(false)}/>}

      {/* Toast de notificação global — aparece na base centralizado */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg fade-in z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ── Ponto de entrada — monta o App no div#root do index.html ──────── */
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);
