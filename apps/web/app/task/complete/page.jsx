"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { CheckCircle, AlertCircle, ChevronDown } from "lucide-react";

function TaskCompleteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [submittingBlock, setSubmittingBlock] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid link. Please check the URL and try again.");
      setLoading(false);
      return;
    }

    validateToken();
  }, [token]);

  async function validateToken() {
    try {
      const res = await fetch("/api/email-tokens/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "This link has expired. Contact your onboarding manager for a new one.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setTask(data);
    } catch (err) {
      setError("Error validating link. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkComplete() {
    if (!task) return;

    setLoading(true);
    try {
      const res = await fetch("/api/email-tokens/mark-used", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        setError("Failed to mark task complete. Please try again.");
        setLoading(false);
        return;
      }

      // Mark task complete
      const taskRes = await fetch(`/api/plans/${task.plan_id}/tasks/${task.task_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });

      if (!taskRes.ok) {
        setError("Failed to update task. Please try again.");
        setLoading(false);
        return;
      }

      setCompleted(true);
    } catch (err) {
      setError("Error completing task. Please try again.");
      console.error(err);
      setLoading(false);
    }
  }

  async function handleSubmitBlock() {
    if (!blockReason.trim() || !task) return;

    setSubmittingBlock(true);
    try {
      const res = await fetch(`/api/plans/${task.plan_id}/tasks/${task.task_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "blocked", blocked_reason: blockReason }),
      });

      if (!res.ok) {
        setError("Failed to submit blocker. Please try again.");
        setSubmittingBlock(false);
        return;
      }

      setShowBlockForm(false);
      setCompleted(true);
      setBlockReason("");
    } catch (err) {
      setError("Error submitting blocker. Please try again.");
      console.error(err);
      setSubmittingBlock(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your task...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Link Expired</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500">Contact your onboarding manager for a new link.</p>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Done! 🎉</h2>
          <p className="text-gray-600 mb-4">
            {showBlockForm ? "Your message has been sent. Your onboarding manager will be in touch shortly." : "Your onboarding manager has been notified. Great work!"}
          </p>
          <p className="text-sm text-gray-500">You can close this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{task?.title}</h1>
          <p className="text-gray-600 mb-6">{task?.description}</p>

          {!showBlockForm ? (
            <>
              <button
                onClick={handleMarkComplete}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg mb-4 transition"
              >
                Mark Complete ✓
              </button>

              <button
                onClick={() => setShowBlockForm(true)}
                className="w-full text-blue-600 hover:text-blue-700 font-semibold py-2 px-4 flex items-center justify-center gap-2"
              >
                <AlertCircle className="h-4 w-4" />
                I'm having trouble with this
              </button>
            </>
          ) : (
            <>
              <label className="block text-gray-700 font-semibold mb-2">What's blocking you?</label>
              <textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Describe what's preventing you from completing this step..."
                className="w-full border border-gray-300 rounded-lg p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
              <button
                onClick={handleSubmitBlock}
                disabled={submittingBlock || !blockReason.trim()}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-bold py-3 px-6 rounded-lg transition"
              >
                {submittingBlock ? "Sending..." : "Submit"}
              </button>
              <button
                onClick={() => setShowBlockForm(false)}
                className="w-full text-gray-600 hover:text-gray-700 font-semibold py-2 px-4 mt-2"
              >
                Back
              </button>
            </>
          )}

          <hr className="my-8" />
          <p className="text-xs text-gray-500 text-center">
            You are receiving this because you are part of an onboarding plan. Questions? Contact your onboarding manager.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TaskCompleteContent />
    </Suspense>
  );
}
