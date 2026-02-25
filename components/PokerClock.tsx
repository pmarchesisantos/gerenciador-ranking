
import React, { useState, useEffect, useRef } from 'react';
import { useRanking } from '../context/RankingContext';
import { Play, Pause, RotateCcw, SkipForward, SkipBack, Maximize, Minimize, Volume2, VolumeX } from 'lucide-react';

const PokerClock: React.FC = () => {
  const { pokerClockConfig, house } = useRanking();
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isExternal, setIsExternal] = useState(false);
  const [itmPhase, setItmPhase] = useState<'bubbles' | 'message' | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastElimTimeRef = useRef<number | undefined>(pokerClockConfig.lastEliminationTime);
  const prevPlayersRemaining = useRef<number | undefined>(pokerClockConfig.playersRemaining);

  // Detect if external window
  useEffect(() => {
    setIsExternal(window.location.search.includes('view=poker-clock-external'));
  }, []);

  // Listen for ITM (In The Money) bubble burst
  useEffect(() => {
    const paidPlaces = pokerClockConfig.prizeDistribution?.length || 0;
    const remaining = pokerClockConfig.playersRemaining || 0;

    if (paidPlaces > 0 && remaining === paidPlaces && prevPlayersRemaining.current !== remaining && remaining > 0) {
      // ITM Reached!
      setItmPhase('bubbles');
      
      if (!isMuted) {
        // Rocket/Firework sound
        const firework = new Audio('https://assets.mixkit.co/active_storage/sfx/2014/2014-preview.mp3');
        firework.volume = 0.5;
        firework.play().catch(() => {});
      }

      setTimeout(() => {
        setItmPhase('message');
        if (!isMuted) {
          // Celebration/Crowd sound
          const celebration = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3');
          celebration.volume = 0.5;
          celebration.play().catch(() => {});
        }
      }, 5000);

      setTimeout(() => setItmPhase(null), 15000); // 5s bubbles + 10s message
    }
    prevPlayersRemaining.current = remaining;
  }, [pokerClockConfig.playersRemaining, pokerClockConfig.prizeDistribution, isMuted]);

  // Sync fullscreen state with browser
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Get active structure
  const activeStructure = pokerClockConfig.structures.find(s => s.id === pokerClockConfig.activeStructureId) || pokerClockConfig.structures[0];
  const currentLevel = activeStructure.levels[currentLevelIndex];
  const nextLevel = activeStructure.levels[currentLevelIndex + 1];

  // Initialize timer when level changes or on mount
  useEffect(() => {
    if (currentLevel && !isRunning && secondsRemaining === 0) {
      setSecondsRemaining(currentLevel.durationMinutes * 60);
    }
  }, [currentLevel, isRunning, secondsRemaining]);

  // Timer logic
  useEffect(() => {
    if (isRunning && secondsRemaining > 0) {
      timerRef.current = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            handleLevelComplete();
            return 0;
          }
          
          // 1 minute warning sound
          if (prev === 61 && !isMuted) {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
            audio.play().catch(() => {});
          }

          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, secondsRemaining, isMuted]);

  const handleLevelComplete = () => {
    setIsRunning(false);
    if (!isMuted) {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(() => {});
    }
    
    if (currentLevelIndex < activeStructure.levels.length - 1) {
      setCurrentLevelIndex(prev => prev + 1);
      setSecondsRemaining(activeStructure.levels[currentLevelIndex + 1].durationMinutes * 60);
      setIsRunning(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => console.error(e));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    if (currentLevel) {
      setSecondsRemaining(currentLevel.durationMinutes * 60);
    }
  };

  const handleSkip = () => {
    if (currentLevelIndex < activeStructure.levels.length - 1) {
      setCurrentLevelIndex(prev => prev + 1);
      setSecondsRemaining(activeStructure.levels[currentLevelIndex + 1].durationMinutes * 60);
    }
  };

  const handleBack = () => {
    if (currentLevelIndex > 0) {
      setCurrentLevelIndex(prev => prev - 1);
      setSecondsRemaining(activeStructure.levels[currentLevelIndex - 1].durationMinutes * 60);
    }
  };

  const openExternalWindow = () => {
    const width = 1200;
    const height = 800;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);
    
    // Open a new window with the specific house slug and a query param for the clock
    const url = `/c/${house.slug || house.id}?view=poker-clock-external`;
    window.open(url, 'PokerClockWindow', `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no`);
  };

  if (!currentLevel) {
    return (
      <div className="h-full flex items-center justify-center p-8 text-gray-500 text-center">
        Configure os níveis do clock nas configurações para começar.
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen bg-[#050505] text-white overflow-hidden font-sans select-none ${isFullscreen ? 'fixed inset-0 z-[100]' : 'relative'}`}>
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 0)', backgroundSize: '20px 20px' }}></div>
      
      <div className="flex-1 flex flex-col p-2 md:p-4 lg:p-6 relative z-10 overflow-hidden">
        
        {/* Header: Logo & Tournament Name */}
        <div className="flex justify-between items-center mb-2 md:mb-4 shrink-0">
          <div className="flex items-center gap-4 md:gap-6">
            {house.profile?.logoUrl ? (
              <div className="bg-white p-1 md:p-1.5 rounded-lg md:rounded-xl shadow-xl">
                <img src={house.profile.logoUrl} alt="Logo" className="h-8 md:h-12 lg:h-16 object-contain" />
              </div>
            ) : (
              <div className="w-8 h-8 md:w-12 md:h-12 lg:w-16 lg:h-16 bg-emerald-600/20 border border-emerald-500/30 rounded-lg md:rounded-xl flex items-center justify-center text-emerald-500 font-black text-lg md:text-xl">
                {house.name?.[0] || 'P'}
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-lg md:text-2xl lg:text-3xl font-black text-white uppercase tracking-tighter leading-none">
                {house.name || 'HOME POKER CLUB'}
              </span>
              <span className="text-[6px] md:text-[8px] font-black text-emerald-500 uppercase tracking-[0.5em] mt-0.5">OFFICIAL CLOCK</span>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-amber-500 font-black text-[10px] md:text-base lg:text-lg uppercase tracking-[0.2em]">{pokerClockConfig.tournamentName}</h2>
            <div className="h-0.5 md:h-1 w-12 md:w-20 bg-amber-500 ml-auto mt-1 rounded-full"></div>
          </div>
        </div>

        {/* Main Content: Full Width Timer & Blinds */}
        <div className="flex-1 flex flex-col items-center justify-center gap-2 md:gap-6 py-2 md:py-4 border border-emerald-500/20 rounded-[1.5rem] md:rounded-[3rem] bg-black/40 backdrop-blur-sm relative overflow-hidden group min-h-0">
          
          {/* ITM Animations */}
          {itmPhase === 'bubbles' && (
            <div className="absolute inset-0 z-[60] pointer-events-none overflow-hidden">
              {[...Array(30)].map((_, i) => (
                <div 
                  key={i}
                  className="absolute rounded-full bg-cyan-400/20 backdrop-blur-sm border border-cyan-400/30 animate-bubble"
                  style={{
                    width: `${Math.random() * 100 + 20}px`,
                    height: `${Math.random() * 100 + 20}px`,
                    left: `${Math.random() * 100}%`,
                    bottom: '-120px',
                    animationDuration: `${Math.random() * 3 + 2}s`,
                    animationDelay: `${Math.random() * 2}s`
                  }}
                />
              ))}
            </div>
          )}

          {itmPhase === 'message' && (
            <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-2xl animate-in fade-in zoom-in duration-500">
              <div className="text-center space-y-6">
                <div className="flex justify-center gap-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="w-4 h-4 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: `${i * 0.1}s` }}></div>
                  ))}
                </div>
                <h2 className="text-[clamp(2rem,8vw,6rem)] font-black text-white uppercase tracking-[0.2em] drop-shadow-[0_0_30px_rgba(245,158,11,0.5)]">
                  VOCÊ ESTÁ NO DINHEIRO!
                </h2>
                <p className="text-amber-500 font-black text-xl tracking-[0.5em] animate-pulse">ITM ALCANÇADO</p>
              </div>
            </div>
          )}

          <div className="absolute inset-0 border-2 border-emerald-500/10 rounded-[1.5rem] md:rounded-[3rem] pointer-events-none"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-emerald-500/40 blur-sm rounded-full"></div>
          
          {/* Nível no canto superior esquerdo do retângulo */}
          <div className="absolute top-3 md:top-6 left-4 md:left-8 z-20">
            <h3 className="text-[10px] md:text-lg lg:text-xl font-black text-gray-500 uppercase tracking-widest">
              {currentLevel.isBreak ? 'INTERVALO' : `NÍVEL ${currentLevelIndex + 1}`}
            </h3>
          </div>

          {/* Stats: Players & Prize (Top Right) */}
          <div className="absolute top-3 md:top-6 right-4 md:right-8 z-20 flex gap-4 md:gap-8 text-right">
            <div className="flex flex-col">
              <span className="text-[clamp(6px,1vw,10px)] font-black text-gray-600 uppercase tracking-widest">Jogadores</span>
              <span className="text-[clamp(0.75rem,2vw,1.5rem)] font-black text-white">
                {pokerClockConfig.playersRemaining || 0} / {pokerClockConfig.totalPlayers || 0}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[clamp(6px,1vw,10px)] font-black text-gray-600 uppercase tracking-widest">Premiação Total</span>
              <span className="text-[clamp(0.75rem,2vw,1.5rem)] font-black text-amber-500">
                R$ {(pokerClockConfig.totalPrize || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Prize Distribution (ITM) - Left Side */}
          {pokerClockConfig.prizeDistribution && pokerClockConfig.prizeDistribution.length > 0 && (
            <div className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 hidden xl:flex flex-col gap-2">
              <div className="bg-black/60 backdrop-blur-xl p-6 rounded-[2.5rem] border border-emerald-500/20 shadow-2xl min-w-[280px] animate-in slide-in-from-left-4 duration-700">
                <div className="flex items-center gap-2 mb-4 border-b border-emerald-500/10 pb-3">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                  <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">Premiação ITM</h4>
                </div>
                <div className="space-y-4">
                  {pokerClockConfig.prizeDistribution.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-10 group">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-gray-500 group-hover:text-gray-300 transition-colors">{p.position}º LUGAR</span>
                        <span className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">{p.percentage}%</span>
                      </div>
                      <span className="text-base font-black text-amber-500 tracking-tight drop-shadow-sm">
                        R$ {p.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tempo Restante Centralizado no Topo */}
          <div className="relative shrink-0 mt-2 md:mt-4">
            <div className="text-[clamp(3rem,18vh,14rem)] font-black leading-none tracking-tighter text-cyan-400 drop-shadow-[0_0_30px_rgba(34,211,238,0.3)] font-mono">
              {formatTime(secondsRemaining)}
            </div>
            <div className="absolute -top-2 md:-top-4 left-1/2 -translate-x-1/2 text-[clamp(6px,1.5vh,10px)] font-black text-cyan-400/50 uppercase tracking-[0.6em] whitespace-nowrap">
              TEMPO RESTANTE
            </div>
          </div>

          {/* Blinds e Ante no Centro */}
          {!currentLevel.isBreak && (
            <div className="flex flex-col items-center gap-1 md:gap-2 shrink-0">
              <div className="flex flex-col items-center">
                <span className="text-[clamp(6px,1.5vh,10px)] font-black text-emerald-500/50 uppercase tracking-[0.4em] mb-0.5 md:mb-1">BLINDS</span>
                <span className="text-[clamp(1.5rem,12vh,8rem)] font-black text-white tracking-tighter leading-none">
                  {currentLevel.smallBlind.toLocaleString()} / {currentLevel.bigBlind.toLocaleString()}
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[clamp(6px,1.5vh,10px)] font-black text-emerald-500/50 uppercase tracking-[0.4em] mb-0 md:mb-0.5">ANTE</span>
                <span className="text-[clamp(1rem,8vh,6rem)] font-black text-emerald-400 tracking-tighter">
                  {currentLevel.ante.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {nextLevel && (
            <div className="flex flex-col items-center gap-0.5 md:gap-1 bg-white/5 px-4 md:px-10 py-2 md:py-3 rounded-lg md:rounded-[2rem] border border-white/10 shrink-0 mb-1">
              <span className="text-[clamp(6px,1vw,10px)] font-black text-gray-500 uppercase tracking-widest">PRÓXIMO NÍVEL</span>
              <span className="text-[clamp(0.75rem,2.5vw,2.25rem)] font-black text-white text-center">
                {nextLevel.isBreak ? 'INTERVALO' : `${nextLevel.smallBlind.toLocaleString()} / ${nextLevel.bigBlind.toLocaleString()} (Ante: ${nextLevel.ante.toLocaleString()})`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Control Bar */}
      <div className={`bg-black/90 backdrop-blur-xl border-t border-white/10 p-4 flex items-center justify-between px-8 transition-all duration-500 z-[110] ${isFullscreen || isExternal ? 'opacity-0 hover:opacity-100 absolute bottom-0 left-0 right-0 transform translate-y-2 hover:translate-y-0' : ''}`}>
        {(isFullscreen || isExternal) && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-1 rounded-full border border-white/10 pointer-events-none opacity-50 group-hover:opacity-0 transition-opacity">
            <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">Passe o mouse aqui para controles</span>
          </div>
        )}
        <div className="flex items-center gap-4">
          <button onClick={handleBack} className="p-3 text-gray-400 hover:text-white transition-all"><SkipBack size={24} /></button>
          <button 
            onClick={() => setIsRunning(!isRunning)} 
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${isRunning ? 'bg-amber-500 text-black shadow-amber-500/20' : 'bg-emerald-600 text-white shadow-emerald-600/20'}`}
          >
            {isRunning ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
          </button>
          <button onClick={handleSkip} className="p-3 text-gray-400 hover:text-white transition-all"><SkipForward size={24} /></button>
          <button onClick={handleReset} className="p-3 text-gray-400 hover:text-red-500 transition-all ml-4" title="Reiniciar Nível"><RotateCcw size={20} /></button>
        </div>

        <div className="flex items-center gap-6">
          <button onClick={() => setIsMuted(!isMuted)} className="p-3 text-gray-400 hover:text-white transition-all">
            {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
          </button>
          <button 
            onClick={openExternalWindow} 
            className="p-3 text-cyan-500 hover:text-cyan-400 transition-all flex items-center gap-2"
            title="Abrir em Nova Janela"
          >
            <Maximize size={24} />
          </button>
          <button onClick={toggleFullscreen} className="p-3 text-gray-400 hover:text-white transition-all">
            {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PokerClock;
