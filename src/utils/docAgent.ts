#!/usr/bin/env ts-node
/**
 * Documentation Agent CLI
 * 
 * Tüm Blue Perfumery projelerinden kullanılabilir.
 * 
 * Kullanım:
 *   npx ts-node src/utils/docAgent.ts <command> [options]
 * 
 * Komutlar:
 *   bug <id> <title> <problem> <solution> [--project backend|frontend|admin|mcp]
 *   learn <id> <title> <learning> [--project backend|frontend|admin|mcp]
 *   change <type> <description> [--project backend|frontend|admin|mcp]
 *   log <description> [--project backend|frontend|admin|mcp]
 *   status
 *   search <keywords>
 */

import { 
  getDocumentationAgent, 
  logBug, 
  logLearning, 
  logChange,
  LearningEntry 
} from "../agents/documentation/DocumentationAgent";

type Project = LearningEntry["project"];

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    showHelp();
    return;
  }

  // --project flag'ini parse et
  const projectIndex = args.indexOf("--project");
  const project: Project = projectIndex !== -1 
    ? args[projectIndex + 1] as Project 
    : "general";

  // --tags flag'ini parse et
  const tagsIndex = args.indexOf("--tags");
  const tags: string[] = tagsIndex !== -1 
    ? args[tagsIndex + 1].split(",") 
    : [];

  const agent = getDocumentationAgent();

  try {
    switch (command) {
      case "bug": {
        const [, id, title, problem, solution] = args;
        if (!id || !title || !problem || !solution) {
          console.error("❌ Eksik parametre: bug <id> <title> <problem> <solution>");
          return;
        }
        await logBug(id, title, problem, solution, tags, project);
        break;
      }

      case "learn": {
        const [, id, title, learning] = args;
        if (!id || !title || !learning) {
          console.error("❌ Eksik parametre: learn <id> <title> <learning>");
          return;
        }
        await logLearning(id, title, learning, tags, project);
        break;
      }

      case "change": {
        const [, type, description, ...details] = args.filter(
          a => !a.startsWith("--") && args.indexOf(a) < (projectIndex !== -1 ? projectIndex : Infinity)
        );
        if (!type || !description) {
          console.error("❌ Eksik parametre: change <type> <description>");
          return;
        }
        const validTypes = ["feat", "fix", "docs", "refactor", "perf", "test"];
        if (!validTypes.includes(type)) {
          console.error(`❌ Geçersiz tip. Geçerli tipler: ${validTypes.join(", ")}`);
          return;
        }
        await logChange(type as any, description, details.length > 0 ? details : undefined, project);
        break;
      }

      case "log": {
        const description = args.slice(1).filter(a => !a.startsWith("--")).join(" ");
        if (!description) {
          console.error("❌ Eksik parametre: log <description>");
          return;
        }
        await agent.addDailyLog(description, project);
        break;
      }

      case "status": {
        console.log("\n📊 Documentation Agent Durumu\n");
        console.log(`📁 Rules klasörü: ${agent.getRulesPath()}`);
        await agent.syncAllDocs();
        break;
      }

      case "search": {
        const keywords = args.slice(1).filter(a => !a.startsWith("--"));
        if (keywords.length === 0) {
          console.error("❌ Aranacak kelime belirtin: search <keywords>");
          return;
        }
        const results = await agent.checkKnownIssues(keywords, project !== "general" ? project : undefined);
        
        console.log(`\n🔍 "${keywords.join(", ")}" için ${results.length} sonuç bulundu:\n`);
        results.forEach((entry, i) => {
          console.log(`${i + 1}. [${entry.id}] ${entry.title}`);
          console.log(`   Sorun: ${entry.problem.slice(0, 100)}...`);
          console.log(`   Çözüm: ${entry.solution.slice(0, 100)}...`);
          console.log("");
        });
        break;
      }

      case "summary": {
        if (project === "general") {
          console.log("\n📊 Tüm Projeler Özeti");
          for (const p of ["backend", "frontend", "admin", "mcp"] as Project[]) {
            const summary = await agent.getProjectSummary(p);
            console.log(summary);
          }
        } else {
          const summary = await agent.getProjectSummary(project);
          console.log(summary);
        }
        break;
      }

      case "help":
      default:
        showHelp();
    }
  } catch (error) {
    console.error("❌ Hata:", error);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
📚 Documentation Agent CLI - Blue Perfumery

Kullanım:
  npx ts-node src/utils/docAgent.ts <command> [options]

Komutlar:
  bug <id> <title> <problem> <solution>    Bug/hata kaydı ekle
  learn <id> <title> <learning>            Öğrenme kaydı ekle
  change <type> <description>              Changelog kaydı ekle
  log <description>                        Günlük log ekle
  status                                   Döküman durumunu göster
  search <keywords>                        Bilinen sorunlarda ara
  summary                                  Proje özeti göster

Tipler (change için):
  feat, fix, docs, refactor, perf, test

Seçenekler:
  --project <name>    Proje adı (backend, frontend, admin, mcp, general)
  --tags <tag1,tag2>  Etiketler (virgülle ayrılmış)

Örnekler:
  npx ts-node src/utils/docAgent.ts bug 006 "CORS Hatası" "API çağrısı CORS hatası veriyor" "CORS middleware güncellendi" --project backend
  npx ts-node src/utils/docAgent.ts change feat "Chatbot tasarımı güncellendi" --project frontend
  npx ts-node src/utils/docAgent.ts log "Card tasarımları güncellendi" --project frontend
  npx ts-node src/utils/docAgent.ts search cors api
  npx ts-node src/utils/docAgent.ts status
`);
}

main().catch(console.error);
