import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Lazy initialize Gemini client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health Check API
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// AI Construction Progress & Risk Analysis API
app.post("/api/ai/analyze-progress", async (req, res) => {
  try {
    const { siteName, zoneName, plannedProgress, actualProgress, wbsTasks, recentLogs, analysisType } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      // Return structured fallback analysis if API key is not yet set
      const gap = Number(actualProgress || 0) - Number(plannedProgress || 0);
      const isBehind = gap < 0;
      return res.json({
        summary: `[${siteName} - ${zoneName}] 공정 현황 분석 결과입니다. 계획 공정률(${plannedProgress}%) 대비 실적 공정률(${actualProgress}%)로 ${
          isBehind ? `약 ${Math.abs(gap).toFixed(1)}%p 지연` : `약 ${gap.toFixed(1)}%p 초과 달성`
        } 상태입니다.`,
        keyFindings: [
          `주요 공종별 진척률 분석: 주요 마일스톤에 대한 가중치 재산정 및 병목 공종 집중 관리가 요구됩니다.`,
          `인력/장비 투입 적정성: 현 투입 기종 및 기능공의 작업 생산성 지수를 유지하며 동절기/우기 대비 공정 계획 수립 필요.`,
          `품질/안전 리스크: 중장비 작업 반경 내 안전구획 설정 및 콘크리트 양생 강도 정밀 관리가 필요합니다.`
        ],
        recommendations: [
          `지연 공종 만회를 위한 크리티컬 패스(Critical Path) 집중 투입 계획 수립`,
          `현장 HTML 핫링크 도면 및 사진 대조를 통한 주간 단위 실적 검측 강화`,
          `발주처 및 감리단 합동 공정회의 시 정량적 기성고 리포트 제출`
        ],
        riskLevel: isBehind ? (Math.abs(gap) > 5 ? "HIGH" : "MEDIUM") : "LOW",
        forecastCompletion: "예정 준공일 내 공정 만회 가능 (주간 1.2%p 진척 시)",
      });
    }

    const prompt = `
당신은 대한민국 최고 수준의 스마트 건설엔지니어링 수석감리원이자 공정관리 전문가입니다.
다음 공사 현장 및 세부 구역의 공정 데이터를 분석하고, 실무에 즉시 활용 가능한 전문적이고 실효성 있는 공정 분석 리포트를 작성해주세요.

[현장 정보]
- 공사명: ${siteName}
- 세부 구역/공구명: ${zoneName}
- 계획 공정률: ${plannedProgress}%
- 실적 공정률: ${actualProgress}%
- 분석 유형: ${analysisType || "종합 공정 진단 및 리스크 예측"}

[세부 공정 항목 (WBS)]
${JSON.stringify(wbsTasks || [], null, 2)}

[최근 작업 일보 및 현장 특이사항]
${JSON.stringify(recentLogs || [], null, 2)}

다음 JSON 형식으로만 정확히 응답해주세요:
{
  "summary": "총괄 진단 요약문 (2~3문장)",
  "keyFindings": ["주요 분석 결과 1", "주요 분석 결과 2", "주요 분석 결과 3"],
  "recommendations": ["공정 만회 및 개선 대책 1", "개선 대책 2", "개선 대책 3"],
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "forecastCompletion": "예상 준공 전망 및 소견"
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "{}";
    const parsed = JSON.parse(text);
    return res.json(parsed);
  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    return res.status(500).json({
      error: "공정 AI 분석 중 오류가 발생했습니다.",
      details: error?.message || String(error),
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Smart Construction Server running on http://localhost:${PORT}`);
  });
}

startServer();
