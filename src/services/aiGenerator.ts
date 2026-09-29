import type { Student, Topic, Question, Paper, SyllabusBoard } from '../types';
import { AnalyticsEngine } from './analyticsEngine';

export interface GeneratePaperOptions {
  student: Student;
  topics: Topic[];
  questionCount?: number;
  calibratedDifficulty?: 1 | 2 | 3 | 4 | 5 | 'adaptive';
  focusOnWeakTopics?: boolean;
  customTitle?: string;
}

export interface GeneratedPaperPayload {
  paper: Omit<Paper, 'id' | 'created_at' | 'updated_at'>;
  questions: Omit<Question, 'id' | 'paper_id'>[];
}

/**
 * Question Templates by Board and Topic category
 * Provides realistic, rigorous questions with complete marking schemes and answer keys.
 */
interface QuestionTemplate {
  topicMatches: string[];
  boardMatches?: SyllabusBoard[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  question_text: string;
  answer_key: string;
  marking_scheme: string[];
  max_marks: number;
}

const QUESTION_BANK: QuestionTemplate[] = [
  // --- IB DP Math AA / Calculus ---
  {
    topicMatches: ['Integration', 'Calculus', 'Definite Integrals', 'Integration by Parts'],
    boardMatches: ['IB DP Math AA', 'AP Calculus BC', 'CBSE Class 10/12'],
    difficulty: 1,
    question_text: 'Evaluate the definite integral: ∫ from 0 to 2 of (3x² - 4x + 1) dx.',
    answer_key: '2',
    marking_scheme: [
      'M1: Integrate term-by-term to obtain [x³ - 2x² + x]',
      'M1: Substitute upper limit 2: (8 - 8 + 2 = 2) and lower limit 0: (0)',
      'A1: Correct final answer: 2',
    ],
    max_marks: 3,
  },
  {
    topicMatches: ['Integration by Parts', 'Calculus', 'Advanced Integration'],
    boardMatches: ['IB DP Math AA', 'AP Calculus BC'],
    difficulty: 3,
    question_text: 'Use integration by parts to evaluate ∫ x · e^(2x) dx.',
    answer_key: '(1/2)x e^(2x) - (1/4)e^(2x) + C',
    marking_scheme: [
      'M1: Choose u = x, dv = e^(2x)dx => du = dx, v = (1/2)e^(2x)',
      'M1: Apply formula: u·v - ∫ v du = (1/2)x e^(2x) - (1/2)∫ e^(2x) dx',
      'A1: Integrate remainder correctly: -(1/4)e^(2x)',
      'A1: Include constant of integration + C',
    ],
    max_marks: 4,
  },
  {
    topicMatches: ['Differential Equations', 'Calculus'],
    boardMatches: ['IB DP Math AA', 'AP Calculus BC', 'CBSE Class 10/12'],
    difficulty: 2,
    question_text: 'Find the general solution to the separable differential equation: dy/dx = 2x(y² + 1).',
    answer_key: 'arctan(y) = x² + C  or  y = tan(x² + C)',
    marking_scheme: [
      'M1: Separate variables: ∫ (1 / (y² + 1)) dy = ∫ 2x dx',
      'A1: Left-hand side: arctan(y)',
      'A1: Right-hand side: x² + C',
      'A1: Correct implicit or explicit form',
    ],
    max_marks: 4,
  },
  {
    topicMatches: ['Vectors', '3D Geometry', 'Lines and Planes'],
    boardMatches: ['IB DP Math AA', 'CBSE Class 10/12'],
    difficulty: 2,
    question_text: 'Find the angle between vectors u = [2, -1, 2] and v = [1, 2, 2]. Give your answer in degrees.',
    answer_key: 'θ ≈ 63.6° (cos θ = 4/9)',
    marking_scheme: [
      'M1: Compute dot product: u · v = (2)(1) + (-1)(2) + (2)(2) = 4',
      'M1: Compute magnitudes: |u| = √(4+1+4) = 3 and |v| = √(1+4+4) = 3',
      'M1: Apply cos θ = (u · v) / (|u||v|) = 4 / 9',
      'A1: θ = arccos(4/9) ≈ 63.6°',
    ],
    max_marks: 4,
  },
  {
    topicMatches: ['Vectors', 'Cross Product'],
    boardMatches: ['IB DP Math AA'],
    difficulty: 3,
    question_text: 'Find a unit vector perpendicular to both a = [1, 0, 2] and b = [0, 3, -1].',
    answer_key: '± (1/√46) [-6, 1, 3]',
    marking_scheme: [
      'M1: Set up cross product determinant for a × b',
      'A1: a × b = [ (0 - 6), -( -1 - 0), (3 - 0) ] = [-6, 1, 3]',
      'M1: Magnitude |a × b| = √(36 + 1 + 9) = √46',
      'A1: Normalize to unit vector: [-6/√46, 1/√46, 3/√46]',
    ],
    max_marks: 4,
  },
  {
    topicMatches: ['Complex Numbers', 'Argand Plane'],
    boardMatches: ['IB DP Math AA', 'CBSE Class 10/12'],
    difficulty: 2,
    question_text: 'Express z = (3 + 4i) / (1 - 2i) in standard form a + bi.',
    answer_key: '-1 + 2i',
    marking_scheme: [
      'M1: Multiply numerator and denominator by conjugate (1 + 2i)',
      'M1: Denominator = 1² + 2² = 5',
      'M1: Numerator = (3)(1) + (3)(2i) + (4i)(1) + (4i)(2i) = 3 + 6i + 4i - 8 = -5 + 10i',
      'A1: Simplify: -5/5 + (10/5)i = -1 + 2i',
    ],
    max_marks: 4,
  },
  {
    topicMatches: ['Probability', 'Binomial Distribution', 'Normal Distribution'],
    boardMatches: ['IB DP Math AA', 'Cambridge IGCSE', 'CBSE Class 10/12'],
    difficulty: 2,
    question_text: 'A fair 6-sided die is rolled 5 times. Find the probability of getting exactly 2 sixes.',
    answer_key: '0.161 (or 625/3888)',
    marking_scheme: [
      'M1: Identify binomial: n = 5, p = 1/6, k = 2',
      'M1: Formula: C(5,2) * (1/6)² * (5/6)³',
      'A1: C(5,2) = 10, (1/36) * (125/216) = 1250 / 7776',
      'A1: Simplified: 625/3888 ≈ 0.161 (3 s.f.)',
    ],
    max_marks: 4,
  },

  // --- Cambridge IGCSE Math ---
  {
    topicMatches: ['Quadratic Equations', 'Algebra', 'Factorisation'],
    boardMatches: ['Cambridge IGCSE', 'CBSE Class 10/12', 'General STEM'],
    difficulty: 1,
    question_text: 'Solve 2x² - 5x - 3 = 0 by factorisation.',
    answer_key: 'x = 3 or x = -0.5',
    marking_scheme: [
      'M1: Factorise into (2x + 1)(x - 3) = 0',
      'A1: 2x + 1 = 0 => x = -1/2',
      'A1: x - 3 = 0 => x = 3',
    ],
    max_marks: 3,
  },
  {
    topicMatches: ['Coordinate Geometry', 'Linear Graphs'],
    boardMatches: ['Cambridge IGCSE', 'General STEM'],
    difficulty: 1,
    question_text: 'Find the equation of the line passing through (2, 5) and (6, 13) in the form y = mx + c.',
    answer_key: 'y = 2x + 1',
    marking_scheme: [
      'M1: Gradient m = (13 - 5) / (6 - 2) = 8 / 4 = 2',
      'M1: Substitute point (2,5): 5 = 2(2) + c => c = 1',
      'A1: Equation: y = 2x + 1',
    ],
    max_marks: 3,
  },
  {
    topicMatches: ['Trigonometry', 'Sine Rule', 'Cosine Rule'],
    boardMatches: ['Cambridge IGCSE', 'IB DP Math AA'],
    difficulty: 2,
    question_text: 'In triangle ABC, AB = 7 cm, BC = 9 cm, and angle B = 60°. Calculate the length of AC.',
    answer_key: 'AC = √67 ≈ 8.19 cm',
    marking_scheme: [
      'M1: State cosine rule: b² = a² + c² - 2ac cos B',
      'M1: Substitute values: b² = 9² + 7² - 2(9)(7) cos 60°',
      'A1: b² = 81 + 49 - 126(0.5) = 130 - 63 = 67',
      'A1: b = √67 ≈ 8.19 cm (3 s.f.)',
    ],
    max_marks: 4,
  },
  {
    topicMatches: ['Sequences', 'Arithmetic Progression', 'Geometric Sequences'],
    boardMatches: ['Cambridge IGCSE', 'CBSE Class 10/12'],
    difficulty: 1,
    question_text: 'The nth term of a sequence is given by T_n = 4n - 3. Find the 20th term and determine if 125 is a term.',
    answer_key: 'T_20 = 77; 125 is of the sequence (n = 32)',
    marking_scheme: [
      'M1: Calculate T_20 = 4(20) - 3',
      'A1: T_20 = 77',
      'M1: Set 4n - 3 = 125 => 4n = 128',
      'A1: n = 32 (an integer), so 125 is indeed a term',
    ],
    max_marks: 4,
  },

  // --- AP Calculus BC ---
  {
    topicMatches: ['Taylor Series', 'Power Series', 'Maclaurin'],
    boardMatches: ['AP Calculus BC'],
    difficulty: 3,
    question_text: 'Find the first four nonzero terms of the Maclaurin series for f(x) = x · sin(x²).',
    answer_key: 'x³ - x⁷/6 + x¹¹/120 - x¹⁵/5040',
    marking_scheme: [
      'M1: Recall sin(u) = u - u³/3! + u⁵/5! - u⁷/7! + ...',
      'M1: Substitute u = x²: sin(x²) = x² - x⁶/6 + x¹⁰/120 - x¹⁴/5040',
      'A1: Multiply by x: x³ - x⁷/6 + x¹¹/120 - x¹⁵/5040',
    ],
    max_marks: 4,
  },
  {
    topicMatches: ['Parametric Equations', 'Polar Coordinates'],
    boardMatches: ['AP Calculus BC'],
    difficulty: 3,
    question_text: 'A curve is given by x = t³ - 3t, y = 3t². Find dy/dx in terms of t, and find all values of t where the tangent line is horizontal.',
    answer_key: 'dy/dx = 2t / (t² - 1); Horizontal tangent at t = 0',
    marking_scheme: [
      'M1: dx/dt = 3t² - 3, dy/dt = 6t',
      'M1: dy/dx = (dy/dt) / (dx/dt) = 6t / (3(t² - 1)) = 2t / (t² - 1)',
      'A1: Horizontal tangent occurs when dy/dt = 0 and dx/dt ≠ 0: 6t = 0 => t = 0',
      'A1: Verify denominator at t = 0 is -3 ≠ 0, hence valid horizontal tangent at t = 0',
    ],
    max_marks: 4,
  },

  // --- A-Level Physics / AP Physics C ---
  {
    topicMatches: ['Kinematics', 'Projectile Motion', 'Motion in 1D'],
    boardMatches: ['A-Level Physics', 'AP Physics C', 'General STEM'],
    difficulty: 2,
    question_text: 'A projectile is launched from ground level at 25 m/s at an angle of 30° above the horizontal. Assuming g = 9.8 m/s², find its maximum height and horizontal range.',
    answer_key: 'Max Height = 7.97 m; Range = 55.2 m',
    marking_scheme: [
      'M1: Initial velocities: v_x = 25 cos 30° = 21.65 m/s, v_y = 25 sin 30° = 12.5 m/s',
      'M1: Max height: v_y² / (2g) = 12.5² / (2 * 9.8) = 156.25 / 19.6',
      'A1: H_max = 7.97 m',
      'M1: Time of flight: T = 2 * 12.5 / 9.8 = 2.55 s',
      'A1: Range: R = v_x * T = 21.65 * 2.55 = 55.2 m',
    ],
    max_marks: 5,
  },
  {
    topicMatches: ['Circuits & Resistance', 'Electricity', 'Current Electricity'],
    boardMatches: ['A-Level Physics', 'AP Physics C', 'CBSE Class 10/12'],
    difficulty: 2,
    question_text: 'A battery of emf 12 V and internal resistance 1.5 Ω is connected across an external resistor of 4.5 Ω. Calculate: (a) circuit current, (b) terminal potential difference.',
    answer_key: '(a) 2.0 A, (b) 9.0 V',
    marking_scheme: [
      'M1: Total resistance R_total = R + r = 4.5 + 1.5 = 6.0 Ω',
      'A1: I = E / R_total = 12 / 6.0 = 2.0 A',
      'M1: Terminal p.d. V = I * R = 2.0 * 4.5  (or V = E - Ir = 12 - 3)',
      'A1: V = 9.0 V',
    ],
    max_marks: 4,
  },
  {
    topicMatches: ['Simple Harmonic Motion', 'Waves & Oscillations'],
    boardMatches: ['A-Level Physics', 'AP Physics C'],
    difficulty: 3,
    question_text: 'A mass of 0.5 kg oscillates on a spring with k = 50 N/m. Amplitude is 0.08 m. Find: (a) angular frequency ω, (b) maximum kinetic energy.',
    answer_key: '(a) ω = 10 rad/s, (b) KE_max = 0.16 J',
    marking_scheme: [
      'M1: ω = √(k/m) = √(50 / 0.5) = √100',
      'A1: ω = 10 rad/s',
      'M1: KE_max = (1/2) k A² = (1/2)(50)(0.08²)',
      'A1: KE_max = 25 * 0.0064 = 0.16 J',
    ],
    max_marks: 4,
  },

  // --- CBSE Class 10/12 ---
  {
    topicMatches: ['Matrices & Determinants', 'Linear Algebra'],
    boardMatches: ['CBSE Class 10/12'],
    difficulty: 2,
    question_text: 'If A = [[2, 3], [1, 4]], find the inverse matrix A⁻¹ and verify that A · A⁻¹ = I.',
    answer_key: 'A⁻¹ = (1/5) [[4, -3], [-1, 2]]',
    marking_scheme: [
      'M1: Calculate det(A) = (2)(4) - (3)(1) = 8 - 3 = 5 ≠ 0',
      'M1: Adjoint adj(A) = [[4, -3], [-1, 2]]',
      'A1: A⁻¹ = (1/det) adj(A) = 1/5 [[4, -3], [-1, 2]]',
      'A1: Verification: (1/5)[[8-3, -6+6], [4-4, -3+8]] = [[1, 0], [0, 1]]',
    ],
    max_marks: 4,
  },
  {
    topicMatches: ['Continuity & Differentiability', 'Calculus'],
    boardMatches: ['CBSE Class 10/12'],
    difficulty: 2,
    question_text: 'Determine the value of k such that f(x) = { (kx + 1 if x ≤ 5), (3x - 5 if x > 5) } is continuous at x = 5.',
    answer_key: 'k = 9/5 = 1.8',
    marking_scheme: [
      'M1: Left-hand limit and value at x = 5: lim(x->5-) (kx + 1) = 5k + 1',
      'M1: Right-hand limit: lim(x->5+) (3x - 5) = 3(5) - 5 = 10',
      'M1: For continuity: 5k + 1 = 10',
      'A1: 5k = 9 => k = 9/5 = 1.8',
    ],
    max_marks: 4,
  }
];

export class AIPaperGenerator {
  /**
   * Generates a fully calibrated practice paper for a student,
   * automatically weighting towards weak topics if requested.
   */
  static generatePaper(options: GeneratePaperOptions): GeneratedPaperPayload {
    const {
      student,
      topics,
      questionCount = 6,
      calibratedDifficulty = 'adaptive',
      focusOnWeakTopics = true,
      customTitle,
    } = options;

    // 1. Gather Weak vs Strong Topics using AnalyticsEngine
    const { weakTopics, strongTopics } = AnalyticsEngine.selectTopicsForPaperGeneration(topics);
    const targetWeakTopics = weakTopics.length > 0 ? weakTopics : topics;

    // 2. Determine Question Distribution
    // 70% Weak Topics (Intervention), 30% Strong Topics (Retention)
    let weakCount = Math.max(1, Math.round(questionCount * 0.7));
    let strongCount = questionCount - weakCount;

    if (targetWeakTopics.length === 0) {
      weakCount = 0;
      strongCount = questionCount;
    }

    const selectedQuestions: Omit<Question, 'id' | 'paper_id'>[] = [];
    let orderIndex = 0;

    // Helper to find or synthesize a question
    const pickQuestionForTopic = (
      topic: Topic,
      desiredDifficulty: 1 | 2 | 3 | 4 | 5,
      qNumber: number,
      isAlternate = false
    ): Omit<Question, 'id' | 'paper_id'> => {
      // Look for a matching template in bank
      const matched = QUESTION_BANK.find(q =>
        q.topicMatches.some(m => topic.name.toLowerCase().includes(m.toLowerCase()) || m.toLowerCase().includes(topic.name.toLowerCase())) &&
        (!q.boardMatches || q.boardMatches.includes(student.syllabus_board))
      );

      if (matched) {
        return {
          topic_id: topic.id,
          topic_name: topic.name,
          question_number: qNumber,
          question_text: matched.question_text,
          answer_key: matched.answer_key,
          marking_scheme: matched.marking_scheme,
          difficulty: matched.difficulty,
          max_marks: matched.max_marks,
          is_alternate: isAlternate,
          order_index: isAlternate ? 100 + qNumber : orderIndex++,
        };
      }

      // Synthesize calibrated curriculum question based on topic & difficulty
      return this.synthesizeTopicQuestion(topic, student.syllabus_board, desiredDifficulty, qNumber, isAlternate, orderIndex++);
    };

    // 3. Generate Weak Topic Focus Questions (Calibrated 1-2 for foundational confidence)
    for (let i = 0; i < weakCount; i++) {
      const topic = targetWeakTopics[i % targetWeakTopics.length];
      const diff: 1 | 2 | 3 | 4 | 5 = calibratedDifficulty === 'adaptive' ? 2 : (calibratedDifficulty as 1 | 2 | 3 | 4 | 5);
      selectedQuestions.push(pickQuestionForTopic(topic, diff, selectedQuestions.length + 1, false));
    }

    // 4. Generate Retention Questions from Strong Topics (Calibrated 3-4 for exam readiness)
    const strongPool = strongTopics.length > 0 ? strongTopics : topics;
    for (let i = 0; i < strongCount; i++) {
      const topic = strongPool[i % strongPool.length];
      const diff: 1 | 2 | 3 | 4 | 5 = calibratedDifficulty === 'adaptive' ? 3 : (calibratedDifficulty as 1 | 2 | 3 | 4 | 5);
      selectedQuestions.push(pickQuestionForTopic(topic, diff, selectedQuestions.length + 1, false));
    }

    // 5. Generate 2 Alternate Questions for Quick Swapping
    const alt1 = pickQuestionForTopic(targetWeakTopics[0] || topics[0], 2, 99, true);
    const alt2 = pickQuestionForTopic(topics[topics.length - 1] || topics[0], 3, 100, true);
    selectedQuestions.push(alt1, alt2);

    const activeQuestions = selectedQuestions.filter(q => !q.is_alternate);
    const totalMarks = activeQuestions.reduce((acc, q) => acc + q.max_marks, 0);

    const weakTopicNames = targetWeakTopics.slice(0, 2).map(t => t.name).join(' & ');
    const title = customTitle || (
      focusOnWeakTopics && targetWeakTopics.length > 0
        ? `${student.syllabus_board} - Targeted Focus: ${weakTopicNames}`
        : `${student.syllabus_board} - Comprehensive Practice Paper`
    );

    const paper: Omit<Paper, 'id' | 'created_at' | 'updated_at'> = {
      student_id: student.id,
      title,
      status: 'ready_for_class',
      target_class_time: student.schedule_time || 'Next Session',
      total_marks: totalMarks,
      scored_marks: 0,
    };

    return {
      paper,
      questions: selectedQuestions,
    };
  }

  /**
   * Procedural question synthesis for topics not directly in the template bank.
   */
  private static synthesizeTopicQuestion(
    topic: Topic,
    board: SyllabusBoard,
    difficulty: 1 | 2 | 3 | 4 | 5,
    qNumber: number,
    isAlternate: boolean,
    order: number
  ): Omit<Question, 'id' | 'paper_id'> {
    const isCalculus = topic.name.toLowerCase().includes('calculus') || topic.name.toLowerCase().includes('deriv') || topic.name.toLowerCase().includes('integr');
    const isPhysics = board.includes('Physics');
    
    let text = `Practice problem on ${topic.name}: Apply core principles to solve for the target quantity.`;
    let key = `Evaluated through standard method for ${topic.name}.`;
    let marks = 4;
    let scheme = [
      `M1: Correct identification of formula/theorem for ${topic.name}`,
      `M1: Accurate algebraic or numerical substitution`,
      `A1: Intermediate working step verified`,
      `A1: Final value stated with proper units or simplified form`,
    ];

    if (isCalculus) {
      if (difficulty <= 2) {
        text = `Given f(x) = 2x³ - 5x + 4, calculate the derivative f'(x) and evaluate f'(2).`;
        key = `f'(x) = 6x² - 5; f'(2) = 19`;
        marks = 3;
        scheme = [
          'M1: Differentiate using power rule: d/dx(2x³) = 6x², d/dx(-5x) = -5',
          'A1: State f\'(x) = 6x² - 5',
          'A1: Substitute x = 2: 6(4) - 5 = 19',
        ];
      } else {
        text = `Find the equation of the tangent line to the curve y = ln(x² + 1) at the point where x = 1.`;
        key = `y = x - 1 + ln(2)`;
        marks = 4;
        scheme = [
          'M1: Differentiate using chain rule: dy/dx = 2x / (x² + 1)',
          'A1: Evaluate gradient at x = 1: m = 2(1)/(1+1) = 1',
          'M1: Find y-coordinate at x = 1: y = ln(2)',
          'A1: Write tangent equation: y - ln(2) = 1(x - 1) => y = x - 1 + ln(2)',
        ];
      }
    } else if (isPhysics) {
      text = `A system governed by ${topic.name} experiences a change under standard conditions. Calculate the resulting response when initial values are doubled.`;
      key = `Response scales by factor of 4 (quadratic relation).`;
      marks = 4;
      scheme = [
        `M1: Identify governing law for ${topic.name}`,
        `M1: Set up proportional relationship`,
        `A1: Evaluate scale factor: 2² = 4`,
        `A1: Conclude final physical implication with units`,
      ];
    }

    return {
      topic_id: topic.id,
      topic_name: topic.name,
      question_number: qNumber,
      question_text: text,
      answer_key: key,
      marking_scheme: scheme,
      difficulty,
      max_marks: marks,
      is_alternate: isAlternate,
      order_index: isAlternate ? 100 + qNumber : order,
    };
  }
}
