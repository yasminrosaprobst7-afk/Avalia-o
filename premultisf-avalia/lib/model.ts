// Parte compartilhada (servidor + navegador). Não coloque aqui nada sensível.
export const MIN_N = 3; // papéis com menos respostas ficam ocultos no modo público
export const ROLES = { R: "Residentes", P: "Preceptores", T: "Tutores", CCS: "Coord. de CS/DAT", CR: "Coord. da Residência" } as const;
export type RoleKey = keyof typeof ROLES;
export const ROLE_KEYS = Object.keys(ROLES) as RoleKey[];
export const GENERAL = "Avaliação geral";
export const DIMS = ["Estrutura e apoio logístico", "Corpo docente-assistencial", "Organização didático-pedagógica", "Acompanhamento pedagógico e processo avaliativo", "Gestão, comunicação e governança", "Resultados formativos e integração ensino-serviço"];
export const SHORT = ["Estrutura", "Corpo docente", "Didático-pedagógica", "Acompanhamento", "Gestão", "Resultados"];
export type Ans = { dim: string; item: string; v: number };
export type Rec = { role: RoleKey; cat: string; cs: string; ts: string; a: Ans[]; comments: { dim: string; text: string }[] };
export type Agg = { role: RoleKey; dim: string; item: string; h: number[] };

export function toAgg(recs: Rec[]): Agg[] {
  const m = new Map<string, Agg>();
  for (const r of recs) for (const x of r.a) {
    const k = `${r.role}|${x.dim}|${x.item}`;
    const c = m.get(k) ?? { role: r.role, dim: x.dim, item: x.item, h: [0, 0, 0, 0, 0] };
    c.h[x.v - 1]++;
    m.set(k, c);
  }
  return Array.from(m.values());
}
export function statsH(h: number[]) {
  const n = h.reduce((s, x) => s + x, 0);
  return { n, h, mean: n ? h.reduce((s, x, i) => s + x * (i + 1), 0) / n : null, fav: n ? (h[3] + h[4]) / n : null };
}
export function stats(a: Agg[]) {
  const h = [0, 0, 0, 0, 0];
  a.forEach((c) => c.h.forEach((n, i) => (h[i] += n)));
  return statsH(h);
}
export const countBy = (recs: Rec[]) => { const o = {} as Record<RoleKey, number>; ROLE_KEYS.forEach((k) => (o[k] = 0)); recs.forEach((r) => o[r.role]++); return o; };
// Faixas ancoradas nas definições do formulário: <3 = problemas; 3–4 = parcial/ajustes; ≥4 = quase sempre/sempre.
export const tone = (m: number | null) => (m == null ? "sem dados" : m < 3 ? "Crítico" : m < 4 ? "Atenção" : "Bom");
export const tsVal = (s: string) => { const m = s.match(/(\d+)\/(\d+)\/(\d+)\D+(\d+):(\d+)/); return m ? new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]).getTime() : 0; };
