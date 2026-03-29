/* ============================================================
   NeuralCore — script.js
   All JavaScript: Cursor, Canvas, API Key, Chat, Code Gen,
   Concept Explainer, Model Recommender, GitHub Projects Memory
   ============================================================ */

/* ========== API KEY MANAGEMENT ========== */
let ANTHROPIC_KEY = localStorage.getItem('nc_api_key') || '';

function openModal() {
  document.getElementById('apiModal').classList.remove('hidden');
  document.getElementById('apiKeyInput').value = ANTHROPIC_KEY;
}
function closeModal() {
  document.getElementById('apiModal').classList.add('hidden');
}
function toggleKeyVis() {
  const inp = document.getElementById('apiKeyInput');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}
function saveApiKey() {
  const key = document.getElementById('apiKeyInput').value.trim();
  const errEl = document.getElementById('apiKeyError');
  if (!key.startsWith('sk-ant-')) {
    errEl.style.display = 'block';
    return;
  }
  errEl.style.display = 'none';
  ANTHROPIC_KEY = key;
  localStorage.setItem('nc_api_key', key);
  updateApiStatus(true);
  closeModal();
  showToast('✅ API key saved! AI tools are now active.');
}
function updateApiStatus(active) {
  const dot = document.getElementById('apiDot');
  const txt = document.getElementById('apiStatusText');
  if (active) {
    dot.classList.add('active');
    txt.textContent = 'API Connected';
  } else {
    dot.classList.remove('active');
    txt.textContent = 'Set API Key';
  }
}
function showToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:2rem;right:2rem;background:#0c1624;border:1px solid var(--accent3);color:var(--text);font-family:JetBrains Mono,monospace;font-size:0.8rem;padding:0.8rem 1.2rem;z-index:5000;animation:fadeUp 0.3s ease';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

/* ========== CLAUDE API ========== */
async function callClaude(system, userMsg, historyMsgs = []) {
  if (!ANTHROPIC_KEY) {
    throw new Error('NO_KEY');
  }
  const messages = [...historyMsgs, { role: 'user', content: userMsg }];
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system,
      messages
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'API error ' + res.status);
  }
  const data = await res.json();
  return data.content[0].text;
}

function noKeyMsg() {
  return '<span class="error-msg">🔑 API key not set. Click <strong>"Set API Key"</strong> in the top-right to activate AI tools.</span>';
}

/* ========== CURSOR ========== */
const cursor = document.getElementById('cursor');
const ring = document.getElementById('cursorRing');
let mx = 0, my = 0, rx = 0, ry = 0;
document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
function animCursor() {
  cursor.style.left = mx - 6 + 'px';
  cursor.style.top = my - 6 + 'px';
  rx += (mx - rx) * 0.12;
  ry += (my - ry) * 0.12;
  ring.style.left = rx - 18 + 'px';
  ring.style.top = ry - 18 + 'px';
  requestAnimationFrame(animCursor);
}
animCursor();
function addCursorEffect(el) {
  el.addEventListener('mouseenter', () => cursor.style.transform = 'scale(2.5)');
  el.addEventListener('mouseleave', () => cursor.style.transform = 'scale(1)');
}
document.querySelectorAll('a, button, input, select, textarea').forEach(addCursorEffect);

/* ========== NEURAL CANVAS ========== */
const canvas = document.getElementById('neural-canvas');
const ctx = canvas.getContext('2d');
let W, H, nodes = [], cf = 0;
function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
resize(); window.addEventListener('resize', resize);
function initNodes() {
  nodes = [];
  const count = Math.min(70, Math.floor(W * H / 16000));
  for (let i = 0; i < count; i++) {
    nodes.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3, r: Math.random() * 2 + 1, p: Math.random() * Math.PI * 2 });
  }
}
initNodes();
function drawCanvas() {
  ctx.clearRect(0, 0, W, H); cf++;
  const m1 = mx / W, m2 = my / H;
  nodes.forEach(n => {
    n.x += n.vx + (m1 - .5) * .04; n.y += n.vy + (m2 - .5) * .04;
    if (n.x < 0) n.x = W; if (n.x > W) n.x = 0;
    if (n.y < 0) n.y = H; if (n.y > H) n.y = 0;
    n.p += .02;
    ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,212,255,${.4 + Math.sin(n.p) * .3})`; ctx.fill();
  });
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y, d = Math.sqrt(dx * dx + dy * dy);
      if (d < 145) {
        ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y);
        ctx.strokeStyle = `hsla(${200 + Math.sin(cf * .005 + i) * 40},100%,65%,${(1 - d / 145) * .28})`;
        ctx.lineWidth = .5; ctx.stroke();
      }
    }
  }
  requestAnimationFrame(drawCanvas);
}
drawCanvas();

/* ========== STATS COUNTER ========== */
function animCounter(el) {
  const target = parseFloat(el.dataset.target), isFloat = el.dataset.target.includes('.');
  const start = performance.now();
  function tick(now) {
    const p = Math.min((now - start) / 1800, 1), ease = 1 - Math.pow(1 - p, 3), v = target * ease;
    el.textContent = isFloat ? v.toFixed(1) : Math.floor(v).toLocaleString();
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = isFloat ? target : target.toLocaleString();
  }
  requestAnimationFrame(tick);
}
new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.querySelectorAll('[data-target]').forEach(animCounter); });
}, { threshold: .3 }).observe(document.querySelector('.stats-bar'));

/* Metric bars */
document.querySelectorAll('.model-card').forEach(card => {
  new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.querySelectorAll('.metric-fill').forEach(f => f.style.width = f.dataset.width + '%'); });
  }, { threshold: .2 }).observe(card);
});

/* ========== TABS ========== */
function switchTab(name, btn) {
  document.querySelectorAll('.tool-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tool-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
  btn.classList.add('active');
}

/* ========== GITHUB PROJECTS (localStorage Memory) ========== */
const PROJECTS_KEY = 'nc_github_projects';

function loadProjects() {
  try { return JSON.parse(localStorage.getItem(PROJECTS_KEY)) || []; }
  catch { return []; }
}
function saveProjects(projects) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}
function renderProjects() {
  const projects = loadProjects();
  const grid = document.getElementById('projectsGrid');
  const empty = document.getElementById('projectsEmpty');
  const existing = grid.querySelectorAll('.project-card');
  existing.forEach(c => c.remove());
  if (projects.length === 0) {
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';
  const statusColors = {
    active: { color: '#10b981', label: '🟢 Active' },
    wip: { color: '#f59e0b', label: '🟡 WIP' },
    done: { color: '#00d4ff', label: '✅ Done' },
    paused: { color: '#f87171', label: '🔴 Paused' }
  };
  projects.forEach((p, i) => {
    const s = statusColors[p.status] || statusColors.active;
    const card = document.createElement('div');
    card.className = 'project-card';
    card.innerHTML = `
      <button class="project-delete" onclick="deleteProject(${i})" title="Delete">✕</button>
      <div class="project-card-header">
        <div class="project-name">${escHtml(p.name)}</div>
        <div class="project-status-badge" style="border-color:${s.color};color:${s.color}">${s.label}</div>
      </div>
      <div class="project-desc">${escHtml(p.desc)}</div>
      <div class="project-tech">📦 ${escHtml(p.tech)}</div>
      <div class="project-links">
        ${p.url ? `<a class="project-link" href="${escHtml(p.url)}" target="_blank">⤷ GitHub</a>` : ''}
        ${p.live ? `<a class="project-link" href="${escHtml(p.live)}" target="_blank">🌐 Live</a>` : ''}
      </div>
    `;
    grid.insertBefore(card, empty);
    card.querySelectorAll('a, button').forEach(addCursorEffect);
  });
}
function addProject() {
  const name = document.getElementById('pName').value.trim();
  const url = document.getElementById('pUrl').value.trim();
  const live = document.getElementById('pLive').value.trim();
  const desc = document.getElementById('pDesc').value.trim();
  const tech = document.getElementById('pTech').value.trim();
  const status = document.getElementById('pStatus').value;
  if (!name) { showToast('⚠️ Project name required!'); return; }
  const projects = loadProjects();
  projects.unshift({ name, url, live, desc, tech, status, added: Date.now() });
  saveProjects(projects);
  renderProjects();
  // Clear form
  ['pName', 'pUrl', 'pLive', 'pDesc', 'pTech'].forEach(id => document.getElementById(id).value = '');
  showToast('✅ Project saved to memory!');
}
function deleteProject(index) {
  if (!confirm('Delete this project?')) return;
  const projects = loadProjects();
  projects.splice(index, 1);
  saveProjects(projects);
  renderProjects();
  showToast('🗑 Project removed.');
}

/* ========== CHAT ========== */
const chatHistory = [];
let msgCount = 0;

const defaultQuestions = [
  { q: 'What is supervised vs unsupervised learning?' },
  { q: 'What is overfitting and how to fix it?' },
  { q: 'How do Transformer models work?' },
  { q: 'Explain gradient descent simply.' },
  { q: 'How do CNNs work?' },
  { q: 'Precision vs Recall vs F1 score?' },
  { q: 'When to use Reinforcement Learning?' },
  { q: 'What is the bias-variance tradeoff?' },
  { q: 'Explain backpropagation step by step.' },
  { q: 'What is RAG and how does it work?' },
];

function loadQuickQuestions() {
  const saved = JSON.parse(localStorage.getItem('nc_quick_qs') || 'null');
  return saved || defaultQuestions;
}
function saveQuickQuestions(qs) {
  localStorage.setItem('nc_quick_qs', JSON.stringify(qs));
}
function renderQuickQuestions() {
  const qs = loadQuickQuestions();
  const container = document.getElementById('quickQuestions');
  container.innerHTML = '';
  qs.forEach((item, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'quick-q-wrap';
    wrap.innerHTML = `
      <button class="quick-q" onclick="askQuick(${JSON.stringify(item.q)})">${escHtml(item.q)}</button>
      <button class="quick-q-del" onclick="deleteQuickQ(${i})" title="Remove">✕</button>
    `;
    container.appendChild(wrap);
    wrap.querySelectorAll('button').forEach(addCursorEffect);
  });
}
function toggleAddQuestion() {
  const f = document.getElementById('addQForm');
  f.style.display = f.style.display === 'none' ? 'block' : 'none';
  if (f.style.display === 'block') document.getElementById('newQInput').focus();
}
function addQuickQuestion() {
  const input = document.getElementById('newQInput');
  const q = input.value.trim();
  if (!q) return;
  const qs = loadQuickQuestions();
  qs.push({ q });
  saveQuickQuestions(qs);
  renderQuickQuestions();
  input.value = '';
  showToast('✅ Question added!');
}
function deleteQuickQ(index) {
  const qs = loadQuickQuestions();
  qs.splice(index, 1);
  saveQuickQuestions(qs);
  renderQuickQuestions();
}
document.getElementById('newQInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') addQuickQuestion();
});

function askQuick(q) {
  document.getElementById('chatInput').value = q;
  sendChat();
}

function clearChat() {
  if (!confirm('Clear chat history?')) return;
  chatHistory.length = 0;
  msgCount = 0;
  document.getElementById('chatMessages').innerHTML = '';
  document.getElementById('chatMsgCount').textContent = '0 messages';
  appendMsg('ai', '<p>Chat cleared. What would you like to know about AI/ML?</p>');
}

async function sendChat() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  input.style.height = 'auto';
  appendMsg('user', escHtml(msg));
  msgCount++;
  document.getElementById('chatMsgCount').textContent = msgCount + ' messages';
  const btn = document.getElementById('chatSend');
  btn.disabled = true;
  const typing = appendTyping();
  try {
    chatHistory.push({ role: 'user', content: msg });
    const sys = `You are NeuralCore AI Assistant, an expert ML educator and engineer. Help users understand machine learning, deep learning, AI concepts, Python code, and career advice.
- Be clear, concise, and practical
- Use real-world analogies for complex topics
- Provide Python code examples when relevant (wrap in triple backtick python blocks)
- Format lists with dashes
- Be encouraging and supportive
- Keep responses focused and well-structured`;
    const reply = await callClaude(sys, msg, chatHistory.slice(-12, -1));
    chatHistory.push({ role: 'assistant', content: reply });
    msgCount++;
    document.getElementById('chatMsgCount').textContent = msgCount + ' messages';
    typing.remove();
    appendMsg('ai', formatReply(reply));
  } catch (e) {
    typing.remove();
    if (e.message === 'NO_KEY') {
      appendMsg('ai', noKeyMsg());
    } else {
      appendMsg('ai', `<span class="error-msg">⚠️ Error: ${escHtml(e.message)}. Please try again.</span>`);
    }
  }
  btn.disabled = false;
  input.focus();
}

function appendMsg(role, html) {
  const msgs = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'msg ' + role;
  div.innerHTML = html;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}
function appendTyping() {
  const msgs = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'typing-indicator';
  div.innerHTML = `<span style="font-family:'JetBrains Mono',monospace;font-size:0.7rem;color:var(--muted)">Thinking</span><div class="typing-dots"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}
function formatReply(text) {
  // Code blocks
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
    `<pre><code>${escHtml(code.trim())}</code></pre>`);
  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Bold
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Lists
  text = text.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
  text = text.replace(/(<li>[\s\S]+?<\/li>)+/g, m => `<ul>${m}</ul>`);
  // Paragraphs
  const parts = text.split(/\n\n+/);
  return parts.map(p => {
    p = p.trim();
    if (!p) return '';
    if (p.startsWith('<pre>') || p.startsWith('<ul>')) return p;
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  }).join('');
}

// Auto-resize textarea
document.getElementById('chatInput').addEventListener('input', function () {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});
document.getElementById('chatInput').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
});

/* ========== CODE GENERATOR ========== */
async function generateCode() {
  const task = document.getElementById('taskType').value;
  const algo = document.getElementById('algorithmType').value;
  const prob = document.getElementById('problemDesc').value.trim() || 'a general machine learning problem';
  const extra = document.getElementById('extraReqs').value.trim();
  const style = document.getElementById('codeStyle').value;
  const btn = document.getElementById('genBtn');
  const out = document.getElementById('codeOutput');
  btn.disabled = true;
  btn.textContent = '⏳ Generating...';
  out.innerHTML = '<span class="placeholder">⚡ AI is writing your Python code...\nThis may take a few seconds.</span>';
  try {
    const prompt = `Generate complete, production-ready Python code for the following ML task:

TASK TYPE: ${task}
ALGORITHM/MODEL: ${algo}
PROBLEM DESCRIPTION: ${prob}
EXTRA REQUIREMENTS: ${extra || 'None'}
CODE STYLE: ${style}

Requirements:
1. Include ALL necessary imports at the top
2. Add comments appropriate for the requested style
3. Include proper data preprocessing and splitting
4. Train the model with appropriate parameters
5. Evaluate with metrics relevant to the task type
6. Handle common edge cases
7. Make the code immediately runnable
8. If code style is beginner-friendly, add very detailed step-by-step comments
9. If notebook style, add clear section headers as comments

IMPORTANT: Output ONLY raw Python code. No markdown fences. No explanation text before or after. Start directly with import statements.`;

    const code = await callClaude(
      'You are a senior ML engineer. Generate clean, runnable Python code. Output ONLY raw Python code — no markdown backticks, no ``` python, no preamble, no postamble. Start with import statements.',
      prompt
    );
    out.textContent = code.replace(/^```python\n?|^```\n?|```$/gm, '').trim();
  } catch (e) {
    if (e.message === 'NO_KEY') {
      out.innerHTML = noKeyMsg();
    } else {
      out.innerHTML = `<span class="error-msg">⚠️ Error: ${escHtml(e.message)}</span>`;
    }
  }
  btn.disabled = false;
  btn.textContent = '⚡ Generate Code';
}

function copyCode() {
  const text = document.getElementById('codeOutput').innerText;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copyBtn');
    btn.textContent = '✓ Copied!'; btn.style.color = 'var(--accent3)';
    setTimeout(() => { btn.textContent = '📋 Copy'; btn.style.color = ''; }, 2000);
  });
}
function downloadCode() {
  const code = document.getElementById('codeOutput').innerText;
  const task = document.getElementById('taskType').value.replace(/\s+/g, '_').toLowerCase();
  const blob = new Blob([code], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `neuralcore_${task}_${Date.now()}.py`;
  a.click();
}

/* ========== CONCEPT EXPLAINER ========== */
let selectedConceptBtn = null;

function filterConcepts(query) {
  const topics = document.querySelectorAll('.concept-topic');
  const q = query.toLowerCase();
  topics.forEach(t => {
    const matches = t.dataset.topic.toLowerCase().includes(q) || t.textContent.toLowerCase().includes(q);
    t.classList.toggle('hidden', !matches);
  });
}

async function explainConcept(topic, btn) {
  if (selectedConceptBtn) selectedConceptBtn.classList.remove('selected');
  btn.classList.add('selected');
  selectedConceptBtn = btn;
  await doExplain(topic);
}
async function explainCustom() {
  const t = document.getElementById('customTopic').value.trim();
  if (!t) return;
  if (selectedConceptBtn) selectedConceptBtn.classList.remove('selected');
  selectedConceptBtn = null;
  await doExplain(t);
}
document.getElementById('customTopic').addEventListener('keydown', e => {
  if (e.key === 'Enter') explainCustom();
});

async function doExplain(topic) {
  const out = document.getElementById('conceptOutput');
  out.innerHTML = `<div style="display:flex;align-items:center;gap:0.8rem;color:var(--muted);font-size:0.85rem"><div class="spinner"></div> Explaining <strong>${escHtml(topic)}</strong>...</div>`;
  try {
    const sys = `You are an expert ML educator at NeuralCore. Explain concepts clearly for beginners and intermediate learners.
Format your response using ONLY these exact HTML elements — no extra wrappers:

<h3>[emoji] [Topic Name]</h3>
<p>[Clear 2-3 sentence definition in plain, accessible language]</p>
<div class="analogy">[A memorable real-world analogy that makes this concept immediately click — something anyone can relate to]</div>
<p><strong>How it works:</strong> [Explain the core mechanism in 3-5 simple sentences. Break it down step by step.]</p>
<div class="key-point">💡 KEY INSIGHT: [The single most important thing to understand about this concept]</div>
<p><strong>Real-world applications:</strong> [2-4 concrete examples of where this is used in production systems]</p>
<div class="key-point">⚠️ COMMON MISTAKE: [One mistake beginners often make — and how to avoid it]</div>
<p><strong>Learn more:</strong> [Suggest 1-2 resources or related concepts to explore next]</p>

Use only these HTML tags. Be educational, engaging, and practical.`;

    const html = await callClaude(sys, `Explain in depth for a CSE student learning ML: ${topic}`);
    out.innerHTML = html;
  } catch (e) {
    if (e.message === 'NO_KEY') {
      out.innerHTML = noKeyMsg();
    } else {
      out.innerHTML = `<span class="error-msg">⚠️ Could not load explanation: ${escHtml(e.message)}</span>`;
    }
  }
}

/* ========== MODEL RECOMMENDER ========== */
function toggleChip(chip) { chip.classList.toggle('selected'); }

async function getRecommendation() {
  const selected = Array.from(document.querySelectorAll('.rec-chip.selected')).map(c => c.textContent.trim());
  const context = document.getElementById('recContext').value.trim();
  const btn = document.getElementById('recBtn');
  const out = document.getElementById('recOutput');
  if (selected.length === 0 && !context) {
    out.innerHTML = '<div class="error-msg">Please select at least one option or describe your use case.</div>';
    return;
  }
  btn.disabled = true;
  btn.textContent = '🔍 Analyzing...';
  out.innerHTML = `<div style="display:flex;align-items:center;gap:0.8rem;color:var(--muted);font-size:0.85rem;padding:2rem"><div class="spinner"></div> Analyzing your requirements and finding best models...</div>`;
  try {
    const prompt = `User requirements: ${selected.join(', ')}.${context ? ' Additional context: ' + context : ''}

Recommend exactly 3 ML models/algorithms tailored to these requirements.
Respond with ONLY valid JSON — no markdown, no backticks, no explanation text:
{
  "recommendations": [
    {
      "name": "Model/Algorithm Name",
      "match_score": "95%",
      "description": "2-3 clear sentences explaining why this fits the requirements perfectly",
      "pros": ["specific advantage 1", "specific advantage 2", "specific advantage 3"],
      "cons": ["main limitation"],
      "library": "e.g. PyTorch / scikit-learn / HuggingFace Transformers / XGBoost",
      "starter_code": "e.g. from sklearn.ensemble import RandomForestClassifier"
    }
  ]
}`;

    const raw = await callClaude(
      'You are an expert ML engineer helping developers choose the right model. Respond ONLY with valid JSON. No markdown. No backticks. No text before or after the JSON.',
      prompt
    );
    let data;
    try {
      const cleaned = raw.replace(/```json|```/g, '').trim();
      data = JSON.parse(cleaned);
    } catch {
      throw new Error('Could not parse AI response. Please try again.');
    }
    const colors = ['var(--accent)', 'var(--accent3)', 'var(--accent2)'];
    out.innerHTML = data.recommendations.map((r, i) => `
      <div class="rec-card">
        <div class="rec-card-header">
          <div class="rec-model-name">${i + 1}. ${escHtml(r.name)}</div>
          <div class="rec-score" style="border-color:${colors[i]};color:${colors[i]}">${escHtml(r.match_score)} match</div>
        </div>
        <div class="rec-desc">${escHtml(r.description)}</div>
        <div class="rec-lib">📦 ${escHtml(r.library)}</div>
        ${r.starter_code ? `<div style="font-family:'JetBrains Mono',monospace;font-size:0.72rem;background:rgba(0,0,0,0.3);padding:0.4rem 0.7rem;color:var(--accent);margin-bottom:0.6rem;border-left:2px solid var(--accent)">${escHtml(r.starter_code)}</div>` : ''}
        <div class="rec-pros">${r.pros.map(p => `<span class="rec-pro">✓ ${escHtml(p)}</span>`).join('')}</div>
        ${r.cons ? `<div style="margin-top:0.5rem;font-family:'JetBrains Mono',monospace;font-size:0.68rem;color:#f87171">⚠ ${escHtml(r.cons[0])}</div>` : ''}
      </div>
    `).join('');
  } catch (e) {
    if (e.message === 'NO_KEY') {
      out.innerHTML = noKeyMsg();
    } else {
      out.innerHTML = `<div class="error-msg">⚠️ ${escHtml(e.message)}</div>`;
    }
  }
  btn.disabled = false;
  btn.textContent = '🔍 Get AI Recommendations';
}

/* ========== UTILITIES ========== */
function escHtml(t) {
  if (typeof t !== 'string') return String(t || '');
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ========== INIT ========== */
document.addEventListener('DOMContentLoaded', () => {
  // API key status
  if (ANTHROPIC_KEY) updateApiStatus(true);

  // Show modal on first visit if no key
  if (!ANTHROPIC_KEY) {
    document.getElementById('apiModal').classList.remove('hidden');
  } else {
    document.getElementById('apiModal').classList.add('hidden');
  }

  // Render projects
  renderProjects();

  // Render quick questions
  renderQuickQuestions();

  // Close modal on overlay click
  document.getElementById('apiModal').addEventListener('click', e => {
    if (e.target === document.getElementById('apiModal')) closeModal();
  });

  // Escape closes modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
});
