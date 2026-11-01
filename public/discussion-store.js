/*
 * Discussion data layer for the static (GitHub Pages) site.
 *
 * The original discussion talked to an Express endpoint (/api/discussion) that only exists on a
 * Node.js host, so on GitHub Pages every request failed and nothing could be posted.
 *
 * This file replaces that endpoint with two storage modes behind the same interface:
 *   - "local"  (default)  comments are saved in this browser (localStorage). Works instantly, but
 *                          only the visitor who wrote them can see them.
 *   - "shared"            comments are saved in a free Supabase database and are visible to everyone.
 *                          Enabled by filling in discussion-config.js (setup: discussion-setup.sql).
 */
(function () {
  var cfg = window.DISCUSSION_CONFIG || {};
  var remote = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);
  var base = String(cfg.supabaseUrl || '').replace(/\/+$/, '');

  var KEY_NAME = 'vc-discussion-name';
  var KEY_TOKEN = 'vc-discussion-token';
  var KEY_LOCAL = 'vc-discussion-comments';

  // localStorage can throw (private mode, blocked storage) - fall back to memory.
  var memory = {};
  function read(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return key in memory ? memory[key] : null; }
  }
  function write(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { memory[key] = value; }
  }
  function remove(key) {
    try { window.localStorage.removeItem(key); } catch (e) { delete memory[key]; }
  }

  // Example comments shown on the page (same ones the old server seeded).
  var SEED = [
    {
      "id": "c-1",
      "username": "Hamza Malik",
      "text": "Lesson 3 on rough cuts changed how I approach my timeline. Cutting out dead air first saves hours!",
      "minutesAgo": 35,
      "parentId": null
    },
    {
      "id": "c-2",
      "username": "Ayesha Tariq",
      "text": "What frame rate do you recommend shooting in when planning for 50% slow motion in CapCut?",
      "minutesAgo": 120,
      "parentId": null
    },
    {
      "id": "c-2-1",
      "username": "Muhammad Hadi",
      "text": "Shoot in at least 60fps (or 120fps if available)! That way when you slow it down to 50% on a 30fps timeline, it stays buttery smooth without frame blending artifacts.",
      "minutesAgo": 95,
      "parentId": "c-2"
    },
    {
      "id": "c-3",
      "username": "Bilal Khan",
      "text": "The color grading breakdown in lesson 5 is so practical. InShot vs CapCut comparison was very helpful.",
      "minutesAgo": 300,
      "parentId": null
    },
    {
      "id": "c-4",
      "username": "Zainab Noor",
      "text": "Could you do a deep dive video on audio sound effects (SFX) layering and audio ducking?",
      "minutesAgo": 840,
      "parentId": null
    },
    {
      "id": "c-5",
      "username": "Daniyal Ahmed",
      "text": "Transitioning from montage cuts to story-driven commercial edits is exactly what I needed guidance on.",
      "minutesAgo": 1440,
      "parentId": null
    },
    {
      "id": "c-6",
      "username": "Saad Farooq",
      "text": "The Houston Kold style pacing breakdown in the portfolio section is incredible. What shutter angle was used?",
      "minutesAgo": 2160,
      "parentId": null
    },
    {
      "id": "c-7",
      "username": "Mariam Siddiqui",
      "text": "Really loved how simple and engaging the beginner playlist is. Finished all 5 lessons in one evening.",
      "minutesAgo": 2880,
      "parentId": null
    },
    {
      "id": "c-8",
      "username": "Usman Ghani",
      "text": "Looking forward to the Intermediate course! Any estimate on when lesson 1 drops?",
      "minutesAgo": 4320,
      "parentId": null
    },
    {
      "id": "c-9",
      "username": "Fatima Zahra",
      "text": "The explanation of J-cuts and L-cuts in editing was so clear. Made an immediate difference in my vlogs.",
      "minutesAgo": 5760,
      "parentId": null
    },
    {
      "id": "c-10",
      "username": "Rehan Sheikh",
      "text": "Great website layout and portfolio presentation brother! Very inspiring journey.",
      "minutesAgo": 7200,
      "parentId": null
    },
    {
      "id": "c-11",
      "username": "Khadija Ali",
      "text": "The advice to never over-rely on flashy transitions before getting the story pacing right is golden.",
      "minutesAgo": 9000,
      "parentId": null
    },
    {
      "id": "c-12",
      "username": "Omar Javed",
      "text": "Filmora was my first editor too back in 2020! Seeing your growth to commercial projects gives so much motivation.",
      "minutesAgo": 10800,
      "parentId": null
    }
  ];

  function seedComments() {
    var now = Date.now();
    return SEED.map(function (c) {
      return {
        id: c.id,
        username: c.username,
        text: c.text,
        createdAt: new Date(now - c.minutesAgo * 60000).toISOString(),
        parentId: c.parentId || null,
        isSample: true,
        mine: false,
      };
    });
  }

  function fail(message) { throw new Error(message); }

  function currentName() { return read(KEY_NAME) || null; }

  function sameName(a, b) { return String(a || '').toLowerCase() === String(b || '').toLowerCase(); }

  function cleanText(value) {
    var text = typeof value === 'string' ? value.trim() : '';
    if (!text) fail('Comment text cannot be empty.');
    return text.slice(0, 3000);
  }

  function newId() { return 'c-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6); }

  function ownerToken() {
    var token = read(KEY_TOKEN);
    if (token && token.length >= 16) return token;
    var bytes = new Uint8Array(16);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
    else for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    token = Array.prototype.map.call(bytes, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    write(KEY_TOKEN, token);
    return token;
  }

  /* ----------------------------- shared mode ----------------------------- */

  async function rpc(fn, args) {
    var response;
    try {
      response = await fetch(base + '/rest/v1/rpc/' + fn, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: cfg.supabaseAnonKey,
          Authorization: 'Bearer ' + cfg.supabaseAnonKey,
        },
        body: JSON.stringify(args),
      });
    } catch (e) {
      fail('Could not reach the discussion server. Check your connection and try again.');
    }
    var payload = null;
    try { payload = await response.json(); } catch (e) { payload = null; }
    if (!response.ok) fail((payload && (payload.message || payload.error)) || 'The discussion server returned an error.');
    return payload;
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
  }

  async function sharedRequest(method, data) {
    data = data || {};
    var name = currentName();

    if (method === 'GET') {
      var rows = await rpc('discussion_list', { p_token: ownerToken() });
      var live = (rows || []).map(function (r) {
        return { id: r.id, username: r.username, text: r.body, createdAt: r.created_at, parentId: r.parent_id, mine: !!r.mine };
      });
      return { name: name, comments: live.concat(seedComments()) };
    }

    if (method === 'POST') {
      if (data.action === 'join') return joinLocal(data.name);
      if (data.action === 'leave') { remove(KEY_NAME); return { ok: true }; }
      if (!name) fail('Please enter your display name to comment.');
      var text = cleanText(data.text);
      if (data.parentId && !isUuid(data.parentId)) fail('Example comments are placeholders - please start a new comment instead of replying to them.');
      var id = await rpc('discussion_post', { p_name: name, p_text: text, p_parent: data.parentId || null, p_token: ownerToken() });
      return { comment: { id: id } };
    }

    if (method === 'PATCH') {
      if (!name) fail('Unauthorized');
      if (!data.id) fail('ID and text required');
      await rpc('discussion_edit', { p_id: data.id, p_text: cleanText(data.text), p_token: ownerToken() });
      return { ok: true };
    }

    if (method === 'DELETE') {
      if (!name) fail('Unauthorized');
      if (!data.id) fail('ID is required');
      await rpc('discussion_delete', { p_id: data.id, p_token: ownerToken() });
      return { ok: true };
    }

    fail('Unsupported request.');
  }

  /* ----------------------------- local mode ----------------------------- */

  function joinLocal(rawName) {
    if (!rawName || typeof rawName !== 'string' || !rawName.trim()) fail('Display name is required.');
    var clean = rawName.trim().slice(0, 40);
    write(KEY_NAME, clean);
    return { name: clean };
  }

  function readLocal() {
    try {
      var list = JSON.parse(read(KEY_LOCAL) || '[]');
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }

  function saveLocal(list) { write(KEY_LOCAL, JSON.stringify(list)); }

  async function localRequest(method, data) {
    data = data || {};
    var name = currentName();

    if (method === 'GET') {
      var mine = readLocal().map(function (c) {
        return Object.assign({}, c, { mine: !!name && sameName(c.username, name) });
      });
      return { name: name, comments: mine.concat(seedComments()) };
    }

    if (method === 'POST') {
      if (data.action === 'join') return joinLocal(data.name);
      if (data.action === 'leave') { remove(KEY_NAME); return { ok: true }; }
      if (!name) fail('Please enter your display name to comment.');
      var item = {
        id: newId(),
        username: name,
        text: cleanText(data.text),
        createdAt: new Date().toISOString(),
        parentId: data.parentId || null,
      };
      var list = readLocal();
      list.unshift(item);
      saveLocal(list);
      return { comment: item };
    }

    if (method === 'PATCH') {
      if (!name) fail('Unauthorized');
      if (!data.id) fail('ID and text required');
      var all = readLocal();
      var target = all.find(function (c) { return c.id === data.id; });
      if (!target) fail('Comment not found');
      if (!sameName(target.username, name)) fail('You can only edit your own comments');
      target.text = cleanText(data.text);
      saveLocal(all);
      return { comment: target };
    }

    if (method === 'DELETE') {
      if (!name) fail('Unauthorized');
      if (!data.id) fail('ID is required');
      var stored = readLocal();
      var found = stored.find(function (c) { return c.id === data.id; });
      if (!found) fail('Comment not found');
      if (!sameName(found.username, name)) fail('You can only delete your own comments');
      saveLocal(stored.filter(function (c) { return c.id !== data.id && c.parentId !== data.id; }));
      return { ok: true };
    }

    fail('Unsupported request.');
  }

  window.DiscussionStore = {
    mode: remote ? 'shared' : 'local',
    request: remote ? sharedRequest : localRequest,
  };
})();
