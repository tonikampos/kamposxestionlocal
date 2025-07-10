# Kampos Xestión

Aplicación para xestionar ## Estrutura do proxecto

- `src/components/`: Componentes reutilizables como Navbar e rutas protexidas
- `src/pages/`: Páxinas da aplicación organizadas por módulos
  - `src/pages/Alumnos/`: Xestión de alumnos e importación
  - `src/pages/Asignaturas/`: Xestión de asignaturas, matrículas e avaliacións
  - `src/pages/Notas/`: Sistema completo de xestión de notas
  - `src/pages/Profesores/`: Xestión de profesores
  - `src/pages/Copias/`: Sistema de copias de seguridade
  - `src/pages/Informes/`: Xeración de informes
- `src/context/`: Contextos de React para estado global
- `src/utils/`: Utilidades, incluíndo o storageManager para persistencia de datos

## Tecnoloxías

- React 18
- TypeScript
- Tailwind CSS
- Vite
- React Router v6
- LocalStorage para persistencia de datos

## Desenvolvemento

A aplicación utiliza un enfoque modular, con compoñentes reutilizables e un sistema robusto para a xestión do estado. Todo o almacenamento de datos realízase a través do `storageManager`, que proporciona unha interface unificada para interactuar cos datos almacenados no navegador.

## Autor

Desenvolvido por Toni Kampos para a comunidade educativa galegaas e notas no ámbito educativo. Esta aplicación está deseñada para funcionar sen bases de datos, utilizando o almacenamento local do navegador, o que a fai ideal para profesores que precisan unha ferramenta sinxela pero potente.

## Características

- **Xestión completa**: Alumnos, asignaturas, profesores, notas e avaliacións.
- **Sistema de matrículas**: Matriculación de alumnos nas asignaturas.
- **Configuración de avaliacións**: Personalización das avaliacións e probas.
- **Xestión de notas**: Rexistro e seguimento completo das notas dos alumnos.
- **Copias de seguridade**: Importación e exportación de datos.
- **Interface de usuario**: Sinxela, intuitiva e responsive para dispositivos móbiles.
- **Almacenamento local**: Non require servidor de base de datos.
- **Optimizado para Netlify**: Listo para despregar e usar en calquera lugar.

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
