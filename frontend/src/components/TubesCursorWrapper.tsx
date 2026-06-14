'use client'

import { usePathname } from 'next/navigation'
import Script from 'next/script'

export default function TubesCursorWrapper() {
  const pathname = usePathname()

  // Only render on homepage (/), login page (/login), and register page (/register)
  if (pathname !== '/' && pathname !== '/login' && pathname !== '/register') {
    return null
  }

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 9999,
          mixBlendMode: 'screen',
        }}
      >
        <canvas
          id="oculide-tubes"
          style={{
            width: '100%',
            height: '100%',
          }}
        />
      </div>
      <Script
        id="tubes-cursor-init"
        type="module"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            import TubesCursor from 'https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js';
            const app = TubesCursor(document.getElementById('oculide-tubes'), {
              bloom: true,
              tubes: {
                colors: ['#f967fb', '#53bc28', '#6958d5'],
                minRadius: 0.001,
                maxRadius: 0.015,
                lights: { intensity: 180, colors: ['#83f36e', '#fe8a2e', '#ff008a', '#60aed5'] },
              },
            });
            if (app && app.renderer) {
              app.renderer.setClearColor(0x000000, 0);
            }
          `,
        }}
      />
    </>
  )
}
