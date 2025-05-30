import React, { useEffect, useState } from 'react';
import './App.css';

// PUBLIC_INTERFACE
function getInitialTheme() {
  const saved = localStorage.getItem('tm-theme');
  if (saved) return saved;
  // System preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return "dark";
  }
  return "light";
}

// Dummy text bank for typing test (could be expanded)
const TEST_TEXTS = [
  "The quick brown fox jumps over the lazy dog.",
  "Practice makes perfect. Keep trying your best!",
  "React is a popular JavaScript library for building user interfaces.",
  "Typing fast is a valuable skill in the digital world.",
  "Consistency is the key to mastering any skill.",
  "JavaScript enables interactive web experiences.",
  "Every great journey begins with a single step.",
  "A stitch in time saves nine. Stay ahead of your work!"
];

function pickRandomText() {
  return TEST_TEXTS[Math.floor(Math.random() * TEST_TEXTS.length)];
}

// --- Storage helpers ---
function getUserFromStorage() {
  try {
    return JSON.parse(localStorage.getItem('tm-user')) || null;
  } catch {
    return null;
  }
}
function setUserToStorage(user) {
  localStorage.setItem('tm-user', JSON.stringify(user));
}
// User's personal test history (array of test objects)
function getUserHistory(username) {
  try {
    return JSON.parse(localStorage.getItem('tm-history-' + username)) || [];
  } catch {
    return [];
  }
}
function saveUserHistory(username, history) {
  localStorage.setItem('tm-history-' + username, JSON.stringify(history));
}
// Global leaderboard: Array of scores { username, wpm, accuracy, date, timeframe }
function getLeaderboard() {
  try {
    return JSON.parse(localStorage.getItem('tm-leaderboard')) || [];
  } catch {
    return [];
  }
}
function saveLeaderboard(lb) {
  localStorage.setItem('tm-leaderboard', JSON.stringify(lb));
}

// Date/time helpers
function getTimeframeKey(date) {
  const now = new Date(date);
  const today = (new Date()).toLocaleDateString();
  const isToday = now.toLocaleDateString() === today;
  let firstDayOfWeek = new Date();
  // Set first day to previous Sunday
  firstDayOfWeek.setDate(firstDayOfWeek.getDate() - firstDayOfWeek.getDay());
  const weekStart = firstDayOfWeek.toLocaleDateString();
  const isThisWeek = now >= firstDayOfWeek;
  if (isToday) return 'today';
  if (isThisWeek) return 'week';
  return 'all';
}

// PUBLIC_INTERFACE
function App() {
  const [theme, setTheme] = useState(getInitialTheme());
  const [user, setUser] = useState(getUserFromStorage());
  const [page, setPage] = useState('home'); // home | test | leaderboard | profile | login | signup
  const [typingPrompt, setTypingPrompt] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [showMobileNav, setShowMobileNav] = useState(false);

  // Theme application
  useEffect(() => {
    document.body.classList.remove('tm-dark', 'tm-light');
    document.body.classList.add('tm-' + theme);
    localStorage.setItem('tm-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (page === 'test') setTypingPrompt(pickRandomText());
  }, [page]);

  // --- Authentication Handlers ---
  // PUBLIC_INTERFACE
  function handleLogin({ username, password }) {
    let existing = JSON.parse(localStorage.getItem("tm-users") || '{}');
    if (!existing[username] || existing[username].password !== password) {
      alert("Incorrect username or password.");
      return false;
    }
    const newUser = { username, totalTests: getUserHistory(username).length };
    setUserToStorage(newUser);
    setUser(newUser);
    setPage('home');
    return true;
  }

  // PUBLIC_INTERFACE
  function handleSignup({ username, password }) {
    let existing = JSON.parse(localStorage.getItem("tm-users") || '{}');
    if (existing[username]) {
      alert("Username already exists.");
      return false;
    }
    existing[username] = { password };
    localStorage.setItem("tm-users", JSON.stringify(existing));
    const newUser = { username, totalTests: 0 };
    setUserToStorage(newUser);
    setUser(newUser);
    setPage('home');
    return true;
  }

  // PUBLIC_INTERFACE
  function handleLogout() {
    setUser(null);
    localStorage.removeItem('tm-user');
    setPage('login');
  }

  function handleStartTest() {
    setTypingPrompt(pickRandomText());
    setTestResult(null);
    setPage('test');
  }

  // PUBLIC_INTERFACE
  function handleScoreSubmission(stats) {
    // stats: { wpm, accuracy, charsTyped, errors, timeTaken, prompt, date }
    if (!user) return;
    // Append to user's history
    const history = getUserHistory(user.username);
    const newTest = {
      wpm: stats.wpm, accuracy: stats.accuracy, timeTaken: stats.timeTaken,
      prompt: stats.prompt, date: stats.date, errors: stats.errors, charsTyped: stats.charsTyped
    };
    history.push(newTest);
    saveUserHistory(user.username, history);

    // Update leaderboard (top N overall tests per user)
    let lb = getLeaderboard();
    lb.push({
      username: user.username,
      wpm: stats.wpm,
      accuracy: stats.accuracy,
      date: stats.date,
      timeframe: getTimeframeKey(stats.date)
    });
    saveLeaderboard(lb);

    setTestResult(newTest);
    setUser({ ...user, totalTests: history.length });
    setUserToStorage({ ...user, totalTests: history.length });
    setPage('result');
  }

  function handleNav(to) {
    setPage(to);
    setShowMobileNav(false);
  }

  // For accessibility/dark theme
  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  // Render
  return (
    <div className={`app tm-${theme}`}>
      <Navbar
        user={user}
        onLogout={handleLogout}
        onNav={handleNav}
        page={page}
        toggleTheme={toggleTheme}
        theme={theme}
        showMobileNav={showMobileNav}
        setShowMobileNav={setShowMobileNav}
      />
      <main className="tm-main">
        <div className="container">
          {page === 'home' && (
            <Home
              user={user}
              onStartTest={handleStartTest}
              onNav={handleNav}
            />
          )}
          {page === 'login' && (
            <AuthForm
              mode="login"
              onAuth={handleLogin}
              onSwitch={() => setPage('signup')}
            />
          )}
          {page === 'signup' && (
            <AuthForm
              mode="signup"
              onAuth={handleSignup}
              onSwitch={() => setPage('login')}
            />
          )}
          {page === 'test' && (
            <TypingTest
              prompt={typingPrompt}
              onSubmit={handleScoreSubmission}
              onCancel={() => setPage('home')}
              user={user}
            />
          )}
          {page === 'result' && (
            <TestResult
              result={testResult}
              onNav={handleNav}
            />
          )}
          {page === 'leaderboard' && (
            <Leaderboard
              leaderboard={getLeaderboard()}
            />
          )}
          {page === 'profile' && (
            <Profile
              user={user}
              userHistory={user ? getUserHistory(user.username) : []}
              onClearHistory={() => {
                if (window.confirm("Delete all your typing test history?")) {
                  saveUserHistory(user.username, []);
                  setUser({ ...user, totalTests: 0 });
                  setUserToStorage({ ...user, totalTests: 0 });
                  setPage('profile'); // Refresh
                }
              }}
              onNav={handleNav}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// -------------------- COMPONENTS -------------------------

// Navbar/Header
function Navbar({ user, onLogout, onNav, page, toggleTheme, theme, showMobileNav, setShowMobileNav }) {
  return (
    <nav className="navbar">
      <div className="container" style={{ width: "100%" }}>
        <div className="navbar-content" style={{
          display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div className="logo" style={{ cursor: 'pointer' }} onClick={() => onNav('home')}>
            <span className="logo-symbol" style={{ color: 'var(--kavia-orange)', fontWeight: 700 }}>*</span> TypeMaster
          </div>
          {/* Mobile Nav Toggle */}
          <div className="mobile-nav-toggle" style={{
            display: 'none', cursor: 'pointer', fontSize: '1.7rem', marginLeft: '16px'
          }}
            onClick={() => setShowMobileNav(!showMobileNav)}
          >☰</div>
          <div className="nav-links" style={{
            display: 'flex', alignItems: 'center', gap: '16px'
          }}>
            <button
              className={"btn" + (page === 'home' ? " btn-active" : "")}
              onClick={() => onNav('home')}
            >Home</button>
            <button
              className={"btn" + (page === 'leaderboard' ? " btn-active" : "")}
              onClick={() => onNav('leaderboard')}
            >Leaderboard</button>
            {user && (
              <button
                className={"btn" + (page === 'profile' ? " btn-active" : "")}
                onClick={() => onNav('profile')}
              >Profile</button>
            )}
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            {user ? (
              <div className="user-info" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--kavia-orange)', fontWeight: 600 }}>
                  {user.username}
                </span>
                <small style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                  ({user.totalTests} tests)
                </small>
                <button className="btn" style={{ fontSize: "0.95rem", padding: "6px 14px" }} onClick={onLogout}>Logout</button>
              </div>
            ) : (
              <button className="btn" onClick={() => onNav('login')}>Log in</button>
            )}
          </div>
        </div>
        {/* Responsive: hamburger mobile menu */}
        <div
          className="tm-mobile-nav"
          style={{
            display: showMobileNav ? 'flex' : 'none',
            flexDirection: 'column',
            position: 'absolute',
            top: 64,
            left: 0,
            right: 0,
            background: 'var(--kavia-dark)',
            padding: '16px',
            gap: '12px',
            zIndex: 200,
            borderBottom: "2px solid var(--kavia-orange)"
          }}>
          <button className="btn" onClick={() => onNav('home')}>Home</button>
          <button className="btn" onClick={() => onNav('leaderboard')}>Leaderboard</button>
          {user && <button className="btn" onClick={() => onNav('profile')}>Profile</button>}
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          {user ?
            <button className="btn" onClick={onLogout}>Logout</button> :
            <button className="btn" onClick={() => onNav('login')}>Log in</button>
          }
        </div>
      </div>
    </nav>
  );
}

// Theme toggle button
function ThemeToggle({ theme, toggleTheme }) {
  return (
    <button className="btn" style={{ padding: "6px 10px", fontSize: "1.05rem" }}
      title="Toggle light/dark mode"
      onClick={toggleTheme}>
      {theme === 'dark' ? '🌙' : '🌞'}
    </button>
  );
}

// -------- Home Page --------
function Home({ user, onStartTest, onNav }) {
  return (
    <div className="hero" style={{ paddingTop: "110px" }}>
      <div className="subtitle" style={{ color: "var(--kavia-orange)" }}>
        Welcome to TypeMaster
      </div>
      <h1 className="title">Accurate. Fast. Fun Typing.</h1>
      <div className="description">
        Test your typing speed and accuracy! Take challenges, track your stats, and compete on the leaderboard.
      </div>
      {user ? (
        <button className="btn btn-large" onClick={onStartTest}>Start Typing Test</button>
      ) : (
        <div>
          <button className="btn btn-large" onClick={() => onNav('signup')}>Sign Up</button>
          <div style={{ height: 16 }} />
          <button className="btn" onClick={() => onNav('login')}>Log In</button>
        </div>
      )}
    </div>
  );
}

// -------- Auth Form (Login / Signup) --------
function AuthForm({ mode, onAuth, onSwitch }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  return (
    <div className="tm-authform" style={{
      maxWidth: 420, margin: '110px auto', padding: 32, borderRadius: 6,
      background: 'var(--kavia-dark)', boxShadow: "0 1px 16px 0 rgba(0,0,0,0.14)"
    }}>
      <h2 className="title" style={{ fontSize: '2rem', marginBottom: 12 }}>
        {mode === 'login' ? 'Log in' : 'Sign up'}
      </h2>
      <form onSubmit={e => {
        e.preventDefault();
        if (/^[a-zA-Z0-9_]{3,20}$/.test(username) && password.length >= 4) {
          onAuth({ username, password });
        } else {
          alert("Username: 3-20 chars (alphanumeric/_), Password: 4+ chars.");
        }
      }}>
        <input
          className="tm-input"
          style={inputStyle}
          placeholder="Username"
          autoFocus
          maxLength={20}
          required
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
        <input
          className="tm-input"
          style={inputStyle}
          placeholder="Password"
          type="password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <button className="btn btn-large" type="submit" style={{ width: "100%", marginTop: 14 }}>
          {mode === "login" ? "Log In" : "Sign Up"}
        </button>
      </form>
      <div style={{ marginTop: 18, textAlign: 'center' }}>
        {mode === "login" ?
          <>Don't have an account? <a style={{ color: "var(--kavia-orange)", cursor: "pointer" }} onClick={onSwitch}>Sign Up</a></> :
          <>Already have an account? <a style={{ color: "var(--kavia-orange)", cursor: "pointer" }} onClick={onSwitch}>Log In</a></>
        }
      </div>
    </div>
  );
}

const inputStyle = {
  display: "block",
  width: "100%",
  padding: "10px 12px",
  fontSize: "1rem",
  margin: "12px 0",
  borderRadius: 4,
  border: "1px solid var(--border-color)",
  background: "var(--kavia-dark)",
  color: "var(--text-color)"
};

// -------- Typing Test Page--------
function TypingTest({ prompt, onSubmit, onCancel, user }) {
  const [userInput, setUserInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(30); // 30s typing test
  const [started, setStarted] = useState(false);
  const [errors, setErrors] = useState(0);
  const [timerId, setTimerId] = useState(null);

  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);

  useEffect(() => {
    if (started && timeLeft > 0) {
      const id = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      setTimerId(id);
    }
    if (timeLeft === 0 && started) {
      setStarted(false);
      if (onSubmit) handleSubmit();
    }
    return () => {
      if (timerId) clearTimeout(timerId);
    };
    // eslint-disable-next-line
  }, [started, timeLeft]);

  useEffect(() => {
    if (userInput.length === 1 && !started) {
      setStarted(true);
    }
    const correct = countCorrectChars(prompt, userInput);
    setErrors(userInput.length - correct);
    setWpm(calcWpm(userInput, 30 - timeLeft)); // real-time WPM
    setAccuracy(calcAccuracy(prompt, userInput));
    // eslint-disable-next-line
  }, [userInput, timeLeft]);

  function countCorrectChars(a, b) {
    let correct = 0;
    for (let i = 0; i < Math.min(a.length, b.length); ++i) {
      if (a[i] === b[i]) correct++;
    }
    return correct;
  }

  function calcWpm(typedChars, seconds) {
    if (seconds <= 0) return 0;
    // 1 word = 5 chars, WPM = words per minute
    return Math.round((typedChars.length / 5) / (seconds / 60));
  }

  function calcAccuracy(p, inp) {
    if (!inp.length) return 100;
    const correct = countCorrectChars(p, inp);
    return Math.max(0, Math.round((correct / inp.length) * 100));
  }

  function handleSubmit() {
    if (!user) return;
    const finalWpm = calcWpm(userInput, 30 - timeLeft);
    const finalAccuracy = calcAccuracy(prompt, userInput);
    onSubmit({
      wpm: finalWpm,
      accuracy: finalAccuracy,
      charsTyped: userInput.length,
      errors: errors,
      timeTaken: 30 - timeLeft,
      prompt,
      date: new Date().toISOString()
    });
  }

  function handleRestart() {
    setUserInput('');
    setTimeLeft(30);
    setStarted(false);
    setErrors(0);
    setWpm(0);
    setAccuracy(100);
  }

  // Visual feedback for typing (highlight errors)
  function renderPrompt() {
    let out = [];
    for (let i = 0; i < prompt.length; ++i) {
      let charClass = '';
      if (i < userInput.length) {
        if (prompt[i] === userInput[i]) charClass = 'tm-char-correct';
        else charClass = 'tm-char-error';
      } else if (i === userInput.length) {
        charClass = 'tm-char-current';
      }
      out.push(
        <span
          key={i}
          className={charClass}
          style={{
            background: charClass === 'tm-char-error' ? "#FF5252" :
              charClass === 'tm-char-correct' ? "#43bd41" :
                charClass === 'tm-char-current' ? "rgba(26,180,232,0.22)" : 'transparent',
            color: charClass ? 'white' : 'var(--text-secondary)',
            borderRadius: 3, padding: '1px 3px'
          }}>
          {prompt[i]}
        </span>
      );
    }
    return out;
  }

  return (
    <div style={{
      padding: "110px 0 30px 0",
      display: "flex", flexDirection: "column", alignItems: "center"
    }}>
      <h2 style={{ color: "var(--kavia-orange)" }}>Typing Test</h2>
      <div style={{
        background: "rgba(64,64,64,0.4)", padding: 18, borderRadius: 6, minWidth: 290, maxWidth: 700
      }}>
        <div style={{ fontSize: 18, marginBottom: 18 }}>
          <span style={{ fontWeight: 700 }}>Time Left: </span>
          <span style={{ color: timeLeft <= 5 ? "#ff9800" : undefined, fontWeight: 700 }}>{timeLeft}s</span>
        </div>
        <div className="tm-prompt" style={{ padding: "12px 8px", fontSize: 20, lineHeight: 1.55 }}>
          {renderPrompt()}
        </div>
        <textarea
          className="tm-input"
          style={{
            ...inputStyle,
            marginTop: 15,
            height: 56,
            letterSpacing: "0.04em",
            fontFamily: "monospace",
            fontSize: 18,
            resize: "none"
          }}
          maxLength={prompt.length + 20}
          value={userInput}
          onChange={e => setUserInput(e.target.value)}
          disabled={timeLeft === 0}
          placeholder={started ? "" : "Start typing here..."}
          autoFocus
        />
        <div className="tm-stats"
          style={{
            display: "flex", gap: 26, fontSize: 17,
            margin: '14px 0 0 0', color: "var(--text-secondary)"
          }}>
          <div>
            <strong>WPM:</strong> <span style={{ color: '#43bd41', fontWeight: 700 }}>{wpm}</span>
          </div>
          <div>
            <strong>Accuracy:</strong> <span style={{ color: accuracy > 90 ? "#43bd41" : "#ff9800", fontWeight: 700 }}>{accuracy}%</span>
          </div>
          <div>
            <strong>Errors:</strong> <span style={{ color: errors > 0 ? "#FF5252" : '#43bd41', fontWeight: 700 }}>{errors}</span>
          </div>
        </div>
        <div style={{ margin: '18px 0 0 0', display: 'flex', gap: 12 }}>
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn" style={{ background: '#43bd41' }} onClick={handleRestart}>Restart</button>
          {timeLeft === 0 && (
            <button className="btn btn-large" style={{
              background: 'var(--kavia-orange)'
            }} onClick={handleSubmit}>Finish & Submit</button>
          )}
        </div>
      </div>
    </div>
  );
}

// -------- Test Result ------
function TestResult({ result, onNav }) {
  if (!result) return null;
  return (
    <div style={{
      padding: "110px 0 30px 0",
      display: "flex", flexDirection: "column", alignItems: "center"
    }}>
      <h2 style={{ color: "var(--kavia-orange)" }}>Test Complete!</h2>
      <div style={{
        background: "rgba(64,64,64,0.4)", padding: 18, borderRadius: 6, minWidth: 290, maxWidth: 700
      }}>
        <div style={{ fontSize: 18, marginBottom: 16 }}>
          <b>Your Score:</b>
        </div>
        <div style={{ display: 'flex', gap: 24, fontSize: 17 }}>
          <div><b>WPM:</b> <span style={{ color: '#43bd41' }}>{result.wpm}</span></div>
          <div><b>Accuracy:</b> <span style={{ color: result.accuracy > 89 ? "#43bd41" : "#ff9800" }}>{result.accuracy}%</span></div>
          <div><b>Errors:</b> <span style={{ color: result.errors > 0 ? "#FF5252" : '#43bd41' }}>{result.errors}</span></div>
          <div><b>Time:</b> {result.timeTaken}s</div>
        </div>
        <div style={{ margin: "20px 0 6px 0", color: "var(--text-secondary)", fontSize: 15 }}>
          <b>Prompt:</b> <span>{result.prompt}</span>
        </div>
        <div style={{ margin: "10px 0 10px 0", color: "var(--text-secondary)", fontSize: 13 }}>
          <em>Date:</em> {new Date(result.date).toLocaleString()}
        </div>
        <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
          <button className="btn" onClick={() => onNav('test')}>Try Again</button>
          <button className="btn" onClick={() => onNav('home')}>Home</button>
        </div>
      </div>
    </div>
  );
}

// -------- Leaderboard --------
function Leaderboard({ leaderboard }) {
  // Filters: today, week, all
  const [filter, setFilter] = useState('today');
  // Utility: returns true if entry is within the chosen filter's time range
  function filterByTime(entry, filter) {
    if (filter === 'today') return entry.timeframe === 'today';
    if (filter === 'week') return entry.timeframe === 'today' || entry.timeframe === 'week';
    return true;
  }

  // Step 1: filter by time
  let filtered = leaderboard.filter(entry => filterByTime(entry, filter));

  // Step 2: sort for best performance (WPM DESC, accuracy DESC, date DESC)
  filtered.sort((a, b) => {
    if (b.wpm !== a.wpm) return b.wpm - a.wpm;
    if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
    return new Date(b.date) - new Date(a.date);
  });

  // Step 3: get best entry per user (after sort)
  const seen = new Set();
  const leaderboardPerUser = [];
  for (const entry of filtered) {
    if (!seen.has(entry.username)) {
      leaderboardPerUser.push(entry);
      seen.add(entry.username);
    }
    if (leaderboardPerUser.length >= 10) break;
  }

  return (
    <div style={{ padding: "120px 0 40px 0" }}>
      <h2 className="title" style={{ color: 'var(--kavia-orange)', fontSize: '2.3rem' }}>Leaderboard</h2>
      <div style={{
        display: "flex", gap: 10, margin: "10px 0 25px 0"
      }}>
        <button
          className={"btn" + (filter === 'today' ? ' btn-active' : '')}
          onClick={() => setFilter('today')}>Today</button>
        <button
          className={"btn" + (filter === 'week' ? ' btn-active' : '')}
          onClick={() => setFilter('week')}>This Week</button>
        <button
          className={"btn" + (filter === 'all' ? ' btn-active' : '')}
          onClick={() => setFilter('all')}>All Time</button>
      </div>
      <div style={{
        maxWidth: 650,
        margin: '0 auto',
        borderRadius: 8,
        background: '#181A1B',
        boxShadow: "0 0 14px 0 rgba(0,0,0,0.08)",
        overflow: "hidden"
      }}>
        <table style={{
          width: "100%", borderCollapse: "collapse"
        }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.06)" }}>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Username</th>
              <th style={thStyle}>WPM</th>
              <th style={thStyle}>Accuracy</th>
              <th style={thStyle}>Date</th>
            </tr>
          </thead>
          <tbody>
            {leaderboardPerUser.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: "center", color: 'var(--text-secondary)' }}>No scores yet.</td></tr>
            ) : leaderboardPerUser.map((entry, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 0 ? '#202226' : "rgba(255,255,255,0.007)" }}>
                <td style={tdStyle}>{idx + 1}</td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{entry.username}</td>
                <td style={tdStyle}>{entry.wpm}</td>
                <td style={tdStyle}>{entry.accuracy}%</td>
                <td style={{ ...tdStyle, fontSize: "0.97rem" }}>{(new Date(entry.date)).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 30, color: "var(--text-secondary)", fontSize: 15 }}>
        The leaderboard shows each user's top score (by WPM, accuracy, recency) for the selected timeframe.
      </div>
    </div>
  );
}

const thStyle = {
  padding: "10px 10px", background: "rgba(0,0,0,0.09)", color: "#ff9800", fontSize: 16, fontWeight: 700
};
const tdStyle = {
  padding: "8px 10px", textAlign: "center", fontSize: 15
};

// -------- Profile Page ---------
function Profile({ user, userHistory, onClearHistory, onNav }) {
  if (!user) return null;
  // Stats: average WPM, accuracy over all tests
  let avgWpm = 0, avgAcc = 0;
  if (userHistory.length > 0) {
    avgWpm = Math.round(userHistory.reduce((s, t) => s + (t.wpm || 0), 0) / userHistory.length);
    avgAcc = Math.round(userHistory.reduce((s, t) => s + (t.accuracy || 0), 0) / userHistory.length);
  }

  return (
    <div style={{ padding: "110px 0 35px 0", maxWidth: 750, margin: "0 auto" }}>
      <h2 className="title" style={{ color: "var(--kavia-orange)", fontSize: "2rem" }}>My Profile</h2>
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 28, alignItems: "center", margin: "15px 0 18px 0"
      }}>
        <div><b>Username:</b> <span style={{ color: '#ff9800', fontWeight: 500 }}>{user.username}</span></div>
        <div><b>Tests Taken:</b> {user.totalTests}</div>
        <div><b>Average WPM:</b> {avgWpm}</div>
        <div><b>Average Accuracy:</b> {avgAcc}%</div>
      </div>
      <div style={{ marginTop: 15 }}>
        <button className="btn" style={{ background: "#f94040" }} onClick={onClearHistory}>Clear My Test History</button>
      </div>
      <div style={{ margin: "40px 0 10px 0" }}>
        <h3 className="subtitle" style={{ color: "#ff9800", marginBottom: 10 }}>Test History</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#202226" }}>
                <th style={thStyle}>#</th>
                <th style={thStyle}>WPM</th>
                <th style={thStyle}>Accuracy</th>
                <th style={thStyle}>Errors</th>
                <th style={thStyle}>Time(s)</th>
                <th style={thStyle}>Date</th>
              </tr>
            </thead>
            <tbody>
              {userHistory.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", color: 'var(--text-secondary)' }}>No test history yet.</td></tr>
              ) : userHistory.slice().reverse().map((t, idx) => (
                <tr key={idx} style={{ background: idx % 2 === 0 ? '#181A1B' : "#1e1c1c" }}>
                  <td style={tdStyle}>{userHistory.length - idx}</td>
                  <td style={tdStyle}>{t.wpm}</td>
                  <td style={tdStyle}>{t.accuracy}%</td>
                  <td style={tdStyle}>{t.errors}</td>
                  <td style={tdStyle}>{t.timeTaken}</td>
                  <td style={{ ...tdStyle, fontSize: "0.97rem" }}>{(new Date(t.date)).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ margin: "24px 0 0 0", textAlign: "center" }}>
          <button className="btn" onClick={() => onNav('test')}>Start New Test</button>
        </div>
      </div>
    </div>
  );
}

export default App;