import type { MetadataRoute } from 'next';

// Instalação na tela inicial (iPhone e Android) sem loja de aplicativos.
// Cores da spec: azul-marinho #0F172A (primária) e areia #F8F6F0 (fundo).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SmartTravel',
    short_name: 'SmartTravel',
    description: 'Roteiro, documentos e cartão celíaco da sua viagem, inclusive offline.',
    lang: 'pt-BR',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F8F6F0',
    theme_color: '#0F172A',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
