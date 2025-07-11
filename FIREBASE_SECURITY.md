# Gestión de Claves de Firebase y Variables de Entorno

## Introducción
Este documento describe cómo manejar de forma segura las claves y configuración de Firebase en este proyecto.

## ⚠️ ¡IMPORTANTE! - Seguridad de las claves
**NUNCA incluyas directamente las claves de API, contraseñas u otras credenciales en el código fuente.**

## Configuración del entorno local

### Archivo .env
El proyecto utiliza archivos `.env` para manejar variables de entorno. Sigue estos pasos:

1. Crea un archivo `.env` en la raíz del proyecto (ya debe estar creado)
2. Copia las variables del archivo `.env.example` pero con tus propios valores
3. **NUNCA** subas el archivo `.env` a control de versión (Git)

### Variables requeridas
```
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_auth_domain
VITE_FIREBASE_PROJECT_ID=tu_project_id
VITE_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
VITE_FIREBASE_DATABASE_URL=tu_database_url
```

## Rotación de claves (si hay una exposición)

Si por alguna razón las claves han quedado expuestas:

1. Accede al [Panel de Firebase](https://console.firebase.google.com/)
2. Ve a la configuración de tu proyecto
3. En la sección "Configuración general", busca la opción para regenerar la clave API
4. Actualiza tu archivo `.env` con la nueva clave
5. **NUNCA** subas la nueva clave a repositorios públicos

## Despliegue seguro en producción

Para entornos de producción como Netlify:

1. Configura las variables de entorno en el panel de administración del servicio de hosting
2. No incluyas valores predeterminados para las credenciales en el código

---

**Nota:** Si estás usando este proyecto como ejemplo o plantilla, recuerda reemplazar todas las credenciales con las tuyas propias.
