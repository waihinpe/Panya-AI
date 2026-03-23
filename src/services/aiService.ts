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
  const model = "gemini-3.1-pro-preview";
  
  const prompt = `
    You are an expert inclusive education specialist and curriculum designer. 
    Create a highly detailed, comprehensive ${input.mode.replace('_', ' ')} for the following:
    
    Topic: ${input.topic}
    Subject: ${input.subject}
    Grade Level: ${input.grade_level}
    Target Languages: ${input.languages.join(', ')}
    Learning Objectives: ${input.learning_objectives}
    Time Available: ${input.time_available_minutes} minutes
    Constraints: ${input.constraints}
    Adaptations Needed: ${input.adaptations || 'None specified'}
    Sensitive Topics to Handle: ${input.sensitive_topics || 'None specified'}

    CRITICAL REQUIREMENTS:
    1. The content must be EXTENSIVE and detailed, aiming for approximately 2 full pages of printed material.
    2. Provide a deep dive into the topic with multiple sections (Introduction, Background, Core Content, Examples, Activities, Assessment).
    3. Ensure the language is inclusive and accessible for the target grade level.
    4. For the mirrored languages (${input.languages.slice(1).join(', ')}), provide high-quality, accurate translations of the core content.
    5. Include specific inclusion strategies for learners with diverse needs (e.g., Autism, Dyslexia, Visual Impairment).
    6. Provide a comprehensive glossary of key terms with definitions and translations.
    7. Include practical teacher tips for implementation in low-resource settings.
    8. Generate a 'printable_markdown' version that is beautifully formatted for a 2-page PDF export. 
       This markdown MUST include ALL the information generated above:
       - A clear title and metadata section.
       - The full content in the primary language.
       - The full content in all mirrored languages.
       - The Inclusion Strategies section.
       - The Glossary section.
       - The Teacher Tips section.
       - Use clear headers (H1, H2, H3), bold text, and lists to make it look professional.
       - Aim for a length that naturally fills about 2 pages (approx 1000-1500 words total).
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
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

  const result = JSON.parse(response.text);
  return result as OutputData;
}
