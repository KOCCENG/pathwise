'use client'

import { useState } from "react";
import { useRoadmap } from "../hooks/useRoadmap";
import RoadmapViewer from "../components/RoadmapViewer";
import Link from "next/link";

export default function RoadmapPage() {
  const [topic, setTopic]   = useState("");
  const [weeks, setWeeks]   = useState(8);
  const { data, loading, error, generateRoadmap, toggleComplete } = useRoadmap();

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-12">
      <div className="w-full max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Roadmap</h1>
            <p className="text-neutral-500 text-sm mt-1">
              Type a topic and generate your visual learning map.
            </p>
          </div>
          <Link
            href="/"
            className="text-xs text-neutral-500 hover:text-white transition-colors"
          >
            ← Back to planner
          </Link>
        </div>

        {/* Input area */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 mb-6">
          <div className="flex gap-3 flex-wrap">
            <input
              className="flex-1 min-w-48 bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder-neutral-500 outline-none focus:border-indigo-500 transition-colors text-sm"
              placeholder="e.g. Machine Learning, React, LangGraph..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && topic.trim() && generateRoadmap(topic, weeks)}
            />
            <div className="flex items-center gap-2">
              <span className="text-neutral-500 text-sm whitespace-nowrap">weeks:</span>
              <input
                type="number"
                min={2}
                max={52}
                value={weeks}
                onChange={(e) => setWeeks(Math.max(2, parseInt(e.target.value) || 8))}
                className="w-16 bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-3 text-white outline-none focus:border-indigo-500 transition-colors text-sm text-center"
              />
            </div>
            <button
              onClick={() => topic.trim() && generateRoadmap(topic, weeks)}
              disabled={!topic.trim() || loading}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating...
                </span>
              ) : "Generate"}
            </button>
          </div>
          {error && <p className="mt-3 text-red-400 text-xs">{error}</p>}
        </div>

        {/* Roadmap viewer */}
        {data && (
          <RoadmapViewer
            data={data}
            onMilestoneComplete={toggleComplete}
            onRequestPlan={(label) => console.log("Request plan for:", label)}
          />
        )}

        {/* Empty state */}
        {!data && !loading && (
          <div className="text-center py-20 text-neutral-600 text-sm">
            Enter a topic above to generate your roadmap.
          </div>
        )}
      </div>
    </main>
  );
}
