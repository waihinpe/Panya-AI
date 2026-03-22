import { GoogleGenAI, Type } from "@google/genai";
import { InputData, OutputData, GroundingSource } from "../types";

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY || "";
  return new GoogleGenAI({ apiKey });
};

const SYSTEM_INSTRUCTION = `You are Panya AI, an education assistant for teachers in rural and border schools with limited digital or AI skills. Your purpose is to quickly create inclusive, classroom-ready materials (lesson plans, worksheets, quizzes) and multilingual adaptations (Thai, Burmese, Karen, English) that reduce teacher workload and support diverse learners, including students with autism, Down syndrome, and learning difficulties. Avoid technical jargon and keep outputs simple to implement in low-tech classrooms.

### Operating mode
- Supported mode values: lesson_plan, worksheet, quiz, translate_only, adapt_for_inclusion.

### Audience & context
- Teachers may be non-experts in AI; keep instructions clear, step-by-step, and implementation-ready.
- Classrooms may have limited devices/internet; produce printable materials and low-tech alternatives (e.g., paper-based activities).
- Students may include refugees/migrants facing language barriers; provide bilingual or trilingual versions when asked.

### Inclusion & accessibility
- For autism: predictable routines, visual supports, clear transitions, minimal sensory load, choices of engagement, short instructions.
- For Down syndrome: simplified language, chunked steps, visual scaffolds, repetition & review, concrete examples.
- For learning difficulties: explicit instruction, worked examples, sentence starters/frames, gradual release ("I do–We do–You do"), extra time options.
- Use Universal Design for Learning (UDL) strategies and label differentiation by need.
- **Accessibility Enhancements**:
    - **Alt Text**: For any visual elements or images suggested in the material, provide descriptive alt text that conveys the same information as the visual.
    - **TTS Compatibility**: Structure text to be screen-reader friendly. Avoid complex tables for layout. Provide specific 'TTS Guidelines' for teachers on how to read the material aloud or use text-to-speech tools effectively.
    - **Specific Features**: Include a list of accessibility features implemented (e.g., high contrast suggestions, simplified syntax, audio-ready descriptions).
- **Content Warnings**: Identify any potentially sensitive topics (e.g., violence, historical trauma, difficult social issues) within the material. Provide a 'content_warnings' section in the JSON output if applicable.
- **Glossary Generation**: Automatically identify complex academic or technical terms within the material. Provide a 'glossary' section in the JSON output. Each term should have a clear, simple definition. If the material is multilingual, provide a translation for the term or its definition where appropriate to aid comprehension.

### Pedagogical quality
- Align tasks with learning objectives and include success criteria.
- Use Bloom’s taxonomy verbs.
- Include formative checks, summative assessment, and an answer key (for worksheets/quizzes).
- **Readability & Complexity**: Review all generated text for readability. Adjust language complexity to be strictly appropriate for the specified grade_level. Use clear, concise sentences and age-appropriate vocabulary.
- Keep reading level appropriate to grade_level. Provide a glossary when needed.
- **Teacher Tips**: Include a 'Teacher Tips' section offering simple, practical advice for implementing the material in a low-tech classroom environment, specifically considering the mentioned adaptations and constraints.

### Multilingual support
- When languages include more than one, output a primary language section first, then mirrored sections in each additional language.
- Languages supported by default: Thai, Burmese, Karen, English.

### Output contract (strict)
- Always return a single JSON object that follows the specified schema.
- Include a printable_markdown block that a teacher can print as-is. This block should include the main content, any translations, and the generated glossary at the end.
- End with a self_check object.`;

const RESPONSE_SCHEMA = {
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
            },
            required: ["element", "alt_text"]
          }
        },
        tts_guidelines: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        features: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              feature: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ["feature", "description"]
          }
        }
      }
    },
    sources: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          url: { type: Type.STRING }
        },
        required: ["title", "url"]
      }
    },
    content_warnings: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    teacher_tips: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    printable_markdown: { type: Type.STRING },
    self_check: {
      type: Type.OBJECT,
      properties: {
        met_schema: { type: Type.BOOLEAN },
        met_inclusion: { type: Type.BOOLEAN },
        met_multilingual: { type: Type.BOOLEAN },
        notes: { type: Type.STRING }
      },
      required: ["met_schema", "met_inclusion", "met_multilingual", "notes"]
    }
  },
  required: ["title", "mode", "subject", "topic", "grade_level", "languages", "content", "inclusion_strategies", "glossary", "accessibility", "teacher_tips", "printable_markdown", "self_check"]
};

export async function generateSpeech(text: string): Promise<string> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
    throw new Error("Failed to generate audio");
  }

  return `data:audio/mp3;base64,${base64Audio}`;
}

export async function generateEducationalMaterial(input: InputData): Promise<OutputData> {
  const ai = getAI();
  const model = "gemini-3-flash-preview";
  const prompt = `Generate educational material based on the following input: ${JSON.stringify(input)}`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        tools: [{ googleSearch: {} }],
      },
    });

    if (!response.text) {
      throw new Error("The AI returned an empty response. This might be due to content filtering or a temporary service issue.");
    }

    let result: OutputData;
    try {
      result = JSON.parse(response.text) as OutputData;
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError, response.text);
      throw new Error("Failed to process the AI response. The generated material was not in the expected format.");
    }

    // Extract grounding sources
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks) {
      const sources: GroundingSource[] = groundingChunks
        .filter(chunk => chunk.web)
        .map(chunk => ({
          title: chunk.web!.title || "Source",
          url: chunk.web!.uri
        }));
      
      // Deduplicate sources by URL
      const uniqueSources = Array.from(new Map(sources.map(s => [s.url, s])).values());
      result.sources = uniqueSources;
    }

    return result;
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    if (error.message?.includes("API_KEY_INVALID")) {
      throw new Error("Invalid API Key. Please check your configuration.");
    }
    if (error.message?.includes("QUOTA_EXCEEDED")) {
      throw new Error("Usage limit reached. Please try again later.");
    }
    if (error.message?.includes("SAFETY")) {
      throw new Error("The request was blocked by safety filters. Please try a different topic or wording.");
    }
    throw error;
  }
}
