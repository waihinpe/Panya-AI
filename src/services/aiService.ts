import { GoogleGenAI, Type } from "@google/genai";
import { InputData, OutputData, GroundingSource } from "../types";

// Mock implementation for demonstration purposes
export async function generateSpeech(text: string): Promise<string> {
  console.log("Mocking speech for:", text);
  // Return a tiny silent MP3 base64 string
  return "data:audio/mp3;base64,SUQzBAAAAAABAFRYWFgAAAASAAADbWFqb3JfYnJhbmQAZGFzaABUWFhYAAAAEQAAA21pbm9yX3ZlcnNpb24AMABUWFhYAAAAHAAAA2NvbXBhdGlibGVfYnJhbmRzAGlzbzZtcDQyAFRTU0UAAAAPAAADTGF2ZjYwLjMuMTAwAAAAAAAAAAAAAAD/8MUAAAAAAAAAAAAAAAAAAAAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV";
}

export async function generateEducationalMaterial(input: InputData): Promise<OutputData> {
  console.log("Mocking educational material for:", input);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  const primaryLang = input.languages[0] || "English";
  const otherLangs = input.languages.slice(1);

  const mockResult: OutputData = {
    title: `${input.topic} - ${input.mode.replace('_', ' ').toUpperCase()}`,
    mode: input.mode,
    subject: input.subject,
    topic: input.topic,
    grade_level: input.grade_level,
    languages: input.languages,
    content: {
      primary_language: {
        title: `${input.topic} (${primaryLang})`,
        sections: [
          {
            heading: "Introduction",
            body: `This is a comprehensive guide about ${input.topic} designed for ${input.grade_level} students. We will explore the core concepts and practical applications.`
          },
          {
            heading: "Key Concepts",
            body: `1. Understanding the fundamentals of ${input.topic}.\n2. Exploring real-world examples.\n3. Interactive activities to reinforce learning.`
          },
          {
            heading: "Activity",
            body: "Divide into small groups and discuss how this topic affects your daily life. Write down three observations."
          }
        ]
      },
      mirrored_languages: otherLangs.map(lang => ({
        language: lang,
        title: `${input.topic} (${lang})`,
        sections: [
          {
            heading: "Introduction (Translated)",
            body: `[Mock Translation to ${lang}] This is a comprehensive guide about ${input.topic} designed for ${input.grade_level} students.`
          },
          {
            heading: "Key Concepts (Translated)",
            body: `[Mock Translation to ${lang}] 1. Understanding the fundamentals.\n2. Real-world examples.`
          }
        ]
      }))
    },
    inclusion_strategies: [
      {
        need: "Autism Support",
        strategy: "Use visual schedules and clear, predictable instructions. Provide a quiet space for focus."
      },
      {
        need: "Learning Difficulties",
        strategy: "Break tasks into smaller, manageable steps. Use graphic organizers to map out ideas."
      }
    ],
    glossary: [
      {
        term: input.topic,
        definition: `The main subject of our study, focusing on ${input.subject}.`,
        translation: `[Translation of ${input.topic}]`
      },
      {
        term: "Fundamental",
        definition: "A basic principle, rule, or law that serves as the groundwork of a system.",
        translation: "[Translation of Fundamental]"
      }
    ],
    accessibility: {
      alt_text_suggestions: [
        {
          element: "Main Diagram",
          alt_text: `A visual representation showing the relationship between different parts of ${input.topic}.`
        }
      ],
      tts_guidelines: [
        "Read headings clearly with a slight pause after each.",
        "Describe visual elements using the provided alt text.",
        "Speak at a moderate pace, especially during translated sections."
      ],
      features: [
        {
          feature: "Simplified Language",
          description: "Text is written at a readability level suitable for the target grade."
        },
        {
          feature: "Visual Scaffolding",
          description: "Suggestions for diagrams and charts are included to support visual learners."
        }
      ]
    },
    teacher_tips: [
      "Prepare printed copies of the worksheet beforehand.",
      "Use local materials (stones, sticks, bottle caps) for the interactive activities.",
      "Encourage students to help each other with translations if they are multilingual."
    ],
    printable_markdown: `# ${input.topic}\n\n## Introduction\nThis is a mock version of the educational material for **${input.topic}**. Since the API is currently disabled, this sample data shows how the final output would be structured and presented to teachers.\n\n### Key Points\n- Designed for ${input.grade_level}\n- Includes adaptations for diverse learners\n- Multilingual support for: ${input.languages.join(', ')}\n\n*Note: This is simulated data for demonstration purposes.*`,
    self_check: {
      met_schema: true,
      met_inclusion: true,
      met_multilingual: true,
      notes: "Mock data generated successfully for demonstration."
    }
  };

  return mockResult;
}
