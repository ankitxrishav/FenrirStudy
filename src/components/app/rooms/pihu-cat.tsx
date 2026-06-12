"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useUser, useFirestore } from "@/firebase";
import { useTimer } from "@/hooks/use-timer";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { Button } from "@/components/ui/button";

// ─── Cat States ─────────────────────────────────────────────────────────────
enum CatState {
  Sleeping,
  Walking,
  Exploring,
  Sitting,
  Watching,
  Playing,
  Talking,
  Grooming,
  Stretching,
  Climbing,
  Celebrating,
}

type CatEmotion = "Happy" | "Curious" | "Excited" | "Sleepy" | "Hungry" | "Proud" | "Surprised" | "Sad";
type CosmeticItem = "none" | "santa" | "pumpkin" | "scarf" | "crown";
type CatSkin = "orange" | "tuxedo" | "calico" | "siamese" | "grey";

interface SkinColors {
  primary: string;
  secondary: string;
  belly: string;
  earInner: string;
  earOuter: string;
  eyeColor: string;
  snout?: string;
  stripesColor?: string;
  hasCalicoPatches?: boolean;
}

const SKINS: Record<CatSkin, SkinColors> = {
  orange: {
    primary: "#f97316",
    secondary: "#ea580c",
    belly: "#ffffff",
    earInner: "#fda4af",
    earOuter: "#f97316",
    eyeColor: "#1e293b",
    stripesColor: "#ea580c",
  },
  tuxedo: {
    primary: "#18181b",
    secondary: "#09090b",
    belly: "#ffffff",
    earInner: "#fda4af",
    earOuter: "#18181b",
    eyeColor: "#1e293b",
    snout: "#ffffff",
  },
  calico: {
    primary: "#f8fafc",
    secondary: "#ea580c",
    belly: "#ffffff",
    earInner: "#fda4af",
    earOuter: "#f8fafc",
    eyeColor: "#1e293b",
    hasCalicoPatches: true,
  },
  siamese: {
    primary: "#f5f5f4",
    secondary: "#451a03",
    belly: "#fafaf9",
    earInner: "#fda4af",
    earOuter: "#451a03",
    eyeColor: "#0284c7",
    snout: "#451a03",
  },
  grey: {
    primary: "#64748b",
    secondary: "#475569",
    belly: "#f1f5f9",
    earInner: "#fda4af",
    earOuter: "#64748b",
    eyeColor: "#1e293b",
    stripesColor: "#334155",
  },
};

interface Toy {
  id: number;
  type: "ball" | "yarn" | "feather";
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  emoji: string;
}

// ─── Play Synthesized Audio ──────────────────────────────────────────────────
const playMeowSound = (muted: boolean) => {
  if (muted) return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "sine";
    const now = ctx.currentTime;
    
    osc.frequency.setValueAtTime(560, now);
    osc.frequency.exponentialRampToValueAtTime(860, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.3);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.04); // low volume (< 15%)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.32);
  } catch (e) {
    console.error(e);
  }
};

const playPurrSound = (muted: boolean) => {
  if (muted) return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "sawtooth";
    osc.frequency.value = 26;
    
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    mod.frequency.value = 10;
    modGain.gain.value = 0.04;
    
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.01, now);
    
    mod.connect(modGain);
    modGain.connect(gain.gain);
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    mod.start(now);
    
    osc.stop(now + 1.5);
    mod.stop(now + 1.5);
  } catch (e) {
    console.error(e);
  }
};

const playNapSnoore = (muted: boolean) => {
  if (muted) return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.value = 80;
    
    const now = ctx.currentTime;
    // Slow breathing rate
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.006, now + 0.8);
    gain.gain.linearRampToValueAtTime(0.001, now + 1.8);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 1.9);
  } catch (e) {
    console.error(e);
  }
};

// ─── 200 Unique Cat Dialogues Pool ───────────────────────────────────────────
const PIHU_POOL = [
  // Wholesome & Loving
  "Hi! I'm Pihu 🐱",
  "I think you're doing great today.",
  "This room feels cozy.",
  "I'm happy to study with you.",
  "Your brain is getting stronger! 🧠",
  "Purr... your focus is comforting.",
  "You've got this, human!",
  "I love watching you make progress.",
  "Sending you warm kitty energy! ✨",
  "We are a great team, aren't we?",
  "You're working so hard, I'm proud of you!",
  "Take a deep breath. You are doing fine.",
  "A little progress every day adds up.",
  "I'll be right here supporting you.",
  "Your dedication is amazing!",
  "You are smarter than you think.",
  "Keep shining, study star! ⭐",
  "Every page you read makes me happy.",
  "I believe in you! 💖",
  "Focusing is hard, but you're winning.",
  "Your effort today is beautiful.",
  "Just do your best, that's enough.",
  "Studying is easier when we do it together.",
  "You're building a great future.",
  "Stay positive! 🌸",
  "I'm cheerleading for you silently.",
  "Your streak is a work of art.",
  "Believe in your dreams, human.",
  "You are awesome, don't forget it!",
  "One task at a time, you'll get there.",
  "Success is made of small steps like this.",
  "Your focus is inspiring.",
  "Let's win the day! 🏆",
  "You are capable of great things.",
  "I'm sending you a virtual hug.",
  "Keep going, you're almost there!",
  "Your mind is a powerful thing.",
  "Every minute you spend studying matters.",
  "So glad you logged in today.",
  "You make this room feel special.",

  // Accountability & Study Reminders
  "I'm keeping an eye on everyone studying.",
  "You should probably focus right now 👀",
  "Have you completed today's goal?",
  "Study first, play later!",
  "Concentrate, human!",
  "25 minutes of work, then headpats!",
  "Focus! I see you checking social media...",
  "Is that phone really more interesting than your goals?",
  "Time to get to work! 💼",
  "The distraction monster is near, stay focused!",
  "Mrow! No procrastinating allowed!",
  "Your future self will thank you for this session.",
  "Put the distractions away for a bit.",
  "Make today count!",
  "Focus on the task, ignore the noise.",
  "Can you study for just 10 more minutes?",
  "Keep your eyes on the screen!",
  "Don't give up now, you've started!",
  "Stay disciplined, human.",
  "Consistency is the key to success.",
  "Turn off notifications, turn on study mode.",
  "Your goals are waiting for you.",
  "Let's check off that to-do list!",
  "Procrastinating is boring. Action is fun!",
  "Focus now, relax later with a guilt-free mind.",
  "Make this session your best one yet.",
  "No shortcuts to success, keep pushing!",
  "Stay focused, study companion.",
  "One focused hour is worth ten distracted hours.",
  "Are you working on your high-priority task?",
  "Push through the laziness!",
  "Doubt kills more dreams than failure ever will. Focus!",
  "You didn't come this far to only come this far.",
  "Do it for your future.",
  "Every session brings you closer to mastery.",
  "Success demands focus.",
  "Don't stop when you're tired, stop when you're done.",
  "Set a timer and let's go!",
  "Your potential is endless, don't waste it.",
  "Concentration is a muscle. Train it now.",

  // Cat Logic & Funny
  "Don't tell anyone, but I own this room.",
  "Humans study. Cats supervise.",
  "I think this room needs more treats.",
  "I already had three naps today. Ready for my fourth.",
  "I like sitting on dashboards.",
  "I caught a bug, but it wasn't in your code.",
  "If you don't study, I will chew on your charger cable.",
  "Why do humans write code when they could chase lasers?",
  "I'm on patrol.",
  "I need a nap.",
  "Cats are liquid. I fit perfectly on this card.",
  "I think the leaderboard needs a crown for me.",
  "Your keyboard is warm. It is mine now.",
  "I'm not sleeping, I'm meditating on your progress.",
  "Did you know cats sleep 16 hours a day? I'm under-sleeping!",
  "If I fit, I sit.",
  "My brain is 90% thoughts of tuna.",
  "Why do you look at that glowing box all day?",
  "I approve of your streak.",
  "Mrow! *stretches tail*",
  "Feed me and I'll write your code. Maybe.",
  "I am the silent manager of this workspace.",
  "Can you write a program that spawns virtual fish?",
  "Meow is a universal programming language.",
  "I saw a red dot earlier. It escaped.",
  "Don't mind me, I'm just debug-catting.",
  "Your desk is nice, but the floor is also nice.",
  "Are you studying physics? Can you explain gravity to my toy ball?",
  "I have calculated that I need 10 pats per minute.",
  "My favorite key on your keyboard is the Spacebar. It's big.",
  "I am Pihu, conqueror of cardboard boxes.",
  "This room has excellent acoustics for meowing.",
  "I have a degree in Cat-climbing.",
  "Do you mind if I nap on your cursor?",
  "My claws are fully compiled and ready.",
  "If you study hard, I might let you pet my belly.",
  "I run at 60 purrs per second.",
  "Cats don't have deadlines. We have nap-lines.",
  "I am testing the friction coefficient of this navbar.",
  "Tuna is the ultimate productivity fuel.",

  // Mischief & Playfulness
  "Zoomies mode activated! Catch me if you can! 💨",
  "Is that a laser pointer in your pocket?",
  "Let's play with the yarn ball!",
  "I might knock a glass of water off your desk later. Just warning you.",
  "I hear a bird outside. Urgent business!",
  "What happens if I press this key? Oops.",
  "I'm plotting to capture the red dot.",
  "My tail has a mind of its own today.",
  "I am Pihu, the stealth ninja of study rooms.",
  "I will sit on your book until you pay attention.",
  "Look! A butterfly! 🦋",
  "Are we playing or studying? Can we do both?",
  "I'm practicing my pounces.",
  "I just did a backflip. Did you see it?",
  "Cardboard boxes are superior to any study chair.",
  "I'm hiding. You can't see my ears, right?",
  "I hear rustling... is that a treat bag?!",
  "I can run really fast when I want to.",
  "I'm chasing my tail to generate focus energy.",
  "My claws are sharp, but my heart is soft.",
  "I'm checking the corners for monsters.",
  "Pouncing mode: engaged.",
  "I am Pihu, queen of the carpet.",
  "What's behind this card? Let me peek.",
  "I like to wiggle my butt before I pounce.",
  "Let's play chase!",
  "I'm testing the limits of your screen bounds.",
  "I just chased a ghost. You're welcome.",
  "I might hide in a box later.",
  "Mischief is just unfocused energy.",
  "I like when things bounce.",
  "Watch me climb this element!",
  "I am a master of disguise.",
  "Did you hear that? I think it was a mouse.",
  "I'm doing research on cardboard boxes.",
  "I can jump really high!",
  "My whiskers detect a high density of study vibes.",
  "I'm wiggling my ears to catch your thoughts.",
  "Everything is a toy if you are brave enough.",
  "Let's make some happy chaos! 🎉",

  // Wisdom & Cozy Vibes
  "Study first. Rest well. Pet cat.",
  "This study room feels like a safe haven.",
  "Remember to drink water, human. 💧",
  "A cozy room makes hard work feel easy.",
  "Don't stress, just take it one step at a time.",
  "The secret to productivity is a comfortable nap spot.",
  "Knowledge is like catnip for the mind.",
  "Keep your mind calm and your focus sharp.",
  "A clean workspace is a happy workspace.",
  "Your brain needs breaks. Remember to rest.",
  "Wisdom begins in quiet observation.",
  "It is cozy in here. Let's make it a great session.",
  "Success is a journey, not a destination.",
  "The cozy warmth of study is like sunshine on fur.",
  "Stay curious, keep learning.",
  "Errors are just paths to correct answers.",
  "Resting is part of the study cycle.",
  "A quiet mind can achieve anything.",
  "Study hard, dream big.",
  "There is joy in focused work.",
  "Let's make this space a harbor of peace.",
  "Your effort is never wasted.",
  "Be patient with yourself.",
  "Learning is an adventure.",
  "This cozy room is where dreams are built.",
  "Your focus creates a beautiful silence.",
  "The best sessions are the ones where you just start.",
  "Keep your energy high and your doubts low.",
  "Cozy vibes only in this study zone.",
  "Let's create something wonderful today.",
  "Your mind is a garden, tend to it.",
  "Peace is found in complete absorption.",
  "You are doing fine. Focus and flow.",
  "The magic happens when you don't quit.",
  "This cozy room is our little sanctuary.",
  "A sharp focus is like a laser beam.",
  "We are building something great together.",
  "Calm focus wins the race.",
  "Let the study flow take over.",
  "A cozy meow of approval for your work! 🐾"
];

export function PihuCat({ greetingMode }: { greetingMode?: boolean }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { isActive: timerActive } = useTimer();

  // constants
  const CAT_WIDTH = 74;
  const CAT_HEIGHT = 64;
  const GRAVITY = 0.28;
  const FRICTION = 0.92;
  const WALK_SPEED = 1.4;

  // React States for rendering-only updates
  const [currentState, setCurrentState] = useState<CatState>(CatState.Sitting);
  const [currentEmotion, setCurrentEmotion] = useState<CatEmotion>("Happy");
  const [cosmetic, setCosmetic] = useState<CosmeticItem>("none");
  const [isMuted, setIsMuted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [speech, setSpeech] = useState<string | null>(null);
  const [catSkin, setCatSkin] = useState<CatSkin>("orange");
  
  // Needs & Relationship (persisted)
  const [needs, setNeeds] = useState({ hunger: 25, energy: 90, affection: 60 });
  const [relationship, setRelationship] = useState({ points: 20, level: "Stranger" });
  const [inventory, setInventory] = useState({ fish: 2, milk: 3, tuna: 1, treats: 5 });
  const [toys, setToys] = useState<Toy[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [isWalking, setIsWalking] = useState(false);
  const [dialoguePool, setDialoguePool] = useState<string[]>([]);

  // Refs for high performance physics & tracking
  const catRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const innerWrapperRef = useRef<HTMLDivElement>(null);
  const speechTimer = useRef<NodeJS.Timeout | null>(null);
  const audioInterval = useRef<NodeJS.Timeout | null>(null);
  const lastSessionCount = useRef<number>(-1);
  const mousePos = useRef({ x: 0, y: 0 });
  const toysRef = useRef<Toy[]>([]);
  const isMutedRef = useRef(isMuted);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressTriggered = useRef(false);

  const physics = useRef({
    x: 100,
    y: 300,
    vx: 0,
    vy: 0,
    state: CatState.Sitting,
    emotion: "Happy" as CatEmotion,
    direction: "right" as "left" | "right",
    isWalking: false,
    climbingSide: null as "left" | "right" | "screen-left" | "screen-right" | null,
    anchoredPlatform: null as { id: string; element: HTMLElement } | null,
    actionTimer: 60,
    isDragging: false,
    dragOffsetX: 0,
    dragOffsetY: 0,
    jumpPreSquatTimer: 0,
    pendingJump: null as { vx: number; vy: number } | null,
    landingCushionTimer: 0,
    wasAirborne: false,
    stepPhase: 0,
  });

  const lastRendered = useRef({
    state: CatState.Sitting,
    emotion: "Happy" as CatEmotion,
    direction: "right" as "left" | "right",
    isWalking: false,
  });

  const dragStartPos = useRef({ x: 0, y: 0, time: 0, touchX: 0, touchY: 0 });

  // ─── Sync Mute status ───
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // ─── Computed Affection Level ───
  const relationshipLevel = useMemo(() => {
    const pts = relationship.points;
    if (pts >= 300) return "Cat Chosen One 👑";
    if (pts >= 200) return "Human Servant 🧹";
    if (pts >= 120) return "Best Friend 🌟";
    if (pts >= 60) return "Buddy 🤝";
    if (pts >= 25) return "Friend 🌸";
    return "Stranger 🐾";
  }, [relationship.points]);

  // Load States from LocalStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedAff = localStorage.getItem("pihu_affection");
    const storedInv = localStorage.getItem("pihu_inventory");
    const storedCos = localStorage.getItem("pihu_cosmetic");
    const storedMute = localStorage.getItem("pihu_muted");
    const storedSkin = localStorage.getItem("pihu_skin");
    
    if (storedAff) setRelationship(JSON.parse(storedAff));
    if (storedInv) setInventory(JSON.parse(storedInv));
    if (storedCos) setCosmetic(storedCos as CosmeticItem);
    if (storedMute) setIsMuted(storedMute === "true");
    if (storedSkin) setCatSkin(storedSkin as CatSkin);
  }, []);

  const handleSkinChange = (skin: CatSkin) => {
    setCatSkin(skin);
    localStorage.setItem("pihu_skin", skin);
    spawnParticles("✨", 6);
    playMeowSound(isMutedRef.current);
  };

  const saveAffection = (pts: number) => {
    const newRelationship = { points: pts, level: relationshipLevel };
    setRelationship(newRelationship);
    localStorage.setItem("pihu_affection", JSON.stringify(newRelationship));
  };

  const saveInventory = (inv: typeof inventory) => {
    setInventory(inv);
    localStorage.setItem("pihu_inventory", JSON.stringify(inv));
  };

  const handleMuteToggle = () => {
    const val = !isMuted;
    setIsMuted(val);
    localStorage.setItem("pihu_muted", String(val));
  };

  // Particle Emitter
  const spawnParticles = (emoji: string, count = 6) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: Math.random() + Date.now(),
        x: Math.random() * 80 - 40,
        y: Math.random() * 30 - 30,
        emoji,
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(n => n.id === p.id)));
    }, 1500);
  };

  // Dialogue Bubble
  const triggerDialogue = () => {
    let pool = [...dialoguePool];
    if (pool.length === 0) {
      pool = [...PIHU_POOL].sort(() => Math.random() - 0.5);
    }
    const nextMsg = pool.pop();
    if (nextMsg) {
      setDialoguePool(pool);
      setSpeech(nextMsg);
      if (speechTimer.current) clearTimeout(speechTimer.current);
      speechTimer.current = setTimeout(() => setSpeech(null), 4000);
    }
  };

  // Smart Study Reward Sync
  useEffect(() => {
    if (!firestore || !user) return;
    
    const q = query(
      collection(firestore, "sessions"),
      where("userId", "==", user.uid),
      orderBy("startTime", "desc"),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, snap => {
      if (snap.empty) return;
      const count = snap.size;
      if (lastSessionCount.current === -1) {
        lastSessionCount.current = count;
        return;
      }

      const latest = snap.docs[0].data();
      if (latest && latest.duration > 10) {
        setInventory(prev => {
          const updated = { ...prev, treats: prev.treats + 1 };
          saveInventory(updated);
          return updated;
        });

        physics.current.state = CatState.Celebrating;
        physics.current.emotion = "Excited";
        physics.current.vx = 0;
        physics.current.vy = 0;
        physics.current.actionTimer = 250;
        
        spawnParticles("🎉", 12);
        setSpeech("WE DID IT! You finished a study session! Here is a Treat! 🍪");
        playMeowSound(isMutedRef.current);
      }
    });

    return () => unsubscribe();
  }, [firestore, user, greetingMode]);

  useEffect(() => {
    if (greetingMode) {
      setTimeout(() => {
        setSpeech("Hi! I'm Pihu! I'm here to help you focus. Pet me for options! 🐾");
        spawnParticles("✨", 8);
        playMeowSound(isMutedRef.current);
        setTimeout(() => setSpeech(null), 8000);
      }, 800);
    }
  }, [greetingMode]);

  // Audio synthesis loop
  useEffect(() => {
    if (isMuted) return;
    const playIdleSound = () => {
      const p = physics.current;
      if (p.state === CatState.Sleeping) {
        playNapSnoore(isMutedRef.current);
      } else if (p.state === CatState.Watching && Math.random() > 0.6) {
        playPurrSound(isMutedRef.current);
      } else if (Math.random() > 0.85) {
        playMeowSound(isMutedRef.current);
      }
    };
    audioInterval.current = setInterval(playIdleSound, 8000 + Math.random() * 9000);
    return () => {
      if (audioInterval.current) clearInterval(audioInterval.current);
    };
  }, [isMuted]);

  // DOM platform scanner
  interface ScannedPlatform {
    id: string;
    left: number;
    right: number;
    top: number;
    bottom: number;
    width: number;
    height: number;
    element: HTMLElement;
  }

  const scanPlatforms = (): ScannedPlatform[] => {
    if (typeof window === "undefined") return [];
    const selectors = [
      "#room-pill-nav",
      "#bottom-mobile-nav",
      "#streak-banner",
      "#leaderboard-panel",
      "#analytics-panel",
      "#shared-focus-card",
      ".member-card"
    ];
    const platforms: ScannedPlatform[] = [];
    selectors.forEach(sel => {
      const els = document.querySelectorAll(sel);
      els.forEach((el, index) => {
        const htmlEl = el as HTMLElement;
        const rect = htmlEl.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          platforms.push({
            id: `${sel}-${index}`,
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height,
            element: htmlEl
          });
        }
      });
    });
    return platforms;
  };

  const checkClimbablePlatform = () => {
    const platforms = scanPlatforms();
    const p = physics.current;
    const catBottom = p.y + CAT_HEIGHT;
    
    for (const plat of platforms) {
      const isVerticallyAligned = catBottom > plat.top && p.y < plat.bottom;
      if (isVerticallyAligned) {
        const distToLeft = Math.abs((p.x + CAT_WIDTH) - plat.left);
        if (distToLeft < 15) return { platform: plat, side: "left" as const };
        
        const distToRight = Math.abs(p.x - plat.right);
        if (distToRight < 15) return { platform: plat, side: "right" as const };
      }
    }
    return null;
  };

  // Turn around helper
  const turnAround = () => {
    const p = physics.current;
    p.direction = p.direction === "left" ? "right" : "left";
    if (p.state === CatState.Walking) {
      p.vx = p.direction === "right" ? WALK_SPEED : -WALK_SPEED;
    }
  };

  const startScreenClimbing = (side: "screen-left" | "screen-right") => {
    const p = physics.current;
    p.state = CatState.Climbing;
    p.climbingSide = side;
    p.vy = -1.2;
    p.vx = 0;
    p.isWalking = false;
    p.anchoredPlatform = null;
  };

  // Physics update engine
  const updatePhysics = (dt: number) => {
    const p = physics.current;
    if (p.isDragging) return;

    // Handle pre-squat jump anticipation timer
    if (p.jumpPreSquatTimer > 0) {
      p.jumpPreSquatTimer -= dt;
      p.vx = 0;
      p.vy = 0;
      if (p.jumpPreSquatTimer <= 0) {
        p.jumpPreSquatTimer = 0;
        if (p.pendingJump) {
          p.vx = p.pendingJump.vx;
          p.vy = p.pendingJump.vy;
          p.state = CatState.Exploring;
          p.isWalking = false;
          p.anchoredPlatform = null;
          p.pendingJump = null;
          p.wasAirborne = true;
        }
      }
      return; // Freeze in place during crouch preparation
    }

    // Handle landing cushion decay timer
    if (p.landingCushionTimer > 0) {
      p.landingCushionTimer -= dt;
      if (p.landingCushionTimer < 0) p.landingCushionTimer = 0;
    }

    if (menuOpen) {
      p.vx = 0;
      if (p.state === CatState.Walking) {
        p.state = CatState.Sitting;
        p.isWalking = false;
      }
      // Apply gravity if mid-air so she lands
      const floorY = window.innerHeight - CAT_HEIGHT;
      if (!p.anchoredPlatform && p.y < floorY) {
        p.vy += GRAVITY * dt;
        p.y += p.vy * dt;
        if (p.y >= floorY) {
          p.y = floorY;
          p.vy = 0;
          if (p.wasAirborne) {
            p.landingCushionTimer = 12;
            p.wasAirborne = false;
          }
        }
      } else {
        p.vy = 0;
      }
      return;
    }

    // Apply gravity
    if (!p.anchoredPlatform && p.state !== CatState.Climbing) {
      p.vy += GRAVITY * dt;
    }

    // Track if airborne (for landing cushion trigger)
    const floorY = window.innerHeight - CAT_HEIGHT;
    if (!p.anchoredPlatform && p.state !== CatState.Climbing && p.y < floorY) {
      p.wasAirborne = true;
    }

    // Modulate walking speed organically with sinusoidal gait waves
    if (p.state === CatState.Walking) {
      p.stepPhase = (p.stepPhase ?? 0) + 0.25 * dt;
      const directionMult = p.direction === "right" ? 1 : -1;
      p.vx = directionMult * WALK_SPEED * (1.0 + 0.35 * Math.sin(p.stepPhase * 2.0));
    } else {
      p.stepPhase = 0;
    }

    // Apply velocities
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Keep horizontal on-screen bounds
    const maxLeft = 5;
    const maxRight = window.innerWidth - CAT_WIDTH - 5;
    if (p.x < maxLeft) {
      p.x = maxLeft;
      p.vx = 0;
      if (p.state === CatState.Walking) {
        if (Math.random() < 0.35) startScreenClimbing("screen-left");
        else turnAround();
      }
    } else if (p.x > maxRight) {
      p.x = maxRight;
      p.vx = 0;
      if (p.state === CatState.Walking) {
        if (Math.random() < 0.35) startScreenClimbing("screen-right");
        else turnAround();
      }
    }

    // Floor collision
    if (p.y >= floorY) {
      p.y = floorY;
      p.vy = 0;
      if (p.wasAirborne) {
        p.landingCushionTimer = 12;
        p.wasAirborne = false;
      }
      if (p.state !== CatState.Walking) {
        p.vx *= FRICTION;
      }
      if (p.state === CatState.Exploring) {
        p.state = CatState.Sitting;
        p.isWalking = false;
        p.vx = 0;
      }
    }

    // Platform collision top-landing
    if (!p.anchoredPlatform && p.vy > 0 && p.state !== CatState.Climbing) {
      const platforms = scanPlatforms();
      platforms.sort((a, b) => a.top - b.top);
      for (const plat of platforms) {
        const catBottom = p.y + CAT_HEIGHT;
        const prevBottom = p.y - p.vy * dt + CAT_HEIGHT;
        if (prevBottom <= plat.top + 3 && catBottom >= plat.top - 2) {
          if (p.x + CAT_WIDTH > plat.left && p.x < plat.right) {
            p.y = plat.top - CAT_HEIGHT;
            p.vy = 0;
            p.vx = 0;
            p.anchoredPlatform = { id: plat.id, element: plat.element };
            p.state = CatState.Sitting;
            p.isWalking = false;
            if (p.wasAirborne) {
              p.landingCushionTimer = 12;
              p.wasAirborne = false;
            }
            break;
          }
        }
      }
    }

    // Platform anchor updates & walking limits
    if (p.anchoredPlatform) {
      const rect = p.anchoredPlatform.element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        p.anchoredPlatform = null;
      } else {
        p.y = rect.top - CAT_HEIGHT;
        if (p.state === CatState.Walking) {
          if (p.x + CAT_WIDTH < rect.left || p.x > rect.right) {
            p.anchoredPlatform = null;
            p.state = CatState.Exploring; // fall
            p.vy = 0;
            p.isWalking = false;
          }
        }
      }
    }

    // Climbing platform updates
    if (p.state === CatState.Climbing && p.anchoredPlatform) {
      const rect = p.anchoredPlatform.element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        p.state = CatState.Exploring;
        p.anchoredPlatform = null;
        p.climbingSide = null;
      } else {
        p.x = p.climbingSide === "left" ? rect.left - CAT_WIDTH : rect.right;
        if (p.y + CAT_HEIGHT <= rect.top + 4) {
          // Reached top! Land on top
          p.y = rect.top - CAT_HEIGHT;
          p.vy = 0;
          p.vx = 0;
          p.x = p.climbingSide === "left" ? rect.left + 5 : rect.right - CAT_WIDTH - 5;
          p.climbingSide = null;
          p.state = CatState.Sitting;
          p.isWalking = false;
        }
      }
    }

    // Climbing screen edge update
    if (p.state === CatState.Climbing && (p.climbingSide === "screen-left" || p.climbingSide === "screen-right")) {
      p.x = p.climbingSide === "screen-left" ? 5 : window.innerWidth - CAT_WIDTH - 5;
      if (p.y < 80) {
        p.vy = -1.5;
        p.vx = p.climbingSide === "screen-left" ? 2.2 : -2.2;
        p.climbingSide = null;
        p.state = CatState.Exploring;
      }
    }
  };

  // Toys physics loops
  const updateToysPhysics = (dt: number) => {
    const gravity = 0.28;
    const bounce = -0.52;
    const friction = 0.97;
    const TOY_SIZE = 32;
    const platforms = scanPlatforms();

    toysRef.current.forEach(toy => {
      toy.vy += gravity * dt;
      toy.x += toy.vx * dt;
      toy.y += toy.vy * dt;

      // floor collision
      const floorY = window.innerHeight - TOY_SIZE;
      if (toy.y >= floorY) {
        toy.y = floorY;
        toy.vy = toy.vy * bounce;
        toy.vx *= friction;
        if (Math.abs(toy.vy) < 0.5) toy.vy = 0;
      }

      // walls collision
      if (toy.x < 5) {
        toy.x = 5;
        toy.vx = -toy.vx * 0.7;
      } else if (toy.x > window.innerWidth - TOY_SIZE - 5) {
        toy.x = window.innerWidth - TOY_SIZE - 5;
        toy.vx = -toy.vx * 0.7;
      }

      // platform landing
      if (toy.vy > 0) {
        for (const plat of platforms) {
          const toyBottom = toy.y + TOY_SIZE;
          const prevToyBottom = toy.y - toy.vy * dt + TOY_SIZE;
          if (prevToyBottom <= plat.top + 3 && toyBottom >= plat.top - 2) {
            if (toy.x + TOY_SIZE > plat.left && toy.x < plat.right) {
              toy.y = plat.top - TOY_SIZE;
              toy.vy = toy.vy * bounce;
              toy.vx *= friction;
              if (Math.abs(toy.vy) < 0.5) toy.vy = 0;
              break;
            }
          }
        }
      }

      // collision with cat feet
      const p = physics.current;
      if (p.state !== CatState.Sleeping && !p.isDragging) {
        const catCenterX = p.x + CAT_WIDTH / 2;
        const catCenterY = p.y + CAT_HEIGHT / 2;
        const toyCenterX = toy.x + TOY_SIZE / 2;
        const toyCenterY = toy.y + TOY_SIZE / 2;
        const dist = Math.sqrt(Math.pow(toyCenterX - catCenterX, 2) + Math.pow(toyCenterY - catCenterY, 2));
        
        if (dist < 46) {
          toy.vy = -3 - Math.random() * 3;
          toy.vx = (toyCenterX > catCenterX ? 3 : -3) * (Math.random() * 0.5 + 0.8);
          p.state = CatState.Playing;
          p.emotion = "Excited";
          p.actionTimer = 45;
          spawnParticles("💥", 4);
          playMeowSound(isMutedRef.current);
        }
      }

      // Sync DOM transform
      const el = document.getElementById(`toy-${toy.id}`);
      if (el) {
        el.style.transform = `translate3d(${toy.x}px, ${toy.y}px, 0)`;
      }
    });
  };

  // AI Decision Engine
  const makeAIDecision = () => {
    const p = physics.current;

    // Decrement needs dynamically in the background
    setNeeds(prev => {
      const nextHunger = Math.min(100, prev.hunger + (p.state === CatState.Sleeping ? 0.2 : 0.5));
      const nextEnergy = Math.max(0, prev.energy + (p.state === CatState.Sleeping ? 2.5 : -0.4));
      const nextAff = Math.max(0, prev.affection - 0.2);
      
      let newEmotion = p.emotion;
      if (nextHunger > 75) newEmotion = "Hungry";
      else if (nextEnergy < 25) newEmotion = "Sleepy";
      else if (nextAff < 30) newEmotion = "Sad";
      
      p.emotion = newEmotion as CatEmotion;
      return { hunger: Math.round(nextHunger), energy: Math.round(nextEnergy), affection: Math.round(nextAff) };
    });
    
    if (menuOpen) {
      p.state = CatState.Sitting;
      p.vx = 0;
      p.vy = 0;
      p.isWalking = false;
      return;
    }
    
    if (p.state === CatState.Sleeping && Math.random() > 0.15) return;
    if (p.state === CatState.Celebrating || p.state === CatState.Playing) {
      p.state = CatState.Sitting;
      p.emotion = "Happy";
    }

    // Chase toy AI if active
    if (toysRef.current.length > 0 && Math.random() < 0.8) {
      const toy = toysRef.current[0];
      const dist = toy.x - p.x;
      
      if (toy.y < p.y - 45 && !p.anchoredPlatform) {
        const g = GRAVITY;
        const peakY = Math.min(p.y, toy.y) - 50;
        const h1 = p.y - peakY;
        const h2 = toy.y - peakY;
        if (h1 > 0 && h2 > 0) {
          const targetVy = -Math.sqrt(2 * g * h1);
          const t1 = -targetVy / g;
          const t2 = Math.sqrt(2 * h2 / g);
          const targetVx = dist / (t1 + t2);

          // Trigger pre-squat anticipation
          p.jumpPreSquatTimer = 16;
          p.pendingJump = { vx: targetVx, vy: targetVy };
          p.vx = 0;
          p.vy = 0;
          p.isWalking = false;
          p.state = CatState.Sitting;
          p.direction = targetVx > 0 ? "right" : "left";
          return;
        }
      }

      p.state = CatState.Walking;
      p.isWalking = true;
      p.vx = dist > 0 ? WALK_SPEED * 1.35 : -WALK_SPEED * 1.35;
      p.direction = dist > 0 ? "right" : "left";
      p.emotion = "Excited";
      return;
    }

    const rand = Math.random();
    if (rand < 0.35) {
      // Walk / Wander
      p.state = CatState.Walking;
      p.isWalking = true;
      p.emotion = "Happy";
      let minX = 5;
      let maxX = window.innerWidth - CAT_WIDTH - 5;
      if (p.anchoredPlatform) {
        const rect = p.anchoredPlatform.element.getBoundingClientRect();
        minX = rect.left;
        maxX = rect.right - CAT_WIDTH;
      }
      const targetX = minX + Math.random() * (maxX - minX);
      p.vx = targetX > p.x ? WALK_SPEED : -WALK_SPEED;
      p.direction = targetX > p.x ? "right" : "left";
      
    } else if (rand < 0.6) {
      // Jump up onto platform
      const platforms = scanPlatforms();
      const reachable = platforms.filter(plat => {
        const isAbove = plat.top < p.y - 30;
        const vert = p.y - plat.top;
        const horiz = Math.min(Math.abs(p.x - plat.left), Math.abs(p.x - plat.right));
        return isAbove && vert < 320 && horiz < 350;
      });

      if (reachable.length > 0) {
        const plat = reachable[Math.floor(Math.random() * reachable.length)];
        const targetX = plat.left + Math.random() * (plat.width - CAT_WIDTH);
        const targetY = plat.top - CAT_HEIGHT;
        const peakY = Math.min(p.y, targetY) - 55;
        const h1 = p.y - peakY;
        const h2 = targetY - peakY;
        if (h1 > 0 && h2 > 0) {
          const targetVy = -Math.sqrt(2 * GRAVITY * h1);
          const t1 = -targetVy / GRAVITY;
          const t2 = Math.sqrt(2 * h2 / GRAVITY);
          const targetVx = (targetX - p.x) / (t1 + t2);

          // Trigger pre-squat anticipation
          p.jumpPreSquatTimer = 16;
          p.pendingJump = { vx: targetVx, vy: targetVy };
          p.vx = 0;
          p.vy = 0;
          p.isWalking = false;
          p.state = CatState.Sitting;
          p.anchoredPlatform = null;
          p.direction = targetVx > 0 ? "right" : "left";
        }
      } else {
        p.state = CatState.Walking;
        p.isWalking = true;
        p.vx = Math.random() > 0.5 ? WALK_SPEED : -WALK_SPEED;
        p.direction = p.vx > 0 ? "right" : "left";
      }

    } else if (rand < 0.72) {
      // Jump down
      if (p.anchoredPlatform) {
        const targetVx = Math.random() > 0.5 ? 1.0 : -1.0;
        const targetVy = -1.2;

        // Trigger pre-squat anticipation
        p.jumpPreSquatTimer = 12;
        p.pendingJump = { vx: targetVx, vy: targetVy };
        p.vx = 0;
        p.vy = 0;
        p.isWalking = false;
        p.state = CatState.Sitting;
        p.direction = targetVx > 0 ? "right" : "left";
      } else {
        p.state = CatState.Sitting;
        p.vx = 0;
        p.isWalking = false;
      }

    } else if (rand < 0.85) {
      p.state = CatState.Sitting;
      p.vx = 0;
      p.isWalking = false;
      if (Math.random() < 0.25) p.emotion = "Curious";

    } else if (rand < 0.93) {
      p.state = Math.random() > 0.5 ? CatState.Grooming : CatState.Stretching;
      p.vx = 0;
      p.isWalking = false;

    } else {
      p.state = CatState.Sleeping;
      p.emotion = "Sleepy";
      p.vx = 0;
      p.isWalking = false;
    }
  };

  // Sync state ticks back to React component
  const syncStateWithReact = () => {
    const p = physics.current;
    if (lastRendered.current.state !== p.state) {
      lastRendered.current.state = p.state;
      setCurrentState(p.state);
    }
    if (lastRendered.current.emotion !== p.emotion) {
      lastRendered.current.emotion = p.emotion;
      setCurrentEmotion(p.emotion);
    }
    if (lastRendered.current.direction !== p.direction) {
      lastRendered.current.direction = p.direction;
      setDirection(p.direction);
    }
    if (lastRendered.current.isWalking !== p.isWalking) {
      lastRendered.current.isWalking = p.isWalking;
      setIsWalking(p.isWalking);
    }
  };

  const renderCat = () => {
    if (!catRef.current) return;
    let rotation = 0;
    const p = physics.current;
    if (p.state === CatState.Climbing) {
      if (p.climbingSide === "left" || p.climbingSide === "screen-right") rotation = -90;
      else if (p.climbingSide === "right" || p.climbingSide === "screen-left") rotation = 90;
    }
    catRef.current.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) rotate(${rotation}deg)`;

    // Apply squash and stretch scaling to inner wrapper
    if (innerWrapperRef.current) {
      let scaleY = 1.0;
      let scaleX = 1.0;

      if (p.jumpPreSquatTimer > 0) {
        // Crouch phase: squash down, stretch sideways
        const maxTimer = p.pendingJump && Math.abs(p.pendingJump.vy) < 1.5 ? 12 : 16;
        const t = p.jumpPreSquatTimer / maxTimer;
        const squash = Math.sin(t * Math.PI);
        scaleY = 1.0 - 0.28 * squash;
        scaleX = 1.0 + 0.24 * squash;
      } else if (p.landingCushionTimer > 0) {
        // Landing phase: squash down on impact, recover
        const t = p.landingCushionTimer / 12;
        scaleY = 1.0 - 0.25 * t;
        scaleX = 1.0 + 0.2 * t;
      } else if (!p.anchoredPlatform && p.state !== CatState.Climbing && Math.abs(p.vy) > 0.5) {
        // Airborne phase: stretch vertically along velocity vector
        const stretch = Math.min(0.2, Math.abs(p.vy) * 0.04);
        scaleY = 1.0 + stretch;
        scaleX = 1.0 - stretch * 0.8;
      }

      const dirX = p.direction === "left" ? -1 : 1;
      const finalScaleX = scaleX * dirX;
      innerWrapperRef.current.style.transform = `scale(${finalScaleX}, ${scaleY})`;
      innerWrapperRef.current.style.transformOrigin = "bottom center";
    }
  };

  // Mouse & touch drag trigger handlers
  const handleDragStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const p = physics.current;
    p.isDragging = true;
    p.dragOffsetX = e.clientX - p.x;
    p.dragOffsetY = e.clientY - p.y;
    dragStartPos.current = { x: p.x, y: p.y, time: Date.now(), touchX: e.clientX, touchY: e.clientY };
    p.state = CatState.Exploring;
    p.emotion = "Surprised";
    p.vx = 0;
    p.vy = 0;
    p.anchoredPlatform = null;
    p.climbingSide = null;
    longPressTriggered.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const p = physics.current;
    p.isDragging = true;
    p.dragOffsetX = touch.clientX - p.x;
    p.dragOffsetY = touch.clientY - p.y;
    dragStartPos.current = { x: p.x, y: p.y, time: Date.now(), touchX: touch.clientX, touchY: touch.clientY };
    p.state = CatState.Exploring;
    p.emotion = "Surprised";
    p.vx = 0;
    p.vy = 0;
    p.anchoredPlatform = null;
    p.climbingSide = null;

    longPressTriggered.current = false;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      setMenuOpen(true);
      playPurrSound(isMutedRef.current);
      spawnParticles("✨", 8);
      longPressTriggered.current = true;
      longPressTimer.current = null;
    }, 3000);
  };

  // Animation frame loop mount
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", handleMouseMove);

    const handleMove = (e: MouseEvent) => {
      const p = physics.current;
      if (p.isDragging) {
        p.x = e.clientX - p.dragOffsetX;
        p.y = e.clientY - p.dragOffsetY;
      }
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      const p = physics.current;
      if (p.isDragging) {
        const touch = e.touches[0];
        p.x = touch.clientX - p.dragOffsetX;
        p.y = touch.clientY - p.dragOffsetY;
        
        if (longPressTimer.current) {
          const dx = touch.clientX - dragStartPos.current.touchX;
          const dy = touch.clientY - dragStartPos.current.touchY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 15) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
          }
        }
      }
    };

    const handleRelease = () => {
      const p = physics.current;
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      if (p.isDragging) {
        p.isDragging = false;
        p.vy = 0;
        p.emotion = "Happy";
      }
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleRelease);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleRelease);
    window.addEventListener("touchcancel", handleRelease);

    let animFrameId: number;
    let lastTime = performance.now();

    const loop = (timestamp: number) => {
      if (document.visibilityState === "hidden") {
        lastTime = timestamp;
        animFrameId = requestAnimationFrame(loop);
        return;
      }
      const dt = Math.min(timestamp - lastTime, 50) / 16.666;
      lastTime = timestamp;

      // Update positions
      updatePhysics(dt);
      updateToysPhysics(dt);

      // AI ticks
      const p = physics.current;
      p.actionTimer -= dt;
      if (p.actionTimer <= 0) {
        p.actionTimer = 220 + Math.random() * 260;
        makeAIDecision();
      }

      // Check walking wall climbers
      if (p.state === CatState.Walking && !p.anchoredPlatform) {
        const climbable = checkClimbablePlatform();
        if (climbable && Math.random() < 0.6) {
          const plat = climbable.platform;
          p.state = CatState.Climbing;
          p.climbingSide = climbable.side;
          p.vy = -1.2;
          p.vx = 0;
          p.isWalking = false;
          p.anchoredPlatform = { id: plat.id, element: plat.element };
        }
      }

      // Sync views
      renderCat();
      syncStateWithReact();

      animFrameId = requestAnimationFrame(loop);
    };

    animFrameId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleRelease);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleRelease);
      window.removeEventListener("touchcancel", handleRelease);
      cancelAnimationFrame(animFrameId);
    };
  }, []);

  const triggerClickDialogue = () => {
    let pool = [...dialoguePool];
    if (pool.length === 0) {
      pool = [...PIHU_POOL].sort(() => Math.random() - 0.5);
    }
    const nextMsg = pool.pop();
    if (nextMsg) {
      setDialoguePool(pool);
      setSpeech("I am Pihu. " + nextMsg);
      if (speechTimer.current) clearTimeout(speechTimer.current);
      speechTimer.current = setTimeout(() => setSpeech(null), 4000);
    }
  };

  const handleMascotClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Safety check to ensure left click only
    if (e.button !== 0 && e.button !== undefined) return;
    
    const p = physics.current;
    
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    
    const elapsed = Date.now() - dragStartPos.current.time;
    if (p.isDragging || elapsed > 500) return;
    
    // Left click counts as direct petting & dialogue!
    playMeowSound(isMutedRef.current);
    playPurrSound(isMutedRef.current);
    spawnParticles("💖", 6);
    
    const newPts = relationship.points + 2;
    saveAffection(newPts);
    setNeeds(prev => ({ ...prev, affection: Math.min(100, prev.affection + 5) }));
    
    p.vx = 0;
    p.isWalking = false;
    p.state = CatState.Sitting;
    p.emotion = "Happy";
    
    triggerClickDialogue();
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Desktop right-click has button === 2
    // Touch contextmenu has button !== 2 (often 0 or -1), which we want to ignore (handled by long press timer)
    const isRightClick = e.button === 2;
    if (!isRightClick) {
      return;
    }
    
    setMenuOpen(prev => !prev);
  };

  const handlePet = () => {
    playPurrSound(isMutedRef.current);
    spawnParticles("💖", 8);
    setSpeech("Purrrr... I love headpats! 💕");
    
    const newPts = relationship.points + 5;
    saveAffection(newPts);
    setNeeds(prev => ({ ...prev, affection: Math.min(100, prev.affection + 15) }));
    physics.current.emotion = "Happy";
  };

  const handleFeed = (foodType: keyof typeof inventory) => {
    if (inventory[foodType] <= 0) return;
    
    const nextInv = { ...inventory, [foodType]: inventory[foodType] - 1 };
    saveInventory(nextInv);
    
    playMeowSound(isMutedRef.current);
    spawnParticles("🍽️", 6);
    
    let affGain = 8;
    let energyGain = 20;
    let foodName = "treat";
    
    if (foodType === "tuna") {
      affGain = 20;
      energyGain = 35;
      foodName = "favorite tuna 🥫";
      physics.current.emotion = "Excited";
      spawnParticles("✨", 10);
    } else if (foodType === "fish") {
      foodName = "yummy fish 🐟";
      physics.current.emotion = "Happy";
    } else if (foodType === "milk") {
      foodName = "warm milk 🥛";
      physics.current.emotion = "Happy";
    }
    
    setSpeech(`*Chomp chomp*... The ${foodName} is delicious! Purrr! 🐾`);
    const newPts = relationship.points + affGain;
    saveAffection(newPts);
    setNeeds(prev => ({
      hunger: Math.max(0, prev.hunger - 30),
      energy: Math.min(100, prev.energy + energyGain),
      affection: Math.min(100, prev.affection + 5),
    }));
  };

  const spawnToy = (type: "ball" | "yarn" | "feather") => {
    const newToy: Toy = {
      id: Date.now() + Math.random(),
      type,
      x: physics.current.x + (Math.random() * 160 - 80),
      y: physics.current.y - 120,
      vx: Math.random() * 4 - 2,
      vy: -2,
    };
    toysRef.current = [...toysRef.current, newToy];
    setToys(toysRef.current);
    setMenuOpen(false);
  };

  const removeToy = (id: number) => {
    toysRef.current = toysRef.current.filter(t => t.id !== id);
    setToys(toysRef.current);
    spawnParticles("✨", 4);
  };

  // Mobile overflow bubble position calculator
  const getSpeechBubbleStyleAndArrow = () => {
    const p = physics.current;
    
    // Position bubble above the cat, unless near the top of the viewport
    let isNearTop = p.y < 120;
    
    if (menuOpen && typeof window !== "undefined") {
      // If the menu is open, we position the speech bubble on the opposite side of the menu to prevent overlap.
      // If we place the menu above the cat (y - 400 - 15 >= 10), then the speech bubble is placed below (isNearTop = true).
      // Otherwise, the menu is below and the speech bubble is placed above (isNearTop = false).
      const menuAbove = (p.y - 400 - 15) >= 10;
      isNearTop = menuAbove;
    }
    
    const bubbleStyle: React.CSSProperties = {
      position: "absolute",
      zIndex: 55,
      width: "180px",
    };
    
    if (isNearTop) {
      bubbleStyle.top = `${CAT_HEIGHT + 6}px`;
    } else {
      bubbleStyle.bottom = `${CAT_HEIGHT + 6}px`;
    }

    if (p.x < 90) {
      bubbleStyle.left = "0px";
      bubbleStyle.transform = "none";
    } else if (typeof window !== "undefined" && p.x > window.innerWidth - 130) {
      bubbleStyle.right = "0px";
      bubbleStyle.left = "auto";
      bubbleStyle.transform = "none";
    } else {
      bubbleStyle.left = "50%";
      bubbleStyle.transform = "translateX(-50%)";
    }

    const arrowStyle: React.CSSProperties = {};
    if (p.x < 90) {
      arrowStyle.left = "25px";
      arrowStyle.transform = "translateX(-50%)";
    } else if (typeof window !== "undefined" && p.x > window.innerWidth - 130) {
      arrowStyle.left = "auto";
      arrowStyle.right = "25px";
      arrowStyle.transform = "translateX(50%)";
    } else {
      arrowStyle.left = "50%";
      arrowStyle.transform = "translateX(-50%)";
    }

    return { bubbleStyle, arrowStyle, isNearTop };
  };

  // Dynamic Glassmorphic Menu position calculator
  const getMenuStyle = () => {
    const isMobile = window.innerWidth < 768;
    const menuWidth = isMobile ? window.innerWidth - 32 : 320;
    
    return {
      position: "fixed" as const,
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: isMobile ? `${menuWidth}px` : "320px",
      zIndex: 100,
    };
  };

  const colors = SKINS[catSkin];
  const mouthStroke = (colors.snout === "#451a03" || colors.primary === "#18181b") ? "#e2e8f0" : "#ea580c";

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none select-none"
      style={{ zIndex: 99999 }}
    >
      {/* Active Physics Toys */}
      {toys.map(toy => (
        <div
          key={toy.id}
          id={`toy-${toy.id}`}
          className="absolute w-8 h-8 pointer-events-auto cursor-pointer flex items-center justify-center text-2xl"
          style={{
            left: 0,
            top: 0,
          }}
          onClick={() => removeToy(toy.id)}
        >
          {toy.type === "ball" ? "🏀" : toy.type === "yarn" ? "🧶" : "🪶"}
        </div>
      ))}

      {/* Roaming Cat Element */}
      <div
        ref={catRef}
        onMouseDown={handleDragStart}
        onTouchStart={handleTouchStart}
        onClick={handleMascotClick}
        onContextMenu={handleRightClick}
        className="absolute pointer-events-auto cursor-grab active:cursor-grabbing flex flex-col items-center"
        style={{
          width: `${CAT_WIDTH}px`,
          height: `${CAT_HEIGHT}px`,
          left: 0,
          top: 0,
        }}
      >
        {/* Floating Particles */}
        <AnimatePresence>
          {particles.map(p => (
            <motion.span
              key={p.id}
              initial={{ opacity: 1, scale: 0.5, x: p.x, y: p.y }}
              animate={{ opacity: 0, scale: 1.5, y: p.y - 70, x: p.x + (Math.random() * 30 - 15) }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="absolute text-lg pointer-events-none"
            >
              {p.emoji}
            </motion.span>
          ))}
        </AnimatePresence>

        {/* Speech Bubble */}
        <AnimatePresence>
          {speech && (() => {
            const { bubbleStyle, arrowStyle, isNearTop } = getSpeechBubbleStyleAndArrow();
            return (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="bg-black/90 backdrop-blur-md border border-white/10 text-white rounded-2xl px-3 py-2 text-[11px] leading-snug font-medium shadow-2xl text-center pointer-events-none"
                style={bubbleStyle}
              >
                {speech}
                {isNearTop ? (
                  <div
                    className="absolute bottom-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-black/90"
                    style={arrowStyle}
                  />
                ) : (
                  <div
                    className="absolute top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-black/90"
                    style={arrowStyle}
                  />
                )}
              </motion.div>
            );
          })()}
        </AnimatePresence>

        {/* SVG Cat Wrapper */}
        <div
          ref={innerWrapperRef}
          className={cn(
            "relative w-[68px] h-[58px] transition-[width,height,opacity] duration-300 md:w-[74px] md:h-[64px] hover:scale-105",
            currentState === CatState.Celebrating && "animate-spin-once",
            currentState === CatState.Sleeping && "opacity-90 scale-y-75 translate-y-2",
            currentState === CatState.Grooming && "pihu-grooming",
            currentState === CatState.Stretching && "pihu-stretching",
            currentState === CatState.Climbing && "pihu-climbing"
          )}
          style={{
            transform: direction === "left" ? "scaleX(-1)" : "scaleX(1)",
          }}
        >
          <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]">
            <style>{`
              @keyframes tail-wag {
                0%, 100% { transform: rotate(0deg); }
                50% { transform: rotate(20deg); }
              }
              @keyframes ear-twitch {
                0%, 90%, 100% { transform: rotate(0deg); }
                93%, 97% { transform: rotate(-6deg); }
                95% { transform: rotate(6deg); }
              }
              @keyframes blink {
                0%, 90%, 94%, 98%, 100% { transform: scaleY(1); }
                92%, 96% { transform: scaleY(0.1); }
              }
              @keyframes leg-trot-a {
                0%, 100% { transform: rotate(-24deg); }
                50% { transform: rotate(24deg); }
              }
              @keyframes leg-trot-b {
                0%, 100% { transform: rotate(24deg); }
                50% { transform: rotate(-24deg); }
              }
              @keyframes body-walk-bob {
                0%, 100% { transform: translateY(0) rotate(0deg); }
                25% { transform: translateY(-1.5px) rotate(-1.5deg); }
                50% { transform: translateY(0px) rotate(0deg); }
                75% { transform: translateY(-1.5px) rotate(1.5deg); }
              }
              @keyframes head-stabilize {
                0%, 100% { transform: translateY(0) rotate(0deg); }
                25% { transform: translateY(1.2px) rotate(1.8deg); }
                50% { transform: translateY(0px) rotate(0deg); }
                75% { transform: translateY(1.2px) rotate(-1.8deg); }
              }
              @keyframes tail-walk-wag {
                0%, 100% { transform: rotate(15deg); }
                50% { transform: rotate(-10deg); }
              }
              @keyframes breathe {
                0%, 100% { transform: scaleY(1); }
                50% { transform: scaleY(1.02) translateY(-0.4px); }
              }
              .cat-tail {
                transform-origin: 48px 46px;
                animation: ${isWalking ? "tail-walk-wag 0.38s ease-in-out infinite" : "tail-wag 1.6s ease-in-out infinite"};
              }
              .cat-ear-l {
                transform-origin: 24px 14px;
                animation: ear-twitch 4s ease-in-out infinite;
              }
              .cat-ear-r {
                transform-origin: 40px 14px;
                animation: ear-twitch 4s ease-in-out infinite 0.5s;
              }
              .cat-eye {
                transform-origin: center;
                animation: blink 5s linear infinite;
              }
              .cat-leg-fl {
                transform-origin: 22.5px 50px;
                animation: ${isWalking ? "leg-trot-a 0.38s ease-in-out infinite" : "none"};
              }
              .cat-leg-fr {
                transform-origin: 28.5px 50px;
                animation: ${isWalking ? "leg-trot-b 0.38s ease-in-out infinite" : "none"};
              }
              .cat-leg-bl {
                transform-origin: 40.5px 50px;
                animation: ${isWalking ? "leg-trot-b 0.38s ease-in-out infinite" : "none"};
              }
              .cat-leg-br {
                transform-origin: 46.5px 50px;
                animation: ${isWalking ? "leg-trot-a 0.38s ease-in-out infinite" : "none"};
              }
              .cat-body {
                transform-origin: 32px 46px;
                animation: ${isWalking ? "body-walk-bob 0.38s ease-in-out infinite" : "breathe 3s ease-in-out infinite"};
              }
              .cat-head {
                transform-origin: 32px 32px;
                animation: ${isWalking ? "head-stabilize 0.38s ease-in-out infinite" : "none"};
              }
              /* Grooming animations */
              .pihu-grooming .cat-head {
                transform: translateY(4px) rotate(15deg);
              }
              .pihu-grooming .cat-leg-fl {
                transform: translateY(-8px) rotate(-40deg);
              }
              /* Stretching animations */
              .pihu-stretching .cat-body {
                transform: scaleY(1.15) scaleX(0.9) translateY(-3px);
              }
              .pihu-stretching .cat-tail {
                transform: rotate(-30deg);
              }
              /* Climbing tilt animations */
              .pihu-climbing .cat-body {
                transform: rotate(-15deg);
              }
            `}</style>

            {/* Legs */}
            <rect x="20" y="50" width="5" height="12" rx="2.5" fill={colors.secondary} className="cat-leg-fl" />
            <rect x="26" y="50" width="5" height="12" rx="2.5" fill={colors.secondary} className="cat-leg-fr" />
            <rect x="38" y="50" width="5" height="12" rx="2.5" fill={colors.secondary} className="cat-leg-bl" />
            <rect x="44" y="50" width="5" height="12" rx="2.5" fill={colors.secondary} className="cat-leg-br" />

            {/* Body Group (contains body + tail + head for secondary bobbing motion) */}
            <g className="cat-body">
              {/* Tail */}
              <path
                d="M48 46 Q58 46 54 28"
                stroke={colors.secondary}
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
                className="cat-tail"
              />
              <ellipse cx="32" cy="45" rx="18" ry="11" fill={colors.primary} />
              {colors.hasCalicoPatches && (
                <>
                  <ellipse cx="38" cy="40" rx="8" ry="5" fill="#ea580c" />
                  <ellipse cx="44" cy="45" rx="5" ry="6" fill="#27272a" />
                </>
              )}
              {colors.stripesColor && (
                <>
                  <path d="M26 36 Q32 38 38 36" stroke={colors.stripesColor} strokeWidth="2.5" fill="none" />
                  <path d="M28 40 Q32 42 36 40" stroke={colors.stripesColor} strokeWidth="2" fill="none" />
                </>
              )}
              <ellipse cx="30" cy="46" rx="8" ry="5" fill={colors.belly} opacity="0.85" />
              {/* Head group (nested inside body) */}
              <g className="cat-head">
                {/* Ears */}
                <polygon points="18,16 25,2 30,16" fill={colors.earOuter} className="cat-ear-l" />
                <polygon points="20,14 24,5 28,14" fill={colors.earInner} className="cat-ear-l" />
                <polygon points="46,16 39,2 34,16" fill={colors.earOuter} className="cat-ear-r" />
                <polygon points="44,14 40,5 36,14" fill={colors.earInner} className="cat-ear-r" />

                {/* Head Base */}
                <ellipse cx="32" cy="24" rx="14" ry="11" fill={colors.primary} />

                {/* Calico Patches on Head */}
                {colors.hasCalicoPatches && (
                  <>
                    <ellipse cx="24" cy="20" rx="6" ry="4" fill="#27272a" />
                    <ellipse cx="38" cy="22" rx="5" ry="3" fill="#ea580c" />
                  </>
                )}

                {/* Stripes on Head */}
                {colors.stripesColor && (
                  <>
                    <path d="M26 15 L29 18" stroke={colors.stripesColor} strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M38 15 L35 18" stroke={colors.stripesColor} strokeWidth="1.5" strokeLinecap="round" />
                  </>
                )}

                {/* Whiskers */}
                <path d="M19 25 L11 23" stroke={colors.secondary} strokeWidth="1" strokeLinecap="round" />
                <path d="M18 27 L10 27" stroke={colors.secondary} strokeWidth="1" strokeLinecap="round" />
                <path d="M19 29 L11 31" stroke={colors.secondary} strokeWidth="1" strokeLinecap="round" />
                
                <path d="M45 25 L53 23" stroke={colors.secondary} strokeWidth="1" strokeLinecap="round" />
                <path d="M46 27 L54 27" stroke={colors.secondary} strokeWidth="1" strokeLinecap="round" />
                <path d="M45 29 L53 31" stroke={colors.secondary} strokeWidth="1" strokeLinecap="round" />

                {/* Snout */}
                {colors.snout && (
                  <ellipse cx="32" cy="27" rx="5" ry="3.5" fill={colors.snout} />
                )}

                {/* Eyes */}
                {currentEmotion === "Sleepy" || currentState === CatState.Sleeping ? (
                  <>
                    <path d="M22 25 Q25 28 28 25" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />
                    <path d="M36 25 Q39 28 42 25" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />
                  </>
                ) : currentEmotion === "Happy" || currentEmotion === "Proud" ? (
                  <>
                    <path d="M22 25 Q25 21 28 25" stroke="#1e293b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    <path d="M36 25 Q39 21 42 25" stroke="#1e293b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  </>
                ) : currentEmotion === "Sad" ? (
                  <>
                    <path d="M22 23 Q25 26 28 25" stroke="#1e293b" strokeWidth="2.2" fill="none" strokeLinecap="round" />
                    <path d="M36 25 Q39 26 42 23" stroke="#1e293b" strokeWidth="2.2" fill="none" strokeLinecap="round" />
                  </>
                ) : (
                  <>
                    <ellipse cx="25" cy="23" rx="3.5" ry="4" fill={colors.eyeColor} className="cat-eye" />
                    <circle cx="23.8" cy="21.5" r="1.2" fill="#fff" className="cat-eye" />
                    <ellipse cx="39" cy="23" rx="3.5" ry="4" fill={colors.eyeColor} className="cat-eye" />
                    <circle cx="37.8" cy="21.5" r="1.2" fill="#fff" className="cat-eye" />
                  </>
                )}

                {/* Nose */}
                <polygon points="31,26 33,26 32,27.5" fill="#fda4af" />

                {/* Mouth */}
                <path d="M30 29 Q32 30.5 32 29 Q32 30.5 34 29" stroke={mouthStroke} strokeWidth="1.5" fill="none" strokeLinecap="round" />

                {/* Cheeks */}
                <circle cx="19" cy="26" r="2.5" fill="#fda4af" opacity="0.65" />
                <circle cx="45" cy="26" r="2.5" fill="#fda4af" opacity="0.65" />
              </g>

              {/* Cosmetics Overlay */}
              {cosmetic === "santa" && (
                <g className="cat-head">
                  <path d="M20 12 Q32 0 44 12 Q32 10 20 12 Z" fill="#ef4444" />
                  <ellipse cx="32" cy="11" rx="13" ry="3.5" fill="#fff" />
                  <circle cx="44" cy="11" r="3.5" fill="#fff" />
                </g>
              )}
              {cosmetic === "pumpkin" && (
                <g className="cat-head">
                  <ellipse cx="32" cy="11" rx="10" ry="7" fill="#f97316" stroke="#ea580c" strokeWidth="1" />
                  <rect x="31" y="3" width="2" height="4" fill="#15803d" />
                </g>
              )}
              {cosmetic === "scarf" && (
                <g className="cat-body">
                  <path d="M22 35 C22 32, 42 32, 42 35 L40 40 L24 40 Z" fill="#d97706" />
                  <rect x="25" y="35" width="14" height="2" fill="#ef4444" />
                </g>
              )}
              {cosmetic === "crown" && (
                <g className="cat-head">
                  <path d="M24 10 L26 4 L32 8 L38 4 L40 10 Z" fill="#eab308" stroke="#ca8a04" strokeWidth="1" />
                  <circle cx="26" cy="3" r="1" fill="#fff" />
                  <circle cx="32" cy="7" r="1" fill="#fff" />
                  <circle cx="38" cy="3" r="1" fill="#fff" />
                </g>
              )}
            </g>
          </svg>
        </div>
      </div>

      {/* Glassmorphic Interaction Menu */}
      <AnimatePresence>
        {menuOpen && (
          <div
            className="rounded-3xl glass border border-white/10 p-5 shadow-2xl pointer-events-auto"
            style={getMenuStyle()}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-black flex items-center gap-1.5">
                    Pihu 🐾
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Level: <span className="font-bold text-primary">{relationshipLevel}</span>
                  </p>
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="h-7 w-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/10 text-muted-foreground hover:text-foreground transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Needs Dashboard */}
              <div className="grid grid-cols-3 gap-3">
                <div className="glass border border-white/5 rounded-xl p-2.5 text-center">
                  <span className="text-xs text-muted-foreground block mb-0.5">Hunger</span>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-red-400" style={{ width: `${needs.hunger}%` }} />
                  </div>
                  <span className="text-[10px] font-bold mt-1 block">{needs.hunger}%</span>
                </div>
                <div className="glass border border-white/5 rounded-xl p-2.5 text-center">
                  <span className="text-xs text-muted-foreground block mb-0.5">Energy</span>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-green-400" style={{ width: `${needs.energy}%` }} />
                  </div>
                  <span className="text-[10px] font-bold mt-1 block">{needs.energy}%</span>
                </div>
                <div className="glass border border-white/5 rounded-xl p-2.5 text-center">
                  <span className="text-xs text-muted-foreground block mb-0.5">Affection</span>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-pink-400" style={{ width: `${needs.affection}%` }} />
                  </div>
                  <span className="text-[10px] font-bold mt-1 block">{needs.affection}%</span>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-4 flex-1 overflow-y-auto max-h-[45vh] pr-1">
                <div className="flex gap-2">
                  <Button onClick={handlePet} className="flex-1 py-1 h-9 rounded-xl text-xs gap-1.5">
                    💖 Pet Pihu
                  </Button>
                  <button
                    onClick={handleMuteToggle}
                    className="px-3 rounded-xl bg-white/5 border border-white/10 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isMuted ? "🔇 Muted" : "🔊 Audio"}
                  </button>
                </div>

                {/* Inventory Feed */}
                <div className="space-y-2">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Feed Treats (study to earn more)
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={() => handleFeed("fish")}
                      disabled={inventory.fish <= 0}
                      className="glass border border-white/5 hover:bg-white/10 p-2 rounded-xl text-center disabled:opacity-30 transition-all flex flex-col items-center"
                    >
                      <span className="text-xl">🐟</span>
                      <span className="text-[9px] font-bold mt-1 block">Fish ({inventory.fish})</span>
                    </button>
                    <button
                      onClick={() => handleFeed("milk")}
                      disabled={inventory.milk <= 0}
                      className="glass border border-white/5 hover:bg-white/10 p-2 rounded-xl text-center disabled:opacity-30 transition-all flex flex-col items-center"
                    >
                      <span className="text-xl">🥛</span>
                      <span className="text-[9px] font-bold mt-1 block">Milk ({inventory.milk})</span>
                    </button>
                    <button
                      onClick={() => handleFeed("tuna")}
                      disabled={inventory.tuna <= 0}
                      className="glass border border-white/5 hover:bg-white/10 p-2 rounded-xl text-center disabled:opacity-30 transition-all flex flex-col items-center"
                    >
                      <span className="text-xl">🥫</span>
                      <span className="text-[9px] font-bold mt-1 block">Tuna ({inventory.tuna})</span>
                    </button>
                    <button
                      onClick={() => handleFeed("treats")}
                      disabled={inventory.treats <= 0}
                      className="glass border border-white/5 hover:bg-white/10 p-2 rounded-xl text-center disabled:opacity-30 transition-all flex flex-col items-center"
                    >
                      <span className="text-xl">🍪</span>
                      <span className="text-[9px] font-bold mt-1 block">Treat ({inventory.treats})</span>
                    </button>
                  </div>
                </div>

                {/* Spawning toys */}
                <div className="space-y-2">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Place Toy in Room
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => spawnToy("ball")}
                      className="flex-1 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs hover:bg-white/10 transition-colors"
                    >
                      🏀 Ball
                    </button>
                    <button
                      onClick={() => spawnToy("yarn")}
                      className="flex-1 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs hover:bg-white/10 transition-colors"
                    >
                      🧶 Yarn
                    </button>
                    <button
                      onClick={() => spawnToy("feather")}
                      className="flex-1 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs hover:bg-white/10 transition-colors"
                    >
                      🪶 Feather
                    </button>
                  </div>
                </div>

                {/* Cat Breeds & Skins */}
                <div className="space-y-2">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Cat Breed / Variety 🐱
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(["orange", "tuxedo", "calico", "siamese", "grey"] as CatSkin[]).map(skin => (
                      <button
                        key={skin}
                        onClick={() => handleSkinChange(skin)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg border text-[10px] uppercase font-bold transition-all",
                          catSkin === skin
                            ? "bg-primary border-primary text-primary-foreground"
                            : "bg-white/5 border-white/10 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {skin}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cosmetic Costumes */}
                <div className="space-y-2">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Cosmetics & Hats
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(["none", "santa", "pumpkin", "scarf", "crown"] as CosmeticItem[]).map(item => (
                      <button
                        key={item}
                        onClick={() => {
                          setCosmetic(item);
                          localStorage.setItem("pihu_cosmetic", item);
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-lg border text-[10px] uppercase font-bold transition-all",
                          cosmetic === item
                            ? "bg-primary border-primary text-primary-foreground"
                            : "bg-white/5 border-white/10 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @keyframes spin-once {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-spin-once {
          animation: spin-once 0.6s cubic-bezier(0.1, 0.8, 0.3, 1) 1;
        }
      `}</style>
    </div>
  );
}
