import { InputData } from './types';

export interface Example {
  title: string;
  description: string;
  data: InputData;
}

export const EXAMPLES: Example[] = [
  {
    title: "Water Cycle Lesson",
    description: "A comprehensive lesson plan for Grade 4 Science.",
    data: {
      mode: 'lesson_plan',
      subject: 'Science',
      topic: 'The Water Cycle',
      grade_level: 'Grade 4',
      languages: ['English', 'Thai'],
      learning_objectives: 'Understand evaporation, condensation, and precipitation. Identify the stages of the water cycle in nature.',
      time_available_minutes: 60,
      constraints: 'Limited internet access, need physical diagrams.',
      adaptations: 'Visual aids for students with hearing impairment. Simplified Thai vocabulary for non-native speakers.'
    }
  },
  {
    title: "Math Multiplication Worksheet",
    description: "Practice problems for Grade 3 multiplication.",
    data: {
      mode: 'worksheet',
      subject: 'Mathematics',
      topic: 'Multiplication Tables 1-5',
      grade_level: 'Grade 3',
      languages: ['English'],
      learning_objectives: 'Solve basic multiplication problems. Understand the concept of repeated addition.',
      time_available_minutes: 45,
      constraints: 'Black and white printing only.',
      adaptations: 'Large print for students with low vision. Use of tactile counters suggested.'
    }
  },
  {
    title: "History Quiz (Karen/English)",
    description: "A bilingual quiz on local history for border schools.",
    data: {
      mode: 'quiz',
      subject: 'Social Studies',
      topic: 'Local Community History',
      grade_level: 'Grade 6',
      languages: ['English', 'Karen'],
      learning_objectives: 'Identify key historical events in the local area. Compare traditional and modern lifestyles.',
      time_available_minutes: 30,
      constraints: 'Bilingual format required for all questions.',
      adaptations: 'Audio reading of questions for students with reading difficulties.'
    }
  },
  {
    title: "Inclusive Science Adaptation",
    description: "Adapting a complex topic for diverse learners.",
    data: {
      mode: 'adapt_for_inclusion',
      subject: 'Science',
      topic: 'Photosynthesis',
      grade_level: 'Grade 5',
      languages: ['Thai'],
      learning_objectives: 'Explain how plants make food using sunlight. Identify the role of chlorophyll.',
      time_available_minutes: 60,
      constraints: 'Focus on hands-on activities.',
      adaptations: 'Students with Down syndrome and Autism. Need highly structured, sensory-based activities.'
    }
  }
];
