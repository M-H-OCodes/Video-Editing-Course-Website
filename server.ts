import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Persistent visits counter
const visitsFilePath = path.join(__dirname, 'visits-data.json');
const currentYear = 2026;

function loadVisits(): number {
  try {
    if (fs.existsSync(visitsFilePath)) {
      const raw = fs.readFileSync(visitsFilePath, 'utf-8');
      const data = JSON.parse(raw);
      if (typeof data.total === 'number' && data.total >= 83) {
        return data.total;
      }
    }
  } catch (e) {}
  return 86;
}

function saveVisits(count: number) {
  try {
    fs.writeFileSync(visitsFilePath, JSON.stringify({ total: count, year: currentYear }), 'utf-8');
  } catch (e) {}
}

let visitCount = loadVisits();

// Visits API
app.get('/api/visits', (req, res) => {
  res.json({ total: visitCount, year: currentYear });
});

app.post('/api/visits', (req, res) => {
  visitCount++;
  saveVisits(visitCount);
  res.json({ total: visitCount, year: currentYear });
});

// Google Drive video streaming proxy with Range support for HTML5 video & background playback
app.get('/api/drive-stream/:id', async (req, res) => {
  const { id } = req.params;
  if (!id || !/^[\w-]+$/.test(id)) {
    return res.status(400).send('Invalid video id');
  }

  const driveUrl = `https://drive.usercontent.google.com/download?export=download&confirm=t&id=${id}`;
  const forwardHeaders: Record<string, string> = {
    'User-Agent': (req.headers['user-agent'] as string) || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  };
  if (req.headers.range) {
    forwardHeaders['Range'] = req.headers.range as string;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const upstream = await fetch(driveUrl, { 
      headers: forwardHeaders,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!upstream.ok && upstream.status !== 206) {
      return res.status(upstream.status).send('Video stream unavailable');
    }

    res.status(upstream.status);
    const contentType = upstream.headers.get('content-type') || 'video/mp4';
    const contentRange = upstream.headers.get('content-range');
    const contentLength = upstream.headers.get('content-length');
    const acceptRanges = upstream.headers.get('accept-ranges') || 'bytes';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', acceptRanges);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    if (contentRange) {
      res.setHeader('Content-Range', contentRange);
    }
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // If client requested HEAD, finish response headers without body
    if (req.method === 'HEAD' || !upstream.body) {
      return res.end();
    }

    // Convert Web ReadableStream to Node stream and pipe to client
    // @ts-ignore
    const nodeStream = Readable.fromWeb(upstream.body);
    nodeStream.pipe(res);
    req.on('close', () => {
      nodeStream.destroy();
    });
  } catch (err) {
    clearTimeout(timeoutId);
    console.error(`[drive-stream] Error streaming ${id}:`, err);
    if (!res.headersSent) {
      res.status(502).send('Error streaming video');
    }
  }
});

// Seed discussion comments
interface CommentItem {
  id: string;
  username: string;
  text: string;
  createdAt: string;
  parentId?: string | null;
  isSample?: boolean;
}

const seedComments: CommentItem[] = [
  {
    id: 'c-1',
    username: 'Hamza Malik',
    text: 'Lesson 3 on rough cuts changed how I approach my timeline. Cutting out dead air first saves hours!',
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    isSample: true,
  },
  {
    id: 'c-2',
    username: 'Ayesha Tariq',
    text: 'What frame rate do you recommend shooting in when planning for 50% slow motion in CapCut?',
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    isSample: true,
  },
  {
    id: 'c-2-1',
    username: 'Muhammad Hadi',
    text: 'Shoot in at least 60fps (or 120fps if available)! That way when you slow it down to 50% on a 30fps timeline, it stays buttery smooth without frame blending artifacts.',
    createdAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    parentId: 'c-2',
    isSample: true,
  },
  {
    id: 'c-3',
    username: 'Bilal Khan',
    text: 'The color grading breakdown in lesson 5 is so practical. InShot vs CapCut comparison was very helpful.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    isSample: true,
  },
  {
    id: 'c-4',
    username: 'Zainab Noor',
    text: 'Could you do a deep dive video on audio sound effects (SFX) layering and audio ducking?',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 14).toISOString(),
    isSample: true,
  },
  {
    id: 'c-5',
    username: 'Daniyal Ahmed',
    text: 'Transitioning from montage cuts to story-driven commercial edits is exactly what I needed guidance on.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    isSample: true,
  },
  {
    id: 'c-6',
    username: 'Saad Farooq',
    text: 'The Houston Kold style pacing breakdown in the portfolio section is incredible. What shutter angle was used?',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    isSample: true,
  },
  {
    id: 'c-7',
    username: 'Mariam Siddiqui',
    text: 'Really loved how simple and engaging the beginner playlist is. Finished all 5 lessons in one evening.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    isSample: true,
  },
  {
    id: 'c-8',
    username: 'Usman Ghani',
    text: 'Looking forward to the Intermediate course! Any estimate on when lesson 1 drops?',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    isSample: true,
  },
  {
    id: 'c-9',
    username: 'Fatima Zahra',
    text: 'The explanation of J-cuts and L-cuts in editing was so clear. Made an immediate difference in my vlogs.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    isSample: true,
  },
  {
    id: 'c-10',
    username: 'Rehan Sheikh',
    text: 'Great website layout and portfolio presentation brother! Very inspiring journey.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
    isSample: true,
  },
  {
    id: 'c-11',
    username: 'Khadija Ali',
    text: 'The advice to never over-rely on flashy transitions before getting the story pacing right is golden.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 150).toISOString(),
    isSample: true,
  },
  {
    id: 'c-12',
    username: 'Omar Javed',
    text: 'Filmora was my first editor too back in 2020! Seeing your growth to commercial projects gives so much motivation.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 180).toISOString(),
    isSample: true,
  },
];

let comments: CommentItem[] = [...seedComments];
// Session map for users: IP or token -> display name
const sessions = new Map<string, string>();

function getSessionId(req: express.Request): string {
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'local-user';
  return ip;
}

app.get('/api/discussion', (req, res) => {
  const sessionId = getSessionId(req);
  const currentName = sessions.get(sessionId) || null;

  const userComments = comments.map(c => ({
    ...c,
    mine: currentName ? c.username.toLowerCase() === currentName.toLowerCase() : false,
  }));

  res.json({
    name: currentName,
    comments: userComments,
  });
});

app.post('/api/discussion', (req, res) => {
  const sessionId = getSessionId(req);
  const { action, name, text, parentId } = req.body;

  if (action === 'join') {
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Display name is required.' });
    }
    const cleanName = name.trim().slice(0, 40);
    sessions.set(sessionId, cleanName);
    return res.json({ name: cleanName });
  }

  if (action === 'leave') {
    sessions.delete(sessionId);
    return res.json({ ok: true });
  }

  // Adding comment or reply
  const currentName = sessions.get(sessionId);
  if (!currentName) {
    return res.status(401).json({ error: 'Please enter your display name to comment.' });
  }

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Comment text cannot be empty.' });
  }

  const newComment: CommentItem = {
    id: 'c-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    username: currentName,
    text: text.trim().slice(0, 3000),
    createdAt: new Date().toISOString(),
    parentId: parentId || null,
  };

  comments.unshift(newComment);
  res.json({ comment: newComment });
});

app.patch('/api/discussion', (req, res) => {
  const sessionId = getSessionId(req);
  const currentName = sessions.get(sessionId);
  if (!currentName) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id, text } = req.body;
  if (!id || !text || !text.trim()) {
    return res.status(400).json({ error: 'ID and text required' });
  }

  const target = comments.find(c => c.id === id);
  if (!target) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  if (target.username.toLowerCase() !== currentName.toLowerCase()) {
    return res.status(403).json({ error: 'You can only edit your own comments' });
  }

  target.text = text.trim().slice(0, 3000);
  res.json({ comment: target });
});

app.delete('/api/discussion', (req, res) => {
  const sessionId = getSessionId(req);
  const currentName = sessions.get(sessionId);
  if (!currentName) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'ID is required' });
  }

  const targetIndex = comments.findIndex(c => c.id === id);
  if (targetIndex === -1) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  if (comments[targetIndex].username.toLowerCase() !== currentName.toLowerCase()) {
    return res.status(403).json({ error: 'You can only delete your own comments' });
  }

  // Remove target comment and any of its direct replies
  comments = comments.filter(c => c.id !== id && c.parentId !== id);
  res.json({ ok: true });
});

app.get(['/404.html', '/404'], (req, res) => {
  res.status(404).sendFile(path.resolve(__dirname, 'public', '404.html'));
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
