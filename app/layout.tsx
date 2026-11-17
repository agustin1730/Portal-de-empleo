import type { Metadata } from "next";
import "./globals.css";
import "./theme.css";

export const metadata: Metadata = {
  title: "Mi búsqueda · Portal de empleo",
  description: "Oportunidades, decisiones y postulaciones en un solo lugar.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{__html:"(function(){var k='mi-busqueda:theme',r=document.documentElement,m=matchMedia('(prefers-color-scheme: dark)');function apply(v){v=v==='light'||v==='dark'?v:'system';r.dataset.themePreference=v;r.dataset.theme=v==='system'?(m.matches?'dark':'light'):v;}try{apply(localStorage.getItem(k));}catch(e){apply('system');}m.addEventListener('change',function(){if(r.dataset.themePreference==='system')apply('system');});addEventListener('storage',function(e){if(e.key===k||e.key===null)apply(e.newValue);});})();"}}/></head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
