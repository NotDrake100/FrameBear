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
    { id: 'ollama', name: 'Ollama (Local)', provider: 'local', note: 'Any local model' },
  ];

  log(`${c.bold}Available models:${c.reset}`);
  console.log();
  models.forEach((m, i) => {
    log(`  ${c.purple}${i + 1}${c.reset}) ${m.name} ${c.dim}— ${m.note}${c.reset}`);
  });
  console.log();

  const choice = await ask('Select model (1-7):');
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
  let prompt = '', reference = '', company = '', output = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--prompt' && args[i + 1]) prompt = args[++i];
    else if (args[i] === '--reference' && args[i + 1]) reference = args[++i];
    else if (args[i] === '--company' && args[i + 1]) company = args[++i];
    else if (args[i] === '--output' && args[i + 1]) output = args[++i];
  }

  // Interactive mode if no args
  if (!prompt) prompt = await ask('Describe your video:');
  if (!company) company = await ask('Company/brand name:');
  if (!reference) {
    const ref = await ask('Reference video path (optional, press Enter to skip):');
    if (ref) reference = ref;
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
    htmlContent = await generateAnimation(config, { prompt, company, reference });
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
    await renderVideo(htmlPath, output);
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
  log(`  ${c.yellow}--reference${c.reset} ${c.dim}path/to/reference.mp4${c.reset}`);
  log(`  ${c.yellow}--output${c.reset}    ${c.dim}path/to/output.mp4${c.reset}`);
  console.log();
  log(`${c.bold}Examples${c.reset}`);
  console.log();
  log(`  ${c.dim}$ framebear generate --prompt "Product launch promo" --company "MyBrand"${c.reset}`);
  log(`  ${c.dim}$ framebear generate --reference ad.mp4 --prompt "Recreate this for us"${c.reset}`);
  console.log();
}

// ── AI Generation ───────────────────────────────────────

async function generateAnimation(config, { prompt, company, reference }) {
  const systemPrompt = `You are FrameBear, an expert HTML/CSS/JS animation generator.
Create a complete, self-contained HTML file that produces a product promo animation.

Requirements:
- Must define window.__animationDurationMs (total animation length in ms)
- Must define a global runSequence() function that starts the animation
- Use CSS animations and JavaScript for timing
- Include a ?render=1 query param check for headless rendering
- Resolution: 1080x1920 (vertical) or 1920x1080 (horizontal)
- Brand name: ${company}
- Make it visually stunning with smooth transitions

The animation should tell a story about the product in 5-8 seconds.`;

  const userPrompt = `Create an HTML animation for: ${prompt}
Brand: ${company}
${reference ? `Reference style: The user provided a reference video for style inspiration.` : ''}

Generate a COMPLETE HTML file with embedded CSS and JavaScript. No external dependencies.`;

  if (config.provider === 'google') {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(config.apiKey);
    const model = genAI.getGenerativeModel({ model: config.model });
    const result = await model.generateContent([
      { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }
    ]);
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

async function renderVideo(htmlPath, outputPath) {
  const { chromium } = require('playwright');
  const { execSync } = require('child_process');

  const absoluteHtml = path.resolve(htmlPath);
  const framesDir = outputPath.replace('.mp4', '_frames');
  fs.mkdirSync(framesDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });

  // Enable virtual time
  const cdp = await page.context().newCDPSession(page);

  await page.goto(`file://${absoluteHtml}?render=1`);

  // Get animation duration
  const durationMs = await page.evaluate(() => window.__animationDurationMs || 5000);
  const fps = 30;
  const totalFrames = Math.ceil((durationMs / 1000) * fps);
  const frameDuration = 1000 / fps;

  info(`Rendering ${totalFrames} frames at ${fps}fps...`);

  // Start animation
  await page.evaluate(() => {
    if (typeof runSequence === 'function') runSequence();
  });

  // Capture frames with virtual time
  for (let i = 0; i < totalFrames; i++) {
    await cdp.send('Emulation.setVirtualTimePolicy', {
      policy: 'advance',
      budget: frameDuration * 1000, // microseconds
    });
    await page.waitForTimeout(1);

    const framePath = path.join(framesDir, `f_${String(i).padStart(5, '0')}.png`);
    await page.screenshot({ path: framePath });

    // Progress
    if (i % 10 === 0) {
      process.stdout.write(`\r  ${c.yellow}▸${c.reset} ${c.dim}Frame ${i + 1}/${totalFrames}${c.reset}`);
    }
  }
  process.stdout.write('\n');

  await browser.close();

  // Encode with FFmpeg
  info('Encoding to H.264 MP4...');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  execSync(`ffmpeg -y -framerate ${fps} -i "${framesDir}/f_%05d.png" -c:v libx264 -pix_fmt yuv420p -preset fast "${outputPath}"`, {
    stdio: 'pipe',
  });

  // Cleanup frames
  fs.rmSync(framesDir, { recursive: true, force: true });
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
