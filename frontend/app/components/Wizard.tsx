'use client'

import { useState } from "react";
import RoadmapViewer from "./RoadmapViewer";
import type { RoadmapData } from "../hooks/useRoadmap";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Types ──────────────────────────────────────────────────────
type Step = "topic" | "questions" | "details" | "result" | "loading";

interface PlanResult {
  level: string;
  roadmap: string[];
  resources: Record<string, string[]>;
  weekly_plan: { week: number; topics: string[]; hours: number }[];
}

// ── Translations ───────────────────────────────────────────────
const t: Record<string, Record<string, string | string[]>> = {
  Turkish: {
    topicLabel: "Ne öğrenmek istiyorsun?",
    topicPlaceholder: "örn. Machine Learning, LangGraph, TypeScript...",
    continue: "Devam Et →",
    back: "← Geri",
    questionsLabel: "Hakkında birkaç soru:",
    answerPlaceholder: "Cevabınız...",
    goalLabel: "Amacın ne?",
    hoursLabel: "Haftada kaç saat çalışabilirsin?",
    hoursPlaceholder: "örn. 5",
    generate: "Planımı Oluştur →",
    levelLabel: "Seviyeniz",
    roadmapLabel: "Yol Haritası",
    roadmapHint: "Kaynakları görmek için adıma tıkla",
    resourcesLabel: "Kaynaklar",
    startOver: "Baştan Başla",
    thinking: "Düşünüyorum...",
    serverError: "Sunucuya ulaşılamadı. Backend çalışıyor mu?",
    planError: "Plan oluşturulurken bir sorun oluştu.",
    goals: [
      "İş bulmak veya kariyer değiştirmek istiyorum",
      "Kişisel bir proje geliştirmek istiyorum",
      "Sertifika almak istiyorum",
      "Akademik veya araştırma amaçlı öğrenmek istiyorum",
      "Hobim olarak öğrenmek istiyorum",
    ],
  },
  English: {
    topicLabel: "What do you want to learn?",
    topicPlaceholder: "e.g. LangGraph, Machine Learning, TypeScript...",
    continue: "Continue →",
    back: "← Back",
    questionsLabel: "A few quick questions about",
    answerPlaceholder: "Your answer...",
    goalLabel: "What's your goal?",
    hoursLabel: "How many hours per week can you study?",
    hoursPlaceholder: "e.g. 5",
    generate: "Generate my plan →",
    levelLabel: "Your level",
    roadmapLabel: "Roadmap",
    roadmapHint: "Click any step to see resources",
    resourcesLabel: "Resources",
    startOver: "Start over",
    thinking: "Thinking...",
    serverError: "Could not reach the server. Is the backend running?",
    planError: "Something went wrong generating your plan.",
    goals: [
      "Get a job or switch careers",
      "Build a personal project",
      "Pass a certification",
      "Academic or research purposes",
      "Learn as a hobby",
    ],
  },
};

function useT(language: string) {
  const base = t[language] ?? t["English"];
  return {
    ...base,
    goals: (base.goals as string[]),
  };
}

// ── Small UI primitives ────────────────────────────────────────
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-neutral-900 border border-neutral-800 rounded-2xl p-8 ${className}`}>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium text-neutral-500 uppercase tracking-widest mb-3">
      {children}
    </p>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  onKeyDown,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}) {
  return (
    <input
      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder-neutral-500 outline-none focus:border-indigo-500 transition-colors text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      onKeyDown={onKeyDown}
    />
  );
}

function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <select
      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500 transition-colors text-sm appearance-none cursor-pointer"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="" disabled>{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

function Button({
  onClick,
  disabled,
  children,
  variant = "primary",
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: "primary" | "ghost";
}) {
  const base = "px-5 py-2.5 rounded-xl text-sm font-medium transition-all";
  const styles =
    variant === "primary"
      ? "bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
      : "text-neutral-400 hover:text-white";
  return (
    <button className={`${base} ${styles}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex gap-2 justify-center mb-8">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i === current ? "w-6 bg-indigo-500" : "w-1.5 bg-neutral-700"
          }`}
        />
      ))}
    </div>
  );
}

// ── Plan → RoadmapData converter ──────────────────────────────
function planToRoadmap(result: PlanResult, topic: string): RoadmapData {
  return {
    topic,
    milestones: result.roadmap.map((step, i) => {
      const clean = step.replace(/^\d+\.\s*/, "");
      const weekEntry = result.weekly_plan.find((w) =>
        w.topics.some((t) =>
          t.toLowerCase().includes(clean.toLowerCase().slice(0, 20)) ||
          clean.toLowerCase().includes(t.toLowerCase().slice(0, 20))
        )
      );
      const resKey = Object.keys(result.resources).find((k) =>
        k.toLowerCase().includes(clean.toLowerCase().slice(0, 15)) ||
        clean.toLowerCase().includes(k.toLowerCase().slice(0, 15))
      );
      return {
        id: i,
        label: clean,
        period: weekEntry ? `Week ${weekEntry.week}` : `Step ${i + 1}`,
        completed: false,
        items: resKey ? result.resources[resKey].slice(0, 3) : [],
      };
    }),
  };
}

// ── Narrow wrapper (must be outside Wizard to avoid remount on state change) ──
function Narrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white tracking-tight">Pathwise</h1>
        <p className="mt-1.5 text-neutral-500 text-sm">Tell us what you want to learn.</p>
      </div>
      {children}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function Wizard() {
  const [step, setStep] = useState<Step>("topic");
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState("English");
  const [sessionId, setSessionId] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [goal, setGoal] = useState("");
  const [weeklyHours, setWeeklyHours] = useState("");
  const [result, setResult] = useState<PlanResult | null>(null);
  const [error, setError] = useState("");

  const tr = useT(language);

  async function handleTopic() {
    if (!topic.trim()) return;
    setStep("loading");
    setError("");
    try {
      const res = await fetch(`${API}/api/assess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json();
      setSessionId(data.session_id);
      setLanguage(data.language ?? "English");
      setQuestions(data.questions);
      setAnswers(Array(data.questions.length).fill(""));
      setStep("questions");
    } catch {
      setError(tr.serverError);
      setStep("topic");
    }
  }

  function handleAnswers() {
    if (answers.some((a) => !a.trim())) return;
    setStep("details");
  }

  async function handleDetails() {
    if (!goal.trim() || !weeklyHours.trim()) return;
    setStep("loading");
    setError("");
    try {
      const res = await fetch(`${API}/api/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          answers,
          goal,
          weekly_hours: parseInt(weeklyHours),
        }),
      });
      const data = await res.json();
      setResult(data);
      setStep("result");
    } catch {
      setError(tr.planError);
      setStep("details");
    }
  }

  function reset() {
    setStep("topic");
    setTopic("");
    setLanguage("English");
    setSessionId("");
    setQuestions([]);
    setAnswers([]);
    setGoal("");
    setWeeklyHours("");
    setResult(null);
    setError("");
  }

  // ── Render ───────────────────────────────────────────────────

  if (step === "loading") {
    return (
      <Narrow>
        <Card>
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-neutral-400 text-sm">{tr.thinking}</p>
          </div>
        </Card>
      </Narrow>
    );
  }

  if (step === "topic") {
    return (
      <Narrow><Card>
        <StepDots current={0} />
        <Label>{tr.topicLabel}</Label>
        <Input
          value={topic}
          onChange={setTopic}
          placeholder={tr.topicPlaceholder}
          onKeyDown={(e) => e.key === "Enter" && handleTopic()}
        />
        {error && <p className="mt-3 text-red-400 text-xs">{error}</p>}
        <div className="mt-5 flex justify-end">
          <Button onClick={handleTopic} disabled={!topic.trim()}>
            {tr.continue}
          </Button>
        </div>
      </Card></Narrow>
    );
  }

  if (step === "questions") {
    return (
      <Narrow><Card>
        <StepDots current={1} />
        <Label>{tr.questionsLabel} {topic}</Label>
        <div className="flex flex-col gap-5">
          {questions.map((q, i) => (
            <div key={i}>
              <p className="text-white text-sm mb-2">{q}</p>
              <Input
                value={answers[i]}
                onChange={(v) => {
                  const next = [...answers];
                  next[i] = v;
                  setAnswers(next);
                }}
                placeholder={tr.answerPlaceholder}
              />
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-between">
          <Button variant="ghost" onClick={() => setStep("topic")}>{tr.back}</Button>
          <Button onClick={handleAnswers} disabled={answers.some((a) => !a.trim())}>
            {tr.continue}
          </Button>
        </div>
      </Card></Narrow>
    );
  }

  if (step === "details") {
    return (
      <Narrow><Card>
        <StepDots current={2} />
        <div className="flex flex-col gap-5">
          <div>
            <Label>{tr.goalLabel}</Label>
            <Select
              value={goal}
              onChange={setGoal}
              options={tr.goals}
              placeholder="—"
            />
          </div>
          <div>
            <Label>{tr.hoursLabel}</Label>
            <Input
              value={weeklyHours}
              onChange={setWeeklyHours}
              placeholder={tr.hoursPlaceholder}
            />
          </div>
        </div>
        {error && <p className="mt-3 text-red-400 text-xs">{error}</p>}
        <div className="mt-6 flex justify-between">
          <Button variant="ghost" onClick={() => setStep("questions")}>{tr.back}</Button>
          <Button onClick={handleDetails} disabled={!goal.trim() || !weeklyHours.trim()}>
            {tr.generate}
          </Button>
        </div>
      </Card></Narrow>
    );
  }

  if (step === "result" && result) {
    const roadmapData = planToRoadmap(result, topic);
    return (
      <div className="w-full max-w-5xl mx-auto flex flex-col gap-4">
        {/* Header */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-widest mb-1">{tr.levelLabel}</p>
            <p className="text-white font-semibold capitalize text-lg">{result.level}</p>
          </div>
          <span className="text-xs bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 px-3 py-1 rounded-full">
            {topic}
          </span>
        </div>

        <RoadmapViewer data={roadmapData} />

        <div className="flex justify-center pt-1">
          <Button variant="ghost" onClick={reset}>{tr.startOver}</Button>
        </div>
      </div>
    );
  }

  return null;
}
