'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type LogoItemNode = {
  node: string;
  href?: string;
  title?: string;
  ariaLabel?: string;
};

export type LogoItemImage = {
  src: string;
  alt?: string;
  href?: string;
  title?: string;
  srcSet?: string;
  sizes?: string;
  width?: number;
  height?: number;
};

export type LogoItem = LogoItemNode | LogoItemImage;

export interface LogoLoopProps {
  logos: LogoItem[];
  speed?: number;
  direction?: 'left' | 'right' | 'up' | 'down';
  width?: number | string;
  logoHeight?: number;
  gap?: number;
  pauseOnHover?: boolean;
  hoverSpeed?: number;
  fadeOut?: boolean;
  fadeOutColor?: string;
  scaleOnHover?: boolean;
  ariaLabel?: string;
  className?: string;
  renderItem?: (item: LogoItem, key: React.Key) => React.ReactNode;
}

const ANIMATION_CONFIG = {
  SMOOTH_TAU: 0.25,
  MIN_COPIES: 2,
  COPY_HEADROOM: 2,
};

const isNodeItem = (item: LogoItem): item is LogoItemNode => 'node' in item;

const getItemAriaLabel = (item: LogoItem): string | undefined => {
  if (isNodeItem(item)) return item.ariaLabel ?? item.title;
  return item.alt ?? item.title;
};

export default function LogoLoop({
  logos,
  speed = 120,
  direction = 'left',
  width = '100%',
  logoHeight = 28,
  gap = 32,
  pauseOnHover,
  hoverSpeed,
  fadeOut = false,
  fadeOutColor,
  scaleOnHover = false,
  ariaLabel = 'Partner logos',
  className,
  renderItem,
}: LogoLoopProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const seqRef = useRef<HTMLUListElement>(null);
  const [copyCount, setCopyCount] = useState(ANIMATION_CONFIG.MIN_COPIES);
  const [isHovered, setIsHovered] = useState(false);

  const isVertical = direction === 'up' || direction === 'down';

  const effectiveHoverSpeed = useMemo<number | undefined>(() => {
    if (hoverSpeed !== undefined) return hoverSpeed;
    if (pauseOnHover === true) return 0;
    if (pauseOnHover === false) return undefined;
    return 0;
  }, [hoverSpeed, pauseOnHover]);

  const targetVelocity = useMemo(() => {
    const magnitude = Math.abs(speed);
    const directionMultiplier = isVertical
      ? direction === 'up' ? 1 : -1
      : direction === 'left' ? 1 : -1;
    const speedMultiplier = speed < 0 ? -1 : 1;
    return magnitude * directionMultiplier * speedMultiplier;
  }, [speed, direction, isVertical]);

  // rAF 循环的 refs（避免每次渲染重建）
  const offsetRef = useRef(0);
  const velocityRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const seqSizeRef = useRef(0);
  const targetVelocityRef = useRef(targetVelocity);
  const hoverStateRef = useRef<{ hovered: boolean; hoverSpeed: number | undefined }>({ hovered: false, hoverSpeed: effectiveHoverSpeed });

  useEffect(() => {
    targetVelocityRef.current = targetVelocity;
  }, [targetVelocity]);

  useEffect(() => {
    hoverStateRef.current = { hovered: isHovered, hoverSpeed: effectiveHoverSpeed };
  }, [isHovered, effectiveHoverSpeed]);

  const updateDimensions = useCallback(() => {
    const container = containerRef.current;
    const seq = seqRef.current;
    if (!container || !seq) return;

    if (isVertical) {
      const parentHeight = container.parentElement?.clientHeight ?? 0;
      if (parentHeight > 0 && container.style.height !== `${parentHeight}px`) {
        container.style.height = `${parentHeight}px`;
      }
      const sequenceHeight = Math.ceil(seq.getBoundingClientRect().height);
      if (sequenceHeight > 0) {
        const viewport = container.clientHeight || parentHeight || sequenceHeight;
        const copiesNeeded = Math.ceil(viewport / sequenceHeight) + ANIMATION_CONFIG.COPY_HEADROOM;
        setCopyCount(Math.max(ANIMATION_CONFIG.MIN_COPIES, copiesNeeded));
      }
    } else {
      const containerWidth = container.clientWidth || 0;
      const sequenceWidth = Math.ceil(seq.getBoundingClientRect().width);
      if (sequenceWidth > 0) {
        const copiesNeeded = Math.ceil(containerWidth / sequenceWidth) + ANIMATION_CONFIG.COPY_HEADROOM;
        setCopyCount(Math.max(ANIMATION_CONFIG.MIN_COPIES, copiesNeeded));
      }
    }
  }, [isVertical]);

  // 测量 + 图片加载完成后再测量
  useEffect(() => {
    updateDimensions();
    const seqEl = seqRef.current;
    const images: HTMLImageElement[] = seqEl ? Array.from(seqEl.querySelectorAll('img')) : [];
    let remaining = images.length;
    if (remaining === 0) return;
    let cancelled = false;
    const onLoad = () => {
      remaining -= 1;
      if (remaining === 0 && !cancelled) updateDimensions();
    };
    images.forEach((img) => {
      const htmlImg = img as HTMLImageElement;
      if (htmlImg.complete) onLoad();
      else {
        htmlImg.addEventListener('load', onLoad, { once: true });
        htmlImg.addEventListener('error', onLoad, { once: true });
      }
    });
    return () => {
      cancelled = true;
      images.forEach((img) => {
        img.removeEventListener('load', onLoad);
        img.removeEventListener('error', onLoad);
      });
    };
  }, [updateDimensions, logos]);

  // ResizeObserver 监听容器与序列尺寸变化
  useEffect(() => {
    const container = containerRef.current;
    const seq = seqRef.current;
    if (!container || !seq) return;
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateDimensions);
      return () => window.removeEventListener('resize', updateDimensions);
    }
    const ro = new ResizeObserver(updateDimensions);
    ro.observe(container);
    ro.observe(seq);
    return () => ro.disconnect();
  }, [updateDimensions]);

  // 主动画循环
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const prefersReduced =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const seqSize = isVertical ? seqRef.current?.getBoundingClientRect().height ?? 0 : seqRef.current?.getBoundingClientRect().width ?? 0;
    seqSizeRef.current = seqSize;

    if (prefersReduced) {
      track.style.transform = 'translate3d(0, 0, 0)';
      return;
    }

    const animate = (timestamp: number) => {
      if (lastTsRef.current === null) lastTsRef.current = timestamp;
      const deltaTime = Math.max(0, (timestamp - lastTsRef.current) / 1000);
      lastTsRef.current = timestamp;

      const { hovered, hoverSpeed: hSpeed } = hoverStateRef.current;
      const target = hovered && hSpeed !== undefined ? hSpeed : targetVelocityRef.current;

      const easing = 1 - Math.exp(-deltaTime / ANIMATION_CONFIG.SMOOTH_TAU);
      velocityRef.current += (target - velocityRef.current) * easing;

      const currentSeqSize = seqSizeRef.current;
      if (currentSeqSize > 0) {
        let nextOffset = offsetRef.current + velocityRef.current * deltaTime;
        nextOffset = ((nextOffset % currentSeqSize) + currentSeqSize) % currentSeqSize;
        offsetRef.current = nextOffset;
        track.style.transform = isVertical
          ? `translate3d(0, ${-nextOffset}px, 0)`
          : `translate3d(${-nextOffset}px, 0, 0)`;
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTsRef.current = null;
    };
  }, [isVertical]);

  const cssVars = useMemo<React.CSSProperties>(
    () => ({
      '--logoloop-gap': `${gap}px`,
      '--logoloop-logoHeight': `${logoHeight}px`,
      ...(fadeOutColor ? { '--logoloop-fadeColor': fadeOutColor } : {}),
    }) as React.CSSProperties,
    [gap, logoHeight, fadeOutColor],
  );

  const containerWidth = typeof width === 'number' ? `${width}px` : width;

  const renderDefaultItem = (item: LogoItem, key: React.Key) => {
    if (renderItem) return renderItem(item, key);
    if (isNodeItem(item)) {
      const scaleClass = scaleOnHover ? 'logo-item--scale' : '';
      return (
        <span
          key={key}
          className={scaleClass}
          style={{ display: 'inline-flex', alignItems: 'center', fontSize: 'var(--logoloop-logoHeight)', lineHeight: 1 }}
          aria-hidden={item.href && !item.ariaLabel ? true : undefined}
          dangerouslySetInnerHTML={{ __html: item.node }}
        />
      );
    }
    const scaleClass = scaleOnHover ? 'logo-item--scale' : '';
    return (
      <img
        key={key}
        className={scaleClass}
        src={item.src}
        srcSet={item.srcSet}
        sizes={item.sizes}
        width={item.width}
        height={item.height}
        alt={item.alt ?? ''}
        title={item.title}
        loading="lazy"
        decoding="async"
        draggable={false}
        style={{ height: 'var(--logoloop-logoHeight)', width: 'auto', display: 'block', objectFit: 'contain', pointerEvents: 'none', userSelect: 'none' }}
      />
    );
  };

  const copies = Array.from({ length: copyCount }, (_, copyIndex) => (
    <ul
      key={`copy-${copyIndex}`}
      role="list"
      aria-hidden={copyIndex > 0 ? true : undefined}
      ref={copyIndex === 0 ? seqRef : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        margin: 0,
        padding: 0,
        listStyle: 'none',
        flexDirection: isVertical ? 'column' : 'row',
      }}
    >
      {logos.map((item, itemIndex) => (
        <li
          key={`${copyIndex}-${itemIndex}`}
          role="listitem"
          style={{
            flex: 'none',
            lineHeight: 1,
            margin: isVertical ? `0 0 var(--logoloop-gap)` : `0 var(--logoloop-gap) 0 0`,
          }}
        >
          {item.href && !renderItem ? (
            <a
              href={item.href}
              aria-label={getItemAriaLabel(item) || 'logo link'}
              target="_blank"
              rel="noreferrer noopener"
              style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', borderRadius: '0.25rem' }}
            >
              {renderDefaultItem(item, itemIndex)}
            </a>
          ) : (
            renderDefaultItem(item, itemIndex)
          )}
        </li>
      ))}
    </ul>
  ));

  const containerStyle: React.CSSProperties = {
    ...cssVars,
    position: 'relative',
    overflow: 'hidden',
    width: containerWidth,
  };
  if (isVertical) {
    containerStyle.height = '100%';
    containerStyle.display = 'inline-block';
    if (containerWidth === '100%') delete containerStyle.width;
  }
  if (scaleOnHover) {
    containerStyle.paddingTop = `calc(var(--logoloop-logoHeight) * 0.1)`;
    containerStyle.paddingBottom = `calc(var(--logoloop-logoHeight) * 0.1)`;
  }

  return (
    <div
      ref={containerRef}
      className={`logo-loop${className ? ` ${className}` : ''}`}
      role="region"
      aria-label={ariaLabel}
      style={containerStyle}
    >
      {fadeOut && isVertical && (
        <>
          <div
            aria-hidden="true"
            style={{
              position: 'absolute', left: 0, right: 0, top: 0, zIndex: 10,
              height: 'clamp(24px, 8%, 120px)', pointerEvents: 'none',
              background: 'linear-gradient(to bottom, var(--logoloop-fadeColor, var(--logoloop-fadeColorAuto, #ffffff)) 0%, rgba(0,0,0,0) 100%)',
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 10,
              height: 'clamp(24px, 8%, 120px)', pointerEvents: 'none',
              background: 'linear-gradient(to top, var(--logoloop-fadeColor, var(--logoloop-fadeColorAuto, #ffffff)) 0%, rgba(0,0,0,0) 100%)',
            }}
          />
        </>
      )}
      {fadeOut && !isVertical && (
        <>
          <div
            aria-hidden="true"
            style={{
              position: 'absolute', top: 0, bottom: 0, left: 0, zIndex: 10,
              width: 'clamp(24px, 8%, 120px)', pointerEvents: 'none',
              background: 'linear-gradient(to right, var(--logoloop-fadeColor, var(--logoloop-fadeColorAuto, #ffffff)) 0%, rgba(0,0,0,0) 100%)',
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: 'absolute', top: 0, bottom: 0, right: 0, zIndex: 10,
              width: 'clamp(24px, 8%, 120px)', pointerEvents: 'none',
              background: 'linear-gradient(to left, var(--logoloop-fadeColor, var(--logoloop-fadeColorAuto, #ffffff)) 0%, rgba(0,0,0,0) 100%)',
            }}
          />
        </>
      )}
      <div
        ref={trackRef}
        onMouseEnter={() => { if (effectiveHoverSpeed !== undefined) setIsHovered(true); }}
        onMouseLeave={() => { if (effectiveHoverSpeed !== undefined) setIsHovered(false); }}
        style={{
          display: 'flex',
          flexDirection: isVertical ? 'column' : 'row',
          width: isVertical ? '100%' : 'max-content',
          height: isVertical ? 'max-content' : undefined,
          willChange: 'transform',
          userSelect: 'none',
        }}
      >
        {copies}
      </div>
    </div>
  );
}
