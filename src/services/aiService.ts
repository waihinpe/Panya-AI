import { GoogleGenAI, Type } from "@google/genai";
import { InputData, OutputData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateSpeech(text: string): Promise<string> {
  // In a real app, this would call a TTS API. For now, we'll keep the mock or use Gemini TTS if available.
  // Gemini 2.5 Flash Preview TTS is available, but let's stick to the content generation first.
  console.log("Speech generation requested for:", text);
  return "data:audio/mp3;base64,SUQzBAAAAAABAFRYWFgAAAASAAADbWFqb3JfYnJhbmQAZGFzaABUWFhYAAAAEQAAA21pbm9yX3ZlcnNpb24AMABUWFhYAAAAHAAAA2NvbXBhdGlibGVfYnJhbmRzAGlzbzZtcDQyAFRTU0UAAAAPAAADTGF2ZjYwLjMuMTAwAAAAAAAAAAAAAAD/8MUAAAAAAAAAAAAAAAAAAAAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV";
}

export async function generateEducationalMaterial(input: InputData): Promise<OutputData> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const model = "gemini-3.1-pro-preview";
  
    const prompt = `
    You are an expert inclusive education specialist. Create a detailed ${input.mode.replace('_', ' ')} for:
    Topic: ${input.topic}
    Subject: ${input.subject}
    Grade: ${input.grade_level}
    Languages: ${input.languages.join(', ')}
    Objectives: ${input.learning_objectives}

    Requirements:
    1. Detailed content in primary and mirrored languages.
    2. Inclusion strategies for diverse needs.
    3. Comprehensive glossary.
    4. Practical teacher tips.
    5. A 'printable_markdown' field containing ALL the above formatted for a professional PDF.
    
    CONSTRAINTS:
    - Total word count across all sections should be around 800-1000 words.
    - Be concise but thorough.
    - Ensure the JSON is valid and follows the schema exactly.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            mode: { type: Type.STRING },
            subject: { type: Type.STRING },
            topic: { type: Type.STRING },
            grade_level: { type: Type.STRING },
            languages: { type: Type.ARRAY, items: { type: Type.STRING } },
            content: {
              type: Type.OBJECT,
              properties: {
                primary_language: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    sections: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          heading: { type: Type.STRING },
                          body: { type: Type.STRING }
                        },
                        required: ["heading", "body"]
                      }
                    }
                  },
                  required: ["title", "sections"]
                },
                mirrored_languages: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      language: { type: Type.STRING },
                      title: { type: Type.STRING },
                      sections: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            heading: { type: Type.STRING },
                            body: { type: Type.STRING }
                          },
                          required: ["heading", "body"]
                        }
                      }
                    },
                    required: ["language", "title", "sections"]
                  }
                }
              },
              required: ["primary_language", "mirrored_languages"]
            },
            inclusion_strategies: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  need: { type: Type.STRING },
                  strategy: { type: Type.STRING }
                },
                required: ["need", "strategy"]
              }
            },
            glossary: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING },
                  definition: { type: Type.STRING },
                  translation: { type: Type.STRING }
                },
                required: ["term", "definition"]
              }
            },
            accessibility: {
              type: Type.OBJECT,
              properties: {
                alt_text_suggestions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      element: { type: Type.STRING },
                      alt_text: { type: Type.STRING }
                    }
                  }
                },
                tts_guidelines: { type: Type.ARRAY, items: { type: Type.STRING } },
                features: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      feature: { type: Type.STRING },
                      description: { type: Type.STRING }
                    }
                  }
                }
              }
            },
            teacher_tips: { type: Type.ARRAY, items: { type: Type.STRING } },
            printable_markdown: { type: Type.STRING },
            self_check: {
              type: Type.OBJECT,
              properties: {
                met_schema: { type: Type.BOOLEAN },
                met_inclusion: { type: Type.BOOLEAN },
                met_multilingual: { type: Type.BOOLEAN },
                notes: { type: Type.STRING }
              }
            }
          },
          required: [
            "title", "mode", "subject", "topic", "grade_level", "languages", 
            "content", "inclusion_strategies", "glossary", "teacher_tips", 
            "printable_markdown", "self_check"
          ]
        }
      }
    });

    if (!response.text) {
      throw new Error("Empty AI response.");
    }

    try {
      return JSON.parse(response.text) as OutputData;
    } catch (e) {
      console.error("JSON Parse Error:", response.text);
      throw new Error("Invalid AI response format.");
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}
