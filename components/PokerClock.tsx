
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRanking } from '../context/RankingContext';
import {
  Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Maximize, Minimize,
  Volume2, VolumeX, Users, Layers, Coins, Trophy, ExternalLink
} from 'lucide-react';
import { getClockStats, formatChips } from '../services/clockStats';

const WARNING_SECONDS = 60;

const PokerClock: React.FC = () => {
  const { pokerClockConfig, house } = useRanking();

  const activeStructure = useMemo(
    () =>
      pokerClockConfig.structures.find(s => s.id === pokerClockConfig.activeStructureId) ||
      pokerClockConfig.structures[0],
    [pokerClockConfig.structures, pokerClockConfig.activeStructureId]
  );
  const levels = activeStructure?.levels || [];

  const [levelIndex, setLevelIndex] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(() =>
    levels[0] ? levels[0].durationMinutes * 60 : 0
  );
  const [isRunning, setIsRunning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isExternal, setIsExternal] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  const warnedRef = useRef(false);
  const hideControlsRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentLevel = levels[levelIndex];
  const nextLevel = levels[levelIndex + 1];
  const stats = getClockStats(pokerClockConfig);
  const showPrize = pokerClockConfig.showPrize !== false;

  useEffect(() => {
    setIsExternal(window.location.search.includes('view=poker-clock-external'));
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const playSound = useCallback((url: string) => {
    if (isMuted) return;
    const audio = new Audio(url);
    audio.play().catch(() => {});
  }, [isMuted]);

  /** Vai para um nível e recarrega o relógio com a duração dele. */
  const goToLevel = useCallback((index: number, keepRunning = false) => {
    if (index < 0 || index >= levels.length) return;
    warnedRef.current = false;
    setLevelIndex(index);
    setSecondsRemaining(levels[index].durationMinutes * 60);
    if (!keepRunning) setIsRunning(false);
  }, [levels]);

  // Contagem regressiva. O avanço de nível acontece aqui, fora do setState,
  // para não disparar efeito colateral dentro do atualizador do React.
  useEffect(() => {
    if (!isRunning) return;

    const tick = setInterval(() => {
      setSecondsRemaining(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(tick);
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning) return;

    if (secondsRemaining === WARNING_SECONDS && !warnedRef.current) {
      warnedRef.current = true;
      playSound('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
    }

    if (secondsRemaining === 0) {
      playSound('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      if (levelIndex < levels.length - 1) {
        goToLevel(levelIndex + 1, true);
      } else {
        setIsRunning(false);
      }
    }
  }, [secondsRemaining, isRunning, levelIndex, levels.length, goToLevel, playSound]);

  // Em tela cheia os controles somem sozinhos e voltam ao mexer o mouse.
  useEffect(() => {
    if (!isFullscreen && !isExternal) {
      setControlsVisible(true);
      return;
    }
    const wake = () => {
      setControlsVisible(true);
      if (hideControlsRef.current) clearTimeout(hideControlsRef.current);
      hideControlsRef.current = setTimeout(() => setControlsVisible(false), 3000);
    };
    wake();
    window.addEventListener('mousemove', wake);
    window.addEventListener('touchstart', wake);
    return () => {
      window.removeEventListener('mousemove', wake);
      window.removeEventListener('touchstart', wake);
      if (hideControlsRef.current) clearTimeout(hideControlsRef.current);
    };
  }, [isFullscreen, isExternal]);

  /** Soma ou tira tempo do nível atual sem trocar de blind. Nunca passa de zero. */
  const adjustTime = useCallback((deltaSeconds: number) => {
    setSecondsRemaining(prev => {
      const next = Math.max(0, prev + deltaSeconds);
      if (next > WARNING_SECONDS) warnedRef.current = false;
      return next;
    });
  }, []);

  /** No fim do último nível o relógio fica zerado: dar play recomeça o nível. */
  const handlePlayPause = useCallback(() => {
    if (!isRunning && secondsRemaining === 0) {
      setSecondsRemaining(levels[levelIndex].durationMinutes * 60);
      warnedRef.current = false;
    }
    setIsRunning(r => !r);
  }, [isRunning, secondsRemaining, levels, levelIndex]);

  // Atalhos de teclado: espaço inicia/pausa, setas trocam de nível.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.code === 'Space') { e.preventDefault(); handlePlayPause(); }
      if (e.code === 'ArrowRight') goToLevel(levelIndex + 1);
      if (e.code === 'ArrowLeft') goToLevel(levelIndex - 1);
      if (e.code === 'ArrowUp') { e.preventDefault(); adjustTime(60); }
      if (e.code === 'ArrowDown') { e.preventDefault(); adjustTime(-60); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [levelIndex, goToLevel, handlePlayPause, adjustTime]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const openExternalWindow = () => {
    const width = 1280;
    const height = 800;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    window.open(
      `/c/${house.slug || house.id}?view=poker-clock-external`,
      'PokerClockWindow',
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes`
    );
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const describeLevel = (level: typeof currentLevel) => {
    if (!level) return '—';
    if (level.isBreak) return 'Intervalo';
    const blinds = `${level.smallBlind.toLocaleString('pt-BR')} / ${level.bigBlind.toLocaleString('pt-BR')}`;
    return level.ante > 0 ? `${blinds} · ante ${level.ante.toLocaleString('pt-BR')}` : blinds;
  };

  if (!currentLevel) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-700">
          <Layers size={28} />
        </div>
        <div>
          <h3 className="text-white font-bold text-lg">Nenhum nível configurado</h3>
          <p className="text-gray-500 text-sm">Defina a estrutura de blinds nas configurações do clock.</p>
        </div>
      </div>
    );
  }

  const totalSeconds = currentLevel.durationMinutes * 60;
  const progress = totalSeconds > 0 ? (totalSeconds - secondsRemaining) / totalSeconds : 0;
  const isWarning = isRunning && secondsRemaining <= WARNING_SECONDS && secondsRemaining > 0;
  const isBreak = !!currentLevel.isBreak;

  const accent = isBreak ? 'text-sky-300' : isWarning ? 'text-amber-400' : 'text-white';
  const ringColor = isBreak ? 'stroke-sky-400' : isWarning ? 'stroke-amber-400' : 'stroke-emerald-400';

  const statCards = [
    {
      key: 'players',
      label: 'Jogadores',
      icon: Users,
      value: `${stats.playersRemaining}`,
      hint: stats.totalPlayers > 0 ? `de ${stats.totalPlayers}` : undefined,
      tone: 'text-white',
      show: stats.totalPlayers > 0,
    },
    {
      key: 'avg',
      label: 'Stack Médio',
      icon: Layers,
      value: formatChips(stats.averageStack),
      hint: stats.usingDefaultStack ? 'stack padrão' : undefined,
      tone: 'text-emerald-400',
      show: stats.hasChipData,
    },
    {
      key: 'chips',
      label: 'Fichas Totais',
      icon: Coins,
      value: formatChips(stats.totalChips),
      tone: 'text-sky-300',
      show: stats.hasChipData,
    },
    {
      key: 'prize',
      label: 'Premiação',
      icon: Trophy,
      value: `R$ ${stats.totalPrize.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`,
      tone: 'text-amber-400',
      show: showPrize && stats.totalPrize > 0,
    },
  ].filter(c => c.show);

  return (
    <div className={`flex flex-col bg-[#07090d] text-white select-none overflow-hidden ${isFullscreen || isExternal ? 'fixed inset-0 z-[100] h-screen' : 'h-screen'}`}>
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.35]"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.12), transparent 60%)' }}
      />

      {/* Cabeçalho */}
      <header className="relative z-10 flex items-center justify-between gap-4 px-4 md:px-8 py-3 md:py-5 shrink-0">
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          {house.profile?.logoUrl ? (
            <img src={house.profile.logoUrl} alt="" className="h-8 w-8 md:h-11 md:w-11 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="h-8 w-8 md:h-11 md:w-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black shrink-0">
              {house.name?.[0] || 'P'}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-black text-sm md:text-lg tracking-tight truncate leading-none">{house.name || 'Poker Club'}</p>
            <p className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-[0.25em] mt-1 truncate">
              {pokerClockConfig.tournamentName}
            </p>
          </div>
        </div>

      </header>

      {/* Corpo */}
      <main className="relative z-10 flex-1 min-h-0 flex flex-col md:flex-row gap-3 md:gap-5 px-3 md:px-6 lg:px-8 pb-3">
        {/* Relógio + blinds */}
        <section className="flex-1 min-h-0 flex flex-col bg-white/[0.02] border border-white/10 rounded-3xl md:rounded-[2rem] p-4 md:p-6 relative overflow-y-auto custom-scrollbar">
          <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-1000 ease-linear z-10"
               style={{ width: `${Math.min(100, progress * 100)}%` }} />

          {/* m-auto centraliza quando sobra espaço e, quando falta, deixa o
              conteúdo rolar em vez de ser cortado pelas bordas da seção. */}
          <div className="m-auto w-full flex flex-col items-center gap-3 md:gap-5 py-1">

          <div className="relative flex items-center justify-center shrink-0">
            <svg className="absolute -rotate-90 w-[min(34vh,260px)] h-[min(34vh,260px)] hidden lg:block" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="46" className="stroke-white/5" strokeWidth="3" fill="none" />
              <circle
                cx="50" cy="50" r="46" fill="none" strokeWidth="3" strokeLinecap="round"
                className={`${ringColor} transition-all duration-1000 ease-linear`}
                strokeDasharray={2 * Math.PI * 46}
                strokeDashoffset={2 * Math.PI * 46 * (1 - progress)}
              />
            </svg>
            <div className="flex flex-col items-center">
              <span
                className={`font-black uppercase leading-none tracking-[0.18em] ${isBreak ? 'text-sky-300' : 'text-emerald-400'}`}
                style={{ fontSize: 'clamp(1.1rem, 3.4vh, 2.25rem)' }}
              >
                {isBreak ? 'Intervalo' : `Level ${levelIndex + 1}`}
              </span>
              <span className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mt-3 mb-1 md:mb-2">
                Tempo Restante
              </span>
              <span className={`font-black leading-none tracking-tighter tabular-nums transition-colors ${accent} ${isWarning ? 'animate-pulse' : ''}`}
                    style={{ fontSize: 'clamp(3rem, 13vh, 8rem)' }}>
                {formatTime(secondsRemaining)}
              </span>
            </div>
          </div>

          {!isBreak && (
            <div className="flex flex-wrap items-end justify-center gap-x-8 md:gap-x-14 gap-y-3 shrink-0">
              <div className="flex flex-col items-center">
                <span className="text-[9px] md:text-[10px] font-black text-emerald-500/70 uppercase tracking-[0.35em] mb-1">Blinds</span>
                <span className="font-black tracking-tighter leading-none tabular-nums" style={{ fontSize: 'clamp(1.75rem,8vh,5rem)' }}>
                  {currentLevel.smallBlind.toLocaleString('pt-BR')}
                  <span className="text-gray-600 mx-1 md:mx-2">/</span>
                  {currentLevel.bigBlind.toLocaleString('pt-BR')}
                </span>
              </div>
              {currentLevel.ante > 0 && (
                <div className="flex flex-col items-center">
                  <span className="text-[9px] md:text-[10px] font-black text-emerald-500/70 uppercase tracking-[0.35em] mb-1">Ante</span>
                  <span className="font-black text-emerald-400 tracking-tighter leading-none tabular-nums" style={{ fontSize: 'clamp(1.25rem,5vh,3rem)' }}>
                    {currentLevel.ante.toLocaleString('pt-BR')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Em telas baixas o próximo nível sai de cena para não espremer o relógio. */}
          {nextLevel && (
            <div className="hidden [@media(min-height:560px)]:flex items-center gap-3 bg-white/[0.03] border border-white/10 rounded-2xl px-4 md:px-6 py-2 md:py-3 shrink-0">
              <span className="text-[8px] md:text-[9px] font-black text-gray-500 uppercase tracking-[0.25em]">Próximo</span>
              <span className="font-black text-gray-300 tracking-tight text-xs md:text-base">{describeLevel(nextLevel)}</span>
            </div>
          )}
          </div>
        </section>

        {/* Painel lateral */}
        {(statCards.length > 0 || (showPrize && (pokerClockConfig.prizeDistribution?.length || 0) > 0)) && (
          <aside className="md:w-60 lg:w-72 xl:w-80 shrink-0 flex flex-col gap-3 min-h-0 max-h-[38vh] md:max-h-none">
            {statCards.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-1 gap-2 md:gap-3 shrink-0">
                {statCards.map(card => (
                  <div key={card.key} className="bg-white/[0.02] border border-white/10 rounded-2xl p-3 md:p-4">
                    <div className="flex items-center gap-2 mb-1 md:mb-2">
                      <card.icon size={12} className="text-gray-600 shrink-0" />
                      <span className="text-[8px] md:text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] truncate">
                        {card.label}
                      </span>
                    </div>
                    <p className={`font-black tracking-tight leading-none ${card.tone}`} style={{ fontSize: 'clamp(1.1rem,2.6vh,1.9rem)' }}>
                      {card.value}
                      {card.hint && <span className="text-gray-600 text-xs md:text-sm font-bold ml-1.5">{card.hint}</span>}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {showPrize && (pokerClockConfig.prizeDistribution?.length || 0) > 0 && (
              <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 flex-1 min-h-0 flex flex-col">
                <div className="flex items-center gap-2 mb-3 shrink-0">
                  <Trophy size={12} className="text-amber-500" />
                  <span className="text-[9px] font-black text-amber-500 uppercase tracking-[0.25em]">Premiação</span>
                </div>
                <div className="space-y-1.5 overflow-y-auto custom-scrollbar min-h-0">
                  {pokerClockConfig.prizeDistribution!.map(p => (
                    <div key={p.position} className="flex items-center justify-between gap-3 py-1">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest shrink-0">
                        {p.position}º
                      </span>
                      <span className="text-amber-400 font-black text-sm tabular-nums">
                        R$ {p.value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        )}
      </main>

      {/* Controles */}
      <footer
        className={`relative z-20 shrink-0 border-t border-white/10 bg-black/60 backdrop-blur-xl transition-all duration-300 ${
          controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full pointer-events-none'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 md:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => goToLevel(levelIndex - 1)}
              disabled={levelIndex === 0}
              title="Nível anterior (seta esquerda)"
              className="flex items-center gap-1.5 px-3 md:px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={18} />
              <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">Voltar</span>
            </button>

            <button
              onClick={handlePlayPause}
              title="Iniciar / pausar (espaço)"
              className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all shadow-xl active:scale-95 ${
                isRunning ? 'bg-amber-500 text-black shadow-amber-500/20' : 'bg-emerald-500 text-black shadow-emerald-500/20'
              }`}
            >
              {isRunning ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" className="ml-0.5" />}
            </button>

            <button
              onClick={() => goToLevel(levelIndex + 1)}
              disabled={levelIndex >= levels.length - 1}
              title="Próximo nível (seta direita)"
              className="flex items-center gap-1.5 px-3 md:px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-all"
            >
              <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">Avançar</span>
              <ChevronRight size={18} />
            </button>

            <button
              onClick={() => goToLevel(levelIndex)}
              title="Reiniciar o nível atual"
              className="p-2.5 md:ml-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-all"
            >
              <RotateCcw size={18} />
            </button>
          </div>

          {/* Ajuste de tempo do nível: operação, por isso fica aqui e não no telão. */}
          <div className="flex items-center gap-2 order-last w-full justify-center border-t border-white/10 pt-3 md:order-none md:w-auto md:border-0 md:pt-0">
            <span className="hidden lg:inline text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mr-1">Tempo</span>
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
              <button onClick={() => adjustTime(-60)} title="Tirar 1 minuto (seta para baixo)"
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-black text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                −1min
              </button>
              <button onClick={() => adjustTime(-10)} title="Tirar 10 segundos"
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-black text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                −10s
              </button>
              <div className="w-px h-5 bg-white/10 mx-0.5" />
              <button onClick={() => adjustTime(10)} title="Adicionar 10 segundos"
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-black text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                +10s
              </button>
              <button onClick={() => adjustTime(60)} title="Adicionar 1 minuto (seta para cima)"
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-black text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                +1min
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            <button onClick={() => setIsMuted(m => !m)} title={isMuted ? 'Ativar som' : 'Silenciar'}
                    className="p-2.5 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-all">
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            {!isExternal && (
              <button onClick={openExternalWindow} title="Abrir em outra janela (TV)"
                      className="p-2.5 rounded-xl text-gray-500 hover:text-cyan-400 hover:bg-white/5 transition-all">
                <ExternalLink size={18} />
              </button>
            )}
            <button onClick={toggleFullscreen} title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
                    className="p-2.5 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-all">
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PokerClock;
