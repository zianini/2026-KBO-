import React, { useState, useEffect, useMemo } from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  setDoc,
  orderBy,
  Timestamp,
  getDoc,
  getDocs,
  getDocFromServer,
  increment
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { db, auth } from './firebase';
import { 
  Trophy, 
  Send, 
  CheckCircle, 
  Clock, 
  ShieldCheck, 
  LogOut, 
  LogIn,
  ChevronUp,
  ChevronDown,
  Home,
  AlertCircle,
  X,
  Quote,
  Activity,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utilities ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Constants ---
const TEAMS = [
  { id: 'LG', name: 'LG 트윈스', short: 'LG', color: '#C40026' },
  { id: 'HANWHA', name: '한화 이글스', short: '한화', color: '#FF6600' },
  { id: 'SSG', name: 'SSG 랜더스', short: 'SSG', color: '#CE0E2D' },
  { id: 'SAMSUNG', name: '삼성 라이온즈', short: '삼성', color: '#074CA1' },
  { id: 'NC', name: 'NC 다이노스', short: 'NC', color: '#00275A' },
  { id: 'KT', name: 'kt wiz', short: 'KT', color: '#000000' },
  { id: 'LOTTE', name: '롯데 자이언츠', short: '롯데', color: '#002955' },
  { id: 'KIA', name: 'KIA 타이거즈', short: 'KIA', color: '#C70125' },
  { id: 'DOOSAN', name: '두산 베어스', short: '두산', color: '#131230' },
  { id: 'KIWOOM', name: '키움 히어로즈', short: '키움', color: '#820024' },
];

const TEAM_SLOGANS: Record<string, string> = {
  'LG': "잠실의 주인은 바뀌지 않는다, 2연패를 향한 '무적'의 시나리오",
  'HANWHA': "보살들의 축제 시작! 이제는 '행복' 야구 말고 '우승' 야구 할 시간",
  'SSG': "인천 상륙 작전은 현재진행형, 가을 DNA 깨우는 랜더스식 몰아치기",
  'SAMSUNG': "왕조의 부활, 사자 군단의 포효가 대구 라팍을 뒤흔들 예감",
  'NC': "창원 공룡들의 습격! 데이터도 예측 못 할 '집행검'급 파괴력",
  'KT': "마법사의 시간은 멈추지 않는다, 가을 좀비들의 끈질긴 마법 쇼",
  'LOTTE': "올해는 진짜 '기세'다! 사직구장 노래방 문 닫을 일 없는 시즌",
  'KIA': "V13을 향한 호랑이의 발톱, 광주 챔필에 흩날릴 우승 꽃가루",
  'DOOSAN': "미라클 두산의 귀환, 곰들의 뚝심으로 뒤집는 예측불허 상위권",
  'KIWOOM': "고척 돔에 핀 영웅들의 투혼, 모두를 놀라게 할 '언더독'의 반란"
};

const DEFAULT_RANKING = [
  'LG', 'HANWHA', 'SSG', 'SAMSUNG', 'NC', 'KT', 'LOTTE', 'KIA', 'DOOSAN', 'KIWOOM'
];

const QUOTES = [
  "데이터도 포기한 KBO, 작두 타실 분 모집합니다",
  "9회 말 2아웃까지는 아무도 모르는, 본격 '멘붕' 유발 순위 예측",
  "슈퍼컴퓨터도 고장 내는 KBO, 제 '뇌피셜' 한 번 믿어보시겠습니까?",
  "2026 시즌을 꿰뚫어 보는 돗자리 도사들의 성지",
  "야구 지능(BQ) 총동원! 성지글 예약하는 팩트 기반 망상",
  "승요(승리요정)가 될 것인가, 역배의 신이 될 것인가",
  "틀려도 책임 안 짐! 재미로 보는 '내 맘대로' KBO 서열 정리",
  "KBO 판도 분석: 신의 영역에 도전하기",
  "성지 순례 예고편: 2026 KBO 서열 예언",
  "데이터는 거들 뿐, 느낌적인 느낌으로 맞히는 순위",
  "어차피 우승은 내 팀? 희망 사항 200% 반영된 가상 순위",
  "야구 몰라요, 하지만 저는 알아요 (아마도)"
];

// --- Types ---
interface RankingEntry {
  teamId: string;
  rank: number;
}

interface Prediction {
  id: string;
  name: string;
  message: string;
  rankings: string[];
  status: 'pending' | 'approved';
  score: number;
  userId: string;
  createdAt: any;
}

interface UserProfile {
  name: string;
  email: string;
  role: 'admin' | 'user';
}

// --- Components ---

interface SortableItemProps {
  id: string;
  team: any;
  index: number;
  key?: any;
}

const SortableItem = ({ id, team, index }: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    backgroundColor: team?.color || '#ccc',
    touchAction: 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center justify-center p-2 px-4 mb-1.5 rounded-lg text-white shadow-md cursor-grab active:cursor-grabbing select-none w-[55%] sm:w-[33%] mx-auto overflow-hidden"
    >
      <div className="flex items-center gap-3 w-full">
        <span className="text-base font-bold opacity-50 w-5 flex-shrink-0">{index + 1}</span>
        <span className="text-base font-bold truncate flex-1 text-center pr-5">{team?.short || 'Unknown'}</span>
      </div>
    </div>
  );
};

// --- Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

class ErrorBoundary extends (React.Component as any) {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-black p-4">
          <div className="bg-zinc-900 p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-zinc-800">
            <AlertCircle className="mx-auto text-red-500 mb-4" size={64} />
            <h2 className="text-2xl font-bold text-white mb-2">문제가 발생했습니다</h2>
            <p className="text-zinc-400 mb-6">앱을 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.</p>
            <pre className="text-xs bg-zinc-800 p-4 rounded-lg overflow-auto text-left mb-6 max-h-40 text-zinc-300">
              {this.state.error?.message || "알 수 없는 오류"}
            </pre>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all"
            >
              새로고침
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [quote, setQuote] = useState("");
  const [currentRankings, setCurrentRankings] = useState<RankingEntry[]>(
    DEFAULT_RANKING.map((id, idx) => ({ teamId: id, rank: idx + 1 }))
  );
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [myPrediction, setMyPrediction] = useState<Prediction | null>(null);
  const [view, setView] = useState<'home' | 'predict' | 'leaderboard' | 'admin'>('home');
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);
  
  // Prediction Form
  const [predictName, setPredictName] = useState("");
  const [predictMessage, setPredictMessage] = useState("");
  const [predictRankings, setPredictRankings] = useState<string[]>(DEFAULT_RANKING);

  // Admin State
  const [pendingPredictions, setPendingPredictions] = useState<Prediction[]>([]);
  const [historicalRankings, setHistoricalRankings] = useState<any[]>([]);
  const [extractedRankings, setExtractedRankings] = useState<RankingEntry[] | null>(null);
  const [adminRankingsText, setAdminRankingsText] = useState("");
  const [visitorCount, setVisitorCount] = useState<number>(0);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    const timer = setInterval(() => {
      setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'settings', 'connection_test'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      try {
        setUser(u);
        if (u) {
          const isAdminEmail = u.email?.toLowerCase() === 'cerenis.injung@gmail.com';
          const userDocRef = doc(db, 'users', u.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            // If the email matches but the role in DB is 'user', try to update it to 'admin'
            if (isAdminEmail && data.role !== 'admin') {
              try {
                await updateDoc(userDocRef, { role: 'admin' });
                setProfile({ ...data, role: 'admin' });
              } catch (e) {
                console.error('Failed to update admin role in Firestore:', e);
                // Still set as admin in local state if email matches
                setProfile({ ...data, role: 'admin' });
              }
            } else {
              setProfile(data);
            }
          } else {
            const newProfile: UserProfile = {
              name: u.displayName || '익명',
              email: u.email || '',
              role: isAdminEmail ? 'admin' : 'user'
            };
            try {
              await setDoc(userDocRef, newProfile);
            } catch (e) {
              console.error('Failed to create user profile in Firestore:', e);
            }
            setProfile(newProfile);
          }
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
      } finally {
        setLoadingAuth(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Increment and fetch visitor count
    const incrementVisitors = async () => {
      try {
        const statsRef = doc(db, 'visitors', 'stats');
        const statsDoc = await getDoc(statsRef);
        if (!statsDoc.exists()) {
          await setDoc(statsRef, { count: 1 });
        } else {
          await updateDoc(statsRef, { count: increment(1) });
        }
      } catch (e) {
        console.error("Visitor count error:", e);
      }
    };

    // Only increment once per session
    const hasVisited = sessionStorage.getItem('hasVisited');
    if (!hasVisited) {
      incrementVisitors();
      sessionStorage.setItem('hasVisited', 'true');
    }

    const unsub = onSnapshot(doc(db, 'visitors', 'stats'), (doc) => {
      if (doc.exists()) {
        setVisitorCount(doc.data().count);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    // Fetch Current Official Rankings
    const unsub = onSnapshot(doc(db, 'settings', 'currentRanking'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        // Handle legacy string[] format if needed, but we'll assume new format
        const rawRankings = data.rankings || [];
        if (rawRankings.length > 0 && typeof rawRankings[0] === 'string') {
          // Legacy format: convert to RankingEntry[]
          setCurrentRankings(rawRankings.map((id: string, idx: number) => ({ teamId: id, rank: idx + 1 })));
        } else {
          setCurrentRankings(rawRankings);
        }
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    // Fetch Approved Predictions for Leaderboard
    const q = query(collection(db, 'predictions'), where('status', '==', 'approved'), orderBy('score', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const preds = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Prediction));
      setPredictions(preds);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (user) {
      // Fetch My Prediction
      const q = query(collection(db, 'predictions'), where('userId', '==', user.uid));
      const unsub = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          setMyPrediction({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Prediction);
        } else {
          setMyPrediction(null);
        }
      });
      return () => unsub();
    }
  }, [user]);

  useEffect(() => {
    if (profile?.role === 'admin') {
      // Fetch Pending Predictions for Admin
      const q = query(collection(db, 'predictions'), where('status', '==', 'pending'));
      const unsub = onSnapshot(q, (snapshot) => {
        setPendingPredictions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Prediction)));
      });
      return () => unsub();
    }
  }, [profile]);

  useEffect(() => {
    // Fetch Historical Rankings from March 28th onwards
    const startDate = new Date('2026-03-28T00:00:00Z');
    const q = query(
      collection(db, 'historicalRankings'), 
      where('date', '>=', Timestamp.fromDate(startDate)),
      orderBy('date', 'asc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setHistoricalRankings(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const chartData = useMemo(() => {
    // Group by date to avoid multiple points on the same day if needed, 
    // but for now let's just show all points in order.
    return historicalRankings.map(h => {
      const date = h.date?.toDate ? h.date.toDate() : new Date(h.date);
      const formattedDate = `${date.getMonth() + 1}.${date.getDate()}`;
      const entry: any = { date: formattedDate, fullDate: date.toLocaleString() };
      h.rankings.forEach((r: any) => {
        const teamId = typeof r === 'string' ? r : r.teamId;
        const rank = typeof r === 'string' ? (h.rankings.indexOf(r) + 1) : r.rank;
        entry[teamId] = rank;
      });
      return entry;
    });
  }, [historicalRankings]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      // Use signInWithPopup but handle potential blocks
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login failed:", error);
      if (error.code === 'auth/popup-blocked') {
        alert("팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해 주세요.");
      } else if (error.code === 'auth/cancelled-popup-request') {
        // User closed the popup, ignore
      } else {
        alert(`로그인 중 오류가 발생했습니다: ${error.message}\n현재 접속 도메인: ${window.location.hostname}\n\n팁: Google Cloud 콘솔에서 API 키의 '웹사이트 제한' 설정을 확인해 보세요.`);
      }
    }
  };

  const handleLogout = () => signOut(auth);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setPredictRankings((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const calculateScore = (predicted: string[], actual: RankingEntry[]) => {
    let score = 0;
    predicted.forEach((teamId, index) => {
      const predictedRank = index + 1;
      const actualEntry = actual.find(a => a.teamId === teamId);
      if (actualEntry && predictedRank === actualEntry.rank) {
        // Exact match: points based on rank (1st = 10, 10th = 1)
        score += (11 - predictedRank);
      }
    });
    return score;
  };

  const submitPrediction = async () => {
    try {
      await addDoc(collection(db, 'predictions'), {
        name: predictName || "익명",
        message: predictMessage,
        rankings: predictRankings,
        status: 'pending',
        score: calculateScore(predictRankings, currentRankings),
        userId: user?.uid || null,
        createdAt: Timestamp.now()
      });
      setPredictName("");
      setPredictMessage("");
      setPredictRankings(DEFAULT_RANKING);
      setView('home');
    } catch (e) {
      console.error('Submit error:', e);
    }
  };

  const approvePrediction = async (pred: Prediction) => {
    try {
      await updateDoc(doc(db, 'predictions', pred.id), {
        status: 'approved'
      });
    } catch (e) {
      console.error('Approve error:', e);
    }
  };

  const updatePredictionName = async (id: string, newName: string) => {
    try {
      await updateDoc(doc(db, 'predictions', id), {
        name: newName
      });
    } catch (e) {
      console.error('Update name error:', e);
    }
  };

  const rejectPrediction = async (pred: Prediction) => {
    try {
      await deleteDoc(doc(db, 'predictions', pred.id));
    } catch (e) {
      console.error('Delete error:', e);
    }
  };

  const parseAdminRankings = (text: string): RankingEntry[] | null => {
    const lines = text.trim().split('\n');
    const newRankings: RankingEntry[] = [];
    
    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        const rankStr = parts[0].replace(/[^0-9]/g, '');
        const teamName = parts[1];
        const rank = parseInt(rankStr, 10);
        const team = TEAMS.find(t => t.short === teamName || t.name.includes(teamName));
        if (team && !isNaN(rank)) {
          newRankings.push({ teamId: team.id, rank });
        }
      }
    });

    if (newRankings.length === 10) {
      return newRankings;
    }
    return null;
  };

  const handleExtractRankings = () => {
    const parsed = parseAdminRankings(adminRankingsText);
    if (!parsed) {
      alert("순위 데이터 형식이 올바르지 않거나 10개 팀을 모두 찾을 수 없습니다.");
      setExtractedRankings(null);
      return;
    }
    setExtractedRankings(parsed);
  };

  const updateOfficialRankings = async () => {
    if (!extractedRankings) return;
    const parsed = extractedRankings;

    // Update current ranking
    await setDoc(doc(db, 'settings', 'currentRanking'), {
      rankings: parsed,
      updatedAt: Timestamp.now()
    });

    // Save to history
    await addDoc(collection(db, 'historicalRankings'), {
      rankings: parsed,
      date: Timestamp.now(),
      createdAt: Timestamp.now()
    });
    
    // Recalculate all scores
    const allPreds = await getDocs(collection(db, 'predictions'));
    for (const p of allPreds.docs) {
      const data = p.data();
      const newScore = calculateScore(data.rankings, parsed);
      await updateDoc(doc(db, 'predictions', p.id), { score: newScore });
    }
    setAdminRankingsText("");
    setExtractedRankings(null);
    alert("공식 순위가 성공적으로 업데이트되었습니다.");
  };

  const getTeam = (id: string) => TEAMS.find(t => t.id === id);

  const sortedCurrentRankings = useMemo(() => {
    return [...currentRankings].sort((a, b) => a.rank - b.rank);
  }, [currentRankings]);

  const firstPlaceTeam = getTeam(sortedCurrentRankings[0]?.teamId);
  const themeColor = firstPlaceTeam?.color || '#3b82f6';

  const getPredictionMessage = (pred: Prediction, truncate = false) => {
    const isAuto = !pred.message || pred.message.trim() === "";
    const msg = isAuto ? (TEAM_SLOGANS[pred.rankings[0]] || "화이팅!") : pred.message;
    
    if (truncate) {
      // Split by sentence or major phrase delimiters
      const parts = msg.split(/[.!?]|,/).filter(p => p.trim().length > 0);
      if (parts.length > 0) {
        const firstPart = parts[0].trim();
        // If it was a sentence ender, keep it. If it was a comma, just return the text.
        const firstDelimiterMatch = msg.match(/[.!?]|,/);
        const delimiter = firstDelimiterMatch ? firstDelimiterMatch[0] : '';
        return firstPart + (['.', '!', '?'].includes(delimiter) ? delimiter : '');
      }
    }
    return msg;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div 
      className="min-h-screen font-sans text-gray-100 pb-20 transition-colors duration-1000"
      style={{ 
        backgroundColor: '#000',
        backgroundImage: `radial-gradient(circle at 50% -20%, ${themeColor}15 0%, transparent 70%)`
      }}
    >
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
            <Trophy className="text-yellow-500 flex-shrink-0" size={28} />
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-white truncate">KBO 2026 순위예측</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {loadingAuth ? (
              <div className="w-6 h-6 rounded-full border-2 border-zinc-800 border-t-blue-500 animate-spin" />
            ) : profile?.role === 'admin' ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden md:flex items-center gap-4 mr-4 border-r border-zinc-800 pr-4">
                  <button 
                    onClick={() => setView('home')}
                    className={cn("text-sm font-bold transition-colors", view === 'home' ? "text-blue-400" : "text-zinc-500 hover:text-zinc-300")}
                  >
                    홈
                  </button>
                  <button 
                    onClick={() => setView('leaderboard')}
                    className={cn("text-sm font-bold transition-colors", view === 'leaderboard' ? "text-blue-400" : "text-zinc-500 hover:text-zinc-300")}
                  >
                    리더보드
                  </button>
                  <button 
                    onClick={() => setView('admin')}
                    className={cn("text-sm font-bold transition-colors", view === 'admin' ? "text-purple-400" : "text-zinc-500 hover:text-zinc-300")}
                  >
                    관리
                  </button>
                </div>
                <span className="text-xs sm:text-sm font-medium hidden sm:inline text-zinc-400">관리자님</span>
                <button 
                  onClick={handleLogout}
                  className="p-1.5 sm:p-2 rounded-full hover:bg-zinc-800 text-zinc-400 transition-colors"
                  title="로그아웃"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-zinc-800 text-zinc-500 transition-colors border border-zinc-800"
                title="관리자 로그인"
              >
                <ShieldCheck size={16} />
                <span className="text-[10px] sm:text-xs font-bold">관리자 로그인</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Random Quote Section */}
        <div 
          className="mb-12 text-center flex flex-col items-center justify-center bg-zinc-900/40 px-6 rounded-3xl border border-zinc-800/50 relative overflow-hidden group h-[220px] sm:h-[280px]"
          style={{ 
            boxShadow: `inset 0 0 60px ${themeColor}08`
          }}
        >
          <div className="absolute -top-4 -left-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Trophy size={160} style={{ color: themeColor }} className="rotate-12" />
          </div>
          
          <div className="relative z-10 w-full">
            <div className="flex justify-center mb-6 items-center gap-4">
              <div className="w-16 h-0.5 rounded-full opacity-30" style={{ backgroundColor: themeColor }} />
              <Quote size={20} className="text-zinc-700" />
              <div className="w-16 h-0.5 rounded-full opacity-30" style={{ backgroundColor: themeColor }} />
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={quote}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="max-w-2xl mx-auto px-4"
              >
                <p 
                  className={cn(
                    "font-black italic text-white tracking-tighter leading-tight transition-all duration-500",
                    quote.length > 40 ? "text-xl sm:text-2xl" : "text-2xl sm:text-4xl"
                  )}
                  style={{ 
                    textShadow: `0 0 20px ${themeColor}44`
                  }}
                >
                  "{quote}"
                </p>
              </motion.div>
            </AnimatePresence>
            <div className="flex justify-center mt-8">
              <div className="w-1 h-1 rounded-full opacity-50" style={{ backgroundColor: themeColor }} />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-zinc-900 p-1.5 rounded-2xl shadow-2xl mb-12 border border-zinc-800 max-w-md mx-auto">
          <button 
            onClick={() => setView('home')}
            className={cn(
              "flex-1 py-3 rounded-xl font-black transition-all text-sm uppercase tracking-widest",
              view === 'home' ? "text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
            )}
            style={view === 'home' ? { backgroundColor: themeColor, boxShadow: `0 0 20px ${themeColor}4D` } : {}}
          >
            홈
          </button>
          <button 
            onClick={() => setView('leaderboard')}
            className={cn(
              "flex-1 py-3 rounded-xl font-black transition-all text-sm uppercase tracking-widest",
              view === 'leaderboard' ? "text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
            )}
            style={view === 'leaderboard' ? { backgroundColor: themeColor, boxShadow: `0 0 20px ${themeColor}4D` } : {}}
          >
            리더보드
          </button>
          {profile?.role === 'admin' && (
            <button 
              onClick={() => setView('admin')}
              className={cn(
                "flex-1 py-3 rounded-xl font-black transition-all text-sm uppercase tracking-widest",
                view === 'admin' ? "bg-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.3)]" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              관리자
            </button>
          )}
        </div>

        {/* View Content */}
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              {/* Current Status Card */}
              <div 
                className="rounded-3xl p-8 shadow-2xl border border-zinc-800/50 relative overflow-hidden"
                style={{ 
                  background: `linear-gradient(145deg, ${themeColor}25 0%, #111113 35%, #000000 100%)`,
                  boxShadow: `0 25px 50px -12px ${themeColor}15`
                }}
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-white/[0.03] to-transparent rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
                
                <div className="flex flex-col items-center justify-center mb-8 text-center relative z-10">
                  <h2 className="text-2xl font-black flex items-center gap-3 mb-1 text-white tracking-tight">
                    <CheckCircle className="text-green-500" size={24} />
                    현재 KBO 순위
                  </h2>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full" style={{ backgroundColor: themeColor }} />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Official Rankings</span>
                    <div className="w-1 h-1 rounded-full" style={{ backgroundColor: themeColor }} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {sortedCurrentRankings.map((entry) => {
                    const team = getTeam(entry.teamId);
                    return (
                      <div 
                        key={entry.teamId} 
                        className="relative overflow-hidden flex items-center gap-4 p-4 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 group hover:border-zinc-500 transition-all"
                      >
                        {/* Team Color Accent */}
                        <div 
                          className="absolute left-0 top-0 bottom-0 w-1 opacity-40 group-hover:w-1.5 transition-all" 
                          style={{ backgroundColor: team?.color }} 
                        />
                        
                        <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        
                        <span className="text-2xl font-black text-zinc-600 w-8 text-center italic">
                          {entry.rank}
                        </span>
                        
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-zinc-500 uppercase tracking-tighter mb-0.5">
                            {team?.id}
                          </span>
                          <span className="font-black text-lg text-white tracking-tight">
                            {team?.name}
                          </span>
                        </div>

                        {/* Subtle background logo/text effect */}
                        <div className="absolute right-2 -bottom-2 opacity-[0.03] pointer-events-none select-none">
                          <span className="text-6xl font-black italic">{team?.short}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Section */}
              <div className="text-center space-y-4">
                <button 
                  onClick={() => setView('predict')}
                  className="w-full sm:w-auto px-12 py-4 bg-blue-600 text-white rounded-2xl font-black text-xl shadow-lg hover:bg-blue-700 hover:scale-105 transition-all flex items-center justify-center gap-3 mx-auto"
                >
                  <Send size={24} />
                  순위 예측하기
                </button>
              </div>

              {/* Ranking Trends Graph */}
              {historicalRankings.length > 1 && (
                <div className="mt-12 bg-zinc-900 rounded-2xl p-6 border border-zinc-800 shadow-xl">
                  <div className="flex items-center gap-2 mb-6">
                    <Activity className="text-blue-400" />
                    <h2 className="text-xl font-bold text-white">순위 변동 추이 (3/28 이후)</h2>
                  </div>
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis 
                          dataKey="date" 
                          stroke="#666" 
                          fontSize={12} 
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          reversed 
                          domain={[1, 10]} 
                          ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]} 
                          stroke="#666" 
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px' }}
                          itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                          labelStyle={{ color: '#999', marginBottom: '4px', fontSize: '10px' }}
                        />
                        <Legend 
                          iconType="circle" 
                          wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}
                        />
                        {TEAMS.map(team => (
                          <Line 
                            key={team.id}
                            type="monotone" 
                            dataKey={team.id} 
                            name={team.short}
                            stroke={team.color} 
                            strokeWidth={3}
                            dot={{ r: 4, fill: team.color, strokeWidth: 0 }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                            connectNulls
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[10px] text-zinc-600 mt-4 text-center font-bold uppercase tracking-widest">
                    * Y축이 위로 갈수록 높은 순위(1위)입니다.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {view === 'predict' && (
            <motion.div
              key="predict"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-zinc-900 rounded-2xl p-8 shadow-xl border border-zinc-800"
            >
              <h2 className="text-2xl font-bold mb-6 text-center text-white">2026 순위 예측하기</h2>
              
              <div className="mb-8">
                <p className="text-sm text-zinc-500 mb-4 text-center">카드를 드래그하여 순위를 조정하세요.</p>
                <DndContext 
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext 
                    items={predictRankings}
                    strategy={verticalListSortingStrategy}
                  >
                    {predictRankings.map((id, index) => (
                      <SortableItem key={id} id={id} team={getTeam(id)} index={index} />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>

              <div className="space-y-6 mb-8">
                <div>
                  <label className="block text-sm font-bold text-zinc-400 mb-2">이름</label>
                  <input 
                    type="text" 
                    value={predictName}
                    onChange={(e) => setPredictName(e.target.value)}
                    placeholder="리더보드에 표시될 이름"
                    className="w-full p-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-zinc-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-400 mb-2">관리자에게 보내는 말</label>
                  <textarea 
                    value={predictMessage}
                    onChange={(e) => setPredictMessage(e.target.value)}
                    placeholder="예측 근거 등 한마디!"
                    className="w-full p-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all h-24 resize-none placeholder:text-zinc-600"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setView('home')}
                  className="flex-1 py-4 bg-zinc-800 text-zinc-400 rounded-xl font-bold hover:bg-zinc-700 transition-all"
                >
                  취소
                </button>
                <button 
                  onClick={submitPrediction}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg transition-all"
                >
                  제출하기
                </button>
              </div>
            </motion.div>
          )}

          {view === 'leaderboard' && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="bg-zinc-900 rounded-2xl shadow-xl overflow-hidden border border-zinc-800">
                <div className="bg-blue-900 px-6 py-4 text-white text-center border-b border-blue-800">
                  <div className="flex items-center justify-center gap-3">
                    <Trophy size={24} className="text-yellow-400" />
                    <h2 className="text-xl font-black">예측 리더보드</h2>
                  </div>
                  <p className="text-blue-200 text-xs mt-1">정확한 순위 예측으로 점수를 획득하세요!</p>
                </div>
                
                <div className="divide-y divide-zinc-800">
                  {predictions.length > 0 ? (
                    predictions.map((pred, idx) => {
                      const displayRank = predictions.findIndex(p => p.score === pred.score) + 1;
                      return (
                        <div 
                          key={pred.id} 
                          onClick={() => setSelectedPrediction(pred)}
                          className={cn(
                            "p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors cursor-pointer group",
                            user?.uid === pred.userId && "bg-blue-600/10 border-l-4 border-blue-500"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <span className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                              displayRank === 1 ? "bg-yellow-500 text-black" : 
                              displayRank === 2 ? "bg-zinc-300 text-black" :
                              displayRank === 3 ? "bg-amber-600 text-white" : "bg-zinc-800 text-zinc-500"
                            )}>
                              {displayRank}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="font-bold text-white group-hover:text-blue-400 transition-colors truncate">{pred.name}</p>
                                <span className="text-[9px] text-zinc-600 font-medium bg-zinc-800/50 px-1.5 py-0.5 rounded border border-zinc-800">
                                  {formatDate(pred.createdAt)}
                                </span>
                              </div>
                              <p className="text-[10px] text-zinc-500 truncate max-w-[180px] sm:max-w-xs italic">"{getPredictionMessage(pred, true)}"</p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 flex items-center gap-3">
                            <div>
                              <p className="text-xl font-black text-blue-400">{pred.score}점</p>
                              <div className="flex gap-0.5 mt-1 justify-end">
                                {pred.rankings.slice(0, 5).map((id) => (
                                  <div key={id} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getTeam(id)?.color }} />
                                ))}
                              </div>
                            </div>
                            {profile?.role === 'admin' && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  rejectPrediction(pred);
                                }}
                                className="p-2 hover:bg-red-600/20 text-red-500 rounded-lg transition-colors"
                                title="삭제"
                              >
                                <X size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-12 text-center text-zinc-600">
                      <Clock size={48} className="mx-auto mb-4 opacity-20" />
                      <p>아직 승인된 예측이 없습니다.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'admin' && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              {/* Official Ranking Update */}
              <div className="bg-zinc-900 rounded-2xl p-6 shadow-xl border border-zinc-800">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-purple-400">
                  <ShieldCheck />
                  공식 순위 업데이트
                </h2>
                <p className="text-sm text-zinc-500 mb-4">
                  KBO 공식 홈페이지의 순위 텍스트를 복사해서 붙여넣으세요.<br/>
                  예시: 1 롯데 12 8 2 2 0.800 - 1패
                </p>
                
                <textarea 
                  value={adminRankingsText}
                  onChange={(e) => setAdminRankingsText(e.target.value)}
                  placeholder="여기에 순위 데이터를 붙여넣으세요..."
                  className="w-full p-4 rounded-xl bg-zinc-800 border border-zinc-700 text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all h-48 font-mono text-sm mb-4 placeholder:text-zinc-600"
                />

                <div className="flex gap-4 mb-6">
                  <button 
                    onClick={handleExtractRankings}
                    className="flex-1 py-4 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-xl font-bold hover:bg-zinc-700 transition-all"
                  >
                    순위 추출하기
                  </button>
                  <button 
                    onClick={updateOfficialRankings}
                    disabled={!extractedRankings}
                    className={cn(
                      "flex-1 py-4 rounded-xl font-bold transition-all shadow-lg",
                      extractedRankings 
                        ? "bg-purple-600 text-white hover:bg-purple-700" 
                        : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                    )}
                  >
                    공식 순위 업데이트
                  </button>
                </div>

                {/* Extraction Preview */}
                <AnimatePresence>
                  {extractedRankings && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-5 bg-zinc-800/50 rounded-2xl border border-purple-900/30 mb-4">
                        <h3 className="text-sm font-black text-purple-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <CheckCircle size={14} />
                          추출된 순위 미리보기
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {extractedRankings.sort((a, b) => a.rank - b.rank).map((entry) => {
                            const team = getTeam(entry.teamId);
                            return (
                              <div key={entry.teamId} className="flex items-center gap-2 p-2 bg-zinc-900 rounded-lg border border-zinc-800">
                                <span className="text-xs font-black text-zinc-600 w-4">{entry.rank}</span>
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: team?.color }} />
                                <span className="text-xs font-bold text-zinc-300 truncate">{team?.short}</span>
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-4 italic text-center">
                          위 순위가 맞다면 '공식 순위 업데이트' 버튼을 눌러주세요.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Pending Approvals */}
              <div className="bg-zinc-900 rounded-2xl p-6 shadow-xl border border-zinc-800">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-orange-400">
                  <Clock />
                  승인 대기 중인 예측 ({pendingPredictions.length})
                </h2>
                
                <div className="space-y-4">
                  {pendingPredictions.map(pred => (
                    <div key={pred.id} className="p-5 rounded-2xl bg-zinc-800 border border-zinc-700 shadow-lg">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                        <div>
                          <input 
                            type="text"
                            defaultValue={pred.name}
                            onBlur={(e) => {
                              if (e.target.value !== pred.name) {
                                updatePredictionName(pred.id, e.target.value);
                              }
                            }}
                            className="text-lg font-black text-white mb-1 bg-transparent border-b border-dashed border-zinc-600 focus:border-blue-500 outline-none w-full"
                          />
                          <p className="text-sm text-zinc-400 italic">"{pred.message || '한마디 없음'}"</p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button 
                            onClick={() => approvePrediction(pred)}
                            className="flex-1 sm:flex-none px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-black hover:bg-green-700 transition-all shadow-lg shadow-green-900/20"
                          >
                            승인하기
                          </button>
                          <button 
                            onClick={() => rejectPrediction(pred)}
                            className="flex-1 sm:flex-none px-6 py-2.5 bg-red-600/20 text-red-400 border border-red-900/50 rounded-xl text-sm font-black hover:bg-red-600 hover:text-white transition-all"
                          >
                            삭제하기
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {pred.rankings.map((id, idx) => (
                          <div key={id} className="flex flex-col items-center p-1.5 bg-zinc-900 rounded-lg border border-zinc-700/50">
                            <span className="text-[10px] font-black text-zinc-500 mb-0.5">{idx + 1}</span>
                            <div className="w-full h-1 rounded-full mb-1" style={{ backgroundColor: getTeam(id)?.color }} />
                            <span className="text-[10px] font-bold text-zinc-300 truncate w-full text-center">
                              {getTeam(id)?.short}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {pendingPredictions.length === 0 && (
                    <div className="text-center py-12 bg-zinc-800/30 rounded-2xl border border-dashed border-zinc-800">
                      <Clock size={40} className="mx-auto mb-3 text-zinc-700" />
                      <p className="text-zinc-600 font-bold">대기 중인 예측이 없습니다.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Navigation (Mobile Style) */}
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 p-2 flex justify-around sm:hidden z-50">
        <button onClick={() => setView('home')} className={cn("p-2 flex flex-col items-center", view === 'home' ? "text-blue-400" : "text-zinc-600")}>
          <Home size={20} style={view === 'home' ? { color: themeColor } : {}} />
          <span className="text-[10px] font-bold" style={view === 'home' ? { color: themeColor } : {}}>홈</span>
        </button>
        <button onClick={() => setView('leaderboard')} className={cn("p-2 flex flex-col items-center", view === 'leaderboard' ? "text-blue-400" : "text-zinc-600")}>
          <Trophy size={20} style={view === 'leaderboard' ? { color: themeColor } : {}} />
          <span className="text-[10px] font-bold" style={view === 'leaderboard' ? { color: themeColor } : {}}>리더보드</span>
        </button>
        {profile?.role === 'admin' && (
          <button onClick={() => setView('admin')} className={cn("p-2 flex flex-col items-center", view === 'admin' ? "text-purple-400" : "text-zinc-600")}>
            <ShieldCheck size={20} />
            <span className="text-[10px] font-bold">관리</span>
          </button>
        )}
      </div>

      {/* Visitor Counter (Desktop/Tablet) */}
      <div className="fixed bottom-4 right-4 hidden sm:flex items-center gap-2 bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 px-3 py-1.5 rounded-full shadow-lg z-40">
        <Users size={14} className="text-zinc-500" />
        <span className="text-xs font-bold text-zinc-400">
          누적 방문 <span className="text-blue-400">{visitorCount.toLocaleString()}</span>
        </span>
      </div>

      {/* Visitor Counter (Mobile) */}
      <div className="fixed bottom-16 right-4 sm:hidden flex items-center gap-2 bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 px-3 py-1.5 rounded-full shadow-lg z-40">
        <Users size={12} className="text-zinc-500" />
        <span className="text-[10px] font-bold text-zinc-400">
          방문 <span className="text-blue-400">{visitorCount.toLocaleString()}</span>
        </span>
      </div>
      {/* Prediction Detail Modal */}
      <AnimatePresence>
        {selectedPrediction && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  {profile?.role === 'admin' ? (
                    <div className="space-y-1">
                      <input 
                        type="text"
                        defaultValue={selectedPrediction.name}
                        onBlur={(e) => {
                          if (e.target.value !== selectedPrediction.name) {
                            updatePredictionName(selectedPrediction.id, e.target.value);
                            setSelectedPrediction({ ...selectedPrediction, name: e.target.value });
                          }
                        }}
                        className="text-xl font-bold text-white bg-transparent border-b border-dashed border-zinc-600 focus:border-blue-500 outline-none w-full mb-1"
                      />
                      <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">{formatDate(selectedPrediction.createdAt)} 예측됨</p>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-xl font-bold text-white truncate">{selectedPrediction.name}님의 예측</h3>
                      <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">{formatDate(selectedPrediction.createdAt)} 예측됨</p>
                    </div>
                  )}
                  <p className="text-sm text-zinc-500 italic break-words">"{getPredictionMessage(selectedPrediction)}"</p>
                </div>
                <button 
                  onClick={() => setSelectedPrediction(null)}
                  className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors flex-shrink-0 ml-2"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 space-y-2 max-h-[60vh] overflow-y-auto">
                {selectedPrediction.rankings.map((teamId, idx) => {
                  const team = getTeam(teamId);
                  const actualEntry = currentRankings.find(a => a.teamId === teamId);
                  const isCorrect = actualEntry && actualEntry.rank === idx + 1;
                  return (
                    <div 
                      key={teamId} 
                      className={cn(
                        "flex items-center gap-4 p-3 rounded-xl border transition-all",
                        isCorrect 
                          ? "bg-zinc-800 border-zinc-700" 
                          : "bg-zinc-900 border-zinc-800 opacity-40 grayscale"
                      )}
                    >
                      <span className={cn(
                        "w-8 h-8 flex items-center justify-center rounded-full font-black text-sm",
                        isCorrect ? "bg-green-500 text-white" : "bg-zinc-800 text-zinc-500"
                      )}>
                        {idx + 1}
                      </span>
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: isCorrect ? team?.color : '#444' }} 
                      />
                      <span className={cn(
                        "font-bold",
                        isCorrect ? "text-white" : "text-zinc-500"
                      )}>
                        {team?.name}
                      </span>
                      {isCorrect && (
                        <CheckCircle size={16} className="ml-auto text-green-500" />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="p-6 bg-zinc-800/50 text-center">
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">총 획득 점수</p>
                <p className="text-4xl font-black text-blue-400">{selectedPrediction.score}점</p>
              </div>
              <button 
                onClick={() => setSelectedPrediction(null)}
                className="w-full py-4 bg-zinc-800 text-zinc-400 font-bold hover:bg-zinc-700 transition-all border-t border-zinc-700"
              >
                닫기
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
