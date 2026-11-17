# CRM, navegación y Configuración

Actualización 2026-11-17. MainNav centraliza iconos Lucide y rutas para todas las vistas principales. Configuración (/?vista=configuracion) conserva la autenticación de propietario del enrutador principal y muestra fecha/hora de compilación en Argentina y versión de Git; los metadatos se incorporan al construir en next.config.ts. No es la fecha de edición del perfil.

Preparar mensaje se retira del editor de empresa sin borrar borradores persistidos. Asistente y su modal se retiran de Oportunidades, conservando importaciones y conexiones privadas existentes.

Postulaciones usa movimiento optimista por arrastre, con animación 260 ms, vista previa, resaltado de destino, auto-scroll y rollback ante error. PATCH envía solo id y status, conservando notas, contactos y URL. Se respeta movimiento reducido. La edición por formulario sigue disponible.

OfferLink muestra un botón verde Ver oferta en Oportunidades/Basura y tablero/tabla/detalle de Postulaciones, solo con URL HTTP/HTTPS válida sin credenciales. Abre otra pestaña con noopener/noreferrer; sin URL no inventa un enlace ni utiliza el correo en su lugar.

Verificación: 75 pruebas y compilación de producción aprobadas en copia aislada. tests/crm-ui.test.ts cubre movimiento inmediato y reversión, payload mínimo, enlace seguro e iconos compartidos. No se realizó recorrido autenticado en navegador. Sin migraciones, dependencias nuevas ni APIs pagas.
