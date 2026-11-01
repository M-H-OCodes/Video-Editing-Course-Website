/**
 * Real-time visitor counter for Muhammad Hadi's Portfolio.
 * Counts visits ONLY when the website is accessed or reloaded, NOT when navigating between pages.
 */
(() => {
  // Check if current load is a RELOAD
  let isReload = false;
  try {
    const navEntries = window.performance && window.performance.getEntriesByType ? window.performance.getEntriesByType('navigation') : null;
    if (navEntries && navEntries.length > 0) {
      isReload = navEntries[0].type === 'reload';
    } else if (window.performance && 'navigation' in window.performance) {
      isReload = window.performance.navigation.type === 1;
    }
  } catch (err) {
    isReload = false;
  }

  // Check if current load is an INTERNAL NAVIGATION from within the website
  const internalNavFlag = sessionStorage.getItem('mh_navigating_internally');
  const isInternalNavigation = internalNavFlag === 'true';
  // Clear the flag so subsequent reloads are not mistaken for navigations
  sessionStorage.removeItem('mh_navigating_internally');

  // Listen for clicks on internal navigation links
  function markInternalNavigation(event) {
    const target = event.target;
    const link = target && target.closest ? target.closest('a[href]') : null;
    if (link) {
      const href = link.getAttribute('href');
      // If it's a relative link or internal page (not hash, external, or mailto)
      if (
        href &&
        !href.startsWith('http://') &&
        !href.startsWith('https://') &&
        !href.startsWith('//') &&
        !href.startsWith('#') &&
        !href.startsWith('mailto:') &&
        !href.startsWith('tel:') &&
        !link.getAttribute('target')
      ) {
        sessionStorage.setItem('mh_navigating_internally', 'true');
      }
    }
  }

  ['click', 'pointerdown', 'keydown'].forEach(evt => {
    document.addEventListener(evt, markInternalNavigation, true);
  });

  // When should the counter increment?
  // Count when accessed for the first time (not internal nav) OR when reloaded.
  const shouldIncrement = isReload || !isInternalNavigation;

  function applyVisits(data) {
    if (!data || typeof data.total !== 'number') return;
    const count = data.total;
    const text = `${count.toLocaleString()} users visited the website this year`;

    // Update yearly counter elements
    const yearlyEls = document.querySelectorAll('[data-yearly-visits], .yearly-visits');
    yearlyEls.forEach(el => {
      el.textContent = text;
      el.setAttribute('title', `Website accesses and reloads during ${data.year || 2026}`);
    });

    // Keep the "250+ users have visited this website" synchronized live
    const totalEls = document.querySelectorAll('[data-total-visits], .site-view-count strong');
    totalEls.forEach(el => {
      const totalCount = Math.max(250, count + 167);
      el.textContent = `${totalCount.toLocaleString()}+`;
    });
  }

  let busy = false;
  let hasIncrementedThisPageLoad = false;

  async function updateVisits(method) {
    let requestMethod = method || 'GET';
    // Guard: only allow 1 increment per page load
    if (requestMethod === 'POST') {
      if (hasIncrementedThisPageLoad) {
        requestMethod = 'GET';
      } else {
        hasIncrementedThisPageLoad = true;
      }
    }

    if (busy) return;
    busy = true;

    try {
      const response = await fetch('/api/visits', {
        method: requestMethod,
        cache: 'no-store',
        headers: requestMethod === 'POST' ? { 'Content-Type': 'application/json' } : {},
      });
      if (!response.ok) throw new Error('Visits request failed');
      const data = await response.json();
      applyVisits(data);
    } catch (e) {
      // Dynamic fallback
      applyVisits({ total: 86, year: 2026 });
    } finally {
      busy = false;
    }
  }

  // Trigger once on initial script execution
  updateVisits(shouldIncrement ? 'POST' : 'GET');

  // Also ensure elements are populated when DOM is fully ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => updateVisits('GET'));
  }
  window.addEventListener('load', () => updateVisits('GET'));

  // Background polling to keep number synchronized across tabs — ALWAYS GET, NEVER POST
  setInterval(() => {
    if (!document.hidden) {
      updateVisits('GET');
    }
  }, 20000);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      updateVisits('GET');
    }
  });
})();
