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

function cleanPath(p) {
  if (!p) return '';
  p = p.replace(/\\/g, '').trim();
  if (p.startsWith("'") && p.endsWith("'")) p = p.slice(1, -1);
  if (p.startsWith('"') && p.endsWith('"')) p = p.slice(1, -1);
  return p;
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
    reference = cleanPath(ref);
  }
  if (!audio) {
    let aud = await ask('Audio song path (optional, press Enter to skip):');
    audio = cleanPath(aud);
  }
  if (!logo) {
    let lg = await ask('Logo image path (optional, press Enter to skip):');
    logo = cleanPath(lg);
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

  // Step 2: Prepare logo as base64 data URI
  let logoDataUri = '';
  if (logo && fs.existsSync(logo)) {
    try {
      const ext = path.extname(logo).slice(1) || 'png';
      const b64 = fs.readFileSync(logo).toString('base64');
      logoDataUri = `data:image/${ext};base64,${b64}`;
      success('Logo embedded as base64');
    } catch(e) {
      err(`Could not read logo: ${e.message}`);
    }
  }

  // Step 3: Generate HTML animation via AI
  info('Generating HTML animation via AI...');

  let htmlContent;
  try {
    htmlContent = await generateAnimation(config, { prompt, company, reference, logo: logoDataUri });
    success('HTML animation generated');
  } catch (e) {
    err(`AI generation failed: ${e.message}`);
    process.exit(1);
  }

  // Step 4: Save HTML
  const htmlPath = output.replace('.mp4', '.html');
  fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
  fs.writeFileSync(htmlPath, htmlContent);
  success(`Animation saved → ${htmlPath}`);

  // Step 5: Render to MP4
  info('Rendering video with Playwright...');

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

function buildSystemPrompt(company, logo) {
  return `You are FrameBear, an expert HTML/CSS/JS animation generator for product promo videos.

OUTPUT RULES:
- Return ONLY the complete HTML file. No markdown, no explanation, no code fences.
- The HTML file must be completely self-contained with embedded <style> and <script>.

TECHNICAL REQUIREMENTS:
1. Set window.__animationDurationMs to the total animation length in milliseconds.
   - Parse the user's request for duration (e.g. "20-second video" = 20000). Default: 10000.
2. The animation uses a scene-based system driven by setTimeout.
   - Define an array of scenes, each with an id and duration.
   - Use a showScene(index) function that hides all scenes, shows the current one, resets CSS animations on its children, and schedules the next scene via setTimeout.
   - Call showScene(0) at the bottom of the script to auto-start.
3. The page must check for ?render=1 in the URL (for headless rendering).

STRUCTURE TEMPLATE (you MUST follow this pattern):
- A <main class="stage"> container, sized 1080x1920 (vertical phone) or 1920x1080 (horizontal).
- Multiple <section class="scene"> elements inside .stage, each with a unique id.
- .scene elements are position:absolute, inset:0, display:none by default.
- .scene.active has display:grid (or flex) and opacity:1.
- Use CSS @keyframes for child element animations (fade in, slide up, scale, etc.).
- Trigger animations via .scene.active .child { animation: ... }

MOUSE CURSOR (MANDATORY):
- You MUST include a fake macOS mouse cursor as a <div id="cursor"> with position:fixed and z-index:9999.
- Use this exact SVG for the cursor shape: <svg width="24" height="28" viewBox="0 0 24 36"><path d="M0 0L9.5 35.3L13 20.3L24.8 25.9L0 0Z" fill="#000"/><path d="M1.6 2.5L9.6 32.2L12.8 18.2L22.6 22.8L1.6 2.5Z" fill="#fff"/></svg>
- Give it filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)).
- Animate it with CSS @keyframes to move between interactive elements across scenes. Use animation-delay to sync with scene transitions.
- When the cursor "clicks" something, show a brief ripple circle expanding outward from the click point.

VISUAL DESIGN (CRITICAL):
- Background MUST be dark (#0c0d10 or similar) unless the user specifies otherwise.
- Use Google Fonts: @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap')
- Font: 'Inter', sans-serif throughout.
- Build UI elements as detailed CSS components (glassmorphic cards with backdrop-filter:blur, rounded corners, gradients, box-shadows).
- NEVER use <img src="..."> for icons. Draw icons with inline SVG or CSS shapes.
- NEVER use plain colored circles as placeholders. Build real UI mockups.
- NEVER output a white or blank page.
${logo ? `- LOGO: Include this logo using <img src="${logo}" style="width:80px;height:80px;border-radius:18px;">` : ''}

EXAMPLE SCENE SCRIPT PATTERN:
<script>
  const scenes = [
    { id: "scene-1", duration: 4000 },
    { id: "scene-2", duration: 3000 },
    { id: "scene-3", duration: 3000 }
  ];
  window.__animationDurationMs = scenes.reduce((sum, s) => sum + s.duration, 0);
  let idx = 0;
  function showScene(i) {
    document.querySelectorAll(".scene").forEach(s => { s.classList.remove("active"); });
    const el = document.getElementById(scenes[i].id);
    el.classList.add("active");
    // Reset CSS animations on children
    el.querySelectorAll("[data-anim]").forEach(n => { n.style.animation = "none"; void n.offsetWidth; n.style.animation = ""; });
    setTimeout(() => { idx = (idx + 1) % scenes.length; showScene(idx); }, scenes[i].duration);
  }
  showScene(0);
</script>`;
}

async function generateAnimation(config, { prompt, company, reference, logo }) {
  const systemPrompt = buildSystemPrompt(company, logo);

  const userPrompt = `Create an HTML animation for: ${prompt}
Brand: ${company}
${reference ? `Reference style: The user provided a reference video for style inspiration.` : ''}

Generate a COMPLETE HTML file. No markdown code fences. Just pure HTML.`;

  let text = '';

  if (config.provider === 'google') {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(config.apiKey);
    const model = genAI.getGenerativeModel({ model: config.model });
    const result = await model.generateContent(systemPrompt + '\n\n' + userPrompt);
    text = result.response.text();

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
        max_tokens: 16000,
      }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    text = data.choices[0].message.content;

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
        max_tokens: 16000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    text = data.content[0].text;

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
        max_tokens: 16000,
      }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    text = data.choices[0].message.content;

  } else if (config.provider === 'local') {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.apiKey,
        prompt: systemPrompt + '\n\n' + userPrompt,
        stream: false,
      }),
    });
    const data = await response.json();
    text = data.response;
  } else {
    throw new Error('Unsupported provider: ' + config.provider);
  }

  // Extract HTML: try code fences first, then raw
  const htmlMatch = text.match(/```html\n([\s\S]*?)```/) || text.match(/```\n([\s\S]*?)```/);
  if (htmlMatch) return htmlMatch[1];

  // If it starts with <!DOCTYPE or <html, it's raw HTML
  const trimmed = text.trim();
  if (trimmed.startsWith('<!') || trimmed.startsWith('<html')) return trimmed;

  // Last resort: find the first < to last >
  const firstTag = trimmed.indexOf('<');
  const lastTag = trimmed.lastIndexOf('>');
  if (firstTag !== -1 && lastTag !== -1) return trimmed.substring(firstTag, lastTag + 1);

  return trimmed;
}

// ── Renderer ────────────────────────────────────────────

async function renderVideo(htmlPath, outputPath, audioPath) {
  const { chromium } = require('playwright');
  const { execSync } = require('child_process');

  const FFMPEG = fs.existsSync('/opt/homebrew/bin/ffmpeg') ? '/opt/homebrew/bin/ffmpeg' : 'ffmpeg';

  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  // Parse duration from the HTML
  let durationMs = 10000;
  const durMatch = htmlContent.match(/window\.__animationDurationMs\s*=\s*(\d+)/);
  if (durMatch) durationMs = parseInt(durMatch[1], 10);

  // Also check for scenes.reduce pattern
  const scenesDurMatch = htmlContent.match(/scenes\.reduce\(\s*\(\s*sum\s*,\s*s\s*\)\s*=>\s*sum\s*\+\s*s\.duration\s*,\s*0\s*\)/);
  if (scenesDurMatch) {
    // Try to extract individual scene durations
    const sceneDurs = [...htmlContent.matchAll(/duration:\s*(\d+)/g)];
    if (sceneDurs.length > 0) {
      const total = sceneDurs.reduce((sum, m) => sum + parseInt(m[1], 10), 0);
      if (total > 0) durationMs = total;
    }
  }

  // Decide orientation from content
  let w = 1080, h = 1920; // default vertical
  if (htmlContent.includes('1920') && htmlContent.includes('1080')) {
    // Check if it's horizontal (width=1920, height=1080)
    if (/width\s*[:=]\s*['"]?1920/i.test(htmlContent) && /height\s*[:=]\s*['"]?1080/i.test(htmlContent)) {
      w = 1920; h = 1080;
    }
  }

  info(`Video: ${w}x${h}, duration: ${(durationMs / 1000).toFixed(1)}s`);

  // Use Playwright's built-in video recording (real-time compositor)
  const rawDir = path.join(path.dirname(outputPath), '.framebear_raw');
  fs.mkdirSync(rawDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: rawDir,
      size: { width: w, height: h }
    }
  });

  const page = await context.newPage();

  // Navigate and wait for fonts to load
  const fileUrl = `file://${path.resolve(htmlPath)}?render=1`;
  await page.goto(fileUrl, { waitUntil: 'load' });

  // Give Google Fonts 2 seconds to load
  await page.waitForTimeout(2000);

  info(`Recording for ${(durationMs / 1000).toFixed(1)}s...`);

  // Wait for the full animation duration
  await page.waitForTimeout(durationMs + 500);

  // Get the recorded video path before closing
  const videoObj = page.video();
  await context.close();
  await browser.close();

  const rawVideoPath = await videoObj.path();

  // Encode final MP4 with FFmpeg
  info('Encoding final MP4...');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  let ffmpegArgs;
  if (audioPath && fs.existsSync(audioPath)) {
    info(`Mixing audio: ${path.basename(audioPath)}`);
    ffmpegArgs = [
      '-y', '-i', rawVideoPath, '-i', audioPath,
      '-c:v', 'libx264', '-crf', '18', '-preset', 'fast', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '192k', '-shortest',
      '-movflags', '+faststart', outputPath
    ];
  } else {
    ffmpegArgs = [
      '-y', '-i', rawVideoPath,
      '-c:v', 'libx264', '-crf', '18', '-preset', 'fast', '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart', outputPath
    ];
  }

  const { spawnSync } = require('child_process');
  const result = spawnSync(FFMPEG, ffmpegArgs, { stdio: 'pipe' });
  if (result.status !== 0) {
    const stderr = result.stderr ? result.stderr.toString() : 'unknown error';
    throw new Error(`FFmpeg failed: ${stderr.slice(-200)}`);
  }

  // Cleanup raw recording
  fs.rmSync(rawDir, { recursive: true, force: true });
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
