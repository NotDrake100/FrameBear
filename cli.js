#!/usr/bin/env node

/**
 * FrameBear CLI — AI Video Generator
 * Usage:
 *   framebear init              → Configure your AI model
 *   framebear generate          → Generate a video from a prompt
 *   framebear models            → List supported models
 *   framebear help              → Show help
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ── Colors ──────────────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  purple: '\x1b[35m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

const PREFIX = `${c.purple}${c.bold}🐻 FrameBear${c.reset}`;
const CONFIG_FILE = path.join(process.env.HOME || process.env.USERPROFILE, '.framebear.json');

// ── Helpers ─────────────────────────────────────────────
function log(msg) { console.log(`  ${msg}`); }
function success(msg) { console.log(`  ${c.green}✓${c.reset} ${msg}`); }
function info(msg) { console.log(`  ${c.yellow}▸${c.reset} ${c.dim}${msg}${c.reset}`); }
function err(msg) { console.log(`  ${c.red}✗${c.reset} ${msg}`); }

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(`  ${c.purple}?${c.reset} ${question} `, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// ── Banner ──────────────────────────────────────────────
function showBanner() {
  console.log();
  console.log(`  ${c.purple}${c.bold}╭──────────────────────────────────────╮${c.reset}`);
  console.log(`  ${c.purple}${c.bold}│${c.reset}  🐻 ${c.bold}FrameBear${c.reset} ${c.dim}v1.0.0${c.reset}                  ${c.purple}${c.bold}│${c.reset}`);
  console.log(`  ${c.purple}${c.bold}│${c.reset}  ${c.dim}The AI that makes product videos.${c.reset}   ${c.purple}${c.bold}│${c.reset}`);
  console.log(`  ${c.purple}${c.bold}╰──────────────────────────────────────╯${c.reset}`);
  console.log();
}

// ── Commands ────────────────────────────────────────────

async function cmdInit() {
  showBanner();
  log(`${c.bold}Setup your AI model connection${c.reset}`);
  console.log();

  const models = [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'google', note: 'Free tier · Recommended' },
    { id: 'gemini-1.5-pro', name: 'Gemini Pro', provider: 'google', note: 'Advanced' },
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', note: 'Vision + code' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', note: 'Fast & cheap' },
    { id: 'claude-sonnet', name: 'Claude Sonnet', provider: 'anthropic', note: 'Strong at code' },
    { id: 'claude-opus', name: 'Claude Opus', provider: 'anthropic', note: 'Most capable' },
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 (via Groq)', provider: 'groq', note: 'Ultra-fast & Free' },
    { id: 'ollama', name: 'Ollama (Local)', provider: 'local', note: 'Any local model' },
  ];

  log(`${c.bold}Available models:${c.reset}`);
  console.log();
  models.forEach((m, i) => {
    log(`  ${c.purple}${i + 1}${c.reset}) ${m.name} ${c.dim}— ${m.note}${c.reset}`);
  });
  console.log();

  const choice = await ask('Select model (1-8):');
  const idx = parseInt(choice) - 1;
  if (isNaN(idx) || idx < 0 || idx >= models.length) {
    err('Invalid choice. Run framebear init again.');
    process.exit(1);
  }

  const selected = models[idx];
  let apiKey = '';

  if (selected.provider !== 'local') {
    console.log();
    if (selected.provider === 'google') {
      log(`${c.dim}Get your free API key at: ${c.cyan}https://aistudio.google.com/apikey${c.reset}`);
    } else if (selected.provider === 'openai') {
      log(`${c.dim}Get your API key at: ${c.cyan}https://platform.openai.com/api-keys${c.reset}`);
    } else if (selected.provider === 'anthropic') {
      log(`${c.dim}Get your API key at: ${c.cyan}https://console.anthropic.com${c.reset}`);
    } else if (selected.provider === 'groq') {
      log(`${c.dim}Get your free API key at: ${c.cyan}https://console.groq.com/keys${c.reset}`);
    }
    console.log();
    apiKey = await ask('Enter your API key:');
    if (!apiKey) {
      err('API key is required. Run framebear init again.');
      process.exit(1);
    }
  } else {
    log(`${c.dim}Make sure Ollama is running: ${c.cyan}ollama serve${c.reset}`);
    const ollamaModel = await ask('Ollama model name (e.g. llama3):');
    apiKey = ollamaModel || 'llama3';
  }

  const config = {
    model: selected.id,
    provider: selected.provider,
    apiKey: apiKey,
    createdAt: new Date().toISOString(),
  };

  saveConfig(config);
  console.log();
  success(`Connected to ${c.bold}${selected.name}${c.reset}`);
  log(`${c.dim}Config saved to ~/.framebear.json${c.reset}`);
  console.log();
  log(`${c.bold}Next:${c.reset} framebear generate --prompt "Your video idea"`);
  console.log();
}

async function cmdGenerate(args) {
  showBanner();

  const config = loadConfig();
  if (!config) {
    err('Not initialized. Run: framebear init');
    process.exit(1);
  }

  // Parse args
  let prompt = '', reference = '', company = '', output = '', audio = '', logo = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--prompt' && args[i + 1]) prompt = args[++i];
    else if (args[i] === '--reference' && args[i + 1]) reference = args[++i];
    else if (args[i] === '--company' && args[i + 1]) company = args[++i];
    else if (args[i] === '--output' && args[i + 1]) output = args[++i];
    else if (args[i] === '--audio' && args[i + 1]) audio = args[++i];
    else if (args[i] === '--logo' && args[i + 1]) logo = args[++i];
  }

  // Interactive mode if no args
  if (!prompt) prompt = await ask('Describe your video:');
  if (!company) company = await ask('Company/brand name:');
  if (!reference) {
    let ref = await ask('Reference video path (optional, press Enter to skip):');
    if (ref) {
      // Remove escape slashes added by macOS terminal drag-and-drop
      reference = ref.replace(/\\/g, '').trim();
      // Remove surrounding quotes if added
      if (reference.startsWith("'") && reference.endsWith("'")) reference = reference.slice(1, -1);
      if (reference.startsWith('"') && reference.endsWith('"')) reference = reference.slice(1, -1);
    }
  }
  if (!audio) {
    let aud = await ask('Audio song path (optional, press Enter to skip):');
    if (aud) {
      audio = aud.replace(/\\/g, '').trim();
      if (audio.startsWith("'") && audio.endsWith("'")) audio = audio.slice(1, -1);
      if (audio.startsWith('"') && audio.endsWith('"')) audio = audio.slice(1, -1);
    }
  }
  if (!logo) {
    let lg = await ask('Logo image path (optional, press Enter to skip):');
    if (lg) {
      logo = lg.replace(/\\/g, '').trim();
      if (logo.startsWith("'") && logo.endsWith("'")) logo = logo.slice(1, -1);
      if (logo.startsWith('"') && logo.endsWith('"')) logo = logo.slice(1, -1);
    }
  }
  if (!output) output = `rendered/${company.toLowerCase().replace(/[^a-z0-9]/g, '_')}_promo.mp4`;

  console.log();
  success(`Connected to ${c.bold}${config.model}${c.reset}`);
  console.log();

  // Step 1: Analyze reference
  if (reference) {
    info('Analyzing reference video...');
    await sleep(800);
    if (!fs.existsSync(reference)) {
      err(`Reference file not found: ${reference}`);
      process.exit(1);
    }
    success('Reference analyzed');
  }

  // Step 2: Generate HTML animation via AI
  info('Generating HTML animation via AI...');

  let htmlContent;
  try {
    htmlContent = await generateAnimation(config, { prompt, company, reference, logo });
    success('HTML animation generated');
  } catch (e) {
    err(`AI generation failed: ${e.message}`);
    process.exit(1);
  }

  // Step 3: Save HTML
  const htmlPath = output.replace('.mp4', '.html');
  fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
  fs.writeFileSync(htmlPath, htmlContent);
  success(`Animation saved → ${htmlPath}`);

  // Step 4: Render to MP4
  info('Rendering frames with Playwright...');

  try {
    await renderVideo(htmlPath, output, audio);
    success(`Video saved → ${c.bold}${output}${c.reset}`);
  } catch (e) {
    err(`Rendering failed: ${e.message}`);
    log(`${c.dim}You can still open the HTML file: open ${htmlPath}${c.reset}`);
    process.exit(1);
  }

  console.log();
  log(`${c.green}${c.bold}Done!${c.reset} ${c.dim}— open with:${c.reset} open ${output}`);
  console.log();
}

function cmdModels() {
  showBanner();
  log(`${c.bold}Supported Models${c.reset}`);
  console.log();

  const models = [
    ['Gemini 2.0 Flash', 'Google', 'Free tier · Recommended'],
    ['Gemini Pro', 'Google', 'Advanced reasoning'],
    ['GPT-4o', 'OpenAI', 'Vision + code'],
    ['GPT-4o Mini', 'OpenAI', 'Fast & cheap'],
    ['Claude Sonnet', 'Anthropic', 'Strong at code'],
    ['Claude Opus', 'Anthropic', 'Most capable'],
    ['Llama 3', 'Meta', 'Run locally via Ollama'],
    ['DeepSeek', 'DeepSeek', 'V3 / Coder'],
    ['Ollama', 'Local', 'Any local model'],
    ['LM Studio', 'Local', 'GUI for local models'],
    ['Mistral', 'Mistral AI', 'Large / Medium'],
    ['Groq', 'Groq', 'Ultra-fast inference'],
  ];

  models.forEach(([name, provider, note]) => {
    log(`  ${c.purple}•${c.reset} ${c.bold}${name}${c.reset} ${c.dim}(${provider})${c.reset} — ${note}`);
  });

  console.log();
  log(`${c.dim}To configure: framebear init${c.reset}`);
  console.log();
}

function cmdHelp() {
  showBanner();
  log(`${c.bold}Commands${c.reset}`);
  console.log();
  log(`  ${c.purple}framebear init${c.reset}       Configure your AI model & API key`);
  log(`  ${c.purple}framebear generate${c.reset}   Generate a video from a prompt`);
  log(`  ${c.purple}framebear models${c.reset}     List all supported models`);
  log(`  ${c.purple}framebear help${c.reset}       Show this help`);
  console.log();
  log(`${c.bold}Generate Options${c.reset}`);
  console.log();
  log(`  ${c.yellow}--prompt${c.reset}    ${c.dim}"Describe your video"${c.reset}`);
  log(`  ${c.yellow}--company${c.reset}   ${c.dim}"Your brand name"${c.reset}`);
  log(`  ${c.yellow}--logo${c.reset}      ${c.dim}path/to/logo.png (embeds logo image)${c.reset}`);
  log(`  ${c.yellow}--reference${c.reset} ${c.dim}path/to/reference.mp4${c.reset}`);
  log(`  ${c.yellow}--audio${c.reset}     ${c.dim}path/to/song.mp3 (adds background music)${c.reset}`);
  log(`  ${c.yellow}--output${c.reset}    ${c.dim}path/to/output.mp4${c.reset}`);
  console.log();
  log(`${c.bold}Examples${c.reset}`);
  console.log();
  log(`  ${c.dim}$ framebear generate --prompt "Product launch promo" --company "MyBrand"${c.reset}`);
  log(`  ${c.dim}$ framebear generate --reference ad.mp4 --prompt "Recreate this for us"${c.reset}`);
  console.log();
}

// ── AI Generation ───────────────────────────────────────

async function generateAnimation(config, { prompt, company, reference, logo }) {
  const systemPrompt = `You are FrameBear, an expert HTML/CSS/JS animation generator.
Create a complete, self-contained HTML file that produces a visually stunning product promo animation.

Strict Requirements:
1. Must define window.__animationDurationMs. Calculate this duration dynamically based on the user's prompt (e.g., if they ask for a 20-second video, set it to 20000). Default to 5000 if unspecified.
2. Must define a global runSequence() function that starts the animation automatically.
3. Include a ?render=1 query param check for headless rendering.
4. Resolution: 1080x1920 (Vertical) or 1920x1080 (Horizontal).
5. Brand name: ${company}
${logo ? `6. LOCAL LOGO PROVIDED: You MUST include an <img src="${logo}"> tag prominently in the layout.` : ''}

Animation & Styling Excellence (CRITICAL MANDATORY):
- FATAL ERROR IF STILL IMAGE: The video CANNOT be a still image!
- USE CSS @keyframes and 'animation' properties. Make elements slide in (transform), fade in (opacity), bounce, or scale up sequentially (using animation-delay).
- MUST INCLUDE A REALISTIC MOUSE CURSOR: You MUST create a synthetic OS-like mouse cursor using EXACTLY this SVG: <svg width="32" height="32" viewBox="0 0 24 36"><path d="M0 0L9.525 35.3361L12.9818 20.3015L24.8198 25.8672L0 0Z" fill="black"/><path d="M1.60335 2.50289L9.59364 32.1873L12.8028 18.2125L22.6186 22.8272L1.60335 2.50289Z" fill="white"/></svg>. Give it a drop shadow and animate it moving across the screen smoothly. Make it click on buttons (adding a ripple effect on the button it clicks).
- FATAL ERROR IF BROKEN IMAGES OR BASIC DOTS: Do NOT use <img src="..."> tags. Do NOT use simple, basic colored circles. You MUST build elaborate, complex, beautiful UI elements (like rounded glassmorphic cards, intricate grid layouts, or fake code editors) with CSS gradients, shadows, and text.
- DO NOT use basic grey boxes. Make elements look incredibly premium, like a real Apple commercial.
- Use Google Fonts (e.g., '@import url' for 'Inter', 'Outfit').
- Use premium modern UI techniques: subtle gradients, glassmorphism, drop shadows, heavy blur (backdrop-filter), and vibrant colors.
- Provide highly polished, professional visual aesthetics. It must look like a high-budget tech launch.`;

  const userPrompt = `Create an HTML animation for: ${prompt}
Brand: ${company}
${reference ? `Reference style: The user provided a reference video for style inspiration.` : ''}

Generate a COMPLETE HTML file with embedded CSS and JavaScript. No external dependencies.`;

  if (config.provider === 'google') {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(config.apiKey);
    const model = genAI.getGenerativeModel({ model: config.model });
    const result = await model.generateContent(systemPrompt + '\n\n' + userPrompt);
    const text = result.response.text();
    // Extract HTML from markdown code blocks if present
    const htmlMatch = text.match(/```html\n([\s\S]*?)```/) || text.match(/```\n([\s\S]*?)```/);
    return htmlMatch ? htmlMatch[1] : text;

  } else if (config.provider === 'openai') {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 8000,
      }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    const text = data.choices[0].message.content;
    const htmlMatch = text.match(/```html\n([\s\S]*?)```/) || text.match(/```\n([\s\S]*?)```/);
    return htmlMatch ? htmlMatch[1] : text;

  } else if (config.provider === 'anthropic') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model === 'claude-sonnet' ? 'claude-sonnet-4-20250514' : 'claude-opus-4-20250514',
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    const text = data.content[0].text;
    const htmlMatch = text.match(/```html\n([\s\S]*?)```/) || text.match(/```\n([\s\S]*?)```/);
    return htmlMatch ? htmlMatch[1] : text;

  } else if (config.provider === 'groq') {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    const text = data.choices[0].message.content;
    const htmlMatch = text.match(/```html\n([\s\S]*?)```/) || text.match(/```\n([\s\S]*?)```/);
    return htmlMatch ? htmlMatch[1] : text;

  } else if (config.provider === 'local') {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.apiKey, // model name stored in apiKey field for local
        prompt: systemPrompt + '\n\n' + userPrompt,
        stream: false,
      }),
    });
    const data = await response.json();
    const text = data.response;
    const htmlMatch = text.match(/```html\n([\s\S]*?)```/) || text.match(/```\n([\s\S]*?)```/);
    return htmlMatch ? htmlMatch[1] : text;
  }

  throw new Error('Unsupported provider: ' + config.provider);
}

// ── Renderer ────────────────────────────────────────────

async function renderVideo(htmlPath, outputPath, audioPath) {
  const { chromium } = require('playwright');
  const { execSync } = require('child_process');

  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  let durationMs = 5000;
  const durMatch = htmlContent.match(/window\.__animationDurationMs\s*=\s*(\d+)/);
  if (durMatch) durationMs = parseInt(durMatch[1], 10);
  
  // Decide orientation
  let w = 1080;
  let h = 1920;
  if (htmlContent.includes('1920px') && htmlContent.includes('1080px')) {
    if (htmlContent.indexOf('1920px') < htmlContent.indexOf('1080px') && htmlContent.includes('width: 1920px')) {
      w = 1920; h = 1080;
    }
  }

  info('Starting Playwright real-time compositor capture...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: path.dirname(outputPath),
      size: { width: w, height: h }
    }
  });

  const page = await context.newPage();
  
  // Navigate and immediately start real-time wait
  const fileUrl = `file://${path.resolve(htmlPath)}?render=1`;
  await page.goto(fileUrl);
  
  info(`Recording for ${durationMs}ms...`);
  await page.waitForTimeout(durationMs + 200); // 200ms buffer
  
  const rawVideoPath = await page.video().path();
  await context.close();
  await browser.close();

  // Finalize Encoding
  info('Finalizing video and audio mixing...');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  let ffmpegCommand = `ffmpeg -y -i "${rawVideoPath}" -c:v libx264 -pix_fmt yuv420p -preset fast "${outputPath}"`;
  
  if (audioPath && fs.existsSync(audioPath)) {
    info(`Adding audio track: ${path.basename(audioPath)}`);
    ffmpegCommand = `ffmpeg -y -i "${rawVideoPath}" -i "${audioPath}" -c:v libx264 -c:a aac -shortest -pix_fmt yuv420p -preset fast "${outputPath}"`;
  }

  execSync(ffmpegCommand, {
    stdio: 'pipe',
  });

  // Cleanup raw WebM
  fs.unlinkSync(rawVideoPath);
}

// ── Utilities ───────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Main ────────────────────────────────────────────────
const [,, command, ...args] = process.argv;

switch (command) {
  case 'init': cmdInit(); break;
  case 'generate': cmdGenerate(args); break;
  case 'models': cmdModels(); break;
  case 'help': case '--help': case '-h': case undefined: cmdHelp(); break;
  default:
    err(`Unknown command: ${command}`);
    log(`${c.dim}Run: framebear help${c.reset}`);
}
