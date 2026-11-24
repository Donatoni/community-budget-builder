import { SERVICE_VIDEOS } from './service-videos-data.js';
import { enterPanel, exitPanel } from './motion.js';

const videoURL = film => `/assets/videos/${film.id}.mp4`;
const posterURL = film => `/assets/video-posters/${film.id}.jpg`;
const time = seconds => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
const playIcon = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m9 5 11 7-11 7Z" fill="currentColor"/></svg>';
let playerModule;

export function initServiceVideos() {
  const dialog = document.querySelector('#service-video-dialog');
  const heading = dialog.querySelector('#service-video-title');
  const department = dialog.querySelector('#service-video-department');
  const playlist = dialog.querySelector('.service-video-playlist');
  const feedback = dialog.querySelector('#service-video-status');
  const stage = dialog.querySelector('.service-video-stage');
  const closeButton = dialog.querySelector('.service-video-close');
  let player = null;
  let currentFilm = null;
  let opener = null;
  let revision = 0;

  function media() { return player?.media || stage.querySelector('video'); }

  function attachMediaStatus(video, film) {
    const updatePlayback = () => {
      if (!dialog.open || currentFilm !== film) return;
      const label = playlist.querySelector('[aria-current] .video-track-state');
      if (label) label.textContent = video.ended ? 'Finished' : video.paused ? 'Paused' : 'Playing';
      if (!video.paused) feedback.textContent = '';
    };
    ['playing', 'pause', 'ended'].forEach(event => video.addEventListener(event, updatePlayback));
    video.addEventListener('error', () => {
      if (!dialog.open || currentFilm !== film) return;
      feedback.replaceChildren(document.createTextNode('This video could not load. '));
      const retry = document.createElement('button');
      retry.textContent = 'Try again';
      retry.addEventListener('click', () => selectFilm(film));
      feedback.append(retry);
    }, { once: true });
  }

  function selectFilm(film, autoplay = true) {
    currentFilm = film;
    heading.textContent = film.title;
    feedback.textContent = '';
    const previous = media();
    previous.pause();
    if (player) {
      player.source = {
        type: 'video', title: film.title,
        sources: [{ src: videoURL(film), type: 'video/mp4' }],
        poster: posterURL(film),
      };
    } else {
      previous.src = videoURL(film);
      previous.poster = posterURL(film);
      previous.load();
    }
    const video = media();
    video.preload = 'metadata';
    video.setAttribute('aria-label', film.title);
    attachMediaStatus(video, film);
    playlist.querySelectorAll('button').forEach(button => {
      const active = button.dataset.video === film.id;
      if (active) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
      button.querySelector('.video-track-state').textContent = active ? 'Selected' : time(SERVICE_VIDEOS[dialog.dataset.service].find(item => item.id === button.dataset.video).duration);
    });
    if (autoplay) video.play().catch(() => {
      // Browsers that require a fresh gesture keep the large play control visible.
    });
  }

  async function openPlayer(service, name, trigger) {
    const token = ++revision;
    opener = trigger;
    dialog.dataset.service = service;
    department.textContent = name;
    const films = SERVICE_VIDEOS[service];
    dialog.classList.toggle('is-single-video', films.length === 1);
    dialog.querySelector('.service-video-sidebar').hidden = films.length === 1;
    dialog.querySelector('#service-video-count').textContent = `${films.length} ${films.length === 1 ? 'video' : 'videos'}`;
    playlist.replaceChildren();
    films.forEach((film, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.video = film.id;
      button.setAttribute('aria-label', `Watch ${film.title}, ${time(film.duration)}`);
      button.innerHTML = `<span class="video-track-thumb"><img src="${posterURL(film)}" alt="" loading="lazy" />${playIcon}</span><span class="video-track-copy"><span class="video-track-number">${String(index + 1).padStart(2, '0')}</span><strong>${film.title}</strong><span class="video-track-state">${time(film.duration)}</span></span>`;
      button.addEventListener('click', () => selectFilm(film));
      playlist.append(button);
    });
    dialog.showModal();
    enterPanel(dialog);
    document.body.classList.add('modal-open');
    closeButton.focus();
    selectFilm(films[0], false);
    try {
      playerModule ??= Promise.all([import('plyr'), import('plyr/dist/plyr.css')]).catch(error => {
        playerModule = null;
        throw error;
      });
      const [{ default: Plyr }] = await playerModule;
      if (token !== revision || !dialog.open) return;
      player = new Plyr(media(), {
        title: currentFilm.title,
        iconUrl: '/assets/plyr.svg',
        blankVideo: '/assets/player-blank.mp4',
        controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'settings', 'fullscreen'],
        settings: ['speed'], speed: { selected: 1, options: [0.75, 1, 1.25, 1.5, 2] },
        keyboard: { focused: true, global: false },
        fullscreen: { enabled: true, fallback: true, iosNative: true },
        storage: { enabled: false },
        hideControls: true,
        resetOnEnd: false,
      });
      player.play()?.catch(() => {});
    } catch {
      // Keep native controls available if the optional player chunk fails to load.
      if (token === revision && dialog.open) media().play().catch(() => {});
    }
  }

  function releaseMedia() {
    ++revision;
    const video = media();
    video?.pause();
    if (player) {
      // A fresh element on each opening prevents stale media or player listeners.
      player.destroy();
      player = null;
    }
    stage.querySelectorAll('video').forEach(item => {
      item.pause();
      item.removeAttribute('src');
      item.querySelectorAll('source').forEach(source => source.remove());
      item.load();
    });
    stage.innerHTML = '<video controls playsinline preload="none"></video>';
    document.body.classList.remove('modal-open');
    opener?.focus();
  }
  // Let the panel and backdrop fade before the native dialog disappears.
  let closing = false;
  async function requestClose() {
    if (!dialog.open || closing) return;
    closing = true;
    dialog.classList.add('is-closing');
    await exitPanel(dialog);
    dialog.classList.remove('is-closing');
    closing = false;
    if (dialog.open) dialog.close();
  }
  closeButton.addEventListener('click', requestClose);
  dialog.addEventListener('cancel', event => {
    // Browsers may refuse to defer a repeated Escape; the dialog then closes natively.
    if (closing) return;
    event.preventDefault();
    requestClose();
  });
  dialog.addEventListener('close', () => {
    dialog.classList.remove('is-closing');
    closing = false;
    releaseMedia();
  });
  // Only the backdrop, not clicks inside the player or playlist, closes the dialog.
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) requestClose();
  });

  Object.entries(SERVICE_VIDEOS).forEach(([service, films]) => {
    const card = document.querySelector(`#tour-${service}`);
    const name = card.querySelector('h3').textContent;
    const button = document.createElement('button');
    button.className = 'service-video-link';
    button.type = 'button';
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', dialog.id);
    button.setAttribute('aria-label', `Watch ${name} ${films.length === 1 ? 'video' : 'videos'}`);
    button.innerHTML = `<span class="service-video-thumb"><img src="${posterURL(films[0])}" alt="" loading="lazy" width="128" height="72" /><span>${playIcon}</span></span><span class="service-video-link-copy"><strong>${films.length === 1 ? 'Watch the story' : 'Watch the stories'}</strong><small>${films.length} ${films.length === 1 ? 'video' : 'videos'} · ${films.length === 1 ? time(films[0].duration) : 'Meet your city'}</small></span><span class="service-video-arrow" aria-hidden="true">↗</span>`;
    button.addEventListener('click', () => openPlayer(service, name, button));
    card.querySelector('.service-total').before(button);
  });
}
