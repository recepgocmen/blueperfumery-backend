/**
 * Documentation Agent - Blue Perfumery
 *
 * Tüm Blue Perfumery projelerindeki bilgileri ve hataları otomatik olarak dokümante eder.
 * Know-how'ı korur ve gelecekte aynı hataların tekrarlanmasını önler.
 *
 * Desteklenen projeler:
 * - blueperfumery-backend
 * - blueperfumery-fe
 * - blueperfumery-admin-panel
 * - mcp-server
 */

import fs from "fs";
import path from "path";

export interface LearningEntry {
  id: string;
  type: "bug" | "decision" | "learning" | "optimization";
  title: string;
  problem: string;
  solution: string;
  prevention?: string;
  date: string;
  tags: string[];
  project?: "backend" | "frontend" | "admin" | "mcp" | "general";
}

export interface ChangelogEntry {
  version?: string;
  date: string;
  type: "feat" | "fix" | "docs" | "refactor" | "perf" | "test";
  description: string;
  details?: string[];
  project?: "backend" | "frontend" | "admin" | "mcp" | "general";
}

export interface DecisionEntry {
  id: string;
  title: string;
  context: string;
  decision: string;
  consequences: string[];
  date: string;
  status?: "pending" | "decided" | "superseded";
  relatedProjects?: string[];
}

export interface DesignSystemEntry {
  component: string;
  description: string;
  cssClasses: string[];
  usage: string;
  variants?: Record<string, string>;
}

export class DocumentationAgent {
  private rulesPath: string;
  private knowhowPath: string;
  private changelogPath: string;
  private decisionsPath: string;
  private designSystemPath: string;
  private agentsPath: string;
  private skillsPath: string;

  constructor() {
    // rules/ klasörü "blue perfumery" projesinin root'unda
    // Backend'den: __dirname = blueperfumery-backend/src/agents/documentation
    // Root'a gitmek için: ../../../../rules (blue perfumery/rules)
    this.rulesPath = path.resolve(__dirname, "../../../../rules");

    // Eğer rules klasörü yoksa oluştur
    if (!fs.existsSync(this.rulesPath)) {
      try {
        fs.mkdirSync(this.rulesPath, { recursive: true });
      } catch (error) {
        console.warn(
          "Rules klasörü oluşturulamadı, mevcut yol kullanılacak:",
          this.rulesPath
        );
      }
    }

    this.knowhowPath = path.join(this.rulesPath, "KNOWHOW.md");
    this.changelogPath = path.join(this.rulesPath, "CHANGELOG.md");
    this.decisionsPath = path.join(this.rulesPath, "DECISIONS.md");
    this.designSystemPath = path.join(this.rulesPath, "DESIGN_SYSTEM.md");
    this.agentsPath = path.join(this.rulesPath, "AGENTS.md");
    this.skillsPath = path.join(this.rulesPath, "SKILLS.md");
  }

  /**
   * Rules path'i döndür (test için)
   */
  getRulesPath(): string {
    return this.rulesPath;
  }

  // ==========================================
  // KNOWHOW.md İşlemleri
  // ==========================================

  /**
   * Yeni bir öğrenme/hata kaydı ekler
   */
  async addLearning(entry: LearningEntry): Promise<boolean> {
    try {
      const content = await this.readFile(this.knowhowPath);

      const typePrefix = {
        bug: "BS",
        decision: "AK",
        learning: "TÖ",
        optimization: "OPT",
      };

      const projectTag = entry.project
        ? `[${entry.project.toUpperCase()}]`
        : "";

      const newEntry = `
---

### ${typePrefix[entry.type]}-${entry.id}: ${entry.title} ${projectTag}
**Tarih:** ${entry.date}  
**Proje:** ${entry.project || "general"}  
**Sorun:** ${entry.problem}  
**Çözüm:** ${entry.solution}

${
  entry.prevention
    ? `**Önlem (Gelecekte kaçınmak için):**\n${entry.prevention}`
    : ""
}

**Etiketler:** ${entry.tags.map((t) => `\`${t}\``).join(", ")}
`;

      // "## 🐛 Bilinen Sorunlar" bölümünün sonuna ekle
      const sectionMarker = "## 🐛 Bilinen Sorunlar ve Çözümler";
      const nextSectionMarker = "\n## ";

      const sectionStart = content.indexOf(sectionMarker);
      if (sectionStart === -1) {
        // Bölüm yoksa dosyanın sonuna ekle
        const updatedContent = content + "\n" + sectionMarker + "\n" + newEntry;
        await this.writeFile(this.knowhowPath, updatedContent);
      } else {
        const sectionEnd = content.indexOf(
          nextSectionMarker,
          sectionStart + sectionMarker.length
        );
        const insertPosition = sectionEnd === -1 ? content.length : sectionEnd;

        const updatedContent =
          content.slice(0, insertPosition) +
          newEntry +
          content.slice(insertPosition);

        await this.writeFile(this.knowhowPath, updatedContent);
      }

      console.log(`✅ KNOWHOW.md güncellendi: ${entry.title}`);
      return true;
    } catch (error) {
      console.error("KNOWHOW.md güncellenemedi:", error);
      return false;
    }
  }

  /**
   * Bilinen hataları kontrol eder ve benzer sorun var mı bakar
   */
  async checkKnownIssues(
    keywords: string[],
    project?: string
  ): Promise<LearningEntry[]> {
    const content = await this.readFile(this.knowhowPath);
    const matchingEntries: LearningEntry[] = [];

    // Basit keyword matching
    const sections = content.split("### ");

    for (const section of sections) {
      const lowerSection = section.toLowerCase();
      const hasMatch = keywords.some((k) =>
        lowerSection.includes(k.toLowerCase())
      );

      // Proje filtresi
      if (
        project &&
        !lowerSection.includes(`[${project.toUpperCase()}]`) &&
        !lowerSection.includes("general")
      ) {
        continue;
      }

      if (hasMatch && section.includes("**Sorun:**")) {
        const lines = section.split("\n");
        const titleLine = lines[0];

        matchingEntries.push({
          id: titleLine.split(":")[0] || "unknown",
          type: "bug",
          title: titleLine.split(":").slice(1).join(":").trim(),
          problem: this.extractField(section, "Sorun"),
          solution: this.extractField(section, "Çözüm"),
          date: this.extractField(section, "Tarih"),
          tags: [],
          project: this.extractField(
            section,
            "Proje"
          ) as LearningEntry["project"],
        });
      }
    }

    return matchingEntries;
  }

  // ==========================================
  // CHANGELOG.md İşlemleri
  // ==========================================

  /**
   * Changelog'a yeni entry ekler
   */
  async addChangelog(entry: ChangelogEntry): Promise<boolean> {
    try {
      const content = await this.readFile(this.changelogPath);

      const typeEmoji = {
        feat: "✨",
        fix: "🐛",
        docs: "📚",
        refactor: "♻️",
        perf: "⚡",
        test: "🧪",
      };

      const projectTag = entry.project
        ? `[${entry.project.toUpperCase()}]`
        : "";

      const newEntry = `
### ${entry.date} ${projectTag}

${typeEmoji[entry.type]} **${entry.type}:** ${entry.description}
${entry.details ? entry.details.map((d) => `- ${d}`).join("\n") : ""}
`;

      // "# Changelog" başlığından sonra ekle
      const headerEnd = content.indexOf("\n", content.indexOf("# "));
      const insertPosition = headerEnd + 1;

      const updatedContent =
        content.slice(0, insertPosition) +
        newEntry +
        content.slice(insertPosition);

      await this.writeFile(this.changelogPath, updatedContent);
      console.log(`✅ CHANGELOG.md güncellendi: ${entry.description}`);
      return true;
    } catch (error) {
      console.error("CHANGELOG.md güncellenemedi:", error);
      return false;
    }
  }

  // ==========================================
  // DECISIONS.md İşlemleri
  // ==========================================

  /**
   * Karar kaydı ekler
   */
  async addDecision(entry: DecisionEntry): Promise<boolean> {
    try {
      const content = await this.readFile(this.decisionsPath);

      const projectsTag = entry.relatedProjects?.length
        ? `**İlgili Projeler:** ${entry.relatedProjects.join(", ")}`
        : "";

      const newEntry = `
---

## ${entry.id}: ${entry.title}

**Tarih:** ${entry.date}  
**Durum:** ${entry.status || "decided"}  
${projectsTag}

### Bağlam
${entry.context}

### Karar
${entry.decision}

### Sonuçlar
${entry.consequences.map((c) => `- ${c}`).join("\n")}
`;

      // Dosyanın sonuna ekle
      const updatedContent = content + newEntry;
      await this.writeFile(this.decisionsPath, updatedContent);
      console.log(`✅ DECISIONS.md güncellendi: ${entry.title}`);
      return true;
    } catch (error) {
      console.error("DECISIONS.md güncellenemedi:", error);
      return false;
    }
  }

  // ==========================================
  // DESIGN_SYSTEM.md İşlemleri
  // ==========================================

  /**
   * Tasarım sistemi bileşeni ekler/günceller
   */
  async updateDesignSystem(entry: DesignSystemEntry): Promise<boolean> {
    try {
      const content = await this.readFile(this.designSystemPath);

      const variantsSection = entry.variants
        ? Object.entries(entry.variants)
            .map(([k, v]) => `- **${k}:** ${v}`)
            .join("\n")
        : "";

      const newEntry = `
### ${entry.component}

**Açıklama:** ${entry.description}

**CSS Sınıfları:**
\`\`\`
${entry.cssClasses.join("\n")}
\`\`\`

**Kullanım:**
${entry.usage}

${variantsSection ? `**Varyantlar:**\n${variantsSection}` : ""}
`;

      // Bileşen zaten var mı kontrol et
      const componentMarker = `### ${entry.component}`;
      const existingIndex = content.indexOf(componentMarker);

      if (existingIndex !== -1) {
        // Mevcut bileşeni güncelle
        const nextComponentIndex = content.indexOf("\n### ", existingIndex + 1);
        const endIndex =
          nextComponentIndex === -1 ? content.length : nextComponentIndex;

        const updatedContent =
          content.slice(0, existingIndex) +
          newEntry.trim() +
          "\n" +
          content.slice(endIndex);

        await this.writeFile(this.designSystemPath, updatedContent);
      } else {
        // Yeni bileşen ekle
        const updatedContent = content + newEntry;
        await this.writeFile(this.designSystemPath, updatedContent);
      }

      console.log(`✅ DESIGN_SYSTEM.md güncellendi: ${entry.component}`);
      return true;
    } catch (error) {
      console.error("DESIGN_SYSTEM.md güncellenemedi:", error);
      return false;
    }
  }

  // ==========================================
  // Günlük Log İşlemleri
  // ==========================================

  /**
   * Günlük log'a entry ekler
   */
  async addDailyLog(
    description: string,
    project?: LearningEntry["project"]
  ): Promise<boolean> {
    try {
      const content = await this.readFile(this.knowhowPath);
      const today = new Date().toISOString().split("T")[0];
      const time = new Date().toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const projectTag = project ? `[${project.toUpperCase()}]` : "";

      const logEntry = `- **${time}** ${projectTag} ${description}\n`;

      // "## 📅 Günlük Log" bölümünü bul
      const logSectionMarker = "## 📅 Günlük Log";
      const logIndex = content.indexOf(logSectionMarker);

      if (logIndex === -1) {
        // Bölüm yoksa oluştur
        const newSection = `\n${logSectionMarker}\n\n### ${today}\n${logEntry}`;
        await this.writeFile(this.knowhowPath, content + newSection);
      } else {
        // Bugünün tarihi var mı kontrol et
        const todayMarker = `### ${today}`;
        const todayIndex = content.indexOf(todayMarker, logIndex);

        if (todayIndex !== -1) {
          // Bugünün log'una ekle
          const insertPosition = todayIndex + todayMarker.length + 1;
          const updatedContent =
            content.slice(0, insertPosition) +
            logEntry +
            content.slice(insertPosition);
          await this.writeFile(this.knowhowPath, updatedContent);
        } else {
          // Yeni gün başlığı ekle
          const nextSectionIndex = content.indexOf(
            "\n## ",
            logIndex + logSectionMarker.length
          );
          const insertPosition =
            nextSectionIndex === -1 ? content.length : nextSectionIndex;

          const newDayEntry = `\n### ${today}\n${logEntry}`;
          const updatedContent =
            content.slice(0, logIndex + logSectionMarker.length) +
            "\n" +
            newDayEntry +
            content.slice(logIndex + logSectionMarker.length);
          await this.writeFile(this.knowhowPath, updatedContent);
        }
      }

      console.log(`✅ Günlük log eklendi: ${description}`);
      return true;
    } catch (error) {
      console.error("Günlük log eklenemedi:", error);
      return false;
    }
  }

  // ==========================================
  // Toplu İşlemler
  // ==========================================

  /**
   * Tüm dökümanları senkronize et
   */
  async syncAllDocs(): Promise<{
    knowhow: boolean;
    changelog: boolean;
    decisions: boolean;
    designSystem: boolean;
  }> {
    const results = {
      knowhow: fs.existsSync(this.knowhowPath),
      changelog: fs.existsSync(this.changelogPath),
      decisions: fs.existsSync(this.decisionsPath),
      designSystem: fs.existsSync(this.designSystemPath),
    };

    console.log("📚 Döküman durumu:");
    console.log(`   KNOWHOW.md: ${results.knowhow ? "✅" : "❌"}`);
    console.log(`   CHANGELOG.md: ${results.changelog ? "✅" : "❌"}`);
    console.log(`   DECISIONS.md: ${results.decisions ? "✅" : "❌"}`);
    console.log(`   DESIGN_SYSTEM.md: ${results.designSystem ? "✅" : "❌"}`);

    return results;
  }

  /**
   * Proje bazlı özet oluştur
   */
  async getProjectSummary(project: LearningEntry["project"]): Promise<string> {
    const knowhow = await this.readFile(this.knowhowPath);
    const changelog = await this.readFile(this.changelogPath);

    const projectTag = `[${project?.toUpperCase()}]`;

    // Proje ile ilgili KNOWHOW entries
    const knowhowMatches = (
      knowhow.match(new RegExp(`### [A-Z]+-\\d+:.*${projectTag}`, "g")) || []
    ).length;

    // Proje ile ilgili CHANGELOG entries
    const changelogMatches = (
      changelog.match(
        new RegExp(`### \\d{4}-\\d{2}-\\d{2}.*${projectTag}`, "g")
      ) || []
    ).length;

    return `
## ${project?.toUpperCase()} Proje Özeti

- **Bilinen Sorunlar/Öğrenmeler:** ${knowhowMatches}
- **Changelog Kayıtları:** ${changelogMatches}
`;
  }

  // ==========================================
  // Yardımcı Metodlar
  // ==========================================

  private extractField(text: string, fieldName: string): string {
    const regex = new RegExp(
      `\\*\\*${fieldName}:\\*\\*\\s*(.+?)(?=\\*\\*|$)`,
      "s"
    );
    const match = text.match(regex);
    return match ? match[1].trim() : "";
  }

  private async readFile(filePath: string): Promise<string> {
    try {
      if (!fs.existsSync(filePath)) {
        return "";
      }
      return fs.readFileSync(filePath, "utf-8");
    } catch (error) {
      console.error(`Dosya okunamadı: ${filePath}`, error);
      return "";
    }
  }

  private async writeFile(filePath: string, content: string): Promise<void> {
    try {
      // Klasör yoksa oluştur
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, content, "utf-8");
    } catch (error) {
      console.error(`Dosya yazılamadı: ${filePath}`, error);
      throw error;
    }
  }
}

// ==========================================
// Singleton Instance
// ==========================================

let documentationAgent: DocumentationAgent | null = null;

export function getDocumentationAgent(): DocumentationAgent {
  if (!documentationAgent) {
    documentationAgent = new DocumentationAgent();
  }
  return documentationAgent;
}

// ==========================================
// CLI Helper Functions
// ==========================================

/**
 * Hızlı bug kaydı
 */
export async function logBug(
  id: string,
  title: string,
  problem: string,
  solution: string,
  tags: string[] = [],
  project?: LearningEntry["project"]
): Promise<boolean> {
  const agent = getDocumentationAgent();
  return agent.addLearning({
    id,
    type: "bug",
    title,
    problem,
    solution,
    date: new Date().toISOString().split("T")[0],
    tags,
    project,
  });
}

/**
 * Hızlı öğrenme kaydı
 */
export async function logLearning(
  id: string,
  title: string,
  learning: string,
  tags: string[] = [],
  project?: LearningEntry["project"]
): Promise<boolean> {
  const agent = getDocumentationAgent();
  return agent.addLearning({
    id,
    type: "learning",
    title,
    problem: "N/A",
    solution: learning,
    date: new Date().toISOString().split("T")[0],
    tags,
    project,
  });
}

/**
 * Hızlı changelog kaydı
 */
export async function logChange(
  type: ChangelogEntry["type"],
  description: string,
  details?: string[],
  project?: ChangelogEntry["project"]
): Promise<boolean> {
  const agent = getDocumentationAgent();
  return agent.addChangelog({
    type,
    description,
    details,
    date: new Date().toISOString().split("T")[0],
    project,
  });
}

export default DocumentationAgent;
