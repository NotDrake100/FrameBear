#!/usr/bin/env node

/**
 * FrameBear CLI — AI Video Generator (Template Engine)
 * Usage:
 *   framebear init              → Configure your AI model
 *   framebear generate          → Generate a video from a prompt
 *   framebear templates         → List available templates
 *   framebear models            → List supported models
 *   framebear help              → Show help
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ── Colors ──────────────────────────────────────────────
const c = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  purple: '\x1b[35m', green: '\x1b[32m', yellow: '\x1b[33m',
  red: '\x1b[31m', cyan: '\x1b[36m', white: '\x1b[37m',
};

const CONFIG_FILE = path.join(process.env.HOME || process.env.USERPROFILE, '.framebear.json');
const TEMPLATES_DIR = path.join(__dirname, 'templates');

// ── Helpers ─────────────────────────────────────────────
function log(msg) { console.log(`  ${msg}`); }
function success(msg) { console.log(`  ${c.green}✓${c.reset} ${msg}`); }
function info(msg) { console.log(`  ${c.yellow}▸${c.reset} ${c.dim}${msg}${c.reset}`); }
function err(msg) { console.log(`  ${c.red}✗${c.reset} ${msg}`); }

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(`  ${c.purple}?${c.reset} ${question} `, answer => {
      rl.close(); resolve(answer.trim());
    });
  });
}

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch { return null; }
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
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Banner ──────────────────────────────────────────────
function showBanner() {
  console.log();
  console.log(`  ${c.purple}${c.bold}╭──────────────────────────────────────╮${c.reset}`);
  console.log(`  ${c.purple}${c.bold}│${c.reset}  🐻 ${c.bold}FrameBear${c.reset} ${c.dim}v2.0.0${c.reset}                  ${c.purple}${c.bold}│${c.reset}`);
  console.log(`  ${c.purple}${c.bold}│${c.reset}  ${c.dim}The AI that makes product videos.${c.reset}   ${c.purple}${c.bold}│${c.reset}`);
  console.log(`  ${c.purple}${c.bold}╰──────────────────────────────────────╯${c.reset}`);
  console.log();
}

// ── Template Registry ───────────────────────────────────
const TEMPLATES = {
  product_launch: {
    name: 'Product Launch',
    file: 'product_launch.html',
    desc: 'Terminal + AI model grid + headline + brand close',
    placeholders: ['BRAND', 'HEADLINE', 'SUBLINE', 'COMMAND', 'GRID_TITLE', 'CTA_TEXT', 'BRAND_TAGLINE', 'ACCENT_COLOR'],
  },
  minimal_text: {
    name: 'Minimal Text',
    file: 'minimal_text.html',
    desc: 'Bold kinetic typography with split words + logo CTA',
    placeholders: ['BRAND', 'WORD_1', 'WORD_2', 'SUBLINE', 'CTA_TEXT', 'BRAND_TAGLINE', 'ACCENT_COLOR'],
  },
};

// ── Template Engine ─────────────────────────────────────
function fillTemplate(templateId, values, logoDataUri) {
  const tmpl = TEMPLATES[templateId];
  if (!tmpl) throw new Error(`Unknown template: ${templateId}`);

  let html = fs.readFileSync(path.join(TEMPLATES_DIR, tmpl.file), 'utf8');

  // Replace all {{PLACEHOLDER}} tokens
  for (const [key, val] of Object.entries(values)) {
    html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val || '');
  }

  // Inject logo
  if (logoDataUri) {
    html = html.replace(/__LOGO_SRC__/g, logoDataUri);
  } else {
    // Remove logo img tags if no logo provided
    html = html.replace(/<img[^>]*__LOGO_SRC__[^>]*>/g, '');
  }

  return html;
}

// ── AI Customizer ───────────────────────────────────────
async function getCustomizations(config, prompt, company, templateId) {
  const tmpl = TEMPLATES[templateId];
  const placeholders = tmpl.placeholders.filter(p => p !== 'ACCENT_COLOR');

  const systemPrompt = `You customize video templates. Given a user prompt and template, return ONLY a JSON object with these keys: ${placeholders.join(', ')}, ACCENT_COLOR.
Rules:
- BRAND = company name provided
- ACCENT_COLOR = a hex color matching the brand vibe (e.g. #9b7fd4 for purple, #10a37f for green)
- COMMAND = a terminal command the user would type (for product_launch template)
- WORD_1 and WORD_2 = two powerful words that split the headline (for minimal_text template)
- Keep text punchy, short, and marketing-grade
- Return ONLY valid JSON, nothing else`;

  const userPrompt = `Template: ${templateId}
Company: ${company}
User wants: ${prompt}
Return JSON with keys: ${placeholders.join(', ')}, ACCENT_COLOR`;

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
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        max_tokens: 500,
      }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    text = data.choices[0].message.content;

  } else if (config.provider === 'anthropic') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': config.apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: config.model === 'claude-sonnet' ? 'claude-sonnet-4-20250514' : 'claude-opus-4-20250514',
        max_tokens: 500, system: systemPrompt,
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
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        max_tokens: 500,
      }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    text = data.choices[0].message.content;

  } else if (config.provider === 'local') {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: config.apiKey, prompt: systemPrompt + '\n\n' + userPrompt, stream: false }),
    });
    const data = await response.json();
    text = data.response;
  }

  // Parse JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI did not return valid JSON');
  return JSON.parse(jsonMatch[0]);
}

// ── Renderer ────────────────────────────────────────────
async function renderVideo(htmlPath, outputPath, audioPath) {
  const { chromium } = require('playwright');
  const FFMPEG = fs.existsSync('/opt/homebrew/bin/ffmpeg') ? '/opt/homebrew/bin/ffmpeg' : 'ffmpeg';

  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  // Parse duration
  let durationMs = 10000;
  const durMatch = htmlContent.match(/window\.__animationDurationMs\s*=\s*(\d+)/);
  if (durMatch) durationMs = parseInt(durMatch[1], 10);

  // Also try scenes.reduce
  const sceneDurs = [...htmlContent.matchAll(/duration:\s*(\d+)/g)];
  if (sceneDurs.length > 0) {
    const total = sceneDurs.reduce((sum, m) => sum + parseInt(m[1], 10), 0);
    if (total > 0) durationMs = total;
  }

  // Decide orientation
  let w = 1080, h = 1920;
  if (/width\s*[:=]\s*['"]?1920/i.test(htmlContent)) { w = 1920; h = 1080; }

  info(`Video: ${w}x${h}, duration: ${(durationMs / 1000).toFixed(1)}s`);

  const rawDir = path.join(path.dirname(outputPath), '.framebear_raw');
  fs.mkdirSync(rawDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: w, height: h }, deviceScaleFactor: 1,
    recordVideo: { dir: rawDir, size: { width: w, height: h } }
  });

  const page = await context.newPage();
  await page.goto(`file://${path.resolve(htmlPath)}?render=1`, { waitUntil: 'load' });

  // Wait for Google Fonts
  await page.waitForTimeout(2500);

  info(`Recording for ${(durationMs / 1000).toFixed(1)}s...`);
  await page.waitForTimeout(durationMs + 500);

  const videoObj = page.video();
  await context.close();
  await browser.close();
  const rawVideoPath = await videoObj.path();

  info('Encoding final MP4...');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const { spawnSync } = require('child_process');
  let ffmpegArgs;
  if (audioPath && fs.existsSync(audioPath)) {
    const videoDurSec = (durationMs / 1000).toFixed(2);
    const fadeOutStart = Math.max(0, parseFloat(videoDurSec) - 1.5).toFixed(2);
    info(`Mixing audio: ${path.basename(audioPath)} (trimmed to ${videoDurSec}s with fade)`);
    ffmpegArgs = ['-y', '-i', rawVideoPath, '-i', audioPath,
      '-c:v', 'libx264', '-crf', '18', '-preset', 'fast', '-pix_fmt', 'yuv420p',
      '-af', `afade=t=in:st=0:d=0.5,afade=t=out:st=${fadeOutStart}:d=1.5`,
      '-c:a', 'aac', '-b:a', '192k', '-t', videoDurSec,
      '-movflags', '+faststart', outputPath];
  } else {
    ffmpegArgs = ['-y', '-i', rawVideoPath,
      '-c:v', 'libx264', '-crf', '18', '-preset', 'fast', '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart', outputPath];
  }

  const result = spawnSync(FFMPEG, ffmpegArgs, { stdio: 'pipe' });
  if (result.status !== 0) {
    const stderr = result.stderr ? result.stderr.toString() : 'unknown';
    throw new Error(`FFmpeg failed: ${stderr.slice(-300)}`);
  }

  fs.rmSync(rawDir, { recursive: true, force: true });
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
    err('Invalid choice.'); process.exit(1);
  }

  const selected = models[idx];
  let apiKey = '';
  if (selected.provider !== 'local') {
    console.log();
    const urls = { google: 'https://aistudio.google.com/apikey', openai: 'https://platform.openai.com/api-keys', anthropic: 'https://console.anthropic.com', groq: 'https://console.groq.com/keys' };
    log(`${c.dim}Get key at: ${c.cyan}${urls[selected.provider]}${c.reset}`);
    console.log();
    apiKey = await ask('Enter your API key:');
    if (!apiKey) { err('API key required.'); process.exit(1); }
  } else {
    log(`${c.dim}Make sure Ollama is running: ${c.cyan}ollama serve${c.reset}`);
    const ollamaModel = await ask('Ollama model name (e.g. llama3):');
    apiKey = ollamaModel || 'llama3';
  }

  saveConfig({ model: selected.id, provider: selected.provider, apiKey, createdAt: new Date().toISOString() });
  console.log();
  success(`Connected to ${c.bold}${selected.name}${c.reset}`);
  log(`${c.dim}Config saved to ~/.framebear.json${c.reset}`);
  console.log();
}

async function cmdGenerate(args) {
  showBanner();
  const config = loadConfig();
  if (!config) { err('Not initialized. Run: framebear init'); process.exit(1); }

  // Parse args
  let prompt = '', company = '', output = '', audio = '', logo = '', templateId = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--prompt' && args[i + 1]) prompt = args[++i];
    else if (args[i] === '--company' && args[i + 1]) company = args[++i];
    else if (args[i] === '--output' && args[i + 1]) output = args[++i];
    else if (args[i] === '--audio' && args[i + 1]) audio = args[++i];
    else if (args[i] === '--logo' && args[i + 1]) logo = args[++i];
    else if (args[i] === '--template' && args[i + 1]) templateId = args[++i];
  }

  // Interactive
  if (!prompt) prompt = await ask('Describe your video:');
  if (!company) company = await ask('Company/brand name:');
  if (!templateId) {
    console.log();
    log(`${c.bold}Choose a template:${c.reset}`);
    console.log();
    const keys = Object.keys(TEMPLATES);
    keys.forEach((k, i) => {
      log(`  ${c.purple}${i + 1}${c.reset}) ${c.bold}${TEMPLATES[k].name}${c.reset} ${c.dim}— ${TEMPLATES[k].desc}${c.reset}`);
    });
    console.log();
    const tmplChoice = await ask(`Select template (1-${keys.length}):`);
    const tmplIdx = parseInt(tmplChoice) - 1;
    if (isNaN(tmplIdx) || tmplIdx < 0 || tmplIdx >= keys.length) {
      err('Invalid choice.'); process.exit(1);
    }
    templateId = keys[tmplIdx];
  }
  if (!audio) {
    let aud = await ask('Audio path (optional, Enter to skip):');
    audio = cleanPath(aud);
  }
  if (!logo) {
    let lg = await ask('Logo path (optional, Enter to skip):');
    logo = cleanPath(lg);
  }
  if (!output) output = `rendered/${company.toLowerCase().replace(/[^a-z0-9]/g, '_')}_promo.mp4`;

  console.log();
  success(`Model: ${c.bold}${config.model}${c.reset}`);
  success(`Template: ${c.bold}${TEMPLATES[templateId].name}${c.reset}`);
  console.log();

  // Prepare logo
  let logoDataUri = '';
  if (logo && fs.existsSync(logo)) {
    const ext = path.extname(logo).slice(1) || 'png';
    logoDataUri = `data:image/${ext};base64,${fs.readFileSync(logo).toString('base64')}`;
    success('Logo embedded');
  }

  // Get AI customizations
  info('AI is analyzing your prompt...');
  let customizations;
  try {
    customizations = await getCustomizations(config, prompt, company, templateId);
    success('Customizations generated');
  } catch (e) {
    err(`AI customization failed: ${e.message}`);
    info('Using smart defaults...');
    customizations = {
      BRAND: company,
      HEADLINE: 'The future starts here.',
      SUBLINE: 'Built for speed. Designed for scale.',
      COMMAND: `${company.toLowerCase()} generate --prompt "launch video"`,
      GRID_TITLE: 'Powered by 12+ AI Models',
      CTA_TEXT: 'Get Started',
      BRAND_TAGLINE: 'AI-Powered Video Generation',
      ACCENT_COLOR: '#9b7fd4',
      WORD_1: company.split(' ')[0] || 'Build',
      WORD_2: 'Better.',
    };
  }

  info(`Accent: ${customizations.ACCENT_COLOR || '#9b7fd4'}`);
  info(`Headline: ${customizations.HEADLINE || customizations.WORD_1 || ''}`);

  // Fill template
  info('Building animation from template...');
  const htmlContent = fillTemplate(templateId, customizations, logoDataUri);
  const htmlPath = output.replace('.mp4', '.html');
  fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
  fs.writeFileSync(htmlPath, htmlContent);
  success(`Animation saved → ${htmlPath}`);

  // Render
  info('Rendering video with Playwright...');
  try {
    await renderVideo(htmlPath, output, audio);
    success(`Video saved → ${c.bold}${output}${c.reset}`);
  } catch (e) {
    err(`Rendering failed: ${e.message}`);
    log(`${c.dim}Open HTML directly: open ${htmlPath}${c.reset}`);
    process.exit(1);
  }

  console.log();
  log(`${c.green}${c.bold}Done!${c.reset} ${c.dim}— open with:${c.reset} open ${output}`);
  console.log();
}

function cmdTemplates() {
  showBanner();
  log(`${c.bold}Available Templates${c.reset}`);
  console.log();
  Object.entries(TEMPLATES).forEach(([id, t]) => {
    log(`  ${c.purple}•${c.reset} ${c.bold}${t.name}${c.reset} ${c.dim}(${id})${c.reset}`);
    log(`    ${c.dim}${t.desc}${c.reset}`);
    log(`    ${c.dim}Customizable: ${t.placeholders.join(', ')}${c.reset}`);
    console.log();
  });
}

function cmdModels() {
  showBanner();
  log(`${c.bold}Supported Models${c.reset}`);
  console.log();
  [['Gemini 2.0 Flash','Google','Free · Recommended'],['GPT-4o','OpenAI','Vision + code'],
   ['Claude Sonnet','Anthropic','Strong at code'],['Llama 3.3','Groq','Ultra-fast & Free'],
   ['Ollama','Local','Any local model']].forEach(([n,p,d]) => {
    log(`  ${c.purple}•${c.reset} ${c.bold}${n}${c.reset} ${c.dim}(${p}) — ${d}${c.reset}`);
  });
  console.log();
}

function cmdHelp() {
  showBanner();
  log(`${c.bold}Commands${c.reset}`);
  console.log();
  log(`  ${c.purple}framebear init${c.reset}        Configure AI model & API key`);
  log(`  ${c.purple}framebear generate${c.reset}    Generate a video from a prompt`);
  log(`  ${c.purple}framebear templates${c.reset}   List available templates`);
  log(`  ${c.purple}framebear models${c.reset}      List supported AI models`);
  log(`  ${c.purple}framebear help${c.reset}        Show this help`);
  console.log();
  log(`${c.bold}Options${c.reset}`);
  console.log();
  log(`  ${c.yellow}--prompt${c.reset}     ${c.dim}"Describe your video"${c.reset}`);
  log(`  ${c.yellow}--company${c.reset}    ${c.dim}"Brand name"${c.reset}`);
  log(`  ${c.yellow}--template${c.reset}   ${c.dim}product_launch | minimal_text${c.reset}`);
  log(`  ${c.yellow}--logo${c.reset}       ${c.dim}path/to/logo.png${c.reset}`);
  log(`  ${c.yellow}--audio${c.reset}      ${c.dim}path/to/song.mp3${c.reset}`);
  log(`  ${c.yellow}--output${c.reset}     ${c.dim}path/to/output.mp4${c.reset}`);
  console.log();
}

// ── Main ────────────────────────────────────────────────
const [,, command, ...args] = process.argv;
switch (command) {
  case 'init': cmdInit(); break;
  case 'generate': cmdGenerate(args); break;
  case 'templates': cmdTemplates(); break;
  case 'models': cmdModels(); break;
  case 'help': case '--help': case '-h': case undefined: cmdHelp(); break;
  default: err(`Unknown command: ${command}`); log(`${c.dim}Run: framebear help${c.reset}`);
}
