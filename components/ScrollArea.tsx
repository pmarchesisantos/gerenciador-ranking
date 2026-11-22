
import React, { useCallback, useEffect, useRef, useState } from 'react';

interface ScrollAreaProps {
  children: React.ReactNode;
  /** Classes do elemento que rola — altura máxima, overflow horizontal, etc. */
  className?: string;
  /**
   * Classes do contêiner externo. Necessário quando a área rolável é filha de
   * um flex e precisa receber ali o `flex-1`/`min-h-0`.
   */
  wrapperClassName?: string;
}

const MIN_THUMB = 36;

/**
 * Área rolável com barra sobreposta.
 *
 * A barra nativa do Windows ocupa largura real dentro do contêiner: ela comia
 * uma faixa da grid e deixava o cabeçalho e o rodapé fixos sem alcançar a borda
 * do cartão. Aqui a nativa é escondida e a barra é desenhada por cima do
 * conteúdo, então o conteúdo usa a largura inteira e nada se desloca quando ela
 * aparece. Fica invisível em repouso, surge ao passar o mouse e pode ser
 * arrastada.
 */
const ScrollArea: React.FC<ScrollAreaProps> = ({ children, className = '', wrapperClassName = '' }) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<{ startY: number; startScroll: number } | null>(null);

  const [thumb, setThumb] = useState({ top: 0, height: 0, scrollable: false });
  const [hovering, setHovering] = useState(false);
  const [dragging, setDragging] = useState(false);

  const measure = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const { scrollHeight, clientHeight, scrollTop } = el;
    if (scrollHeight <= clientHeight + 1) {
      setThumb(t => (t.scrollable ? { top: 0, height: 0, scrollable: false } : t));
      return;
    }
    const height = Math.max(MIN_THUMB, (clientHeight / scrollHeight) * clientHeight);
    const maxTop = clientHeight - height;
    const progress = scrollTop / (scrollHeight - clientHeight);
    setThumb({ top: progress * maxTop, height, scrollable: true });
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    measure();
    el.addEventListener('scroll', measure, { passive: true });

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);

    return () => {
      el.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, [measure, children]);

  const onThumbPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = viewportRef.current;
    if (!el) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = { startY: e.clientY, startScroll: el.scrollTop };
    setDragging(true);
  };

  const onThumbPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = viewportRef.current;
    const drag = draggingRef.current;
    if (!el || !drag) return;
    const maxTop = el.clientHeight - thumb.height;
    if (maxTop <= 0) return;
    // Converte o deslocamento do mouse na trilha para deslocamento do conteúdo.
    const ratio = (el.scrollHeight - el.clientHeight) / maxTop;
    el.scrollTop = drag.startScroll + (e.clientY - drag.startY) * ratio;
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    draggingRef.current = null;
    setDragging(false);
  };

  /** Clique na trilha leva o conteúdo direto para aquela altura. */
  const onTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = viewportRef.current;
    if (!el) return;
    const track = e.currentTarget.getBoundingClientRect();
    const target = e.clientY - track.top - thumb.height / 2;
    const maxTop = el.clientHeight - thumb.height;
    if (maxTop <= 0) return;
    el.scrollTop = (Math.min(Math.max(target, 0), maxTop) / maxTop) * (el.scrollHeight - el.clientHeight);
  };

  const visible = thumb.scrollable && (hovering || dragging);

  return (
    <div
      className={`relative ${wrapperClassName}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div ref={viewportRef} className={`no-scrollbar ${className}`}>
        {children}
      </div>

      {thumb.scrollable && (
        <div
          onPointerDown={onTrackPointerDown}
          className={`absolute top-0 right-0 bottom-0 w-3 z-20 transition-opacity duration-200 ${
            visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div
            onPointerDown={onThumbPointerDown}
            onPointerMove={onThumbPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className={`absolute right-1 w-1.5 rounded-full cursor-grab active:cursor-grabbing transition-colors ${
              dragging ? 'bg-white/50' : 'bg-white/25 hover:bg-white/40'
            }`}
            style={{ top: thumb.top, height: thumb.height }}
          />
        </div>
      )}
    </div>
  );
};

export default ScrollArea;
