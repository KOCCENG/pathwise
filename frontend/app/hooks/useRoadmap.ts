'use client'

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface Milestone {
  id: number;
  label: string;
  period: string;
  completed: boolean;
  items: string[];
}

export interface RoadmapData {
  topic: string;
  milestones: Milestone[];
}

export function useRoadmap() {
  const [data, setData] = useState<RoadmapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generateRoadmap(topic: string, weeks: number) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/roadmap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, weeks }),
      });
      if (!res.ok) throw new Error("Server error");
      const json: RoadmapData = await res.json();
      setData(json);
    } catch {
      setError("Could not generate roadmap. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  function toggleComplete(id: number) {
    if (!data) return;
    setData({
      ...data,
      milestones: data.milestones.map((m) =>
        m.id === id ? { ...m, completed: !m.completed } : m
      ),
    });
  }

  return { data, loading, error, generateRoadmap, toggleComplete };
}
