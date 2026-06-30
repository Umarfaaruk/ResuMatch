import type { MatchedJob, SkillGap } from "./types";

interface Resource {
  name: string;
  url: string;
}

// Curated free learning resources keyed by normalized skill name.
// Sources: freeCodeCamp, MDN, YouTube (CS50 / freeCodeCamp), Khan Academy.
const RESOURCE_MAP: Record<string, Resource> = {
  javascript: {
    name: "freeCodeCamp — JavaScript Algorithms",
    url: "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/",
  },
  typescript: {
    name: "freeCodeCamp — Learn TypeScript (YouTube)",
    url: "https://www.youtube.com/watch?v=30LWjhZzg50",
  },
  react: {
    name: "freeCodeCamp — Front End Libraries (React)",
    url: "https://www.freecodecamp.org/learn/front-end-development-libraries/",
  },
  "next js": {
    name: "Next.js — Official Free Course",
    url: "https://nextjs.org/learn",
  },
  "node js": {
    name: "freeCodeCamp — Back End APIs with Node",
    url: "https://www.freecodecamp.org/learn/back-end-development-and-apis/",
  },
  html: {
    name: "MDN — HTML Basics",
    url: "https://developer.mozilla.org/en-US/docs/Learn/HTML",
  },
  css: {
    name: "MDN — CSS Learn",
    url: "https://developer.mozilla.org/en-US/docs/Learn/CSS",
  },
  tailwind: {
    name: "Tailwind CSS — Official Docs",
    url: "https://tailwindcss.com/docs/utility-first",
  },
  redux: {
    name: "Redux — Official Essentials Tutorial",
    url: "https://redux.js.org/tutorials/essentials/part-1-overview-concepts",
  },
  "rest api": {
    name: "freeCodeCamp — APIs and Microservices",
    url: "https://www.freecodecamp.org/learn/back-end-development-and-apis/",
  },
  graphql: {
    name: "freeCodeCamp — GraphQL Course (YouTube)",
    url: "https://www.youtube.com/watch?v=ed8SzALpx1Q",
  },
  sql: {
    name: "Khan Academy — Intro to SQL",
    url: "https://www.khanacademy.org/computing/computer-programming/sql",
  },
  postgresql: {
    name: "freeCodeCamp — Learn PostgreSQL (YouTube)",
    url: "https://www.youtube.com/watch?v=qw--VYLpxG4",
  },
  mysql: {
    name: "freeCodeCamp — Relational Databases",
    url: "https://www.freecodecamp.org/learn/relational-database/",
  },
  mongodb: {
    name: "freeCodeCamp — MongoDB Full Course (YouTube)",
    url: "https://www.youtube.com/watch?v=c2M-rlkkT5o",
  },
  redis: {
    name: "freeCodeCamp — Redis Crash Course (YouTube)",
    url: "https://www.youtube.com/watch?v=jgpVdJB2sKQ",
  },
  python: {
    name: "freeCodeCamp — Scientific Computing with Python",
    url: "https://www.freecodecamp.org/learn/scientific-computing-with-python/",
  },
  pandas: {
    name: "freeCodeCamp — Data Analysis with Python",
    url: "https://www.freecodecamp.org/learn/data-analysis-with-python/",
  },
  numpy: {
    name: "freeCodeCamp — Data Analysis with Python",
    url: "https://www.freecodecamp.org/learn/data-analysis-with-python/",
  },
  "machine learning": {
    name: "freeCodeCamp — Machine Learning with Python",
    url: "https://www.freecodecamp.org/learn/machine-learning-with-python/",
  },
  "scikit learn": {
    name: "freeCodeCamp — Machine Learning with Python",
    url: "https://www.freecodecamp.org/learn/machine-learning-with-python/",
  },
  pytorch: {
    name: "freeCodeCamp — PyTorch for Deep Learning (YouTube)",
    url: "https://www.youtube.com/watch?v=V_xro1bcAuA",
  },
  statistics: {
    name: "Khan Academy — Statistics & Probability",
    url: "https://www.khanacademy.org/math/statistics-probability",
  },
  "data visualization": {
    name: "freeCodeCamp — Data Visualization",
    url: "https://www.freecodecamp.org/learn/data-visualization/",
  },
  tableau: {
    name: "freeCodeCamp — Tableau Full Course (YouTube)",
    url: "https://www.youtube.com/watch?v=aHaOIvR00So",
  },
  "power bi": {
    name: "freeCodeCamp — Power BI Full Course (YouTube)",
    url: "https://www.youtube.com/watch?v=AGrl-H87pRU",
  },
  excel: {
    name: "freeCodeCamp — Excel for Beginners (YouTube)",
    url: "https://www.youtube.com/watch?v=Vl0H-qTclOg",
  },
  "computer vision": {
    name: "freeCodeCamp — OpenCV Course (YouTube)",
    url: "https://www.youtube.com/watch?v=oXlwWbU8l2o",
  },
  opencv: {
    name: "freeCodeCamp — OpenCV Course (YouTube)",
    url: "https://www.youtube.com/watch?v=oXlwWbU8l2o",
  },
  llm: {
    name: "freeCodeCamp — LLM & Prompt Engineering (YouTube)",
    url: "https://www.youtube.com/watch?v=mEsleV16qdo",
  },
  "prompt engineering": {
    name: "freeCodeCamp — Prompt Engineering (YouTube)",
    url: "https://www.youtube.com/watch?v=mEsleV16qdo",
  },
  langchain: {
    name: "freeCodeCamp — LangChain Course (YouTube)",
    url: "https://www.youtube.com/watch?v=lG7Uxts9SXs",
  },
  "vector database": {
    name: "freeCodeCamp — Vector Databases (YouTube)",
    url: "https://www.youtube.com/watch?v=ySus5ZS0b94",
  },
  docker: {
    name: "freeCodeCamp — Docker Course (YouTube)",
    url: "https://www.youtube.com/watch?v=fqMOX6JJhGo",
  },
  aws: {
    name: "freeCodeCamp — AWS Cloud Practitioner (YouTube)",
    url: "https://www.youtube.com/watch?v=SOTamWNgDKc",
  },
  git: {
    name: "freeCodeCamp — Git & GitHub Crash Course (YouTube)",
    url: "https://www.youtube.com/watch?v=RGOj5yH7evk",
  },
  jest: {
    name: "freeCodeCamp — JavaScript Testing with Jest (YouTube)",
    url: "https://www.youtube.com/watch?v=ajiAl5UNzBU",
  },
  "data structures": {
    name: "freeCodeCamp — Data Structures & Algorithms (YouTube)",
    url: "https://www.youtube.com/watch?v=8hly31xKli0",
  },
  etl: {
    name: "freeCodeCamp — Data Engineering Course (YouTube)",
    url: "https://www.youtube.com/watch?v=PHsC_t0j1dU",
  },
  airflow: {
    name: "freeCodeCamp — Apache Airflow Tutorial (YouTube)",
    url: "https://www.youtube.com/watch?v=K9AnJ9_ZAXE",
  },
};

// Generic fallback when a skill isn't in the map.
const FALLBACK: Resource = {
  name: "freeCodeCamp — Free coding courses",
  url: "https://www.freecodecamp.org/learn/",
};

function normKey(skill: string): string {
  return skill
    .toLowerCase()
    .replace(/[._/]+/g, " ")
    .replace(/[^a-z0-9+# ]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function resourceForSkill(skill: string): Resource {
  return RESOURCE_MAP[normKey(skill)] ?? FALLBACK;
}

/**
 * Aggregate the top 3 missing skills across the user's top 10 matches,
 * each mapped to a free learning resource.
 */
export function getSkillGaps(matches: MatchedJob[], topN = 3): SkillGap[] {
  const counts = new Map<string, { count: number; label: string }>();

  for (const job of matches.slice(0, 10)) {
    for (const skill of job.missingSkills) {
      const key = normKey(skill);
      if (!key) continue;
      const existing = counts.get(key);
      if (existing) existing.count += 1;
      else counts.set(key, { count: 1, label: skill });
    }
  }

  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, topN)
    .map(({ label }) => {
      const res = resourceForSkill(label);
      return { skill: label, resourceName: res.name, resourceUrl: res.url };
    });
}
