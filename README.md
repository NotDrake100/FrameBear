<p align="center">
  <img src="mascot.png" width="120" alt="FrameBear">
</p>

<h1 align="center">FrameBear</h1>

<p align="center">
  <strong>The AI that makes product videos.</strong><br>
  Give it a prompt, a reference video, and your brand. Get a polished MP4.
</p>

<p align="center">
  <a href="https://frame-bear.vercel.app">🌐 Live Site</a> · 
  <a href="https://aistudio.google.com/apikey">🔑 Get API Key</a> · 
  <a href="#supported-models">🤖 Models</a>
</p>

---

## What is FrameBear?

FrameBear is an AI-powered video generator that turns your prompts into product promo videos. No After Effects. No Premiere Pro. Just describe what you want.

```
$ framebear generate \
    --reference uber_ad.mp4 \
    --company "YourBrand" \
    --prompt "Dinner expense tracker promo, iMessage style"

▸ Analyzing reference video...
▸ Generating HTML animation...
▸ Rendering 150 frames at 30fps...
✓ Saved → rendered/promo.mp4

Done in 12.3s
```

## Features

| Feature | Description |
|---------|-------------|
| 🎯 **Prompt to Video** | Describe what you want, get an MP4 |
| 🧠 **Any AI Model** | Gemini, ChatGPT, Claude, or local |
| 🔒 **Runs Locally** | Your data never leaves your machine |
| 🎬 **Reference Videos** | AI analyzes and recreates the style |
| ⚡ **Frame-Perfect** | Deterministic rendering, no dropped frames |
| 🎵 **Audio Support** | Background music auto-synced |

## Supported Models

| Model | Provider | Notes |
|-------|----------|-------|
| Gemini 2.0 Flash | Google | Free tier · Recommended |
| Gemini Pro | Google | Advanced reasoning |
| GPT-4o | OpenAI | Vision + code |
| GPT-4o Mini | OpenAI | Fast & cheap |
| Claude Sonnet | Anthropic | Strong at code |
| Claude Opus | Anthropic | Most capable |
| Llama 3 | Meta | Run locally |
| DeepSeek | DeepSeek | V3 / Coder |
| Ollama | Local | Any local model |
| LM Studio | Local | GUI for local models |
| Mistral | Mistral AI | Large / Medium |
| Groq | Groq | Ultra-fast inference |

## Live Site

**🌐 [frame-bear.vercel.app](https://frame-bear.vercel.app)**

## License

MIT © [NotDrake100](https://github.com/NotDrake100)
