import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  HiMiniBackward,
  HiMiniForward,
  HiMiniPause,
  HiMiniPlay,
  HiMiniSpeakerWave,
  HiMiniSpeakerXMark,
} from 'react-icons/hi2';
import { MdFullscreen, MdFullscreenExit } from 'react-icons/md';

function formatTime(value) {
  if (!Number.isFinite(value)) return '0:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function VideoPlayer({ src, className = '' }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideControlsTimeoutRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    const syncTime = () => setCurrentTime(video.currentTime || 0);
    const syncDuration = () => setDuration(video.duration || 0);
    const syncPause = () => setPlaying(false);
    const syncPlay = () => setPlaying(true);

    video.addEventListener('timeupdate', syncTime);
    video.addEventListener('loadedmetadata', syncDuration);
    video.addEventListener('pause', syncPause);
    video.addEventListener('play', syncPlay);

    return () => {
      video.removeEventListener('timeupdate', syncTime);
      video.removeEventListener('loadedmetadata', syncDuration);
      video.removeEventListener('pause', syncPause);
      video.removeEventListener('play', syncPlay);
    };
  }, [src]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = muted;
  }, [volume, muted]);

  useEffect(() => () => {
    if (hideControlsTimeoutRef.current) {
      window.clearTimeout(hideControlsTimeoutRef.current);
    }
  }, []);

  const progress = useMemo(
    () => (duration ? Math.min(100, (currentTime / duration) * 100) : 0),
    [currentTime, duration]
  );

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;
    bumpControls();

    if (video.paused) {
      await video.play();
    } else {
      video.pause();
    }
  };

  const bumpControls = () => {
    setShowControls(true);
    if (hideControlsTimeoutRef.current) {
      window.clearTimeout(hideControlsTimeoutRef.current);
    }
    hideControlsTimeoutRef.current = window.setTimeout(() => {
      if (!videoRef.current?.paused) {
        setShowControls(false);
      }
    }, 2200);
  };

  const jumpBy = (seconds) => {
    const video = videoRef.current;
    if (!video) return;
    const nextTime = Math.max(0, Math.min((video.duration || 0), video.currentTime + seconds));
    video.currentTime = nextTime;
    setCurrentTime(nextTime);
    bumpControls();
  };

  const handleSeek = (event) => {
    const video = videoRef.current;
    if (!video) return;
    const nextTime = Number(event.target.value);
    video.currentTime = nextTime;
    setCurrentTime(nextTime);
    bumpControls();
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    bumpControls();

    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await containerRef.current.requestFullscreen();
  };

  return (
    <div
      className={`custom-video-player ${showControls ? 'controls-visible' : 'controls-hidden'} ${className}`.trim()}
      ref={containerRef}
      onMouseMove={bumpControls}
      onMouseLeave={() => {
        if (!videoRef.current?.paused) {
          setShowControls(false);
        }
      }}
      onMouseEnter={bumpControls}
    >
      <video ref={videoRef} src={src} className="custom-video-element" onClick={togglePlay} onDoubleClick={toggleFullscreen} playsInline />
      <div className="custom-video-overlay" />
      <div className="custom-video-topbar">
        <span className="custom-video-badge">Preview</span>
      </div>
      <button type="button" className="custom-video-center-control" onClick={togglePlay} aria-label={playing ? 'Pause video' : 'Play video'}>
        {playing ? <HiMiniPause /> : <HiMiniPlay />}
      </button>
      <div className="custom-video-skip-controls">
        <button type="button" className="video-control-button soft" onClick={() => jumpBy(-10)} aria-label="Back 10 seconds">
          <HiMiniBackward />
        </button>
        <button type="button" className="video-control-button soft" onClick={() => jumpBy(10)} aria-label="Forward 10 seconds">
          <HiMiniForward />
        </button>
      </div>
      <div className="custom-video-controls">
        <button type="button" className="video-control-button primary" onClick={togglePlay}>
          {playing ? <HiMiniPause /> : <HiMiniPlay />}
        </button>
        <div className="video-progress-group">
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={Math.min(currentTime, duration || 0)}
            onChange={handleSeek}
            className="video-progress-input"
            style={{ '--progress': `${progress}%` }}
          />
          <div className="video-time">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        <div className="video-volume-group">
          <button type="button" className="video-control-button" onClick={() => setMuted((current) => !current)}>
            {muted || volume === 0 ? <HiMiniSpeakerXMark /> : <HiMiniSpeakerWave />}
          </button>
          <div className="video-volume-popover">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={muted ? 0 : volume}
              onChange={(event) => {
                const nextVolume = Number(event.target.value);
                setVolume(nextVolume);
                setMuted(nextVolume === 0);
              }}
              className="video-volume-input"
              style={{ '--progress': `${(muted ? 0 : volume) * 100}%` }}
            />
          </div>
        </div>
        <button type="button" className="video-control-button" onClick={toggleFullscreen}>
          {isFullscreen ? <MdFullscreenExit /> : <MdFullscreen />}
        </button>
      </div>
    </div>
  );
}

export default VideoPlayer;
