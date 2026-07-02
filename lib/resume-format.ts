import type { ParsedResume } from "./types";

// Deterministic, dependency-free resume builders. These run as a guaranteed
// fallback when the AI omits/empties the long-form text fields, so the UI
// never shows an empty resume. Both produce a COMPLETE, submission-ready
// resume with a contact header and standard sections — the only difference is
// styling (the ATS view renders serif/plain; the Professional view renders
// modern sans-serif with the same content).

function contactLine(p: ParsedResume): string {
  const parts = [p.email, p.phone, p.location, ...(p.links ?? [])]
    .map((s) => (s ?? "").trim())
    .filter(Boolean);
  return parts.join("  |  ");
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

// Tech terms that must keep their canonical casing in a professional resume.
const CANONICAL_TERMS: Record<string, string> = {
  sql: "SQL", mysql: "MySQL", postgresql: "PostgreSQL", mongodb: "MongoDB",
  html: "HTML", css: "CSS", js: "JavaScript", javascript: "JavaScript",
  typescript: "TypeScript", php: "PHP", api: "API", "rest api": "REST API",
  rest: "REST", graphql: "GraphQL", json: "JSON", aws: "AWS", gcp: "GCP",
  ai: "AI", ml: "ML", nlp: "NLP", llm: "LLM", llms: "LLMs", cnn: "CNN",
  rnn: "RNN", lstm: "LSTM", gan: "GAN", svm: "SVM", knn: "KNN",
  "k-nn": "KNN", "tf-idf": "TF-IDF", tfidf: "TF-IDF", etl: "ETL",
  "ci/cd": "CI/CD", cicd: "CI/CD", ui: "UI", ux: "UX", "ui/ux": "UI/UX",
  ios: "iOS", node: "Node.js", "node.js": "Node.js", "node js": "Node.js",
  nodejs: "Node.js", "next.js": "Next.js", "next js": "Next.js",
  nextjs: "Next.js", react: "React", redux: "Redux", vue: "Vue.js",
  angular: "Angular", python: "Python", java: "Java", "c++": "C++",
  "c#": "C#", git: "Git", github: "GitHub", gitlab: "GitLab",
  docker: "Docker", kubernetes: "Kubernetes", linux: "Linux",
  pytorch: "PyTorch", tensorflow: "TensorFlow", keras: "Keras",
  "scikit-learn": "scikit-learn", "scikit learn": "scikit-learn",
  sklearn: "scikit-learn", numpy: "NumPy", pandas: "Pandas",
  matplotlib: "Matplotlib", opencv: "OpenCV", fastapi: "FastAPI",
  django: "Django", flask: "Flask", streamlit: "Streamlit",
  tailwind: "Tailwind CSS", jquery: "jQuery", firebase: "Firebase",
  supabase: "Supabase", langchain: "LangChain", openai: "OpenAI",
  huggingface: "Hugging Face", "power bi": "Power BI", excel: "Excel",
  tableau: "Tableau", airflow: "Airflow", redis: "Redis", jest: "Jest",
  yolo: "YOLO", xgboost: "XGBoost", yolov11: "YOLOv11", yolov8: "YOLOv8",
  "lang chain": "LangChain", "dify.ai": "Dify.ai", httpx: "HTTPX",
  map: "mAP", "f1-score": "F1-Score", nosql: "NoSQL", vscode: "VS Code",
};

// Ordered category buckets for the SKILLS section. First match wins.
const SKILL_CATEGORIES: { label: string; match: RegExp }[] = [
  {
    label: "Languages",
    match:
      /^(python|java|c\+\+|c#|c|javascript|js|typescript|ts|php|go|golang|rust|kotlin|swift|r|scala|ruby|sql|html|css|dart)$/,
  },
  {
    label: "AI & Machine Learning",
    match:
      /(machine learning|deep learning|supervised|unsupervised|regression|decision tree|random forest|knn|k-nn|svm|naive bayes|cluster|neural|cnn|rnn|lstm|gan|transfer learning|federated|pytorch|tensorflow|keras|scikit|sklearn|xgboost|computer vision|object detection|image classification|yolo|opencv|evaluation metric|^map$|f1|precision|recall|statistics)/,
  },
  {
    label: "NLP & Generative AI",
    match:
      /(nlp|llm|language model|prompt|langchain|lang chain|tf-idf|tfidf|embedding|tokeniz|text preprocessing|dify|rag|generative|hugging face|openai|vector database|chatbot)/,
  },
  {
    label: "Frameworks & Libraries",
    match:
      /(react|next|node|django|flask|fastapi|streamlit|express|spring|pandas|numpy|matplotlib|seaborn|jquery|tailwind|bootstrap|redux|vue|angular|httpx)/,
  },
  {
    label: "Databases & Cloud",
    match:
      /(postgres|mysql|mongo|sqlite|redis|supabase|firebase|firestore|database|aws|azure|gcp|cloud|render|vercel|heroku|docker|kubernetes|etl|airflow)/,
  },
  {
    label: "Tools & Practices",
    match:
      /(git|jira|excel|power bi|tableau|linux|vs code|agile|scrum|ci\/cd|test|jest|rest|api|graphql|blockchain|edge computing|data structures|data visualization)/,
  },
];

export interface SkillGroup {
  label: string;
  skills: string[];
}

/**
 * Divide a flat skill list into short, labelled category rows so the SKILLS
 * section reads as ~6 compact lines instead of a page-long bullet list.
 * Skills that fit no category are collected under "Other".
 */
export function groupSkills(skills: string[]): SkillGroup[] {
  const groups = new Map<string, string[]>();
  for (const raw of skills) {
    const key = raw.trim().toLowerCase();
    if (!key) continue;
    const cat =
      SKILL_CATEGORIES.find((c) => c.match.test(key))?.label ?? "Other";
    const list = groups.get(cat) ?? [];
    list.push(formatSkill(raw));
    groups.set(cat, list);
  }
  const order = [...SKILL_CATEGORIES.map((c) => c.label), "Other"];
  return order
    .filter((label) => groups.has(label))
    .map((label) => ({ label, skills: groups.get(label)! }));
}

/** Professional casing for a skill: canonical tech names, else Title Case. */
export function formatSkill(skill: string): string {
  const key = skill.trim().toLowerCase();
  if (CANONICAL_TERMS[key]) return CANONICAL_TERMS[key];
  // Multi-word skills: fix each word that has a canonical form.
  return key
    .split(/\s+/)
    .map((w) => CANONICAL_TERMS[w] ?? titleCase(w))
    .join(" ");
}

function header(p: ParsedResume, lines: string[]) {
  // Name (falls back to the target role so the document never starts headless).
  const hasName = !!(p.name && p.name.trim());
  lines.push(hasName ? p.name!.trim() : titleCase(p.role_title || "Your Name"));
  const contact = contactLine(p);
  if (contact) lines.push(contact);
  // Show the role as a subtitle only when we have a real name (avoids dupes).
  if (hasName && p.role_title) lines.push(p.role_title);
  lines.push("");
}

function fallbackSummary(p: ParsedResume): string {
  const role = (p.role_title || "professional").toLowerCase();
  const top = p.skills.slice(0, 5).map(formatSkill).join(", ");
  const lvl =
    p.experience_level === "fresher"
      ? "an enthusiastic entry-level"
      : p.experience_level === "junior"
        ? "a junior"
        : "an experienced";
  return `${titleCase(lvl)} ${role}${
    top ? ` skilled in ${top}` : ""
  }. Quick learner focused on building reliable software and delivering measurable results.`;
}

/** Plain, single-column, ATS-safe text. UPPERCASE headings, "- " bullets. */
export function buildAtsText(p: ParsedResume): string {
  const lines: string[] = [];
  header(p, lines);

  lines.push("SUMMARY", (p.summary?.trim() || fallbackSummary(p)), "");

  if (p.skills.length) {
    lines.push("SKILLS", p.skills.map(formatSkill).join(", "), "");
  }

  if (p.experience.length) {
    lines.push("EXPERIENCE");
    for (const e of p.experience) {
      const header = [e.title, e.company].filter(Boolean).join(" — ");
      if (header) lines.push(header);
      if (e.duration) lines.push(e.duration);
      for (const h of e.highlights) lines.push(`- ${h}`);
      lines.push("");
    }
  }

  if (p.projects?.length) {
    lines.push("PROJECTS");
    for (const pr of p.projects) {
      const head = pr.tech?.length
        ? `${pr.name} (${pr.tech.map(formatSkill).join(", ")})`
        : pr.name;
      if (head) lines.push(head);
      if (pr.description) lines.push(`- ${pr.description}`);
      lines.push("");
    }
  }

  if (p.education.length) {
    lines.push("EDUCATION");
    for (const e of p.education) {
      const parts = [e.degree, e.institution].filter(Boolean).join(" — ");
      const withYear = e.year ? `${parts} (${e.year})` : parts;
      if (withYear) lines.push(withYear);
    }
    lines.push("");
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Professional, complete resume — same content, recruiter-friendly headings. */
export function buildHumanizedText(p: ParsedResume): string {
  const lines: string[] = [];
  header(p, lines);

  lines.push(
    "PROFESSIONAL SUMMARY",
    p.summary?.trim() || fallbackSummary(p),
    ""
  );

  if (p.skills.length) {
    lines.push("TECHNICAL SKILLS", p.skills.map(formatSkill).join("  •  "), "");
  }

  if (p.experience.length) {
    lines.push("PROFESSIONAL EXPERIENCE");
    for (const e of p.experience) {
      const head = [e.title, e.company].filter(Boolean).join("  |  ");
      if (head) lines.push(head);
      if (e.duration) lines.push(e.duration);
      for (const h of e.highlights) lines.push(`• ${h}`);
      lines.push("");
    }
  }

  if (p.projects?.length) {
    lines.push("PROJECTS");
    for (const pr of p.projects) {
      lines.push(
        pr.tech?.length
          ? `${pr.name}  |  ${pr.tech.map(formatSkill).join(", ")}`
          : pr.name
      );
      if (pr.description) lines.push(`• ${pr.description}`);
      lines.push("");
    }
  }

  if (p.education.length) {
    lines.push("EDUCATION");
    for (const e of p.education) {
      const parts = [e.degree, e.institution].filter(Boolean).join(", ");
      const withYear = e.year ? `${parts} (${e.year})` : parts;
      if (withYear) lines.push(withYear);
    }
    lines.push("");
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Repair glyph-interleaved extraction artifacts. Some PDF exporters emit
 * every character as its own glyph joined by '&' (or a similar separator),
 * so "Designed" comes out as "&D&e&s&i&g&n&e&d&". Collapse any run of
 * single characters separated by '&' back into the intended word. Legit
 * uses like "R&D" or "Q&A" have only one separator and are left alone.
 */
export function repairInterleavedText(text: string): string {
  if (!text) return "";
  return text
    .split("\n")
    .map((line) => {
      return line
        .split(" ")
        .map((word) => {
          const ampersandCount = (word.match(/&/g) || []).length;
          if (ampersandCount >= 2) {
            return word.replace(/&/g, "");
          }
          if (word.startsWith("&") && word.endsWith("&") && word.length > 2) {
            return word.replace(/&/g, "");
          }
          return word;
        })
        .join(" ");
    })
    .join("\n");
}

export function cleanParsedResume(p: ParsedResume): ParsedResume {
  const cleanStr = (s?: string) => (s ? repairInterleavedText(s).trim() : undefined);
  const cleanArr = (arr?: string[]) => (arr ?? []).map((s) => repairInterleavedText(s).trim()).filter(Boolean);

  return {
    ...p,
    name: cleanStr(p.name),
    email: cleanStr(p.email),
    phone: cleanStr(p.phone),
    location: cleanStr(p.location),
    links: cleanArr(p.links),
    summary: cleanStr(p.summary),
    role_title: cleanStr(p.role_title) || "Software Engineer",
    skills: cleanArr(p.skills),
    experience: (p.experience ?? []).map((e) => ({
      title: repairInterleavedText(e.title).trim(),
      company: repairInterleavedText(e.company).trim(),
      duration: repairInterleavedText(e.duration).trim(),
      highlights: cleanArr(e.highlights),
    })),
    projects: (p.projects ?? []).map((pr) => ({
      name: repairInterleavedText(pr.name).trim(),
      description: repairInterleavedText(pr.description).trim(),
      tech: cleanArr(pr.tech),
    })),
    education: (p.education ?? []).map((edu) => ({
      degree: repairInterleavedText(edu.degree).trim(),
      institution: repairInterleavedText(edu.institution).trim(),
      year: repairInterleavedText(edu.year).trim(),
    })),
  };
}

