let userProfile = {};

// ═══════════════════════════════════════
// THEME TOGGLE
// ═══════════════════════════════════════
const THEME_KEY = "devtrack_theme";
const themeToggle = document.getElementById("themeToggle");

function applyTheme(theme) {
    const t = theme === "dark" ? "dark" : "light";
    document.body.setAttribute("data-theme", t);
    if (themeToggle) {
        themeToggle.innerText = t === "dark" ? "☀️ Light" : "🌙 Dark";
        themeToggle.setAttribute("aria-label", t === "dark" ? "Switch to light mode" : "Switch to dark mode");
    }
}

function getInitialTheme() {
    try {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved === "light" || saved === "dark") return saved;
    } catch (e) {}
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function initTheme() {
    applyTheme(getInitialTheme());
    if (!themeToggle) return;
    themeToggle.addEventListener("click", () => {
        const next = document.body.getAttribute("data-theme") === "dark" ? "light" : "dark";
        applyTheme(next);
        try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    });
}

initTheme();

// ═══════════════════════════════════════
// TAB SWITCHING
// ═══════════════════════════════════════
function switchTab(tab) {
    const isGithub = tab === "github";
    document.getElementById("githubTab").style.display = isGithub ? "block" : "none";
    document.getElementById("manualTab").style.display  = isGithub ? "none"  : "block";
    document.getElementById("tabGithub").classList.toggle("active", isGithub);
    document.getElementById("tabManual").classList.toggle("active", !isGithub);
}

// Enter key on GitHub input
document.getElementById("github").addEventListener("keydown", e => {
    if (e.key === "Enter") githubAnalyze();
});

// ═══════════════════════════════════════
// SCORE HISTORY  (localStorage)
// ═══════════════════════════════════════
const HISTORY_KEY = "devtrack_history";

function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
    catch (e) { return []; }
}

function saveToHistory(profile) {
    let history = loadHistory();
    history.unshift({
        score: profile.score,
        level: profile.level,
        languages: profile.languages,
        username: profile.username || null,
        date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    });
    history = history.slice(0, 10); // keep last 10
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch (e) {}
}

function renderHistory() {
    const history = loadHistory();
    const section = document.getElementById("historySection");
    const content = document.getElementById("historyContent");

    if (history.length === 0) {
        section.style.display = "none";
        return;
    }

    section.style.display = "block";

    content.innerHTML = `<div class="history-list">` +
        history.map(h => `
            <div class="history-item">
                <div class="history-score">${h.score}</div>
                <div class="history-info">
                    <div class="history-level">${h.level}${h.username ? ` · @${h.username}` : ""}</div>
                    <div class="history-meta">${h.languages?.slice(0, 3).join(", ") || "Manual entry"} · ${h.date} ${h.time}</div>
                    <div class="history-bar-bg">
                        <div class="history-bar-fill" style="width:${h.score}%"></div>
                    </div>
                </div>
            </div>
        `).join("") +
    `</div>`;
}

function clearHistory() {
    if (!confirm("Clear all score history?")) return;
    try { localStorage.removeItem(HISTORY_KEY); } catch (e) {}
    renderHistory();
    showToast("History cleared");
}

// ═══════════════════════════════════════
// TOAST NOTIFICATION
// ═══════════════════════════════════════
let toastTimer;
function showToast(msg) {
    let toast = document.getElementById("toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast";
        toast.className = "toast";
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2500);
}

// ═══════════════════════════════════════
// COPY RESULT
// ═══════════════════════════════════════
function copyResult() {
    if (!userProfile.score) return;
    const langs = userProfile.languages?.join(", ") || "N/A";
    const text =
`DevTrack AI — Developer Report
================================
Score   : ${userProfile.score} / 100
Level   : ${userProfile.level}
${userProfile.username ? `GitHub  : @${userProfile.username}\n` : ""}Languages: ${langs}
DSA     : ${userProfile.dsa || "N/A"}
================================
Generated by DevTrack AI`;
    navigator.clipboard.writeText(text)
        .then(() => showToast("✅ Result copied!"))
        .catch(() => showToast("❌ Copy failed"));
}

// ═══════════════════════════════════════
// SCORE COUNTER ANIMATION
// ═══════════════════════════════════════
function animateScore(el, target) {
    let start = 0;
    const duration = 900;
    const step = timestamp => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(eased * target);
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = target;
    };
    requestAnimationFrame(step);
}

// ═══════════════════════════════════════
// LANGUAGE COLORS
// ═══════════════════════════════════════
const LANG_COLORS = {
    JavaScript: "#f7df1e", Python: "#3572a5", Java: "#b07219",
    TypeScript: "#3178c6", "C++": "#f34b7d", C: "#555555",
    Rust: "#dea584", Go: "#00add8", Ruby: "#701516",
    Swift: "#f05138", Kotlin: "#a97bff", PHP: "#4f5d95",
    HTML: "#e34c26", CSS: "#563d7c", Dart: "#00b4ab",
};

function getLangColor(lang) {
    return LANG_COLORS[lang] || "#8b5cf6";
}

// ═══════════════════════════════════════
// LANGUAGE BREAKDOWN BARS
// ═══════════════════════════════════════
function buildLangBars(languages) {
    if (!languages || languages.length === 0) return "";
    const topLangs = languages.slice(0, 6);
    const total = topLangs.length;

    return `
        <div class="section-title">Languages</div>
        <div class="lang-bars">
            ${topLangs.map((lang, i) => {
                const pct = Math.round(((total - i) / ((total * (total + 1)) / 2)) * 100);
                return `
                <div class="lang-bar-row">
                    <div class="lang-name">${lang}</div>
                    <div class="lang-bar-bg">
                        <div class="lang-bar-fill" style="width:${pct}%; background:${getLangColor(lang)}"></div>
                    </div>
                    <div class="lang-pct">${pct}%</div>
                </div>`;
            }).join("")}
        </div>
    `;
}

// ═══════════════════════════════════════
// TOP REPOS
// ═══════════════════════════════════════
function buildTopRepos(repos, username) {
    if (!repos || repos.length === 0) return "";
    const top = [...repos]
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, 3);

    return `
        <div class="section-title">Top Repos ⭐</div>
        <div class="repo-list">
            ${top.map(r => `
                <a class="repo-item" href="https://github.com/${username}/${r.name}" target="_blank" rel="noopener">
                    <div>
                        <div class="repo-name">${r.name}</div>
                        <div class="repo-meta">${r.language || "No language"} · ${r.description ? r.description.slice(0, 50) + (r.description.length > 50 ? "…" : "") : "No description"}</div>
                    </div>
                    <div class="repo-stars">⭐ ${r.stargazers_count}</div>
                </a>
            `).join("")}
        </div>
    `;
}

// ═══════════════════════════════════════
// LEVEL HELPERS
// ═══════════════════════════════════════
function getLevelClass(level) {
    if (level === "Advanced") return "advanced";
    if (level === "Intermediate") return "intermediate";
    return "beginner";
}

function getLevelEmoji(level) {
    if (level === "Advanced") return "🚀";
    if (level === "Intermediate") return "📈";
    return "🌱";
}

// ═══════════════════════════════════════
// SHOW RESULT
// ═══════════════════════════════════════
function showResult(repos = null) {
    document.getElementById("resultSection").style.display = "block";
    document.getElementById("aiSection").style.display = "block";

    const levelClass = getLevelClass(userProfile.level);

    let ghUserHTML = "";
    if (userProfile.username) {
        ghUserHTML = `
            <div class="gh-user">
                <img src="https://github.com/${userProfile.username}.png" alt="avatar"
                     onerror="this.style.display='none'">
                <div>
                    <div class="gh-name">@${userProfile.username}</div>
                    <div class="gh-sub">GitHub Profile · Live Data</div>
                </div>
            </div>
        `;
    }

    let scoreBreakdownHTML = "";
    if (userProfile.projectScore !== undefined) {
        scoreBreakdownHTML = `
            <div class="section-title">Score Breakdown</div>
            <div class="score-items">
                <div class="score-item">
                    <div class="score-item-label">Projects</div>
                    <div class="score-item-value">${userProfile.projectScore}<span class="score-item-max">/30</span></div>
                </div>
                <div class="score-item">
                    <div class="score-item-label">Languages</div>
                    <div class="score-item-value">${userProfile.languageScore}<span class="score-item-max">/20</span></div>
                </div>
                <div class="score-item">
                    <div class="score-item-label">Stars</div>
                    <div class="score-item-value">${userProfile.starScore}<span class="score-item-max">/25</span></div>
                </div>
                <div class="score-item">
                    <div class="score-item-label">Activity</div>
                    <div class="score-item-value">${userProfile.activityScore}<span class="score-item-max">/25</span></div>
                </div>
            </div>
        `;
    }

    const topReposHTML = buildTopRepos(repos, userProfile.username);
    const langBarsHTML = buildLangBars(userProfile.languages);

    document.getElementById("result").innerHTML = `
        ${ghUserHTML}

        <div class="score-display">
            <div class="score-number" id="scoreNum">0</div>
            <div class="score-bar-wrap">
                <div class="score-bar-label">Score / 100</div>
                <div class="score-bar-bg">
                    <div class="score-bar-fill ${levelClass}" id="scoreBar" style="width:0%"></div>
                </div>
            </div>
        </div>

        <div class="level-badge ${levelClass}">
            ${getLevelEmoji(userProfile.level)} ${userProfile.level}
        </div>

        ${scoreBreakdownHTML}
        ${langBarsHTML}
        ${topReposHTML}

        <div class="section-title">Suggestions</div>
        <ul class="result-list">
            ${generateSuggestions().map(s => `<li>${s}</li>`).join("")}
        </ul>
    `;

    // Animate score bar + counter
    requestAnimationFrame(() => {
        const bar = document.getElementById("scoreBar");
        const num = document.getElementById("scoreNum");
        if (bar) bar.style.width = userProfile.score + "%";
        if (num) animateScore(num, userProfile.score);
    });

    // Save to history
    saveToHistory(userProfile);
    renderHistory();
}

// ═══════════════════════════════════════
// MANUAL ANALYZE
// ═══════════════════════════════════════
function manualAnalyze() {
    const projects = Number(document.getElementById("projects").value) || 0;
    const dsa = document.getElementById("dsa").value;
    const languages = document.getElementById("languages").value
        .split(",").map(l => l.trim()).filter(l => l !== "");

    let score = 0;
    score += Math.min(projects * 10, 30);
    if (dsa === "high") score += 30;
    else if (dsa === "medium") score += 20;
    score += Math.min(languages.length * 5, 20);
    score = Math.min(score, 100);

    const level = score > 70 ? "Advanced" : score > 40 ? "Intermediate" : "Beginner";

    userProfile = { projects, dsa, languages, score, level };
    showResult();
}

// ═══════════════════════════════════════
// GITHUB ANALYZE
// ═══════════════════════════════════════
async function githubAnalyze() {
    const username = document.getElementById("github").value.trim();
    if (!username) { showToast("⚠️ Please enter a GitHub username"); return; }

    document.getElementById("resultSection").style.display = "block";
    document.getElementById("aiSection").style.display = "none";
    document.getElementById("result").innerHTML = `
        <div class="spinner-wrap">
            <div class="spinner"></div>
            <span>Fetching GitHub data for @${username}…</span>
        </div>
    `;

    try {
        const response = await fetch(
            `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`,
            { headers: { "Accept": "application/vnd.github+json" } }
        );

        if (!response.ok) {
            document.getElementById("result").innerHTML =
                "❌ User not found or GitHub API rate limit reached. Try again in a minute.";
            return;
        }

        const repos = await response.json();
        const projects = repos.length;

        // Languages
        const langCount = {};
        for (const repo of repos) {
            if (repo.language) langCount[repo.language] = (langCount[repo.language] || 0) + 1;
        }
        const languages = Object.entries(langCount)
            .sort((a, b) => b[1] - a[1])
            .map(([lang]) => lang);

        // Scoring
        const projectScore  = Math.min(projects * 5, 30);
        const languageScore = Math.min(languages.length * 5, 20);
        const totalStars    = repos.reduce((sum, r) => sum + r.stargazers_count, 0);
        const starScore     = Math.min(totalStars, 25);
        const recentRepos   = repos.filter(r => {
            const diffDays = (new Date() - new Date(r.updated_at)) / (1000 * 60 * 60 * 24);
            return diffDays < 90;
        });
        const activityScore = Math.min(recentRepos.length * 5, 25);

        // DSA estimate
        let dsa = "low";
        if (projectScore > 20 && activityScore > 10) dsa = "medium";
        if (starScore > 15 && activityScore > 15)    dsa = "high";

        const score = projectScore + languageScore + starScore + activityScore;
        const level = score > 70 ? "Advanced" : score > 40 ? "Intermediate" : "Beginner";

        userProfile = {
            username, projects, dsa, languages, score, level,
            projectScore, languageScore, starScore, activityScore
        };

        showResult(repos);
        document.getElementById("aiSection").style.display = "block";

    } catch (err) {
        document.getElementById("result").innerHTML = "❌ Network error. Check your connection.";
    }
}


// ═══════════════════════════════════════
// AI INSIGHTS — STREAMING (FIXED)
// ═══════════════════════════════════════
async function getAIInsights() {
    const btn = document.getElementById("aiBtn");
    const aiResult = document.getElementById("aiResult");

    btn.disabled = true;
    btn.innerText = "🧠 Analyzing like a senior engineer...";

    aiResult.innerHTML = `
        <div class="spinner-wrap">
            <div class="spinner"></div>
            <span>Connecting to gemma2:9b…</span>
        </div>
    `;

    const langList = userProfile.languages?.join(", ") || "Not specified";

    const prompt = `You are a strict software engineering mentor.

IMPORTANT RULES:
- Do NOT use markdown symbols like ** or ##
- Use clean plain text
- Be specific, not generic

Analyze this developer:

Projects: ${userProfile.projects}
DSA Level: ${userProfile.dsa}
Languages: ${langList}
Score: ${userProfile.score}/100
Level: ${userProfile.level}

FORMAT:

Strengths:
- point
- point
- point

Weaknesses:
- issue
- issue
- issue

Next Steps:
- action
- action
- action`;

    try {
        const response = await fetch("http://localhost:11434/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "gemma2:9b",
                messages: [{ role: "user", content: prompt }],
                stream: false
            })
        });

        if (!response.ok) throw new Error(`Ollama error: ${response.status}`);

        aiResult.innerHTML = `<span class="cursor-blink"></span>`;

        let fullText = "";
        let seenText = "";

        const reader  = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const lines = decoder.decode(value).split("\n").filter(l => l.trim());

            for (const line of lines) {
                try {
                    const parsed = JSON.parse(line);

                    if (parsed.message?.content) {
                        const chunk = parsed.message.content;

                        // Prevent duplicate chunks
                        if (!seenText.includes(chunk)) {
                            fullText += chunk;
                            seenText += chunk;

                            aiResult.innerHTML =
                                fullText.replace(/\n/g, "<br>") +
                                `<span class="cursor-blink"></span>`;
                        }
                    }
                } catch (e) {}
            }
        }

        aiResult.innerHTML = formatAI(fullText);

    } catch (err) {
        aiResult.innerHTML = `⚠️ Ollama connection failed.<br>
            <small style="color:var(--text-dim)">
                Run: <code>OLLAMA_ORIGINS=* ollama serve</code>
            </small>`;
    }

    btn.disabled = false;
    btn.innerText = "🤖 Generate AI Insights";
}

function formatAI(text) {
    return text
        // Force proper sections
        .replace(/Strengths:/i, "<h3>💪 Strengths</h3>")
        .replace(/Weaknesses:/i, "<h3>⚠️ Weaknesses</h3>")
        .replace(/Next Steps:/i, "<h3>🚀 Next Steps</h3>")

        // Force bullets (even if spacing is broken)
        .replace(/•/g, "<br>•")
        .replace(/-\s*/g, "<br>• ")

        // Fix long sentences merging
        .replace(/([a-z])([A-Z])/g, "$1<br>$2")

        // Clean spacing
        .replace(/<br><br><br>/g, "<br><br>");
}
// ═══════════════════════════════════════
// SUGGESTIONS
// ═══════════════════════════════════════
function generateSuggestions() {
    const suggestions = [];

    if (userProfile.projects < 3)
        suggestions.push("Build at least 3 real-world projects to strengthen your portfolio");

    if (userProfile.dsa === "low")
        suggestions.push("Practice DSA consistently — start with arrays and strings on LeetCode");

    if (userProfile.languages?.length < 2)
        suggestions.push("Learn one more language to broaden your skill set");

    if (userProfile.starScore !== undefined && userProfile.starScore < 5)
        suggestions.push("Write proper READMEs for your repos to improve visibility");

    if (userProfile.activityScore !== undefined && userProfile.activityScore < 10)
        suggestions.push("Commit regularly — even small updates show consistency to recruiters");

    if (userProfile.score >= 70)
        suggestions.push("Explore system design and contribute to open source projects");

    if (suggestions.length === 0)
        suggestions.push("Great foundation! Explore advanced topics and open source contributions");

    return suggestions;
}

// Initial history render on page load
renderHistory();

// ═══════════════════════════════════════
// CAREER PATH GENERATOR
// ═══════════════════════════════════════
function generatePath() {
    const goal = document.getElementById("careerGoal").value;
    const output = document.getElementById("careerResult");

    if (!goal) {
        showToast("⚠️ Select a career path");
        return;
    }

    let roadmap = [];

    if (goal === "web") {
        roadmap = [
            "Master HTML, CSS, JavaScript",
            "Learn React or Next.js",
            "Build 3+ frontend projects",
            "Learn backend basics (Node.js)",
            "Deploy projects (Vercel / Netlify)"
        ];
    }

    if (goal === "ai") {
        roadmap = [
            "Strong Python fundamentals",
            "Learn NumPy, Pandas",
            "Study Machine Learning basics",
            "Build ML projects",
            "Explore LLMs and AI tools"
        ];
    }

    if (goal === "backend") {
        roadmap = [
            "Master Java or Node.js",
            "Learn SQL + NoSQL databases",
            "Build REST APIs",
            "Learn authentication (JWT)",
            "Study system design basics"
        ];
    }

    // Simple personalization
    if (userProfile.score && userProfile.score < 40) {
        roadmap.unshift("⚠️ Improve your fundamentals first");
    }

    output.innerHTML = `
        <div class="section-title">Your Roadmap</div>
        <ul class="result-list">
            ${roadmap.map(step => `<li>${step}</li>`).join("")}
        </ul>
    `;
}
