import { useState, useRef, useEffect } from "react";

const NAVY = "#1B3A6B";
const GOLD = "#C9A84C";
const DARK = "#0d1b2a";

function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const listener = (e) => setMatches(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);
  return matches;
}

const FEEDBACK_OPTIONS = [
  { id: "grade", label: "📊 Grade Only", desc: "Just the score and letter grade" },
  { id: "quick", label: "⚡ Quick Comment", desc: "1-2 sentence summary for report cards" },
  { id: "strengths", label: "💪 Strengths + Improvements", desc: "What worked, what to fix" },
  { id: "full", label: "📋 Full Feedback", desc: "Everything — detailed and complete" },
];

export default function App() {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [assignmentType, setAssignmentType] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentWork, setStudentWork] = useState("");
  const [feedbackType, setFeedbackType] = useState("quick");
  const [savedRubric, setSavedRubric] = useState("");
  const [rubricInput, setRubricInput] = useState("");
  const [showRubricEditor, setShowRubricEditor] = useState(false);
  const [lessonContext, setLessonContext] = useState("");
  const [showLessonContext, setShowLessonContext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const fileRef = useRef();

  const handleRubricFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setRubricInput(ev.target.result);
      setShowRubricEditor(true);
    };
    reader.readAsText(file);
  };

  const saveRubric = () => {
    setSavedRubric(rubricInput);
    setShowRubricEditor(false);
  };

  const buildPrompt = () => {
    const rubricSection = savedRubric ? `\nRubric/Grading Criteria:\n${savedRubric}` : "";
    const lessonSection = lessonContext ? `\nLesson Context/Objectives (grade against these):\n${lessonContext}` : "";
    
    const base = `You are grading student work as an expert teacher.

Subject: ${subject || "General"}
Grade Level: ${grade || "Not specified"}
Assignment Type: ${assignmentType || "Assignment"}
Student: ${studentName || "Student"}
${rubricSection}
${lessonSection}

Student Work:
"${studentWork}"`;

    const instructions = {
      grade: `${base}\n\nGrade this work and respond with ONLY:\n- A letter grade (A/B/C/D/F)\n- A percentage score\n- One sentence explaining the grade\n\nBe concise.`,
      quick: `${base}\n\nGrade this work and provide:\n1. Grade: Letter grade and percentage\n2. Report Card Comment: One professional 2-sentence comment suitable for parents\n\nBe brief and specific.`,
      strengths: `${base}\n\nGrade this work and provide:\n1. Grade: Letter grade and percentage\n2. Strengths: 2 specific things done well\n3. Improve: 2 specific actionable improvements\n\nKeep each point to one sentence. Be direct.`,
      full: `${base}\n\nGrade this work and provide:\n1. Grade: Letter grade and percentage\n2. Overall: 2-sentence summary\n3. Strengths: 3 specific things done well\n4. Improvements: 3 specific actionable suggestions\n5. Report Card Comment: Professional 2-sentence parent-ready comment\n6. Student Note: One encouraging sentence directly to the student\n\nBe specific and reference the actual work.`,
    };

    return instructions[feedbackType];
  };

  const generate = async () => {
    if (!studentWork) { setError("Please paste the student's work."); return; }
    setError(""); setResult(null); setLoading(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: buildPrompt() })
      });
      const json = await res.json();
      if (json.error) { setError("Error: " + json.error); return; }
      if (!json.text) { setError("Nothing returned. Try again."); return; }
      setResult(json.text);
    } catch (e) {
      setError("Request failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setResult(null);
    setStudentName("");
    setStudentWork("");
  };

  const renderResult = (text) =>
    text.split("\n").map((line, i) => {
      const t = line.trim();
      if (!t) return <div key={i} style={{ height: 6 }} />;
      if (/^\d+\.\s/.test(t) || /^#{1,3}\s/.test(t)) {
        return <div key={i} style={{ fontWeight: 800, fontSize: 14, color: NAVY, borderLeft: `3px solid ${GOLD}`, paddingLeft: 10, margin: "14px 0 6px" }}>{t.replace(/^#+\s*|\d+\.\s*/g, "").replace(/\*\*/g, "")}</div>;
      }
      if (t.startsWith("-") || t.startsWith("•")) {
        return (
          <div key={i} style={{ display: "flex", gap: 8, margin: "4px 0 4px 10px", fontSize: 14, color: "#333", lineHeight: 1.6 }}>
            <span style={{ color: GOLD, fontWeight: 900, flexShrink: 0 }}>•</span>
            <span>{t.replace(/^[-•]\s*/, "").replace(/\*\*/g, "")}</span>
          </div>
        );
      }
      return <div key={i} style={{ fontSize: 14, color: "#444", lineHeight: 1.7, margin: "3px 0" }}>{t.replace(/\*\*/g, "")}</div>;
    });

  const Label = ({ text, required }) => (
    <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 7 }}>
      {text} {required && <span style={{ color: GOLD }}>*</span>}
    </div>
  );

  const inp = (extra = {}) => ({
    width: "100%",
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 8,
    color: "#fff",
    padding: isDesktop ? "12px 14px" : "14px 16px",
    fontSize: isDesktop ? 14 : 16,
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
    WebkitAppearance: "none",
    ...extra
  });

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${DARK}, ${NAVY})`, fontFamily: "'Segoe UI', system-ui, sans-serif", padding: "0 0 80px" }}>

      {/* NAV */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", padding: isDesktop ? "14px 32px" : "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontWeight: 900, fontSize: 16, color: "#fff", letterSpacing: 1 }}>
          4THDMC <span style={{ color: GOLD }}>|</span> EVOLVE
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {savedRubric && (
            <div style={{ background: "rgba(201,168,76,0.15)", border: `1px solid ${GOLD}`, color: GOLD, fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 20, letterSpacing: 1 }}>
              ✓ Rubric
            </div>
          )}
          {lessonContext && (
            <div style={{ background: "rgba(90,180,232,0.15)", border: "1px solid #5ab4e8", color: "#5ab4e8", fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 20, letterSpacing: 1 }}>
              ✓ Lesson
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 780, margin: "0 auto", padding: isDesktop ? "36px 24px" : "24px 16px" }}>

        {/* HEADER */}
        {!result && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "inline-block", border: `1px solid ${GOLD}`, color: GOLD, fontSize: 10, letterSpacing: 4, padding: "4px 14px", marginBottom: 12, fontWeight: 700, borderRadius: 2, textTransform: "uppercase" }}>
              4THDMC | EVOLVE
            </div>
            <div style={{ fontSize: isDesktop ? 40 : "clamp(28px, 8vw, 40px)", fontWeight: 900, color: "#fff", lineHeight: 1.1 }}>
              ASSIGNMENT GRADER<br /><span style={{ color: GOLD }}>&amp; COMMENT GENERATOR</span>
            </div>
            <div style={{ width: 40, height: 3, background: GOLD, margin: "12px 0 8px" }} />
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, fontStyle: "italic" }}>
              Grade smarter. Comment faster. Give time back to teachers.
            </div>
          </div>
        )}

        {!result && (
          <>
            {/* LESSON CONTEXT — NEW FEATURE */}
            <div style={{ background: "rgba(90,180,232,0.08)", border: `1px solid ${lessonContext ? "#5ab4e8" : "rgba(255,255,255,0.1)"}`, borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ color: "#5ab4e8", fontWeight: 700, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", marginBottom: 3 }}>
                    📚 Lesson Context
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
                    {lessonContext ? "✓ Lesson objectives loaded — grading will align to what was taught" : "Paste from Lesson Plan Generator to grade against your objectives"}
                  </div>
                </div>
                <button onClick={() => setShowLessonContext(!showLessonContext)} style={{ 
                  background: lessonContext ? "rgba(90,180,232,0.15)" : "transparent", 
                  border: `1px solid ${lessonContext ? "#5ab4e8" : "rgba(255,255,255,0.2)"}`, 
                  color: lessonContext ? "#5ab4e8" : "rgba(255,255,255,0.7)", 
                  padding: "8px 14px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer" 
                }}>
                  {lessonContext ? "✏️ Edit" : "➕ Add Lesson"}
                </button>
              </div>

              {showLessonContext && (
                <div style={{ marginTop: 16 }}>
                  <textarea
                    value={lessonContext}
                    onChange={e => setLessonContext(e.target.value)}
                    placeholder="Paste your lesson plan objectives here...&#10;&#10;Example:&#10;Learning Objectives:&#10;• Students will understand the basic accounting equation&#10;• Students will be able to identify assets, liabilities, and equity&#10;• Students will complete a basic balance sheet"
                    rows={5}
                    style={{ ...inp(), resize: "vertical", lineHeight: 1.6, marginBottom: 10 }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setShowLessonContext(false)} style={{ background: "#5ab4e8", color: DARK, border: "none", padding: "10px 20px", borderRadius: 7, fontWeight: 900, fontSize: 13, cursor: "pointer", letterSpacing: 1, textTransform: "uppercase" }}>
                      Save Context
                    </button>
                    <button onClick={() => { setLessonContext(""); setShowLessonContext(false); }} style={{ background: "transparent", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.15)", padding: "10px 16px", borderRadius: 7, fontSize: 13, cursor: "pointer" }}>
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* RUBRIC SECTION */}
            <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${savedRubric ? "rgba(201,168,76,0.4)" : "rgba(255,255,255,0.1)"}`, borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ color: GOLD, fontWeight: 700, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", marginBottom: 3 }}>
                    📎 Rubric / Grading Criteria
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
                    {savedRubric ? "✓ Rubric saved — will be used for all grades until changed" : "Upload or type once, reuse for every assignment"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => fileRef.current.click()} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)", padding: "8px 14px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    📁 Upload
                  </button>
                  <button onClick={() => setShowRubricEditor(!showRubricEditor)} style={{ background: savedRubric ? "rgba(201,168,76,0.15)" : "transparent", border: `1px solid ${savedRubric ? GOLD : "rgba(255,255,255,0.2)"}`, color: savedRubric ? GOLD : "rgba(255,255,255,0.7)", padding: "8px 14px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    {savedRubric ? "✏️ Edit" : "✏️ Type"}
                  </button>
                </div>
                <input ref={fileRef} type="file" accept=".txt,.csv,.md" onChange={handleRubricFile} style={{ display: "none" }} />
              </div>

              {showRubricEditor && (
                <div style={{ marginTop: 16 }}>
                  <textarea
                    value={rubricInput}
                    onChange={e => setRubricInput(e.target.value)}
                    placeholder="Type or paste your rubric here...&#10;e.g. Thesis (25pts): Clear argument stated...&#10;Evidence (25pts): At least 3 sources cited...&#10;Analysis (25pts): Connects evidence to argument...&#10;Grammar (25pts): Few to no errors..."
                    rows={5}
                    style={{ ...inp(), resize: "vertical", lineHeight: 1.6, marginBottom: 10 }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={saveRubric} style={{ background: GOLD, color: DARK, border: "none", padding: "10px 20px", borderRadius: 7, fontWeight: 900, fontSize: 13, cursor: "pointer", letterSpacing: 1, textTransform: "uppercase" }}>
                      Save Rubric
                    </button>
                    <button onClick={() => { setSavedRubric(""); setRubricInput(""); setShowRubricEditor(false); }} style={{ background: "transparent", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.15)", padding: "10px 16px", borderRadius: 7, fontSize: 13, cursor: "pointer" }}>
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* MAIN FORM */}
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: isDesktop ? "24px 20px" : "20px 16px", marginBottom: 20 }}>
              <div style={{ color: GOLD, fontWeight: 700, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", marginBottom: 22 }}>✦ Assignment Info</div>

              <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr 1fr 1fr" : "1fr 1fr", gap: 14, marginBottom: 16 }}>
                <div>
                  <Label text="Student" />
                  <input value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="Optional" style={inp()} />
                </div>
                <div>
                  <Label text="Subject" />
                  <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. English" style={inp()} />
                </div>
                <div>
                  <Label text="Grade Level" />
                  <select value={grade} onChange={e => setGrade(e.target.value)} style={inp({ background: "#162d52", color: grade ? "#fff" : "rgba(255,255,255,0.35)" })}>
                    <option value="">Select...</option>
                    {["K","1st","2nd","3rd","4th","5th","6th","7th","8th","9th","10th","11th","12th","College"].map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <Label text="Type" />
                  <select value={assignmentType} onChange={e => setAssignmentType(e.target.value)} style={inp({ background: "#162d52", color: assignmentType ? "#fff" : "rgba(255,255,255,0.35)" })}>
                    <option value="">Select...</option>
                    {["Essay","Research Paper","Lab Report","Math","Creative Writing","Presentation","Project","Quiz","Worksheet","Discussion","Book Report","Short Answer","Reflection"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <Label text="Student Work" required />
                <textarea
                  value={studentWork}
                  onChange={e => setStudentWork(e.target.value)}
                  placeholder="Paste the student's work here..."
                  rows={7}
                  style={{ ...inp(), resize: "vertical", lineHeight: 1.6 }}
                />
              </div>

              {/* FEEDBACK TYPE SELECTOR */}
              <div style={{ marginBottom: 20 }}>
                <Label text="What feedback do you need?" />
                <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr", gap: 10 }}>
                  {FEEDBACK_OPTIONS.map(({ id, label, desc }) => (
                    <button key={id} onClick={() => setFeedbackType(id)} style={{
                      padding: "12px 16px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                      border: `1px solid ${feedbackType === id ? GOLD : "rgba(255,255,255,0.15)"}`,
                      background: feedbackType === id ? "rgba(201,168,76,0.12)" : "rgba(255,255,255,0.03)",
                      transition: "all 0.15s"
                    }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: feedbackType === id ? GOLD : "#fff", marginBottom: 3 }}>{label}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div style={{ background: "rgba(255,80,80,0.12)", border: "1px solid rgba(255,80,80,0.3)", color: "#ff9090", padding: "12px 16px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                  {error}
                </div>
              )}

              <button onClick={generate} disabled={loading} style={{
                width: "100%", padding: 17, background: loading ? "rgba(201,168,76,0.4)" : GOLD,
                color: DARK, border: "none", borderRadius: 10, fontWeight: 900,
                fontSize: 16, letterSpacing: 3, cursor: loading ? "not-allowed" : "pointer",
                textTransform: "uppercase", boxShadow: loading ? "none" : "0 4px 20px rgba(201,168,76,0.25)"
              }}>
                {loading ? "⏳  Grading..." : "GRADE THIS ASSIGNMENT"}
              </button>
            </div>
          </>
        )}

        {/* RESULT */}
        {result && (
          <div style={{ background: "#fff", borderRadius: 14, padding: isDesktop ? "28px 24px" : "24px 18px", boxShadow: "0 20px 50px rgba(0,0,0,0.4)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, paddingBottom: 14, borderBottom: `2px solid ${GOLD}`, flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 18, color: NAVY }}>{studentName || "Student"} — {assignmentType || "Assignment"}</div>
                <div style={{ color: "#999", fontSize: 12, marginTop: 3 }}>{subject} {grade ? `· ${grade} Grade` : ""}</div>
              </div>
              <div style={{ background: "rgba(201,168,76,0.12)", border: `1px solid ${GOLD}`, color: GOLD, fontSize: 10, fontWeight: 700, letterSpacing: 2, padding: "4px 12px", borderRadius: 20, textTransform: "uppercase" }}>
                ✓ Graded
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>{renderResult(result)}</div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", flexDirection: isDesktop ? "row" : "column" }}>
              <button onClick={copy} style={{ flex: 1, padding: "13px", background: NAVY, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer", textTransform: "uppercase", letterSpacing: 1 }}>
                {copied ? "✓ Copied!" : "📋 Copy Feedback"}
              </button>
              <button onClick={reset} style={{ flex: 1, padding: "13px", background: "transparent", color: NAVY, border: `1px solid ${NAVY}`, borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer", textTransform: "uppercase" }}>
                ← Grade Another
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ textAlign: "center", color: "rgba(255,255,255,0.18)", fontSize: 10, letterSpacing: 3, textTransform: "uppercase" }}>
        Powered by <span style={{ color: "rgba(201,168,76,0.35)" }}>4THDMC | EVOLVE</span> · Brandon Russell
      </div>
    </div>
  );
}
