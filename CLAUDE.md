## Project Overview

This is a Quiz Offer Wall application - a web-based quiz creation tool that generates customizable quizzes with offer wall integration. The application allows users to create branded quizzes that collect user data and integrate with external advertising platforms.

## Architecture

- **Backend**: Express.js server (`app.js`) that serves static files and provides a proxy endpoint
- **Frontend**: Vanilla HTML/CSS/JavaScript single-page application modularizado
- **Security**: Variáveis de ambiente para chaves de API (dotenv)
- **Deployment**: Google Cloud Platform (App Engine + Cloud Build)
- **External Integration**: Proxies requests to quiz template service and creates quiz links via external APIs

### Key Components

- `app.js`: Main Express server with proxy endpoint for template generation
- `public/index.html`: Quiz creation form interface
- `public/script.js`: Frontend logic for form handling and API communication
- `public/style.css`: Styling with floating label components and responsive design

### Data Flow

1. User fills out quiz creation form (name, vertical, colors, questions)
2. Frontend calls `/proxy/template` endpoint with form data
3. Backend proxies request to external template service
4. On success, frontend automatically creates quiz link via external API
5. User receives final quiz URL

## Environment Setup

**IMPORTANTE**: Configure as variáveis de ambiente antes de executar:

1. Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

2. Edite o arquivo `.env` e adicione suas chaves de API:

```bash
OPENAI_API_KEY=sua_chave_openai_real
ELEGANTQUIZ_API_KEY=sua_chave_elegantquiz_real
```

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm start
```

Server runs on port 8080 by default (configurable via PORT environment variable).

## Deployment

The project is configured for Google Cloud deployment:

- **App Engine**: Uses `app.yaml` with Node.js 20 runtime
- **Cloud Build**: Automated via `cloudbuild.yaml`
- **Docker**: Container configuration in `Dockerfile`

## External Dependencies

- Quiz template generation: `https://elegant-quiz-builder-477908646230.us-east1.run.app/template`
- Quiz link creation: `https://custom-embed.humberto-56a.workers.dev/s/`
- Webhook integration: `https://ow-webhook-379661335618.us-east1.run.app/webhook`

## Code Style Notes

- Uses ES6 modules (`"type": "module"` in package.json)
- Vanilla JavaScript (no frameworks)
- CSS uses floating label pattern for form inputs
- Portuguese language used in UI and some comments
