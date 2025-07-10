# Kampos Xestión

Aplicación para xestionar alumnos e profesores. Esta aplicación está deseñada para funcionar sen bases de datos, utilizando o almacenamento local do navegador.

## Características

- Xestión de profesores (crear, editar, eliminar)
- Interface de usuario sinxela e intuitiva
- Almacenamento local (non require servidor de base de datos)
- Optimizado para despregar en Netlify

## Como usar

1. **Instalación**

```bash
# Instalar dependencias
npm install
```

2. **Desenvolvemento**

```bash
# Iniciar servidor de desenvolvemento
npm run dev
```

3. **Construcción para producción**

```bash
# Construcción para producción
npm run build
```

4. **Despliegue en Netlify**

Para despregalo en Netlify simplemente conecta o repositorio a Netlify e configura os seguintes parámetros:

- Build command: `npm run build`
- Publish directory: `dist`
- Base directory: `/`

## Estructura do proxecto

- `src/components/`: Componentes reutilizables
- `src/pages/`: Páxinas da aplicación
- `src/utils/`: Utilidades e funcións auxiliares
- `src/pages/Profesores/`: Compoñentes específicos para a xestión de profesores

## Tecnoloxías

- React
- TypeScript
- Tailwind CSS
- Vite
- React Router

## Autor

Creado por Kampos Xestión
