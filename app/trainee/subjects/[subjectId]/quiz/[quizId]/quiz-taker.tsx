"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { cn, formatDate } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trophy,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

type QuestionType = "MULTIPLE_CHOICE" | "MULTIPLE_SELECT" | "TRUE_FALSE" | "WRITTEN_RESPONSE";

interface QuizQuestion {
  id: string;
  text: string;
  type: QuestionType;
  options: string[];
  orderIndex: number;
}

interface QuizAttemptRecord {
  id: string;
  score: number;
  passed: boolean;
  attemptNum: number;
  takenAt: string;
  answers: Record<string, unknown>;
}

interface QuizTakerProps {
  quizId: string;
  subjectId: string;
  topicTitle: string;
  subjectTitle: string;
  passingScore: number;
  maxAttempts: number;
  questions: QuizQuestion[];
  existingAttempts: QuizAttemptRecord[];
  correctAnswerMap: Record<string, unknown>;
  /** Link to the next topic's first step, or null if this is the last topic. */
  nextStepHref: string | null;
}

type AnswerMap = Record<string, string | string[]>;

// ─── Shuffle helpers ────────────────────────────────────────────────────────────

function seededRand(seed: number) {
  // Simple deterministic PRNG (mulberry32)
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
  const rand = seededRand(seed);
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ─── Helper ────────────────────────────────────────────────────────────────────

function isAnswered(question: QuizQuestion, answers: AnswerMap): boolean {
  if (question.type === "WRITTEN_RESPONSE") return true;
  const val = answers[question.id];
  if (Array.isArray(val)) return val.length > 0;
  return !!val;
}

function isCorrect(
  question: QuizQuestion,
  answer: string | string[] | undefined,
  correctAnswer: unknown
): boolean {
  if (answer === undefined || answer === null) return false;
  if (question.type === "MULTIPLE_SELECT") {
    const userArr = Array.isArray(answer) ? [...answer].sort() : [answer];
    const correctArr = Array.isArray(correctAnswer)
      ? [...(correctAnswer as string[])].sort()
      : [String(correctAnswer)];
    return JSON.stringify(userArr) === JSON.stringify(correctArr);
  }
  if (question.type === "TRUE_FALSE") {
    return String(answer).toLowerCase() === String(correctAnswer).toLowerCase();
  }
  return String(answer) === String(correctAnswer);
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function QuestionCard({
  question,
  index,
  answer,
  onChange,
  showResult,
  correctAnswer,
  shuffledOptions,
}: {
  question: QuizQuestion;
  index: number;
  answer: string | string[] | undefined;
  onChange: (id: string, value: string | string[]) => void;
  showResult: boolean;
  correctAnswer?: unknown;
  shuffledOptions?: string[];
}) {
  const correct = showResult ? isCorrect(question, answer, correctAnswer) : null;
  const options = shuffledOptions ?? question.options;

  return (
    <div
      className={cn(
        "rounded-xl border p-5 transition-colors",
        showResult
          ? correct === true
            ? "border-emerald-200 bg-emerald-50"
            : question.type === "WRITTEN_RESPONSE"
            ? "border-gray-200 bg-white"
            : "border-red-200 bg-red-50"
          : "border-gray-200 bg-white"
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold flex items-center justify-center mt-0.5">
            {index + 1}
          </span>
          <p className="text-sm font-medium text-gray-900 leading-relaxed">{question.text}</p>
        </div>
        {showResult && question.type !== "WRITTEN_RESPONSE" && (
          <div className="flex-shrink-0">
            {correct ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
          </div>
        )}
      </div>

      {/* MULTIPLE_CHOICE */}
      {question.type === "MULTIPLE_CHOICE" && (
        <div className="space-y-2 pl-9">
          {options.map((opt, i) => {
            const selected = answer === opt;
            const isCorrectOpt = showResult && String(correctAnswer) === opt;
            const isWrong = showResult && selected && !isCorrectOpt;
            return (
              <label
                key={i}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors",
                  showResult
                    ? isCorrectOpt
                      ? "border-emerald-400 bg-emerald-50"
                      : isWrong
                      ? "border-red-400 bg-red-50"
                      : "border-gray-200 bg-white"
                    : selected
                    ? "border-accent bg-accent-tint"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                )}
              >
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  value={opt}
                  checked={selected}
                  onChange={() => !showResult && onChange(question.id, opt)}
                  disabled={showResult}
                  className="accent-pw-orange"
                />
                <span className="text-sm text-gray-700">{opt}</span>
                {showResult && isCorrectOpt && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-auto" />
                )}
              </label>
            );
          })}
        </div>
      )}

      {/* TRUE_FALSE */}
      {question.type === "TRUE_FALSE" && (
        <div className="flex gap-3 pl-9">
          {["True", "False"].map((opt) => {
            const selected = String(answer).toLowerCase() === opt.toLowerCase();
            const isCorrectOpt =
              showResult && String(correctAnswer).toLowerCase() === opt.toLowerCase();
            const isWrong = showResult && selected && !isCorrectOpt;
            return (
              <label
                key={opt}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-4 py-2.5 cursor-pointer transition-colors flex-1 justify-center",
                  showResult
                    ? isCorrectOpt
                      ? "border-emerald-400 bg-emerald-50"
                      : isWrong
                      ? "border-red-400 bg-red-50"
                      : "border-gray-200 bg-white"
                    : selected
                    ? "border-accent bg-accent-tint"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                )}
              >
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  value={opt}
                  checked={selected}
                  onChange={() => !showResult && onChange(question.id, opt)}
                  disabled={showResult}
                  className="accent-pw-orange"
                />
                <span className="text-sm font-medium text-gray-700">{opt}</span>
              </label>
            );
          })}
        </div>
      )}

      {/* MULTIPLE_SELECT */}
      {question.type === "MULTIPLE_SELECT" && (
        <div className="space-y-2 pl-9">
          <p className="text-xs text-gray-500 mb-2 -mt-2">Select all that apply</p>
          {options.map((opt, i) => {
            const selectedArr = Array.isArray(answer) ? answer : [];
            const selected = selectedArr.includes(opt);
            const correctArr = Array.isArray(correctAnswer)
              ? (correctAnswer as string[])
              : [String(correctAnswer)];
            const isCorrectOpt = showResult && correctArr.includes(opt);
            const isWrong = showResult && selected && !isCorrectOpt;
            const isMissed = showResult && !selected && isCorrectOpt;
            return (
              <label
                key={i}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors",
                  showResult
                    ? isCorrectOpt
                      ? "border-emerald-400 bg-emerald-50"
                      : isWrong
                      ? "border-red-400 bg-red-50"
                      : isMissed
                      ? "border-amber-400 bg-amber-50"
                      : "border-gray-200 bg-white"
                    : selected
                    ? "border-accent bg-accent-tint"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                )}
              >
                <input
                  type="checkbox"
                  value={opt}
                  checked={selected}
                  onChange={() => {
                    if (showResult) return;
                    const current = Array.isArray(answer) ? answer : [];
                    const next = current.includes(opt)
                      ? current.filter((v) => v !== opt)
                      : [...current, opt];
                    onChange(question.id, next);
                  }}
                  disabled={showResult}
                  className="accent-pw-orange"
                />
                <span className="text-sm text-gray-700">{opt}</span>
                {showResult && isCorrectOpt && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-auto" />
                )}
              </label>
            );
          })}
        </div>
      )}

      {/* WRITTEN_RESPONSE */}
      {question.type === "WRITTEN_RESPONSE" && (
        <div className="pl-9">
          <textarea
            rows={3}
            value={(answer as string) ?? ""}
            onChange={(e) => !showResult && onChange(question.id, e.target.value)}
            disabled={showResult}
            placeholder="Type your response here…"
            className={cn(
              "w-full rounded-lg border px-3 py-2 text-sm text-gray-700 resize-none",
              "placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent",
              "disabled:bg-gray-50 disabled:cursor-default",
              "border-gray-200"
            )}
          />
          {showResult && (
            <p className="text-xs text-gray-400 mt-1.5">
              Written responses are reviewed by your manager.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Results View ──────────────────────────────────────────────────────────────

function ResultsView({
  score,
  passed,
  passingScore,
  attemptsUsed,
  maxAttempts,
  questions,
  answers,
  correctAnswerMap,
  shuffledQuestions,
  shuffledOptionsMap,
  onRetake,
  subjectId,
  moduleReset,
  nextStepHref,
}: {
  score: number;
  passed: boolean;
  passingScore: number;
  attemptsUsed: number;
  maxAttempts: number;
  questions: QuizQuestion[];
  answers: AnswerMap;
  correctAnswerMap: Record<string, unknown>;
  shuffledQuestions: QuizQuestion[];
  shuffledOptionsMap: Record<string, string[]>;
  onRetake: () => void;
  subjectId: string;
  moduleReset: boolean;
  nextStepHref: string | null;
}) {
  const attemptsRemaining = maxAttempts - attemptsUsed;
  const canRetake = attemptsRemaining > 0 && !passed && !moduleReset;

  if (moduleReset) {
    return (
      <div className="space-y-6">
        <Card className="border-2 border-red-200 bg-red-50">
          <CardContent className="pt-8 pb-8 text-center">
            <RefreshCw className="h-12 w-12 text-red-400 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-red-800 mb-2">Section Reset</h2>
            <p className="text-red-700 text-sm mb-4 max-w-sm mx-auto">
              You&apos;ve used all {maxAttempts} attempts without passing. Your progress on this
              section has been reset — you&apos;ll need to re-read this section&apos;s steps and
              retake the quiz. Your other completed sections are unaffected.
            </p>
            <p className="text-xs text-gray-500">Contact your manager if you have questions.</p>
          </CardContent>
        </Card>
        <Link href={`/trainee/subjects/${subjectId}`}>
          <Button variant="default" size="md" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Back to Training
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Score card */}
      <Card
        className={cn(
          "border-2",
          passed ? "border-emerald-300 bg-emerald-50" : "border-red-200 bg-red-50"
        )}
      >
        <CardContent className="pt-8 pb-8 text-center">
          {passed ? (
            <Trophy className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
          ) : (
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          )}
          <div
            className={cn(
              "text-5xl font-bold mb-2",
              passed ? "text-emerald-700" : "text-red-600"
            )}
          >
            {Math.round(score)}%
          </div>
          <div
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold mb-3",
              passed ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"
            )}
          >
            {passed ? (
              <>
                <CheckCircle2 className="h-4 w-4" /> PASSED
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4" /> FAILED
              </>
            )}
          </div>
          <p className={cn("text-sm", passed ? "text-emerald-700" : "text-red-600")}>
            {passed
              ? "Great work! You passed this quiz."
              : `You need ${passingScore}% to pass.${attemptsRemaining > 0 ? ` ${attemptsRemaining} attempt${attemptsRemaining !== 1 ? "s" : ""} remaining.` : ""}`}
          </p>
          <div className="mt-4">
            <Progress value={score} size="lg" />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Attempt {attemptsUsed} of {maxAttempts}
          </p>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href={`/trainee/subjects/${subjectId}`}>
          <Button variant="outline" size="md" className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back to Subject
          </Button>
        </Link>
        {canRetake && (
          <Button variant="default" size="md" onClick={onRetake} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Retake Quiz
            <span className="text-xs opacity-75">
              ({attemptsRemaining} attempt{attemptsRemaining !== 1 ? "s" : ""} left)
            </span>
          </Button>
        )}
        {passed && nextStepHref && (
          <Link href={nextStepHref}>
            <Button variant="default" size="md" className="gap-2">
              Next Section
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>

      {/* Question breakdown */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Question Breakdown</h3>
        <div className="space-y-3">
          {shuffledQuestions.map((q, i) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={i}
              answer={answers[q.id]}
              onChange={() => {}}
              showResult
              correctAnswer={correctAnswerMap[q.id]}
              shuffledOptions={shuffledOptionsMap[q.id]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function QuizTaker({
  quizId,
  subjectId,
  topicTitle,
  subjectTitle,
  passingScore,
  maxAttempts,
  questions,
  existingAttempts,
  correctAnswerMap,
  nextStepHref,
}: QuizTakerProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [answers, setAnswers] = React.useState<AnswerMap>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [latestAttempt, setLatestAttempt] = React.useState<QuizAttemptRecord | null>(null);
  const [showResults, setShowResults] = React.useState(false);
  const [allAttempts, setAllAttempts] = React.useState(existingAttempts);
  const [moduleReset, setModuleReset] = React.useState(false);

  // Timer
  const startTimeRef = React.useRef<number>(Date.now());
  React.useEffect(() => {
    startTimeRef.current = Date.now();
  }, [showResults]); // reset timer on retake

  const attemptsUsed = allAttempts.length;
  const lastAttempt = allAttempts[0] ?? null;
  const alreadyPassed = allAttempts.some((a) => a.passed);
  const outOfAttempts = attemptsUsed >= maxAttempts;

  // Shuffle questions and options deterministically based on attempt number
  const attemptSeed = quizId
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0) + attemptsUsed * 31337;

  const shuffledQuestions = React.useMemo(
    () => shuffleWithSeed(questions, attemptSeed),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [attemptsUsed]
  );

  const shuffledOptionsMap = React.useMemo(() => {
    const map: Record<string, string[]> = {};
    shuffledQuestions.forEach((q, qi) => {
      if (
        q.type === "MULTIPLE_CHOICE" ||
        q.type === "MULTIPLE_SELECT"
      ) {
        map[q.id] = shuffleWithSeed(q.options, attemptSeed + qi * 7);
      }
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptsUsed]);

  const requiredQuestions = shuffledQuestions.filter((q) => q.type !== "WRITTEN_RESPONSE");
  const allRequired = requiredQuestions.every((q) => isAnswered(q, answers));

  const handleChange = (id: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async () => {
    if (!allRequired) return;
    const timeTakenSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/quizzes/${quizId}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, timeTakenSeconds }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Failed to submit quiz");
      }
      const data = await res.json();

      if (data.moduleReset) {
        setModuleReset(true);
        setShowResults(true);
        router.refresh();
        return;
      }

      const newAttempt: QuizAttemptRecord = {
        id: data.id,
        score: data.score,
        passed: data.passed,
        attemptNum: data.attemptNum,
        takenAt: data.takenAt,
        answers,
      };
      setLatestAttempt(newAttempt);
      setAllAttempts((prev) => [newAttempt, ...prev]);
      setShowResults(true);
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetake = () => {
    setAnswers({});
    setShowResults(false);
    setLatestAttempt(null);
    startTimeRef.current = Date.now();
  };

  // ── Guard states ──────────────────────────────────────────────────────────

  if (alreadyPassed && !showResults) {
    const passedAttempt = allAttempts.find((a) => a.passed)!;
    return (
      <div className="space-y-6">
        <Card className="border-2 border-emerald-300 bg-emerald-50">
          <CardContent className="pt-8 pb-8 text-center">
            <Trophy className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-emerald-800 mb-1">Already Passed!</h2>
            <p className="text-emerald-700 text-sm mb-4">
              You scored{" "}
              <span className="font-bold">{Math.round(passedAttempt.score)}%</span> on attempt #
              {passedAttempt.attemptNum}.
            </p>
            <Progress value={passedAttempt.score} size="lg" className="max-w-xs mx-auto" />
            <p className="text-xs text-gray-500 mt-2">{formatDate(passedAttempt.takenAt)}</p>
          </CardContent>
        </Card>
        <div className="flex items-center gap-3 flex-wrap">
          <Link href={`/trainee/subjects/${subjectId}`}>
            <Button variant="outline" size="md" className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              Back to Subject
            </Button>
          </Link>
          {nextStepHref && (
            <Link href={nextStepHref}>
              <Button variant="default" size="md" className="gap-2">
                Next Section
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (outOfAttempts && !showResults) {
    return (
      <div className="space-y-6">
        <Card className="border-2 border-amber-200 bg-amber-50">
          <CardContent className="pt-8 pb-8 text-center">
            <AlertCircle className="h-12 w-12 text-amber-400 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-amber-800 mb-1">No More Attempts</h2>
            <p className="text-amber-700 text-sm mb-4">
              You&apos;ve used all {maxAttempts} attempts.
            </p>
            {lastAttempt && (
              <div className="inline-flex flex-col items-center">
                <p className="text-sm text-amber-700 mb-2">
                  Last score: <span className="font-bold">{Math.round(lastAttempt.score)}%</span>
                </p>
                <Progress value={lastAttempt.score} size="lg" className="w-48" />
              </div>
            )}
            <p className="text-xs text-gray-500 mt-3">
              Contact your manager if you need additional attempts.
            </p>
          </CardContent>
        </Card>
        <Link href={`/trainee/subjects/${subjectId}`}>
          <Button variant="outline" size="md" className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back to Subject
          </Button>
        </Link>
      </div>
    );
  }

  if (showResults && (latestAttempt || moduleReset)) {
    return (
      <ResultsView
        score={latestAttempt?.score ?? 0}
        passed={latestAttempt?.passed ?? false}
        passingScore={passingScore}
        attemptsUsed={allAttempts.length}
        maxAttempts={maxAttempts}
        questions={questions}
        answers={answers}
        correctAnswerMap={correctAnswerMap}
        shuffledQuestions={shuffledQuestions}
        shuffledOptionsMap={shuffledOptionsMap}
        onRetake={handleRetake}
        subjectId={subjectId}
        moduleReset={moduleReset}
        nextStepHref={nextStepHref}
      />
    );
  }

  // ── Quiz form ─────────────────────────────────────────────────────────────

  const attemptsRemaining = maxAttempts - attemptsUsed;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle>{topicTitle} — Quiz</CardTitle>
              <CardDescription>{subjectTitle}</CardDescription>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">
                {attemptsRemaining} attempt{attemptsRemaining !== 1 ? "s" : ""} remaining
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Must score: {passingScore}%</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="info">
              {shuffledQuestions.length} question{shuffledQuestions.length !== 1 ? "s" : ""}
            </Badge>
            {attemptsUsed > 0 && (
              <Badge variant="warning">
                Previous best: {Math.round(Math.max(...allAttempts.map((a) => a.score)))}%
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <div className="space-y-4">
        {shuffledQuestions.map((q, i) => (
          <QuestionCard
            key={q.id}
            question={q}
            index={i}
            answer={answers[q.id]}
            onChange={handleChange}
            showResult={false}
            shuffledOptions={shuffledOptionsMap[q.id]}
          />
        ))}
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between pt-2">
        <Link href={`/trainee/subjects/${subjectId}`}>
          <Button variant="outline" size="md" className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <Button
          variant="default"
          size="md"
          onClick={handleSubmit}
          loading={submitting}
          disabled={!allRequired || submitting}
          className="gap-2"
        >
          Submit Quiz
        </Button>
      </div>

      {!allRequired && (
        <p className="text-xs text-amber-600 text-center">
          Please answer all required questions before submitting.
        </p>
      )}
    </div>
  );
}
