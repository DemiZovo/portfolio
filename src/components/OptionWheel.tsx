'use client';

import { useCallback, useEffect, useMemo, useRef, type CSSProperties } from 'react';

export interface OptionWheelItem {
  label: string;
  ariaLabel?: string;
  href?: string;
}

interface OptionWheelProps {
  items: OptionWheelItem[];
  ariaLabel: string;
  /** 受控：当前高亮索引，由父组件按路由计算。 */
  selected: number;
  /** 点击某个选项时触发（导航用）。滚动/拖拽/键盘只改高亮，不触发。 */
  onSelect: (index: number, item: OptionWheelItem) => void;
  /** 高亮索引变化时触发（滚动/拖拽/键盘）。 */
  onIndexChange?: (index: number, item: OptionWheelItem) => void;
  onIntent?: (item: OptionWheelItem) => void;
  side?: 'left' | 'right';
  textColor?: string;
  activeColor?: string;
  fontSize?: number;
  spacing?: number;
  curve?: number;
  tilt?: number;
  blur?: number;
  fade?: number;
  minOpacity?: number;
  smoothing?: number;
  inset?: number;
  loop?: boolean;
  draggable?: boolean;
  soundUrl?: string;
  soundVolume?: number;
}

export default function OptionWheel({
  items,
  ariaLabel,
  selected,
  onSelect,
  onIndexChange,
  onIntent,
  side = 'left',
  textColor = 'var(--muted)',
  activeColor = 'var(--accent)',
  fontSize = 1,
  spacing = 0.3,
  curve = 0.5,
  tilt = 8,
  blur = 2,
  fade = 0.25,
  minOpacity = 0.2,
  smoothing = 220,
  inset = 16,
  loop = false,
  draggable = true,
  soundUrl = '',
  soundVolume = 0.5,
}: OptionWheelProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const itemElsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // 动画可变状态全部走 ref，避免每帧触发 React 渲染。
  const posRef = useRef(selected);
  const targetRef = useRef(selected);
  const indexRef = useRef(selected);
  const rafRef = useRef<number | null>(null);
  const wheelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTsRef = useRef(0);
  const firstMountRef = useRef(true);
  const rowHRef = useRef(16);
  const dragRef = useRef<{ startY: number; startPos: number; moved: boolean } | null>(null);
  const propsRef = useRef({ items, side, curve, tilt, blur, fade, minOpacity, smoothing, loop, fontSize, spacing });
  propsRef.current = { items, side, curve, tilt, blur, fade, minOpacity, smoothing, loop, fontSize, spacing };

  const callbacksRef = useRef({ onSelect, onIndexChange, soundUrl, soundVolume });
  callbacksRef.current = { onSelect, onIndexChange, soundUrl, soundVolume };

  const rowH = useMemo(() => Math.max(fontSize * spacing * 16, 1), [fontSize, spacing]);
  rowHRef.current = rowH;

  // 播放切换提示音（可选，无 soundUrl 时静默）。
  const playTick = useCallback(() => {
    const { soundUrl } = callbacksRef.current;
    if (!soundUrl) return;
    const audio = new Audio(soundUrl);
    audio.volume = Math.min(Math.max(callbacksRef.current.soundVolume, 0), 1);
    audio.currentTime = 0;
    audio.play()?.catch(() => {});
  }, []);

  // 单帧布局：按距离把每个选项摆在弧线上。
  const drawFrame = useCallback((pos: number) => {
    const els = itemElsRef.current;
    rootRef.current?.setAttribute('aria-activedescendant', `ow-option-${indexRef.current}`);
    const total = propsRef.current.items.length;
    const { side, curve, tilt, blur, fade, minOpacity, loop } = propsRef.current;
    const tiltRad = (tilt * Math.PI) / 180;
    const rowH = rowHRef.current;
    const R = tiltRad > 0.0005 ? rowH / tiltRad : 0;
    const mirror = side === 'left' ? -1 : 1;

    for (let i = 0; i < total; i++) {
      const el = els[i];
      if (!el) continue;
      let d = i - pos;
      if (loop && total > 1) {
        d = ((d % total) + total) % total;
        if (d > total / 2) d -= total;
      }
      const dist = Math.abs(d);
      let x = 0;
      let y = d * rowH;
      let rot = 0;
      if (R > 0) {
        const ang = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, d * tiltRad));
        y = R * Math.sin(ang);
        x = -mirror * R * (1 - Math.cos(ang)) * curve;
        rot = (mirror * ang * 180) / Math.PI;
      }
      el.style.transform = `translate3d(${x.toFixed(2)}px, calc(${y.toFixed(2)}px - 50%), 0) rotate(${rot.toFixed(3)}deg)`;
      el.style.opacity = String(Math.max(minOpacity, 1 - dist * fade));
      el.style.filter = blur > 0 ? `blur(${(dist * blur).toFixed(2)}px)` : 'none';
      el.style.setProperty('--ow-p', String(Math.max(0, 1 - Math.min(dist, 1))));
      el.classList.toggle('is-selected', i === indexRef.current);
      el.setAttribute('aria-selected', String(i === indexRef.current));
    }
  }, []);

  // 核心：rAF 循环，指数平滑趋向 target。
  const startLoop = useCallback(() => {
    if (rafRef.current != null) return;
    lastTsRef.current = performance.now();
    const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const step = (now: number) => {
      const dt = Math.min((now - lastTsRef.current) / 1000, 0.05);
      lastTsRef.current = now;
      const tau = Math.max(propsRef.current.smoothing, 1) / 1000;
      const k = reduced ? 1 : 1 - Math.exp(-dt / tau);

      const cur = posRef.current;
      let next = cur + (targetRef.current - cur) * k;
      const settled = Math.abs(targetRef.current - next) < 0.001;
      if (settled) next = targetRef.current;
      posRef.current = next;
      drawFrame(next);

      if (settled) {
        rafRef.current = null;
        return;
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, [drawFrame]);

  // 设置目标位置；snap 时取整并同步 index + 回调。
  const applyTarget = useCallback(
    (value: number, snap: boolean) => {
      const total = propsRef.current.items.length;
      let v = value;
      if (!propsRef.current.loop) v = Math.min(Math.max(v, 0), Math.max(total - 1, 0));
      if (snap) v = Math.round(v);
      targetRef.current = v;
      const idx = ((Math.round(v) % total) + total) % total;
      if (idx !== indexRef.current) {
        indexRef.current = idx;
        const item = propsRef.current.items[idx];
        callbacksRef.current.onIndexChange?.(idx, item);
        playTick();
      }
      startLoop();
    },
    [startLoop, playTick],
  );

  const handleItemClick = useCallback(
    (index: number) => {
      if (dragRef.current?.moved) return;
      const total = propsRef.current.items.length;
      const cur = targetRef.current;
      let d = index - (((cur % total) + total) % total);
      if (propsRef.current.loop && total > 1) {
        if (d > total / 2) d -= total;
        else if (d < -total / 2) d += total;
      }
      applyTarget(cur + d, true);
      const item = propsRef.current.items[index];
      callbacksRef.current.onSelect(index, item);
    },
    [applyTarget],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let delta: number | null = null;
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') delta = -1;
      else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') delta = 1;
      if (e.key === 'Home') {
        e.preventDefault();
        applyTarget(0, true);
        return;
      }
      if (e.key === 'End') {
        e.preventDefault();
        applyTarget(propsRef.current.items.length - 1, true);
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const index = indexRef.current;
        callbacksRef.current.onSelect(index, propsRef.current.items[index]);
        return;
      }
      if (delta == null) return;
      e.preventDefault();
      applyTarget(Math.round(targetRef.current) + delta, true);
    },
    [applyTarget],
  );

  // 挂载后：摆位首帧 + 事件绑定 + ResizeObserver + 受控同步。
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // 首帧直接落位，避免从 0 起跳。
    posRef.current = selected;
    targetRef.current = selected;
    indexRef.current = selected;
    drawFrame(selected);

    // 容器就绪后淡入，避免 SSR 闪跳。
    requestAnimationFrame(() => {
      root.classList.add('is-ready');
    });

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaMode === 1 ? e.deltaY * 24 : e.deltaY;
      const step = Math.max(-1, Math.min(1, delta / rowHRef.current));
      applyTarget(targetRef.current + step, false);
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = setTimeout(() => applyTarget(targetRef.current, true), 140);
    };
    root.addEventListener('wheel', onWheel, { passive: false });

    const onPointerDown = (e: PointerEvent) => {
      if (!draggable) return;
      dragRef.current = { startY: e.clientY, startPos: targetRef.current, moved: false };
    };
    const onPointerMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dy = e.clientY - drag.startY;
      if (!drag.moved && Math.abs(dy) > 4) {
        drag.moved = true;
        try {
          root.setPointerCapture(e.pointerId);
        } catch {
          // 无活跃指针（如程序化事件）时忽略捕获失败，拖拽逻辑仍可继续。
        }
      }
      if (drag.moved) applyTarget(drag.startPos - dy / rowHRef.current, false);
    };
    const onPointerEnd = () => {
      const drag = dragRef.current;
      if (!drag) return;
      if (drag.moved) applyTarget(targetRef.current, true);
      dragRef.current = null;
    };
    root.addEventListener('pointerdown', onPointerDown);
    root.addEventListener('pointermove', onPointerMove);
    root.addEventListener('pointerup', onPointerEnd);
    root.addEventListener('pointercancel', onPointerEnd);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => applyTarget(targetRef.current, true));
      resizeObserver.observe(root);
    }

    return () => {
      root.removeEventListener('wheel', onWheel);
      root.removeEventListener('pointerdown', onPointerDown);
      root.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('pointerup', onPointerEnd);
      root.removeEventListener('pointercancel', onPointerEnd);
      resizeObserver?.disconnect();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggable]);

  // 受控同步：路由变化后轮盘 snap 到新项（跳过首帧）。
  useEffect(() => {
    if (firstMountRef.current) {
      firstMountRef.current = false;
      return;
    }
    applyTarget(selected, true);
  }, [selected, applyTarget]);

  const rootStyle = {
    '--ow-text-color': textColor,
    '--ow-active-color': activeColor,
    '--ow-font': `${fontSize}rem`,
    '--ow-inset': `${inset}px`,
  } as CSSProperties;

  return (
    <div
      ref={rootRef}
      className="ow"
      role="listbox"
      aria-label={ariaLabel}
      aria-activedescendant={`ow-option-${indexRef.current}`}
      tabIndex={0}
      style={rootStyle}
      onKeyDown={handleKeyDown}
    >
      {items.map((item, index) => (
        <button
          key={item.label}
          ref={(el) => {
            itemElsRef.current[index] = el;
          }}
          type="button"
          id={`ow-option-${index}`}
          role="option"
          aria-selected={index === indexRef.current}
          aria-label={item.ariaLabel ?? item.label}
          tabIndex={-1}
          className="ow-item"
          onPointerEnter={() => onIntent?.(item)}
          onFocus={() => onIntent?.(item)}
          onClick={() => handleItemClick(index)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
