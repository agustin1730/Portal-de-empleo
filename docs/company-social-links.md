# Enlaces de empresa

2026-11-17. Ficha de Prospección: sección Enlaces de la empresa con sitio web, LinkedIn e Instagram, todos opcionales, iconos y acceso directo al enlace válido. Kanban y Tabla muestran accesos compactos solo cuando existe un enlace válido. Se mantienen etiquetas, notas y seguimiento.

LinkedIn e Instagram se guardan como propiedades de empresa, independientes del LinkedIn de cada contacto. Se preservan empresas anteriores sin esos campos. La validación normaliza protocolo HTTPS si falta y rechaza esquemas ejecutables, credenciales y dominios ajenos a cada red; los enlaces abren otra pestaña con noopener/noreferrer. Sin migración, nuevos servicios o dependencias.

CSV exportado agrega LinkedIn de la empresa e Instagram de la empresa al final para conservar posiciones anteriores. Importación ofrece esas columnas explícitas; LinkedIn del contacto sigue separado. No se navega a redes ni se envían mensajes al editar o guardar.

Iconos vectoriales de LinkedIn e Instagram con trazos consistentes con Lucide (el paquete actual no incluye marcas), junto al globo de Lucide. Verificación: 81 tests y build de producción aprobados en copia aislada. Casos de prueba: datos antiguos, guardado/cambio de etapa, enlace personal separado, dominios falsos/esquemas y CSV. Sin recorrido autenticado en navegador.
