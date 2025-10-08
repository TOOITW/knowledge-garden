import fs from "fs";
import path from "path";

const sections = [
  {
    dir: "1_Engineering_Craft",
    title: "工程技藝 Engineering Craft",
    desc: "SOP 與實戰筆記",
  },
  {
    dir: "2_Thinking_Tools",
    title: "思考工具 Thinking Tools",
    desc: "心智模型與決策框架",
  },
  {
    dir: "3_Personal_Growth",
    title: "個人成長 Personal Growth",
    desc: "習慣、反思、快寫筆記 SOP",
  },
];

function titleOf(file, fullPath) {
  const txt = fs.readFileSync(fullPath, "utf8");
  const m1 = txt.match(/^---[\s\S]*?title:\s*(.+)\n[\s\S]*?---/); // frontmatter title
  if (m1) return m1[1].trim();
  const m2 = txt.match(/^#\s+(.+)/m); // first H1
  if (m2) return m2[1].trim();
  return file.replace(/\.md$/, "");
}

sections.forEach(({ dir, title, desc }) => {
  if (!fs.existsSync(dir)) return;

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md");

  const items = files
    .map((f) => {
      const p = path.join(dir, f);
      let updated = "";
      const txt = fs.readFileSync(p, "utf8");
      const m = txt.match(/^---[\s\S]*?updated:\s*([0-9-]+)[\s\S]*?---/);
      if (m) updated = m[1];
      return { file: f, title: titleOf(f, p), updated };
    })
    // 先按 updated desc，再按檔名
    .sort(
      (a, b) =>
        (b.updated || "").localeCompare(a.updated || "") ||
        a.file.localeCompare(b.file)
    );

  const list = items
    .map(
      (it) =>
        `- [${it.title}](./${it.file})${it.updated ? ` — _${it.updated}_` : ""}`
    )
    .join("\n");

  const md = `# ${title}
${desc}

## 精選
- （把重要的條目手動搬到這裡）

## 全部清單
${list || "- （尚無內容）"}
`;
  fs.writeFileSync(path.join(dir, "README.md"), md);
  console.log(`✅ wrote ${dir}/README.md`);
});
