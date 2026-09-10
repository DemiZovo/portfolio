'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

// 播放列表：把音频文件放进 public/music/ 后在这里登记即可。
// 例：{ src: '/music/track-1.mp3', title: '第一首歌' }
interface Track {
  src: string;
  title: string;
}

const PLAYLIST: Track[] = [];

export default function MusicPlayer() {
  const t = useTranslations('music');
  const [open, setOpen] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.6);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const track = PLAYLIST[trackIndex % Math.max(PLAYLIST.length, 1)];

  // 音量记忆
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem('music-volume'));
      if (!Number.isNaN(saved) && saved >= 0 && saved <= 1) setVolume(saved);
    } catch {}
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
    const onEnded = () => next();
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackIndex]);

  // 卸载暂停
  useEffect(() => {
    return () => audioRef.current?.pause();
  }, []);

  const play = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.play()?.catch(() => {});
    setPlaying(true);
  };

  const pause = () => {
    audioRef.current?.pause();
    setPlaying(false);
  };

  const toggle = () => (playing ? pause() : play());

  const next = () => {
    if (PLAYLIST.length === 0) return;
    pause();
    setTrackIndex((i) => (i + 1) % PLAYLIST.length);
    requestAnimationFrame(() => {
      audioRef.current?.load();
      play();
    });
  };

  const prev = () => {
    if (PLAYLIST.length === 0) return;
    pause();
    setTrackIndex((i) => (i - 1 + PLAYLIST.length) % PLAYLIST.length);
    requestAnimationFrame(() => {
      audioRef.current?.load();
      play();
    });
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    audio.currentTime = ratio * audio.duration;
    setProgress(ratio);
  };

  const seekByKeyboard = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const steps: Record<string, number> = { ArrowLeft: -0.05, ArrowDown: -0.05, ArrowRight: 0.05, ArrowUp: 0.05 };
    let ratio = progress;
    if (e.key === 'Home') ratio = 0;
    else if (e.key === 'End') ratio = 1;
    else if (e.key in steps) ratio = Math.min(Math.max(progress + steps[e.key], 0), 1);
    else return;
    e.preventDefault();
    audio.currentTime = ratio * audio.duration;
    setProgress(ratio);
  };

  const onVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setVolume(v);
    try { localStorage.setItem('music-volume', String(v)); } catch {}
  };

  return (
    <div className="music-player" ref={panelRef}>
      <button
        ref={triggerRef}
        type="button"
        className="tool-button"
        aria-label={t('title')}
        aria-expanded={open}
        aria-controls="music-player-panel"
        onClick={() => setOpen((o) => !o)}
      >
        <svg aria-hidden="true"><use href={playing ? '#nav-pause' : '#nav-play'} /></svg>
      </button>
      {open && (
        <div className="music-player__panel" id="music-player-panel" role="region" aria-label={t('title')}>
          <div className="music-player__nowplaying">{track?.title ?? t('emptyHint')}</div>
          <div className="music-player__progress" role="slider" aria-label={t('title')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-disabled={PLAYLIST.length === 0} tabIndex={PLAYLIST.length > 0 ? 0 : -1} onClick={seek} onKeyDown={seekByKeyboard}>
            <span style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="music-player__controls">
            <button type="button" aria-label={t('prev')} disabled={PLAYLIST.length === 0} onClick={prev}><svg aria-hidden="true"><use href="#nav-prev" /></svg></button>
            <button type="button" className="music-player__play" aria-label={playing ? t('pause') : t('play')} disabled={PLAYLIST.length === 0} onClick={toggle}>
              <svg aria-hidden="true"><use href={playing ? '#nav-pause' : '#nav-play'} /></svg>
            </button>
            <button type="button" aria-label={t('next')} disabled={PLAYLIST.length === 0} onClick={next}><svg aria-hidden="true"><use href="#nav-next" /></svg></button>
          </div>
          <div className="music-player__volume">
            <span>{t('volume')}</span>
            <input type="range" min="0" max="1" step="0.01" value={volume} onChange={onVolume} aria-label={t('volume')} />
          </div>
        </div>
      )}
      {PLAYLIST.length > 0 && (
        <audio ref={audioRef} src={track?.src} preload="metadata" loop={false} />
      )}
    </div>
  );
}
