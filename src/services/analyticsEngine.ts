import type { Topic, Result } from '../types';

export class AnalyticsEngine {
  /**
   * Exponentially Weighted Moving Average (EWMA) Formula:
   * Mastery(current) = (0.7 * Latest_Score_Percentage) + (0.3 * Mastery(previous))
   */
  static calculateNewMastery(previousMastery: number, latestScorePercentage: number): number {
    const raw = (0.7 * latestScorePercentage) + (0.3 * previousMastery);
    return Math.round(Math.min(100, Math.max(0, raw)) * 10) / 10;
  }

  /**
   * Time Decay Penalty:
   * If Date.now() - last_tested_at > 30 days, apply a -10% penalty to the mastery score.
   * This forces the AI to periodically re-test forgotten topics.
   */
  static applyTimeDecay(mastery: number, lastTestedAt: number, currentTime = Date.now()): {
    adjustedMastery: number;
    decayApplied: boolean;
    daysSinceTested: number;
  } {
    const msInDay = 24 * 60 * 60 * 1000;
    const daysSinceTested = Math.max(0, Math.floor((currentTime - lastTestedAt) / msInDay));
    
    if (daysSinceTested > 30) {
      const adjusted = Math.max(0, mastery - 10);
      return {
        adjustedMastery: Math.round(adjusted * 10) / 10,
        decayApplied: true,
        daysSinceTested,
      };
    }

    return {
      adjustedMastery: mastery,
      decayApplied: false,
      daysSinceTested,
    };
  }

  /**
   * Check if topic is flagged as "Needs Intervention" (< 60%)
   */
  static isInterventionNeeded(masteryPercentage: number): boolean {
    return masteryPercentage < 60;
  }

  /**
   * Recompute topic mastery after a paper or question is graded
   */
  static updateTopicAfterGrading(
    topic: Topic,
    resultsForTopic: Result[],
    timestamp = Date.now()
  ): Topic {
    if (resultsForTopic.length === 0) return topic;

    const totalScored = resultsForTopic.reduce((acc, r) => acc + r.awarded_marks, 0);
    const totalMax = resultsForTopic.reduce((acc, r) => acc + r.max_marks, 0);
    const latestPercentage = totalMax > 0 ? (totalScored / totalMax) * 100 : 0;

    // First account for any time decay that had accumulated before this test
    const { adjustedMastery } = this.applyTimeDecay(topic.mastery_percentage, topic.last_tested_at, timestamp);

    // Apply EWMA formula
    const newMastery = this.calculateNewMastery(adjustedMastery, latestPercentage);
    const isWeak = this.isInterventionNeeded(newMastery);

    return {
      ...topic,
      mastery_percentage: newMastery,
      last_tested_at: timestamp,
      is_weak: isWeak,
      updated_at: timestamp,
    };
  }

  /**
   * Context Gathering for AI Prompt:
   * Top 3 weakest topics (< 60%) + 2 strong/current topics
   */
  static selectTopicsForPaperGeneration(topics: Topic[]): {
    weakTopics: Topic[];
    strongTopics: Topic[];
    allSyllabusTopicNames: string[];
  } {
    // Apply time decay to assess current true mastery
    const assessedTopics = topics.map(t => {
      const { adjustedMastery } = this.applyTimeDecay(t.mastery_percentage, t.last_tested_at);
      return {
        ...t,
        currentMastery: adjustedMastery,
        isWeakNow: this.isInterventionNeeded(adjustedMastery),
      };
    });

    const weak = assessedTopics
      .filter(t => t.isWeakNow)
      .sort((a, b) => a.currentMastery - b.currentMastery)
      .slice(0, 3);

    const strong = assessedTopics
      .filter(t => !t.isWeakNow)
      .sort((a, b) => b.currentMastery - a.currentMastery)
      .slice(0, 2);

    // If not enough weak or strong, fill gracefully
    const remaining = assessedTopics.filter(
      t => !weak.some(w => w.id === t.id) && !strong.some(s => s.id === t.id)
    );

    while (weak.length < 3 && remaining.length > 0) {
      weak.push(remaining.shift()!);
    }

    while (strong.length < 2 && remaining.length > 0) {
      strong.push(remaining.shift()!);
    }

    return {
      weakTopics: weak,
      strongTopics: strong,
      allSyllabusTopicNames: topics.map(t => t.name),
    };
  }
}
