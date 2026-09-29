import { z } from 'zod';

export const MarkingStepSchema = z.string().min(3);

export const AIQuestionSchema = z.object({
  question_text: z.string().min(10, 'Question text must be detailed'),
  topic_name: z.string().min(2),
  difficulty: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  max_marks: z.number().int().min(1).max(10),
  answer_key: z.string().min(1),
  marking_scheme: z.array(MarkingStepSchema).min(1, 'Marking scheme must contain at least 1 step'),
  is_alternate: z.boolean().default(false),
});

export const AIPaperResponseSchema = z.object({
  paper_title: z.string().min(5),
  syllabus_board: z.string(),
  questions: z.array(AIQuestionSchema).length(10, 'Must generate exactly 10 questions for core paper'),
  alternate_questions: z.array(AIQuestionSchema).min(2).max(4),
});

export type AIQuestion = z.infer<typeof AIQuestionSchema>;
export type AIPaperResponse = z.infer<typeof AIPaperResponseSchema>;

export interface StudentContext {
  student_id: string;
  name: string;
  grade: string;
  syllabus_board: string;
  weak_topics: { id: string; name: string; mastery: number }[];
  strong_topics: { id: string; name: string; mastery: number }[];
  allowed_syllabus_topics: { id: string; name: string }[];
}
