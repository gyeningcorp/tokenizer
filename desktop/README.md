# Tokenizer Desktop

Standalone Windows/Mac/Linux app for real-time token counting. No browser needed.

## Features

- Real-time token counting for all major models (GPT-4o, Claude, Gemini, LLaMA, DeepSeek, Mistral)
- Token breakdown chips — see exactly which words cost the most
- Context window usage bar
- Energy & CO₂ impact estimates
- **Local model support** — Ollama, LM Studio, AnythingLLM, Jan, LocalAI
  - Auto-detects available models on Ollama
  - Exact token count via Ollama /api/generate API
  - Falls back to estimation for other endpoints

## Run (Development)

```bash
cd desktop
npm install
npm start
```

## Build Installer

```bash
# Windows (.exe installer)
npm run build:win

# Mac (.dmg)
npm run build:mac

# Linux (.AppImage)
npm run build:linux
```

Output goes to `desktop/dist/`.

## Local Model Presets

| Preset      | URL                        | Port  |
|-------------|----------------------------|-------|
| Ollama      | http://localhost:11434     | 11434 |
| LM Studio   | http://localhost:1234      | 1234  |
| AnythingLLM | http://localhost:3001      | 3001  |
| Jan         | http://localhost:1337      | 1337  |
| LocalAI     | http://localhost:8080      | 8080  |

1. Start your local model server
2. Open Tokenizer Desktop → **Local Models** tab
3. Click a preset or enter custom URL
4. Hit **Test Connection**
5. Type/paste your prompt in the main input
6. Hit **Count with Local Model** for exact token count
