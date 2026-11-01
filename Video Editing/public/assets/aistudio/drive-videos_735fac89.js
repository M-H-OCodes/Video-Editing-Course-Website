// Google Drive video links for the whole site.
//
// How to use:
// 1. Upload each video to Google Drive.
// 2. Right-click the file > Share > General access: "Anyone with the link" (Viewer).
// 3. Click "Copy link" and paste it next to the matching file name below.
//    Either the full share link or just the file ID works, e.g.
//    "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view?usp=sharing"
//
// Every <video data-drive="..."> on the site (and every lesson in the course
// playlist) looks its link up here by file name, so each link only has to be
// pasted once even if the video is used on several pages.
const DRIVE_VIDEOS = {
    // Home page + Portfolio
    "kia vid actual final.mp4": "https://drive.google.com/file/d/1oaXCR_0cKjo-rrOKxi_l5aXTG6yilxR6/view",
    "Marketing consultancy video.mp4": "https://drive.google.com/file/d/1c7J0S0oR1uffwNU83az06feMPE6EuPSr/view",
    "Sample edit.mp4": "https://drive.google.com/file/d/15JquIfNuHBJv9JswvrLjfgiiovNr_xHR/view",
    "kaiju no.8..mp4": "https://drive.google.com/file/d/1yxl8Rep2owkEGkgDZIcG52gHLHsUQXHs/view",

    // Portfolio: Houston Kold style shorts
    "sample houston 1.1..mp4": "https://drive.google.com/file/d/18B68Ppz-I6VJy4TdzChshYfG2cToszNK/view",
    "Houston style edit 2.mp4": "https://drive.google.com/file/d/1dgGtMKHw1lw5bRBjLDyffVfj5EAEdEhf/view",
    "Outclass.mp4": "https://drive.google.com/file/d/1sc3gBy9qtSiV5Iwcq-mDC7LErP7vsj3f/view",

    // Portfolio: Wojak style animation
    "Wojak..mp4": "https://drive.google.com/file/d/1PMdL__Mc0cHt92DwNFzSwdIrdkhZPMpa/view",
    "Pro 2.2.mp4": "https://drive.google.com/file/d/1BjbV2GuyWLPeYmZBu8bJDNJVEK-Lv8Ek/view",

    // Portfolio: Anime based videos
    "anime1.mp4": "https://drive.google.com/file/d/13P66074cbBQtmdq2lRjZOobxiumDMPGm/view",
    "Anime 2.mp4": "https://drive.google.com/file/d/1RyvJ3mWu9WYccesT_fd-_wBtL9IyCxIr/view",
    "Anime 3.mp4": "https://drive.google.com/file/d/1bhKiipghgG9NFeJDfpguPC0WD-xUEo_O/view",
    "anime4.mp4": "https://drive.google.com/file/d/1HIUM3_hcFAb4d1DlC6xvSqNK-4niqI7N/view",

    // Portfolio: Samples
    "Sample.mp4": "https://drive.google.com/file/d/1_Ul3l4GGTrie0ZbFzmTNbJgNjdcqkP2T/view",
    "Sample2.1.mp4": "https://drive.google.com/file/d/12adWWwUnQtN7IdxEebBkMicUoSJdY0y8/view",
    "Sample3.mp4": "https://drive.google.com/file/d/1uyvIsVuReD4wr0mMt08JBkOLHPYQKrh9/view",
    "Sample4.mp4": "https://drive.google.com/file/d/19ODoK-wpZmrTinJVhjut8gPzpX9apInC/view",
    "Sample5.mp4": "https://drive.google.com/file/d/1iFDePGzIxYkD8370UA4jHrNjWegQzEs9/view",
    "Sample6.mp4": "https://drive.google.com/file/d/1fDMIj9INIo-0AxlL7NbGxvNC4TpcVpLH/view",
    "sample7.mp4": "https://drive.google.com/file/d/1XS9JaBXlH3PmyENLLTLDWAnD8Wn-azxy/view",
    "Sample8.mp4": "https://drive.google.com/file/d/1Y6qfnx7AjrLlCE-bf4cgwaA6BkT7EaSY/view",

    "sample2.mp4": "https://drive.google.com/file/d/1B6sFdImbomKb0Mf3DMJ5GEUqh_QmmBJ6/view",

    // Course page (innercourse.html) lessons
    "course 1.mp4": "https://drive.google.com/file/d/1g6AEsw04MLh8l0aey3OXH4lR9zJlZK28/view",
    "course video 1.mp4": "https://drive.google.com/file/d/1KJFUTeUmJYsSzF76b3SRWXR5umBpLpbG/view",
    "Course vid 3.mp4": "https://drive.google.com/file/d/1baRFWNe30AAqABzEklYAWFZF3-0STXC2/view",
    "Course 4.mp4": "https://drive.google.com/file/d/1RAtgwTBifJvO_rBGM1lKQzvRKq9b-WTC/view",
    "Course vid 5.mp4": "https://drive.google.com/file/d/1E2oqewDVblNDUYRiz8LnBhsAWAqXDTOA/view"
};

// ---------------------------------------------------------------------------
// No need to edit below this line.
// ---------------------------------------------------------------------------

const DriveVideos = (function() {

    function getId(key) {
        const link = (DRIVE_VIDEOS[key] || '').trim();
        if (!link) return null;
        const match = link.match(/\/d\/([\w-]+)/) || link.match(/[?&]id=([\w-]+)/);
        if (match) return match[1];
        return /^[\w-]{10,}$/.test(link) ? link : null;
    }

    // Plays in the normal <video> player via local streaming proxy
    function directUrl(id) {
        return '/api/drive-stream/' + id;
    }

    // Google Drive's own player, used when the direct link is blocked
    // (Drive does this for large files or after too many views)
    function previewUrl(id) {
        return 'https://drive.google.com/file/d/' + id + '/preview';
    }

    function removeFallback(video) {
        const next = video.nextElementSibling;
        if (next && next.classList.contains('drive-fallback')) next.remove();
        video.style.display = video.dataset.driveDisplay || '';
    }

    function showFallback(video, id) {
        if (video.classList.contains('back')) {
            removeFallback(video);
            const frame = document.createElement('iframe');
            frame.src = previewUrl(id);
            frame.className = 'back drive-fallback visible';
            frame.setAttribute('style', 'position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; object-fit: cover !important; z-index: -2 !important; opacity: 0.55 !important; pointer-events: none !important; border: 0 !important;');
            frame.setAttribute('allow', 'autoplay');
            video.dataset.driveDisplay = video.style.display;
            video.style.display = 'none';
            video.insertAdjacentElement('afterend', frame);
            return;
        }

        if (video.dataset.driveFallback === 'none') {
            video.removeAttribute('src');
            video.load();
            return;
        }
        removeFallback(video);

        const frame = document.createElement('iframe');
        frame.src = previewUrl(id);
        frame.className = video.className + ' drive-fallback visible';
        frame.setAttribute('style', video.getAttribute('style') || '');
        frame.setAttribute('allow', 'autoplay; fullscreen');
        frame.setAttribute('allowfullscreen', '');
        frame.style.border = '0';
        if (!frame.style.width) frame.style.width = '100%';
        frame.style.aspectRatio = getComputedStyle(video).aspectRatio || '16 / 9';
        frame.style.height = 'auto';
        frame.title = 'Video: ' + video.dataset.driveCurrent;
        frame.loading = 'lazy';

        video.dataset.driveDisplay = video.style.display;
        video.style.display = 'none';
        video.insertAdjacentElement('afterend', frame);
    }

    // Loads the Drive video with this file name into a <video> element.
    function mount(video, key, autoplay) {
        if (!video) return;
        if (video.dataset.driveCurrent === key) {
            if (autoplay && video.style.display !== 'none') video.play().catch(function() {});
            return;
        }
        video.dataset.driveCurrent = key;

        const id = getId(key);
        removeFallback(video);
        if (!id) {
            console.warn('No Google Drive link set for "' + key + '" in drive-videos.js');
            video.removeAttribute('src');
            return;
        }

        if (video.classList.contains('back')) {
            video.defaultMuted = true;
            video.muted = true;
            video.loop = true;
            video.autoplay = true;
            video.playsInline = true;
            video.setAttribute('playsinline', '');
            video.setAttribute('webkit-playsinline', '');
            video.setAttribute('muted', '');
            video.setAttribute('loop', '');
            video.setAttribute('autoplay', '');
        }

        video.onerror = function() {
            if (video.dataset.driveCurrent === key) showFallback(video, id);
        };
        video.preload = video.classList.contains('back') ? 'auto' : 'metadata';
        video.playsInline = true;
        video.onloadedmetadata = function() {
            if (video.videoWidth && video.videoHeight) {
                video.style.setProperty('--drive-aspect', video.videoWidth + ' / ' + video.videoHeight);
            }
            if (video.classList.contains('back')) {
                video.play().catch(function() {});
            }
        };
        video.oncanplay = function() {
            if (video.classList.contains('back') && video.paused) {
                video.play().catch(function() {});
            }
        };
        video.style.removeProperty('--drive-aspect');
        
        // If not already set with a valid source, set it
        if (!video.src || video.src.indexOf('/api/drive-stream/') === -1) {
            video.src = directUrl(id);
            video.load();
        }
        
        if (autoplay || video.autoplay || video.classList.contains('back')) {
            video.play().catch(function() {});
        }
    }

    document.addEventListener('DOMContentLoaded', function() {
        document.querySelectorAll('video[data-drive]').forEach(function(video) {
            mount(video, video.dataset.drive, false);
        });
    });

    return { mount: mount };
})();
