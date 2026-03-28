"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import VoiceInput from "@/components/VoiceInput";
import AutoResizeTextarea from "@/components/AutoResizeTextarea";
import { useParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

type YesNo = "yes" | "no";

const LANGUAGE_OPTIONS = [
  { value: "en-IN", label: "English" },
  { value: "hi-IN", label: "Hindi" },
  { value: "ta-IN", label: "Tamil" },
  { value: "te-IN", label: "Telugu" },
  { value: "ml-IN", label: "Malayalam" },
  { value: "mr-IN", label: "Marathi" },
  { value: "gu-IN", label: "Gujarati" },
  { value: "kn-IN", label: "Kannada" },
];

function YesNoToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: YesNo;
  onChange: (value: YesNo) => void;
}) {
  return (
    <div className="border border-cards rounded-xl p-4">
      <p className="text-sm text-gray-300 mb-3">{label}</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onChange("yes")}
          className={`px-4 py-2 rounded-full border transition-colors ${
            value === "yes"
              ? "bg-accent text-background border-accent"
              : "border-cards text-gray-300 hover:border-accent"
          }`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange("no")}
          className={`px-4 py-2 rounded-full border transition-colors ${
            value === "no"
              ? "bg-accent text-background border-accent"
              : "border-cards text-gray-300 hover:border-accent"
          }`}
        >
          No
        </button>
      </div>
    </div>
  );
}

export default function WellnessDetailsPage() {
  const params = useParams<{ mobile: string }>();
  const mobile = useMemo(() => String(params?.mobile || "").trim(), [params]);

  const [name, setName] = useState("");
  const [language, setLanguage] = useState("en-IN");
  const [drinksMilkTea, setDrinksMilkTea] = useState<YesNo>("no");
  const [isVegetarian, setIsVegetarian] = useState<YesNo>("yes");
  const [hasWeightLossGoal, setHasWeightLossGoal] = useState<YesNo>("no");
  const [hasDiabetesOrHypertension, setHasDiabetesOrHypertension] =
    useState<YesNo>("no");
  const [wearsSpectacles, setWearsSpectacles] = useState<YesNo>("no");
  const [details, setDetails] = useState("");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:3000/recommendation/api";

  const onVoiceResult = (transcript: string) => {
    setVoiceTranscript((prev: string) =>
      prev ? `${prev}. ${transcript}` : transcript,
    );
    setDetails((prev: string) =>
      prev ? `${prev}\n${transcript}` : transcript,
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    if (!mobile) {
      setError("Mobile number is missing from the URL.");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`${apiBase}/wellness-submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile,
          name: name.trim(),
          drinksMilkTea: drinksMilkTea === "yes",
          isVegetarian: isVegetarian === "yes",
          hasWeightLossGoal: hasWeightLossGoal === "yes",
          hasDiabetesOrHypertension: hasDiabetesOrHypertension === "yes",
          wearsSpectacles: wearsSpectacles === "yes",
          details,
          language,
          voiceTranscript: voiceTranscript || null,
          source: "wellness-details-route",
          created_by: "self",
        }),
      });

      if (!response.ok) {
        throw new Error("Could not submit your details.");
      }

      setSubmitted(true);
    } catch (e: any) {
      setError(e?.message || "Could not submit your details.");
    } finally {
      setSaving(false);
    }
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-background p-6 pt-24">
        <div className="max-w-2xl mx-auto">
          <Card>
            <div className="text-center py-8">
              <CheckCircle2 className="w-14 h-14 text-accent mx-auto mb-4" />
              <h1 className="text-3xl font-heading mb-4">
                You are on the waitlist
              </h1>
              <p className="text-gray-300 mb-3">
                Your response has been saved successfully. You have been added
                to the Stillwater waitlist.
              </p>
              <p className="text-gray-400">
                Need help? Contact{" "}
                <strong>holistic_health@stillwater.you</strong>
              </p>
            </div>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background p-6 pt-24">
      <div className="max-w-3xl mx-auto">
        <Card>
          <h1 className="text-3xl font-heading mb-2">Wellness Details</h1>
          <p className="text-gray-400 mb-6">
            Please share your details so our team can support your wellness
            journey with guidance and trusted partner options.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm text-gray-300 mb-2">
                Mobile Number
              </label>
              <input
                value={mobile}
                disabled
                title="Mobile number"
                placeholder="Mobile number"
                className="w-full bg-background border border-cards p-3 rounded-lg text-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">Name *</label>
              <input
                value={name}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setName(e.target.value)
                }
                placeholder="Enter your name"
                title="Name"
                className="w-full bg-background border border-cards p-3 rounded-lg focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">
                Preferred Language
              </label>
              <select
                value={language}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setLanguage(e.target.value)
                }
                title="Preferred language"
                className="w-full bg-background border border-cards p-3 rounded-lg focus:outline-none focus:border-accent"
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <YesNoToggle
              label="Do you regularly consume milk/tea?"
              value={drinksMilkTea}
              onChange={setDrinksMilkTea}
            />
            <YesNoToggle
              label="Do you follow a vegetarian diet?"
              value={isVegetarian}
              onChange={setIsVegetarian}
            />
            <YesNoToggle
              label="Is weight loss one of your current goals?"
              value={hasWeightLossGoal}
              onChange={setHasWeightLossGoal}
            />
            <YesNoToggle
              label="Do you have diabetes or hypertension?"
              value={hasDiabetesOrHypertension}
              onChange={setHasDiabetesOrHypertension}
            />
            <YesNoToggle
              label="Do you wear spectacles?"
              value={wearsSpectacles}
              onChange={setWearsSpectacles}
            />

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm text-gray-300">
                  Additional Details
                </label>
                <VoiceInput onResult={onVoiceResult} lang={language} />
              </div>
              <AutoResizeTextarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Share your wellness context in any language. Voice input is enabled."
                rows={6}
                className="min-h-[180px]"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <Button
              type="submit"
              disabled={saving}
              className="w-full"
              size="lg"
            >
              {saving ? "Submitting..." : "Submit Details"}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
