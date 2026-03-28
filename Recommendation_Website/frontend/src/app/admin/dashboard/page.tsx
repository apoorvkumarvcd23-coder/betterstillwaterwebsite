"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card";
import { Users, Activity, Target, ArrowUpRight } from "lucide-react";

type HistorySubmission = {
  id: number;
  name: string;
  source: string;
  created_by: string;
  language: string | null;
  voice_transcript: string | null;
  createdAt: string;
};

type HistoryItem = {
  mobile: string;
  total: number;
  latestAt: string;
  submissions: HistorySubmission[];
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [mobile, setMobile] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:3000/recommendation/api";

  useEffect(() => {
    fetch(`${apiBase}/admin/dashboard`)
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(console.error);
  }, []);

  const loadHistory = async (mobileFilter?: string) => {
    try {
      setHistoryLoading(true);
      setHistoryError("");
      const params = new URLSearchParams({ limit: "200" });
      if (mobileFilter && mobileFilter.trim()) {
        params.set("mobile", mobileFilter.trim());
      }

      const response = await fetch(
        `${apiBase}/admin/wellness-history?${params}`,
      );
      if (!response.ok) {
        throw new Error("Failed to load submission history");
      }
      const data = await response.json();
      setHistory(data.items || []);
    } catch (error: any) {
      setHistoryError(error?.message || "Failed to load submission history");
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  if (!stats) {
    return (
      <div className="p-20 text-center text-gray-400">Loading Dashboard...</div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-heading mb-8">Admin Dashboard</h1>

        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <Card>
            <div className="flex items-center gap-4 mb-2">
              <div className="p-2 bg-accent/20 rounded-lg">
                <Users className="text-accent w-5 h-5" />
              </div>
              <h3 className="text-gray-400 font-medium">Total Assessments</h3>
            </div>
            <p className="text-4xl font-semibold">{stats.totalAssessments}</p>
          </Card>

          <Card>
            <div className="flex items-center gap-4 mb-2">
              <div className="p-2 bg-accent/20 rounded-lg">
                <Target className="text-accent w-5 h-5" />
              </div>
              <h3 className="text-gray-400 font-medium">Conversion Rate</h3>
            </div>
            <p className="text-4xl font-semibold">{stats.conversionRate}%</p>
          </Card>

          <Card>
            <div className="flex items-center gap-4 mb-2">
              <div className="p-2 bg-accent/20 rounded-lg">
                <Activity className="text-accent w-5 h-5" />
              </div>
              <h3 className="text-gray-400 font-medium">Top Issue</h3>
            </div>
            <p className="text-xl font-semibold mt-2">
              {stats.topConditions?.[0]?.[0] || "N/A"}
            </p>
          </Card>

          <Card>
            <div className="flex items-center gap-4 mb-2">
              <div className="p-2 bg-accent/20 rounded-lg">
                <ArrowUpRight className="text-accent w-5 h-5" />
              </div>
              <h3 className="text-gray-400 font-medium">Active Users</h3>
            </div>
            <p className="text-4xl font-semibold">Live</p>
          </Card>
        </div>

        <h2 className="text-2xl font-heading mb-6">
          Top Health Issues Reported
        </h2>
        <Card>
          <div className="divide-y divide-white/5">
            {stats.topConditions?.map((c: any, i: number) => (
              <div key={i} className="py-4 flex justify-between items-center">
                <span className="font-medium text-lg">{c[0]}</span>
                <span className="bg-cards px-3 py-1 rounded-full text-sm">
                  {c[1]} cases
                </span>
              </div>
            ))}
            {!stats.topConditions?.length && (
              <p className="py-4 text-gray-500">No data collected yet.</p>
            )}
          </div>
        </Card>

        <div className="mt-12">
          <h2 className="text-2xl font-heading mb-6">
            Wellness Submission History
          </h2>
          <Card>
            <div className="flex flex-col md:flex-row gap-3 mb-6">
              <input
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="Search by mobile number"
                className="flex-1 bg-background border border-cards p-3 rounded-lg focus:outline-none focus:border-accent"
              />
              <button
                onClick={() => loadHistory(mobile)}
                className="px-5 py-3 rounded-lg bg-accent text-background font-medium"
              >
                Search
              </button>
              <button
                onClick={() => {
                  setMobile("");
                  loadHistory("");
                }}
                className="px-5 py-3 rounded-lg border border-cards text-gray-300"
              >
                Reset
              </button>
            </div>

            {historyLoading && (
              <p className="text-gray-400">Loading history...</p>
            )}
            {historyError && <p className="text-red-400">{historyError}</p>}

            {!historyLoading && !history.length && !historyError && (
              <p className="text-gray-500">
                No wellness submissions found yet.
              </p>
            )}

            <div className="space-y-4">
              {history.map((item) => (
                <div
                  key={item.mobile}
                  className="border border-white/10 rounded-lg p-4"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                    <h3 className="text-lg font-semibold">{item.mobile}</h3>
                    <p className="text-sm text-gray-400">
                      {item.total} submission(s) | latest{" "}
                      {new Date(item.latestAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {item.submissions.map((submission) => (
                      <div
                        key={submission.id}
                        className="bg-cards/40 rounded-lg p-3"
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                          <p className="font-medium">{submission.name}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(submission.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <p className="text-sm text-gray-400 mt-1">
                          source: {submission.source} | created_by:{" "}
                          {submission.created_by} | language:{" "}
                          {submission.language || "n/a"}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          voice transcript:{" "}
                          {submission.voice_transcript
                            ? "available"
                            : "not provided"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
