import React, { useState, useEffect } from "react";

// Exemplu minimal pentru SEMNALE – modifică după nevoie!
const SEMNALE = [
  "BTC", "was", "QRM", "will", "be",
  "QRM", "is", "now"
];

const morseTable = {
  "A": ".-", "B": "-...", "C": "-.-.", "D": "-..", "E": ".", "F": "..-.",
  "G": "--.", "H": "....", "I": "..", "J": ".---", "K": "-.-", "L": ".-..",
  "M": "--", "N": "-.", "O": "---", "P": ".--.", "Q": "--.-", "R": ".-.",
  "S": "...", "T": "-", "U": "..-", "V": "...-", "W": ".--", "X": "-..-",
  "Y": "-.--", "Z": "--..",
  "1": ".----", "2": "..---", "3": "...--", "4": "....-", "5": ".....",
  "6": "-....", "7": "--...", "8": "---..", "9": "----.", "0": "-----"
};

function toMorse(word) {
  return word
    .toUpperCase()
    .split("")
    .map(l => morseTable[l] || l)
    .join("   ");
}

const normalize = str =>
  str
    ? str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase()
    : "";

function getUTCDayOfYear() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 0));
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// Schimbă aici cu ziua lansării (ex: 165 pentru 14 iunie)
const START_DAY = 165;

const protocolDay = Math.max(0, getUTCDayOfYear() - START_DAY);

function getSaltByDay(dayNum) {
  if (dayNum <= 60) return 20;
  if (dayNum <= 120) return 12;
  if (dayNum <= 180) return 33;
  return 47;
}
function morseVibration(morse) {
  const DOT = 100, DASH = 300, GAP = 100;
  return morse.split("").flatMap(ch => {
    if (ch === ".") return [DOT, GAP];
    if (ch === "-") return [DASH, GAP];
    if (ch === " ") return [GAP];
    return [];
  });
}
function playMorseAudio(morse) {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const DOT = 0.1, DASH = 0.3, GAP = 0.1, FREQ = 650;
  let t = audioCtx.currentTime;
  for (const ch of morse) {
    if (ch === ".") {
      const o = audioCtx.createOscillator();
      o.type = "sine";
      o.frequency.value = FREQ;
      o.connect(audioCtx.destination);
      o.start(t);
      o.stop(t + DOT);
      t += DOT + GAP;
    } else if (ch === "-") {
      const o = audioCtx.createOscillator();
      o.type = "sine";
      o.frequency.value = FREQ;
      o.connect(audioCtx.destination);
      o.start(t);
      o.stop(t + DASH);
      t += DASH + GAP;
    } else if (ch === " ") {
      t += GAP;
    }
  }
  setTimeout(() => audioCtx.close(), (t - audioCtx.currentTime) * 1000 + 100);
}

function App() {
  const year = new Date().getUTCFullYear();
  const dayStr = String(protocolDay + 1).padStart(3, "0");
  const [semnalNo, setSemnalNo] = useState(1);

  const semnalNoStr = String(semnalNo).padStart(4, "0");
  const identificator = `${year}${dayStr}${semnalNoStr}`;
  const semnal = SEMNALE[protocolDay % SEMNALE.length];
  const morseSemnal = toMorse(semnal);

  const [input, setInput] = useState("");
  const [wallet, setWallet] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [validari, setValidari] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("validariQRM") || "{}");
    } catch {
      return {};
    }
  });
  const [feedback, setFeedback] = useState("");

  const CAPTCHATEXT = "The future is?";
  const CAPTCHA_ANSWER = "qrm";
  const validKey = `wallet_${normalize(wallet)}_day_${protocolDay}_signal_${semnalNoStr}`;
  const alreadyValidated = validari[validKey] === true;
  const dayNum = protocolDay + 1;
  const SALT = getSaltByDay(dayNum);
  const canValidate = (semnalNo - 1) % SALT === 0;

  useEffect(() => {
    localStorage.setItem("validariQRM", JSON.stringify(validari));
  }, [validari]);

  const handleVibration = () => {
    if ("vibrate" in navigator) {
      navigator.vibrate(morseVibration(morseSemnal));
    }
  };

  const handleAudio = () => {
    playMorseAudio(morseSemnal);
  };

  const handleValidate = () => {
    if (!wallet) {
      setFeedback("⚠️ Enter your wallet ID!");
      return;
    }
    if (!canValidate) {
      setFeedback(
        `⛔️ This wallet can only validate signals every ${SALT} steps per day (e.g. 1, ${1 +
          SALT}, ${1 + 2 * SALT}, ...).`
      );
      return;
    }
    if (alreadyValidated) {
      setFeedback("⛔️ This wallet has already validated this signal today!");
      return;
    }
    if (normalize(input) !== normalize(semnal)) {
      setFeedback("❌ Wrong answer for the Morse signal. Try again!");
      return;
    }
    if (normalize(captcha) !== CAPTCHA_ANSWER) {
      setFeedback("❌ Incorrect logic captcha! Answer the logic question correctly.");
      return;
    }
    setValidari({ ...validari, [validKey]: true });
    setFeedback("✅ Success! You validated this signal.");
    setInput("");
    setCaptcha("");
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", background: "#161622", color: "#fff"
    }}>
      <h1>QRM Signal Validation</h1>
      <div style={{ fontSize: 22, margin: "20px 0" }}>
        <strong>Today's signal (Protocol Day {protocolDay + 1}) – Morse:</strong>
        <div style={{
          fontSize: 34, margin: "16px 0", background: "#111", padding: "10px 40px",
          borderRadius: 12, letterSpacing: 8, border: "2px solid #333", display: "flex", alignItems: "center"
        }}>
          {morseSemnal}
          <button onClick={handleAudio}
            style={{marginLeft: 12, fontSize: 20, padding: "0 8px", background: "#282846", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer"}}
            title="Play Morse sound"
          >🔊</button>
          <button onClick={handleVibration}
            style={{marginLeft: 6, fontSize: 20, padding: "0 8px", background: "#282846", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer"}}
            title="Vibrate Morse"
          >📳</button>
        </div>
        <div style={{ fontSize: 16, marginTop: 10 }}>
          <b>Signal ID:</b> {identificator}
        </div>
        <div style={{ marginTop: 10 }}>
          <label>
            <b>Signal number for the day (1–6000):</b>{" "}
            <input
              type="number"
              min={1}
              max={6000}
              value={semnalNo}
              onChange={e => setSemnalNo(Math.max(1, Math.min(6000, parseInt(e.target.value) || 1)))}
              style={{ width: 80, fontSize: 16, padding: 3, borderRadius: 5, border: "1px solid #555" }}
            />
          </label>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: "#d1d1fa" }}>
          <b>Current rule:</b> validation every <b>{SALT}</b> signals.<br />
          (Allowed: {Array.from({length: Math.ceil(6000/SALT)}, (_,i)=>1+i*SALT).join(", ").slice(0,100)}{SALT*100 < 6000 ? "..." : ""})
        </div>
      </div>
      <input
        type="text"
        placeholder="Wallet ID (e.g. 6xNhZU...PcJVHQ)"
        value={wallet}
        onChange={e => setWallet(e.target.value)}
        style={{ marginBottom: 10, padding: 8, fontSize: 17, borderRadius: 6, border: "1px solid #444", width: 310 }}
        autoFocus
      />
      <input
        type="text"
        placeholder="Decoded answer (one word)"
        value={input}
        onChange={e => setInput(e.target.value)}
        style={{ marginBottom: 12, padding: 8, fontSize: 18, borderRadius: 6, border: "1px solid #444", width: 280 }}
      />
      <input
        type="text"
        placeholder={CAPTCHATEXT}
        value={captcha}
        onChange={e => setCaptcha(e.target.value)}
        style={{ marginBottom: 12, padding: 8, fontSize: 17, borderRadius: 6, border: "1px solid #444", width: 280 }}
      />
      <button
        onClick={handleValidate}
        style={{
          padding: "10px 32px", background: "#711fd2", color: "#fff",
          border: "none", borderRadius: 8, fontSize: 18, fontWeight: "bold", cursor: "pointer"
        }}
      >
        Validate signal
      </button>
      <div style={{ marginTop: 18, fontWeight: "bold", minHeight: 28, fontSize: 19, color: feedback.startsWith("✅") ? "#27ea81" : feedback.startsWith("❌") ? "#ff4444" : "#fff" }}>
        {feedback}
      </div>
      <div style={{ marginTop: 32, fontSize: 12, opacity: 0.5 }}>
        <b>Rule:</b> A wallet can only validate signals every <b>{SALT}</b> signals per day.<br />
        One day = one manifest signal.<br />
        <b>Unique signal ID:</b> {identificator}<br />
        <span style={{fontSize: 10}}>You can play or vibrate the Morse code for accessibility.</span>
      </div>
    </div>
  );
}

export default App;
