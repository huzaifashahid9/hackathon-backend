import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Function to analyze medical report using Gemini
export const analyzeMedicalReport = async (fileBuffer, mimeType, reportType) => {
  try {
    // Use Gemini 1.5 Flash for faster processing (or use 1.5 Pro for better accuracy)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Convert buffer to base64
    const base64File = fileBuffer.toString("base64");

    const prompt = `You are a medical AI assistant. Analyze this medical report and provide a detailed summary in both English and Roman Urdu.

Report Type: ${reportType}

Please provide:
1. **English Summary**: A clear, simple explanation of the report findings
2. **Roman Urdu Summary**: Same summary in Roman Urdu (Hinglish)
3. **Abnormal Values**: List any values that are outside normal range with:
   - Parameter name
   - Current value
   - Normal range
   - Status (high/low/critical)
4. **Doctor Questions**: 3-5 important questions to ask the doctor
5. **Foods to Avoid**: List foods that should be avoided based on results
6. **Recommended Foods**: List beneficial foods to eat
7. **Home Remedies**: Simple home remedies that may help (if applicable)

Format the response as a JSON object with these exact keys:
{
  "englishSummary": "...",
  "romanUrduSummary": "...",
  "abnormalValues": [
    {
      "parameter": "...",
      "value": "...",
      "normalRange": "...",
      "status": "high/low/critical"
    }
  ],
  "doctorQuestions": ["...", "..."],
  "foodsToAvoid": ["...", "..."],
  "recommendedFoods": ["...", "..."],
  "homeRemedies": ["...", "..."]
}

Important: Always add disclaimer that this is for understanding only, not medical advice.`;

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64File,
          mimeType: mimeType,
        },
      },
      prompt,
    ]);

    const response = result.response;
    const text = response.text();

    // Try to parse JSON response
    try {
      // Remove markdown code blocks if present
      const jsonText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      const parsedData = JSON.parse(jsonText);

      return {
        success: true,
        data: {
          ...parsedData,
          disclaimer:
            "This AI summary is for understanding only, not for medical advice. Always consult your doctor. / Yeh AI sirf samajhne ke liye hai, ilaaj ke liye nahi.",
        },
      };
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      // If JSON parsing fails, return the raw text
      return {
        success: true,
        data: {
          englishSummary: text,
          romanUrduSummary:
            "Tafseel English mein upar di gayi hai. Doctor se zaroor mashwara karein.",
          abnormalValues: [],
          doctorQuestions: [],
          foodsToAvoid: [],
          recommendedFoods: [],
          homeRemedies: [],
          disclaimer:
            "This AI summary is for understanding only, not for medical advice. Always consult your doctor. / Yeh AI sirf samajhne ke liye hai, ilaaj ke liye nahi.",
        },
      };
    }
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to analyze report with AI");
  }
};

// Function to generate health insights from manual vitals
export const generateVitalsInsights = async (vitalsData) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a health AI assistant. Analyze these health vitals and provide insights:

${JSON.stringify(vitalsData, null, 2)}

Provide:
1. **Overall Assessment**: Brief assessment in English
2. **Roman Urdu Assessment**: Same in Roman Urdu
3. **Recommendations**: 3-5 lifestyle or dietary recommendations
4. **Warning Signs**: Any concerning values that need medical attention

Format as JSON:
{
  "englishAssessment": "...",
  "romanUrduAssessment": "...",
  "recommendations": ["...", "..."],
  "warningSign": "..." or null
}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    try {
      const jsonText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      return {
        success: true,
        data: JSON.parse(jsonText),
      };
    } catch (parseError) {
      return {
        success: true,
        data: {
          englishAssessment: text,
          romanUrduAssessment: "Tafseel English mein upar di gayi hai.",
          recommendations: [],
          warningSign: null,
        },
      };
    }
  } catch (error) {
    console.error("Gemini vitals analysis error:", error);
    throw new Error("Failed to generate vitals insights");
  }
};

export default { analyzeMedicalReport, generateVitalsInsights };
