const MUSIC_KEY = "blackhavenMetal";
const MUSIC_REGISTRY_KEY = "blackhavenMusic";
const MUSIC_FALLBACK_KEY = "blackhavenMusicElement";
const MUSIC_URL = "assets/audio/EH_Metal1.mp4";

export function ensureBlackhavenMusic(scene) {
  let music = scene.registry.get(MUSIC_REGISTRY_KEY);
  if (!music && scene.cache?.audio?.exists?.(MUSIC_KEY)) {
    try {
      music = scene.sound.add(MUSIC_KEY, {
        loop: true,
        volume: 0.42,
      });
      scene.registry.set(MUSIC_REGISTRY_KEY, music);
    } catch {
      music = null;
    }
  }
  if (music) {
    if (!music.isPlaying) music.play();
    return music;
  }
  return ensureFallbackMusic(scene);
}

export function toggleBlackhavenMusic(scene) {
  const existing = scene.registry.get(MUSIC_REGISTRY_KEY) ?? scene.registry.get(MUSIC_FALLBACK_KEY);
  if (!existing) {
    ensureBlackhavenMusic(scene);
    return true;
  }
  const music = existing;
  if (music.setMute) {
    music.setMute(!music.mute);
    if (!music.isPlaying && !music.mute) music.play();
    return !music.mute;
  }
  music.muted = !music.muted;
  if (!music.muted && music.paused) music.play().catch(() => {});
  return !music.muted;
}

export function isBlackhavenMusicEnabled(scene) {
  const music = scene.registry.get(MUSIC_REGISTRY_KEY) ?? scene.registry.get(MUSIC_FALLBACK_KEY);
  if (!music) return false;
  if (music.setMute) return music.isPlaying && !music.mute;
  return !music.paused && !music.muted;
}

function ensureFallbackMusic(scene) {
  let music = scene.registry.get(MUSIC_FALLBACK_KEY);
  if (!music) {
    music = new Audio(MUSIC_URL);
    music.loop = true;
    music.volume = 0.42;
    scene.registry.set(MUSIC_FALLBACK_KEY, music);
  }
  if (music.paused) music.play().catch(() => {});
  return music;
}
