const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const DB_FILE = path.join(__dirname, 'db.json');
const PORT = process.env.PORT || 3000;

// ---------- সহজ JSON ডাটাবেস ----------
// গঠন: { "প্রশ্ন": ["উত্তর1", "উত্তর2"] }
function loadDB() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch { return {}; }
}
function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}
const norm = s => String(s || '').trim().toLowerCase();
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// ---------- মূল এন্ডপয়েন্ট: /baby ----------
app.get('/baby', (req, res) => {
  const q = req.query;
  const db = loadDB();

  // teach
  if (q.teach !== undefined) {
    const ask = norm(q.teach), ans = String(q.reply || '').trim();
    if (!ask || !ans) return res.json({ message: 'প্রশ্ন ও উত্তর দুটোই দিন' });
    db[ask] = db[ask] || [];
    db[ask].push(ans);
    saveDB(db);
    return res.json({ message: `"${ans}" যোগ হয়েছে (মোট ${db[ask].length}টি)` });
  }

  // remove (index সহ বা ছাড়া)
  if (q.remove !== undefined) {
    const ask = norm(q.remove);
    if (!db[ask]) return res.json({ message: 'এই প্রশ্ন পাওয়া যায়নি' });
    if (q.index !== undefined) {
      const i = parseInt(q.index, 10) - 1;
      if (isNaN(i) || i < 0 || i >= db[ask].length)
        return res.json({ message: 'ভুল index' });
      db[ask].splice(i, 1);
      if (db[ask].length === 0) delete db[ask];
    } else {
      delete db[ask];
    }
    saveDB(db);
    return res.json({ message: 'মুছে ফেলা হয়েছে' });
  }

  // edit
  if (q.edit !== undefined) {
    const ask = norm(q.edit), rep = String(q.replace || '').trim();
    if (!db[ask]) return res.json({ message: 'এই প্রশ্ন পাওয়া যায়নি' });
    db[ask] = [rep];
    saveDB(db);
    return res.json({ message: 'পরিবর্তন হয়েছে' });
  }

  // list
  if (q.list !== undefined) {
    const keys = Object.keys(db);
    const total = keys.reduce((n, k) => n + db[k].length, 0);
    return res.json({ length: keys.length, responseLength: total });
  }

  // chat reply
  if (q.text !== undefined) {
    const text = norm(q.text);
    let replies = db[text];

    // সরাসরি না মিললে আংশিক মিল খোঁজা
    if (!replies) {
      const key = Object.keys(db).find(k => text.includes(k) || k.includes(text));
      if (key) replies = db[key];
    }
    if (!replies || !replies.length) {
      return res.json({ reply: 'এটা তো শিখিনি 🥺 teach করে শিখিয়ে দাও!' });
    }
    return res.json({ reply: pick(replies) });
  }

  res.json({ message: 'Baby API is running ✅' });
});

app.get('/', (_req, res) => res.send('My Baby API ✅'));
app.listen(PORT, () => console.log('API চলছে port ' + PORT));
