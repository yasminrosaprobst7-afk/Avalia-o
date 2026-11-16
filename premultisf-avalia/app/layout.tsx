import "./globals.css";
export const metadata = { title: "PREMULTISF Avalia — Painel de Resultados", description: "Avaliação do Programa de Residência Multiprofissional em Saúde da Família." };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="pt-BR"><body>{children}</body></html>);
}
