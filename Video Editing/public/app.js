document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('video-list');
  list?.addEventListener('click', (event) => {
    const item = event.target.closest('li[data-video]');
    if (!item || item.dataset.video.includes('Soon to come')) return;
    if (window.DriveVideos) {
      window.DriveVideos.mount(document.getElementById('main-video'), item.dataset.video, true);
    }
    list.querySelectorAll('li').forEach(li => li.classList.toggle('active', li === item));
  });

  const wrapper = document.querySelector('.comments-wrp');
  const status = document.getElementById('discussion-status');
  const nameInput = document.getElementById('login-username');
  const join = document.getElementById('login-btn');
  const leave = document.getElementById('logout-btn');
  const main = document.querySelector('.main-input');
  const welcome = document.getElementById('welcome-message');
  document.querySelector('.loading-overlay')?.remove();
  document.getElementById('loading-overlay')?.remove();

  let name = null;
  let rows = [];
  let visibleCount = 5; // Load 5 latest comments initially

  const element = (tag, cls, text) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  };

  const button = (label, handler) => {
    const el = element('button', 'bu-secondary', label);
    el.type = 'button';
    el.addEventListener('click', handler);
    return el;
  };

  async function request(method = 'GET', data) {
    const response = await fetch('/api/discussion', {
      method,
      headers: data ? { 'Content-Type': 'application/json' } : {},
      body: data ? JSON.stringify(data) : undefined,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Unable to load discussion.');
    return result;
  }

  function session() {
    if (!join || !leave || !nameInput || !main || !welcome) return;
    join.hidden = !!name;
    join.style.display = name ? 'none' : '';
    leave.style.display = name ? 'inline-block' : 'none';
    nameInput.hidden = !!name;
    main.hidden = !name;
    welcome.style.display = name ? 'block' : 'none';
    welcome.textContent = name ? `Posting as ${name}` : '';
  }

  async function load() {
    const data = await request();
    name = data.name;
    rows = data.comments || [];
    session();
    render();
  }

  function render() {
    if (!wrapper) return;
    wrapper.replaceChildren();

    // Get all root comments (no parentId)
    const roots = rows.filter(row => !row.parentId);

    // Sort latest comments first
    roots.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (!roots.length) {
      wrapper.append(element('p', 'discussion-empty', 'No comments yet. Share a question or tell us what you learned.'));
      return;
    }

    // Slice to currently visible count (initially 5, then +5 on each click)
    const visibleRoots = roots.slice(0, visibleCount);
    visibleRoots.forEach(row => wrapper.append(comment(row)));

    // Pagination controls: Show More button if more comments exist
    if (visibleCount < roots.length) {
      const moreSection = element('div', 'comments-pagination');
      const remaining = roots.length - visibleCount;
      const revealStep = Math.min(5, remaining);

      const moreBtn = element('button', 'bu-show-more', `Show more comments (+${revealStep} more · ${visibleRoots.length} of ${roots.length} shown) ↓`);
      moreBtn.type = 'button';
      moreBtn.setAttribute('aria-label', `Reveal ${revealStep} more comments`);
      moreBtn.addEventListener('click', () => {
        visibleCount += 5;
        render();
      });

      moreSection.append(moreBtn);
      wrapper.append(moreSection);
    } else if (roots.length > 5) {
      const finishedNote = element('div', 'comments-end-notice', `✓ All ${roots.length} comments revealed`);
      wrapper.append(finishedNote);
    }
  }

  function composer(container, parent, initial = '', editId = null) {
    document.querySelectorAll('.temp-reply-input').forEach(el => el.remove());
    const form = element('form', 'reply-input temp-reply-input');
    const input = element('textarea', 'cmnt-input');
    input.value = initial;
    input.required = true;
    input.maxLength = 3000;
    input.setAttribute('aria-label', editId ? 'Edit comment' : 'Your reply');
    input.placeholder = 'Write your reply…';
    const send = element('button', 'bu-primary', editId ? 'Save' : 'Send reply');
    send.type = 'submit';
    form.append(input, send, button('Cancel', () => form.remove()));

    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!input.value.trim()) return;
      send.disabled = true;
      if (status) status.textContent = '';
      try {
        await request(editId ? 'PATCH' : 'POST', { text: input.value, parentId: parent, id: editId });
        await load();
        if (status) status.textContent = editId ? 'Comment updated.' : 'Reply posted.';
      } catch (error) {
        if (status) status.textContent = error.message;
        send.disabled = false;
      }
    });

    container.append(form);
    input.focus();
  }

  function comment(row, isReply = false) {
    const node = element('article', `comment${row.mine ? ' this-user' : ''}${isReply ? ' discussion-reply' : ''}`);
    const header = element('div', 'c-header');
    const author = element('strong', 'usr-name', row.username + (row.mine ? ' · you' : ''));
    const time = element('time', 'cmnt-at', new Date(row.createdAt).toLocaleString());
    time.dateTime = row.createdAt;
    header.append(author, time);
    if (row.isSample) header.append(element('span', 'sample-comment-badge', 'Example comment'));
    node.append(header, element('p', 'c-body', row.text));

    const actions = element('div', 'c-actions');
    actions.append(button('Reply', () => {
      if (!name) {
        if (status) status.textContent = 'Enter your display name and join the discussion to reply.';
        nameInput?.focus();
        return;
      }
      composer(node, row.parentId || row.id, isReply ? `@${row.username} ` : '');
    }));

    if (row.mine) {
      actions.append(button('Edit', () => composer(node, null, row.text, row.id)));
      actions.append(button('Delete', () => {
        const confirm = element('div', 'delete-confirmation', isReply ? 'Delete this reply?' : 'Delete this comment and its replies?');
        const yes = button('Delete permanently', async () => {
          yes.disabled = true;
          try {
            await request('DELETE', { id: row.id });
            await load();
            if (status) status.textContent = 'Comment deleted.';
          } catch (error) {
            if (status) status.textContent = error.message;
            yes.disabled = false;
          }
        });
        confirm.append(yes, button('Cancel', () => confirm.remove()));
        node.querySelector('.delete-confirmation')?.remove();
        node.append(confirm);
      }));
    }

    node.append(actions);

    if (!isReply) {
      const replies = rows.filter(item => item.parentId === row.id);
      if (replies.length) {
        const details = element('details', 'discussion-replies');
        details.open = true;
        details.append(element('summary', '', `${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`));
        replies.forEach(reply => details.append(comment(reply, true)));
        node.append(details);
      }
    }

    return node;
  }

  join?.addEventListener('click', async () => {
    if (!nameInput?.value.trim()) return;
    join.disabled = true;
    try {
      await request('POST', { action: 'join', name: nameInput.value });
      await load();
      if (status) status.textContent = '';
    } catch (error) {
      if (status) status.textContent = error.message;
    } finally {
      join.disabled = false;
    }
  });

  nameInput?.addEventListener('keydown', event => {
    if (event.key === 'Enter') join?.click();
  });

  leave?.addEventListener('click', async () => {
    leave.disabled = true;
    try {
      await request('POST', { action: 'leave' });
      await load();
    } catch (error) {
      if (status) status.textContent = error.message;
    } finally {
      leave.disabled = false;
    }
  });

  const send = main?.querySelector('button');
  const input = main?.querySelector('textarea');
  if (input) {
    input.maxLength = 3000;
    input.setAttribute('aria-label', 'Your comment');
  }

  send?.addEventListener('click', async () => {
    if (!input || !input.value.trim()) {
      if (status) status.textContent = 'Write a comment before sending.';
      return;
    }
    send.disabled = true;
    try {
      await request('POST', { text: input.value });
      input.value = '';
      visibleCount = Math.max(visibleCount, 5); // Ensure new comment is visible
      await load();
      if (status) status.textContent = 'Comment posted.';
    } catch (error) {
      if (status) status.textContent = error.message;
    } finally {
      send.disabled = false;
    }
  });

  if (status) status.textContent = 'Loading discussion…';
  load()
    .then(() => {
      if (status) status.textContent = '';
    })
    .catch(error => {
      if (status) {
        status.textContent = error.message;
        status.append(
          button('Retry', () =>
            load()
              .then(() => {
                status.textContent = '';
              })
              .catch(err => {
                status.textContent = err.message;
              })
          )
        );
      }
    });
});
