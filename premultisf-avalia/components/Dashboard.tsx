"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Lock, RefreshCw } from "lucide-react";
import { DIMS, SHORT, GENERAL, ROLES, ROLE_KEYS, Agg, Rec, RoleKey, countBy, stats, statsH, toAgg, tone, tsVal } from "@/lib/model";

type Payload = { admin: boolean; counts?: Record<RoleKey, number>; hidden?: RoleKey[]; agg?: Agg[]; latest?: string | null; recs?: Rec[]; error?: string };
const COLOR: Record<string, string> = { Crítico: "#dc2626", Atenção: "#d97706", Bom: "#059669", "sem dados": "#94a3b8" };
const ROLE_COLOR: Record<RoleKey, string> = { R: "#0f766e", P: "#2563eb", T: "#7c3aed", CCS: "#d97706", CR: "#db2777" };
const f2 = (n: number | null) => (n == null ? "—" : n.toFixed(2).replace(".", ","));
const pc = (n: number | null) => (n == null ? "—" : `${Math.round(n * 100)}%`);
const TABS = ["Visão geral", "Dimensões", "Itens", "Qualitativas", "Respostas"];

const Badge = ({ m }: { m: number | null }) => (
  <span className="whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ background: COLOR[tone(m)] }}>{tone(m)}</span>
);
const Card = ({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) => (
  <section className="rounded-xl border bg-white p-4 shadow-sm">
    <h2 className="font-semibold">{title}</h2>
    {sub && <p className="mb-3 text-xs text-slate-500">{sub}</p>}
    {children}
  </section>
);
type Row = { item: string; dim: string; mean: number | null; n: number };
const List = ({ rows }: { rows: Row[] }) =>
  rows.length ? (
    <ul className="space-y-2 text-sm">
      {rows.map((i) => (
        <li key={i.dim + i.item} className="flex items-start gap-2">
          <Badge m={i.mean} />
          <span className="flex-1">{i.item}<span className="block text-xs text-slate-500">{i.dim} · média {f2(i.mean)} · n={i.n}</span></span>
        </li>
      ))}
    </ul>
  ) : <p className="text-sm text-slate-500">Nenhum item nesta faixa (ou respostas insuficientes).</p>;
const Locked = () => (
  <p className="rounded-lg border border-dashed bg-white p-6 text-sm text-slate-600"><Lock className="mr-2 inline h-4 w-4" />Conteúdo de acesso restrito. Informe o código de acesso no topo da página.</p>
);

export default function Dashboard() {
  const [d, setD] = useState<Payload | null>(null);
  const [tab, setTab] = useState(0);
  const [role, setRole] = useState<RoleKey | "all">("all");
  const [cat, setCat] = useState("all");
  const [dimF, setDimF] = useState("all");
  const [token, setToken] = useState("");
  const [bad, setBad] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const t = sessionStorage.getItem("tk") ?? "";
      const j: Payload = await (await fetch("/api/data", { headers: t ? { "x-admin-token": t } : {} })).json();
      setBad(!!t && !j.admin);
      setD(j);
    } catch { setD({ admin: false, error: "Falha de conexão." }); }
    setBusy(false);
  }, []);
  useEffect(() => { load(); const i = setInterval(load, 60000); return () => clearInterval(i); }, [load]);
  const login = () => { sessionStorage.setItem("tk", token); load(); };
  const logout = () => { sessionStorage.removeItem("tk"); setToken(""); setRole("all"); setCat("all"); load(); };

  const admin = !!d?.admin;
  const all = useMemo(() => d?.recs ?? [], [d]);
  const recs = useMemo(() => all.filter((r) => (role === "all" || r.role === role) && (cat === "all" || r.cat === cat)), [all, role, cat]);
  const agg = useMemo<Agg[]>(() => (admin ? toAgg(recs) : (d?.agg ?? []).filter((c) => role === "all" || c.role === role)), [admin, recs, d, role]);
  const counts = admin ? countBy(recs) : d?.counts ?? countBy([]);
  const total = ROLE_KEYS.reduce((s, k) => s + counts[k], 0);
  const n = admin || role === "all" ? total : counts[role];
  const idx = stats(agg.filter((c) => c.dim !== GENERAL));
  const byDim = DIMS.map((dim, i) => ({ dim, short: SHORT[i], ...stats(agg.filter((c) => c.dim === dim)) }));
  const items = useMemo(() => {
    const m = new Map<string, { dim: string; item: string; h: number[] }>();
    agg.forEach((c) => {
      const k = c.dim + "|" + c.item;
      const x = m.get(k) ?? { dim: c.dim, item: c.item, h: [0, 0, 0, 0, 0] };
      c.h.forEach((v, i) => (x.h[i] += v));
      m.set(k, x);
    });
    return Array.from(m.values()).map((x) => ({ ...x, ...statsH(x.h) }));
  }, [agg]);
  const ranked = items.filter((i) => i.dim !== GENERAL && i.n >= 2).sort((a, b) => b.mean! - a.mean! || b.fav! - a.fav!);
  const strengths = ranked.filter((i) => i.mean! >= 4).slice(0, 5);
  const attention = [...ranked].reverse().filter((i) => i.mean! < 4).slice(0, 5);
  const rk = ROLE_KEYS.filter((k) => agg.some((c) => c.role === k));
  const cmp = DIMS.map((dim, i) => {
    const o: Record<string, string | number | null> = { dim: SHORT[i] };
    rk.forEach((k) => (o[k] = stats(agg.filter((c) => c.role === k && c.dim === dim)).mean));
    return o;
  });
  const dist = idx.h.map((v, i) => ({ nota: String(i + 1), respostas: v }));
  const latest = admin ? [...recs].sort((a, b) => tsVal(b.ts) - tsVal(a.ts))[0]?.ts : d?.latest;
  const cats = Array.from(new Set(all.map((r) => r.cat).filter(Boolean))).sort();

  if (!d) return <p className="p-8">Carregando…</p>;
  if (d.error) return <p className="p-8 text-red-700">{d.error}</p>;
  const sel = "mt-1 block rounded border px-2 py-1 text-sm";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Avaliação institucional</p>
          <h1 className="text-2xl font-bold">PREMULTISF Avalia</h1>
          <p className="text-sm text-slate-600">Programa de Residência Multiprofissional em Saúde da Família — resultados consolidados das respostas ao formulário.</p>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
        <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-3">
          <label className="text-xs font-medium">Papel
            <select className={sel} value={role} onChange={(e) => setRole(e.target.value as RoleKey | "all")}>
              <option value="all">Todos os papéis</option>
              {ROLE_KEYS.map((k) => <option key={k} value={k}>{ROLES[k]}</option>)}
            </select>
          </label>
          {admin && (
            <label className="text-xs font-medium">Categoria profissional
              <select className={sel} value={cat} onChange={(e) => setCat(e.target.value)}>
                <option value="all">Todas</option>
                {cats.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
          )}
          <button onClick={load} className="flex items-center gap-1 rounded border px-2 py-1 text-sm"><RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />Atualizar</button>
          <div className="ml-auto flex items-center gap-2 text-xs">
            {admin ? (
              <><span className="font-semibold text-teal-700">Acesso restrito ativo</span><button onClick={logout} className="underline">Sair</button></>
            ) : (
              <><Lock className="h-4 w-4" />
                <input type="password" aria-label="Código de acesso" placeholder="Código de acesso" value={token} onChange={(e) => setToken(e.target.value)} className="rounded border px-2 py-1" />
                <button onClick={login} className="rounded bg-slate-800 px-2 py-1 text-white">Entrar</button>
                {bad && <span className="text-red-600">Código inválido</span>}</>
            )}
          </div>
        </div>

        {!admin && !!d.hidden?.length && (
          <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Para preservar o anonimato, papéis com menos de 3 respostas ficam fora dos indicadores públicos: {d.hidden.map((k) => ROLES[k]).join(", ")}.</p>
        )}

        <nav role="tablist" aria-label="Seções" className="flex flex-wrap gap-1 border-b">
          {TABS.map((t, i) => (
            <button key={t} role="tab" aria-selected={tab === i} onClick={() => setTab(i)}
              className={`px-3 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${tab === i ? "border-b-2 border-teal-700 text-teal-800" : "text-slate-500"}`}>
              {t}{i > 2 && !admin && <Lock className="ml-1 inline h-3 w-3" />}
            </button>
          ))}
        </nav>

        {tab === 0 && (n === 0 || !agg.length ? (
          <p className="rounded-lg border bg-white p-6 text-sm text-slate-600">Nenhuma resposta visível para o filtro selecionado.</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card title="Total de respostas"><p className="text-3xl font-bold">{n}</p></Card>
              <Card title="Índice geral" sub="Média das 6 dimensões (escala 1–5)">
                <p className="text-3xl font-bold">{f2(idx.mean)} <span className="text-base font-normal text-slate-500">/ 5</span></p>
                <Badge m={idx.mean} /> <span className="text-xs text-slate-500">{idx.n} notas · {pc(idx.fav)} favorável</span>
              </Card>
              <Card title="Resposta mais recente"><p className="text-lg font-semibold">{latest ?? "—"}</p></Card>
              <Card title="Respostas por papel">
                <ul className="text-sm">{ROLE_KEYS.map((k) => (
                  <li key={k} className="flex justify-between"><span>{ROLES[k]}</span>
                    <span>{d.hidden?.includes(k) ? "oculto (n<3)" : `${counts[k]} (${total ? Math.round((counts[k] / total) * 100) : 0}%)`}</span></li>
                ))}</ul>
              </Card>
            </div>
            <p className="text-xs text-slate-500">Faixas: abaixo de 3 = crítico · de 3 a 4 = atenção · 4 ou mais = bom. “Não se aplica” não entra na conta.</p>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card title="Média por dimensão" sub="Escala 1–5">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={byDim.map((x) => ({ name: x.short, media: x.mean == null ? 0 : +x.mean.toFixed(2) }))} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" domain={[1, 5]} /><YAxis type="category" dataKey="name" width={120} />
                    <Tooltip formatter={(v) => f2(Number(v))} />
                    <Bar dataKey="media" name="Média">{byDim.map((x) => <Cell key={x.dim} fill={COLOR[tone(x.mean)]} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card title="Média por dimensão e papel" sub="Como cada papel avalia cada dimensão">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={cmp}>
                    <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="dim" tick={{ fontSize: 10 }} /><YAxis domain={[1, 5]} />
                    <Tooltip formatter={(v) => f2(Number(v))} /><Legend />
                    {rk.map((k) => <Bar key={k} dataKey={k} name={ROLES[k]} fill={ROLE_COLOR[k]} />)}
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card title="Distribuição das notas" sub="1 = Discordo totalmente · 3 = Nem concordo nem discordo · 5 = Concordo totalmente">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={dist}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="nota" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="respostas" name="Respostas" fill="#0f766e" /></BarChart>
                </ResponsiveContainer>
              </Card>
              <div className="space-y-4">
                <Card title="Pontos fortes" sub="Itens com média ≥ 4 (mín. 2 respostas)"><List rows={strengths} /></Card>
                <Card title="Pontos de atenção" sub="Itens com menor média, abaixo de 4"><List rows={attention} /></Card>
              </div>
            </div>
            <Card title="Avaliação geral do Programa">
              <List rows={items.filter((i) => i.dim === GENERAL)} />
            </Card>
          </>
        ))}

        {tab === 1 && (
          <div className="space-y-3">
            {byDim.map((x) => (
              <details key={x.dim} className="rounded-xl border bg-white p-4 shadow-sm">
                <summary className="flex cursor-pointer flex-wrap items-center gap-3">
                  <span className="font-semibold">{x.dim}</span>
                  <span className="ml-auto text-sm">Média {f2(x.mean)} · {pc(x.fav)} favorável · n={x.n}</span><Badge m={x.mean} />
                </summary>
                <ul className="mt-3 divide-y text-sm">
                  {items.filter((i) => i.dim === x.dim).sort((a, b) => (a.mean ?? 9) - (b.mean ?? 9)).map((i) => (
                    <li key={i.item} className="flex flex-wrap items-center gap-2 py-2"><span className="flex-1">{i.item}</span><span>{f2(i.mean)} · n={i.n}</span><Badge m={i.mean} /></li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        )}

        {tab === 2 && (
          <Card title="Todos os itens" sub="Da menor para a maior média. n = respostas válidas.">
            <select aria-label="Filtrar dimensão" className="mb-3 rounded border px-2 py-1 text-sm" value={dimF} onChange={(e) => setDimF(e.target.value)}>
              <option value="all">Todas as dimensões</option>
              {[...DIMS, GENERAL].map((x) => <option key={x}>{x}</option>)}
            </select>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b text-xs uppercase text-slate-500"><tr><th className="p-2">Dimensão</th><th className="p-2">Item</th><th className="p-2">n</th><th className="p-2">Média</th><th className="p-2">% favorável</th><th className="p-2">Situação</th></tr></thead>
                <tbody>
                  {items.filter((i) => dimF === "all" || i.dim === dimF).sort((a, b) => (a.mean ?? 9) - (b.mean ?? 9)).map((i) => (
                    <tr key={i.dim + i.item} className="border-b align-top"><td className="p-2 text-xs">{i.dim}</td><td className="p-2">{i.item}</td><td className="p-2">{i.n}</td><td className="p-2">{f2(i.mean)}</td><td className="p-2">{pc(i.fav)}</td><td className="p-2"><Badge m={i.mean} /></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {tab === 3 && (admin ? (
          <div className="space-y-3">
            {recs.flatMap((r) => r.comments.map((c) => ({ ...c, role: r.role, cat: r.cat, cs: r.cs }))).map((c, i) => (
              <article key={i} className="rounded-xl border bg-white p-4 text-sm shadow-sm">
                <p className="mb-1 text-xs text-slate-500">{ROLES[c.role]} · {c.cat} · {c.cs} · {c.dim}</p>
                <p className="whitespace-pre-line">{c.text}</p>
              </article>
            ))}
          </div>
        ) : <Locked />)}

        {tab === 4 && (admin ? (
          <Card title="Respostas individuais (sem nome ou e-mail)">
            <div className="overflow-x-auto"><table className="w-full text-left text-sm">
              <thead className="border-b text-xs uppercase text-slate-500"><tr><th className="p-2">Data/hora</th><th className="p-2">Papel</th><th className="p-2">Categoria</th><th className="p-2">Centro de Saúde</th><th className="p-2">Itens</th><th className="p-2">Média</th></tr></thead>
              <tbody>{[...recs].sort((a, b) => tsVal(b.ts) - tsVal(a.ts)).map((r, i) => {
                const s = statsH(r.a.reduce((h, x) => { h[x.v - 1]++; return h; }, [0, 0, 0, 0, 0]));
                return <tr key={i} className="border-b"><td className="p-2">{r.ts}</td><td className="p-2">{ROLES[r.role]}</td><td className="p-2">{r.cat}</td><td className="p-2">{r.cs}</td><td className="p-2">{s.n}</td><td className="p-2">{f2(s.mean)}</td></tr>;
              })}</tbody>
            </table></div>
          </Card>
        ) : <Locked />)}

        <p className="pb-6 text-center text-xs text-slate-500">PREMULTISF Avalia · dados atualizados automaticamente a cada 60 s.</p>
      </main>
    </div>
  );
}
