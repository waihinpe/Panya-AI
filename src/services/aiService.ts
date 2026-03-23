import { GoogleGenAI, Type, Modality } from "@google/genai";
import { InputData, OutputData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateSpeech(text: string): Promise<string> {
  try {
    // Truncate text to a reasonable length for TTS if necessary
    const truncatedText = text.length > 3000 ? text.substring(0, 3000) + "..." : text;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say clearly and professionally: ${truncatedText}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return `data:audio/mp3;base64,${base64Audio}`;
    }
    throw new Error("No audio data received");
  } catch (error) {
    console.error("TTS Error:", error);
    throw error;
  }
}

function cleanJson(text: string): string {
  // Find the first '{' and the last '}' to extract the JSON object
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end >= start) {
    return text.substring(start, end + 1);
  }
  // Fallback to removing markdown blocks
  return text.replace(/```json\n?|```/g, "").trim();
}

export function constructMarkdown(data: Omit<OutputData, 'printable_markdown'>): string {
  let md = `# ${data.title}\n\n`;
  md += `**Mode:** ${data.mode.replace('_', ' ')} | **Subject:** ${data.subject} | **Grade:** ${data.grade_level}\n\n`;
  md += `**Languages:** ${data.languages.join(', ')}\n\n`;
  md += `---\n\n`;

  // Primary Language Content
  md += `## Primary Content (${data.languages[0]})\n\n`;
  md += `### ${data.content.primary_language.title}\n\n`;
  data.content.primary_language.sections.forEach(section => {
    md += `**${section.heading}**\n${section.body}\n\n`;
  });

  // Mirrored Languages
  data.content.mirrored_languages.forEach(mirrored => {
    md += `---\n\n`;
    md += `## Mirrored Content (${mirrored.language})\n\n`;
    md += `### ${mirrored.title}\n\n`;
    mirrored.sections.forEach(section => {
      md += `**${section.heading}**\n${section.body}\n\n`;
    });
  });

  md += `---\n\n`;

  // Inclusion Strategies
  md += `## Inclusion Strategies\n\n`;
  data.inclusion_strategies.forEach(strat => {
    md += `- **${strat.need}:** ${strat.strategy}\n`;
  });
  md += `\n`;

  // Glossary
  md += `## Glossary\n\n`;
  md += `| Term | Definition | Translation |\n`;
  md += `| :--- | :--- | :--- |\n`;
  data.glossary.forEach(item => {
    md += `| ${item.term} | ${item.definition} | ${item.translation || '-'} |\n`;
  });
  md += `\n`;

  // Accessibility
  if (data.accessibility) {
    md += `## Accessibility Support\n\n`;
    md += `### Features\n`;
    data.accessibility.features.forEach(f => {
      md += `- **${f.feature}:** ${f.description}\n`;
    });
    md += `\n`;

    if (data.accessibility.alt_text_suggestions.length > 0) {
      md += `### Alt-Text Suggestions\n`;
      data.accessibility.alt_text_suggestions.forEach(alt => {
        md += `- **${alt.element}:** ${alt.alt_text}\n`;
      });
      md += `\n`;
    }

    if (data.accessibility.tts_guidelines.length > 0) {
      md += `### TTS Guidelines\n`;
      data.accessibility.tts_guidelines.forEach(g => {
        md += `- ${g}\n`;
      });
      md += `\n`;
    }
  }

  // Teacher Tips
  if (data.teacher_tips.length > 0) {
    md += `## Teacher Tips\n\n`;
    data.teacher_tips.forEach(tip => {
      md += `- ${tip}\n`;
    });
    md += `\n`;
  }

  // Sources
  if (data.sources && data.sources.length > 0) {
    md += `## Sources & Grounding\n\n`;
    data.sources.forEach(source => {
      md += `- [${source.title}](${source.url})\n`;
    });
    md += `\n`;
  }

  // Content Warnings
  if (data.content_warnings && data.content_warnings.length > 0) {
    md += `## Content Warnings\n\n`;
    data.content_warnings.forEach(warning => {
      md += `- ${warning}\n`;
    });
    md += `\n`;
  }

  return md;
}

export async function generateEducationalMaterial(input: InputData): Promise<OutputData> {
  const model = "gemini-3-flash-preview";
  
    const prompt = `
    You are an expert inclusive education specialist. Create a comprehensive and detailed ${input.mode.replace('_', ' ')} for:
    Topic: ${input.topic}
    Subject: ${input.subject}
    Grade: ${input.grade_level}
    Target Languages: ${input.languages.join(', ')} (Primary: ${input.languages[0]})
    Objectives: ${input.learning_objectives}

    Requirements:
    1. **Multilingual Content**: Provide the full content in the primary language AND mirrored versions in ALL other target languages. Each mirrored version must be a faithful translation of the primary content.
    2. **Inclusion**: Provide specific, actionable strategies for diverse learning needs (e.g., ADHD, Dyslexia, Visual Impairment, Gifted/Talented).
    3. **Accessibility**: Include alt-text suggestions for visual elements, TTS guidelines, and specific accessibility features (e.g., high contrast, simplified layout).
    4. **Glossary**: A comprehensive list of key terms with definitions and translations for each target language.
    5. **Sources**: Include at least 2-3 credible grounding sources (titles and URLs).
    6. **Content Warnings**: Identify any potentially sensitive topics or triggers.
    
    CONSTRAINTS:
    - Total word count should be around 1000-1200 words to ensure depth and quality.
    - Ensure strict adherence to the JSON schema.
    - The output must be a valid JSON object.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
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
                    },
                    required: ["element", "alt_text"]
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
                    },
                    required: ["feature", "description"]
                  }
                }
              },
              required: ["alt_text_suggestions", "tts_guidelines", "features"]
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
            content_warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
            teacher_tips: { type: Type.ARRAY, items: { type: Type.STRING } },
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
          required: [
            "title", "mode", "subject", "topic", "grade_level", "languages", 
            "content", "inclusion_strategies", "glossary", "accessibility", 
            "teacher_tips", "self_check", "sources", "content_warnings"
          ]
        }
      }
    });

    if (!response.text) {
      throw new Error("Empty AI response.");
    }

    const cleanedText = cleanJson(response.text);

    try {
      const parsed = JSON.parse(cleanedText) as Omit<OutputData, 'printable_markdown'>;
      
      // Generate the printable markdown on the client side to save tokens and prevent truncation
      const printable_markdown = constructMarkdown(parsed);
      
      return {
        ...parsed,
        printable_markdown
      } as OutputData;
    } catch (e) {
      console.error("JSON Parse Error. Cleaned Text:", cleanedText);
      throw new Error("Invalid AI response format. The generated content was too large or malformed.");
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}
